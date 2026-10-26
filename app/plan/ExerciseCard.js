"use client";

import { useEffect, useRef, useState } from "react";
import { workingSets, workingReps, progressNote, blockProjection, workingHold, increaseHint, repsFrom, floorFromEst, bestInBlock, adaptFrom, adaptNote, bodyweightLadder, bodyweightTarget, bestBodyweightFrom } from "@/lib/progression";
import { formTip, coachTip, homeAlternative, needsGym } from "@/lib/exercisedb";
import { setIsComplete } from "@/lib/setlog";
import { BRAND } from "@/lib/brand";
import Icon from "../Icon";
import CharacterMotion from "../CharacterMotion";
import NotForMe from "./NotForMe";
import SetFeedback from "./SetFeedback";

function videoLink(name) {
  return "https://www.youtube.com/results?search_query=" + encodeURIComponent(name + " proper form technique");
}

const BODYWEIGHT = ["push up", "press up", "push-up", "press-up", "pull up", "pull-up", "chin up",
  "dip", "burpee", "mountain climber", "jumping jack", "pistol", "handstand", "muscle up",
  "australian", "scapular", "nordic", "jump squat", "glute bridge", "sit up", "crunch",
  "leg raise", "dead bug", "russian twist", "bodyweight", "step up", "high knee"];

const TIMED = ["plank", "hold", "hang", "l-sit", "sit hold", "carry", "walk", "wall sit"];

// Endurance work, which needs TWO numbers rather than one.
//
// Deliberately narrow, and deliberately does not contain "row". Barbell Row, Bent Over Row
// and Seated Cable Row are back exercises, and a list that matched them would have started
// asking people how many kilometres they rowed a barbell. Anything not caught here simply
// behaves as it did before, which is the right failure direction.
const ENDURANCE = ["run", "jog", "cycle", "swim", "erg", "bike"];

// Substring matching finds "run" inside "Post-run Stretch", which is not a run. Checked
// against every exercise name in training.js rather than assumed.
const NOT_ENDURANCE = ["stretch", "mobility", "warm up", "warm-up", "drill"];

// Measured across a floor, but not endurance. A loaded carry is strength work that happens
// to travel, and Farmers Carry at 200m clears any sensible distance threshold while being
// the last thing on earth you would log a pace for. Sleds and broad jumps are under 100m so
// the threshold already excludes them; this catches the ones that are not.
const NOT_CARDIO = ["carry", "sled", "broad jump", "farmer", "lunge"];

function isEndurance(name) {
  const n = String(name || "").toLowerCase();
  if (NOT_ENDURANCE.some(function (x) { return n.indexOf(x) !== -1; })) return false;
  return ENDURANCE.some(function (c) { return n.indexOf(c) !== -1; });
}

// The plan's own target, as kilometres. "1km" is 1, "800m" is 0.8, "5k" is 5.
function targetKm(reps) {
  const s = String(reps || "").toLowerCase();
  let m = s.match(/([\d.]+)\s*k/);
  if (m) return String(Number(m[1]));
  m = s.match(/([\d.]+)\s*m\b/);
  if (m) return String(Number(m[1]) / 1000);
  return "";
}

