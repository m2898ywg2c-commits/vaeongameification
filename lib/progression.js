// Six-week block progression. Rules differ by category, because kilos mean nothing to a 5K runner.
//
// HOW THE WEIGHTS ACTUALLY GET CHOSEN, BECAUSE THE COPY USED TO LIE ABOUT IT
//
// This engine is PERCENTAGE OF ESTIMATED MAX, not linear progression. Week one's testing
// set goes through estimateMax() to produce an estimated one-rep max, and every later week
// prescribes a percentage of that number. The step between weeks is therefore a percentage
// of your max, not a fixed number of kilos.
//
// The increase copy used to promise "add 2.5kg upper, 5kg lower", which is a different
// programming system entirely, and the two disagreed in public. Measured across real
// numbers, the engine's week two step is +2.5kg at a 50kg max, +5kg at 100kg and +7.5kg at
// 150kg, and the jump out of the deload into peak week is +10kg, +20kg and +30kg. None of
// that is wrong, it simply was not what the words said.
//
// KNOWN CHARACTERISTIC, NOT YET CHANGED
//
// Epley is calibrated for moderate rep sets. Somebody who tests with a heavy triple gets a
// modest estimated max, and because the ladder tops out at 90 percent their prescriptions
// never exceed what they lifted in week one. Test at 80kg for 3 and the block peaks at
// 80kg. Test at 60kg for 8 and week three matches it and week five beats it, which is what
// a block is supposed to look like.
//
// So the testing week instruction has to name a rep range rather than say "a strong set",
// and it now does. If it keeps happening, the fix is to store the tested working load
// alongside est_max and anchor the ladder to that rather than to a derived one-rep max.

export const BLOCK_WEEKS = 6;

const LIFT_WEEKS = [
  {
    week: 1,
    label: "Technique",
    pct: 0.70,
    focus: "Land on your working weights and get the movement patterns dialled in. Do not chase failure this week.",
    increase: "No increases. Find a weight you could stop 2 reps short of at 8 to 10 reps, and log it. Every later week is a percentage of what you log now, so a set that is too heavy today makes the whole block too heavy.",
  },
  {
    week: 2,
    label: "Build",
    pct: 0.75,
    focus: "Same movements, a little more load. Every rep should still look clean.",
    increase: "Up to 75 percent of your tested max, so the step is bigger the stronger you are. If a lift did not move well last week, hold that weight instead.",
  },
  {
    week: 3,
    label: "Load",
    pct: 0.80,
    focus: "The hardest week of the first half. Last set should feel like two reps left in the tank.",
    increase: "Up to 80 percent. If a lift stalled last week, hold the weight and add a rep instead of forcing the number.",
  },
  {
    week: 4,
    label: "Deload",
    pct: 0.65,
    focus: "Back off on purpose. This week should feel easy, that is the entire point of it.",
    increase: "Down to 65 percent on purpose. It will look like a big drop and it is meant to. You are banking recovery for the peak.",
  },
  {
    week: 5,
    label: "Peak",
    pct: 0.85,
    focus: "Heaviest working sets of the block. Long rests, full effort, quality over quantity.",
    increase: "Up to 85 percent, which is a large step straight out of the deload. If it is not there today, match week three and call it a win.",
  },
  {
    week: 6,
    label: "Test",
    pct: 0.90,
    focus: "Find your new numbers. Work up to a heavy set of three on the main lifts, leaving one rep in reserve.",
    increase: "90 percent, the heaviest of the block. Whatever you hit becomes the baseline for block two, so log it honestly.",
  },
];

