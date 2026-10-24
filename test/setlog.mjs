// The set-completeness rule. See lib/setlog.js for the bug this exists to prevent.
import { setIsComplete, KINDS } from "../lib/setlog.js";

let fails = 0;
function ok(name, got, want) {
  if (got !== want) { fails++; console.log("  FAIL " + name + ": got " + got + ", wanted " + want); }
}

// THE REGRESSION. A weighted lift on a testing week: reps prefilled, no weight.
// This returned true for two months and wrote a null-weight row.
ok("weight kind, reps but no weight", setIsComplete("weight", false, { reps: "10" }), false);
ok("weight kind, weight present", setIsComplete("weight", false, { weight: "60", reps: "10" }), true);
ok("weight kind, weight but no reps", setIsComplete("weight", false, { weight: "60" }), true);
ok("weight kind, empty", setIsComplete("weight", false, {}), false);
ok("weight kind, whitespace only", setIsComplete("weight", false, { weight: "  " }), false);
ok("weight kind, zero is a real entry", setIsComplete("weight", false, { weight: "0" }), true);

// Loadable bodyweight: reps alone is a complete set on purpose.
ok("reps kind, reps only", setIsComplete("reps", false, { reps: "12" }), true);
ok("reps kind, weight only", setIsComplete("reps", false, { weight: "20" }), false);
ok("reps kind, empty", setIsComplete("reps", false, {}), false);

// Holds.
ok("time kind, secs", setIsComplete("time", false, { secs: "45" }), true);
ok("time kind, empty", setIsComplete("time", false, {}), false);
ok("per-side, both sides", setIsComplete("time", true, { secsL: "30", secsR: "30" }), true);
ok("per-side, one side only", setIsComplete("time", true, { secsL: "30" }), false);
ok("per-side, neither", setIsComplete("time", true, {}), false);

// Carries and cardio.
ok("distance kind, text", setIsComplete("distance", false, { text: "40m" }), true);
ok("distance kind, reps do not count", setIsComplete("distance", false, { reps: "10" }), false);
ok("cardio kind, km", setIsComplete("cardio", false, { km: "5" }), true);
ok("cardio kind, mins only", setIsComplete("cardio", false, { mins: "22" }), true);
ok("cardio kind, empty", setIsComplete("cardio", false, {}), false);

// An unknown kind must not block logging entirely.
ok("unknown kind falls back", setIsComplete("mystery", false, { reps: "10" }), true);
ok("unknown kind, truly empty", setIsComplete("mystery", false, {}), false);

// Null and undefined field bags must not throw.
ok("null fields", setIsComplete("weight", false, null), false);
ok("undefined fields", setIsComplete("weight", false, undefined), false);

// Every kind the card can produce has an explicit branch.
KINDS.forEach(function (k) {
  const everything = { weight: "1", reps: "1", secs: "1", secsL: "1", secsR: "1", text: "x", km: "1", mins: "1" };
  ok("kind " + k + " accepts a fully filled set", setIsComplete(k, false, everything), true);
  ok("kind " + k + " rejects an empty set", setIsComplete(k, false, {}), false);
});

if (fails) { console.log("\n" + fails + " FAILURES"); process.exit(1); }
console.log("ALL SET-COMPLETENESS ASSERTIONS PASS (" + (24 + KINDS.length * 2) + ")");
