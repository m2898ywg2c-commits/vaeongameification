// Vaeon training content: 13 goals, exercise-level days, scaled to sessions per week.

// Finishers. One per session, roughly ten minutes each.
//
// These used to be handed out as a menu of five attached to certain days, which
// meant a four-day week with a second goal in the mix put all five on two days
// and none on the other two. buildWeek now deals one per session instead, so
// every workout ends the same way and the pool cycles across the week.
//
// Each target is written to fill about ten minutes on its own. If you shorten
// one, shorten the rest, or the sessions stop feeling like the same shape.

const HYROX_STATIONS = [
  { name: "SkiErg", target: "3 x 500m, 90 sec recovery", note: "Log your total time. This is what you chase from here." },
  { name: "Row", target: "3 x 500m, 90 sec recovery", note: "Strong legs first, then body, then arms." },
  { name: "Battle Ropes", target: "10 x 30 sec on / 30 sec off", note: "Stay low, keep the waves even." },
  { name: "Sled Push & Pull", target: "5 rounds: 20m push, 20m pull", note: "Low body angle, drive through the legs." },
  { name: "Weighted Lunge Walk", target: "5 x 100m, walk back to recover", note: "Torso upright, controlled stride." },
];

// The equivalent for every other goal, so the ten minute finisher is the shape
// of a Vaeon session rather than a HYROX quirk. Deliberately low on kit: these
// have to work in a park as well as a gym.
const FINISHERS = [
  { name: "Burpee ladder", target: "10 minutes", note: "One burpee, then two, then three. Keep climbing until the clock stops." },
  { name: "Bodyweight circuit", target: "10 minutes", note: "10 squats, 10 press-ups, 10 sit-ups. Repeat. Count your rounds." },
  { name: "Bike or row intervals", target: "10 x 30 sec hard / 30 sec easy", note: "Hard means hard. The easy 30 is not a rest, keep moving." },
  { name: "Carry and lunge", target: "5 rounds: 40m loaded carry, 20m walking lunge", note: "Anything heavy will do. Shopping bags count." },
  { name: "Stair or hill repeats", target: "10 minutes", note: "Hard on the way up, easy on the way down. Repeat." },
  { name: "Swings and press-ups", target: "10 minutes", note: "15 kettlebell swings, 10 press-ups, repeat. Bag of books works if you have no bell." },
];

// Session focuses that end without a finisher. See buildWeek for the reasoning.
const NO_FINISHER = ["Conditioning", "Threshold", "Speed", "Base", "Recovery", "Mobility", "Endurance"];

// The pool a goal draws its finishers from. HYROX carries its own because the
// stations are the event; everything else gets the general set.
function finisherPool(goal) {
  for (let i = 0; i < goal.days.length; i++) {
    const c = goal.days[i].conditioning;
    if (c && c.length) return c;
  }
  return FINISHERS;
}

function d(key, title, focus, warmup, exercises, conditioning) {
  return { key: key, title: title, focus: focus, warmup: warmup, exercises: exercises, conditioning: conditioning || [] };
}

function e(name, sets, reps, note) {
  return { name: name, sets: sets, reps: reps, note: note || "" };
}

const WU_PUSH = ["Arm circles, 20 seconds each direction", "Band pull-aparts, 15 reps", "Push-up to downward dog, 8 slow reps", "Shoulder dislocates with band, 10 reps", "Empty bar bench press, 2 sets of 10"];
const WU_LEGS = ["Leg swings, 10 each direction per leg", "Bodyweight squats, 15 reps", "Glute bridges, 15 reps", "Walking knee hugs, 10 steps each leg", "Empty bar or goblet squats, 2 sets of 8"];
const WU_PULL = ["Band pull-aparts, 20 reps", "Dead hang, 20 seconds", "Scapular pull-ups, 10 reps", "Cat-cow, 10 slow reps", "Light lat pulldown, 2 sets of 12"];
const WU_RUN = ["Brisk walk, 3 minutes", "Leg swings, 10 each side", "Ankle circles, 10 each way", "High knees, 20 steps", "Easy jog, 3 minutes"];
const WU_FULL = ["Jumping jacks, 30 seconds", "World greatest stretch, 5 each side", "Bodyweight squats, 15 reps", "Push-ups, 10 reps", "Arm circles, 20 seconds each way"];
const WU_YOGA = ["Seated breathing, 10 slow rounds", "Cat-cow, 10 slow reps", "Child's pose, 30 seconds", "Downward dog to plank, 5 slow rounds", "Gentle neck rolls, 5 each way"];
const WU_SWIM = ["Shoulder rolls, 20 reps", "Band pull-aparts, 15 reps", "Easy 200m swim", "Kick drill, 100m", "Catch-up drill, 100m"];