const ENDURANCE_WEEKS = [
  {
    week: 1,
    label: "Base",
    pct: 1.0,
    focus: "Establish the routine and an honest easy pace. Most of this block should feel comfortable.",
    increase: "No increases. Note your times so weeks two onwards have something to build on.",
  },
  {
    week: 2,
    label: "Build",
    pct: 1.1,
    focus: "Slightly more volume. Easy runs stay easy, only the hard sessions get harder.",
    increase: "Add roughly 10 percent to your long session. Keep every easy run at the same pace as week one.",
  },
  {
    week: 3,
    label: "Load",
    pct: 1.2,
    focus: "Biggest volume of the first half. Fuel and sleep matter more than effort this week.",
    increase: "Another 10 percent on the long session, or hold the distance and lift the pace on intervals. Not both.",
  },
  {
    week: 4,
    label: "Recovery",
    pct: 0.8,
    focus: "Cut back deliberately. Legs should feel fresh again by the end of the week.",
    increase: "Drop about 25 percent of your volume. Keep the frequency, shorten the sessions.",
  },
  {
    week: 5,
    label: "Peak",
    pct: 1.3,
    focus: "Longest and sharpest week of the block. This is the one that earns the result.",
    increase: "Push the long session past week three, and run intervals at target race pace rather than comfortable.",
  },
  {
    week: 6,
    label: "Taper and test",
    pct: 0.7,
    focus: "Volume drops hard, intensity stays. Then test yourself properly at the end of the week.",
    increase: "Halve your long session, then time trial your target distance. That time is your new baseline.",
  },
];

// YOGA. A third ladder, because a yoga block progresses in seconds and depth rather than
// kilos or miles, and bolting it onto the lifting percentages would have prescribed
// somebody a 75 percent Warrior II.
//
// The multipliers apply to the hold time you logged in week one, not to an estimated max.
// That is the honest model here: there is no one-rep max for a tree pose, there is only how
// long you held it, so week one records that and every later week asks for a proportion of
// it. It also means the low-rep problem that affects the lifting ladder cannot happen, since
// the anchor IS the tested performance rather than something derived from it.
//
// Week four goes down on purpose. Connective tissue adapts more slowly than muscle and a
// six-week ramp with no let-up is how people end up overstretching a hamstring in week five.
const YOGA_WEEKS = [
  {
    week: 1,
    label: "Baseline",
    pct: 1.0,
    focus: "Find your honest hold for each pose. Come out when your breathing changes or the shape starts to fall apart, not when it starts to feel like work.",
    increase: "No targets this week. Hold each pose as long as you can keep the shape and the breath, then log the seconds. Every later week is a proportion of what you log now.",
  },
  {
    week: 2,
    label: "Build",
    pct: 1.15,
    focus: "Same poses, slightly longer. Depth stays where it was, only the clock moves.",
    increase: "About 15 percent longer than week one. If the shape breaks before the time, come out. The time is a target, not an instruction.",
  },
  {
    week: 3,
    label: "Deepen",
    pct: 1.3,
    focus: "The longest holds of the first half. This is where the poses start to feel different rather than just longer.",
    increase: "About 30 percent up on week one. Take the deeper option on anything that offers one, but only if the breath stays even.",
  },
  {
    week: 4,
    label: "Restore",
    pct: 0.85,
    focus: "Deliberately easier. Connective tissue adapts slower than muscle and this is the week that keeps you out of trouble.",
    increase: "Back down below week one. Shorter holds, softer shapes, and no attempt at anything new.",
  },
  {
    week: 5,
    label: "Peak",
    pct: 1.45,
    focus: "Longest holds of the block. Fewer poses, more time in each.",
    increase: "Around 45 percent up on week one. If that is not there today, hold what you can and log it honestly.",
  },
  {
    week: 6,
    label: "Test",
    pct: 1.6,
    focus: "Retest every pose you started with. Same shapes, same standard, and see what six weeks did.",
    increase: "Hold each pose to your limit again, exactly as in week one. Whatever you log becomes the baseline for block two.",
  },
];

export function weeksFor(category) {
  if (category === "endurance") return ENDURANCE_WEEKS;
  if (category === "yoga") return YOGA_WEEKS;
  return LIFT_WEEKS;
}

