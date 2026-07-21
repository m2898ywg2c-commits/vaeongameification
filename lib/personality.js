// Vaeon training personality model.
// Three dimensions, twelve statements, eight training personalities.
// Dimension poles: structure (+planned / -freestyle), orientation (+outcome / -experience), social (+together / -solo).

export const ANSWERS = [
  { value: 1, label: "Strongly disagree" },
  { value: 2, label: "Disagree" },
  { value: 3, label: "Neutral" },
  { value: 4, label: "Agree" },
  { value: 5, label: "Strongly agree" },
];

export const QUESTIONS = [
  { dim: "structure", reverse: false, text: "I train best when every session is planned before the week starts." },
  { dim: "structure", reverse: true, text: "A rigid training plan drains the fun out of exercise for me." },
  { dim: "structure", reverse: false, text: "Missing a scheduled session bothers me more than a hard workout does." },
  { dim: "structure", reverse: true, text: "I prefer deciding what to do when I arrive, based on how I feel." },
  { dim: "orientation", reverse: false, text: "Numbers motivate me: times, weights, streaks and personal bests." },
  { dim: "orientation", reverse: true, text: "How a session feels matters more to me than what it measures." },
  { dim: "orientation", reverse: false, text: "I need a clear target to chase or I lose interest." },
  { dim: "orientation", reverse: true, text: "I would keep training even if nothing was ever measured." },
  { dim: "social", reverse: false, text: "Training with other people lifts my energy and effort." },
  { dim: "social", reverse: true, text: "My best sessions happen when it is just me and my headphones." },
  { dim: "social", reverse: false, text: "Friendly competition makes me push noticeably harder." },
  { dim: "social", reverse: true, text: "I find group workouts more distracting than motivating." },
];

export const TYPES = {
  architect: {
    name: "The Architect",
    code: "Planned - Outcome - Solo",
    letter: "A",
    colors: ["#7C8CF8", "#3D2E8C"],
    tagline: "Precision-built progress, one block at a time.",
    plan: "You get a periodised programme with fixed sessions, progressive overload and a measurable milestone every four weeks.",
    coaching: "Direct and data-led. Your coach shows you the numbers, explains the why, and holds you to the plan you agreed.",
  },
  captain: {
    name: "The Captain",
    code: "Planned - Outcome - Together",
    letter: "C",
    colors: ["#2DD4BF", "#0F766E"],
    tagline: "Leads from the front and lifts the room.",
    plan: "You get structured training blocks built around shared goals, leaderboards and scheduled group sessions.",
    coaching: "Challenging and competitive. Your coach sets visible targets, celebrates wins loudly and uses the group to keep you honest.",
  },
  monk: {
    name: "The Monk",
    code: "Planned - Experience - Solo",
    letter: "M",
    colors: ["#4CC9F0", "#155E75"],
    tagline: "Discipline as a daily ritual.",
    plan: "You get a consistent weekly rhythm built on habit streaks, mobility and mindful progression rather than aggressive targets.",
    coaching: "Calm and reflective. Your coach protects your routine, asks how sessions felt and nudges gently when the streak slips.",
  },
  anchor: {
    name: "The Anchor",
    code: "Planned - Experience - Together",
    letter: "N",
    colors: ["#FFB020", "#8C5A00"],
    tagline: "The reliable heartbeat of every class.",
    plan: "You get recurring classes and partner sessions at fixed times, with plenty of variety inside a dependable weekly shape.",
    coaching: "Warm and encouraging. Your coach focuses on showing up, community and steady progress you can feel.",
  },
  hunter: {
    name: "The Hunter",
    code: "Freestyle - Outcome - Solo",
    letter: "H",
    colors: ["#FF8C42", "#7A2E0E"],
    tagline: "Give it a target and get out of its way.",
    plan: "You get rolling challenges instead of a fixed schedule: chase a number, tick it off, pick the next one.",
    coaching: "Sharp and minimal. Your coach sets the challenge, tracks the result and stays out of your way in between.",
  },
  gladiator: {
    name: "The Gladiator",
    code: "Freestyle - Outcome - Together",
    letter: "G",
    colors: ["#E052A0", "#6B1547"],
    tagline: "Built for game day.",
    plan: "You get varied, high-energy sessions built around events, head-to-heads and short competitive blocks.",
    coaching: "High energy and provocative. Your coach engineers friendly rivalry, books you into events and turns training into sport.",
  },
  wanderer: {
    name: "The Wanderer",
    code: "Freestyle - Experience - Solo",
    letter: "W",
    colors: ["#3DDC97", "#0E5C3F"],
    tagline: "Movement is the destination.",
    plan: "You get a flexible menu of sessions to pick from each week: outdoors, indoors, long, short. Variety is the plan.",
    coaching: "Light touch and curious. Your coach suggests new things to try and helps you notice what keeps you moving.",
  },
  spark: {
    name: "The Spark",
    code: "Freestyle - Experience - Together",
    letter: "S",
    colors: ["#FF6B57", "#8C2318"],
    tagline: "If it is fun, it gets done.",
    plan: "You get social, playful sessions: classes, meet-ups and partner workouts, rotated often so nothing goes stale.",
    coaching: "Upbeat and social. Your coach keeps it fresh, gets your friends involved and counts success in sessions you enjoyed.",
  },
};

export function scoreAnswers(values) {
  const totals = { structure: 0, orientation: 0, social: 0 };
  QUESTIONS.forEach(function (q, i) {
    const centred = (values[i] || 3) - 3;
    totals[q.dim] += q.reverse ? -centred : centred;
  });
  return {
    structure: totals.structure,
    orientation: totals.orientation,
    social: totals.social,
    typeId: pickType(totals),
  };
}

function pickType(t) {
  const planned = t.structure >= 0;
  const outcome = t.orientation >= 0;
  const together = t.social >= 0;
  if (planned && outcome && !together) return "architect";
  if (planned && outcome && together) return "captain";
  if (planned && !outcome && !together) return "monk";
  if (planned && !outcome && together) return "anchor";
  if (!planned && outcome && !together) return "hunter";
  if (!planned && outcome && together) return "gladiator";
  if (!planned && !outcome && !together) return "wanderer";
  return "spark";
}