// THE PRESCRIPTION BEATS THE NAME, AND IT DID NOT USED TO.
//
// The name lists ran before the rep count, so a substring match could overrule a plain
// instruction. "hang" is in TIMED and Hanging Leg Raise is prescribed as three sets of
// fifteen, so the app asked for seconds on an exercise the plan had just counted in reps.
// "carry" did the same to Farmers Carry at 40m, asking for a duration on a distance.
//
// A prescription that says sec, min, metres or a bare number has already answered the
// question. The name lists are the fallback for the cases where it has not, which is what
// they were always meant to be.
function loadType(ex) {
  const reps = String(ex.reps || "").toLowerCase().trim();
  const name = String(ex.name || "").toLowerCase();

  if (reps.indexOf("sec") !== -1 || reps.indexOf("min") !== -1) return "time";
  if (reps.indexOf("m") !== -1 && /\d\s*k?m/.test(reps)) return "distance";
  // A bare rep count settles it. Bodyweight movements get a reps box, everything else
  // gets a load box too, which is what "3 x 15" has always meant on paper.
  if (/^\d/.test(reps)) {
    return BODYWEIGHT.some(function (b) { return name.indexOf(b) !== -1; }) ? "reps" : "weight";
  }
  if (TIMED.some(function (t) { return name.indexOf(t) !== -1; })) return "time";
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

export default function ExerciseCard({ ex, exIdx, dayKey, profile, weekPct, accent, homeMode, done, maxes, isTestWeek, last, history, sessions, weekNo, ladder, holdProgression, onComplete, onReopen, onAvoid, logged, typeId }) {
  const total = Number(ex.sets) || 1;

  // THE CHEER WHEN THIS EXERCISE IS FINISHED.
  //
  // It plays on the transition to done, not on being done. A card that mounts already done,
  // because the page was reloaded or the day reopened, stays still: otherwise reloading a
  // finished session would set six robots jumping at once and the moment would mean nothing.
  // The count is state rather than a flag so that reopening and finishing again cheers again.
  // 40px and the face crop, because the full figure turns into an orb below 60px, and it
  // lives inside the finished card so it can never sit between the thumb and the next set.
  const [cheer, setCheer] = useState(0);
  const wasDone = useRef(done);
  useEffect(function () {
    if (done && !wasDone.current) setCheer(function (n) { return n + 1; });
    wasDone.current = done;
  }, [done]);
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
  // A run is not a hold and not a lift: it has a distance AND a duration, and pace is the
  // number that matters, which is neither of them on its own. Everything the plan measures
  // in metres becomes cardio, as does anything measured in minutes whose name says it moves.
  // A run is not a hold and not a lift: it has a distance AND a duration, and pace is the
  // number that matters, which is neither of them alone.
  //
  // WHICH EXERCISES COUNT, AND WHY IT IS NOT A LIST OF NAMES.
  //
  // Two name-based passes both failed, in opposite directions. Matching "run" swallowed
  // "Post-run Stretch". Requiring an endurance word then dropped "400m Repeats", "Rowing
  // Intervals" and the swim sets called "Main Set", all of which plainly are endurance.
  //
  // The prescribed distance is the honest signal. Everything in this app measured in metres
  // is either endurance work of 100m or more, or it is a sled push at 20 to 50m and burpee
  // broad jumps at 80m, which are loaded strength work that happens to be measured across
  // the floor. A hundred metres separates them cleanly and needs no vocabulary at all.
  //
  // Minute-measured work still needs the name, because "20 min" alone cannot tell a tempo
  // run from a plank. That is what ENDURANCE is left doing, and only that.
  let kind = swap ? "reps" : loadType(ex);
  const prescribedKm = Number(targetKm(ex.reps) || 0);
  const loadedCarry = NOT_CARDIO.some(function (c) { return String(ex.name || "").toLowerCase().indexOf(c) !== -1; });
  if (kind === "distance" && prescribedKm >= 0.1 && !loadedCarry) kind = "cardio";
  if (kind === "time" && isEndurance(ex.name)) kind = "cardio";
  const unit = kind === "time" ? timeUnit(ex.reps) : null;
  // A HOLD THAT SAYS "PER SIDE" IS TWO NUMBERS, NOT ONE.
  //
  // Warrior II is prescribed as 3 x 30 sec per side, which is six holds. Logged as three
  // boxes it recorded half the session and threw away the only comparison that matters in
  // yoga, which is how the two sides differ. Reps and loads that say "per leg" are left
  // alone: a walking lunge is one continuous set and splitting it doubles the taps for
  // nothing anybody reads.
  const perSide = kind === "time" && /per side|each side|per leg|each leg/.test(String(ex.reps || "").toLowerCase());
  // A swapped exercise is being done with whatever is to hand in a park, so no belt.
  const loadable = !swap && kind === "reps" && isLoadable(ex);
  // A ramp, not one number repeated. See workingSets in lib/progression.js: the top set is
  // the prescription and the earlier sets climb to it, which is how the printed programme
  // was always meant to be read and how everybody actually lifts.
  // The prescribed rep count drives the load now. A five rep set and a fifteen rep set are
  // not the same percentage of the same max, and pretending otherwise was prescribing below
  // what this person already lifts on some movements and well above it on others.
  const prescribedReps = repsFrom(ex.reps);
  // The heaviest load already completed for this many reps or more. The prescription is never
  // allowed below it: fewer reps has to mean the same bar or heavier, or the plan is asking
  // for a session this person has already beaten. Computed from `last`, which is the most
  // recent session for this lift and is already loaded.
  // FROM THIS BLOCK'S BESTS, NOT FROM THE LAST SESSION WHENEVER IT WAS.
  //
  // This used to read `last`, the most recent session for the lift regardless of date, so the
  // previous block's peak became the floor under the next block's week one and every block had
  // to open at a personal best. `history` is weekBests for this lift, which the plan page
  // already builds scoped to the current block via weekOfBlock, and which is empty on week one
  // of a new block. See floorFromEst for the full argument.
  const historyFloor = !swap ? floorFromEst(bestInBlock(history), prescribedReps) : null;
  // THE BLOCK NOW ANSWERS BACK, WEEK BY WEEK.
  //
  // Everything else on this line was decided once, from one tested set, and could only ever
  // be revised upwards by the floor. So a block built on an optimistic test stayed optimistic
  // for six weeks, and somebody climbing faster than the ladder expected spent the back half
  // beating a number that had stopped meaning anything.
  //
  // adaptFrom compares what was demonstrated in each finished week with what that week's card
  // actually asked for, and moves the anchor half the distance, capped. A swapped exercise is
  // excluded for the same reason its history is: it is a different movement wearing the same
  // name, and its sets are not evidence about this one.
  const adapt = !swap && kind === "weight"
    ? adaptFrom(ex.name, profile, maxes, total, ex.intensity, ex.reps, history, weekNo, ladder)
    : null;
  const adjust = adapt ? adapt.factor : 1;
  // ex.reps rather than the parsed number, so an authored range like "6-10" keeps its range
  // instead of being flattened to a six and given a derived one.
  const suggestedSets = kind === "weight" ? workingSets(ex.name, profile, weekPct, maxes, total, ex.intensity, ex.reps, historyFloor, adjust) : null;
  const suggested = suggestedSets ? suggestedSets[suggestedSets.length - 1] : null;
  // THE REP COUNT IS NOW PART OF THE PRESCRIPTION AND CAN DIFFER FROM THE AUTHORED ONE.
  //
  // On a light lift the smallest plate is a bigger step than the week is worth, so the block
  // holds the load and asks for a rep instead. The card has to show that, or the session says
  // 12 while the plan means 13 and the log is wrong in a way nobody can see. See ladderFor.
  const targetReps = kind === "weight"
    ? workingReps(ex.name, profile, weekPct, maxes, total, ex.intensity, ex.reps, historyFloor, adjust, ladder)
    : null;
  const loadLadder = kind === "weight"
    ? blockProjection(ex.name, profile, maxes, total, ladder, ex.intensity, ex.reps, historyFloor, adjust)
    : null;
  const thisWeekRow = loadLadder ? loadLadder.find(function (r) { return Number(r.pct) === Number(weekPct); }) : null;
  // A week that holds the bar is a real prescription and has to read like one, otherwise it
  // is indistinguishable from the app forgetting to add weight.
  const progressLine = thisWeekRow ? progressNote(thisWeekRow) : null;
  // Why the number moved, in one sentence, on the card that moved it. A plan that quietly
  // rewrites itself is indistinguishable from a plan with a bug in it.
  const adaptLine = adapt && adapt.steps.length ? adaptNote(adapt.factor) : null;
  // Where this lift ends up if the block is followed. Shown so the ramp reads as a plan
  // rather than as the app being stingy in week one.
  const projection = kind === "weight" ? blockProjection(ex.name, profile, maxes, total, null, ex.intensity, ex.reps, historyFloor, adjust) : null;
  const finalTop = projection ? projection[projection.length - 1].top : null;
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

  // BODYWEIGHT AND HOLD WORK NOW PROGRESSES TOO, AND UNTIL NOW IT SIMPLY DID NOT.
  //
  // Measured over the only completed block in this app: Plank 45 seconds in week one and 45
  // seconds in week six. Hanging Leg Raise 15 reps from week two to the end. Neither is a man
  // who stopped improving, both are a card with no progression model behind it, because
  // workingSets only fires on kind "weight" and workingHold is gated behind yoga.
  //
  // This is separate from holdProgression on purpose. That flag turns a yoga plan's poses
  // into a percentage of your best pose, anchored in lift_maxes. This is the ordinary case:
  // pull ups, dips, leg raises, planks and dead hangs in a strength or hybrid plan, anchored
  // in what was actually logged for that movement in the last few sessions. A block that asks
  // for more ab work has to be able to ask for more of it.
  const bwKind = kind === "time" ? "time" : (kind === "reps" ? "reps" : null);
  const bwBest = bwKind && !swap && !perSide ? bestBodyweightFrom(sessions, bwKind) : null;
  const bwRows = bwKind && !holdProgression && !perSide
    ? bodyweightLadder(bwKind, bwKind === "time" ? targetNumber(ex.reps) : prescribedReps, bwBest, profile, ladder)
    : null;
  const bwRow = bwRows ? bwRows.find(function (r) { return Number(r.pct) === Number(weekPct); }) : null;
  // Only override the authored number once there is history to anchor on. Week one of a new
  // movement is the test, exactly as it is for a barbell lift.
  const bwTarget = bwBest && bwRow ? bwRow.target : null;
  const bwFinal = bwBest && bwRows ? bwRows[bwRows.length - 1].target : null;

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
  // PER-SET STATE, WHICH IS READ FROM THE DATABASE RATHER THAN KEPT LOCALLY.
  //
  // `logged` is this week's rows for this exercise on this day, slotted by set_index, so
  // logged[i] is truthy exactly when set i has been written. Deriving "done" from it rather
  // than from a local tick means a reload, a tab switch or a second phone all agree, which
  // is the failure mode the per-exercise version already had to be fixed for once.
  function loggedRow(i) { return logged && logged.length ? logged[i] : null; }
  function setLogged(i) { return !!loggedRow(i); }

  var liveSet = -1;
  for (var li = 0; li < total; li++) { if (!setLogged(li)) { liveSet = li; break; } }

  // The keypad is opt-in, EXCEPT where there is no prescription to tap, which is exactly
  // what `calibrating` means. This said useState(false) while the comment above it claimed
  // the opposite, so on a testing week the one screen that needed the inputs open was the
  // one that hid them behind a toggle.
  const [editing, setEditing] = useState(calibrating);

  const [fields, setFields] = useState(function () {
    const seed = {};
    for (let i = 0; i < total; i++) {
      // ALREADY DONE THIS WEEK BEATS THE PRESCRIPTION.
      //
      // Reopening a session you finished this morning used to show next week's numbers in
      // every box, because the prescription always won the prefill. That reads as the app
      // having thrown your work away. The progression is for the week that has not happened
      // yet; what is on screen for a week you have already trained should be what you did.
      //
      // `logged` is this week's rows for this exercise on this day, from weekLogs. Falls
      // straight back to the normal precedence when there are none.
      const doneRow = logged && logged.length ? logged[i] : null;
      const prev = lastSets ? lastSets[i] : null;
      const prevWeight = prev && prev.weight ? String(Number(prev.weight)) : "";
      const prevReps = prev && prev.reps ? String(prev.reps) : "";
      const prevSecs = prev && prev.time_text ? (String(prev.time_text).match(/\d+/) || [""])[0] : "";

      seed[i] = {
        // Loadable bodyweight work has no prescription to fall back on, so last time's
        // belt weight is the only sensible starting number.
        weight: doneRow && doneRow.weight !== null && doneRow.weight !== undefined
          ? String(Number(doneRow.weight))
          : ((!calibrating && suggestedSets && suggestedSets[i]) ? String(suggestedSets[i]) : prevWeight),
        // THE PRESCRIBED REP COUNT, NOT THE AUTHORED ONE. A week that progresses by holding
        // the load and adding a rep has to prefill the rep it is asking for, or the box says
        // twelve, the card says thirteen, and whichever one the user trusts the log is wrong.
        reps: doneRow && doneRow.reps !== null && doneRow.reps !== undefined
          ? String(doneRow.reps)
          : (kind === "weight" || kind === "reps"
              ? String(bwTarget || targetReps || targetNumber(ex.reps) || prevReps || "")
              : ""),
        // A prescribed hold beats the plan's printed target, because the prescription is
        // built from this person's own week one rather than from a sensible average.
        // distance_km and duration_min only exist on rows written after 4 August. Older
        // endurance work went into time_text as free text, so that is read as a fallback
        // rather than showing an empty box over a session somebody definitely logged.
        km: kind === "cardio"
          ? (doneRow && doneRow.distance_km ? String(doneRow.distance_km)
             : (targetKm(ex.reps) || (prev && prev.distance_km ? String(prev.distance_km) : "")))
          : "",
        mins: kind === "cardio"
          ? (doneRow && doneRow.duration_min ? String(doneRow.duration_min)
             : (doneRow && doneRow.time_text ? (String(doneRow.time_text).match(/[\d.]+/) || [""])[0]
             : (prev && prev.duration_min ? String(prev.duration_min)
             : (prev && prev.time_text ? (String(prev.time_text).match(/[\d.]+/) || [""])[0] : ""))))
          : "",
        secs: kind === "time"
          ? (calibrating ? "" : (holdTarget ? String(holdTarget) : (targetTime(ex.reps) || prevSecs)))
          : "",
        // Both sides seed from the same prescribed number. They diverge as they are typed,
        // which is the entire point of asking twice.
        secsL: kind === "time"
          ? (calibrating ? "" : (holdTarget ? String(holdTarget) : (targetTime(ex.reps) || prevSecs)))
          : "",
        secsR: kind === "time"
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

  // WHAT A ROW SAYS. One number and its reps, never a string of five to parse.
  function setHeadline(i) {
    if (bwTarget != null) return kind === "time" ? bwTarget + " sec" : bwTarget + " reps";
    if (kind === "weight" && suggestedSets && suggestedSets[i]) {
      return suggestedSets[i] + "kg \u00d7 " + (targetReps || prescribedReps || "");
    }
    if (kind === "time") return String(ex.reps);
    if (kind === "distance" || kind === "cardio") return String(ex.reps);
    // Bodyweight with no history to build from, and the testing week for a weighted lift.
    return calibrating && kind === "weight" ? "Find your own" : String(shownRepsPlain());
  }
  function shownRepsPlain() {
    return (targetReps || prescribedReps || ex.reps) + (repSuffix || "");
  }
  function setSubtitle(i) {
    if (kind !== "weight") return setLabel + " " + (i + 1) + " of " + total;
    if (calibrating) return "Testing week \u00b7 find a working set";
    return i === total - 1 ? "Top set" : "Ramp";
  }

  // TAPPING A ROW LOGS IT AS PRESCRIBED. Tapping a logged row takes it back.
  //
  // The field for that set is filled from the prescription first, because the whole point is
  // that the common case needs nothing typed. Then completeSet runs with the full field
  // state, which it deletes and re-inserts, so the set just tapped and every set already
  // logged end up correct in one write.
  function toggleSet(i) {
    const next = Object.assign({}, fields);
    next[i] = Object.assign({}, next[i] || {});
    if (setLogged(i)) {
      // Undo. Clearing the measurements is what removes the row, because writeSets skips a
      // set with nothing in it.
      ["weight", "reps", "secs", "secsL", "secsR", "text", "km", "mins"].forEach(function (k) { next[i][k] = ""; });
    } else {
      if (kind === "weight") {
        // !calibrating, matching the seed in useState below, which already had this guard.
        // Without it a tap on a testing week writes an app-derived weight as though it were
        // a number you had tested, which is the anchor feedback loop the 2026-09-12
        // migration existed to break, reopened through a different door.
        if (!calibrating && !next[i].weight && suggestedSets && suggestedSets[i]) next[i].weight = String(suggestedSets[i]);
        if (!next[i].reps) next[i].reps = String(targetReps || prescribedReps || "");
      } else if (kind === "reps") {
        if (!next[i].reps) next[i].reps = String(bwTarget || prescribedReps || "");
        if (loadable && !next[i].weight) next[i].weight = "";
      } else if (kind === "time" && !perSide) {
        if (!next[i].secs) next[i].secs = String(bwTarget || targetNumber(ex.reps) || "");
      } else if (kind === "distance") {
        if (!next[i].text) next[i].text = String(ex.reps);
      } else if (kind === "cardio") {
        if (!next[i].km) next[i].km = String(targetKm(ex.reps) || "");
      }
      // A per-side hold and a testing week both need real numbers, so there is nothing
      // sensible to prefill and the keypad is the honest answer.
      //
      // THE MEASUREMENT THAT DEFINES THE KIND, NOT ANY MEASUREMENT.
      //
      // This was an OR across every field. A weighted lift on a testing week prefills its
      // rep count from the range and has no weight to prefill, so the OR passed on the reps
      // alone, the row was written with a null weight, and the set was ticked. Four taps
      // later the exercise closed with no load recorded anywhere. James's Barbell Curl and
      // Hammer Curl rows on 15 and 16 September 2026 are this bug, in his own history.
      //
      // Loadable bodyweight work is deliberately satisfied by reps: the added weight is
      // optional there, and somebody doing them unloaded leaves the box empty on purpose.
      const filled = setIsComplete(kind, perSide, next[i]);
      if (!filled) { setEditing(true); return; }
    }
    setFields(next);
    onComplete(ex, exIdx, next, total, kind, perSide);
  }

  if (done) {
    // Was a single <button> wrapping the whole row. It cannot stay one, because the
    // feedback controls are buttons too and a button inside a button is invalid markup
    // that reopens the card on every tap. The reopen target is now its own button and the
    // card around it is a plain div.
    return (
      <div
        className="rounded-md p-4 mb-3 border"
        style={{ borderColor: "rgba(61,220,151,0.35)", background: "rgba(61,220,151,0.08)" }}
      >
        <button
          type="button"
          onClick={function () { onReopen(exIdx); }}
          className="w-full flex items-center gap-3 text-left"
        >
          <span style={{ color: "#3DDC97" }}><Icon name="check" size={22} /></span>
          <span className="flex-1 font-display text-xl" style={{ color: "#3DDC97", letterSpacing: "-0.02em" }}>{title}</span>
          {typeId ? (
            <CharacterMotion typeId={typeId} size={40} variant="face" on={cheer ? "mount" : "none"} replayKey={cheer} />
          ) : null}
          <span className="text-base text-brand-muted">Reopen</span>
        </button>

        {/* Asked here rather than at the end of the session, because by the time somebody
            has finished six exercises they cannot tell you which one was too heavy. */}
        <div className="flex items-center justify-between gap-2 mt-3 pt-3"
          style={{ borderTop: "1px solid rgba(61,220,151,0.2)" }}>
          <span className="text-base text-brand-muted">How did that feel?</span>
          <SetFeedback dayKey={dayKey} exercise={ex.name} />
        </div>
      </div>
    );
  }

  // Inputs keep their size, because thumbs in a gym need the target, but lose the pill
  // radius and the bold. The number is display face and tabular, so a 5 and an 8 occupy
  // the same width and the row does not twitch as it is typed into.
  const field = "w-full px-3 py-4 rounded-md text-xl text-center text-brand-text placeholder-brand-dim font-display";
  const fieldStyle = { background: "var(--brand-surface)", border: "1px solid " + BRAND.lineStrong };

  // "3 x 45 sec" reads as three sets of forty five somethings. For a hold, say
  // what it is: "Hold 45 sec, 3 times".
  // WHAT THE BADGE SAYS HAS TO BE WHAT THE PLAN MEANS.
  //
  // The authored rep count is no longer always the prescribed one. A light lift progresses by
  // holding the load and adding a rep, and a bodyweight movement progresses entirely in reps
  // or seconds, so a badge hard-wired to ex.reps would read "3 x 12" on a week the plan is
  // asking for thirteen. The log would then be right and the card wrong, which is the worst
  // way round.
  // THE SUFFIX SURVIVES. "12 per side" progressing to thirteen must read "13 per side", not
  // "13": the number is the only part the ladder owns and dropping "per side" halves the
  // prescription. Anything the authored text carried after the digits is kept, and a range
  // like "6-10" is replaced wholesale by the single number being asked for this week.
  const repSuffix = String(ex.reps || "").replace(/^\s*\d+(\s*-\s*\d+)?/, "");
  const withSuffix = function (n) { return String(n) + repSuffix; };
  const shownReps = bwTarget != null
    ? (kind === "time" ? bwTarget + " sec" : withSuffix(bwTarget))
    : (targetReps != null ? withSuffix(targetReps) : ex.reps);
  const badge = kind === "time"
    ? (total > 1 ? "Hold " + shownReps + " x " + total : "Hold " + shownReps)
    : total + " x " + shownReps;

  const setLabel = kind === "time" ? "Hold" : "Set";

  return (
    <div className="rounded-md border p-4 mb-3" style={{ borderColor: BRAND.line, background: BRAND.surface }}>
      <div className="flex items-start justify-between gap-2 mb-1">
        {/* The exercise name is the one bold thing on this card. It used to compete with a
            filled badge, three bold buttons and a bold set count, which meant nothing was
            actually emphasised. */}
        <p className="font-display text-2xl font-normal leading-tight flex-1" style={{ letterSpacing: "-0.02em" }}>{title}</p>
        <span className="px-2 py-1 rounded-sm border flex-shrink-0 font-display text-base"
          style={{ borderColor: accent + "55", color: accent, letterSpacing: "0.06em" }}>
          {badge}
        </span>
      </div>

      {swap ? (
        <p className="text-base text-brand-muted mb-1">Standing in for {ex.name}</p>
      ) : null}

      {/* 16px, not 12px. This is the coaching cue for the movement you are about to do. */}
      {ex.note ? <p className="text-base text-brand-muted mb-2">{ex.note}</p> : null}

      {swap ? (
        <div className="rounded-md px-3 py-3 mb-3 border" style={{ borderColor: accent + "55", background: accent + "14" }}>
          <p className="text-base text-brand-text">{alt}</p>
        </div>
      ) : null}

      {calibrating ? (
        <p className="text-base mb-3" style={{ color: accent }}>
          {kind === "time"
            ? "Baseline week. No target today. Hold the pose as long as you can keep the shape and the breath, then log the seconds. Every later week is a proportion of this number."
            : "Testing week. No target today. Work up to a set of 8 to 10 you could stop 2 reps short of, then log it. Every week after this is a percentage of this number, so do not max out."}
        </p>
      ) : (loadable
        ? <p className="text-base mb-3" style={{ color: accent }}>Bodyweight, with the option of loading it. Put any added weight in the +kg box and leave it empty if you did these unloaded.</p>
        : (holdTarget
          ? <p className="text-base mb-3" style={{ color: accent }}>Your target is {holdTarget} seconds, built from what you held in week one. It is a target, not an instruction: if the shape breaks first, come out and log what you got.</p>
          : (bwTarget
            ? <p className="text-base mb-3" style={{ color: accent }}>
                Target {kind === "time" ? bwTarget + " seconds" : bwTarget + " reps"}, built from your best of {bwBest}{kind === "time" ? " seconds" : ""} in the last few sessions.
                {bwFinal && bwFinal > bwTarget ? " Week six of this block asks for " + bwFinal + (kind === "time" ? " seconds." : ".") : ""}
                {" "}Stop when the form goes, not when the number is reached, and log what you actually did.
              </p>
            : (HINTS[kind] ? <p className="text-base mb-3" style={{ color: accent }}>{HINTS[kind]}</p> : null))))}

      {/* THE FIVE-NUMBER LINE IS GONE, AND THAT IS THE POINT.
          "Today: 90 · 100 · 110 · 120 · 130kg" was 14px and asked you to find the one
          number you needed out of five. Each set row now carries its own, at 28px. What is
          left here is the sentence explaining what the week is asking for, at 16px. */}
      {suggested && !calibrating ? (
        <div className="rounded-md px-3 py-3 mb-3" style={{ background: accent + "1A" }}>
          <p className="font-display text-base" style={{ color: accent }}>
            Top set {suggested}kg &times; {targetReps || prescribedReps}
          </p>
          {progressLine ? (
            <p className="text-base mt-1" style={{ color: "var(--brand-text)" }}>{progressLine}</p>
          ) : null}
        </div>
      ) : null}

      {/* ================================================================================
          REFERENCE GOES BEHIND ONE TOGGLE. Added 2026-09-12.

          Everything in here used to sit open above the set rows: the intensity note, the
          week six projection, the adaptation note, last time, and three tip buttons. Four
          of those are 11 to 12px and none of them is something you read between sets. That
          is roughly 200px of card, above the thing you came to press, for information you
          want once at the start.

          It is not deleted, because every line of it is there for a reason argued elsewhere
          in this file. It is one tap away instead of always in the way.
          ================================================================================ */}
      <button onClick={function () { setTip(tip ? null : "all"); }}
        className="w-full flex items-center justify-between rounded-md px-3 mb-3 border border-brand-line text-left"
        style={{ minHeight: 56 }}>
        <span className="font-display text-base text-brand-text">Details</span>
        <span className="text-base text-brand-muted">{tip ? "Hide" : "Show"}</span>
      </button>

      {tip ? (
        <div className="rounded-md border border-brand-line bg-brand-surface p-3 mb-3">
          {ex.intensity ? (
            <p className="text-base mb-2 text-brand-muted">
              {ex.intensity === "heavy"
                ? "Heavy day. The lighter, higher rep session is later this week."
                : "Volume day. Your heavy session for this lift is the other one this week."}
            </p>
          ) : null}
          {finalTop && finalTop > suggested ? (
            <p className="text-base mb-2" style={{ color: accent }}>Week 6 of this block: {finalTop}kg</p>
          ) : null}
          {adaptLine ? <p className="text-base mb-2 text-brand-muted">{adaptLine}</p> : null}
          {lastSets ? (
            <p className="text-base mb-2 text-brand-muted">
              Last time, {lastAgo}:{" "}
              <span className="font-display" style={{ color: "var(--brand-text)" }}>
                {lastSets.map(function (r) { return describeSet(r); }).filter(Boolean).join("   ")}
              </span>
            </p>
          ) : null}
          <p className="text-base mb-2 text-brand-muted">{formTip(ex.name)}</p>
          <p className="text-base mb-3 text-brand-muted">{coachTip(ex.name)}</p>
          <a href={videoLink(title)} target="_blank" rel="noopener noreferrer"
            className="w-full flex items-center justify-center rounded-md border border-brand-line-strong font-display text-base text-brand-text"
            style={{ minHeight: 56 }}>
            Watch the movement
          </a>
        </div>
      ) : null}

      {/* ================================================================================
          TAP TO LOG, ONE SET AT A TIME. Added 2026-09-12.

          This was ten input boxes and one "Completed as planned" at the bottom, which is
          what made everything on the card small: five set rows plus their labels plus the
          prescription plus the notes plus three tip buttons all had to share a phone
          screen, so every one of them got 11 to 14px and the log button ended up about
          900px below the top of the card.

          A set is now a 76px row you tap when you have done it. The numbers are 28px, the
          subtitle 15px, the tick 56px on its own, and nothing on the card is under 16px.
          The keypad only appears if you actually need it, behind "Change the numbers".

          WHY THIS IS SAFE AGAINST THE DUPLICATE-WRITE HISTORY. completeSet was already a
          delete-then-insert of every row for this exercise on this day, so it is
          idempotent: calling it after each set replaces the exercise's rows with the
          current field state rather than appending. Two things had to change in page.js to
          make that true per set rather than per exercise, and both are commented there:
          concurrent writes queue instead of being dropped, and sets with nothing in them
          are no longer written as rows of nulls.
          ================================================================================ */}

      {editing ? (
        <div className="mb-3">
          <p className="text-base text-brand-muted mb-2">
            Type what you actually did. Blank rows are not logged.
          </p>
      {Array.from({ length: total }).map(function (_, i) {
        const v = fields[i] || {};
        return (
          <div key={i} className="mb-3">
            <p className="text-base text-brand-muted mb-1">
              {setLabel} {i + 1}
              {kind === "time" ? <span className="normal-case"> &middot; in {UNIT_WORD[unit]}</span> : null}
              {/* Set-level history, so you are comparing like with like. A fifth set that
                  did not exist last time correctly shows nothing rather than repeating
                  the fourth. */}
              {lastSets && lastSets[i] && describeSet(lastSets[i])
                ? <span className="text-brand-muted"> &middot; last {describeSet(lastSets[i])}</span>
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
              {kind === "time" && !perSide ? (
                <input type="number" inputMode="decimal" step="any" placeholder={UNIT_WORD[unit]}
                  value={v.secs || ""} onChange={function (e) { setField(i, "secs", e.target.value); }} className={field} style={fieldStyle} />
              ) : null}
              {perSide ? (
                <input type="number" inputMode="decimal" step="any" placeholder={"L " + UNIT_WORD[unit]}
                  value={v.secsL || ""} onChange={function (e) { setField(i, "secsL", e.target.value); }} className={field} style={fieldStyle} />
              ) : null}
              {perSide ? (
                <input type="number" inputMode="decimal" step="any" placeholder={"R " + UNIT_WORD[unit]}
                  value={v.secsR || ""} onChange={function (e) { setField(i, "secsR", e.target.value); }} className={field} style={fieldStyle} />
              ) : null}
              {kind === "distance" ? (
                <input type="text" placeholder="distance or time"
                  value={v.text || ""} onChange={function (e) { setField(i, "text", e.target.value); }} className={field} style={fieldStyle} />
              ) : null}
              {kind === "cardio" ? (
                <input type="number" inputMode="decimal" step="any" placeholder="km"
                  value={v.km || ""} onChange={function (e) { setField(i, "km", e.target.value); }} className={field} style={fieldStyle} />
              ) : null}
              {kind === "cardio" ? (
                <input type="number" inputMode="decimal" step="any" placeholder="minutes"
                  value={v.mins || ""} onChange={function (e) { setField(i, "mins", e.target.value); }} className={field} style={fieldStyle} />
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
            onClick={function () { setEditing(false); onComplete(ex, exIdx, fields, total, kind, perSide); }}
            className="w-full rounded-md font-display text-lg"
            style={{ minHeight: 72, background: accent, color: "var(--brand-bg)" }}
          >
            Save these numbers
          </button>
          <button onClick={function () { setEditing(false); }}
            className="w-full mt-2 rounded-md font-display text-base border border-brand-line-strong text-brand-text"
            style={{ minHeight: 56 }}>
            Back to tapping
          </button>
        </div>
      ) : (
        <div className="mb-3">
          {Array.from({ length: total }).map(function (_, i) {
            const isLogged = setLogged(i);
            const isLive = i === liveSet;
            const sub = isLogged
              ? describeSet(loggedRow(i)) || "Logged"
              : (lastSets && lastSets[i] && describeSet(lastSets[i])
                  ? setSubtitle(i) + " \u00b7 last " + describeSet(lastSets[i])
                  : setSubtitle(i));
            return (
              <button key={i} onClick={function () { toggleSet(i); }}
                aria-pressed={isLogged}
                aria-label={(isLogged ? "Logged: " : "Log ") + setLabel + " " + (i + 1) + ", " + setHeadline(i)}
                className="w-full flex items-center gap-3 mb-2 p-3 rounded-md text-left"
                style={{
                  minHeight: 76,
                  background: isLive && !isLogged ? accent + "12" : "var(--brand-surface)",
                  border: "1px solid " + (isLive && !isLogged ? accent + "88" : "var(--brand-line)"),
                  opacity: isLogged ? 0.62 : 1,
                }}>
                <span className="font-display text-sm text-brand-dim" style={{ width: 14, flex: "0 0 14px" }}>{i + 1}</span>
                <span className="flex-1 min-w-0">
                  <span className="block font-display text-2xl leading-tight">{setHeadline(i)}</span>
                  <span className="block text-base text-brand-muted mt-0.5">{sub}</span>
                </span>
                <span className="grid place-items-center rounded-md"
                  style={{
                    width: 56, height: 56, flex: "0 0 56px",
                    background: isLogged ? accent : "transparent",
                    border: "1px solid " + (isLogged ? accent : "var(--brand-line-strong)"),
                  }}>
                  <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true"
                    style={{ fill: "none", stroke: isLogged ? "var(--brand-bg)" : "var(--brand-dim)", strokeWidth: 1.5, strokeLinejoin: "miter" }}>
                    <polyline points="4 12.5 9.5 18 20 6" />
                  </svg>
                </span>
              </button>
            );
          })}

          <button onClick={function () { setEditing(true); }}
            className="w-full rounded-md font-display text-base border border-brand-line-strong text-brand-text"
            style={{ minHeight: 56 }}>
            {calibrating ? "Enter what you lifted" : "Change the numbers"}
          </button>
        </div>
      )}

      {/* Under the log button, not beside it. Somebody who can do the exercise should never
          have to read past this to finish their set. */}
      {onAvoid ? <NotForMe exercise={ex.name} onAvoided={onAvoid} /> : null}
    </div>
  );
}