// Monday aligned, for the same reason as currentWeekIn in lib/gymready.js. These two must
// agree or the same user is on two different weeks depending on which screen asked.
export function currentWeek(blockStart) {
  if (!blockStart) return 1;
  const monday = function (date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    return d;
  };
  const start = monday(blockStart);
  const now = monday(new Date());
  const days = Math.round((now - start) / (24 * 60 * 60 * 1000));
  if (days < 0) return 1;
  const w = Math.floor(days / 7) + 1;
  return Math.min(BLOCK_WEEKS, Math.max(1, w));
}

export function blockComplete(blockStart) {
  if (!blockStart) return false;
  const start = new Date(blockStart);
  const days = Math.floor((new Date() - start) / (24 * 60 * 60 * 1000));
  return days >= BLOCK_WEEKS * 7;
}

const UPPER = ["bench", "press", "dip", "curl", "row", "pulldown", "fly", "pull up", "chin"];

function isUpper(name) {
  const n = (name || "").toLowerCase();
  return UPPER.some(function (u) { return n.indexOf(u) !== -1; });
}

// Rough strength ratios so any common lift can borrow a working weight from your two
// logged maxes (bench and squat). These are estimates to start from, not gospel, and the
// session card invites you to type over them. Order matters: specific keywords first,
// generic ones last, first match wins.
const LIFT_RATIOS = [
  // Lower body, scaled off the squat max.
  { k: "deadlift", ref: "squat", r: 1.2 },
  { k: "romanian", ref: "squat", r: 1.0 },
  { k: "rdl", ref: "squat", r: 1.0 },
  { k: "front squat", ref: "squat", r: 0.85 },
  { k: "hack squat", ref: "squat", r: 1.0 },
  { k: "goblet", ref: "squat", r: 0.4 },
  { k: "split squat", ref: "squat", r: 0.45 },
  { k: "bulgarian", ref: "squat", r: 0.45 },
  { k: "lunge", ref: "squat", r: 0.45 },
  { k: "step up", ref: "squat", r: 0.4 },
  { k: "leg press", ref: "squat", r: 1.8 },
  { k: "hip thrust", ref: "squat", r: 1.1 },
  { k: "glute bridge", ref: "squat", r: 1.0 },
  { k: "leg curl", ref: "squat", r: 0.35 },
  { k: "hamstring", ref: "squat", r: 0.35 },
  { k: "leg extension", ref: "squat", r: 0.4 },
  { k: "calf", ref: "squat", r: 0.6 },
  { k: "squat", ref: "squat", r: 1.0 },
  // Upper body, scaled off the bench max.
  { k: "incline", ref: "bench", r: 0.8 },
  { k: "decline", ref: "bench", r: 1.0 },
  { k: "close grip", ref: "bench", r: 0.9 },
  { k: "overhead press", ref: "bench", r: 0.6 },
  { k: "shoulder press", ref: "bench", r: 0.6 },
  { k: "military", ref: "bench", r: 0.6 },
  { k: "push press", ref: "bench", r: 0.7 },
  { k: "arnold", ref: "bench", r: 0.45 },
  { k: "chest press", ref: "bench", r: 0.9 },
  { k: "bench", ref: "bench", r: 1.0 },
  { k: "weighted dip", ref: "bench", r: 0.9 },
  { k: "bent over row", ref: "bench", r: 0.85 },
  { k: "barbell row", ref: "bench", r: 0.85 },
  { k: "pendlay", ref: "bench", r: 0.85 },
  { k: "row", ref: "bench", r: 0.7 },
  { k: "pulldown", ref: "bench", r: 0.75 },
  { k: "pull down", ref: "bench", r: 0.75 },
  { k: "lat pull", ref: "bench", r: 0.75 },
  { k: "shrug", ref: "bench", r: 1.2 },
  { k: "curl", ref: "bench", r: 0.35 },
  { k: "fly", ref: "bench", r: 0.35 },
  { k: "lateral raise", ref: "bench", r: 0.15 },
  { k: "rear delt", ref: "bench", r: 0.15 },
  { k: "face pull", ref: "bench", r: 0.3 },
  { k: "tricep", ref: "bench", r: 0.4 },
  { k: "pushdown", ref: "bench", r: 0.4 },
  { k: "skull", ref: "bench", r: 0.35 },
  { k: "extension", ref: "bench", r: 0.4 },
  { k: "press", ref: "bench", r: 0.7 },
];