export const GOALS = {
  hyrox: {
    name: "HYROX / hybrid fitness",
    blurb: "Strength that holds up under a running clock.",
    category: "hybrid",
    defaultType: "Strength",
    days: [
      d("hyrox-push", "Chest & Push", "Strength", WU_PUSH, [
        e("Barbell Bench Press", 5, "5", "Set your bench baseline in Settings"),
        e("Incline Dumbbell Press", 4, "8", "Push for 2-3kg up on the last set"),
        e("Weighted Dips", 3, "10", "Add a belt if 10 is easy"),
        e("Double DB Push Press", 4, "6", "Drive from the legs"),
        e("Cable Fly", 3, "12", "Slow negative, squeeze at the top"),
        e("Hanging Leg Raise", 3, "15", "Control the swing"),
        e("Plank", 3, "45 sec", "Brace, do not let the hips sag"),
      ], HYROX_STATIONS),
      d("hyrox-legs", "Legs, Glutes & Abs", "Strength", WU_LEGS, [
        e("Back Squat", 5, "5", "Set your squat baseline in Settings"),
        e("Romanian Deadlift", 4, "8", "Hamstrings, not lower back"),
        e("Weighted Walking Lunges", 3, "12 per leg", "HYROX-relevant, controlled stride"),
        e("Weighted Sled Push", 4, "20m", "The actual HYROX load, not a warm-up"),
        e("Hip Thrust", 4, "10", "Full lockout, squeeze hard"),
        e("Leg Press", 3, "15", "Full range, do not lock out hard"),
        e("Cable Woodchop", 3, "12 per side", "Rotate through the core"),
      ], HYROX_STATIONS),
      d("hyrox-chestbi", "Chest & Biceps", "Hypertrophy", WU_PUSH, [
        e("Incline Barbell Press", 4, "10", "Two seconds down, drive up"),
        e("Dumbbell Bench Press", 4, "12", "Stretch at the bottom"),
        e("Cable Fly", 3, "15", "Chase the squeeze, not the weight"),
        e("Barbell Curl", 4, "10", "No swinging"),
        e("Hammer Curl", 3, "12", "Elbows pinned"),
        e("Preacher Curl", 3, "12", "Full stretch at the bottom"),
        e("Cable Crunch", 3, "15", "Curl the ribs to the hips"),
      ], HYROX_STATIONS),
      d("hyrox-glutes", "Thighs, Glutes & Abs", "Hypertrophy", WU_LEGS, [
        e("Bulgarian Split Squat", 4, "10 per leg", "Front knee tracks the toe"),
        e("Hip Thrust", 4, "12", "Pause one second at the top"),
        e("Leg Curl", 3, "15", "Slow on the way back"),
        e("Leg Extension", 3, "15", "Squeeze at lockout"),
        e("Cable Kickback", 3, "15 per side", "Hips square"),
        e("Ab Wheel", 3, "12", "Ribs down, no arching"),
        e("Russian Twist", 3, "20", "Rotate through the trunk"),
      ], HYROX_STATIONS),
      d("hyrox-sim", "HYROX Simulation", "Conditioning", WU_FULL, [
        e("1km Run", 1, "1km", "Race pace"),
        e("SkiErg", 1, "1000m", "Settle into rhythm"),
        e("Sled Push", 1, "50m", "Do not stop moving"),
        e("Burpee Broad Jumps", 1, "80m", "Chest to floor, jump long"),
        e("Farmers Carry", 1, "200m", "Grip is the limiter, train it"),
      ], []),
      d("hyrox-engine", "Engine Day", "Conditioning", WU_RUN, [
        e("Interval Run", 6, "800m", "Threshold pace, 90 sec recovery"),
        e("Wall Balls", 4, "25", "Hips and shoulders together"),
        e("Row", 3, "500m", "Consistent split each round"),
      ], []),
    ],
  },

  run5k: {
    name: "Run a 5K",
    blurb: "Get to 5K comfortably, then get quick at it.",
    category: "endurance",
    defaultType: "Cardio",
    days: [
      d("5k-easy", "Easy Run", "Base", WU_RUN, [
        e("Easy Run", 1, "25-30 min", "Conversational pace, you should be able to talk"),
        e("Post-run Stretch", 1, "5 min", "Calves, hamstrings, hip flexors"),
      ], []),
      d("5k-intervals", "Speed Intervals", "Speed", WU_RUN, [
        e("400m Repeats", 6, "400m", "Faster than 5K pace, 90 sec walk between"),
        e("Cool Down Jog", 1, "5 min", "Very easy"),
      ], []),
      d("5k-tempo", "Tempo Run", "Threshold", WU_RUN, [
        e("Tempo Run", 1, "20 min", "Comfortably hard, roughly 10K pace"),
        e("Cool Down Jog", 1, "5 min", "Shake it out"),
      ], []),
      d("5k-long", "Long Easy Run", "Base", WU_RUN, [
        e("Long Run", 1, "40-45 min", "Slow. Slower than you think"),
      ], []),
      d("5k-strength", "Runner Strength", "Strength", WU_LEGS, [
        e("Goblet Squat", 3, "12", "Depth over weight"),
        e("Walking Lunge", 3, "12 per leg", "Controlled"),
        e("Single Leg Calf Raise", 3, "15 per side", "Full stretch at the bottom"),
        e("Plank", 3, "45 sec", "Brace hard"),
        e("Glute Bridge", 3, "15", "Squeeze at the top"),
      ], []),
      d("5k-recovery", "Recovery & Mobility", "Mobility", WU_FULL, [
        e("Easy Walk or Jog", 1, "20 min", "Keep it genuinely easy"),
        e("Hip Flexor Stretch", 2, "45 sec per side", "Breathe into it"),
        e("Foam Roll Quads and Calves", 1, "5 min", "Slow passes"),
      ], []),
    ],
  },
  run10k: {
    name: "Run a 10K",
    blurb: "Double the distance without doubling the suffering.",
    category: "endurance",
    defaultType: "Cardio",
    days: [
      d("10k-easy", "Easy Run", "Base", WU_RUN, [
        e("Easy Run", 1, "35-40 min", "Conversational the whole way"),
      ], []),
      d("10k-intervals", "Speed Intervals", "Speed", WU_RUN, [
        e("800m Repeats", 5, "800m", "10K pace or slightly faster, 2 min recovery"),
        e("Cool Down Jog", 1, "5 min", "Easy"),
      ], []),
      d("10k-tempo", "Tempo Run", "Threshold", WU_RUN, [
        e("Tempo Run", 1, "25-30 min", "Comfortably hard, sustainable"),
      ], []),
      d("10k-long", "Long Run", "Base", WU_RUN, [
        e("Long Run", 1, "60-70 min", "Easy pace, build the engine"),
      ], []),
      d("10k-strength", "Runner Strength", "Strength", WU_LEGS, [
        e("Back Squat", 4, "8", "Build leg durability"),
        e("Romanian Deadlift", 3, "10", "Hamstrings and glutes"),
        e("Step Ups", 3, "12 per leg", "Drive through the heel"),
        e("Side Plank", 3, "30 sec per side", "Hips stacked"),
      ], []),
      d("10k-hills", "Hill Repeats", "Power", WU_RUN, [
        e("Hill Repeats", 8, "60 sec", "Hard up, walk down"),
        e("Cool Down Jog", 1, "8 min", "Flat and easy"),
      ], []),
    ],
  },

  half: {
    name: "Half marathon",
    blurb: "13.1 miles, built on patient mileage.",
    category: "endurance",
    defaultType: "Cardio",
    days: [
      d("half-long", "Long Run", "Base", WU_RUN, [
        e("Long Run", 1, "80-110 min", "Build 10 min per week, then drop back every fourth week"),
      ], []),
      d("half-easy", "Easy Run", "Base", WU_RUN, [
        e("Easy Run", 1, "40-50 min", "Genuinely easy, this is most of your training"),
      ], []),
      d("half-tempo", "Tempo Run", "Threshold", WU_RUN, [
        e("Tempo Block", 2, "15 min", "Half marathon pace, 5 min jog between"),
      ], []),
      d("half-intervals", "Intervals", "Speed", WU_RUN, [
        e("1km Repeats", 5, "1km", "10K pace, 2-3 min recovery"),
      ], []),
      d("half-strength", "Strength & Core", "Strength", WU_LEGS, [
        e("Back Squat", 4, "8", "Durability, not maximum load"),
        e("Single Leg RDL", 3, "10 per leg", "Balance and hamstring strength"),
        e("Calf Raise", 4, "15", "Full range"),
        e("Plank", 3, "60 sec", "Hold form, not the clock"),
      ], []),
      d("half-recovery", "Recovery Run", "Recovery", WU_RUN, [
        e("Recovery Jog", 1, "25 min", "Very slow, this is not a workout"),
        e("Mobility Flow", 1, "10 min", "Hips, calves, hamstrings"),
      ], []),
    ],
  },
  marathon: {
    name: "Marathon",
    blurb: "26.2 miles. Consistency beats heroics every time.",
    category: "endurance",
    defaultType: "Cardio",
    days: [
      d("mar-long", "Long Run", "Base", WU_RUN, [
        e("Long Run", 1, "100-180 min", "Build gradually, practise your race fuelling"),
      ], []),
      d("mar-easy", "Easy Run", "Base", WU_RUN, [
        e("Easy Run", 1, "45-60 min", "Eighty percent of your running lives here"),
      ], []),
      d("mar-marathonpace", "Marathon Pace Run", "Specific", WU_RUN, [
        e("Marathon Pace Block", 1, "30-50 min", "Exactly the pace you plan to race"),
      ], []),
      d("mar-tempo", "Tempo Run", "Threshold", WU_RUN, [
        e("Tempo Run", 1, "30 min", "Comfortably hard"),
      ], []),
      d("mar-strength", "Strength & Durability", "Strength", WU_LEGS, [
        e("Back Squat", 4, "6", "Keep the legs robust"),
        e("Romanian Deadlift", 3, "10", "Posterior chain"),
        e("Step Ups", 3, "12 per leg", "Single leg strength"),
        e("Dead Bug", 3, "12 per side", "Core control under fatigue"),
      ], []),
      d("mar-recovery", "Recovery Run", "Recovery", WU_RUN, [
        e("Recovery Jog", 1, "30 min", "Flush the legs, no ego"),
        e("Foam Roll", 1, "10 min", "Quads, calves, IT band"),
      ], []),
    ],
  },
  triathlon: {
    name: "Triathlon / Ironman",
    blurb: "Three sports, one clock. Train the transitions too.",
    category: "endurance",
    defaultType: "Cardio",
    days: [
      d("tri-swim", "Swim", "Technique", WU_SWIM, [
        e("Main Set", 8, "100m", "Steady, 20 sec rest, focus on catch"),
        e("Pull Buoy Set", 4, "100m", "Upper body only, feel the pull"),
        e("Cool Down", 1, "200m", "Easy"),
      ], []),
      d("tri-bike", "Bike", "Endurance", WU_FULL, [
        e("Endurance Ride", 1, "60-120 min", "Steady effort, hold your cadence"),
        e("Cadence Drills", 4, "3 min", "High cadence, low resistance"),
      ], []),
      d("tri-run", "Run", "Endurance", WU_RUN, [
        e("Steady Run", 1, "40-60 min", "Controlled effort"),
      ], []),
      d("tri-brick", "Brick Session", "Specific", WU_FULL, [
        e("Bike", 1, "45 min", "Race effort"),
        e("Run Straight Off", 1, "20 min", "Legs feel odd, that is the point"),
      ], []),
      d("tri-strength", "Strength", "Strength", WU_FULL, [
        e("Back Squat", 4, "8", "Leg durability"),
        e("Pull Ups", 3, "8", "Swim-specific pulling strength"),
        e("Plank", 3, "60 sec", "Core holds everything together"),
        e("Single Leg RDL", 3, "10 per leg", "Balance"),
      ], []),
      d("tri-recovery", "Recovery", "Recovery", WU_SWIM, [
        e("Easy Swim", 1, "800m", "Technique focus, no clock"),
        e("Mobility Flow", 1, "15 min", "Shoulders, hips, ankles"),
      ], []),
    ],
  },

  loseweight: {
    name: "Lose weight",
    blurb: "Move more, keep your muscle, stay sane about it.",
    category: "physique",
    defaultType: "Strength",
    days: [
      d("lw-full-a", "Full Body A", "Strength", WU_FULL, [
        e("Goblet Squat", 4, "12", "Steady tempo"),
        e("Dumbbell Bench Press", 3, "12", "Control the negative"),
        e("Seated Row", 3, "12", "Squeeze the shoulder blades"),
        e("Romanian Deadlift", 3, "12", "Hinge, do not squat it"),
        e("Plank", 3, "45 sec", "Brace"),
      ], []),
      d("lw-cardio-a", "Steady Cardio", "Cardio", WU_RUN, [
        e("Brisk Walk or Incline Treadmill", 1, "40 min", "Conversation pace, this is the fat-loss workhorse"),
      ], []),
      d("lw-full-b", "Full Body B", "Strength", WU_FULL, [
        e("Leg Press", 4, "15", "Full range"),
        e("Lat Pulldown", 3, "12", "Chest up"),
        e("Shoulder Press", 3, "12", "No arching"),
        e("Hip Thrust", 3, "15", "Squeeze at the top"),
        e("Cable Crunch", 3, "15", "Slow"),
      ], []),
      d("lw-intervals", "Interval Cardio", "Cardio", WU_FULL, [
        e("Bike or Row Intervals", 8, "1 min hard / 1 min easy", "Hard means hard"),
        e("Cool Down", 1, "5 min", "Easy spin"),
      ], []),
      d("lw-full-c", "Full Body C", "Strength", WU_FULL, [
        e("Walking Lunge", 3, "12 per leg", "Controlled"),
        e("Incline Dumbbell Press", 3, "12", "Full stretch"),
        e("Cable Row", 3, "12", "Pull to the belly"),
        e("Face Pull", 3, "15", "Posture work"),
        e("Dead Bug", 3, "12 per side", "Ribs down"),
      ], []),
      d("lw-steps", "Movement Day", "Recovery", WU_FULL, [
        e("Long Walk", 1, "45-60 min", "Outdoors if you can, this counts"),
        e("Full Body Stretch", 1, "10 min", "Wind down"),
      ], []),
    ],
  },
  cut: {
    name: "Cut, get lean",
    blurb: "Hold the muscle you built, lose what is covering it.",
    category: "physique",
    defaultType: "Strength",
    days: [
      d("cut-push", "Push", "Strength", WU_PUSH, [
        e("Barbell Bench Press", 4, "6", "Keep the weight heavy to keep the muscle"),
        e("Incline Dumbbell Press", 3, "10", "Stretch and drive"),
        e("Overhead Press", 3, "8", "Strict"),
        e("Cable Fly", 3, "15", "Squeeze"),
        e("Tricep Rope Pushdown", 3, "15", "Elbows pinned"),
      ], []),
      d("cut-pull", "Pull", "Strength", WU_PULL, [
        e("Weighted Pull Ups", 4, "6", "Add weight if you can"),
        e("Barbell Row", 4, "8", "Flat back"),
        e("Lat Pulldown", 3, "12", "Full stretch at the top"),
        e("Face Pull", 3, "15", "Rear delts"),
        e("Barbell Curl", 3, "12", "Strict"),
      ], []),
      d("cut-legs", "Legs", "Strength", WU_LEGS, [
        e("Back Squat", 4, "6", "Heavy holds muscle in a deficit"),
        e("Romanian Deadlift", 3, "10", "Hamstrings"),
        e("Leg Press", 3, "12", "Controlled"),
        e("Leg Curl", 3, "15", "Slow negative"),
        e("Calf Raise", 4, "15", "Pause at the top"),
      ], []),
      d("cut-cardio", "Conditioning", "Cardio", WU_FULL, [
        e("Incline Walk", 1, "30 min", "Low impact, protects recovery"),
        e("Rowing Intervals", 6, "500m", "90 sec rest, consistent split"),
      ], []),
      d("cut-upper", "Upper Body Volume", "Hypertrophy", WU_PUSH, [
        e("Dumbbell Bench Press", 4, "12", "Full range"),
        e("Chest Supported Row", 4, "12", "No momentum"),
        e("Lateral Raise", 4, "15", "Light, strict"),
        e("Hammer Curl", 3, "12", "Elbows still"),
        e("Overhead Tricep Extension", 3, "12", "Deep stretch"),
      ], []),
      d("cut-steps", "Active Recovery", "Recovery", WU_FULL, [
        e("Walk", 1, "45 min", "Steps matter more than you think on a cut"),
        e("Mobility Flow", 1, "10 min", "Hips and shoulders"),
      ], []),
    ],
  },

  bulk: {
    name: "Bulk, add size",
    blurb: "Progressive overload and enough food to back it up.",
    category: "physique",
    defaultType: "Strength",
    days: [
      d("bulk-push", "Push", "Hypertrophy", WU_PUSH, [
        e("Barbell Bench Press", 4, "8", "Add 2.5kg when you hit all reps"),
        e("Incline Dumbbell Press", 4, "10", "Full stretch at the bottom"),
        e("Overhead Press", 4, "8", "Strict, no leg drive"),
        e("Lateral Raise", 4, "15", "Light and clean"),
        e("Tricep Dips", 3, "12", "Deep"),
        e("Overhead Tricep Extension", 3, "12", "Stretch"),
      ], []),
      d("bulk-pull", "Pull", "Hypertrophy", WU_PULL, [
        e("Barbell Row", 4, "8", "Flat back, pull to the belly"),
        e("Pull Ups", 4, "8", "Add weight when easy"),
        e("Lat Pulldown", 3, "12", "Full stretch"),
        e("Cable Row", 3, "12", "Squeeze"),
        e("Barbell Curl", 4, "10", "Strict"),
        e("Hammer Curl", 3, "12", "Elbows pinned"),
      ], []),
      d("bulk-legs", "Legs", "Hypertrophy", WU_LEGS, [
        e("Back Squat", 4, "8", "Depth first, then load"),
        e("Romanian Deadlift", 4, "10", "Hamstring stretch"),
        e("Leg Press", 4, "12", "Full range"),
        e("Leg Curl", 3, "15", "Slow"),
        e("Leg Extension", 3, "15", "Squeeze"),
        e("Calf Raise", 4, "15", "Pause"),
      ], []),
      d("bulk-upper", "Upper Volume", "Hypertrophy", WU_PUSH, [
        e("Incline Barbell Press", 4, "10", "Chest focus"),
        e("Chest Supported Row", 4, "12", "No swinging"),
        e("Dumbbell Shoulder Press", 3, "12", "Control"),
        e("Cable Fly", 3, "15", "Stretch and squeeze"),
        e("Preacher Curl", 3, "12", "Full range"),
      ], []),
      d("bulk-lower", "Lower Volume", "Hypertrophy", WU_LEGS, [
        e("Front Squat", 4, "8", "Elbows high"),
        e("Hip Thrust", 4, "12", "Squeeze hard"),
        e("Bulgarian Split Squat", 3, "10 per leg", "Slow and controlled"),
        e("Leg Curl", 3, "15", "Hamstrings"),
        e("Ab Wheel", 3, "12", "Core"),
      ], []),
      d("bulk-arms", "Arms & Shoulders", "Hypertrophy", WU_PUSH, [
        e("Barbell Curl", 4, "10", "Strict"),
        e("Skull Crushers", 4, "12", "Elbows still"),
        e("Lateral Raise", 4, "15", "Light"),
        e("Rear Delt Fly", 3, "15", "Squeeze"),
        e("Cable Curl", 3, "15", "Constant tension"),
        e("Rope Pushdown", 3, "15", "Full lockout"),
      ], []),
    ],
  },
  glutes: {
    name: "Lean & toned, glute-focused",
    blurb: "Glute-led lower body work with enough upper body to balance it.",
    category: "physique",
    defaultType: "Strength",
    days: [
      d("gl-glute-a", "Glutes & Hamstrings", "Strength", WU_LEGS, [
        e("Hip Thrust", 4, "10", "The main event, load it properly"),
        e("Romanian Deadlift", 4, "10", "Hamstring stretch"),
        e("Bulgarian Split Squat", 3, "12 per leg", "Lean forward slightly for glutes"),
        e("Cable Kickback", 3, "15 per side", "Squeeze at the top"),
        e("Glute Bridge Hold", 3, "45 sec", "Burn is the point"),
      ], []),
      d("gl-upper", "Upper Body Tone", "Hypertrophy", WU_PUSH, [
        e("Dumbbell Shoulder Press", 3, "12", "Control"),
        e("Lat Pulldown", 3, "12", "Chest up"),
        e("Cable Row", 3, "12", "Squeeze"),
        e("Lateral Raise", 3, "15", "Light"),
        e("Tricep Rope Pushdown", 3, "15", "Elbows pinned"),
      ], []),
      d("gl-glute-b", "Glutes & Quads", "Strength", WU_LEGS, [
        e("Back Squat", 4, "10", "Full depth for glute involvement"),
        e("Walking Lunge", 3, "14 per leg", "Long stride hits the glutes"),
        e("Leg Press, feet high", 3, "15", "High foot position, glute bias"),
        e("Abductor Machine", 4, "20", "Lean forward slightly"),
        e("Step Ups", 3, "12 per leg", "Drive through the heel"),
      ], []),
      d("gl-core", "Core & Conditioning", "Conditioning", WU_FULL, [
        e("Incline Walk", 1, "25 min", "Glutes work harder on an incline"),
        e("Hanging Leg Raise", 3, "12", "Control"),
        e("Russian Twist", 3, "20", "Rotate"),
        e("Plank", 3, "45 sec", "Brace"),
      ], []),
      d("gl-glute-c", "Glute Pump", "Hypertrophy", WU_LEGS, [
        e("Hip Thrust", 4, "15", "Higher reps, constant tension"),
        e("Cable Pull Through", 3, "15", "Hinge and squeeze"),
        e("Frog Pump", 3, "20", "Heels together"),
        e("Abductor Machine", 4, "20", "Burn out"),
        e("Glute Bridge", 3, "20", "Finish it off"),
      ], []),
      d("gl-recovery", "Recovery & Mobility", "Mobility", WU_FULL, [
        e("Walk", 1, "40 min", "Easy"),
        e("Hip Flexor Stretch", 2, "45 sec per side", "Opens the hips for better glute work"),
        e("Pigeon Pose", 2, "45 sec per side", "Breathe"),
      ], []),
    ],
  },

  strength: {
    name: "General strength",
    blurb: "Get properly strong on the lifts that matter.",
    category: "strength",
    defaultType: "Strength",
    days: [
      d("st-squat", "Squat Focus", "Strength", WU_LEGS, [
        e("Back Squat", 5, "5", "Add 2.5kg a week while it moves well"),
        e("Front Squat", 3, "8", "Elbows high"),
        e("Romanian Deadlift", 3, "8", "Posterior chain"),
        e("Leg Press", 3, "12", "Accessory volume"),
        e("Plank", 3, "60 sec", "Brace"),
      ], []),
      d("st-bench", "Bench Focus", "Strength", WU_PUSH, [
        e("Barbell Bench Press", 5, "5", "Set your baseline in Settings"),
        e("Overhead Press", 4, "6", "Strict"),
        e("Weighted Dips", 3, "8", "Add a belt"),
        e("Barbell Row", 4, "8", "Balance the pressing"),
        e("Tricep Pushdown", 3, "12", "Lockout strength"),
      ], []),
      d("st-deadlift", "Deadlift Focus", "Strength", WU_PULL, [
        e("Deadlift", 5, "3", "Heavy triples, reset each rep"),
        e("Barbell Row", 4, "8", "Flat back"),
        e("Pull Ups", 4, "8", "Weighted if possible"),
        e("Back Extension", 3, "12", "Squeeze the glutes"),
        e("Farmers Carry", 3, "40m", "Grip and trunk"),
      ], []),
      d("st-press", "Overhead Focus", "Strength", WU_PUSH, [
        e("Overhead Press", 5, "5", "Strict, no leg drive"),
        e("Incline Bench Press", 4, "8", "Upper chest"),
        e("Lateral Raise", 3, "15", "Shoulder health"),
        e("Face Pull", 3, "15", "Rear delts and posture"),
        e("Chin Ups", 3, "8", "Full range"),
      ], []),
      d("st-accessory", "Accessory & Core", "Hypertrophy", WU_FULL, [
        e("Bulgarian Split Squat", 3, "10 per leg", "Single leg strength"),
        e("Dumbbell Bench Press", 3, "12", "Volume"),
        e("Cable Row", 3, "12", "Squeeze"),
        e("Ab Wheel", 3, "12", "Core"),
        e("Calf Raise", 4, "15", "Often neglected"),
      ], []),
      d("st-conditioning", "Conditioning", "Conditioning", WU_FULL, [
        e("Sled Push", 6, "20m", "Strongman conditioning"),
        e("Farmers Carry", 4, "40m", "Heavy"),
        e("Row", 3, "500m", "Steady"),
      ], []),
    ],
  },
  calisthenics: {
    name: "Calisthenics",
    blurb: "Master your own bodyweight, then make it harder.",
    category: "strength",
    defaultType: "Strength",
    days: [
      d("cal-push", "Push Skills", "Strength", WU_PUSH, [
        e("Push Ups", 4, "15", "Progress to archer or decline when easy"),
        e("Dips", 4, "10", "Full depth"),
        e("Pike Push Ups", 3, "10", "Working towards handstand press"),
        e("Diamond Push Ups", 3, "12", "Triceps"),
        e("Plank to Push Up", 3, "10 per side", "Control"),
      ], []),
      d("cal-pull", "Pull Skills", "Strength", WU_PULL, [
        e("Pull Ups", 4, "8", "Full hang each rep"),
        e("Chin Ups", 3, "10", "Biceps bias"),
        e("Australian Rows", 3, "12", "Horizontal pulling"),
        e("Scapular Pull Ups", 3, "10", "Builds the foundation"),
        e("Dead Hang", 3, "30 sec", "Grip and shoulder health"),
      ], []),
      d("cal-legs", "Legs & Core", "Strength", WU_LEGS, [
        e("Pistol Squat Progression", 4, "6 per leg", "Use a box if needed"),
        e("Bulgarian Split Squat", 3, "12 per leg", "Bodyweight or hold weight"),
        e("Nordic Curl Negatives", 3, "6", "Slow as you can"),
        e("Hanging Leg Raise", 3, "12", "No swing"),
        e("L-Sit Hold", 3, "20 sec", "Accumulate time"),
      ], []),
      d("cal-skill", "Skill Work", "Skill", WU_FULL, [
        e("Handstand Practice", 5, "60 sec", "Wall supported is fine"),
        e("Tuck Front Lever Hold", 4, "15 sec", "Progress slowly"),
        e("Muscle Up Progression", 4, "5", "Explosive pull"),
        e("Hollow Body Hold", 3, "30 sec", "Foundation for everything"),
      ], []),
      d("cal-full", "Full Body Circuit", "Conditioning", WU_FULL, [
        e("Burpees", 4, "15", "Chest to floor"),
        e("Jump Squats", 4, "15", "Land soft"),
        e("Push Ups", 4, "20", "Pace yourself"),
        e("Mountain Climbers", 4, "40", "Fast"),
        e("Plank", 3, "60 sec", "Finish strong"),
      ], []),
      d("cal-mobility", "Mobility & Recovery", "Mobility", WU_FULL, [
        e("Shoulder Dislocates", 3, "12", "Band or broomstick"),
        e("Deep Squat Hold", 3, "60 sec", "Ankle and hip mobility"),
        e("Jefferson Curl", 3, "8", "Light, spinal control"),
        e("Wrist Prep", 3, "10 each way", "Essential for handstands"),
      ], []),
    ],
  },
  yoga: {
    name: "Yoga",
    blurb: "Strength, balance and mobility from the mat. No kit beyond a floor.",
    category: "yoga",
    defaultType: "Mobility",
    days: [
      // Every focus here is Mobility or Recovery on purpose. Those sit in NO_FINISHER, so a
      // yoga session never gets a burpee ladder bolted onto the end of it, which would
      // undo the thing the session was for.
      d("yoga-found", "Foundations", "Mobility", WU_YOGA, [
        e("Downward Dog", 3, "45 sec", "Heels reaching down, spine long. Bend the knees if the hamstrings complain"),
        e("Warrior II", 3, "30 sec per side", "Front knee over ankle, shoulders stacked"),
        e("Chair Pose", 3, "30 sec", "Weight in the heels, ribs down"),
        e("Plank Hold", 3, "40 sec", "One line from heel to head"),
        e("Child's Pose", 2, "60 sec", "Breathe into the back of the ribs"),
      ], []),
      d("yoga-balance", "Balance and legs", "Mobility", WU_YOGA, [
        e("Tree Pose", 3, "30 sec per side", "Foot above or below the knee, never on it"),
        e("Warrior III", 3, "20 sec per side", "Hips level, reach through the back heel"),
        e("Chair Pose", 3, "40 sec", "Sit lower as the weeks go on"),
        e("Low Lunge", 3, "45 sec per side", "Back knee down, hips sinking forward"),
        e("Legs Up The Wall", 1, "120 sec", "The easiest useful thing you will do all week"),
      ], []),
      d("yoga-hips", "Hips and hamstrings", "Mobility", WU_YOGA, [
        e("Pigeon Pose", 2, "60 sec per side", "Prop the hip on a cushion if it does not reach the floor"),
        e("Seated Forward Fold", 3, "45 sec", "Lead with the chest, not the head"),
        e("Lizard Pose", 2, "45 sec per side", "Forearms down only if the hips allow"),
        e("Butterfly", 3, "45 sec", "Let gravity do it, do not push the knees"),
        e("Supine Twist", 2, "60 sec per side", "Both shoulders stay down"),
      ], []),
      d("yoga-back", "Backbends and shoulders", "Mobility", WU_YOGA, [
        e("Bridge Pose", 3, "40 sec", "Press through the feet, squeeze the glutes"),
        e("Cobra", 3, "30 sec", "Elbows soft, no crunching in the low back"),
        e("Puppy Pose", 3, "45 sec", "Hips over knees, chest melting down"),
        e("Thread The Needle", 2, "45 sec per side", "Rotate from the mid back"),
        e("Supported Fish", 1, "90 sec", "Rolled towel under the shoulder blades"),
      ], []),
      d("yoga-core", "Core and arm balance", "Skill", WU_YOGA, [
        e("Boat Pose", 3, "30 sec", "Chest up first, knees bent is a proper option"),
        e("Side Plank", 3, "30 sec per side", "Bottom knee down if the hips drop"),
        e("Crow Pose", 3, "15 sec", "Cushion in front of you. Everybody falls forward at first"),
        e("Dolphin Hold", 3, "30 sec", "Forearms parallel, shoulders over elbows"),
        e("Hollow Hold", 3, "30 sec", "Low back pressed into the floor"),
      ], []),
      d("yoga-restore", "Restore", "Recovery", WU_YOGA, [
        e("Child's Pose", 2, "90 sec", "Knees wide, forehead down"),
        e("Reclined Butterfly", 1, "120 sec", "Cushions under the knees, nothing to achieve"),
        e("Seated Side Bend", 2, "45 sec per side", "Lengthen rather than lean"),
        e("Supine Twist", 2, "90 sec per side", "Slow the breath down"),
        e("Savasana", 1, "300 sec", "Yes, this counts. It is the point"),
      ], []),
    ],
  },

  general: {
    name: "General fitness",
    blurb: "Fit, healthy and capable. No competition required.",
    category: "general",
    defaultType: "Other",
    days: [
      d("gen-full-a", "Full Body A", "Strength", WU_FULL, [
        e("Goblet Squat", 3, "12", "Steady"),
        e("Push Ups", 3, "12", "Knees down if needed"),
        e("Seated Row", 3, "12", "Squeeze"),
        e("Romanian Deadlift", 3, "12", "Hinge"),
        e("Plank", 3, "40 sec", "Brace"),
      ], []),
      d("gen-cardio", "Cardio", "Cardio", WU_RUN, [
        e("Choose Your Cardio", 1, "30 min", "Run, bike, row or swim, whatever you will actually do"),
      ], []),
      d("gen-full-b", "Full Body B", "Strength", WU_FULL, [
        e("Leg Press", 3, "15", "Full range"),
        e("Lat Pulldown", 3, "12", "Chest up"),
        e("Dumbbell Shoulder Press", 3, "12", "Control"),
        e("Hip Thrust", 3, "15", "Squeeze"),
        e("Dead Bug", 3, "12 per side", "Ribs down"),
      ], []),
      d("gen-class", "Class or Sport", "Conditioning", WU_FULL, [
        e("Class or Sport of Choice", 1, "45-60 min", "Enjoyment counts as training"),
      ], []),
      d("gen-full-c", "Full Body C", "Strength", WU_FULL, [
        e("Walking Lunge", 3, "12 per leg", "Controlled"),
        e("Incline Dumbbell Press", 3, "12", "Full stretch"),
        e("Cable Row", 3, "12", "Pull to belly"),
        e("Face Pull", 3, "15", "Posture"),
        e("Side Plank", 3, "30 sec per side", "Hips stacked"),
      ], []),
      d("gen-mobility", "Walk & Mobility", "Recovery", WU_FULL, [
        e("Walk", 1, "40 min", "Outdoors ideally"),
        e("Full Body Stretch", 1, "15 min", "Everything that feels tight"),
      ], []),
    ],
  },
};

