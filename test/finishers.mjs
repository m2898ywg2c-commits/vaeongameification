import { buildWeek, GOAL_ORDER } from "../lib/training.js";

// WHAT THIS GUARDS.
//
// Finishers are chosen by kit, not by goal: a gym gets HYROX stations, anything else gets
// the set that works in a park. The failure that matters is the second one, because
// prescribing a SkiErg to somebody training in their front room is not a dull week, it is
// the app not knowing who it is talking to. A quarter of the accounts on this database are
// not at a gym.

const KIT = ["SkiErg", "Row", "Slam Balls", "Sled Push & Pull", "Weighted Lunge Walk", "Wall Balls", "Farmers Carry"];
const STATIONS = KIT.concat(["Burpee Broad Jumps"]);
const PATTERNS = [[1, 3], [2, 3, 4], [1, 2, 4, 6], [0, 1, 2, 4, 5], [0, 1, 2, 3, 4, 5]];

let checks = 0;
const fails = [];
function ok(cond, msg) { checks++; if (!cond) fails.push(msg); }

function finishersOf(goal, sessions, days, week, equipment) {
  const out = [];
  buildWeek([goal], sessions, days, true, week, equipment).forEach(function (d) {
    (d.conditioning || []).forEach(function (c) { out.push(c.name); });
  });
  return out;
}

// 1. NOBODY WITHOUT KIT IS EVER HANDED A STATION. Swept across every goal, every session
//    count, every day pattern and a whole block of weeks, because the pool rotates by week
//    and a bug that only shows up in week four is still a bug.
for (const goal of GOAL_ORDER)
  for (const sessions of [2, 3, 4, 5, 6])
    for (const days of PATTERNS)
      for (const week of [1, 2, 3, 4, 5, 6])
        for (const equipment of ["none", "home"]) {
          const got = finishersOf(goal, sessions, days, week, equipment);
          const bad = got.filter(function (n) { return KIT.indexOf(n) !== -1; });
          ok(bad.length === 0,
            `${equipment} profile on ${goal} (${sessions}/wk, week ${week}) was prescribed: ${bad.join(", ")}`);
        }

// 2. IF A GYM PROFILE GETS A FINISHER, IT IS A STATION.
//
//    Phrased as a conditional on purpose. Running and yoga goals get no finisher at all,
//    whatever the kit, because every focus they own is on NO_FINISHER: you do not bolt a
//    sled onto an easy run. Asserting every goal gets one failed here and the code was
//    right. So the stations land on the lifting goals, which is where they belong.
let goalsWithFinishers = 0;
for (const goal of GOAL_ORDER)
  for (const sessions of [3, 4]) {
    const got = finishersOf(goal, sessions, [2, 3, 4, 6], 1, "gym");
    if (!got.length) continue;
    goalsWithFinishers++;
    const strays = got.filter(function (n) { return STATIONS.indexOf(n) === -1; });
    ok(strays.length === 0,
      `gym profile on ${goal} got a non-station finisher: ${strays.join(", ")}`);
  }
ok(goalsWithFinishers > 0, "no goal in the picker gets a finisher, so nothing was tested");

// 3. NULL EQUIPMENT COUNTS AS A GYM. Onboarding defaults to "gym" and plan/page.js already
//    treats null that way for homeMode. Two rules for the same column is how they drift.
for (const equipment of [null, undefined, ""]) {
  const got = finishersOf("strength", 4, [2, 3, 4, 6], 1, equipment);
  ok(got.some(function (n) { return STATIONS.indexOf(n) !== -1; }),
    `equipment ${JSON.stringify(equipment)} was treated as home, not as a gym`);
}

// 4. THE ROTATION REACHES THE WHOLE POOL. Five stations used to be dealt from index zero
//    every build, so the fifth was unreachable for an entire block. Now there are eight.
const seen = new Set();
for (let week = 1; week <= 8; week++)
  finishersOf("strength", 4, [2, 3, 4, 6], week, "gym").forEach(function (n) { seen.add(n); });
for (const station of STATIONS)
  ok(seen.has(station), `${station} is unreachable: eight weeks of a gym plan never dealt it`);

// 5. THE KIT-FREE SET STAYS KIT-FREE. Guards the pool itself, not just the routing, so
//    adding a sled to FINISHERS one day fails here rather than in somebody's living room.
const home = new Set();
for (let week = 1; week <= 8; week++)
  finishersOf("strength", 4, [2, 3, 4, 6], week, "none").forEach(function (n) { home.add(n); });
ok(home.size > 0, "no home profile got any finisher across eight weeks and every goal");
for (const name of home)
  ok(!/sled|erg|ski|wall ball|slam/i.test(name), `kit-free pool contains "${name}", which needs a gym`);

console.log(`${checks} checks`);
if (fails.length) {
  console.log(`\n${fails.length} FAILED:`);
  fails.slice(0, 20).forEach(function (f) { console.log("  " + f); });
  process.exit(1);
}
console.log("all pass");
