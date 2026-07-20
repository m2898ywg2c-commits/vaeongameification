// Form cues, coaching cues and no-gym alternatives, matched on movement keywords
// so every exercise across all 13 goals is covered without 500 hand-written entries.

const RULES = [
  {
    match: ["bench press"],
    form: "Shoulder blades pinned back and down, feet flat, bar to mid chest. Elbows about 45 degrees from your body, not flared out.",
    coach: "Lower under control for two seconds, drive up fast. If the bar wobbles, it is too heavy.",
    home: "Press-ups with your hands on a chair or the floor. Slow down the lowering to make them harder.",
  },
  {
    match: ["incline", "dumbbell press", "shoulder press", "overhead press", "push press"],
    form: "Ribs down, do not arch your lower back. Press up and slightly back so the weight finishes over your shoulders.",
    coach: "Full stretch at the bottom is where the muscle is built. Do not cut the range short to add weight.",
    home: "Pike press-ups with hips high, or press a loaded backpack overhead.",
  },
  {
    match: ["back squat", "front squat", "squat"],
    form: "Feet shoulder width, toes slightly out. Sit down between your hips, knees tracking over your toes, chest proud.",
    coach: "Depth first, weight second. A deep clean squat beats a heavy half one every time.",
    home: "Bodyweight squats, then hold something heavy at your chest. A full washing basket or a loaded backpack works.",
  },
  {
    match: ["deadlift", "romanian"],
    form: "Bar close to your legs, back flat, push the floor away. Hinge at the hips, do not round your lower back.",
    coach: "You should feel this in your hamstrings and glutes. If your lower back is doing the work, lighten it.",
    home: "Single leg Romanian deadlift holding a bag in one hand. Slow and controlled.",
  },
  {
    match: ["hip thrust", "glute bridge", "frog pump"],
    form: "Shoulders on the bench or floor, chin tucked, drive through your heels. Full lockout, squeeze at the top.",
    coach: "Pause a full second at the top of every rep. That pause is the whole exercise.",
    home: "Glute bridges off the sofa with a backpack on your hips.",
  },
  {
    match: ["lunge", "split squat", "step up"],
    form: "Long stride, torso upright, front knee over the middle of your foot. Push through the front heel.",
    coach: "Control the descent. If you are wobbling, hold something for balance and drop the weight.",
    home: "Bodyweight lunges, or hold shopping bags. Bulgarian split squats with your back foot on the sofa.",
  },
  {
    match: ["row", "pulldown", "pull up", "chin up", "pull-up"],
    form: "Chest up, pull with your elbows not your hands, squeeze your shoulder blades together at the end.",
    coach: "Two seconds on the way back. Most people rush the return and lose half the benefit.",
    home: "Rows using a towel round a door handle, or a heavy bag lifted to your ribs.",
  },
  {
    match: ["dip", "tricep", "skull crusher", "pushdown"],
    form: "Elbows stay tucked and still. Only your forearm moves.",
    coach: "If your elbows drift forward you have gone too heavy. Reset and go lighter.",
    home: "Bench dips off a chair, or close-hand press-ups.",
  },
  {
    match: ["curl"],
    form: "Elbows pinned to your sides, no swinging. Lower slowly, all the way straight.",
    coach: "Nobody has ever built arms by cheating curls. Lighter and stricter wins.",
    home: "Curl a loaded shopping bag or a water container in each hand.",
  },
  {
    match: ["fly", "lateral raise", "rear delt", "face pull", "kickback", "abductor"],
    form: "Light weight, slow tempo, no momentum. Lead with the elbow or the outside of the hand.",
    coach: "This is a squeeze exercise, not a lift. If you can swing it, it is too heavy.",
    home: "Use a resistance band, or two full water bottles.",
  },
  {
    match: ["leg press", "leg curl", "leg extension"],
    form: "Full range, controlled. Do not lock your knees out hard at the top.",
    coach: "Pause at the hardest point of every rep for a second.",
    home: "Single leg squats to a chair, and Nordic curl negatives using a sofa to hook your feet.",
  },
  {
    match: ["plank", "dead bug", "hollow", "ab wheel", "leg raise", "crunch", "woodchop", "russian twist", "l-sit"],
    form: "Ribs down, belly button pulled in, breathe normally. Do not let your hips sag or your back arch.",
    coach: "Quality over time. Thirty honest seconds beats a sloppy minute.",
    home: "Exactly the same. No equipment needed for any of this.",
  },
  {
    match: ["calf raise"],
    form: "Full stretch at the bottom, all the way up onto your toes, pause at the top.",
    coach: "Slow. Calves respond to time under tension, not bouncing.",
    home: "Off the edge of a step, holding a backpack.",
  },
  {
    match: ["sled", "farmers carry", "battle rope", "wall ball", "burpee", "mountain climber", "jumping jack", "thruster", "high knee"],
    form: "Brace your core, breathe in rhythm, keep your form as fatigue arrives.",
    coach: "Pace it. Going out too fast in the first round costs you the whole session.",
    home: "Burpees, carrying heavy shopping bags round the garden, or stair sprints.",
  },
  {
    match: ["skierg", "row 500", "run", "jog", "interval", "tempo", "hill", "parkrun", "cycle", "bike", "swim", "cardio", "walk"],
    form: "Relaxed shoulders, steady breathing, land under your hips if you are running.",
    coach: "Easy days genuinely easy, hard days genuinely hard. The middle is where progress goes to die.",
    home: "Outdoors, stairs, or twenty minutes of anything that leaves you slightly out of breath.",
  },
  {
    match: ["push up", "press up", "press-up", "push-up", "pistol", "handstand", "muscle up", "australian", "scapular", "dead hang", "nordic"],
    form: "Straight line from head to heels, full range, no sagging.",
    coach: "Add reps before you add difficulty. Master the easy version first.",
    home: "Already bodyweight. Nothing to change.",
  },
  {
    match: ["yoga", "stretch", "mobility", "pigeon", "breathwork", "flow", "jefferson", "dislocate", "wrist"],
    form: "Move to mild tension, never pain. Breathe out as you deepen the stretch.",
    coach: "Do not bounce. Hold, breathe, and let it release on its own.",
    home: "Perfect at home. All you need is floor space.",
  },
];

