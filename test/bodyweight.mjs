import { bodyweightLadder, bodyweightGainCap } from "../lib/progression.js";
const cut = { nutrition_goal: "lose" };
console.log("=== bodyweight / hold ladders, anchored on what he logged ===\n");
const cases = [
  ["reps", "Pull Ups", 6, 6],
  ["reps", "Hanging Leg Raise", 12, 15],
  ["reps", "Weighted Dips", 10, 10],
  ["time", "Plank", 45, 45],
  ["time", "Dead Hang", 45, 45],
  ["time", "Plank (his 60s)", 60, 60],
  ["reps", "Press Ups", 25, 25],
];
for (const [kind, name, authored, best] of cases) {
  const rows = bodyweightLadder(kind, authored, best, cut, null);
  const unit = kind === "time" ? "s" : " reps";
  console.log(name.padEnd(22) + "cap " + (bodyweightGainCap(best, kind)*100).toFixed(0) + "%   "
    + rows.map(r => "w"+r.week+" "+r.target+(r.deload?"(dl)":"")).join("  ")
    + "   " + best + unit + " -> " + rows[rows.length-1].target + unit
    + "  (+" + ((rows[rows.length-1].target/best-1)*100).toFixed(0) + "%)");
}

// invariants
let fails = 0, n = 0;
for (const kind of ["reps","time"])
for (let best = 1; best <= 180; best++) {
  const rows = bodyweightLadder(kind, best, best, cut, null);
  if (!rows) { continue; }
  n++;
  const climbing = rows.filter(r => !r.deload);
  let prev = null;
  climbing.forEach(function (r) {
    if (prev !== null && r.target < prev) { console.log("NON-MONOTONIC", kind, best, r); fails++; }
    prev = r.target;
  });
  const peak = Math.max(...climbing.map(r => r.target));
  if (peak <= rows[0].target) { console.log("NO PROGRESS", kind, best, rows.map(r=>r.target).join(",")); fails++; }
  const cap = bodyweightGainCap(best, kind);
  const smallest = kind === "time" && rows[0].target >= 30 ? 5 : 1;
  const allowed = Math.max(cap, smallest/rows[0].target) + (smallest/rows[0].target) + 1e-9;
  if (peak/rows[0].target - 1 > allowed) { console.log("OVER CAP", kind, best, peak, rows[0].target, ((peak/rows[0].target-1)*100).toFixed(1)+"% vs "+(allowed*100).toFixed(1)+"%"); fails++; }
  rows.filter(r=>r.deload).forEach(function (r) {
    if (r.target >= rows[0].target && rows[0].target > smallest) { console.log("DELOAD NOT LIGHTER", kind, best, r.target, rows[0].target); fails++; }
  });
}
console.log("\nswept " + n + " anchors: " + (fails === 0 ? "ALL INVARIANTS HOLD" : fails + " FAILURES"));
