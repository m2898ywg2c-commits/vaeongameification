"use client";

import { useState } from "react";
import { workingWeight, increaseHint } from "@/lib/progression";
import { formTip, coachTip, homeAlternative, needsGym } from "@/lib/exercisedb";

function videoLink(name) {
  return "https://www.youtube.com/results?search_query=" + encodeURIComponent(name + " proper form technique");
}

const BODYWEIGHT = ["push up", "press up", "push-up", "press-up", "pull up", "pull-up", "chin up",
  "dip", "burpee", "mountain climber", "jumping jack", "pistol", "handstand", "muscle up",
  "australian", "scapular", "nordic", "jump squat", "glute bridge", "sit up", "crunch",
  "leg raise", "dead bug", "russian twist", "bodyweight", "step up", "high knee"];

const TIMED = ["plank", "hold", "hang", "l-sit", "sit hold", "carry", "walk", "wall sit"];

function loadType(ex) {
  const reps = String(ex.reps || "").toLowerCase();
  const name = String(ex.name || "").toLowerCase();
  if (reps.indexOf("sec") !== -1 || reps.indexOf("min") !== -1) return "time";
  if (TIMED.some(function (t) { return name.indexOf(t) !== -1; })) return "time";
  if (reps.indexOf("m") !== -1 && /\d\s*k?m/.test(reps)) return "distance";
  if (BODYWEIGHT.some(function (b) { return name.indexOf(b) !== -1; })) return "reps";
  return "weight";
}

const HINTS = {
  time: "Timed hold. Log how long you held it, in seconds.",
  reps: "Bodyweight. No weight to log, just count your reps.",
  distance: "Log your time or distance for this one.",
  weight: "",
};

export default function ExerciseCard({ ex, exIdx, dayKey, profile, weekPct, accent, homeMode, done, onComplete, onReopen }) {
  const [fields, setFields] = useState({});
  const [tip, setTip] = useState(null);

  const total = Number(ex.sets) || 1;
  const kind = loadType(ex);
  const suggested = kind === "weight" ? workingWeight(ex.name, profile, weekPct) : null;
  const swap = homeMode && needsGym(ex.name);

  function setField(i, which, val) {
    setFields(function (f) {
      const next = Object.assign({}, f);
      next[i] = Object.assign({}, next[i] || {});
      next[i][which] = val;
      return next;
    });
  }

  if (done) {
    return (
      <button
        onClick={function () { onReopen(exIdx); }}
        className="w-full flex items-center gap-3 rounded-2xl p-4 mb-3 border text-left"
        style={{ borderColor: "rgba(61,220,151,0.45)", background: "rgba(61,220,151,0.14)" }}
      >
        <span className="text-lg font-bold" style={{ color: "#3DDC97" }}>&#10003;</span>
        <span className="flex-1 text-sm font-bold" style={{ color: "#3DDC97" }}>{ex.name}</span>
        <span className="text-xs text-gray-400">Tap to reopen</span>
      </button>
    );
  }

  const field = "w-full px-3 py-4 rounded-2xl bg-white/10 border-2 border-white/15 text-xl font-bold text-center text-white placeholder-gray-500";
  const tipBtn = "flex-1 py-2 rounded-xl text-xs font-bold border border-white/15 bg-white/5";

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 mb-3">
      <div className="flex items-start justify-between gap-2 mb-1">
        <p className="text-base font-bold leading-tight flex-1">{ex.name}</p>
        <span className="text-xs font-bold px-2 py-1 rounded-lg flex-shrink-0" style={{ background: accent + "26", color: accent }}>
          {total} x {ex.reps}
        </span>
      </div>
      {ex.note ? <p className="text-xs text-gray-400 mb-1">{ex.note}</p> : null}
      {HINTS[kind] ? <p className="text-xs mb-2" style={{ color: accent }}>{HINTS[kind]}</p> : null}

      {suggested ? (
        <div className="rounded-xl px-3 py-2 mb-3" style={{ background: accent + "1A" }}>
          <p className="text-sm font-bold" style={{ color: accent }}>Today: {suggested}kg</p>
          <p className="text-[11px] text-gray-400">{increaseHint(ex.name)}</p>
        </div>
      ) : null}

      {swap ? (
        <div className="rounded-xl px-3 py-3 mb-3 border-2" style={{ borderColor: "#FFB020", background: "rgba(255,176,32,0.10)" }}>
          <p className="text-xs font-bold mb-1" style={{ color: "#FFB020" }}>No gym? Do this instead</p>
          <p className="text-xs text-gray-200">{homeAlternative(ex.name)}</p>
        </div>
      ) : null}

      <div className="flex gap-2 mb-3">
        <button onClick={function () { setTip(tip === "form" ? null : "form"); }} className={tipBtn}>Form</button>
        <button onClick={function () { setTip(tip === "coach" ? null : "coach"); }} className={tipBtn}>Coach</button>
        <a href={videoLink(ex.name)} target="_blank" rel="noopener noreferrer" className={tipBtn + " text-center block"}>Video</a>
      </div>

      {tip === "form" ? <p className="text-xs text-gray-300 mb-3 rounded-xl bg-white/5 p-3">{formTip(ex.name)}</p> : null}
      {tip === "coach" ? <p className="text-xs text-gray-300 mb-3 rounded-xl bg-white/5 p-3">{coachTip(ex.name)}</p> : null}

      {Array.from({ length: total }).map(function (_, i) {
        const v = fields[i] || {};
        return (
          <div key={i} className="mb-3">
            <p className="text-[11px] uppercase tracking-wide text-gray-500 mb-1">Set {i + 1}</p>
            <div className="flex gap-2">
              {kind === "weight" ? (
                <input type="number" inputMode="decimal" placeholder={suggested ? String(suggested) : "kg"}
                  value={v.weight || ""} onChange={function (e) { setField(i, "weight", e.target.value); }} className={field} />
              ) : null}
              {kind === "time" ? (
                <input type="number" inputMode="numeric" placeholder="seconds"
                  value={v.secs || ""} onChange={function (e) { setField(i, "secs", e.target.value); }} className={field} />
              ) : null}
              {kind === "distance" ? (
                <input type="text" placeholder="time or distance"
                  value={v.text || ""} onChange={function (e) { setField(i, "text", e.target.value); }} className={field} />
              ) : null}
              {kind === "weight" || kind === "reps" ? (
                <input type="number" inputMode="numeric" placeholder="reps"
                  value={v.reps || ""} onChange={function (e) { setField(i, "reps", e.target.value); }} className={field} />
              ) : null}
            </div>
          </div>
        );
      })}

      <button
        onClick={function () { onComplete(ex, exIdx, fields, total, kind); }}
        className="w-full py-4 rounded-2xl font-bold text-base"
        style={{ background: accent, color: "#0E1224" }}
      >
        Completed
      </button>
    </div>
  );
}