const DEFAULT = {
  form: "Controlled throughout, full range of motion, no bouncing or swinging.",
  coach: "Leave one or two reps in the tank. Quality every set beats failure on the last one.",
  home: "Swap for a bodyweight version, or use a loaded backpack or shopping bags for resistance.",
};

function lookup(name) {
  const n = (name || "").toLowerCase();
  for (let i = 0; i < RULES.length; i++) {
    const r = RULES[i];
    for (let j = 0; j < r.match.length; j++) {
      if (n.indexOf(r.match[j]) !== -1) return r;
    }
  }
  return DEFAULT;
}

export function formTip(name) { return lookup(name).form; }
export function coachTip(name) { return lookup(name).coach; }
export function homeAlternative(name) { return lookup(name).home; }

const GYM_ONLY = ["barbell", "bench press", "back squat", "front squat", "leg press", "leg curl",
  "leg extension", "cable", "lat pulldown", "sled", "skierg", "machine", "abductor", "preacher",
  "hip thrust", "deadlift", "smith", "battle rope", "wall ball", "chest supported"];

export function needsGym(name) {
  const n = (name || "").toLowerCase();
  return GYM_ONLY.some(function (g) { return n.indexOf(g) !== -1; });
}

const FLOWS = {
  lower: {
    name: "Lower body unwind",
    moves: [
      "Pigeon pose, 60 seconds each side",
      "Seated forward fold, 60 seconds",
      "Low lunge hip flexor stretch, 45 seconds each side",
      "Supine figure four, 45 seconds each side",
      "Legs up the wall, 2 minutes",
    ],
  },
  upper: {
    name: "Upper body release",
    moves: [
      "Doorway chest stretch, 45 seconds each side",
      "Thread the needle, 45 seconds each side",
      "Child pose with arms extended, 60 seconds",
      "Cat cow, 10 slow rounds",
      "Neck side stretch, 30 seconds each side",
    ],
  },
  full: {
    name: "Full body flow",
    moves: [
      "Downward dog to cobra, 8 slow rounds",
      "Worlds greatest stretch, 5 each side",
      "Seated spinal twist, 45 seconds each side",
      "Happy baby, 60 seconds",
      "Savasana, 2 minutes of nothing at all",
    ],
  },
  pilates: {
    name: "Pilates core finisher",
    moves: [
      "The hundred, 100 beats",
      "Single leg stretch, 10 each side",
      "Roll ups, 8 slow reps",
      "Swimming, 30 seconds",
      "Spine stretch forward, 8 reps",
    ],
  },
  runner: {
    name: "Runner cool down",
    moves: [
      "Standing calf stretch against a wall, 45 seconds each side",
      "Standing quad stretch, 45 seconds each side",
      "Seated hamstring fold, 60 seconds each side",
      "Pigeon pose, 60 seconds each side",
      "Legs up the wall, 3 minutes",
    ],
  },
};

