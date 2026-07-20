// Six-week block progression. Rules differ by category, because kilos mean nothing to a 5K runner.

export const BLOCK_WEEKS = 6;

const LIFT_WEEKS = [
  {
    week: 1,
    label: "Technique",
    pct: 0.70,
    focus: "Land on your working weights and get the movement patterns dialled in. Do not chase failure this week.",
    increase: "No increases. This week sets the baseline everything else is measured against.",
  },
  {
    week: 2,
    label: "Build",
    pct: 0.75,
    focus: "Same movements, a little more load. Every rep should still look clean.",
    increase: "Add 2.5kg to upper body lifts and 5kg to lower body lifts, but only if every set last week moved well.",
  },
  {
    week: 3,
    label: "Load",
    pct: 0.80,
    focus: "The hardest week of the first half. Last set should feel like two reps left in the tank.",
    increase: "Add another 2.5kg upper and 5kg lower. If a lift stalled last week, hold the weight and add a rep instead.",
  },
  {
    week: 4,
    label: "Deload",
    pct: 0.65,
    focus: "Back off on purpose. This week should feel easy, that is the entire point of it.",
    increase: "Drop roughly 20 percent off week three. Do not be tempted to push, you are banking recovery for the peak.",
  },
  {
    week: 5,
    label: "Peak",
    pct: 0.85,
    focus: "Heaviest working sets of the block. Long rests, full effort, quality over quantity.",
    increase: "Go past week three by 2.5kg upper and 5kg lower. If that is not there today, match week three and call it a win.",
  },
  {
    week: 6,
    label: "Test",
    pct: 0.90,
    focus: "Find your new numbers. Work up to a heavy set of three on the main lifts, leaving one rep in reserve.",
    increase: "Whatever you hit this week becomes your baseline for block two. Log it, then set it in Settings.",
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

export function weeksFor(category) {
  if (category === "endurance") return ENDURANCE_WEEKS;
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

// Working weight suggestion for the two lifts we hold a baseline for.
export function workingWeight(exerciseName, profile, weekPct) {
  const n = (exerciseName || "").toLowerCase();
  let base = null;
  if (n.indexOf("bench") !== -1 && profile.baseline_bench) base = Number(profile.baseline_bench);
  if (n.indexOf("squat") !== -1 && n.indexOf("split") === -1 && profile.baseline_squat) base = Number(profile.baseline_squat);
  if (!base) return null;
  const raw = base * weekPct;
  const rounded = Math.round(raw / 2.5) * 2.5;
  return rounded;
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

