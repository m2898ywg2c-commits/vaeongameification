// WHEN IS A LOGGED SET ACTUALLY COMPLETE?
//
// Pulled out of app/plan/ExerciseCard.js so it can be tested, because the version that
// lived inline was wrong for two months and nothing caught it.
//
// THE BUG THIS EXISTS TO PREVENT.
//
// The old rule was an OR across every measurement:
//
//   const filled = !!(weight || reps || secs || text || km);
//
// A weighted lift on a testing week prefills its rep count from the authored range and has
// no weight to prefill, because the whole point of a testing week is that the app does not
// prescribe one. So the OR passed on the rep count alone, the row was written with a null
// weight, and the set was ticked complete. Four taps later the exercise closed with no load
// recorded anywhere, and the block had nothing to anchor on.
//
// It is in James's own history: Barbell Curl on 15 September 2026 and Hammer Curl on the
// 16th, both logged as reps with weight null. On the 15th, 13 of 26 rows had no weight.
//
// THE RULE.
//
// A set is complete when the measurement that DEFINES its kind is present. Not any
// measurement, the defining one. Everything else on the row is optional detail.
//
// Loadable bodyweight work is deliberately satisfied by reps alone. The added weight is
// optional there by design: somebody doing weighted dips unloaded leaves the box empty and
// that is a complete set, not a half-logged one.

export const KINDS = ["weight", "reps", "time", "distance", "cardio"];

/**
 * @param {string}  kind    One of KINDS. Anything else falls back to the permissive rule.
 * @param {boolean} perSide True for a hold logged left and right separately.
 * @param {object}  v       The set's fields: weight, reps, secs, secsL, secsR, text, km, mins.
 * @returns {boolean} Whether this set carries enough to be worth writing.
 */
export function setIsComplete(kind, perSide, v) {
  const f = v || {};
  const has = function (x) { return !!(x !== null && x !== undefined && String(x).trim() !== ""); };

  if (kind === "weight") return has(f.weight);
  if (kind === "reps") return has(f.reps);
  if (kind === "time") return perSide ? has(f.secsL) && has(f.secsR) : has(f.secs);
  if (kind === "distance") return has(f.text);
  if (kind === "cardio") return has(f.km) || has(f.mins);

  // An unrecognised kind should not silently refuse to log. Falling back to the old
  // permissive rule keeps a new exercise type working until it is given a branch here.
  return has(f.weight) || has(f.reps) || has(f.secs) || has(f.text) || has(f.km);
}
