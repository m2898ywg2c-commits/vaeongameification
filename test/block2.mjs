import { buildWeek } from "../lib/training.js";
import { ladderFor, bodyweightLadder, repsFrom, repPct, progressNote, anchorEstFor } from "../lib/progression.js";

// Block two exactly as the cards will render it, from the live anchors.
const profile = { nutrition_goal: "lose", baseline_squat: 167.8, baseline_bench: 133 };
const MAXES = {
  "back squat": 167.8, "barbell bench press": 133, "romanian deadlift": 186.7,
  "incline dumbbell press": 69, "cable woodchop": 28, "leg press": 408.8, "overhead press": 36,
};
// best bodyweight reps / hold seconds he has actually logged
const BW = { "hanging leg raise": 15, "plank": 60 };

// what he asked for, for comparison
const ASKED = {
  "back squat": [135, 5], "barbell bench press": [105.5, 5],
  "romanian deadlift": [135.5, 8], "incline dumbbell press": [50, 8],
};
const eff = (L, R) => L / repPct(R);

const week = buildWeek(["hyroxlean"], 4, [2, 3, 4, 6], true, 1);
for (const day of week) {
  console.log("\n" + "=".repeat(80));
  console.log("  " + day.dayLabel + "   " + day.title + (day.fixed ? "    (bonus day, fixed)" : ""));
  console.log("=".repeat(80));
  for (const ex of day.exercises) {
    const key = ex.name.toLowerCase();
    const reps = repsFrom(ex.reps);
    const rangey = /^\d+\s*(-\s*\d+)?$/.test(String(ex.reps).trim());
    const anchor = anchorEstFor(ex.name, profile, MAXES);
    if (anchor && rangey) {
      const rows = ladderFor(ex.name, profile, MAXES, ex.sets, ex.intensity, ex.reps, null, 1, null);
      if (rows) {
        console.log("  " + ex.name + "   " + ex.sets + " sets, range " + ex.reps);
        console.log("     " + rows.map(r => r.top + "x" + r.reps + (r.deload ? "*" : "")).join("   "));
        const a = ASKED[key];
        const cmp = a ? "   you asked for " + a[0] + "x" + a[1] + " (" + ((eff(rows[0].top, rows[0].reps) / eff(a[0], a[1]) - 1) * 100).toFixed(1) + "% vs that)" : "";
        console.log("     week 1 effort " + eff(rows[0].top, rows[0].reps).toFixed(0)
          + ", week 6 " + eff(rows[5].top, rows[5].reps).toFixed(0)
          + ", your capacity " + anchor.toFixed(0) + cmp);
        console.log("     wk1 sets: " + rows[0].sets.join(" · ") + "kg");
        continue;
      }
    }
    const bwBest = BW[key];
    const kind = /sec/.test(String(ex.reps)) ? "time" : (rangey ? "reps" : null);
    if (kind && bwBest) {
      const rows = bodyweightLadder(kind, reps, bwBest, profile, null);
      console.log("  " + ex.name + "   " + ex.sets + " sets, best " + bwBest + (kind === "time" ? "s" : " reps"));
      console.log("     " + rows.map(r => r.target + (r.deload ? "*" : "")).join("   ") + (kind === "time" ? "  seconds" : "  reps"));
      continue;
    }
    console.log("  " + ex.name + "   " + ex.sets + " x " + ex.reps
      + (rangey && !anchor ? "   -> week one is a test: find your own and log it" : ""));
  }
}
console.log("\n  * = deload week\n");
