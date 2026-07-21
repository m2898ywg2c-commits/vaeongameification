"use client";

import { useState } from "react";
import { stretchFor } from "@/lib/exercisedb";
import ExerciseCard from "./ExerciseCard";
import TypeOrb from "../TypeOrb";
import { sessionDone } from "@/lib/voice";

const SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function DayView({ day, active, profile, rule, accent, deep, tid, homeMode, done, onComplete, onReopen, finished, onFinish, onStation }) {
  const [openWarmup, setOpenWarmup] = useState(false);
  const [openFlow, setOpenFlow] = useState(false);
  const [stations, setStations] = useState({});

  if (!day) return null;
  const flow = stretchFor(day);
  const label = profile.fixed_days === false
    ? "Session " + (active + 1)
    : (day.dayLabel === SHORT[new Date().getDay()] ? "Today" : day.dayLabel);

  const panel = "w-full flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-4 mb-3 text-left";
  const field = "w-full px-3 py-3 rounded-xl bg-white/10 border-2 border-white/15 text-base font-bold text-center text-white placeholder-gray-500";

  return (
    <>
      <div className="rounded-2xl p-5 mb-4" style={{ background: "linear-gradient(135deg, " + accent + ", " + deep + ")" }}>
        <p className="text-xs font-bold uppercase tracking-wide opacity-80">{label}</p>
        <p className="text-2xl font-bold leading-tight">{day.title}</p>
        <p className="text-sm opacity-90 mt-1">{day.focus} &middot; {rule.focus}</p>
      </div>

      <button onClick={function () { setOpenWarmup(!openWarmup); }} className={panel}>
        <span className="text-sm font-bold">Warm up</span>
        <span className="text-xs text-gray-400">{openWarmup ? "Hide" : "Show"}</span>
      </button>
      {openWarmup ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 mb-3">
          {day.warmup.map(function (w, i) {
            return <p key={i} className="text-sm text-gray-300 mb-1">&middot; {w}</p>;
          })}
        </div>
      ) : null}

      {day.exercises.map(function (ex, i) {
        return (
          <ExerciseCard key={i} ex={ex} exIdx={i} dayKey={day.key} profile={profile}
            weekPct={rule.pct} accent={accent} homeMode={homeMode} done={!!done[i]}
            onComplete={onComplete} onReopen={onReopen} />
        );
      })}

      {day.conditioning && day.conditioning.length ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 mb-3">
          <p className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: accent }}>Stations</p>
          {day.conditioning.map(function (c, i) {
            const v = stations[i] || "";
            return (
              <div key={i} className="mb-4">
                <p className="text-sm font-bold">{c.name}</p>
                <p className="text-xs text-gray-400 mb-2">{c.target} &middot; {c.note}</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="your time or score"
                    value={v}
                    onChange={function (e) {
                      const val = e.target.value;
                      setStations(function (s) {
                        const next = Object.assign({}, s);
                        next[i] = val;
                        return next;
                      });
                    }}
                    className={field}
                  />
                  <button
                    onClick={function () { onStation(c, v); }}
                    className="px-5 rounded-xl font-bold text-sm flex-shrink-0"
                    style={{ background: accent, color: "#0E1224" }}
                  >
                    Log
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      {flow ? (
        <>
          <button onClick={function () { setOpenFlow(!openFlow); }} className={panel}>
            <span>
              <span className="text-sm font-bold block">{flow.name}</span>
              <span className="text-xs text-gray-400">Optional. Does not count towards your score.</span>
            </span>
            <span className="text-xs text-gray-400">{openFlow ? "Hide" : "Show"}</span>
          </button>
          {openFlow ? (
            <div className="rounded-2xl p-4 mb-3 border" style={{ borderColor: "rgba(61,220,151,0.35)", background: "rgba(61,220,151,0.08)" }}>
              {flow.moves.map(function (m, i) {
                return <p key={i} className="text-sm text-gray-300 mb-1">&middot; {m}</p>;
              })}
            </div>
          ) : null}
        </>
      ) : null}

      {finished ? (
        <div className="rounded-2xl p-5 mb-6 text-center border-2" style={{ borderColor: accent, background: "rgba(255,255,255,0.04)" }}>
          <div className="flex justify-center mb-2"><TypeOrb typeId={tid} size={54} /></div>
          <p className="text-base font-bold">{sessionDone(tid)}</p>
          <a href="/dashboard" className="inline-block mt-4 text-sm underline" style={{ color: accent }}>Back to dashboard</a>
        </div>
      ) : (
        <button onClick={onFinish} className="w-full py-5 rounded-2xl font-bold text-lg mb-6"
          style={{ background: "linear-gradient(135deg, " + accent + ", " + deep + ")", color: "#fff" }}>
          Finish session
        </button>
      )}
    </>
  );
}
