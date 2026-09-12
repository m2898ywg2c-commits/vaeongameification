import { startOfWeek as startOfWeekShared } from "./week.js";
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
  const start = startOfWeekShared(blockStart);
  const now = startOfWeekShared(new Date());
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
  //
  // SAME ORDERING RULE AS THE UPPER BODY BLOCK BELOW: the specific variant goes above the
  // generic movement, because the first substring match wins. "Romanian Deadlift" was matching
  // the plain "deadlift" row at 1.2 of the squat max rather than its own row at 1.0, which is
  // a twenty percent over-estimate on one of the four lifts in his block. Caught by
  // test/ratios.mjs, which exists because the same mistake had already shipped once upstairs.
  { k: "romanian", ref: "squat", r: 1.0 },
  { k: "rdl", ref: "squat", r: 1.0 },
  { k: "trap bar", ref: "squat", r: 1.15 },
  { k: "rack pull", ref: "squat", r: 1.3 },
  { k: "deadlift", ref: "squat", r: 1.2 },
  { k: "front squat", ref: "squat", r: 0.85 },
  { k: "hack squat", ref: "squat", r: 1.0 },
  { k: "goblet", ref: "squat", r: 0.4 },
  { k: "split squat", ref: "squat", r: 0.45 },
  { k: "bulgarian", ref: "squat", r: 0.45 },
  { k: "lunge", ref: "squat", r: 0.45 },
  { k: "step up", ref: "squat", r: 0.4 },
  { k: "leg press", ref: "squat", r: 1.8 },
  { k: "good morning", ref: "squat", r: 0.45 },
  { k: "pull through", ref: "squat", r: 0.5 },
  { k: "kickback", ref: "squat", r: 0.15 },
  { k: "abductor", ref: "squat", r: 0.4 },
  { k: "frog pump", ref: "squat", r: 0.3 },
  { k: "hip thrust", ref: "squat", r: 1.1 },
  { k: "glute bridge", ref: "squat", r: 1.0 },
  { k: "leg curl", ref: "squat", r: 0.35 },
  { k: "hamstring", ref: "squat", r: 0.35 },
  { k: "leg extension", ref: "squat", r: 0.4 },
  { k: "calf", ref: "squat", r: 0.6 },
  { k: "squat", ref: "squat", r: 1.0 },
  // Upper body, scaled off the bench max.
  //
  // MOVEMENT KEYS FIRST, QUALIFIER KEYS SECOND, AND THE ORDER IS LOAD BEARING.
  //
  // This table is scanned top to bottom and the FIRST substring match wins, so a qualifier
  // sitting above a movement silently captures it. "Incline DB Curl" matched "incline" at 0.8
  // of the bench max and prescribed a 72.5kg dumbbell curl. Anything whose name contains a
  // press qualifier AND a movement, which is most accessory work, has to meet the movement
  // first. Add new entries by that rule: a curl, a fly or a raise goes above here; an incline,
  // a decline or a grip variation goes below.
  { k: "curl", ref: "bench", r: 0.35 },
  { k: "fly", ref: "bench", r: 0.35 },
  { k: "lateral raise", ref: "bench", r: 0.15 },
  { k: "rear delt", ref: "bench", r: 0.15 },
  { k: "face pull", ref: "bench", r: 0.3 },
  { k: "tricep", ref: "bench", r: 0.4 },
  { k: "pushdown", ref: "bench", r: 0.4 },
  { k: "skull", ref: "bench", r: 0.35 },
  { k: "crunch", ref: "bench", r: 0.3 },
  { k: "crossover", ref: "bench", r: 0.35 },
  { k: "pec deck", ref: "bench", r: 0.35 },
  { k: "landmine rotation", ref: "bench", r: 0.2 },
  { k: "push jerk", ref: "bench", r: 0.75 },
  { k: "woodchop", ref: "bench", r: 0.2 },
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
// only ever equal the test and the block could never overload.
//
// THE FIRST SCALE STARTED THE BLOCK FAR TOO LOW, AND THAT WAS A JUDGEMENT ERROR.
//
// Mapping week one to 0.85 assumed the testing week produces a near-maximal single, which is
// what the classic 70-to-90-percent ladder is written for. This app does not ask for that. It
// asks for a working set of 8 to 10 stopping two short, and James delivered a full five set
// session ramping to 90kg x 10. Starting the next week at 85 percent of that is not a
// sensible taper, it is telling somebody who just did five sets of ten to go and do less.
// Nobody follows a plan that opens by demoting them.
//
// THE SPREAD HAD TO COME DOWN ONCE THE FLOOR STARTED SETTING WEEK ONE.
//
// The scale used to have to do two jobs: decide where the block starts AND how far it climbs.
// floorFromHistory now sets the start, pinning week one to demonstrated capacity, so this
// only has to carry the shape.
//
// It was 0.88 to 1.08, a spread of 1.17. Anchored to a week one that already equals a maximal
// effort, that projected a twenty percent gain in six weeks. Nobody adds twenty percent in six
// weeks, and a plan whose final week is fantasy is as useless as one that starts too light.
//
// Now 0.94 to 1.06, a spread of 1.10. Week one matches what was logged and week six asks for
// about ten percent more, which is a real block for somebody in their first structured six
// weeks. The safety net is already in the copy on every card: if a lift stalls, hold the
// weight and add a rep rather than forcing the number, and the review flags anything reading
// hard at the end of the week.
export function weekFactor(weekPct) {
  const p = Number(weekPct) || 0.70;
  return 0.94 + ((p - 0.65) / (0.90 - 0.65)) * 0.12;
}

// Pull the rep count out of a prescription. "5" and "12 per leg" both mean twelve working
// reps; "45 sec" and "20m" are not rep work and never reach this. A range like "6-10" reads
// as its bottom end, which is where a block starts.
export function repsFrom(reps) {
  const m = String(reps == null ? "" : reps).match(/^\s*(\d+)/);
  return m ? Number(m[1]) : null;
}

// THE REP RANGE A LIFT PROGRESSES THROUGH.
//
// Authored as "6-10" on the exercise. A bare "5" gets a range derived from the block, because
// a single number gives double progression nothing to climb and the old behaviour, holding the
// bar with no explanation, is what prompted this.
//
// WIDTH IS climbingWeeks - 1 SO ONE CYCLE FILLS THE BLOCK. Six weeks has five climbing weeks
// and week one uses the bottom of the range, so four increments land exactly on the top in the
// final week: 6, 7, 8, deload, 9, 10. Derived rather than hardcoded so an eight week Gym ready
// block widens with it instead of topping out in week five and coasting.
// Capped at four because beyond that the top of the range changes what the exercise is: a set
// of six and a set of twelve train different things, and a block that drifts from one to the
// other has quietly stopped being the block that was prescribed. An eight week block therefore
// completes a cycle and starts a second rather than running one very long one.
function defaultWidth(climbingWeeks) {
  const c = (Number(climbingWeeks) || 5) - 1;
  return Math.max(1, Math.min(c, 4));
}

export function repRange(repsText, baseReps, climbingWeeks) {
  const min = Number(baseReps) > 0 ? Number(baseReps) : 8;
  const m = String(repsText == null ? "" : repsText).match(/^\s*(\d+)\s*[-\u2013]\s*(\d+)/);
  if (m) {
    const lo = Number(m[1]);
    const hi = Number(m[2]);
    if (hi > lo) {
      // WIDENED IF THE AUTHORED RANGE WOULD RESET ON THE FINAL WEEK.
      //
      // A six week block has five climbing weeks and week one sits at the bottom, so it needs
      // four increments. An authored "12-15" offers three, so the cycle tops out in week five
      // and week six is a load reset back to twelve: the block's last week is EASIER than its
      // second to last, which reads as the plan falling over at the finish. Leg Press came out
      // 275x15 then 280x12, and 280x12 is four percent below 275x15.
      //
      // Widening by one is the cheaper fix than special-casing the final week, and it is
      // honest: if the block has five climbing weeks then the range needs to be five long.
      const need = defaultWidth(climbingWeeks);
      return { min: lo, max: hi - lo >= need ? hi : lo + need, authored: true };
    }
  }
  return { min: min, max: min + defaultWidth(climbingWeeks), authored: false };
}

