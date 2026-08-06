"use client";

import { useState } from "react";
import { blockProjection, readsAs, repsFrom } from "@/lib/progression";

// THE END OF WEEK REVIEW.
//
// A block is six weeks of numbers that only make sense as a whole, and until now the app
// showed one week at a time and asked people to take the shape on trust. This is the card
// that says where it is going, at the moment somebody has just finished a week and is
// deciding whether to start another one.
//
// Two rules it does not break.
//
// It does not offer to switch an exercise. A lift reading hard for one week is almost always
// the programme working, and an app that responds to a hard week by suggesting you drop the
// movement teaches people to trade difficulty for novelty. If something genuinely does not
// suit, that already lives behind "Not for me" on the card itself, which is a considered
// decision rather than a reaction to one session.
//
// It does not scold. "Came in under" is a fact and is followed by what to do about it. There
// is no red, no warning icon, and nothing that treats a hard week as a failure.
function firstName(screenName) {
  const raw = String(screenName || "").trim();
  if (!raw) return "";
  // "Hampo-1978" is a handle, not a name. Take the readable part before any separator.
  const cut = raw.split(/[-_.\s]/)[0];
  return cut.length > 1 ? cut : raw;
}

export default function BlockReview({ days, profile, maxes, lastSets, weekNo, blockWeeks, ladder, accent, onDismiss }) {
  const [open, setOpen] = useState(true);
  if (!open || !days || !days.length) return null;

  // Every weight-based lift in the week, de-duplicated across days, in the order they appear.
  const seen = {};
  const lifts = [];
  days.forEach(function (d) {
    (d.exercises || []).forEach(function (ex) {
      const key = (ex.name || "").toLowerCase();
      if (!key || !maxes || !maxes[key]) return;
      // A lift split across a heavy and a volume day appears once here, on its heavy day.
      // Two rows for one movement with two different numbers reads as a contradiction in a
      // summary, and the heavy day is the one the block is actually built around.
      if (ex.intensity === "light") return;
      if (seen[key]) return;
      seen[key] = true;
      const total = Number(ex.sets) || 1;
      const proj = blockProjection(ex.name, profile, maxes, total, ladder, ex.intensity, repsFrom(ex.reps));
      if (!proj) return;

      // The week that has just finished, which is the one there is evidence for.
      const doneWeek = Math.max(1, (Number(weekNo) || 1) - 1);
      const prescribed = proj[Math.min(doneWeek, proj.length) - 1];
      const rows = lastSets && lastSets[key] ? lastSets[key].sets || [] : [];
      let loggedTop = 0;
      rows.forEach(function (r) {
        const w = Number(r && r.weight);
        if (w > loggedTop) loggedTop = w;
      });

      lifts.push({
        name: ex.name,
        finalTop: proj[proj.length - 1].top,
        prescribedTop: prescribed ? prescribed.top : null,
        loggedTop: loggedTop || null,
        verdict: readsAs(prescribed ? prescribed.top : null, loggedTop),
      });
    });
  });

  if (!lifts.length) return null;

  const name = firstName(profile ? profile.screen_name : "");
  const easy = lifts.filter(function (l) { return l.verdict && l.verdict.verdict === "easy"; });
  const hard = lifts.filter(function (l) { return l.verdict && l.verdict.verdict === "hard"; });

  function close() {
    setOpen(false);
    if (onDismiss) onDismiss();
  }

  return (
    <div className="rounded-md border p-4 mb-4"
      style={{ borderColor: accent + "66", background: accent + "10" }}>

      <p className="font-display text-base mb-1" style={{ color: accent }}>
        Week {Math.max(1, (Number(weekNo) || 1) - 1)} done{name ? ", " + name : ""}
      </p>
      <p className="text-xs text-brand-muted mb-3">
        Here is what this block is heading for. Week one is meant to feel light. The numbers
        below are the last set of each lift, and week four dips on purpose to bank recovery
        before the peak.
      </p>

      <div className="rounded-md border border-brand-line bg-brand-surface p-3 mb-3">
        {lifts.map(function (l, i) {
          return (
            <div key={i} className={"flex items-baseline justify-between gap-3 " + (i ? "mt-2" : "")}>
              <span className="text-sm truncate">{l.name}</span>
              <span className="font-display text-sm whitespace-nowrap" style={{ color: accent }}>
                {l.prescribedTop ? l.prescribedTop + "kg" : "--"}
                <span className="text-brand-dim"> &rarr; </span>
                {l.finalTop ? l.finalTop + "kg" : "--"}
              </span>
            </div>
          );
        })}
        <p className="text-[0.75rem] text-brand-dim mt-3">
          Last week&rsquo;s top set, then where week {blockWeeks || 6} lands if you keep going.
        </p>
      </div>

      {/* Only shown when there is something to say. A review that manufactures an observation
          every week stops being read by week three. */}
      {easy.length || hard.length ? (
        <div className="mb-3">
          {easy.length ? (
            <p className="text-xs text-brand-muted mb-2">
              <span style={{ color: accent }}>Reading easy:</span>{" "}
              {easy.map(function (l) { return l.name; }).join(", ")}. You went past the target,
              so the max this is built from may already be out of date. Log an honest heavy set
              and the whole ladder moves up with it.
            </p>
          ) : null}
          {hard.length ? (
            <p className="text-xs text-brand-muted">
              <span style={{ color: accent }}>Reading hard:</span>{" "}
              {hard.map(function (l) { return l.name; }).join(", ")}. Hold the same weight next
              week and add a rep instead of forcing the number. A week that fights back is
              usually the block working, not the wrong lift.
            </p>
          ) : null}
        </div>
      ) : (
        <p className="text-xs text-brand-muted mb-3">
          Everything landed where the plan expected. Nothing to change.
        </p>
      )}

      <button type="button" onClick={close}
        className="w-full py-3 rounded-md font-display text-sm"
        style={{ background: accent, color: "var(--brand-bg)" }}>
        Start week {weekNo}
      </button>
    </div>
  );
}