// One-rep-max estimate from a working set, using the formula that suits the rep count.
//
// Epley alone was the whole low-rep problem. It is calibrated for moderate sets and drifts
// high on short ones, which then fed a ladder that tops out at 90 percent and produced
// prescriptions the lifter had already beaten in the test itself. Brzycki is the standard
// choice at five reps and under and is slightly conservative there, which is the right
// direction to be wrong in when the output is a load somebody puts on their back.
//
// They agree closely in the 8 to 10 range the testing week actually asks for, so this
// changes nothing for anyone who followed the instruction.
export function estimateMax(weight, reps) {
  const w = Number(weight);
  const r = Number(reps);
  if (!w) return 0;
  if (!r || r < 1) return w;
  const est = r <= 5
    ? w / (1.0278 - 0.0278 * r)
    : w * (1 + r / 30);
  return Math.round(est * 10) / 10;
}

// The rep range the testing week asks for, and the range in which any 1RM formula is worth
// trusting. Outside it the estimate is an extrapolation.
export const TEST_REPS_MIN = 6;
export const TEST_REPS_MAX = 12;

// WHY A THREE REP TEST CANNOT BE RESCUED BY MATHS.
//
// If you can lift 80kg three times your one-rep max is about 85kg, so 90 percent of it is
// 76kg and a correct six week block never asks you to beat that triple. That is not the
// ladder failing, it is the ladder being right about a test that was too heavy.
//
// The tempting fix, anchoring week one to the tested load so the ladder climbs past it, was
// modelled and rejected: it prescribes a week six load above the lifter's true one-rep max
// for anyone testing at ten reps or fewer, including people who tested correctly.
//
// So catch it at the point of testing instead. Returns null when the test is usable, and a
// reason plus a suggested load when it is not, so the card can ask for one more set rather
// than quietly building six weeks on a number it cannot use.
export function testQuality(weight, reps) {
  const w = Number(weight);
  const r = Number(reps);
  if (!w || !r) return null;
  if (r >= TEST_REPS_MIN && r <= TEST_REPS_MAX) return null;
  if (r < TEST_REPS_MIN) {
    // Roughly the load they should have used to land in range, from the same estimate.
    const est = estimateMax(w, r);
    const suggested = Math.round((est * 0.75) / 2.5) * 2.5;
    return {
      tooHeavy: true,
      reps: r,
      suggested: suggested,
      message: "That was " + r + " rep" + (r === 1 ? "" : "s") + ", which is near your limit rather than a working set. "
        + "Every week of this block is a percentage of what you log now, so a test this heavy makes the block feel light "
        + "and you will not beat it before week six. Try about " + suggested + "kg for 8 to 10, stopping 2 short.",
    };
  }
  return {
    tooLight: true,
    reps: r,
    message: "That was " + r + " reps, which is more endurance than strength and makes the estimate unreliable. "
      + "Add weight and find something you could stop 2 reps short of at 8 to 10.",
  };
}

// THE PRESCRIPTION HAS TO KNOW HOW MANY REPS IT IS ASKING FOR.
//
// This multiplied a one-rep max by the week's percentage and ignored the rep count entirely,
// which is wrong in both directions and was wrong by a lot.
//
// James logged Back Squat 90kg x 10 and Leg Press 100kg x 15. The old model then prescribed
// a Back Squat volume day topping out at 85kg for 8 in week six, below what he was already
// doing, while asking him for 135kg x 15 on the Leg Press, which is thirty five percent more
// than he had just proved he could do. Same formula, opposite failures, because a percentage
// of a one-rep max means nothing until you say how many times you intend to lift it.
//
// repPct is the exact inverse of estimateMax, which makes the whole thing self-consistent:
// lift W for R reps, and the model at full effort prescribes W for R reps back. Verified to
// round-trip exactly on every one of his logged lifts.
export function repPct(reps) {
  const r = Number(reps);
  if (!r || r < 1) return 1;
  return r <= 5 ? (1.0278 - 0.0278 * r) : 1 / (1 + r / 30);
}

