"use client";

// One freeform block for a Gym ready session. The user types what their PT told them to
// do, then logs the sets. Deliberately close to ExerciseCard in look and behaviour so the
// app does not feel like it has two personalities, but with no prescribed weight, no form
// or coaching content, and a title the user owns.

import { useState } from "react";
import { suggestExercises, canonicalName } from "@/lib/gymready";

const LOCKED = "Only available when Vaeon plans your training.";

const TIMED_WORDS = ["plank", "hold", "hang", "l-sit", "carry", "wall sit", "dead hang"];
const BODYWEIGHT_WORDS = ["push up", "push-up", "press up", "press-up", "pull up", "pull-up",
"chin up", "chin-up", "dip", "burpee", "sit up", "crunch", "leg raise", "mountain climber",
"jumping jack", "muscle up", "pistol", "handstand"];

// Guess how this block should be logged from what was typed. Wrong guesses are cheap
// because the mode chips are right there, but a good guess saves most people a tap.
function inferMode(title) {
  const n = (title || "").toLowerCase();
  if (!n) return "weight";
  if (TIMED_WORDS.some(function (t) { return n.indexOf(t) !== -1; })) return "time";
  if (BODYWEIGHT_WORDS.some(function (b) { return n.indexOf(b) !== -1; })) return "reps";
  return "weight";
}

const MODES = [
  { id: "weight", label: "Weight" },
  { id: "reps", label: "Reps" },
  { id: "time", label: "Time" },
];

export default function GymBlock({ block, blockIdx, accent, done, onComplete, onReopen, onTitleChange, onAddSet }) {
  const [touchedMode, setTouchedMode] = useState(null);
  const [showSuggest, setShowSuggest] = useState(false);
  const [locked, setLocked] = useState(false);
  const [fields, setFields] = useState({});

  const title = block.title || "";
  const total = block.sets || 3;
  const mode = touchedMode || inferMode(title);
  const suggestions = showSuggest ? suggestExercises(title, 6) : [];

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
        onClick={function () { onReopen(blockIdx); }}
        className="w-full flex items-center gap-3 rounded-md p-4 mb-3 border text-left"
        style={{ borderColor: "rgba(61,220,151,0.45)", background: "rgba(61,220,151,0.14)" }}
      >
        <span className="font-display text-lg font-normal" style={{ color: "#3DDC97" }}>&#10003;</span>
        <span className="flex-1 font-display text-sm" style={{ color: "#3DDC97" }}>{title || "Block " + (blockIdx + 1)}</span>
        <span className="text-xs text-brand-muted">Tap to reopen</span>
      </button>
    );
  }

  const field = "w-full px-3 py-4 rounded-md bg-brand-field border border-brand-line font-display text-xl font-normal text-center text-brand-text placeholder-brand-dim";
  const lockBtn = "flex-1 py-2 rounded-md font-display text-xs border border-brand-line bg-brand-surface text-brand-dim";
  const ready = canonicalName(title).length > 0;

  return (
    <div className="rounded-md border border-brand-line bg-brand-surface p-4 mb-3">
      <p className="text-[11px] uppercase tracking-wide text-brand-dim mb-2">Block {blockIdx + 1}</p>

      <div className="relative mb-3">
        <input
          type="text"
          value={title}
          placeholder="What are you doing? e.g. Back Squat"
          onChange={function (e) { onTitleChange(blockIdx, e.target.value); setShowSuggest(true); }}
          onFocus={function () { setShowSuggest(true); }}
          className="w-full px-3 py-3 rounded-md bg-brand-field border font-display text-base font-normal text-brand-text placeholder-brand-dim"
          style={{ borderColor: ready ? accent + "66" : "var(--brand-line)" }}
        />
        {suggestions.length ? (
          <div className="mt-1 rounded-md border border-brand-line bg-[#151A2E] overflow-hidden">
            {suggestions.map(function (s) {
              return (
                <button
                  key={s}
                  onClick={function () { onTitleChange(blockIdx, s); setShowSuggest(false); }}
                  className="w-full text-left px-3 py-2.5 text-sm text-brand-text border-b border-white/5"
                >
                  {s}
                </button>
              );
            })}
            <p className="px-3 py-2 text-[11px] text-brand-dim">
              Pick one so your progress joins up, or keep your own wording.
            </p>
          </div>
        ) : null}
      </div>

      <div className="flex gap-2 mb-3">
        {MODES.map(function (m) {
          const on = mode === m.id;
          return (
            <button
              key={m.id}
              onClick={function () { setTouchedMode(m.id); }}
              className="flex-1 py-2 rounded-md font-display text-xs border"
              style={{
                borderColor: on ? accent : "var(--brand-line)",
                background: on ? accent + "22" : "var(--brand-surface)",
                color: on ? accent : "var(--brand-muted)",
              }}
            >
              {m.label}
            </button>
          );
        })}
      </div>

      <div className="flex gap-2 mb-3">
        <button onClick={function () { setLocked(!locked); }} className={lockBtn}>Form</button>
        <button onClick={function () { setLocked(!locked); }} className={lockBtn}>Coach</button>
        <button onClick={function () { setLocked(!locked); }} className={lockBtn}>Video</button>
      </div>
      {locked ? (
        <p className="text-xs text-brand-muted mb-3 rounded-md bg-brand-surface p-3">{LOCKED}</p>
      ) : null}

      {Array.from({ length: total }).map(function (_, i) {
        const v = fields[i] || {};
        return (
          <div key={i} className="mb-3">
            <p className="text-[11px] uppercase tracking-wide text-brand-dim mb-1">Set {i + 1}</p>
            <div className="flex gap-2">
              {mode === "weight" ? (
                <input type="number" inputMode="decimal" placeholder="kg"
                  value={v.weight || ""} onChange={function (e) { setField(i, "weight", e.target.value); }} className={field} />
              ) : null}
              {mode === "time" ? (
                <input type="number" inputMode="numeric" placeholder="seconds"
                  value={v.secs || ""} onChange={function (e) { setField(i, "secs", e.target.value); }} className={field} />
              ) : null}
              {mode === "weight" || mode === "reps" ? (
                <input type="number" inputMode="numeric" placeholder="reps"
                  value={v.reps || ""} onChange={function (e) { setField(i, "reps", e.target.value); }} className={field} />
              ) : null}
            </div>
          </div>
        );
      })}

      <button onClick={function () { onAddSet(blockIdx); }} className="text-sm underline mb-3" style={{ color: accent }}>
        Add a set
      </button>

      <button
        onClick={function () {
          if (!ready) return;
          onComplete({ name: canonicalName(title) }, blockIdx, fields, total, mode === "reps" ? "reps" : mode);
        }}
        disabled={!ready}
        className="w-full py-4 rounded-md font-display text-base font-normal"
        style={ready ? { background: accent, color: "var(--brand-bg)" } : { background: "var(--brand-field)", color: "var(--brand-dim)" }}
      >
        {ready ? "Log it" : "Name this block first"}
      </button>
    </div>
  );
}
