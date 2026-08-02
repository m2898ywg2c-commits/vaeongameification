"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { computeStats } from "@/lib/plan";
import { blockComplete } from "@/lib/progression";
import {
  ACHIEVEMENTS,
  TIER_COLOURS,
  buildContext,
  earnedCodes,
  byCode,
  nextUp,
} from "@/lib/achievements";

function Badge({ a, earned, size }) {
  const s = size || 44;
  const colours = TIER_COLOURS[a.tier] || TIER_COLOURS.bronze;
  return (
    <div
      style={{
        width: s,
        height: s,
        borderRadius: s,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        fontWeight: 700,
        fontSize: a.icon.length > 2 ? 12 : 14,
        color: earned ? "#000000" : "var(--brand-dim)",
        background: earned
          ? "linear-gradient(145deg, " + colours[0] + ", " + colours[1] + ")"
          : "var(--brand-surface)",
        border: earned ? "none" : "1px dashed var(--brand-line)",
      }}
    >
      {a.icon}
    </div>
  );
}

export default function AchievementWatcher({ profile }) {
  const [earned, setEarned] = useState([]);
  const [queue, setQueue] = useState([]);
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(function () {
    let cancelled = false;

    async function run() {
      const supabase = createClient();
      const res = await supabase.auth.getUser();
      const user = res.data.user;
      if (!user || !profile) return;

      const sessionsRes = await supabase
        .from("training_sessions")
        .select("*")
        .eq("user_id", user.id)
        .limit(500);
      const logsRes = await supabase
        .from("exercise_logs")
        .select("*")
        .eq("user_id", user.id)
        .limit(1000);
      const existingRes = await supabase
        .from("achievements")
        .select("code")
        .eq("user_id", user.id);

      if (cancelled) return;

      // If the table is missing or unreadable, fail quietly rather than break the dashboard.
      if (existingRes.error) {
        setReady(true);
        return;
      }

      const sessions = sessionsRes.data || [];
      const logs = logsRes.data || [];
      const already = (existingRes.data || []).map(function (r) { return r.code; });

      const stats = computeStats(sessions, profile.sessions_per_week);
      const context = buildContext(stats, sessions, logs, blockComplete(profile.block_start));
      const nowEarned = earnedCodes(context);
      const fresh = nowEarned.filter(function (c) { return already.indexOf(c) === -1; });

      if (fresh.length) {
        await supabase.from("achievements").insert(
          fresh.map(function (code) {
            return { user_id: user.id, code: code };
          })
        );
      }

      if (cancelled) return;
      setEarned(already.concat(fresh));
      setQueue(fresh);
      setReady(true);
    }

    run();
    return function () { cancelled = true; };
  }, [profile]);

  useEffect(function () {
    if (!queue.length) return;
    const t = setTimeout(function () {
      setQueue(queue.slice(1));
    }, 5000);
    return function () { clearTimeout(t); };
  }, [queue]);

  const current = queue.length ? byCode(queue[0]) : null;
  const upcoming = nextUp(earned, 3);

  return (
    <div>
      {current ? (
        <div
          style={{
            position: "fixed",
            left: 16,
            right: 16,
            bottom: 16,
            zIndex: 50,
            maxWidth: 420,
            margin: "0 auto",
          }}
        >
          <div className="rounded-md border border-brand-line bg-[#161B33] p-4 flex items-center gap-4 shadow-2xl">
            <Badge a={current} earned={true} size={52} />
            <div className="flex-1">
              <p className="text-[0.6875rem] uppercase tracking-wide text-brand-muted">Achievement unlocked</p>
              <p className="font-display text-sm">{current.name}</p>
              <p className="text-xs text-brand-muted">{current.blurb}</p>
            </div>
            <button
              onClick={function () { setQueue(queue.slice(1)); }}
              className="text-xs text-brand-dim underline"
            >
              Close
            </button>
          </div>
        </div>
      ) : null}

      <div className="rounded-md border border-brand-line bg-brand-surface p-5 mb-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs uppercase tracking-wide text-brand-muted">
            Achievements {ready ? earned.length + " of " + ACHIEVEMENTS.length : ""}
          </p>
          <button
            onClick={function () { setOpen(!open); }}
            className="text-xs underline text-brand-muted"
          >
            {open ? "hide" : "show all"}
          </button>
        </div>

        {!ready ? (
          <p className="text-sm text-brand-dim">Checking...</p>
        ) : open ? (
          <div className="space-y-3">
            {ACHIEVEMENTS.map(function (a) {
              const has = earned.indexOf(a.code) !== -1;
              return (
                <div key={a.code} className="flex items-center gap-3">
                  <Badge a={a} earned={has} />
                  <div className="flex-1">
                    <p className={has ? "font-display text-sm" : "font-display text-sm text-brand-dim"}>
                      {a.name}
                    </p>
                    <p className="text-xs text-brand-dim">{has ? a.blurb : a.hint}</p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div>
            {earned.length ? (
              <div className="flex flex-wrap gap-2 mb-4">
                {earned.map(function (code) {
                  const a = byCode(code);
                  if (!a) return null;
                  return <Badge key={code} a={a} earned={true} />;
                })}
              </div>
            ) : (
              <p className="text-sm text-brand-muted mb-4">
                Nothing yet. Log your first session and that changes immediately.
              </p>
            )}
            {upcoming.length ? (
              <div>
                <p className="text-[0.6875rem] uppercase tracking-wide text-brand-dim mb-2">Next up</p>
                {upcoming.map(function (a) {
                  return (
                    <div key={a.code} className="flex items-center gap-3 mb-2">
                      <Badge a={a} earned={false} size={32} />
                      <div>
                        <p className="font-display text-xs text-brand-muted">{a.name}</p>
                        <p className="text-xs text-brand-dim">{a.hint}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