// The ladder rescaled to mean "how hard, relative to what you proved in the test".
//
// The raw percentages (0.70 to 0.90) were fractions of a one-rep max. Against a rep-aware
// base they become a fraction of your demonstrated capability at those reps, so 1.0 would
// only ever equal the test and the block could never overload. Mapped so the deload sits at
// 0.80 and week six lands at 1.05, which is a five percent gain across a block: unglamorous,
// and roughly what an intermediate lifter actually adds in six weeks.
export function weekFactor(weekPct) {
  const p = Number(weekPct) || 0.70;
  return 0.80 + ((p - 0.65) / (0.90 - 0.65)) * 0.25;
}

// Pull the rep count out of a prescription. "5" and "12 per leg" both mean twelve working
// reps; "45 sec" and "20m" are not rep work and never reach this.
export function repsFrom(reps) {
  const m = String(reps == null ? "" : reps).match(/^\s*(\d+)/);
  return m ? Number(m[1]) : null;
}

// Working weight suggestion. A real measured max for this exact lift (from the testing
// week or any logged set) wins. Otherwise we scale from the two entered baselines via the
// ratio table, which is an educated guess. maxes is a map of lowercased exercise name to est_max.
export function workingWeight(exerciseName, profile, weekPct, maxes, prescribedReps) {
  const n = (exerciseName || "").toLowerCase();
  // Eight is the middle of the range these plans prescribe, so an unknown rep count errs
  // toward a normal working set rather than toward a single.
  const reps = Number(prescribedReps) > 0 ? Number(prescribedReps) : 8;

  let est = null;
  if (maxes && maxes[n]) {
    est = Number(maxes[n]);
  } else {
    const benchMax = profile && profile.baseline_bench ? Number(profile.baseline_bench) : null;
    const squatMax = profile && profile.baseline_squat ? Number(profile.baseline_squat) : null;
    for (let i = 0; i < LIFT_RATIOS.length; i++) {
      const row = LIFT_RATIOS[i];
      if (n.indexOf(row.k) !== -1) {
        const ref = row.ref === "squat" ? squatMax : benchMax;
        if (ref) est = ref * row.r;
        break;
      }
    }
  }
  if (!est) return null;

  const raw = est * repPct(reps) * weekFactor(weekPct);
  const rounded = Math.round(raw / 2.5) * 2.5;
  return rounded > 0 ? rounded : 2.5;
}

// ONE WEIGHT FOR EVERY SET WAS NEVER HOW ANYBODY LIFTS.
//
// workingWeight returns a single number and the card put it in all five boxes, so a five by
// five squat read "85, 85, 85, 85, 85". Nobody does that. James logged 60, 65, 70, 80, 90:
// he ramps, like every lifter ramps, and then had to type over every box.
//
// The top set is the prescription. Earlier sets ramp up to it, which is a warm-up ladder
// rather than five maximal efforts, and it is what the printed programme always meant.
// Progressive overload then applies to the whole ramp, because the whole ramp is a
// percentage of a top set that moves every week.
//
// Rounded to 2.5kg, the smallest plate pair on a bar.
// intensity is "heavy", "light" or undefined, set by assignIntensity in lib/training.js when
// the same lift lands twice in one week. A light day runs at eighty percent of the heavy
// day's top set with three more reps, so the two sessions are different stimuli rather than
// the same session run twice. Undefined means the lift appears once and the question does
// not arise.
// NO FLAT TRIM. THE REP COUNT IS THE TRIM.
//
// This was 0.80, then 0.95, and both were wrong for the same reason: they were a second
// discount applied on top of a load that was already derived from the volume day's own,
// higher, rep count.
//
// At 0.95 the arithmetic quietly cancelled itself. Week six runs at a factor of 1.05, and
// 1.05 x 0.95 = 0.9975, so the volume day finished the block 0.2 percent BELOW where it
// started. Six weeks of training for no prescribed progress at all, on half the sessions.
// Every individual number looked plausible, which is exactly why it survived two reviews.
//
// The volume day is already the easier session because it asks for eight or ten reps rather
// than five, and the rep-aware base makes that a genuinely lighter bar. Both days now
// progress at the same rate, which is what a block is supposed to do.
export const LIGHT_DAY_LOAD = 1.0;

