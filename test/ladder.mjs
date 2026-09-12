import {
  ladderFor, blockGainCap, anchorFrom, estimateMax, repPct,
  floorFromHistory, workingSets, blockProjection, progressNote, ANCHOR_SESSIONS,
} from "../lib/progression.js";

const cut  = { nutrition_goal: "lose" };
const maint = { nutrition_goal: "maintain" };

// James's real logged sessions, newest first, as the plan page groups them.
const HIS = {
  "Back Squat": [
    { day: "2026-09-11", sets: [{weight:92.5,reps:8},{weight:102.5,reps:8},{weight:112.5,reps:8},{weight:122.5,reps:8},{weight:132.5,reps:8}] },
    { day: "2026-09-09", sets: [{weight:100,reps:5},{weight:110,reps:5},{weight:120,reps:5},{weight:130,reps:5},{weight:140,reps:5}] },
    { day: "2026-09-02", sets: [{weight:95,reps:5},{weight:105,reps:5},{weight:120,reps:5},{weight:130,reps:5},{weight:135,reps:5}] },
    { day: "2026-08-05", sets: [{weight:60,reps:10},{weight:90,reps:10}] },
  ],
  "Barbell Bench Press": [
    { day: "2026-09-11", sets: [{weight:72.5,reps:8},{weight:102.5,reps:8}] },
    { day: "2026-09-08", sets: [{weight:80,reps:5},{weight:100,reps:5}] },
    { day: "2026-09-01", sets: [{weight:100,reps:5},{weight:105,reps:8},{weight:107,reps:3}] },
  ],
  "Overhead Press": [
    { day: "2026-09-11", sets: [{weight:30,reps:6},{weight:30,reps:6},{weight:30,reps:6},{weight:30,reps:6}] },
    { day: "2026-08-06", sets: [{weight:40,reps:6},{weight:45,reps:6},{weight:50,reps:6},{weight:50,reps:6}] },
  ],
  "Incline Dumbbell Press": [
    { day: "2026-09-08", sets: [{weight:60,reps:8},{weight:60,reps:8}] },
    { day: "2026-09-01", sets: [{weight:44,reps:8},{weight:48,reps:8},{weight:60,reps:8},{weight:64,reps:7}] },
    { day: "2026-08-18", sets: [{weight:28,reps:8},{weight:44,reps:8}] },
    { day: "2026-08-04", sets: [{weight:60,reps:10},{weight:90,reps:8}] },
  ],
  "Leg Press": [
    { day: "2026-09-11", sets: [{weight:202.5,reps:15},{weight:245,reps:15},{weight:250,reps:15}] },
    { day: "2026-09-09", sets: [{weight:190,reps:15},{weight:232.5,reps:15},{weight:272.5,reps:15}] },
    { day: "2026-09-02", sets: [{weight:180,reps:15},{weight:220,reps:15},{weight:257.5,reps:15}] },
  ],
  "Romanian Deadlift": [
    { day: "2026-09-11", sets: [{weight:97.5,reps:10},{weight:120,reps:10},{weight:140,reps:10}] },
    { day: "2026-09-09", sets: [{weight:100,reps:8},{weight:140,reps:8}] },
    { day: "2026-09-02", sets: [{weight:100,reps:8},{weight:135,reps:8}] },
  ],
};

// est_max as the live table holds it, i.e. greatest() over everything ever
const OLD_EST = {
  "Back Squat": 167.8, "Barbell Bench Press": 133, "Overhead Press": 60,
  "Incline Dumbbell Press": 114, "Leg Press": 408.8, "Romanian Deadlift": 186.7,
};

console.log("=== 1. ANCHOR: recent form vs all-time greatest() ===\n");
console.log("lift".padEnd(24), "old est_max", "  new anchor", "  change");
for (const [name, sessions] of Object.entries(HIS)) {
  const a = anchorFrom(sessions);
  const o = OLD_EST[name];
  const flag = a < o * 0.95 ? "  <-- corrected" : "";
  console.log(name.padEnd(24), String(o).padStart(11), String(Math.round(a*10)/10).padStart(12),
    ((a/o-1)*100).toFixed(1).padStart(7) + "%" + flag);
}

console.log("\n=== 2. GAIN CAP by load ===\n");
console.log("load".padEnd(8), "maintain", "  cut");
[20,40,60,80,100,120,140,160,200,250,300].forEach(function (L) {
  console.log(String(L+"kg").padEnd(8),
    (blockGainCap(L, maint)*100).toFixed(1).padStart(7)+"%",
    (blockGainCap(L, cut)*100).toFixed(1).padStart(6)+"%");
});

console.log("\n=== 3. HIS NEW BLOCK, on the cut, heavy days ===\n");
const PLAN = [
  ["Back Squat", 5, 5], ["Romanian Deadlift", 4, 8], ["Barbell Bench Press", 5, 5],
  ["Leg Press", 3, 15], ["Overhead Press", 4, 6], ["Incline Dumbbell Press", 4, 8],
];
for (const [name, sets, reps] of PLAN) {
  const anchor = anchorFrom(HIS[name]);
  const maxes = { [name.toLowerCase()]: anchor };
  const floor = floorFromHistory(HIS[name][0].sets, reps);
  const rows = ladderFor(name, cut, maxes, sets, undefined, reps, floor, 1, null);
  if (!rows) { console.log(name, "-> no prescription"); continue; }
  const w1 = rows[0], w6 = rows[rows.length-1];
  const e1 = w1.top/repPct(w1.reps), e6 = w6.top/repPct(w6.reps);
  console.log(name + "  (anchor " + Math.round(anchor) + ", floor " + floor + ")");
  console.log("   " + rows.map(function (r) {
    return "w"+r.week+" "+r.top+"x"+r.reps+(r.deload?"(dl)":r.mode==="reps"?"(+rep)":"");
  }).join("  "));
  console.log("   effort w1 " + e1.toFixed(1) + " -> w6 " + e6.toFixed(1)
    + "  = " + ((e6/e1-1)*100).toFixed(1) + "% across the block");
  console.log("   " + (progressNote(rows[1]) || "").slice(0,90));
  console.log();
}
