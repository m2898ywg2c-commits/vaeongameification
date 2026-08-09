"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { liftTrends, trendSummary } from "@/lib/progression";
import { TYPES } from "@/lib/personality";
import Home from "../Home";
import { track, EVENTS } from "@/lib/events";
import { startOfWeek, sessionsByWeek } from "@/lib/week";

// Week key. The boundary itself lives in lib/week.js so every screen agrees on it.
function weekStart(d) {
  return startOfWeek(d).getTime();
}

function shortDate(ms) {
  const d = new Date(ms);
  return d.getDate() + " " + d.toLocaleString("en-GB", { month: "short" });
}

function round1(n) {
  return Math.round(n * 10) / 10;
}

function deltaText(first, last, sinceLabel, unit) {
  if (last === first) return "level with where you started on " + sinceLabel;
  const diff = round1(Math.abs(last - first));
  return (last > first ? "up " : "down ") + diff + unit + " since " + sinceLabel;
}

const STATUS_COLOUR = {
  climbing: "#4ADE80",
  holding: "#9CA3AF",
  new: "#9CA3AF",
  flat: "#FFB020",
  stalled: "#FFB020",
  down: "#F87171",
};

const STATUS_WORD = {
  climbing: "Climbing",
  holding: "Held",
  new: "New",
  flat: "Flat",
  stalled: "Stalled",
  down: "Down",
};

/* ---------- Inline SVG line chart. No dependency, renders fine on a phone. ---------- */
function LineChart({ points, accent, unit }) {
  if (!points || points.length === 0) return null;

  const W = 320;
  const H = 140;
  const padL = 34;
  const padR = 8;
  const padT = 12;
  const padB = 22;

  const values = points.map(function (p) { return p.y; });
  let lo = Math.min.apply(null, values);
  let hi = Math.max.apply(null, values);
  if (hi === lo) { hi = lo + 1; lo = lo - 1; }
  const span = hi - lo;
  lo = lo - span * 0.12;
  hi = hi + span * 0.12;

  const x = function (i) {
    if (points.length === 1) return padL + (W - padL - padR) / 2;
    return padL + (i * (W - padL - padR)) / (points.length - 1);
  };
  const y = function (v) {
    return padT + ((hi - v) * (H - padT - padB)) / (hi - lo);
  };

  const path = points
    .map(function (p, i) { return (i === 0 ? "M" : "L") + x(i) + " " + y(p.y); })
    .join(" ");

  const area = points.length > 1
    ? path + " L" + x(points.length - 1) + " " + (H - padB) + " L" + x(0) + " " + (H - padB) + " Z"
    : null;

  const first = points[0];
  const last = points[points.length - 1];

  return (
    <div>
      <svg viewBox={"0 0 " + W + " " + H} className="w-full" role="img" aria-label="Trend chart">
        <line x1={padL} y1={H - padB} x2={W - padR} y2={H - padB} stroke="var(--brand-line)" strokeWidth="1" />
        {area ? <path d={area} fill={accent} opacity="0.12" /> : null}
        <path d={path} fill="none" stroke={accent} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {points.map(function (p, i) {
          return <circle key={i} cx={x(i)} cy={y(p.y)} r={i === points.length - 1 ? 4.5 : 3} fill={accent} />;
        })}
        <text x="4" y={y(Math.max.apply(null, values)) + 4} fill="var(--brand-muted)" fontSize="10">
          {round1(Math.max.apply(null, values))}
        </text>
        <text x="4" y={y(Math.min.apply(null, values)) + 4} fill="var(--brand-muted)" fontSize="10">
          {round1(Math.min.apply(null, values))}
        </text>
        <text x={padL} y={H - 6} fill="var(--brand-muted)" fontSize="10">{first.label}</text>
        {points.length > 1 ? (
          <text x={W - padR} y={H - 6} textAnchor="end" fill="var(--brand-muted)" fontSize="10">{last.label}</text>
        ) : null}
      </svg>
      <p className="text-sm text-brand-muted mt-1">
        Latest <span className="font-display text-brand-text">{round1(last.y)}{unit}</span>
        {points.length > 1 ? <span>{" "}&middot; {deltaText(first.y, last.y, first.label, unit)}</span> : null}
      </p>
    </div>
  );
}