export function workingSets(exerciseName, profile, weekPct, maxes, totalSets, intensity, prescribedReps) {
  const base = workingWeight(exerciseName, profile, weekPct, maxes, prescribedReps);
  if (!base) return null;
  const top = intensity === "light" ? base * LIGHT_DAY_LOAD : base;
  const n = Math.max(1, Number(totalSets) || 1);
  const round = function (w) {
    const r = Math.round(w / 2.5) * 2.5;
    return r > 0 ? r : 2.5;
  };
  if (n === 1) return [round(top)];
  const out = [];
  for (let i = 0; i < n; i++) {
    // 70 percent of the top set on the first, climbing to the top set on the last.
    const share = 0.70 + (0.30 * (i / (n - 1)));
    out.push(round(top * share));
  }
  return out;
}

// WHERE THE BLOCK ENDS UP, WORKED OUT ON DAY ONE RATHER THAN DISCOVERED IN WEEK SIX.
//
// Returns the top set for every week of the block, so the plan can show somebody what they
// are training towards instead of asking them to trust a percentage they cannot see. The
// deload in week four is in here too and is meant to be visible: a chart that dips is much
// easier to believe than a number that suddenly drops with no warning.
export function blockProjection(exerciseName, profile, maxes, totalSets, weeks, intensity, prescribedReps) {
  const ladder = weeks && weeks.length ? weeks : LIFT_WEEKS;
  const out = ladder.map(function (w, i) {
    const sets = workingSets(exerciseName, profile, w.pct, maxes, totalSets, intensity, prescribedReps);
    return {
      week: i + 1,
      pct: w.pct,
      top: sets ? sets[sets.length - 1] : null,
      sets: sets,
      deload: i > 0 && w.pct < ladder[i - 1].pct,
    };
  });
  return out.some(function (r) { return r.top; }) ? out : null;
}

// Is the prescription reading right against what actually got logged?
//
// Deliberately narrow. It compares the top set prescribed with the heaviest set logged and
// nothing else, because reps, bar speed and how it felt are not in the data. Three answers
// only, and the thresholds are wide on purpose: this is a prompt to look, not a verdict.
//
// It does NOT offer to swap the exercise. Somebody having a hard week does not need the app
// suggesting they give up on back squats, and an exercise that reads hard for two weeks is
// usually the programme working rather than the wrong movement.
export function readsAs(prescribedTop, loggedTop) {
  const p = Number(prescribedTop);
  const l = Number(loggedTop);
  if (!p || !l) return null;
  const ratio = l / p;
  if (ratio >= 1.12) return { verdict: "easy", ratio: ratio,
    note: "You went well past the target. The block may be built on a max that is now out of date." };
  if (ratio <= 0.88) return { verdict: "hard", ratio: ratio,
    note: "You came in under the target. Hold this weight next week and add a rep rather than forcing the number." };
  return { verdict: "on track", ratio: ratio, note: "Landing where the plan expects." };
}

