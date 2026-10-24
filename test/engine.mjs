import { ENGINE_SESSIONS, ENGINE_COUNT, currentSession, nextSession, rotationLap, scoreToStations, scoreWords } from "../lib/engine.js";

let fails = 0;
function ok(n, got, want) { if (got !== want) { fails++; console.log("  FAIL " + n + ": got " + got + ", wanted " + want); } }
function truthy(n, c) { if (!c) { fails++; console.log("  FAIL " + n); } }

// The library itself.
truthy("at least three sessions", ENGINE_COUNT >= 3);
const keys = ENGINE_SESSIONS.map(function (s) { return s.key; });
ok("keys are unique", new Set(keys).size, keys.length);
ENGINE_SESSIONS.forEach(function (s) {
  truthy(s.key + " has a name", !!s.name);
  truthy(s.key + " has a cap", Number(s.cap) > 0);
  truthy(s.key + " has stations", s.stations && s.stations.length > 0);
  truthy(s.key + " format is known", s.format === "amrap" || s.format === "emom");
  truthy(s.key + " has a blurb", !!s.blurb);
  s.stations.forEach(function (st) {
    truthy(s.key + " station has qty and move", !!st.qty && !!st.move);
  });
});

// The gym's own boards must survive untouched.
const rev = ENGINE_SESSIONS.filter(function (s) { return s.source === "revolution"; });
ok("four Revolution boards", rev.length, 4);
const emom = ENGINE_SESSIONS.find(function (s) { return s.format === "emom"; });
truthy("the EMOM carries its work/rest split", emom && emom.work === 50 && emom.rest === 10);

// Rotation: every index resolves, wraps, and never lands off the end.
for (let i = 0; i < ENGINE_COUNT * 3 + 5; i++) {
  const c = currentSession(i);
  truthy("index " + i + " resolves", !!c && !!c.key);
  ok("index " + i + " wraps correctly", c.key, ENGINE_SESSIONS[i % ENGINE_COUNT].key);
  ok("next follows current", nextSession(i).key, ENGINE_SESSIONS[(i + 1) % ENGINE_COUNT].key);
}
ok("a full lap returns to the start", currentSession(ENGINE_COUNT).key, ENGINE_SESSIONS[0].key);
ok("lap 1 at the start", rotationLap(0), 1);
ok("lap 2 after one full pass", rotationLap(ENGINE_COUNT), 2);

// Rubbish indexes must not break the screen.
[null, undefined, -1, NaN, "x", 1.7].forEach(function (bad) {
  truthy("bad index " + String(bad) + " still resolves", !!currentSession(bad).key);
});

// Scoring.
const four = { stations: [1, 2, 3, 4] };
ok("3 rounds of 4", scoreToStations(four, 3, 0), 12);
ok("3 rounds + 2", scoreToStations(four, 3, 2), 14);
ok("extra cannot complete a round", scoreToStations(four, 3, 9), 15);
ok("negatives floor at zero", scoreToStations(four, -2, -2), 0);
ok("no session still returns a number", scoreToStations(null, 2, 0), 2);
ok("words, plural", scoreWords(3, 0), "3 rounds");
ok("words, singular", scoreWords(1, 0), "1 round");
ok("words, with extra", scoreWords(3, 2), "3 rounds + 2");
ok("words, zero", scoreWords(0, 0), "0 rounds");

if (fails) { console.log("\n" + fails + " FAILURES"); process.exit(1); }
console.log("ALL ENGINE ROOM ASSERTIONS PASS");