export const GOAL_ORDER = [
  "hyrox", "run5k", "run10k", "half", "marathon", "triathlon",
  "loseweight", "cut", "bulk", "glutes", "strength", "calisthenics", "yoga", "general",
];

export const GOAL_LIST = GOAL_ORDER.map(function (id) {
  return { id: id, name: GOALS[id].name, blurb: GOALS[id].blurb, category: GOALS[id].category };
});

export const SESSION_CHOICES = [2, 3, 4, 5, 6];

export const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// Which weekdays to use for a given number of sessions, spread sensibly.
const SPREAD = {
  2: [1, 4],
  3: [1, 3, 5],
  4: [1, 2, 3, 4],
  5: [0, 1, 2, 4, 5],
  6: [0, 1, 2, 3, 4, 5],
};

export function buildWeek(goalIds, sessionsPerWeek) {
  const ids = (goalIds && goalIds.length ? goalIds : ["general"]).filter(function (g) {
    return GOALS[g];
  });
  const n = Math.max(2, Math.min(6, sessionsPerWeek || 3));
  const primary = GOALS[ids[0]] || GOALS.general;
  const secondary = ids.length > 1 ? GOALS[ids[1]] : null;

  let picked = [];
  if (!secondary) {
    picked = primary.days.slice(0, n);
  } else {
    // Alternate: primary gets the larger share, secondary weaves in.
    const primaryCount = Math.ceil(n / 2) + (n % 2 === 0 ? 0 : 0);
    const secondaryCount = n - primaryCount;
    const p = primary.days.slice(0, primaryCount);
    const s = secondary.days.slice(0, secondaryCount);
    for (let i = 0; i < n; i++) {
      if (i % 2 === 0 && p.length) picked.push(p.shift());
      else if (s.length) picked.push(s.shift());
      else if (p.length) picked.push(p.shift());
    }
  }

  const slots = SPREAD[n] || SPREAD[3];

  // Deal one finisher per session, cycling through the pool, so a four day week
  // gets four different ones rather than the whole menu twice.
  //
  // Some days do not get one. Conditioning, threshold and speed sessions are
  // already the hard part and ten more minutes on the end is how people get
  // hurt. Easy and recovery days are skipped for the opposite reason: the whole
  // point of an easy run is that it stays easy, and a burpee ladder after one
  // quietly turns a polarised plan into permanent moderate slog. Mobility days
  // are rest in disguise.
  const pool = finisherPool(primary);
  let dealt = 0;

  return picked.map(function (day, i) {
    const skip = NO_FINISHER.indexOf(day.focus) !== -1;
    const finisher = skip ? [] : [pool[dealt++ % pool.length]];
    return Object.assign({}, day, {
      dayLabel: DAY_LABELS[slots[i]],
      conditioning: finisher,
    });
  });
}

export function goalNames(goalIds) {
  return (goalIds || [])
    .map(function (g) {
      return GOALS[g] ? GOALS[g].name : null;
    })
    .filter(Boolean);
}

export function primaryCategory(goalIds) {
  const first = (goalIds || [])[0];
  return GOALS[first] ? GOALS[first].category : "general";
}

export function defaultSessionType(goalIds, dayKey) {
  const ids = goalIds || [];
  for (let i = 0; i < ids.length; i++) {
    const g = GOALS[ids[i]];
    if (!g) continue;
    const match = g.days.find(function (day) {
      return day.key === dayKey;
    });
    if (match) {
      if (match.focus === "Cardio" || match.focus === "Base" || match.focus === "Speed") return "Cardio";
      if (match.focus === "Mobility" || match.focus === "Recovery") return "Mobility";
      if (match.focus === "Conditioning") return "Class";
      return "Strength";
    }
  }
  return "Other";
}

// Adherence scoring: percentage of pledged sessions, with a small commitment multiplier.
export function adherenceScore(done, pledged) {
  const p = Math.max(2, pledged || 3);
  const pct = Math.min(1, (done || 0) / p);
  return Math.round(pct * 100 * (1 + (p - 2) * 0.05) * 10) / 10;
}

