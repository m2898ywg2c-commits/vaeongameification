"use client";

import { useState } from "react";
import { workingWeight, increaseHint } from "@/lib/progression";
import { formTip, coachTip, homeAlternative, needsGym } from "@/lib/exercisedb";

function videoLink(name) {
  return "https://www.youtube.com/results?search_query=" + encodeURIComponent(name + " proper form technique");
}

export default function ExerciseCard({ ex, exIdx, dayKey, profile, weekPct, accent, homeMode, doneSets, onComplete, onReopen }) {
  const [fields, setFields] = useState({});
  const [tip, setTip] = useState(null);

  const total = Number(ex.sets) || 1;
  const suggested = workingWeight(ex.name, profile, weekPct);
  const swap = homeMode && needsGym(ex.name);

  function key(i) { return dayKey + "|" + exIdx + "|" + i; }

  let complete = true;
  for (let i = 0; i < total; i++) {
    if (!doneSets[key(i)]) { complete = false; break; }
  }

  function setField(k, which, val) {
    setFields(function (f) {
      const next = Object.assign({}, f);
      next[k] = Object.assign({}, next[k] || {});
      next[k][which] = val;
      return next;
    });
  }

  if (complete) {
    return (
      <button
        onClick={function () { onReopen(exIdx); }}
        className="w-full flex items-center gap-3 rounded-2xl p-4 mb-3 border text-left"
        style={{ borderColor: "rgba(61,220,151,0.4)", background: "rgba(61,220,151,0.12)" }}
      >
        <span className="text-xl" aria-hidden="true">OK</span>
        <span className="flex-1 text-sm font-bold" style={{ color: "#3DDC97" }}>{ex.name}</span>
        <span className="text-xs text-gray-400">{total} sets done</span>
      </button>
    );
  }

  const bigField = "w-full px-3 py-4 rounded-2xl bg-white/10 border-2 border-white/15 text-xl font-bold text-center text-white placeholder-gray-500";
  const tipBtn = "flex-1 py-2 rounded-xl text-xs font-bold border border-white/15 bg-white/5";

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 mb-3">
      <div className="flex items-start justify-between gap-2 mb-1">
        <p className="text-base font-bold leading-tight flex-1">{ex.name}</p>
        <span className="text-xs font-bold px-2 py-1 rounded-lg flex-shrink-0" style={{ background: accent + "26", color: accent }}>
          {total} x {ex.reps}
        </span>
      </div>
      {ex.note ? <p className="text-xs text-gray-400 mb-2">{ex.note}</p> : null}

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
        const k = key(i);
        if (doneSets[k]) return null;
        const v = fields[k] || {};
        return (
          <div key={i} className="mb-3">
            <p className="text-[11px] uppercase tracking-wide text-gray-500 mb-1">Set {i + 1}</p>
            <div className="flex gap-2 mb-2">
              <input
                type="number"
                inputMode="decimal"
                placeholder={suggested ? String(suggested) : "kg"}
                value={v.weight || ""}
                onChange={function (e) { setField(k, "weight", e.target.value); }}
                className={bigField}
              />
              <input
                type="number"
                inputMode="numeric"
                placeholder="reps"
                value={v.reps || ""}
                onChange={function (e) { setField(k, "reps", e.target.value); }}
                className={bigField}
              />
            </div>
            <button
              onClick={function () { onComplete(ex, exIdx, i, v); }}
              className="w-full py-3 rounded-2xl font-bold text-sm"
              style={{ background: accent, color: "#0E1224" }}
            >
              Done
            </button>
          </div>
        );
      })}
    </div>
  );
}