/* ---------- Inline SVG bar chart for sessions per week. ---------- */
function BarChart({ bars, accent, pledge }) {
  const W = 320;
  const H = 130;
  const padB = 20;
  const padT = 10;
  const maxV = Math.max(pledge || 0, 1, Math.max.apply(null, bars.map(function (b) { return b.v; })));
  const bw = (W / bars.length) * 0.62;
  const gap = (W / bars.length) * 0.38;
  const y = function (v) { return padT + ((maxV - v) * (H - padT - padB)) / maxV; };

  return (
    <svg viewBox={"0 0 " + W + " " + H} className="w-full" role="img" aria-label="Sessions per week">
      {pledge ? (
        <g>
          <line x1="0" y1={y(pledge)} x2={W} y2={y(pledge)} stroke="var(--brand-dim)" strokeWidth="1" strokeDasharray="4 4" />
          <text x={W - 2} y={y(pledge) - 4} textAnchor="end" fill="var(--brand-muted)" fontSize="9">
            pledge {pledge}
          </text>
        </g>
      ) : null}
      {bars.map(function (b, i) {
        const hgt = Math.max(0, H - padB - y(b.v));
        const hit = pledge ? b.v >= pledge : b.v > 0;
        // THE CURRENT WEEK IS NOT A FAILED WEEK, IT IS AN UNFINISHED ONE.
        //
        // The last bar is the week in progress. Painted in the same grey as a genuine miss it
        // said "you have not hit your pledge", which on a Sunday morning is true of everybody
        // and is not information. It is outlined instead: present, honest about the count so
        // far, and visibly not yet judged.
        return (
          <g key={i}>
            <rect
              x={i * (bw + gap) + gap / 2}
              y={y(b.v)}
              width={bw}
              height={hgt}
              rx="3"
              fill={b.partial ? "none" : hit ? accent : "var(--brand-line)"}
              stroke={b.partial ? accent : "none"}
              strokeWidth={b.partial ? 1 : 0}
              strokeDasharray={b.partial ? "3 3" : "0"}
            />
            <text
              x={i * (bw + gap) + gap / 2 + bw / 2}
              y={H - 6}
              textAnchor="middle"
              fill="var(--brand-muted)"
              fontSize="9"
            >
              {b.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function Empty({ text }) {
  return <p className="text-sm text-brand-muted">{text}</p>;
}

export default function ProgressPage() {
  const [loading, setLoading] = useState(true);
  const [typeId, setTypeId] = useState(null);
  const [profile, setProfile] = useState(null);
  const [metrics, setMetrics] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [logs, setLogs] = useState([]);
  const [picked, setPicked] = useState(null);
  const router = useRouter();

  useEffect(function () {
    const supabase = createClient();
    supabase.auth.getUser().then(async function (res) {
      const user = res.data.user;
      if (!user) { router.push("/login"); return; }

      const [p, a, m, s, l] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).single(),
        supabase.from("assessment_results").select("type_id").eq("user_id", user.id)
          .order("completed_at", { ascending: false }).limit(1).maybeSingle(),
        supabase.from("body_metrics").select("*").eq("user_id", user.id)
          .order("logged_at", { ascending: true }),
        supabase.from("training_sessions").select("*").eq("user_id", user.id)
          .order("logged_at", { ascending: true }),
        supabase.from("exercise_logs").select("*").eq("user_id", user.id)
          .order("logged_at", { ascending: true }),
      ]);

      if (p.data) setProfile(p.data);
      if (a.data) setTypeId(a.data.type_id);
      setMetrics(m.data || []);
      setSessions(s.data || []);
      setLogs(l.data || []);
      setLoading(false);

      track(supabase, EVENTS.PROGRESS_VIEWED, {
        sessions: (s.data || []).length,
        metrics: (m.data || []).length,
        logs: (l.data || []).length,
      });
    });
  }, [router]);

  const type = typeId ? TYPES[typeId] : null;
  const accent = type ? type.colors[0] : "#22D3EE";

  // Bodyweight: one point per entry that actually has a bodyweight.
  const bwPoints = metrics
    .filter(function (m) { return m.bodyweight !== null && m.bodyweight !== undefined; })
    .map(function (m) { return { y: Number(m.bodyweight), label: shortDate(new Date(m.logged_at).getTime()) }; });

  // Sessions: the last 8 weeks, on the shared week boundary, empty weeks included.
  //
  // Counted through sessionsByWeek so a repeat of the same plan day is one session, not two.
  // This chart used to tally rows and drew a bar of ten against a pledge line of four for a
  // week containing four plan days and a quick log. See lib/week.js.
  const counts = sessionsByWeek(sessions);
  const thisWeek = weekStart(new Date());
  const bars = [];
  for (let i = 7; i >= 0; i--) {
    // STEPPED IN DAYS, NOT IN MILLISECONDS.
    //
    // This was `thisWeek - i * 7 * 24 * 60 * 60 * 1000`, which assumes every week is exactly
    // 604800000ms. In the UK the week containing the last Sunday in March is 23 hours long
    // and the one in October is 25. From November onwards, looking back eight weeks crosses
    // the October change, every bucket key before it comes out an hour adrift, none of them
    // match the keys the sessions were filed under, and the chart quietly shows zeros for
    // half the year. Stepping the date and re-deriving the boundary cannot drift.
    const d = new Date(thisWeek);
    d.setDate(d.getDate() - i * 7);
    const w = weekStart(d);
    bars.push({ v: counts[w] || 0, label: shortDate(w), partial: i === 0 });
  }
  const pledge = profile && profile.sessions_per_week ? profile.sessions_per_week : null;
  // FINISHED WEEKS ONLY.
  //
  // The score counted all eight bars, and the eighth is the week currently in progress. On a
  // Sunday that week is a few hours old, cannot possibly have met a pledge, and was being
  // counted as a miss. Everybody's number therefore fell by one every Sunday and climbed back
  // during the week, which reads as the app losing track rather than as a calendar.
  //
  // Same principle as the deload being exempt from the progression floor: do not score a
  // period against a target it was never given the chance to meet.
  const finished = bars.slice(0, bars.length - 1);
  const weeksHit = finished.filter(function (b) { return pledge ? b.v >= pledge : b.v > 0; }).length;
  const weeksScored = finished.length;

  // Lifts.
  const trends = liftTrends(logs);
  const summary = trendSummary(trends);
  const exercises = trends.map(function (t) { return t.name; });
  const active = picked && exercises.indexOf(picked) !== -1 ? picked : exercises[0];

  const liftPoints = (function () {
    if (!active) return [];
    const byWeek = {};
    logs.forEach(function (l) {
      if (l.exercise !== active || !l.weight) return;
      const w = weekStart(l.logged_at);
      const v = Number(l.weight);
      if (!byWeek[w] || v > byWeek[w]) byWeek[w] = v;
    });
    return Object.keys(byWeek)
      .map(Number)
      .sort(function (a, b) { return a - b; })
      .map(function (w) { return { y: byWeek[w], label: shortDate(w) }; });
  })();

  const activeTrend = trends.filter(function (t) { return t.name === active; })[0];
  const card = "rounded-md border border-brand-line bg-brand-surface p-5 mb-4";

  return (
    <main className="min-h-screen text-brand-text px-5 py-8" style={{ background: "var(--brand-bg)" }}>
      <div className="max-w-md mx-auto">
        <div className="flex items-center justify-between mb-6">
          <Home accent={accent} />
          <a href="/dashboard" className="text-xs text-brand-muted underline">Back</a>
        </div>

        <h1 className="font-display text-2xl font-normal mb-6">Progress</h1>

        {loading ? (
          <p className="text-sm text-brand-muted">Getting your numbers...</p>
        ) : (
          <div>
            {/* ---------- Sessions per week ---------- */}
            <div className={card}>
              <p className="font-display text-base font-normal mb-1">Sessions per week</p>
              <p className="text-sm text-brand-muted mb-4">
                {/* THE NUMBER THAT IS NOT THE PLEDGE HAS TO SAY WHAT IT IS.
                    "You hit your pledge in 1 of the last 8 weeks" was read as the app
                    expecting eight of something, by the person who set the pledge to four and
                    knows perfectly well what it is. Two numbers in one sentence and only one
                    of them named. The pledge is now stated outright, so the eight has nothing
                    left to be confused with. */}
                {sessions.length === 0
                  ? "Nothing logged yet."
                  : pledge
                    ? "You pledged " + pledge + " sessions a week, and hit that in "
                      + weeksHit + " of the last " + weeksScored
                      + " full weeks. The dotted bar is this week, still going."
                    : "Last 8 weeks. The dotted bar is this week, still going."}
              </p>
              {sessions.length === 0 ? (
                <Empty text="Log a session and this fills in. Eight weeks of bars tells you more than any single week ever will." />
              ) : (
                <BarChart bars={bars} accent={accent} pledge={pledge} />
              )}
            </div>

            {/* ---------- Lifts ---------- */}
            <div className={card}>
              <p className="font-display text-base font-normal mb-1">Lift progression</p>
              <p className="text-sm text-brand-muted mb-4">{summary}</p>

              {exercises.length === 0 ? (
                <Empty text="Log some weighted sets and this will show you honestly whether the bar is getting heavier." />
              ) : (
                <div>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {exercises.map(function (name) {
                      const on = name === active;
                      return (
                        <button
                          key={name}
                          onClick={function () { setPicked(name); }}
                          className="px-3 py-2 rounded-sm border font-display text-xs"
                          style={{
                            borderColor: on ? accent : "var(--brand-line)",
                            background: on ? accent + "22" : "var(--brand-line)",
                          }}
                        >
                          {name}
                        </button>
                      );
                    })}
                  </div>

                  {liftPoints.length > 0 ? (
                    <LineChart points={liftPoints} accent={accent} unit="kg" />
                  ) : (
                    <Empty text="No weights logged for this one yet." />
                  )}

                  {activeTrend ? (
                    <div className="mt-4 rounded-md bg-black/25 p-4">
                      <p className="font-display text-xs uppercase tracking-wide mb-1" style={{ color: STATUS_COLOUR[activeTrend.status] }}>
                        {STATUS_WORD[activeTrend.status]}
                      </p>
                      <p className="text-sm text-brand-text">{activeTrend.message}</p>
                    </div>
                  ) : null}
                </div>
              )}
            </div>

            {/* ---------- Bodyweight ---------- */}
            <div className={card}>
              <p className="font-display text-base font-normal mb-1">Bodyweight</p>
              <p className="text-sm text-brand-muted mb-4">
                {bwPoints.length < 2
                  ? "Needs a couple of entries before a line means anything."
                  : "Weight bounces around day to day. Watch the direction, not the dots."}
              </p>
              {bwPoints.length === 0 ? (
                <Empty text="Log your bodyweight in settings and it will chart here." />
              ) : (
                <LineChart points={bwPoints} accent={accent} unit="kg" />
              )}
              <a href="/settings" className="inline-block mt-4 text-sm underline" style={{ color: accent }}>
                Log today&apos;s stats
              </a>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