// Prescribed hold, in seconds, for a yoga pose.
//
// The mirror of workingWeight, with one important difference: this multiplies the hold you
// actually logged rather than a max derived from it, so week one's number is the anchor and
// there is no estimation step to get wrong.
//
// Returns null when there is nothing recorded, which is what week one looks like and is the
// signal for the card to ask you to find your own.
//
// Rounded, because a target of 47 seconds implies a precision that does not exist in a pose
// held by feel and is harder to remember.
//
// The step changes with the length, though. Five seconds is sensible on a minute-long
// pigeon and absurd on a fifteen second crow: rounding 12 seconds to the nearest five gives
// 10, which would have shown somebody a week one target BELOW what they had just logged.
// Short holds round to the second, long ones to five.
export function workingHold(exerciseName, weekPct, holds) {
  const n = (exerciseName || "").toLowerCase();
  if (!holds || !holds[n]) return null;
  const raw = holds[n] * (weekPct || 1);
  const rounded = raw < 30 ? Math.round(raw) : Math.round(raw / 5) * 5;
  return rounded > 0 ? rounded : 1;
}

export function increaseHint(exerciseName) {
  return isUpper(exerciseName) ? "+2.5kg when all sets move well" : "+5kg when all sets move well";
}

function weekStart(d) {
  const date = new Date(d);
  const day = (date.getDay() + 6) % 7;
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - day);
  return date.getTime();
}

// Honest reporting: which lifts are climbing, which have stalled, which have gone backwards.
export function liftTrends(logs) {
  const byExercise = {};
  (logs || []).forEach(function (l) {
    if (!l.weight) return;
    const w = weekStart(l.logged_at);
    if (!byExercise[l.exercise]) byExercise[l.exercise] = {};
    const cur = byExercise[l.exercise][w];
    const val = Number(l.weight);
    if (!cur || val > cur) byExercise[l.exercise][w] = val;
  });

  const out = [];
  Object.keys(byExercise).forEach(function (name) {
    const weeks = Object.keys(byExercise[name])
      .map(Number)
      .sort(function (a, b) { return a - b; });
    if (weeks.length < 2) {
      out.push({
        name: name,
        latest: byExercise[name][weeks[0]],
        change: null,
        weeksTracked: weeks.length,
        status: "new",
        message: "Only one week logged so far, nothing to compare yet.",
      });
      return;
    }
    const first = byExercise[name][weeks[0]];
    const latest = byExercise[name][weeks[weeks.length - 1]];
    const prev = byExercise[name][weeks[weeks.length - 2]];
    const change = latest - first;

    let status = "climbing";
    let message = "Up " + change + "kg across " + weeks.length + " weeks. Keep adding.";

    if (latest < prev) {
      status = "down";
      message = "Down " + (prev - latest) + "kg on last week. One bad session is noise, two is a pattern worth looking at.";
    } else if (latest === prev) {
      let stalled = 1;
      for (let i = weeks.length - 2; i > 0; i--) {
        if (byExercise[name][weeks[i]] === latest) stalled++;
        else break;
      }
      if (stalled >= 3) {
        status = "stalled";
        message = "Same weight " + stalled + " weeks running. Time to change something: add a rep, slow the tempo, or check your sleep and food.";
      } else {
        status = "holding";
        message = "Held at " + latest + "kg. Fine for a week, worth a nudge next time.";
      }
    } else if (change <= 0) {
      status = "flat";
      message = "No net gain since week one. Worth reviewing whether the load is actually challenging you.";
    }

    out.push({
      name: name,
      latest: latest,
      change: change,
      weeksTracked: weeks.length,
      status: status,
      message: message,
    });
  });

  const order = { down: 0, stalled: 1, flat: 2, holding: 3, climbing: 4, new: 5 };
  out.sort(function (a, b) { return order[a.status] - order[b.status]; });
  return out;
}

export function trendSummary(trends) {
  const concerns = trends.filter(function (t) {
    return t.status === "down" || t.status === "stalled" || t.status === "flat";
  });
  const climbing = trends.filter(function (t) { return t.status === "climbing"; });
  if (!trends.length) return "Log some sets and this will tell you honestly whether you are progressing.";
  if (!concerns.length && climbing.length) {
    return "Everything tracked is moving up. That is exactly what a block should look like.";
  }
  if (concerns.length && !climbing.length) {
    return "Nothing is climbing right now. That is worth taking seriously rather than training through.";
  }
  return climbing.length + " lifts climbing, " + concerns.length + " worth a look. Progress is rarely uniform.";
}
