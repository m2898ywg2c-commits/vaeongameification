"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { liftTrends, trendSummary } from "@/lib/progression";
import { TYPES } from "@/lib/personality";
import Home from "../Home";

// Monday-start week key, matching lib/progression.js
function weekStart(d) {
  const date = new Date(d);
  const day = (date.getDay() + 6) % 7;
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - day);
  return date.getTime();
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
        <line x1={padL} y1={H - padB} x2={W - padR} y2={H - padB} stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
        {area ? <path d={area} fill={accent} opacity="0.12" /> : null}
        <path d={path} fill="none" stroke={accent} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {points.map(function (p, i) {
          return <circle key={i} cx={x(i)} cy={y(p.y)} r={i === points.length - 1 ? 4.5 : 3} fill={accent} />;
        })}
        <text x="4" y={y(Math.max.apply(null, values)) + 4} fill="rgba(255,255,255,0.5)" fontSize="10">
          {round1(Math.max.apply(null, values))}
        </text>
        <text x="4" y={y(Math.min.apply(null, values)) + 4} fill="rgba(255,255,255,0.5)" fontSize="10">
          {round1(Math.min.apply(null, values))}
        </text>
        <text x={padL} y={H - 6} fill="rgba(255,255,255,0.45)" fontSize="10">{first.label}</text>
        {points.length > 1 ? (
          <text x={W - padR} y={H - 6} textAnchor="end" fill="rgba(255,255,255,0.45)" fontSize="10">{last.label}</text>
        ) : null}
      </svg>
      <p className="text-sm text-gray-300 mt-1">
        Latest <span className="font-bold text-white">{round1(last.y)}{unit}</span>
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
          <line x1="0" y1={y(pledge)} x2={W} y2={y(pledge)} stroke="rgba(255,255,255,0.35)" strokeWidth="1" strokeDasharray="4 4" />
          <text x={W - 2} y={y(pledge) - 4} textAnchor="end" fill="rgba(255,255,255,0.5)" fontSize="9">
            pledge {pledge}
          </text>
        </g>
      ) : null}
      {bars.map(function (b, i) {
        const hgt = Math.max(0, H - padB - y(b.v));
        const hit = pledge ? b.v >= pledge : b.v > 0;
        return (
          <g key={i}>
            <rect
              x={i * (bw + gap) + gap / 2}
              y={y(b.v)}
              width={bw}
              height={hgt}
              rx="3"
              fill={hit ? accent : "rgba(255,255,255,0.18)"}
            />
            <text
              x={i * (bw + gap) + gap / 2 + bw / 2}
              y={H - 6}
              textAnchor="middle"
              fill="rgba(255,255,255,0.45)"
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
  return <p className="text-sm text-gray-400">{text}</p>;
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
    });
  }, [router]);

  const type = typeId ? TYPES[typeId] : null;
  const accent = type ? type.colors[0] : "#22D3EE";

  // Bodyweight: one point per entry that actually has a bodyweight.
  const bwPoints = metrics
    .filter(function (m) { return m.bodyweight !== null && m.bodyweight !== undefined; })
    .map(function (m) { return { y: Number(m.bodyweight), label: shortDate(new Date(m.logged_at).getTime()) }; });

  // Sessions: last 8 weeks, Monday start, empty weeks included.
  const counts = {};
  sessions.forEach(function (s) {
    const w = weekStart(s.logged_at);
    counts[w] = (counts[w] || 0) + 1;
  });
  const thisWeek = weekStart(new Date());
  const bars = [];
  for (let i = 7; i >= 0; i--) {
    const w = thisWeek - i * 7 * 24 * 60 * 60 * 1000;
    bars.push({ v: counts[w] || 0, label: shortDate(w) });
  }
  const pledge = profile && profile.sessions_per_week ? profile.sessions_per_week : null;
  const weeksHit = bars.filter(function (b) { return pledge ? b.v >= pledge : b.v > 0; }).length;

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
  const card = "rounded-2xl border border-white/10 bg-white/5 p-5 mb-4";

  return (
    <main className="min-h-screen text-white px-5 py-8" style={{ background: "#000000" }}>
      <div className="max-w-md mx-auto">
        <div className="flex items-center justify-between mb-6">
          <Home accent={accent} />
          <a href="/dashboard" className="text-xs text-gray-400 underline">Back</a>
        </div>

        <h1 className="text-2xl font-bold mb-6">Progress</h1>

        {loading ? (
          <p className="text-sm text-gray-400">Getting your numbers...</p>
        ) : (
          <div>
            {/* ---------- Sessions per week ---------- */}
            <div className={card}>
              <p className="text-base font-bold mb-1">Sessions per week</p>
              <p className="text-sm text-gray-300 mb-4">
                {sessions.length === 0
                  ? "Nothing logged yet."
                  : pledge
                    ? "You hit your pledge in " + weeksHit + " of the last 8 weeks."
                    : "Last 8 weeks."}
              </p>
              {sessions.length === 0 ? (
                <Empty text="Log a session and this fills in. Eight weeks of bars tells you more than any single week ever will." />
              ) : (
                <BarChart bars={bars} accent={accent} pledge={pledge} />
              )}
            </div>

            {/* ---------- Lifts ---------- */}
            <div className={card}>
              <p className="text-base font-bold mb-1">Lift progression</p>
              <p className="text-sm text-gray-300 mb-4">{summary}</p>

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
                          className="px-3 py-2 rounded-full border text-xs font-bold"
                          style={{
                            borderColor: on ? accent : "rgba(255,255,255,0.12)",
                            background: on ? accent + "22" : "rgba(255,255,255,0.05)",
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
                    <div className="mt-4 rounded-xl bg-black/25 p-4">
                      <p className="text-xs font-bold uppercase tracking-wide mb-1" style={{ color: STATUS_COLOUR[activeTrend.status] }}>
                        {STATUS_WORD[activeTrend.status]}
                      </p>
                      <p className="text-sm text-gray-200">{activeTrend.message}</p>
                    </div>
                  ) : null}
                </div>
              )}
            </div>

            {/* ---------- Bodyweight ---------- */}
            <div className={card}>
              <p className="text-base font-bold mb-1">Bodyweight</p>
              <p className="text-sm text-gray-300 mb-4">
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
