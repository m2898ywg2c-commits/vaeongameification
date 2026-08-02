"use client";

import { useState } from "react";
import { workingWeight, workingHold, increaseHint } from "@/lib/progression";
import { formTip, coachTip, homeAlternative, needsGym } from "@/lib/exercisedb";
import { BRAND } from "@/lib/brand";
import Icon from "../Icon";

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

// Bodyweight movements you are being told to load.
//
// "Weighted Dips, 3 x 10, add a belt if 10 is easy" was classified as bodyweight, because
// "dip" is in the list above, and offered nothing but a reps box. So the app asked for a
// belt and then gave the person nowhere to record what was on it, which makes the
// instruction pointless and the history wrong: a set of dips with 20kg hanging off you is
// not the same set as ten bodyweight dips, and logged as reps alone they are identical.
//
// The added weight is optional, always. Somebody who did them unloaded leaves the box
// empty and nothing changes for them.
function isLoadable(ex) {
  const text = (String(ex.name || "") + " " + String(ex.note || "")).toLowerCase();
  return /weighted|belt|plate|added weight|extra weight|hold a dumbbell|weight vest/.test(text);
}

// Which unit the plan actually asked for. This has to drive the input box, not
// just the copy. Converting "20 min" into 1200 and labelling the box "seconds"
// is technically the same duration and completely useless to someone standing
// in a gym trying to log a run.
function timeUnit(reps) {
  return String(reps || "").toLowerCase().indexOf("min") !== -1 ? "min" : "sec";
}

const UNIT_WORD = { min: "minutes", sec: "seconds" };

// Pull the number the plan asked for so we can prefill it.
function targetNumber(reps) {
  const m = String(reps || "").match(/\d+/);
  return m ? m[0] : "";
}

// The target in its own unit, no conversion. Ranges like "25-30 min" prefill the
// top of the range, on the basis that it is easier to type a smaller number than
// to work out what the range was.
function targetTime(reps) {
  const s = String(reps || "").toLowerCase();
  const m = s.match(/(\d+)(?:\s*-\s*(\d+))?\s*(sec|min)/);
  if (!m) return "";
  return m[2] || m[1];
}

const HINTS = {
  time: "The plan target is filled in. Change it if you went longer or shorter.",
  reps: "Bodyweight. The plan target is filled in. Type over it if you got more or fewer.",
  distance: "Log your time or distance for this one.",
  weight: "Your target is filled in. Type over anything you did differently.",
};

// Turn a home alternative sentence into something short enough to head a card.
// The alternatives are written as instructions ("Bodyweight squats, then hold
// something heavy at your chest"), so the first clause is almost always the
// movement itself.
function swapTitle(alt) {
  const first = String(alt || "").split(/[,.]/)[0].trim();
  return first.length > 3 && first.length < 60 ? first : "";
}

// How long ago the last attempt was, in words. "3 days ago" is the useful comparison;
// a date makes you do arithmetic while standing under a bar.
function agoWords(day) {
  if (!day) return "";
  const parts = String(day).slice(0, 10).split("-");
  const then = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const days = Math.round((now.getTime() - then.getTime()) / 86400000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 14) return days + " days ago";
  if (days < 60) return Math.round(days / 7) + " weeks ago";
  return Math.round(days / 30) + " months ago";
}

// One set, rendered the way a lifter would say it out loud.
function describeSet(row) {
  if (!row) return "";
  if (row.time_text) return String(row.time_text);
  const bits = [];
  if (row.weight) bits.push(Number(row.weight) + "kg");
  if (row.reps) bits.push(bits.length ? "x " + row.reps : row.reps + " reps");
  return bits.join(" ");
}

