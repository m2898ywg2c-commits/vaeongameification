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

export function currentWeek(blockStart) {
  if (!blockStart) return 1;
  const start = new Date(blockStart);
  start.setHours(0, 0, 0, 0);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const days = Math.floor((now - start) / (24 * 60 * 60 * 1000));
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

// Epley one-rep-max estimate from a working set. Turns "60kg for 5" into an estimated max
// so logged sets can drive the plan. Reps of 1 just returns the weight.
export function estimateMax(weight, reps) {
  const w = Number(weight);
  const r = Number(reps);
  if (!w) return 0;
  if (!r || r < 1) return w;
  return Math.round(w * (1 + r / 30) * 10) / 10;
}

// Working weight suggestion. A real measured max for this exact lift (from the testing
// week or any logged set) wins. Otherwise we scale from the two entered baselines via the
// ratio table, which is an educated guess. maxes is a map of lowercased exercise name to est_max.
export function workingWeight(exerciseName, profile, weekPct, maxes) {
  const n = (exerciseName || "").toLowerCase();

  if (maxes && maxes[n]) {
    const measured = Math.round((maxes[n] * weekPct) / 2.5) * 2.5;
    return measured > 0 ? measured : 2.5;
  }

  const benchMax = profile && profile.baseline_bench ? Number(profile.baseline_bench) : null;
  const squatMax = profile && profile.baseline_squat ? Number(profile.baseline_squat) : null;

  let base = null;
  for (let i = 0; i < LIFT_RATIOS.length; i++) {
    const row = LIFT_RATIOS[i];
    if (n.indexOf(row.k) !== -1) {
      const ref = row.ref === "squat" ? squatMax : benchMax;
      if (ref) base = ref * row.r;
      break;
    }
  }
  if (!base) return null;

  const raw = base * weekPct;
  const rounded = Math.round(raw / 2.5) * 2.5;
  return rounded > 0 ? rounded : 2.5;
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
