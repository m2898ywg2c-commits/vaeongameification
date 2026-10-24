// THE ENGINE ROOM.
//
// A conditioning session that sits BESIDE the training plan rather than inside it. Open it
// whenever you like; it does not appear in the week, it does not count toward the pledge,
// and skipping it costs nothing.
//
// WHY IT IS NOT AN EXERCISE CARD.
//
// Everything in app/plan is sets by reps by weight. None of this is. An AMRAP has a cap and
// a score; an EMOM has an interval and a station. Forcing either into the exercise card is
// what made conditioning feel bolted on, so this has its own shape: a clock, a list of
// stations, and a score of rounds plus stations.
//
// THE ROTATION.
//
// One session is available at a time. Finish it and the next unlocks. profiles.engine_index
// holds the position and only ever moves forward, modulo the library length, so the order
// is stable and nobody has to choose. That is deliberate: a picker of seven conditioning
// sessions is a decision to make while standing in a gym, and the whole point of this
// feature is to remove that decision.
//
// SOURCES.
//
// Four are Revolution Gym's own boards, transcribed as written. They are marked
// source: "revolution" and MUST NOT be edited to fit the app: they are what James's gym is
// actually running, and the value is that they match the room he is standing in. The other
// three are built from the same grammar (an erg, a loaded push or carry, a wall ball or
// burpee, a run, thirteen to twenty minutes) and pointed at HYROX.

export const ENGINE_SESSIONS = [
  {
    key: "four-stations",
    name: "Four Stations",
    format: "amrap",
    cap: 18,
    source: "vaeon",
    blurb: "The closest thing to race order. Row into wall balls is the back-to-back that catches people out on the day.",
    stations: [
      { qty: "500m", move: "Row" },
      { qty: "15", move: "Wall Balls" },
      { qty: "25m", move: "Sled Push" },
      { qty: "10", move: "Burpee Broad Jumps" },
    ],
  },
  {
    key: "compromised",
    name: "Compromised",
    format: "amrap",
    cap: 16,
    source: "vaeon",
    blurb: "Loaded movements placed after the erg on purpose. Grip is the limiter, which is also true in the race.",
    stations: [
      { qty: "400m", move: "Ski" },
      { qty: "12", move: "Dumbbell Thrusters" },
      { qty: "20m", move: "Farmers Carry, heavy" },
      { qty: "15", move: "Box Step Overs" },
    ],
  },
  {
    key: "both-directions",
    name: "Both Directions",
    format: "amrap",
    cap: 20,
    source: "vaeon",
    blurb: "Sled pull is the station most people neglect, because most gyms cannot set one up.",
    stations: [
      { qty: "800m", move: "C2 Bike" },
      { qty: "25m", move: "Sled Pull" },
      { qty: "12", move: "Dual DB Front Rack Reverse Lunge" },
      { qty: "20 cal", move: "Ski" },
    ],
  },
  {
    key: "revolution-monday",
    name: "Revolution Monday",
    format: "amrap",
    cap: 20,
    source: "revolution",
    blurb: "Part C of the Monday board. Parts A and B are the strength work, which your own plan already covers.",
    stations: [
      { qty: "200m", move: "Run" },
      { qty: "20", move: "Wall Balls" },
      { qty: "15/12 cal", move: "Ski" },
      { qty: "25m", move: "Sled Push" },
      { qty: "15", move: "Down Ups" },
    ],
  },
  {
    key: "revolution-emom-42",
    name: "Revolution EMOM 42",
    format: "emom",
    cap: 42,
    work: 50,
    rest: 10,
    source: "revolution",
    blurb: "Seven times through the six stations. Fifty seconds on, ten off, and the clock does not care how you feel.",
    stations: [
      { qty: "16/12 cal", move: "Row" },
      { qty: "500/450m", move: "C2 Bike" },
      { qty: "16/12 cal", move: "Ski" },
      { qty: "12", move: "Burpee Box Jump" },
      { qty: "15/12 cal", move: "Assault Bike" },
      { qty: "30 sec", move: "Wall Sit" },
    ],
  },
  {
    key: "hyrox-36",
    name: "HYROX 36 Minute AMRAP",
    format: "amrap",
    cap: 36,
    source: "revolution",
    blurb: "The simulation version. Long, and meant to be paced rather than attacked.",
    stations: [
      { qty: "1 lap", move: "Chill Run" },
      { qty: "500m", move: "Erg" },
      { qty: "12", move: "Burpee Broad Jumps" },
      { qty: "1 lap", move: "Chill Run" },
      { qty: "500m", move: "Erg" },
      { qty: "2 lengths", move: "Farmers Carry" },
      { qty: "24", move: "Lunges" },
      { qty: "30", move: "Wall Balls" },
    ],
  },
  {
    key: "friyay-pairs",
    name: "Friyay Pairs",
    format: "amrap",
    cap: 13,
    parts: 3,
    source: "revolution",
    blurb: "Three thirteen minute AMRAPs with a minute between them. Written for pairs; solo it is a long Friday.",
    stations: [
      { qty: "A", move: "800m Assault Bike, 400m Ski, 40 Burpee Returns" },
      { qty: "B", move: "1200/1000m C2 Bike, 60 Wall Balls, 32 Burpee to Target" },
      { qty: "C", move: "900m Row, 3x Sled Pull, 40 Dbl DB Front Rack Rev Lunge, 40 DB S2OH" },
    ],
  },
];

export const ENGINE_COUNT = ENGINE_SESSIONS.length;

/**
 * The session currently unlocked. Index wraps, so the rotation is endless and the order is
 * always the same, which is what makes "the next one" a meaningful phrase.
 *
 * @param {number} index profiles.engine_index. Anything unusable is treated as the start.
 */
export function currentSession(index) {
  const n = Number(index);
  const i = Number.isFinite(n) && n >= 0 ? Math.floor(n) % ENGINE_COUNT : 0;
  return ENGINE_SESSIONS[i];
}

/** What unlocks after this one, for the "next up" line. */
export function nextSession(index) {
  const n = Number(index);
  const i = Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
  return ENGINE_SESSIONS[(i + 1) % ENGINE_COUNT];
}

/** Which lap of the library somebody is on, for "round 2 of the rotation". */
export function rotationLap(index) {
  const n = Number(index);
  const i = Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
  return Math.floor(i / ENGINE_COUNT) + 1;
}

/**
 * A score, as a comparable number of stations.
 *
 * Rounds alone cannot be compared across sessions with different station counts, and
 * "3 rounds + 2" is not a number you can plot. Total stations completed is, and it is the
 * only honest way to say whether this week beat last time on the same session.
 */
export function scoreToStations(session, rounds, extra) {
  const perRound = session && session.stations ? session.stations.length : 1;
  const r = Math.max(0, Math.floor(Number(rounds) || 0));
  const e = Math.max(0, Math.floor(Number(extra) || 0));
  return r * perRound + Math.min(e, Math.max(0, perRound - 1));
}

/** "3 rounds + 2" or "3 rounds", for display. */
export function scoreWords(rounds, extra) {
  const r = Math.max(0, Math.floor(Number(rounds) || 0));
  const e = Math.max(0, Math.floor(Number(extra) || 0));
  const base = r + (r === 1 ? " round" : " rounds");
  return e > 0 ? base + " + " + e : base;
}
