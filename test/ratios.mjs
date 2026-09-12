import { anchorEstFor, capacityAt } from "../lib/progression.js";

// THE RATIO TABLE IS SCANNED TOP TO BOTTOM AND THE FIRST SUBSTRING MATCH WINS.
//
// So a qualifier sitting above a movement silently captures it. "Incline DB Curl" matched
// "incline" at 0.8 of the bench max and prescribed a 72.5kg dumbbell curl for a man who curls
// 30. It shipped because nothing checked that a lift with no logged history gets a sane
// estimate, and the name that broke it was one I had just added.
//
// Every accessory here contains a word that also appears in another entry. The bounds are
// deliberately wide: this is catching the wrong ROW, not calibrating the ratios.
const profile = { baseline_bench: 100, baseline_squat: 100 };
const CASES = [
  // name,                       min,  max   (as a fraction of the 100kg baselines)
  ["Barbell Bench Press",        0.95, 1.05],
  ["Incline Dumbbell Press",     0.70, 0.90],
  ["Incline Barbell Press",      0.70, 0.90],
  ["Close Grip Bench Press",     0.80, 0.95],
  ["Overhead Press",             0.50, 0.70],
  ["Seated DB Curl",             0.25, 0.45],
  ["Incline DB Curl",            0.25, 0.45],
  ["Barbell Curl",               0.25, 0.45],
  ["Hammer Curl",                0.25, 0.45],
  ["Preacher Curl",              0.25, 0.45],
  ["Cable Fly",                  0.25, 0.45],
  ["Dumbbell Fly",               0.25, 0.45],
  ["Lateral Raise",              0.08, 0.25],
  ["Cable Lateral Raise",        0.08, 0.25],
  ["Rear Delt Row",              0.08, 0.25],
  ["Face Pull",                  0.20, 0.40],
  ["Tricep Pushdown",            0.30, 0.50],
  ["Overhead Tricep Extension",  0.30, 0.50],
  ["Skull Crusher",              0.25, 0.45],
  ["Cable Crunch",               0.20, 0.40],
  ["Cable Woodchop",             0.10, 0.30],
  ["Barbell Row",                0.75, 0.95],
  ["Chest Supported Row",        0.60, 0.80],
  ["Lat Pulldown",               0.65, 0.85],
  ["Weighted Dips",              0.80, 1.00],
  ["Back Squat",                 0.95, 1.05],
  ["Front Squat",                0.75, 0.95],
  ["Deadlift",                   1.10, 1.30],
  ["Romanian Deadlift",          0.90, 1.10],
  ["Single Leg RDL",             0.90, 1.10],
  ["Trap Bar Deadlift",          1.05, 1.25],
  ["Rack Pull",                  1.20, 1.40],
  ["Hack Squat",                 0.90, 1.10],
  ["Box Squat",                  0.90, 1.10],
  ["Good Morning",               0.30, 0.60],
  ["Cable Crossover",            0.25, 0.45],
  ["Pec Deck",                   0.25, 0.45],
  ["Cable Pull Through",         0.40, 0.60],
  ["Cable Kickback",             0.08, 0.25],
  ["Landmine Rotation",          0.10, 0.30],
  ["Push Jerk",                  0.65, 0.85],
  ["Abductor Machine",           0.30, 0.50],
  ["Leg Press",                  1.60, 2.00],
  ["Hip Thrust",                 1.00, 1.20],
  ["Leg Curl",                   0.25, 0.45],
  ["Leg Extension",              0.30, 0.50],
  ["Bulgarian Split Squat",      0.35, 0.55],
  ["Weighted Walking Lunges",    0.35, 0.55],
  ["Goblet Squat",               0.30, 0.50],
  ["Step Up",                    0.30, 0.50],
  ["Calf Raise",                 0.50, 0.70],
  ["Single Leg Calf Raise",      0.50, 0.70],
];

let fails = 0;
console.log("exercise".padEnd(28) + "est".padStart(7) + "   expected");
console.log("-".repeat(60));
for (const [name, lo, hi] of CASES) {
  const est = anchorEstFor(name, profile, {});
  const ok = est != null && est >= lo * 100 - 0.01 && est <= hi * 100 + 0.01;
  if (!ok) fails++;
  console.log(name.padEnd(28) + String(est == null ? "none" : est.toFixed(1)).padStart(7)
    + "   " + (lo * 100).toFixed(0) + " to " + (hi * 100).toFixed(0) + (ok ? "" : "   <-- FAIL"));
}

// And nothing may come back null: a lift with no ratio has no week-one suggestion at all.
console.log();
console.log(fails === 0 ? "ALL RATIOS RESOLVE TO THE RIGHT ROW" : fails + " EXERCISES MATCH THE WRONG ROW");
