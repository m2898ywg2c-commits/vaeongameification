"use client";

import { stretchFor } from "@/lib/exercisedb";
import ExerciseCard from "./ExerciseCard";
import TypeOrb from "../TypeOrb";
import { sessionDone } from "@/lib/voice";

const SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function DayView({ day, active, profile, rule, accent, deep, tid, homeMode, doneSets, onComplete, onReopen, finished, onFinish }) {
  if (!day) return null;
  const flow = stretchFor(day);
  const label = profile.fixed_days === false
    ? "Session " + (active + 1)
    : (day.dayLabel === SHORT[new Date().getDay()] ? "Today" : day.dayLabel);

  return (
    <>
      <div className="rounded-2xl p-5 mb-4" style={{ background: "linear-gradient(135deg, " + accent + ", " + deep + ")" }}>
        <p className="text-xs font-bold uppercase tracking-wide opacity-75">{label}</p>
        <p className="text-2xl font-bold leading-tight">{day.title}</p>
        <p className="text-sm opacity-85 mt-1">{day.focus} · {rule.focus}</p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 mb-3">
        <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: accent }}>Warm up</p>
        {day.warmup.map(function (w, i) {
          return <p key={i} className="text-sm text-gray-300 mb-1">· {w}</p>;
        })}
      </div>

      {day.exercises.map(function (ex, i) {
        return (
          <ExerciseCard key={i} ex={ex} exIdx={i} dayKey={day.key} profile={profile}
            weekPct={rule.pct} accent={accent} homeMode={homeMode} doneSets={doneSets}
            onComplete={onComplete} onReopen={onReopen} />
        );
      })}

      {day.conditioning && day.conditioning.length ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 mb-3">
          <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: accent }}>Stations</p>
          {day.conditioning.map(function (c, i) {
            return (
              <div key={i} className="mb-2">
                <p className="text-sm font-bold">{c.name} · {c.target}</p>
                <p className="text-xs text-gray-400">{c.note}</p>
              </div>
            );
          })}
        </div>
      ) : null}

      {flow ? (
        <div className="rounded-2xl p-4 mb-4 border" style={{ borderColor: "rgba(61,220,151,0.35)", background: "rgba(61,220,151,0.08)" }}>
          <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: "#3DDC97" }}>{flow.name}</p>
          {flow.moves.map(function (m, i) {
            return <p key={i} className="text-sm text-gray-300 mb-1">· {m}</p>;
          })}
        </div>
      ) : null}

      {finished ? (
        <div className="rounded-2xl p-5 mb-4 text-center border-2" style={{ borderColor: accent, background: deep + "44" }}>
          <div className="flex justify-center mb-2"><TypeOrb typeId={tid} size={54} /></div>
          <p className="text-base font-bold">{sessionDone(tid)}</p>
          <a href="/dashboard" className="inline-block mt-4 text-sm underline" style={{ color: accent }}>Back to dashboard</a>
        </div>
      ) : (
        <button onClick={onFinish} className="w-full py-4 rounded-2xl font-bold mb-6"
          style={{ background: "linear-gradient(135deg, " + accent + ", " + deep + ")", color: "#fff" }}>
          Finish session
        </button>
      )}
    </>
  );
}