// The load cap, adjusted for a floor that has already lifted week one above where the model
// opened. Without this a lift the floor raised would have its whole allowance eaten by the
// floor and finish flat. Kept as its own function so the sweep can assert against it.
export function capFor(baseCap, lift) {
  const l = Number(lift) > 1 ? Number(lift) : 1;
  const c = Number(baseCap) || 0;
  // The floor is evidence and the cap is an estimate, so the floor keeps its ground and the
  // cap still gets to add its own gain on top rather than being consumed.
  return (1 + c) * l - 1;
}

// Working weight suggestion. A real measured max for this exact lift (from the testing
// week or any logged set) wins. Otherwise we scale from the two entered baselines via the
// ratio table, which is an educated guess. maxes is a map of lowercased exercise name to est_max.
// adjust is the weekly adaptation factor from adaptFrom(). It multiplies the anchor rather
// than the finished number on purpose: everything in this file derives from est, so scaling
// est moves the ramp, the projection and the floor comparison together and cannot drift out
// of step with itself the way a fourth multiplier bolted onto the end would.
// The estimated max this lift is prescribed from: a real measured anchor where one exists,
// otherwise scaled off the two entered baselines through the ratio table, which is an educated
// guess. Split out of workingWeight so capacityAt can reach it WITHOUT the 2.5kg rounding.
//
// That rounding was corrupting the capacity reference: workingWeight rounded to the bar and
// capacityAt then divided the week factor back out of a rounded number, which put a 42kg
// Tricep Pushdown's capacity at 43.6 and a 408.8 Leg Press's at 410.3. Small, and it fed
// straight into the opener and the break-even guard, where a kilo decides whether a block
// finishes above capacity or below it.
export function anchorEstFor(exerciseName, profile, maxes) {
  const n = (exerciseName || "").toLowerCase();
  if (maxes && maxes[n]) return Number(maxes[n]) || null;
  const benchMax = profile && profile.baseline_bench ? Number(profile.baseline_bench) : null;
  const squatMax = profile && profile.baseline_squat ? Number(profile.baseline_squat) : null;
  for (let i = 0; i < LIFT_RATIOS.length; i++) {
    const row = LIFT_RATIOS[i];
    if (n.indexOf(row.k) !== -1) {
      const ref = row.ref === "squat" ? squatMax : benchMax;
      return ref ? ref * row.r : null;
    }
  }
  return null;
}

export function workingWeight(exerciseName, profile, weekPct, maxes, prescribedReps, adjust) {
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

  const a = Number(adjust) > 0 ? Number(adjust) : 1;
  const raw = est * a * repPct(reps) * weekFactor(weekPct);
  const rounded = Math.round(raw / 2.5) * 2.5;
  return rounded > 0 ? rounded : 2.5;
}