export function stretchFor(day) {
  const t = ((day && day.title) || "").toLowerCase();
  const f = ((day && day.focus) || "").toLowerCase();
  if (f === "base" || f === "speed" || f === "threshold" || f === "recovery" || t.indexOf("run") !== -1) return FLOWS.runner;
  if (t.indexOf("leg") !== -1 || t.indexOf("glute") !== -1 || t.indexOf("thigh") !== -1 || t.indexOf("lower") !== -1) return FLOWS.lower;
  if (t.indexOf("chest") !== -1 || t.indexOf("push") !== -1 || t.indexOf("pull") !== -1 || t.indexOf("upper") !== -1 || t.indexOf("arm") !== -1) return FLOWS.upper;
  if (t.indexOf("core") !== -1 || t.indexOf("ab") !== -1) return FLOWS.pilates;
  return FLOWS.full;
}

// Everyday weight anchors so someone who has never lifted can still set a baseline.
export const WEIGHT_ANCHORS = [
  { kg: 1, thing: "A bag of sugar" },
  { kg: 2, thing: "A full kettle" },
  { kg: 4, thing: "A cat" },
  { kg: 6, thing: "A full watering can" },
  { kg: 10, thing: "A full washing basket" },
  { kg: 12, thing: "Two full shopping bags" },
  { kg: 20, thing: "An empty barbell, or a full airline suitcase" },
  { kg: 25, thing: "A four year old child" },
  { kg: 30, thing: "A large bag of dog food plus the shopping" },
  { kg: 40, thing: "A full beer keg" },
  { kg: 60, thing: "An average ten year old" },
  { kg: 80, thing: "An adult of average build" },
];

export const EFFORT_ANCHORS = [
  { level: 1, thing: "A gentle stroll to the shop. You could chat the whole way." },
  { level: 2, thing: "Twenty minutes hoovering without stopping. Warm, not puffed." },
  { level: 3, thing: "Carrying shopping up two flights of stairs. Noticeably working." },
  { level: 4, thing: "Running for a bus you really cannot miss. Hard to talk." },
  { level: 5, thing: "The last hundred metres of a race. Nothing left." },
];

// A sensible, deliberately conservative starting point for someone with no idea.
export const STARTER_GUIDE = {
  bench: {
    line: "Start with the empty barbell, 20kg, about the weight of a full airline suitcase.",
    detail: "If five reps of that feel easy and clean, add a bag of sugar to each side next session. Nobody is watching, and starting light is how you avoid three weeks off with a niggle.",
    suggested: 20,
  },
  squat: {
    line: "Start with the empty barbell, 20kg, or just your bodyweight if that feels like plenty.",
    detail: "Get to the depth you can hold with a proud chest before you add anything. Depth first, weight later.",
    suggested: 20,
  },
};