export default function ExerciseCard({ ex, exIdx, dayKey, profile, weekPct, accent, homeMode, done, maxes, isTestWeek, last, holdProgression, onComplete, onReopen }) {
  const total = Number(ex.sets) || 1;
  const swap = homeMode && needsGym(ex.name);
  const alt = swap ? homeAlternative(ex.name) : "";
  const altTitle = swap ? swapTitle(alt) : "";

  // A swapped exercise is not the barbell lift any more. Someone freestyling in
  // a park is doing bodyweight squats, so heading the card "Barbell Back Squat"
  // and offering them a kg box is confusing at best. Force it to reps, drop the
  // prescribed weight, and lead with the movement they are actually doing.
  //
  // The logged exercise name stays ex.name on purpose, so a lift's history does
  // not fragment across the barbell version and its stand-in. Nothing feeds
  // record_lift_max here because that only fires on kind "weight".
  const kind = swap ? "reps" : loadType(ex);
  const unit = kind === "time" ? timeUnit(ex.reps) : null;
  // A swapped exercise is being done with whatever is to hand in a park, so no belt.
  const loadable = !swap && kind === "reps" && isLoadable(ex);
  const suggested = kind === "weight" ? workingWeight(ex.name, profile, weekPct, maxes) : null;
  const hasRealMax = !!(maxes && maxes[(ex.name || "").toLowerCase()]);

  // YOGA HOLDS PROGRESS LIKE WEIGHTS DO, IN SECONDS.
  //
  // holdProgression is on only for the yoga category. Every other plan has timed work in it
  // too, planks and carries and easy runs, and those are prescribed by the plan rather than
  // grown from a logged best. Turning this on globally would quietly convert every plank in
  // the app into a percentage of your best plank, which nobody asked for.
  //
  // The anchor is the hold you actually logged in week one, not a figure derived from it.
  // There is no one-rep max for a tree pose.
  const holdTarget = holdProgression && kind === "time" ? workingHold(ex.name, weekPct, maxes) : null;
  const hasHold = !!(holdProgression && maxes && maxes[(ex.name || "").toLowerCase()]);

  // On the testing week you find your own number and log it. For lifts that means no
  // prescribed weight; for yoga it means no prescribed hold.
  const calibrating =
    (isTestWeek && kind === "weight" && !hasRealMax) ||
    (isTestWeek && holdProgression && kind === "time" && !hasHold);

  const title = altTitle || ex.name;

  // Last time, if this lift has been done before. A swapped exercise is a different
  // movement performed under the same name, so its history is not shown here: telling
  // somebody doing bodyweight squats in a park that they did 80kg last time is worse
  // than telling them nothing.
  const lastSets = !swap && last && last.sets && last.sets.length ? last.sets : null;
  const lastAgo = lastSets ? agoWords(last.day) : "";

  // Prefill precedence, and the order matters.
  //
  //   1. The prescription, where there is one. That is the coaching, built from the
  //      user's own tested max, and it is the reason to use this app over a notes file.
  //   2. Otherwise what they did last time. This is where recall actually hurts: the
  //      testing week, bodyweight reps and timed holds have no prescribed number, and
  //      those are exactly the fields people were being asked to remember unaided.
  //   3. Otherwise the plan's own target.
  //
  // Last time is SHOWN in every case, even when it is not used to prefill, because the
  // number to beat is the point.
  const [fields, setFields] = useState(function () {
    const seed = {};
    for (let i = 0; i < total; i++) {
      const prev = lastSets ? lastSets[i] : null;
      const prevWeight = prev && prev.weight ? String(Number(prev.weight)) : "";
      const prevReps = prev && prev.reps ? String(prev.reps) : "";
      const prevSecs = prev && prev.time_text ? (String(prev.time_text).match(/\d+/) || [""])[0] : "";

      seed[i] = {
        // Loadable bodyweight work has no prescription to fall back on, so last time's
        // belt weight is the only sensible starting number.
        weight: (!calibrating && suggested) ? String(suggested) : prevWeight,
        reps: kind === "weight" || kind === "reps" ? (targetNumber(ex.reps) || prevReps) : "",
        // A prescribed hold beats the plan's printed target, because the prescription is
        // built from this person's own week one rather than from a sensible average.
        secs: kind === "time"
          ? (calibrating ? "" : (holdTarget ? String(holdTarget) : (targetTime(ex.reps) || prevSecs)))
          : "",
        // Carried through to completeSet so the log records "20 min" rather
        // than "20 sec". Read there, not passed as another argument.
        unit: unit || "sec",
        text: "",
      };
    }
    return seed;
  });
  const [tip, setTip] = useState(null);

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
        className="w-full flex items-center gap-3 rounded-md p-4 mb-3 border text-left"
        style={{ borderColor: "rgba(61,220,151,0.35)", background: "rgba(61,220,151,0.08)" }}
      >
        <span style={{ color: "#3DDC97" }}><Icon name="check" size={16} /></span>
        <span className="flex-1 font-display text-sm" style={{ color: "#3DDC97" }}>{title}</span>
        <span className="text-xs text-brand-muted">Tap to reopen</span>
      </button>
    );
  }

  // Inputs keep their size, because thumbs in a gym need the target, but lose the pill
  // radius and the bold. The number is display face and tabular, so a 5 and an 8 occupy
  // the same width and the row does not twitch as it is typed into.
  const field = "w-full px-3 py-4 rounded-md text-xl text-center text-brand-text placeholder-brand-dim font-display";
  const fieldStyle = { background: "var(--brand-surface)", border: "1px solid " + BRAND.lineStrong };
  const tipBtn = "flex-1 py-2 rounded-sm text-[0.75rem] uppercase border";
  const tipBtnStyle = { borderColor: BRAND.line, color: BRAND.muted, letterSpacing: "0.16em" };

  // "3 x 45 sec" reads as three sets of forty five somethings. For a hold, say
  // what it is: "Hold 45 sec, 3 times".
  const badge = kind === "time"
    ? (total > 1 ? "Hold " + ex.reps + " x " + total : "Hold " + ex.reps)
    : total + " x " + ex.reps;

  const setLabel = kind === "time" ? "Hold" : "Set";

  return (
    <div className="rounded-md border p-4 mb-3" style={{ borderColor: BRAND.line, background: BRAND.surface }}>
      <div className="flex items-start justify-between gap-2 mb-1">
        {/* The exercise name is the one bold thing on this card. It used to compete with a
            filled badge, three bold buttons and a bold set count, which meant nothing was
            actually emphasised. */}
        <p className="font-display text-base font-normal leading-tight flex-1">{title}</p>
        <span className="text-[0.6875rem] px-2 py-1 rounded-sm border flex-shrink-0"
          style={{ borderColor: accent + "55", color: accent, letterSpacing: "0.08em" }}>
          {badge}
        </span>
      </div>

      {swap ? (
        <p className="text-[0.75rem] text-brand-dim mb-1">Standing in for {ex.name}</p>
      ) : null}

      {ex.note ? <p className="text-xs text-brand-muted mb-1">{ex.note}</p> : null}

      {swap ? (
        <div className="rounded-md px-3 py-3 mb-3 border" style={{ borderColor: accent + "55", background: accent + "14" }}>
          <p className="text-xs text-brand-text">{alt}</p>
        </div>
      ) : null}

      {calibrating ? (
        <p className="text-xs mb-2" style={{ color: accent }}>
          {kind === "time"
            ? "Baseline week. No target today. Hold the pose as long as you can keep the shape and the breath, then log the seconds. Every later week is a proportion of this number."
            : "Testing week. No target today. Work up to a set of 8 to 10 you could stop 2 reps short of, then log it. Every week after this is a percentage of this number, so do not max out."}
        </p>
      ) : (loadable
        ? <p className="text-xs mb-2" style={{ color: accent }}>Bodyweight, with the option of loading it. Put any added weight in the +kg box and leave it empty if you did these unloaded.</p>
        : (holdTarget
          ? <p className="text-xs mb-2" style={{ color: accent }}>Your target is {holdTarget} seconds, built from what you held in week one. It is a target, not an instruction: if the shape breaks first, come out and log what you got.</p>
          : (HINTS[kind] ? <p className="text-xs mb-2" style={{ color: accent }}>{HINTS[kind]}</p> : null)))}

      {suggested && !calibrating ? (
        <div className="rounded-md px-3 py-2 mb-3" style={{ background: accent + "1A" }}>
          <p className="font-display text-sm" style={{ color: accent }}>Today: {suggested}kg</p>
          <p className="text-[0.75rem] text-brand-muted">{hasRealMax ? "From your logged max. " : ""}{increaseHint(ex.name)}</p>
        </div>
      ) : null}

      {/* The number to beat. Deliberately plain and not in the accent colour: this is a
          fact about the past, not the coach talking, and it should not compete with the
          prescription directly above it. */}
      {lastSets ? (
        <div className="rounded-md px-3 py-2 mb-3 border border-brand-line bg-brand-surface">
          <p className="text-[0.75rem] uppercase tracking-wide text-brand-dim mb-0.5">Last time &middot; {lastAgo}</p>
          <p className="font-display text-sm text-brand-text">
            {lastSets.map(function (r) { return describeSet(r); }).filter(Boolean).join("   ")}
          </p>
        </div>
      ) : null}

      <div className="flex gap-2 mb-3">
        <button onClick={function () { setTip(tip === "form" ? null : "form"); }} className={tipBtn} style={tipBtnStyle}>Form</button>
        <button onClick={function () { setTip(tip === "coach" ? null : "coach"); }} className={tipBtn} style={tipBtnStyle}>Coach</button>
        <a href={videoLink(title)} target="_blank" rel="noopener noreferrer" className={tipBtn + " text-center block"} style={tipBtnStyle}>Video</a>
      </div>

      {tip === "form" ? <p className="text-xs text-brand-muted mb-3 rounded-md bg-brand-surface p-3">{formTip(ex.name)}</p> : null}
      {tip === "coach" ? <p className="text-xs text-brand-muted mb-3 rounded-md bg-brand-surface p-3">{coachTip(ex.name)}</p> : null}

      {Array.from({ length: total }).map(function (_, i) {
        const v = fields[i] || {};
        return (
          <div key={i} className="mb-3">
            <p className="text-[0.75rem] uppercase tracking-wide text-brand-dim mb-1">
              {setLabel} {i + 1}
              {kind === "time" ? <span className="normal-case"> &middot; in {UNIT_WORD[unit]}</span> : null}
              {/* Set-level history, so you are comparing like with like. A fifth set that
                  did not exist last time correctly shows nothing rather than repeating
                  the fourth. */}
              {lastSets && lastSets[i] && describeSet(lastSets[i])
                ? <span className="normal-case text-brand-dim"> &middot; last {describeSet(lastSets[i])}</span>
                : null}
            </p>
            <div className="flex gap-2">
              {kind === "weight" ? (
                <input type="number" inputMode="decimal" placeholder="kg"
                  value={v.weight || ""} onChange={function (e) { setField(i, "weight", e.target.value); }} className={field} style={fieldStyle} />
              ) : null}
              {loadable ? (
                <input type="number" inputMode="decimal" placeholder="+kg"
                  value={v.weight || ""} onChange={function (e) { setField(i, "weight", e.target.value); }} className={field} style={fieldStyle} />
              ) : null}
              {kind === "time" ? (
                <input type="number" inputMode="numeric" placeholder={UNIT_WORD[unit]}
                  value={v.secs || ""} onChange={function (e) { setField(i, "secs", e.target.value); }} className={field} style={fieldStyle} />
              ) : null}
              {kind === "distance" ? (
                <input type="text" placeholder="time or distance"
                  value={v.text || ""} onChange={function (e) { setField(i, "text", e.target.value); }} className={field} style={fieldStyle} />
              ) : null}
              {kind === "weight" || kind === "reps" ? (
                <input type="number" inputMode="numeric" placeholder="reps"
                  value={v.reps || ""} onChange={function (e) { setField(i, "reps", e.target.value); }} className={field} style={fieldStyle} />
              ) : null}
            </div>
          </div>
        );
      })}

      <button
        onClick={function () { onComplete(ex, exIdx, fields, total, kind); }}
        className="w-full py-4 rounded-md font-display text-base"
        style={{ background: accent, color: "var(--brand-bg)" }}
      >
        {calibrating ? "Log it" : "Completed as planned"}
      </button>
    </div>
  );
}