// The load equal to ONE HUNDRED PERCENT of demonstrated capacity at a given rep count. The
// reference every week of a block is now expressed against, so "where the block opens" and
// "where the block peaks" are both a plain fraction of a number that means something, rather
// than a percentage of a percentage of an estimate.
//
// This is workingWeight with the week's factor taken out of it. Keeping them as one function
// is what let weekFactor's absolute values quietly become load-setting rather than
// shape-setting, which is why they have been re-argued three times.
export function capacityAt(exerciseName, profile, maxes, prescribedReps, adjust) {
  const reps = Number(prescribedReps) > 0 ? Number(prescribedReps) : 8;
  const est = anchorEstFor(exerciseName, profile, maxes);
  if (!est) return null;
  const a = Number(adjust) > 0 ? Number(adjust) : 1;
  return est * a * repPct(reps);
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

// NEVER PRESCRIBE A SET THAT IS STRICTLY BEATEN BY ONE ALREADY LOGGED.
//
// The floor, and the reason it has to exist regardless of what the periodisation model says.
//
// James logged Back Squat 90kg x 10 on Wednesday. The Friday volume day then asked for 87.5kg
// x 8: less weight AND fewer reps. There is no interpretation under which that is harder. A
// first week is allowed to be easier, a deload is supposed to be easier, but neither is
// allowed to be *strictly dominated* on both axes by something the person has already done,
// because that is not a taper, it is the app not knowing what you did.
//
// Fewer reps must mean the same weight or more. So the floor for a prescription of R reps is
// the heaviest load already completed for R reps or more. Taken from the most recent session
// for that lift, which is data the plan page already has loaded and needs no extra query.
//
// Applied on every week including the deload. A deload below what you can comfortably do is
// not recovery, it is a wasted session, and the dip relative to the surrounding weeks
// survives anyway.
// THE FIRST VERSION OF THIS COMPARED THE NUMBER ON THE BAR, WHICH IS NOT THE SAME AS EFFORT.
//
// It floored the Friday volume day at 90kg because 90kg had been lifted. But the logged set
// was 90kg x 10 and the prescription was 90kg x 8: the same bar for two fewer reps, which is
// plainly easier. Matching the weight is not enough. Fewer reps has to mean MORE weight for
// the effort to hold.
//
// So both sides go onto a common footing. Every logged set converts to an estimated max, the
// best one is taken, and that is converted back to a load at the rep count being prescribed.
// 90kg x 10 becomes an estimated 120, which at eight reps is 95kg. That is the floor: 95 x 8
// is the genuine equivalent of 90 x 10, and anything under it is a session already beaten.
// THE FLOOR IS SCOPED TO THE CURRENT BLOCK, AND SCOPE WAS THE BUG.
//
// floorFromHistory reads a session and knows nothing about when it happened, and the plan page
// fed it `last`, the most recent session for the lift, whenever that was. So the floor carried
// the previous block's peak into the next block's week one, and a new block could only ever
// open at or above it. Every block had to start at a personal best, which is not a thing any
// programme does, and it is why James's squat opened at 150kg x 5 against a best five of 140.
//
// The original argument for the floor is untouched and still right: Wednesday 90kg x 10 then
// Friday 87.5kg x 8 is strictly easier on both axes, and no model gets to prescribe that. But
// both of those sessions are the same week of the same block. Nothing in that argument reaches
// across a block boundary, where opening below the last peak is the taper, not a fault.
//
// So this takes the best effort demonstrated IN THIS BLOCK, which the plan page already has as
// weekBests, and is empty on week one of a new block. Same conversion as floorFromHistory,
// same round-up-never-down rule, and the two share bestEstFrom and repPct so they cannot
// disagree about what a session was worth.
export function floorFromEst(bestEst, prescribedReps) {
  const r = Number(prescribedReps);
  const e = Number(bestEst);
  if (!r || !e || e <= 0) return null;
  const f = Math.ceil((e * repPct(r)) / 2.5) * 2.5;
  return f > 0 ? f : null;
}

// The best effort demonstrated so far in this block, from the [{ week, est }] rows the plan
// page builds for adaptFrom. Deliberately includes the current week: a set logged on Tuesday
// is evidence by Thursday.
export function bestInBlock(history) {
  let best = 0;
  (history || []).forEach(function (h) {
    const e = Number(h && h.est);
    if (e > best) best = e;
  });
  return best || null;
}

export function floorFromHistory(loggedSets, prescribedReps) {
  const r = Number(prescribedReps);
  if (!r || !loggedSets || !loggedSets.length) return null;
  const bestEst = bestEstFrom(loggedSets);
  if (!bestEst) return null;
  // Rounded UP to the nearest 2.5kg, never down. Rounding to nearest put the floor fractions
  // of a percent below the effort it was supposed to guarantee: a 90kg x 10 floored to 112.5
  // for a triple, which works out a whisker easier than the set it came from. A floor that
  // can dip under the thing it is flooring is not a floor.
  const f = Math.ceil((bestEst * repPct(r)) / 2.5) * 2.5;
  return f > 0 ? f : null;
}

// The opening rung of every ladder in this file. Used to work out where the block would
// start if nothing were floored, which is what the whole block gets anchored against.
const OPENING_PCT = 0.70;

// ======================================================================================
// WEEKLY ADAPTATION. THE BLOCK ANSWERS BACK.
//
// Everything above this point is decided once, at the start of the block, from a single
// tested max. It has one floor that can raise it and nothing at all that can lower it. So a
// block built on a test that was ten percent optimistic stays ten percent optimistic for six
// weeks, and a person who is climbing faster than the ladder expects spends the back half
// beating a prescription that stopped being a prescription in week two.
//
// This closes both. Each completed week, what was actually lifted is compared with what the
// card actually asked for, and the anchor moves towards the truth.
//
// FIVE RULES, EACH OF WHICH EXISTS BECAUSE THE OBVIOUS VERSION IS WRONG.
//
// 1. COMPARE EFFORT, NOT THE NUMBER ON THE BAR. Both sides go through estimateMax, exactly
//    as floorFromHistory does. 95kg x 8 and 90kg x 10 are the same session and a comparison
//    that calls one of them a miss is measuring the rep count, not the person.
//
// 2. COMPARE AGAINST WHAT THE CARD SHOWED, NOT AGAINST THE LADDER. The prescription includes
//    the floor anchoring, and that anchoring can already sit several percent above the raw
//    model. Judging against the raw model would read a perfectly followed week as a five
//    percent overshoot and ratchet the block up every single week, compounding, with nothing
//    to stop it. So each past week is re-prescribed with the anchor as it stood ENTERING that
//    week, which is what that week's card would have said.
//
// 3. THE DELOAD IS NOT EVIDENCE. Week four is a deliberate, labelled easy week. Plenty of
//    people ignore it and lift what they lifted the week before, and reading that as "beat
//    the target by fifteen percent" would let the one week designed to be easy drive the
//    largest increase in the block.
//
// 4. A MISSED WEEK IS NOT A FAILED WEEK. No logged sets means no opinion. Illness, work and
//    holidays are not evidence about how strong somebody is, and an app that quietly demotes
//    you for missing a week is an app that punishes the exact people it is trying to keep.
//
// 5. DAMPED, CAPPED, AND DEADBANDED. Half the distance, never more than 7.5 percent in a
//    week, and nothing at all inside three percent. One session is noise: a good night's
//    sleep is worth more than three percent and no model should chase it. The cumulative
//    limits stop a fortnight of outliers from rewriting a block.
//
// The floor still sits underneath all of it, so a downward adjustment can never prescribe
// something already beaten. That is the whole safety argument for allowing it to move down
// at all, and it is why this had to come after the floor rather than instead of it.
// ======================================================================================

// Nothing moves inside these bands. Three percent is smaller than the difference a night's
// sleep makes, and a plan that twitches at that resolution reads as random.
//
// THEY ARE DIFFERENT SIZES ON PURPOSE, AND THE SYMMETRIC VERSION WAS BIASED.
//
// The ladder asks for about twelve percent more in week six than in week one. That climb is
// an INTENTION, not a forecast: it is what the block is trying to make happen. Almost nobody
// actually adds twelve percent to a lift in six weeks, so with one shared band every ordinary
// user missed the later weeks by four or five percent, and the model read that as a fault and
// quietly backed them off. Measured: a lifter whose test was exactly right, who hit their
// honest best every single session, was adapted down to 0.946 by week six for the crime of
// not getting stronger on schedule.
//
// So a shortfall has to be bigger before it counts. Missing a target you were meant to be
// stretching for is the normal texture of a block. Beating a target you were meant to be
// stretched by is genuine news, because nobody adds weight to the bar by accident.
export const ADAPT_DEADBAND_UP = 0.03;
export const ADAPT_DEADBAND_DOWN = 0.06;
// Half the distance towards what was demonstrated. Going the whole way makes the plan a
// mirror of last week rather than a programme, and one strong session would then set the
// standard for the rest of the block.
export const ADAPT_SHARE = 0.5;
// The most any single week can move the anchor, in either direction.
export const ADAPT_WEEK_CAP = 0.075;
// The most the whole block can move. A block that has drifted further than this from its own
// test is not a block that needs adjusting, it is a test that needs redoing, and the block
// end report is where that conversation belongs.
//
// THE LOWER LIMIT IS 0.91 FOR ONE ARITHMETICAL REASON, NOT A ROUND NUMBER.
//
// The ladder climbs from 0.964 in week one to 1.06 in week six, a ratio of 1.0996. A factor
// that falls faster than that outruns the block's own progression and the block finishes
// BELOW where it started. At 0.85 it did exactly that: an optimistic test produced six weeks
// running 107.5 down to 100, which is not a training block, it is a decline with a deload in
// it. 1 / 1.0996 is 0.9094, so 0.91 is the point at which the ladder always wins.
//
// This is the same class of error as LIGHT_DAY_LOAD at 0.95 against a week six factor of
// 1.05. Two defensible multipliers, multiplied together, cancelling. Check a block by its
// start to finish gain, never by whether each week looks sensible on its own.
export const ADAPT_MIN = 0.91;
export const ADAPT_MAX = 1.25;

// Best estimated max from a set of logged rows. Shared with floorFromHistory so the two can
// never disagree about what a session was worth.
export function bestEstFrom(loggedSets) {
  let best = 0;
  (loggedSets || []).forEach(function (row) {
    if (!row) return;
    const w = Number(row.weight);
    const reps = Number(row.reps);
    if (!w || !reps) return;
    const e = estimateMax(w, reps);
    if (e > best) best = e;
  });
  return best;
}

// Which week of the block a date falls in. Uses the shared week definition, so this and the
// leaderboard and the plan cannot end up on different weeks. See lib/week.js.
export function weekOfBlock(blockStart, date, blockWeeks) {
  if (!blockStart || !date) return null;
  const start = startOfWeekShared(blockStart);
  const at = startOfWeekShared(date);
  const days = Math.round((at - start) / (24 * 60 * 60 * 1000));
  if (days < 0) return null;
  const w = Math.floor(days / 7) + 1;
  const cap = Number(blockWeeks) || BLOCK_WEEKS;
  return w > cap ? null : w;
}

// history is [{ week, est }], one entry per block week that has logged sets for this lift,
// where est is the best estimated max demonstrated that week. upToWeek is the week the user
// is on now: only weeks strictly before it have finished and count as evidence.
//
// Returns the factor plus the working, because a number that silently changes somebody's
// weights has to be explainable on the screen that changed them.
export function adaptFrom(exerciseName, profile, maxes, totalSets, intensity, prescribedReps, history, upToWeek, weeks) {
  const ladder = weeks && weeks.length ? weeks : LIFT_WEEKS;
  // The floor conversion below needs a number; ladderFor needs the authored text so it keeps
  // the authored rep range. Both come off the same argument so they cannot disagree.
  const parsed = repsFrom(prescribedReps);
  const reps = parsed > 0 ? parsed : 8;
  const steps = [];
  let factor = 1;
  if (!history || !history.length) return { factor: 1, steps: steps };

  const byWeek = {};
  history.forEach(function (h) {
    if (!h) return;
    const w = Number(h.week);
    const e = Number(h.est);
    if (!w || !e) return;
    if (!byWeek[w] || e > byWeek[w]) byWeek[w] = e;
  });

  // The floor as it stood entering each week, rather than the floor today. Today's floor
  // includes sets that had not been lifted yet when the week being judged was prescribed,
  // and judging a past week against a future floor reads every improvement as a shortfall.
  //
  // SEEDED FROM THE TESTED MAX, WHICH IS NOT AN OPTIONAL DETAIL.
  //
  // est_max is not a guess, it is the estimated max from a set this person actually lifted in
  // the testing week, so the floor was already in force on the very first card. Starting this
  // at zero re-prescribed week one WITHOUT the floor, came out at 102.5kg against the 107.5kg
  // the card really showed, and then read a perfectly followed week as a five percent
  // overshoot. Every user would have drifted upwards for doing exactly as they were told.
  let floorEst = maxes && maxes[(exerciseName || "").toLowerCase()]
    ? Number(maxes[(exerciseName || "").toLowerCase()]) || 0
    : 0;
  const lastFinished = Math.min(ladder.length, (Number(upToWeek) || 1) - 1);

  for (let w = 1; w <= lastFinished; w++) {
    const logged = Number(byWeek[w]) || 0;
    const rung = ladder[w - 1];
    const isDeload = w > 1 && rung.pct < ladder[w - 2].pct;
    if (logged && !isDeload) {
      const floorLoad = floorEst > 0 ? Math.ceil((floorEst * repPct(reps)) / 2.5) * 2.5 : null;
      const rows = ladderFor(exerciseName, profile, maxes, totalSets, intensity, prescribedReps, floorLoad, factor, ladder);
      const asked = rowForPct(rows, rung.pct);
      const top = asked ? asked.top : null;
      // No prescription that week means nothing to compare against. That is the testing
      // week for anybody without a max, and it is correctly silent here.
      if (top) {
        // AGAINST THE REPS THE CARD ASKED FOR, NOT THE AUTHORED ONES.
        //
        // A rep week prescribes the same bar for one more rep, which is more effort, and
        // converting it at the authored rep count would read a followed week as a shortfall
        // and quietly adapt the lifter downwards for doing exactly as they were told. Same
        // mistake as seeding the floor at zero, one layer along.
        const expected = top / repPct(asked.reps);
        const ratio = logged / expected;
        let step = 1;
        const band = ratio >= 1 ? ADAPT_DEADBAND_UP : ADAPT_DEADBAND_DOWN;
        if (Math.abs(ratio - 1) > band) {
          step = 1 + ADAPT_SHARE * (ratio - 1);
          if (step > 1 + ADAPT_WEEK_CAP) step = 1 + ADAPT_WEEK_CAP;
          if (step < 1 - ADAPT_WEEK_CAP) step = 1 - ADAPT_WEEK_CAP;
          factor = factor * step;
          if (factor > ADAPT_MAX) factor = ADAPT_MAX;
          if (factor < ADAPT_MIN) factor = ADAPT_MIN;
        }
        steps.push({
          week: w,
          expected: Math.round(expected * 10) / 10,
          logged: Math.round(logged * 10) / 10,
          ratio: Math.round(ratio * 1000) / 1000,
          moved: Math.round((step - 1) * 1000) / 10,
          factor: Math.round(factor * 1000) / 1000,
        });
      }
    }
    if (logged > floorEst) floorEst = logged;
  }

  return { factor: factor, steps: steps };
}

// One line, in plain words, for the card. Null when nothing has moved, because "no change"
// is not worth a sentence.
export function adaptNote(factor) {
  const f = Number(factor) || 1;
  const pct = Math.round((f - 1) * 1000) / 10;
  if (Math.abs(pct) < 0.5) return null;
  if (pct > 0) {
    return "Up " + pct + " percent on the original plan, because you have been finishing above target.";
  }
  return "Down " + Math.abs(pct) + " percent on the original plan, because the last weeks came in under target. Earn it back and it climbs again.";
}

// ======================================================================================
// THE BLOCK USED TO OVERLOAD ITSELF, AND NOTHING WAS CHECKING THE TOTAL.
// Added 2026-09-12, off the first six weeks of real data anybody has ever completed.
//
//   Back Squat        estimated max 120 -> 168    +40%
//   Romanian Deadlift               120 -> 187    +56%
//   Hip Thrust                      140 -> 207    +48%
//   Leg Press                       150 -> 409   +173%
//
// Nobody adds forty percent to a squat in six weeks. What happened is a feedback loop with
// nothing damping it:
//
//   the prescription is a percentage of lift_maxes.est_max
//   -> the set gets hit
//   -> record_lift_max() does greatest(existing, new), so est_max rises
//   -> next week prescribes a percentage of the NEW est_max
//   -> round again, compounding, for six weeks
//
// Every safeguard in this file guards ONE WEEK. floorFromHistory stops a prescription being
// easier than something already done. adaptFrom caps how far the anchor MULTIPLIER can drift.
// Neither can see the anchor itself moving underneath them, because est_max is at the same
// time an input to the prescription and an output of following it.
//
// THE TELL IS THAT THE HONEST LIFT DID NOT MOVE. Bench was the one lift tested with a real
// effort, and across the block it went 100 -> 102.5 -> 105 -> 107 -> 100. Call it two and a
// half percent. Every lift that "gained" forty percent and up is a lift whose testing week
// was entered light, and the loop then booked the correction as progress.
//
// Three changes, in the order they matter.
//
// 1. THE ANCHOR IS FROZEN FOR THE BLOCK, and it is taken from recent form rather than from
//    the best set ever logged. See anchorFrom below. est_max stays exactly as it is, because
//    it is a fair record of a best-ever effort and the PB screens want it. Within a block the
//    only thing now allowed to move the weights is adaptFrom, which is deadbanded, damped and
//    capped, which is what it was written for and what the moving anchor was bypassing.
//
// 2. THE BLOCK'S TOTAL GAIN IS CAPPED, AND THE CAP SHRINKS AS THE BAR GETS HEAVIER. The
//    ladder asked for about ten percent across six weeks, for everybody, at every load. Ten
//    percent of a 60kg squat is six kilos, which a beginner walks. Ten percent of a 140kg
//    squat is fourteen kilos, which is most of a good year. One percentage cannot be right
//    for both. This is the thing James could feel: the block was fine early and fantasy once
//    the weights got real. He read it as the step being too big at the top, and the step at
//    the top was in fact the smallest in the block. The TOTAL was the problem.
//
// 3. THE BLOCK PROGRESSES WITH WHICHEVER INSTRUMENT IS FINER AT THAT LOAD, and sometimes
//    that means holding. James asked for this as "stagger it, more weight one week and more
//    reps the other", which is the right instinct and the wrong way round for his main
//    lifts. The arithmetic settles it, and it is worth writing down because the obvious
//    answer is backwards.
//
//    Adding one rep at a fixed bar multiplies the estimated max by 1 + 1/(30 + reps). At
//    six reps that is 2.8 percent and at fifteen reps 2.2 percent, so a rep is worth
//    roughly two and a half percent almost wherever you stand. Adding the smallest plate
//    pair is worth 2.5/load, which is 4.2 percent on a 60kg bar and 1.7 percent on a 150kg
//    one.
//
//    So on a heavy lift the PLATE is the fine adjustment and a rep is the blunt one, and on
//    a light accessory it is the other way round. A single rule for both is wrong for one of
//    them, which is why the first version of this raised a 150kg squat by 6.7 percent in a
//    week while trying to express a 1 percent step.
//
//    Each climbing week therefore picks from three candidates, hold the bar, add a plate, or
//    add a rep, and takes whichever lands closest to the week's capped effort target. Heavy
//    barbell work comes out as plates with hold weeks in between. Cables and dumbbells come
//    out as reps. Nobody had to choose: the loads chose.
//
//    A HOLD WEEK IS A REAL PRESCRIPTION AND HAS TO READ LIKE ONE. Three quarters of a
//    capped block on a heavy lift is the same number two weeks running, and an app that
//    shows that with no explanation looks broken. See progressNote.
// ======================================================================================

// HOW MUCH A LIFT MAY GAIN ACROSS ONE BLOCK, as a fraction of where it starts.
//
// Decays with the log of the load, because strength gain is roughly a fixed number of kilos
// per block rather than a fixed percentage, and a fixed number of kilos is a shrinking
// percentage of a growing bar. Calibrated so a 40kg lift may add about thirteen percent and a
// 200kg lift about four, which is the shape every strength standards table has.
// CALIBRATED SO A HEAVY BARBELL LIFT GETS TWO PLATE STEPS IN A BLOCK, NOT ONE.
//
// The decay was 0.07 first, which put a 150kg squat on a cut at 2.55 percent. That is 3.8kg,
// and since a step at that load is 2.5kg only one step ever fitted, so the block came out at
// 1.7 percent: flatter than the 2.5 percent he actually managed on bench last block at barely
// half the sessions. A cap that forbids what the user has already done is the same error as
// the floor catches, one level up.
//
// At 0.06 a 150kg lift on a cut gets 3.3 percent, which is exactly two steps, and the shape
// still falls away properly: 6.6 percent at 60kg, 4.8 at 100kg, 3.3 at 150kg, 2.3 at 200kg.
// Erring a shade ambitious is the right side to be wrong on, and for once that is an argument
// from the machinery rather than from optimism: adaptFrom pulls the whole block down when the
// weeks come in under target, and the floor stops it ever dropping below what has been done.
// There is a corrective for too hot. There is none for a block that never asks for anything.
export const GAIN_CAP_AT_40KG = 0.135;
export const GAIN_CAP_DECAY = 0.06;
export const GAIN_CAP_MIN = 0.03;
export const GAIN_CAP_MAX = 0.16;

// IN A DEFICIT THE CAP COMES DOWN AGAIN, AND THIS IS NOT A DETAIL.
//
// Strength still climbs while losing weight, but nowhere near as fast, and this app now has a
// nutrition goal on the profile so there is no excuse for ignoring it. A block that promises
// a cutting lifter the same gain as a bulking one is the same class of lie as the one above,
// just better hidden. James is on 'lose' and six weeks of his data show bodyweight flat and
// bench up two and a half percent, which is almost exactly what this factor predicts.
export const DEFICIT_GAIN_SCALE = 0.6;

// WHERE A BLOCK OPENS, AS A FRACTION OF DEMONSTRATED CAPACITY AT THE BOTTOM OF THE REP RANGE.
//
// 0.93, and the exact number matters here in a way it did not before, because it is now the
// ONLY parameter setting the block's height. Every written strength programme opens a block
// submaximal and climbs through the previous best, and this app has now got that wrong in both
// directions.
//
// WHY 0.93 AND NOT 0.90. With a rep range four wide the reps alone carry the block up by
// repPct(min)/repPct(max), which is 11.1 percent from sixes to tens and 10.5 from eights to
// twelves. Opening at 0.93 therefore lands the final week 3.3 percent ABOVE demonstrated
// capacity, which is almost exactly what blockGainCap allows a heavy lift on a cut. The two
// halves of the design agree without being made to.
//
// At 0.90 they did not. The final week landed at 1.000 of capacity, dead level, which means
// the next block re-derives the same anchor, opens at the same fraction, and prescribes the
// same weight forever. **A block that only reaches capacity is a block that loops**, and that
// is the failure this constant is really guarding against.
//
// August opened at 0.85, then 0.88, of an anchor that was a near-maximal single, which read as
// a demotion to somebody who had just done five sets of ten. The correction raised it to 0.964
// and handed the job of setting the start to floorFromHistory, which pinned week one to the
// best effort EVER logged. That is the version James has just told us is too heavy, and he is
// right: it meant a new block could only open at or above the last block's peak, so every
// block had to begin with a personal best.
//
// Neither attempt was wrong about its own end of the problem. A block must not open by
// demoting you, and it must not finish below what you have already done. Those are two
// constraints on two different weeks, and the fix is to pin them separately: this constant
// sets the opener, and 1 + blockGainCap() sets the peak. The ladder shape just joins them up.
export const OPENING_FACTOR = 0.93;

export function blockGainCap(load, profile) {
  const L = Number(load);
  let cap = GAIN_CAP_MAX;
  if (L > 0) {
    cap = GAIN_CAP_AT_40KG - GAIN_CAP_DECAY * Math.log(L / 40);
    if (cap > GAIN_CAP_MAX) cap = GAIN_CAP_MAX;
    if (cap < GAIN_CAP_MIN) cap = GAIN_CAP_MIN;
  }
  const goal = profile && profile.nutrition_goal;
  if (goal === "lose") cap = cap * DEFICIT_GAIN_SCALE;
  return cap;
}

// THE DELOAD IS A FIXED DEPTH, NOT A SHARE OF THE CLIMB.
//
// Compressing the whole ladder shape, dip included, meant that the more the cap bit the
// shallower the deload got: at a three percent block cap, week four came out three quarters
// of one percent below week one, which is not a recovery week, it is a rounding error. The
// climb is what the cap is about. The deload is a physiological decision and is independent
// of it.
export const DELOAD_DEPTH = 0.92;

// The most the reps may climb above the authored prescription before the load has to move
// instead. Two is the ceiling because a five becoming an eight is a different exercise: a
// heavy triple and a set of eight train different things, and a block that drifts from one to
// the other has quietly stopped being the block that was prescribed.
export const REP_BUMP_MAX = 2;

// THE SMALLEST HONEST CHANGE ON THE BAR, WHICH IS NOT 2.5KG EVERYWHERE.
//
// Everything in this file rounded to 2.5kg, described as the smallest plate pair, which is
// right for a barbell and wrong for a leg press. 2.5kg on a 262kg sled is a third of one
// percent, finer than the machine's own plates and finer than anybody can feel, so it turned
// a capped block into a run of numbers that differed by noise. Two percent of the load,
// floored at a plate pair, tracks what people really add: 2.5kg up to about 120kg, 5kg on a
// heavy machine, 7.5kg on a very heavy one.
export function loadStep(load) {
  const L = Number(load) || 0;
  const proportional = Math.round((L * 0.02) / 2.5) * 2.5;
  return proportional > 2.5 ? proportional : 2.5;
}

// Effort, as an estimated max, for a prescribed load and rep count. repPct is the exact
// inverse of estimateMax, so this is the same currency the floor and adaptFrom compare in and
// the three cannot disagree about what a set was worth.
function effortOf(load, reps) {
  const r = Number(reps) > 0 ? Number(reps) : 8;
  return Number(load) / repPct(r);
}

// ANCHOR FROM RECENT FORM, NOT FROM THE BEST SET EVER LOGGED.
//
// bestEstFrom takes an all time maximum, which is right for a personal best and wrong for a
// prescription. Two lifts in James's data show why. His Overhead Press holds an estimated 60
// off a single 50kg x 6 in week one; he pressed 30kg x 6 in week six. His Incline Dumbbell
// Press holds 114 off a week one entry of 90kg x 8 that is almost certainly a mis-entry, and
// he has logged 44 to 64 in every session since. Under greatest() both numbers are permanent,
// and the next block would have opened by asking him for a press he has never made and an
// incline he probably never made either.
//
// Taking the best of the last few sessions fixes both without deleting anything. A lift that
// has genuinely climbed still anchors at the top, because its recent sessions ARE its best
// ones. A lift carrying one bad row anchors where the person actually trains. And it self
// heals: come back after a lay-off and the block builds from what you can do now.
export const ANCHOR_SESSIONS = 3;

// AND NEVER MORE THAN THIS ABOVE THE MOST RECENT SESSION.
//
// Three sessions was not enough on its own. His Overhead Press has only ever been logged
// twice, 50kg x 6 in week one and 30kg x 6 in week six, so both sessions are inside the
// window and the bad one still won: the block opened by asking a man who pressed 30kg for
// 47.5kg. The most recent session is the single best estimate of what somebody can do today,
// so it sets a ceiling, with ten percent of room so that one genuinely rough morning does not
// re-scale a whole block downwards either.
export const ANCHOR_RECENT_TOLERANCE = 1.10;

// sessions is [{ day, sets: [{ weight, reps }] }] newest first, which is the shape the plan
// page already groups exercise_logs into.
export function anchorFrom(sessions) {
  const rows = (sessions || []).slice(0, ANCHOR_SESSIONS);
  let best = 0;
  rows.forEach(function (s) {
    const e = bestEstFrom(s && s.sets);
    if (e > best) best = e;
  });
  if (!best) return null;
  const latest = bestEstFrom(rows[0] && rows[0].sets);
  if (latest > 0) {
    const ceiling = latest * ANCHOR_RECENT_TOLERANCE;
    if (best > ceiling) best = ceiling;
  }
  return Math.round(best * 10) / 10;
}

// THE WHOLE BLOCK, WORKED OUT IN ONE PLACE.
//
// workingSets used to decide a week in isolation from its own percentage, which is why no
// safeguard in this file could ever see a total. Everything now comes out of here, so a
// single week and the six week projection are literally the same arithmetic and cannot drift
// apart the way the load and the copy did.
//
// Returns one row per week: { week, pct, top, reps, sets, deload, mode }, where mode is
// "load" when the bar moved, "reps" when the bar held and a rep was added, and "deload".
export function ladderFor(exerciseName, profile, maxes, totalSets, intensity, prescribedReps, floor, adjust, weeks) {
  const ladder = weeks && weeks.length ? weeks : LIFT_WEEKS;
  const light = intensity === "light" ? LIGHT_DAY_LOAD : 1;

  // THE RANGE FIRST, BECAUSE THE BOTTOM OF IT IS THE REP COUNT EVERYTHING ELSE IS BUILT ON.
  //
  // prescribedReps accepts either a number or the authored text, so "6-10" keeps its range
  // rather than being flattened to a six and then given a derived one. Getting this the wrong
  // way round for one commit computed the load at eight reps while prescribing six, which put
  // the squat twenty kilos light: the sort of error that looks like a judgement call on the
  // screen and is actually a variable read before it was set.
  const climbingWeeks = ladder.filter(function (r, i) {
    return !(i > 0 && Number(r.pct) < Number(ladder[i - 1].pct));
  }).length;
  const parsedReps = repsFrom(prescribedReps);
  const range = repRange(prescribedReps, parsedReps > 0 ? parsedReps : 8, climbingWeeks);
  const rMin = range.min;
  const rMax = range.max;
  const baseReps = rMin;

  // DEMONSTRATED CAPACITY AT THIS REP COUNT. The reference the whole block is expressed
  // against: the load equal to 100 percent of the anchor at the reps being prescribed.
  const capacity = capacityAt(exerciseName, profile, maxes, baseReps, adjust);
  if (!capacity) return null;
  const capacityLoad = capacity * light;

  // THE BLOCK OPENS BELOW CAPACITY AND FINISHES ABOVE IT. Added 2026-09-12 after James
  // reported the opening weights as too heavy, which they were, for a reason that took some
  // finding and was not the ladder.
  //
  // The floor was setting the start. floorFromHistory refuses to prescribe anything easier
  // than the best effort ever logged, so week one was pinned to a maximal effort and a new
  // block could only ever open at or above the previous block's peak. **Every block had to
  // start at a personal best.** His squat opened at 150kg x 5 against a best five of 140kg,
  // because 132.5kg x 8 converts to 150kg x 5 at full Epley equivalence.
  //
  // Rep-specific strength is the hole in that conversion. Somebody who trains eights is not
  // holding a fives set at the mathematically equivalent load, and the honest reading of "the
  // predicted number is too heavy" is that the prediction was a prediction.
  //
  // So the two jobs are split. The OPENER is a fixed submaximal fraction of capacity, which
  // is how every written programme starts a block. The PEAK is capacity plus the gain cap. The
  // floor no longer decides either, and is scoped to the current block instead: see
  // floorFromEst and the note on it.
  //
  // THIS IS NOT THE AUGUST 0.88 DECISION COMING BACK. That one opened low AND peaked low, so
  // the block could finish below what the lifter had already done, which is what the floor was
  // built to stop. This opens low and peaks above capacity by construction. Both previous
  // attempts had one end of the block right and one wrong; this pins both ends deliberately.
  const openF = OPENING_FACTOR;

  const step = loadStep(capacityLoad);
  const round = function (w) {
    const r = Math.round(w / step) * step;
    return r > 0 ? r : step;
  };
  const f = Number(floor);

  // Measured at capacity rather than at whatever week one lands on, so the cap is a property
  // of how strong the lift is and does not shift when the opener or the floor moves it.
  const cap0 = blockGainCap(capacityLoad, profile);

  // THE FLOOR STILL WINS WHERE IT APPLIES, IT JUST APPLIES TO LESS.
  //
  // Within a block nothing may be easier than something already done in that block: that is
  // the Wednesday 90kg x 10 against Friday 87.5kg x 8 case from August, and it is a real
  // fault because both sessions are the same week of the same block. Across a block boundary
  // it is not a fault, it is a taper, so `floor` is now built from this block's logged bests
  // only and is empty on week one of a new block.
  //
  // When it does apply it lifts the whole ladder rather than clipping each week, because
  // clamping each week independently produced Leg Press at 100, 100, 100, 100, 105, 107.5,
  // which is a wall with a bump on the end rather than a block.
  const floorToStep = f > 0 ? Math.ceil(f / step) * step : 0;
  const openLoad = round(capacityLoad * openF);
  const weekOneLoad = floorToStep > openLoad ? floorToStep : openLoad;
  const weekOneEffort = effortOf(weekOneLoad, baseReps);
  // If the floor pushed week one above where the peak was going to be, the peak has to move
  // with it or the block runs downhill. The cap then measures from the floor, which is the
  // correct reading: the floor is evidence, and evidence beats a plausibility estimate.
  const lift = weekOneLoad > openLoad ? weekOneLoad / openLoad : 1;

  // The load cap, lifted with the floor. The effort-ceiling machinery an earlier pass used
  // here is gone: the cap governs the bar, the rep range governs the week.
  const cap = capFor(cap0, lift);

  // ONE REP PER CLIMBING WEEK, THEN THE BAR. TRUE DOUBLE PROGRESSION.
  //
  // Added 2026-09-12, second pass, after James asked the obvious question the first pass had
  // engineered its way past: why not add reps at a weight before adding weight, and why is
  // every lift either fives or eights?
  //
  // He is right, and the first pass was too clever. It chose, week by week, whichever of a
  // plate or a rep landed closest to a capped effort target. That is arithmetically optimal
  // and it produced a block whose heavy lifts read 150, 150, 152.5, 152.5, 155 with no reason
  // on the card for the repeats. Optimal tracking of a curve is not a programme somebody wants
  // to follow, and "hold the same weight and make it cleaner" is a coaching instruction rather
  // than a prescription.
  //
  // Double progression is the standard answer and it is better for three reasons that have
  // nothing to do with precision. There is something to chase EVERY week. Accumulating reps at
  // a load is real volume progression rather than a proxy for load. And you earn the load
  // increase by first demonstrating the reps, which is the safer order.
  //
  // THE CAP NOW GOVERNS LOAD ONLY, AND THAT IS A CORRECTION. blockGainCap limits one-rep-max
  // equivalent gain. Adding reps at a submaximal load is mostly work capacity, which comes far
  // faster than maximal strength: Epley scores 125kg x 6 to 125kg x 10 as eleven percent,
  // which would breach a 3.3 percent cap. Treating those as the same currency is what made the
  // first pass refuse to move the reps at all.
  //
  // THE OPENER IS THE ONLY HEIGHT PARAMETER, AND THE REPS DELIVER THE OVERSHOOT.
  //
  // Two earlier attempts at this fought each other. Pinning week one at a fraction of capacity
  // AND the final week at capacity plus the cap is two constraints on one degree of freedom:
  // the rep range already fixes the ratio between them, so one of the two always lost. At an
  // opener of 0.90 the peak clamp was overridden every time and the block landed dead level
  // with capacity, which loops.
  //
  // So there is one parameter. Week one is OPENING_FACTOR of capacity at the bottom of the
  // range, and the block climbs by whatever the range is worth. blockGainCap no longer clamps
  // the peak at all: it limits LOAD STEPS, which is the only thing it was ever a statement
  // about.
  const capacityEffort = effortOf(capacityLoad, baseReps);
  const maxSteps = Math.max(1, Math.floor((capacityEffort * cap * repPct(rMin)) / step));

  // Pass one: the rep schedule and how many load steps it takes.
  const schedule = [];
  let sReps = rMin;
  let sSteps = 0;
  ladder.forEach(function (r, i) {
    const pct = Number(r.pct);
    const deload = i > 0 && pct < Number(ladder[i - 1].pct);
    if (deload) { schedule.push({ pct: pct, deload: true }); return; }
    if (i === 0) { schedule.push({ pct: pct, deload: false, reps: sReps, steps: 0, mode: "load" }); return; }
    if (sReps < rMax) {
      sReps = sReps + 1;
      schedule.push({ pct: pct, deload: false, reps: sReps, steps: sSteps, mode: "reps" });
      return;
    }
    if (sSteps < maxSteps) {
      sSteps = sSteps + 1;
      sReps = rMin;
      schedule.push({ pct: pct, deload: false, reps: sReps, steps: sSteps, mode: "load" });
      return;
    }
    // Range topped out and the load allowance spent.
    schedule.push({ pct: pct, deload: false, reps: sReps, steps: sSteps, mode: "hold" });
  });

  // FLOORED TO THE STEP, NOT ROUNDED. Rounding to nearest put a 42kg Tricep Pushdown's opener
  // at 30kg against an intended 28.9, which is capacity exactly rather than 93 percent of it.
  // At light loads a 2.5kg step is most of the gap between submaximal and maximal, and an
  // opener that can round up past its own ceiling is not an opener.
  let baseLoad = Math.floor((capacityEffort * OPENING_FACTOR * repPct(rMin)) / step) * step;
  if (baseLoad < step) baseLoad = step;
  if (floorToStep > baseLoad) baseLoad = floorToStep;
  if (baseLoad < step) baseLoad = step;

  // THE BREAK-EVEN GUARD. A block has to finish above demonstrated capacity or the next one
  // re-derives the same anchor and prescribes the same weights. A range only three wide at
  // high reps does not get there on reps alone: twelves to fifteens is worth 7.1 percent
  // against an opener 7 percent down, which finishes four tenths of a percent BELOW where it
  // started. Every week of that block climbs and the block still goes nowhere, which is the
  // same class of fault as the two cancelling multipliers and is invisible week by week.
  //
  // One load step on the closing weeks fixes it, and the cap always permits at least one.
  const climbs = schedule.filter(function (r) { return !r.deload; });
  const lastClimb = climbs[climbs.length - 1];
  const peak = effortOf(baseLoad + lastClimb.steps * step, lastClimb.reps);
  // The second test used to be "and this would not breach the load cap", which blocked the very
  // step the guard exists to add: a Barbell Curl finished 4.3 percent below capacity because
  // the one step it needed was 0.5 percent over its cap. The cap permits at least one step by
  // construction, so the right test is whether the schedule has already spent its allowance.
  if (peak <= capacityEffort && lastClimb.steps < maxSteps) {
    // Give the final climbing week the step, and any week already sharing its rep count.
    let added = false;
    for (let i = schedule.length - 1; i >= 0 && !added; i--) {
      if (schedule[i].deload) continue;
      schedule[i].steps = schedule[i].steps + 1;
      if (schedule[i].mode === "hold") schedule[i].mode = "load";
      added = true;
    }
  }

  const out = [];
  let dlBase = baseLoad;
  schedule.forEach(function (r, i) {
    if (r.deload) {
      // The deload drops the bar and returns to the bottom of the range. Both, deliberately:
      // this is the one week that is supposed to be simple, and banked reps on a lighter bar is
      // two changes at once.
      //
      // AND IT HAS TO BE AT LEAST ONE STEP LIGHTER THAN THE BAR IT IS DELOADING FROM. At small
      // loads an eight percent reduction is less than half a step, so rounding put the deload
      // back exactly on week one: 12.5kg x 10 in week one and 12.5kg x 10 in week four, a
      // recovery week that recovers nothing. The deload is the one week exempt from the floor,
      // which is what makes stepping down safe here.
      const wanted = round(dlBase * DELOAD_DEPTH);
      const atMost = dlBase - step;
      let dl = wanted < atMost ? wanted : atMost;
      if (dl < step) dl = step;
      out.push(row(dl, rMin, r, i, "deload"));
      return;
    }
    dlBase = baseLoad + r.steps * step;
    out.push(row(dlBase, r.reps, r, i, r.mode));
  });

  function row(top, reps, t, i, mode) {
    const n = Math.max(1, Number(totalSets) || 1);
    let sets;
    if (n === 1) {
      sets = [round(top)];
    } else {
      sets = [];
      for (let k = 0; k < n; k++) {
        // 70 percent of the top set on the first, climbing to the top set on the last.
        const share = 0.70 + (0.30 * (k / (n - 1)));
        sets.push(round(top * share));
      }
    }
    return {
      week: i + 1,
      pct: t.pct,
      top: round(top),
      reps: reps,
      repMin: rMin,
      repMax: rMax,
      atTopOfRange: reps >= rMax,
      repsBumped: reps > rMin,
      sets: sets,
      deload: !!t.deload,
      mode: mode,
    };
  }

  return out;
}

// Which row of the ladder a week percentage refers to. The percentages within a ladder are
// distinct, which is what makes this safe, and it keeps the public signature of workingSets
// unchanged so ExerciseCard, BlockReview and adaptFrom do not all have to learn a week number.
function rowForPct(rows, weekPct) {
  if (!rows || !rows.length) return null;
  const p = Number(weekPct);
  for (let i = 0; i < rows.length; i++) {
    if (Number(rows[i].pct) === p) return rows[i];
  }
  return null;
}

export function workingSets(exerciseName, profile, weekPct, maxes, totalSets, intensity, prescribedReps, floor, adjust) {
  const rows = ladderFor(exerciseName, profile, maxes, totalSets, intensity, prescribedReps, floor, adjust, null);
  const row = rowForPct(rows, weekPct);
  return row ? row.sets : null;
}

// The reps to actually prescribe this week, which is the authored count on a load week and one
// or two more than it on a rep week. Null when this lift has no weight prescription at all.
export function workingReps(exerciseName, profile, weekPct, maxes, totalSets, intensity, prescribedReps, floor, adjust, weeks) {
  const rows = ladderFor(exerciseName, profile, maxes, totalSets, intensity, prescribedReps, floor, adjust, weeks);
  const row = rowForPct(rows, weekPct);
  return row ? row.reps : null;
}

// One line for the card, so a week that holds the bar does not read as a week with no plan in
// it. This is the difference between "the app forgot to add weight" and "this week you earn
// the same bar for an extra rep", and it is entirely in the wording.
export function progressNote(row) {
  if (!row) return null;
  const range = row.repMin && row.repMax ? row.repMin + " to " + row.repMax : null;
  if (row.deload) {
    return "Deload. Lighter bar, back to " + row.reps + "s. Easy on purpose.";
  }
  if (row.week === 1) {
    return range
      ? "Working range is " + range + " reps. You start at " + row.reps + " and add a rep a week. "
        + "When you get to " + row.repMax + ", the bar goes up and the reps come back down to " + row.repMin + "."
      : null;
  }
  if (row.mode === "reps") {
    return "Same weight, one more rep than last week. " + row.reps + " of " + row.repMax
      + (row.atTopOfRange ? ". Top of the range, so the bar goes up next." : " in the range.");
  }
  if (row.mode === "load") {
    return "You earned it: " + row.repMax + " reps last week, so the bar goes up and the reps "
      + "reset to " + row.reps + ".";
  }
  // Top of the range reached and the load cap spent.
  return "Hold here. You are at the top of the range and this block has had the load increase "
    + "it can honestly claim, so make these " + row.reps + " cleaner rather than heavier.";
}

// WHERE THE BLOCK ENDS UP, WORKED OUT ON DAY ONE RATHER THAN DISCOVERED IN WEEK SIX.
//
// Returns the top set for every week of the block, so the plan can show somebody what they
// are training towards instead of asking them to trust a percentage they cannot see. The
// deload in week four is in here too and is meant to be visible: a chart that dips is much
// easier to believe than a number that suddenly drops with no warning.
export function blockProjection(exerciseName, profile, maxes, totalSets, weeks, intensity, prescribedReps, floor, adjust) {
  const out = ladderFor(exerciseName, profile, maxes, totalSets, intensity, prescribedReps, floor, adjust, weeks);
  if (!out) return null;
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
// COMPARED AS EFFORT WHEN THE REPS ARE AVAILABLE.
//
// Two loads was the right comparison while the block progressed by load. Under double
// progression the bar is deliberately the same for several weeks running and the rep is the
// progress, so a load-only comparison reads a perfectly executed rep week as dead flat and, in
// the other direction, reads an earned rep as nothing. The rep counts are optional so the old
// two-argument call still behaves exactly as it did.
export function readsAs(prescribedTop, loggedTop, prescribedReps, loggedReps) {
  const p = Number(prescribedTop);
  const l = Number(loggedTop);
  if (!p || !l) return null;
  const pr = Number(prescribedReps);
  const lr = Number(loggedReps);
  const ratio = pr > 0 && lr > 0
    ? effortOf(l, lr) / effortOf(p, pr)
    : l / p;
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
// ======================================================================================
// BODYWEIGHT AND HOLD PROGRESSION. Added 2026-09-12, because there was none.
//
// Six weeks of James's data, in two lines:
//
//   Plank              45 sec, 45, 45, 45, 45, 45
//   Hanging Leg Raise  15 reps from week two onward, unchanged to the end
//
// That is not a man who stopped improving, it is a part of the app with no progression model
// in it. workingSets only fires on kind "weight". splittable() deliberately refuses to touch
// anything prescribed in seconds, metres or per-side, which is correct for the heavy and
// volume day split and was quietly doing double duty as the reason nothing else progressed
// either. workingHold existed but is gated behind holdProgression, which only yoga sets.
//
// So the pull ups, dead hangs, leg raises and planks that a HYROX block is largely made of
// were prescribed identically for six weeks. He has now asked for MORE ab work, and more
// volume of a thing that cannot progress is just more time in the gym.
//
// The model is the yoga one, which the notes above already argue is the honest shape: the
// anchor IS the tested performance rather than something derived from it, so the low rep
// extrapolation problem cannot arise. Every later week is a proportion of what week one
// logged.
//
// THE CAP DECAYS THE SAME WAY THE LOAD CAP DOES, AND FOR THE SAME REASON. Going from five
// pull ups to eight is ordinary. Going from forty sit ups to sixty four is not, even though
// both are sixty percent. The gains are much larger in percentage terms than barbell gains
// because a beginner's first pull ups are as much skill as strength, which is why these
// numbers are far above the load caps and should be.
//
// AND THERE IS NO DEFICIT PENALTY HERE, WHICH IS NOT AN OVERSIGHT. Losing weight makes
// bodyweight work easier, because there is less of you to move. Applying DEFICIT_GAIN_SCALE
// to a pull up would have the model predict that getting lighter makes pull ups harder.
// ======================================================================================

export const BW_CAP_AT_5_REPS = 0.55;
export const BW_CAP_DECAY = 0.16;
export const BW_CAP_MIN = 0.10;
export const BW_CAP_MAX = 0.60;

// Reps are referenced at five and seconds at thirty, because they are different units and a
// shared reference would have treated a 45 second plank as if it were 45 repetitions.
export function bodyweightGainCap(best, kind) {
  const b = Number(best);
  const ref = kind === "time" ? 30 : 5;
  if (!b || b <= 0) return BW_CAP_MAX;
  let cap = BW_CAP_AT_5_REPS - BW_CAP_DECAY * Math.log(b / ref);
  if (cap > BW_CAP_MAX) cap = BW_CAP_MAX;
  if (cap < BW_CAP_MIN) cap = BW_CAP_MIN;
  return cap;
}

// Whole reps, and for holds either whole seconds or five second blocks, which is how people
// actually count a hold: a 67 second plank is a stopwatch reading, not a target.
//
// THE GRANULARITY IS DECIDED ONCE FROM WEEK ONE AND THEN FIXED FOR THE WHOLE LADDER. Deciding
// it per value looked tidier and broke the cap: a 21 second hold counts in single seconds,
// climbs past thirty, switches to five second blocks, and the rounding up at the switch put
// the block two percent over its own ceiling. A ladder that changes units halfway is a ladder
// whose total nobody can predict.
function bwGrain(weekOne, kind) {
  return kind === "time" && weekOne >= 30 ? 5 : 1;
}

function tidyBw(v, grain) {
  const r = Math.round(v / grain) * grain;
  return r > 0 ? r : grain;
}

// best is the most the person has actually managed for this movement, in reps or seconds.
// authored is what the programme asked for, used only when there is no history at all.
// Returns one row per week: { week, pct, target, deload, mode }.
export function bodyweightLadder(kind, authored, best, profile, weeks) {
  const ladder = weeks && weeks.length ? weeks : LIFT_WEEKS;
  const anchor = Number(best) > 0 ? Number(best) : Number(authored);
  if (!(anchor > 0)) return null;

  const cap = bodyweightGainCap(anchor, kind);
  const f0 = weekFactor(OPENING_PCT);
  let maxPct = OPENING_PCT;
  ladder.forEach(function (r) { const p = Number(r.pct); if (p > maxPct) maxPct = p; });
  const rawSpread = weekFactor(maxPct) / f0;

  const grain = bwGrain(anchor, kind);
  const weekOne = tidyBw(anchor, grain);
  // Same minimum-progress rule as the load ladder, for the same reason: a block of six
  // identical numbers is not a block. One rep, or one five second block, has to fit.
  const smallest = grain;
  const minCap = smallest / weekOne;
  const effectiveCap = cap > minCap ? cap : minCap;
  const squeeze = rawSpread > 1 ? effectiveCap / (rawSpread - 1) : 0;

  let prev = weekOne;
  return ladder.map(function (r, i) {
    const pct = Number(r.pct);
    const deload = i > 0 && pct < Number(ladder[i - 1].pct);
    if (deload) {
      let dl = tidyBw(weekOne * DELOAD_DEPTH, grain);
      if (dl >= weekOne) dl = weekOne - smallest;
      if (dl < smallest) dl = smallest;
      return { week: i + 1, pct: pct, target: dl, deload: true, mode: "deload" };
    }
    const g = weekFactor(pct) / f0;
    let target = tidyBw(weekOne * (1 + (g - 1) * squeeze), grain);
    // Never ask for less than last week on a climbing week. Rounding to five second blocks
    // can otherwise step backwards between two adjacent weeks.
    if (i > 0 && target < prev) target = prev;
    const mode = i === 0 ? "start" : (target > prev ? "up" : "hold");
    prev = target;
    return { week: i + 1, pct: pct, target: target, deload: false, mode: mode };
  });
}

// The single week, for the card.
export function bodyweightTarget(kind, authored, best, weekPct, profile, weeks) {
  const rows = bodyweightLadder(kind, authored, best, profile, weeks);
  const row = rowForPct(rows, weekPct);
  return row ? row.target : null;
}

// Best reps or seconds actually logged for a movement, from the same recent-session slice the
// load anchor uses. reps come off exercise_logs.reps; seconds are parsed out of time_text,
// which is free text and has to be treated as such.
export function bestBodyweightFrom(sessions, kind) {
  let best = 0;
  (sessions || []).slice(0, ANCHOR_SESSIONS).forEach(function (s) {
    (s && s.sets ? s.sets : []).forEach(function (row) {
      if (!row) return;
      let v = 0;
      if (kind === "time") {
        const m = String(row.time_text == null ? "" : row.time_text).match(/(\d+(?:\.\d+)?)/);
        if (m) v = Number(m[1]);
      } else {
        v = Number(row.reps);
      }
      if (v > best) best = v;
    });
  });
  return best || null;
}

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
  return startOfWeekShared(d).getTime();
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
