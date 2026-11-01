// The coach link's local brain and the dashboard briefing. Run: node test/coachtalk.mjs
import assert from "node:assert/strict";
import { intentOf, localReply, CHIPS, greetingFor, contextForModel, LOCAL_FIRST } from "../lib/coachtalk.js";
import { briefingFor, factLine } from "../lib/briefing.js";

const TYPES = ["architect", "captain", "monk", "anchor", "hunter", "gladiator", "wanderer", "spark"];
let n = 0;
function ok(cond, msg) { assert.ok(cond, msg); n += 1; }

// Safety wins over everything else in the same sentence.
ok(intentOf("my knee hurts, what's next") === "hurt", "pain beats navigation");
ok(intentOf("I feel a bit flat today") === "motivate", "a feeling is not a plan request");
ok(intentOf("what's today") === "today", "today, asked properly");
ok(intentOf("no gym today, I'm at the hotel") === "nogym", "no gym");
ok(intentOf("what did I do last time") === "last", "last time");
ok(intentOf("tell me a joke") === null, "chat goes to the model");

const ctx = { mode: "session", exercises: [
  { name: "Back Squat", sets: 5, done: true, last: "100kg x 7" },
  { name: "Romanian Deadlift", sets: 4, done: false, last: "80kg x 8" },
] };

for (const t of TYPES) {
  ok(greetingFor(t, "session").length > 0 && greetingFor(t, "dashboard").length > 0, t + " greets");
  for (const intent of LOCAL_FIRST.concat(["motivate", null])) {
    const r = localReply(t, intent, ctx);
    ok(r && typeof r.text === "string" && r.text.length > 3, t + " answers " + intent);
    ok(r.text.indexOf("\u2014") === -1, "no em dashes");
    // The coach never states a load it was not given. The only kg allowed is last time's.
    const kg = r.text.match(/\d+(\.\d+)?kg/g) || [];
    kg.forEach(function (k) { ok(/80kg|100kg/.test(k), t + " " + intent + " invented " + k); });
  }
  const hurt = localReply(t, "hurt", ctx);
  ok(hurt.safety === true && /qualified/.test(hurt.text), t + " sends pain to a professional");
  ok(/Romanian Deadlift/.test(localReply(t, "next", ctx).text), t + " finds the next undone lift");
  ok(/80kg x 8/.test(localReply(t, "last", ctx).text), t + " reads last time for the next lift");
  ok(localReply(t, "today", ctx).text === localReply(t, "next", ctx).text, "today mid-session means next");
}

ok(localReply("captain", "nogym", { gymReady: true }).route === undefined, "Gym ready has no fallback route");
ok(localReply("captain", "nogym", {}).route === "/fallback", "fallback route");
ok(CHIPS.session.length === 4 && CHIPS.dashboard.length === 4, "four chips each");

const m = contextForModel(ctx);
ok(m.exercises.every(function (e) { return !("reps" in e) && !("note" in e); }), "no reps or notes reach the model");

// Briefing.
const stats = { thisWeekCount: 1, daysSinceLast: 1 };
ok(factLine({ stats, pledged: 3, weekNo: 3, blockWeeks: 6, ruleLabel: "Load" }) === "Week 3 of 6, load week. 1 of 3 done.", "fact line");
ok(factLine({ stats: { thisWeekCount: 3 }, pledged: 3, weekNo: 2, blockWeeks: 8, ruleLabel: "Build", gym: true }) === "Week 2 of 8. All 3 done.", "gym ready has no rule label");
for (const t of TYPES) {
  for (const s of [null, { thisWeekCount: 0, daysSinceLast: 9 }, { thisWeekCount: 3, daysSinceLast: 0 }]) {
    const b = briefingFor({ typeId: t, stats: s || { daysSinceLast: null }, pledged: 3, weekNo: 1, blockWeeks: 6, ruleLabel: "Technique" });
    ok(b.voice && b.fact, t + " briefs");
  }
  ok(briefingFor({ typeId: t, stats, pledged: 3, finished: true, weekNo: 6, blockWeeks: 6 }).situation === "finished", "finished wins");
}
ok(briefingFor({ typeId: "nonsense", stats, pledged: 3, weekNo: 1, blockWeeks: 6 }).voice.length > 0, "unknown type falls back");

console.log("coachtalk + briefing: " + n + " checks passed");
