import {
  ladderFor, workingSets, blockProjection, blockGainCap, loadStep, capacityAt,
  estimateMax, repPct, floorFromEst, repRange, DELOAD_DEPTH, OPENING_FACTOR,
} from "../lib/progression.js";

// THE INVARIANTS FOR DOUBLE PROGRESSION, WHICH ARE NOT THE SAME AS FOR A LOAD LADDER.
//
// Effort is no longer monotonic and must not be asserted as such. Resetting the reps when the
// bar goes up makes that week genuinely easier than the last, and every lifter recognises it.
// What must hold is the double progression contract itself.
const eff = (L, R) => L / repPct(R);

const PROFILES = [{ nutrition_goal: "lose" }, { nutrition_goal: "gain" }, { nutrition_goal: "maintain" }, {}];
const LOADS = [15, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 140, 160, 180, 200, 250, 300, 400];
const TESTREPS = [3, 5, 6, 8, 10, 12, 15, 20];
const PRESCRIPTIONS = ["5", "6", "8", "10", "12", "15", "20", "6-10", "8-12", "10-15", "12-15", "6-8"];
const SETS = [1, 3, 4, 5];
const INTENSITY = [undefined, "heavy", "light"];

let n = 0;
const fails = {
  loadNeverFalls: [], repsInRange: [], repsAtLoad: [], everyWeekMoves: [],
  breakEven: [], loadCap: [], deload: [], floor: [], agree: [],
};

for (const profile of PROFILES)
for (const testLoad of LOADS)
for (const testReps of TESTREPS)
for (const pres of PRESCRIPTIONS)
for (const sets of SETS)
for (const intensity of INTENSITY) {
  const name = "Test Lift";
  const anchor = estimateMax(testLoad, testReps);
  const maxes = { "test lift": anchor };
  const rows = ladderFor(name, profile, maxes, sets, intensity, pres, null, 1, null);
  if (!rows) continue;
  n++;

  const climbs = rows.filter(r => !r.deload);
  const range = repRange(pres, Number(String(pres).match(/\d+/)[0]), climbs.length);
  const capLoad = capacityAt(name, profile, maxes, range.min, 1) * (intensity === "light" ? 1 : 1);
  const capEffort = eff(capLoad, range.min);
  const step = loadStep(capLoad);
  const cap = blockGainCap(capLoad, profile);
  const tag = [profile.nutrition_goal, testLoad + "x" + testReps, pres, sets, intensity].join("|");

  // 1. The bar never goes down across climbing weeks.
  for (let i = 1; i < climbs.length; i++) {
    if (climbs[i].top < climbs[i - 1].top - 0.0001) {
      fails.loadNeverFalls.push([tag, "w" + climbs[i].week, climbs[i].top + " after " + climbs[i - 1].top]);
    }
  }
  // 2. Reps always sit inside the range.
  rows.forEach(r => {
    if (r.reps < range.min || r.reps > range.max) fails.repsInRange.push([tag, "w" + r.week, r.reps, range.min + "-" + range.max]);
  });
  // 3. At a given load the reps never go down.
  for (let i = 1; i < climbs.length; i++) {
    if (climbs[i].top === climbs[i - 1].top && climbs[i].reps < climbs[i - 1].reps) {
      fails.repsAtLoad.push([tag, "w" + climbs[i].week, climbs[i].reps + " after " + climbs[i - 1].reps + " at " + climbs[i].top]);
    }
  }
  // 4. Every climbing week after the first adds a rep or adds load, unless the range is
  //    topped out AND the load allowance is spent, which is the only legal "hold".
  for (let i = 1; i < climbs.length; i++) {
    const moved = climbs[i].reps > climbs[i - 1].reps || climbs[i].top > climbs[i - 1].top;
    if (!moved && climbs[i].mode !== "hold") fails.everyWeekMoves.push([tag, "w" + climbs[i].week, climbs[i].mode]);
  }
  // 5. The block finishes above demonstrated capacity, or it loops forever.
  const peak = Math.max(...climbs.map(r => eff(r.top, r.reps)));
  if (peak <= capEffort - 0.01) fails.breakEven.push([tag, "peak " + peak.toFixed(1) + " vs capacity " + capEffort.toFixed(1)]);
  // 6. Load gain across the block stays inside the cap, with one step always allowed.
  const loadGain = climbs[climbs.length - 1].top - climbs[0].top;
  const allowed = Math.max(climbs[0].top * cap, step) + step + 0.0001;
  if (loadGain > allowed) fails.loadCap.push([tag, "+" + loadGain + "kg vs " + allowed.toFixed(1)]);
  // 7. The deload is lighter than the week before it and back at the bottom of the range.
  rows.forEach((r, i) => {
    if (!r.deload) return;
    const prev = rows[i - 1];
    if (prev && r.top >= prev.top) fails.deload.push([tag, "w" + r.week, r.top + " vs " + prev.top]);
    if (r.reps !== range.min) fails.deload.push([tag, "w" + r.week, "reps " + r.reps + " not " + range.min]);
  });
  // 8. workingSets, ladderFor and blockProjection agree week for week.
  const proj = blockProjection(name, profile, maxes, sets, null, intensity, pres, null, 1);
  rows.forEach((r, i) => {
    const single = workingSets(name, profile, r.pct, maxes, sets, intensity, pres, null, 1);
    const a = single ? single.join(",") : "null";
    if (a !== r.sets.join(",") || (proj && proj[i] && proj[i].sets.join(",") !== r.sets.join(","))) {
      fails.agree.push([tag, r.pct, a, r.sets.join(",")]);
    }
  });
}

// 9. The in-block floor is never breached on a non-deload week.
let floorN = 0;
for (const profile of PROFILES)
for (const testLoad of [40, 60, 80, 100, 140, 200])
for (const testReps of [6, 8, 10, 12])
for (const pres of ["6-10", "8-12", "10-15", "8"])
for (const bestInBlock of [0.9, 1.0, 1.1, 1.25]) {
  const name = "Test Lift";
  const anchor = estimateMax(testLoad, testReps);
  const maxes = { "test lift": anchor };
  const blockBest = anchor * bestInBlock;
  const rMin = Number(String(pres).match(/\d+/)[0]);
  const floor = floorFromEst(blockBest, rMin);
  const rows = ladderFor(name, profile, maxes, 4, undefined, pres, floor, 1, null);
  if (!rows) continue;
  floorN++;
  rows.filter(r => !r.deload).forEach(r => {
    if (eff(r.top, r.reps) < blockBest - 0.01 && r.top < floor - 0.0001) {
      fails.floor.push([testLoad + "x" + testReps, pres, bestInBlock, "w" + r.week, r.top + "x" + r.reps]);
    }
  });
}

console.log("ladder combinations swept:", n.toLocaleString());
console.log("floor combinations swept: ", floorN.toLocaleString());
console.log();
let bad = 0;
for (const [k, v] of Object.entries(fails)) {
  console.log(k.padEnd(16), v.length === 0 ? "PASS  0" : "FAIL  " + v.length);
  if (v.length) { bad += v.length; v.slice(0, 4).forEach(r => console.log("     ", r.join(" | "))); }
}
console.log();
console.log(bad === 0 ? "ALL INVARIANTS HOLD" : "TOTAL FAILURES: " + bad);
