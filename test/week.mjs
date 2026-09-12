import { buildWeek, GOALS, GOAL_ORDER, GOAL_LIST, slotsFor } from "../lib/training.js";

const TUE_WED_THU = [2, 3, 4];       // profiles.train_days, 0 = Sunday
const TUE_WED_THU_SAT = [2, 3, 4, 6];

for (const [label, n, days] of [["THREE MORNINGS", 3, TUE_WED_THU], ["FOUR, WITH THE BONUS", 4, TUE_WED_THU_SAT]]) {
  console.log("=== " + label + " ===\n");
  const week = buildWeek(["hyroxlean"], n, days, true, 1);
  week.forEach(function (d) {
    console.log(`  ${d.dayLabel}  ${d.title}   [${d.focus}]${d.fixed ? "  (fixed)" : ""}`);
    d.exercises.forEach(function (ex) {
      console.log(`      ${String(ex.sets).padStart(2)} x ${String(ex.reps).padEnd(12)} ${ex.name}${ex.intensity ? " ["+ex.intensity+"]" : ""}`);
    });
    if (d.conditioning && d.conditioning.length) {
      d.conditioning.forEach(c => console.log(`      finisher: ${c.name} - ${c.target}`));
    }
    console.log();
  });
}

// the sweep the handover asks for
console.log("=== FULL SWEEP: every goal, every session count, every day pattern ===\n");
const patterns = [[], [1], [1,3], [2,3,4], [1,2,4,6], [0,1,2,4,5], [0,1,2,3,4,5], [2,3,4,6]];
let n = 0;
const fails = { adjacent: [], overfreq: [], empty: [], duptitle: [], orphanLight: [], noslot: [], condreach: [], fixedDay: [] };
for (const primary of GOAL_ORDER)
for (const secondary of [null, ...GOAL_ORDER])
for (const sessions of [2,3,4,5,6])
for (const pattern of patterns)
for (const fixed of [true, false]) {
  if (secondary === primary) continue;
  const goals = secondary ? [primary, secondary] : [primary];
  const week = buildWeek(goals, sessions, pattern, fixed, 1);
  n++;
  const namesOf = d => d.exercises.map(x => String(x.name).toLowerCase());
  // adjacent repeats
  for (let i = 1; i < week.length; i++) {
    if (week[i].fixed || week[i-1].fixed) continue;
    const a = namesOf(week[i-1]), c = namesOf(week[i]);
    const shared = c.filter(x => a.includes(x));
    if (shared.length) fails.adjacent.push([goals.join("+"), sessions, week[i].title, shared.join(",")]);
  }
  // over frequency
  const count = {};
  week.forEach(d => { if (!d.fixed) namesOf(d).forEach(x => count[x] = (count[x]||0)+1); });
  Object.entries(count).forEach(([k,v]) => { if (v > 2) fails.overfreq.push([goals.join("+"), sessions, k, v]); });
  // empty days / dup titles / slots
  week.forEach(d => { if (!d.exercises.length) fails.empty.push([goals.join("+"), sessions, d.title]); });
  const t = {};
  week.forEach(d => { t[d.title] = (t[d.title]||0)+1; if (t[d.title] > 1) fails.duptitle.push([goals.join("+"), sessions, d.title]); });
  week.forEach(d => { if (!d.dayLabel) fails.noslot.push([goals.join("+"), sessions, d.title]); });
  // light day with no heavy day
  const heavy = new Set(), light = new Set();
  week.forEach(d => d.exercises.forEach(x => { if (x.intensity === "heavy") heavy.add(x.name.toLowerCase()); if (x.intensity === "light") light.add(x.name.toLowerCase()); }));
  light.forEach(k => { if (!heavy.has(k)) fails.orphanLight.push([goals.join("+"), sessions, k]); });
  // a fixed day must come through exactly as authored: no tags, no substitutions
  week.forEach(function (d) {
    if (!d.fixed) return;
    const authored = GOALS[primary].days.find(x => x.key === d.key)
      || (secondary && GOALS[secondary].days.find(x => x.key === d.key));
    if (!authored) return;
    d.exercises.forEach(function (ex, i) {
      const a = authored.exercises[i];
      if (!a || ex.name !== a.name || String(ex.reps) !== String(a.reps) || ex.intensity) {
        fails.fixedDay.push([goals.join("+"), sessions, d.title, ex.name, ex.intensity || "reps " + ex.reps]);
      }
    });
  });
  // conditioning reachable: for hybrid goals at 3+ sessions there must be conditioning work
  if (!secondary && sessions >= 3 && GOALS[primary].category === "hybrid") {
    const hasCond = week.some(d => ["Conditioning","Hybrid"].includes(d.focus));
    if (!hasCond) fails.condreach.push([primary, sessions]);
  }
}
console.log("weeks built:", n.toLocaleString(), "\n");
let bad = 0;
for (const [k,v] of Object.entries(fails)) {
  console.log(k.padEnd(13), v.length === 0 ? "PASS  0" : "FAIL  " + v.length);
  if (v.length) { bad += v.length; v.slice(0,4).forEach(r => console.log("     ", r.join(" | "))); }
}
console.log("\n" + (bad === 0 ? "ALL WEEK INVARIANTS HOLD" : "FAILURES: " + bad));
console.log("\ngoals:", GOAL_LIST.length, "| new one listed first:", GOAL_LIST[0].id, "-", GOAL_LIST[0].name);
