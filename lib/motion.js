// EIGHT CHARACTERS, EIGHT WAYS OF BEING PLEASED.
//
// WHAT CAN AND CANNOT BE ANIMATED HERE, SO NOBODY PLANS AROUND A THING THAT IS NOT TRUE.
//
// Each render in public/characters is one flat image in one pose. There is no rig, no
// layers and no depth. So the only honest motion is whole-body: a jump, a lean, a nod, a
// sway, a recoil. Anything that needs an elbow to bend, a thumbs up or a pair of hands
// making a heart, needs new artwork and not a cleverer keyframe. Warping a raster to fake
// a moving limb looks exactly as bad as it sounds, and it is not attempted anywhere.
//
// That is a real ceiling and it is where the next batch of artwork goes. Until then the
// moves below are chosen so the eight read differently from across a room WITHOUT any of
// them needing a pose they do not have.
//
// THE MOVE BELONGS TO THE TYPE, NOT TO THE MOMENT.
//
// A Spark leaps whether it has just finished one set or a six week block. The reason is the
// whole reason the eight exist: it should be YOUR character reacting, in the way your
// character reacts. One shared celebration animation played by all eight would undo that,
// and it would undo it in the exact place the product is trying to make the point.
//
// Durations are tuned to the personality rather than to a house number. The Monk takes two
// full seconds and the Gladiator is done in under one, because that difference is the
// characterisation. Keep them apart if you edit them.

export const MOVES = {
  // Outcome, solo, freestyle. Winds up and drives forward, like the sled it is pushing.
  hunter: { key: "drive", ms: 820 },
  // Planned, outcome, together. Draws itself up and gives two firm nods. Approval, not joy.
  captain: { key: "square", ms: 900 },
  // Freestyle, experience, solo. Unbothered. Floats and sways and gets there anyway.
  wanderer: { key: "drift", ms: 1500 },
  // The one that jumps, as asked. Crouch, leap, squash on landing, small rebound.
  spark: { key: "leap", ms: 1000 },
  // Shakes it off fast, then chest out. The only move with no rest in the middle.
  gladiator: { key: "shake", ms: 820 },
  // Slow warm swell. The steady one does not bounce, it grows and settles.
  anchor: { key: "swell", ms: 1500 },
  // Gentle rise and fall, and it gives you a heart. The nearest honest thing to the hands
  // James asked for: the heart is drawn beside the character rather than held by it,
  // because holding it needs an arm this render does not have.
  monk: { key: "breathe", ms: 2000, ornament: "heart" },
  // Precise. Tilts one way, holds, tilts the other, holds, settles. Reads as a scan.
  architect: { key: "scan", ms: 1150 },
};

// The Architect is the app's own fallback type elsewhere, so an unknown id behaving like a
// Captain here would disagree with the rest of the app. Match it.
const FALLBACK = MOVES.architect;

export function moveFor(typeId) {
  return MOVES[typeId] || FALLBACK;
}

// The longest move in the set, for anything that needs to hold a layout open until every
// character on screen has finished. Derived rather than written down, so adding a slower
// move cannot leave a stale constant behind.
export const LONGEST_MOVE_MS = Object.keys(MOVES).reduce(function (max, id) {
  return Math.max(max, MOVES[id].ms);
}, 0);
