// THE COACH LINK: WHAT THE CHARACTER SAYS WHEN YOU TALK TO IT.
//
// Two brains, and the cheap one is not a placeholder.
//
// 1. This file. Instant, free, offline, and always right about the plan because it only
//    repeats what the plan already says. Every chip goes through here, and so does anything
//    typed or spoken when no language model is configured or the model is unreachable.
// 2. The coach-talk Edge Function (supabase/functions/coach-talk). A language model speaking
//    in the type's voice, fed the same context object this file reads. Only used for free
//    speech, and only when ANTHROPIC_API_KEY is set on the Supabase project.
//
// THE RULE BOTH OBEY: THE COACH READS NUMBERS, IT NEVER MAKES THEM.
//
// The progression engine decides every load and rep. The coach can repeat a prescription it
// has been handed, and it can tell you what you did last time, but it never proposes a weight
// of its own. A confident wrong number spoken into somebody's ear under a barbell is the worst
// failure this feature could have.
//
// Pure functions, no React, so test/coachtalk.mjs runs this in Node.

import { quoteFor, sessionDone } from "./voice.js";

// How each character answers before it gets to the point. One beat, in register.
const ACK = {
  architect: "Noted.",
  captain: "Right.",
  monk: "Of course.",
  anchor: "No problem.",
  hunter: "Copy.",
  gladiator: "Come on then!",
  wanderer: "Sure thing.",
  spark: "Ooh, yes!",
};

// Spoken voice settings for the browser's own speech engine. Not a cloned voice, just pace
// and pitch, which is enough for the Monk to sound unhurried and the Spark to sound bright.
export const VOICE = {
  architect: { rate: 1.0, pitch: 0.95 },
  captain: { rate: 1.06, pitch: 0.9 },
  monk: { rate: 0.86, pitch: 0.92 },
  anchor: { rate: 0.95, pitch: 1.05 },
  hunter: { rate: 1.08, pitch: 0.85 },
  gladiator: { rate: 1.12, pitch: 0.82 },
  wanderer: { rate: 0.93, pitch: 1.08 },
  spark: { rate: 1.1, pitch: 1.25 },
};

export function voiceFor(typeId) {
  return VOICE[typeId] || VOICE.architect;
}

function ack(typeId) {
  return ACK[typeId] || ACK.architect;
}

// What the character says when the link opens. One line, so it can be spoken in a breath.
const GREET = {
  architect: { dashboard: "Coach link open. Ask me anything about the plan.", session: "Mid-session. Ask, and keep it brief." },
  captain: { dashboard: "Right, I am here. What do you need?", session: "Talk to me. Then back to work." },
  monk: { dashboard: "I am listening. Take your time.", session: "Breathe. Ask whenever you are ready." },
  anchor: { dashboard: "Hello again. What can I help with?", session: "I am right here. What do you need?" },
  hunter: { dashboard: "Listening.", session: "Go." },
  gladiator: { dashboard: "There you are! What are we doing?", session: "Talk fast, we are mid-fight!" },
  wanderer: { dashboard: "Hey. What is on your mind?", session: "Hey, how is it going? Ask away." },
  spark: { dashboard: "Hiya! What are we up to?", session: "Ooh, mid-session chat! Go on." },
};

export function greetingFor(typeId, mode) {
  const g = GREET[typeId] || GREET.architect;
  return mode === "session" ? g.session : g.dashboard;
}

// Intents the local brain owns even when a model is available. They either route somewhere,
// read a number off the plan, or concern safety, and in all three a deterministic answer is
// better than a generated one. Anything else, chat and encouragement, goes to the model.
export const LOCAL_FIRST = ["hurt", "nogym", "swap", "quick", "rest", "last", "next", "progress", "today"];

// The chips. Phrased as things a person would say, because that is what they stand in for.
export const CHIPS = {
  dashboard: [
    { id: "today", label: "What's today?" },
    { id: "nogym", label: "No gym today" },
    { id: "quick", label: "Something quick" },
    { id: "progress", label: "How am I doing?" },
  ],
  session: [
    { id: "next", label: "What's next?" },
    { id: "last", label: "What did I do last time?" },
    { id: "swap", label: "Swap this one" },
    { id: "hurt", label: "Something hurts" },
  ],
};

// Free text to an intent. Ordered: safety first, so "my knee hurts, what's next" is answered
// as a pain question and not a navigation one.
const PATTERNS = [
  ["hurt", /\b(hurt|hurts|pain|painful|injur|sore|twinge|tweak|pulled|ache|dizzy|chest)/i],
  ["nogym", /(no gym|can'?t get|cannot get|at home|hotel|travell?ing|away this week)/i],
  ["swap", /(swap|not for me|hate (this|it)|replace|skip (this|it)|change (this|it))/i],
  ["last", /(last time|last week|what did i|previous)/i],
  ["next", /(what'?s next|next one|what now|what'?s left|how many left|next exercise)/i],
  ["quick", /(quick|short|no time|engine|conditioning|fifteen|15 min)/i],
  ["rest", /(\brest\b|how long|timer|break)/i],
  ["progress", /(how am i|progress|doing|streak|on track|this week)/i],
  ["motivate", /(tired|can'?t be bothered|motivat|lazy|knackered|don'?t want|struggling|\bflat\b|\bmeh\b|low energy|not feeling it)/i],
  // Narrow on purpose. "I feel flat today" is a feeling, not a request for the plan, so a bare
  // "today" is not enough to claim it.
  ["today", /(what'?s today|today'?s (workout|session|plan)|what am i doing|what'?s the plan|what'?s on)/i],
];

export function intentOf(text) {
  const t = String(text || "");
  for (let i = 0; i < PATTERNS.length; i += 1) {
    if (PATTERNS[i][1].test(t)) return PATTERNS[i][0];
  }
  return null;
}

function nextExercise(ctx) {
  const list = (ctx && ctx.exercises) || [];
  for (let i = 0; i < list.length; i += 1) {
    if (!list[i].done) return list[i];
  }
  return null;
}

// Sets only. The reps and load for each set are on the card, worked out by the progression
// engine for this week; repeating an authored rep count here could contradict it.
function setsText(ex) {
  if (!ex || !ex.sets) return "";
  return ex.sets + (Number(ex.sets) === 1 ? " set" : " sets") + ", numbers on the card";
}

// The local reply. Returns { text, route?, routeLabel? }. route is a URL the sheet offers as
// a button rather than jumping to, so nobody is yanked off a screen mid-set.
export function localReply(typeId, intent, ctx) {
  const c = ctx || {};
  const a = ack(typeId);
  const inSession = c.mode === "session";

  if (intent === "hurt") {
    return {
      text: "Stop that exercise now. Sharp pain, or pain that changes how you move, is a reason to finish for today and talk to someone qualified. I can count sessions, I cannot examine you.",
      safety: true,
    };
  }

  if (intent === "nogym") {
    if (c.gymReady) return { text: a + " Your coach sets your training, so take this one to them. A session you log anywhere still counts." };
    return { text: a + " There is a no-gym version of your plan. Desk, hotel room or park, and it counts the same.", route: "/fallback", routeLabel: "Train without a gym" };
  }

  if (intent === "swap") {
    if (inSession) {
      return { text: a + " Open Details on the exercise card and tap Not for me. It comes out of your plan from then on." };
    }
    return { text: a + " Open today's workout, then Details on the exercise you want gone, and tap Not for me.", route: "/plan", routeLabel: "Open today's workout" };
  }

  if (intent === "last") {
    const ex = nextExercise(c);
    if (ex && ex.last) return { text: a + " Last time on " + ex.name + " you did " + ex.last + ". That is the number to beat." };
    if (ex) return { text: "Nothing logged on " + ex.name + " yet. Today sets the mark." };
    return { text: a + " Each set shows last time underneath it, so the number to beat is right there." };
  }

  if (intent === "next") {
    if (!inSession) return { text: a + " Today's workout is ready.", route: "/plan", routeLabel: "Start today's workout" };
    const ex = nextExercise(c);
    if (!ex) return { text: sessionDone(typeId) };
    const left = (c.exercises || []).filter(function (e) { return !e.done; }).length;
    return {
      text: a + " " + ex.name + (setsText(ex) ? ", " + setsText(ex) : "") + ". " +
        (left > 1 ? left + " exercises left including this one." : "Last one. Finish it properly."),
    };
  }

  if (intent === "quick") {
    return { text: a + " The Engine Room has one short conditioning session waiting. It does not count against your week, so there is nothing to lose.", route: "/engine", routeLabel: "Open the Engine Room" };
  }

  if (intent === "rest") {
    return { text: "The rest timer is pinned at the bottom of the session screen. Tap it between sets and it turns your colour for the last ten seconds." };
  }

  if (intent === "progress") {
    const done = c.thisWeek || 0;
    const pledged = c.pledged || 3;
    const streak = c.streak || 0;
    const head = done >= pledged ? "Pledge met this week, " + done + " of " + pledged + "." : done + " of " + pledged + " sessions done this week.";
    const tail = streak > 0 ? " Streak of " + streak + (streak === 1 ? " week." : " weeks.") : "";
    return { text: a + " " + head + tail, route: "/progress", routeLabel: "See your progress" };
  }

  if (intent === "motivate") {
    return { text: quoteFor(typeId, 3, Math.floor(Date.now() / 60000)) + " Ten minutes. If it is still awful after ten, you can stop." };
  }

  if (intent === "today" && inSession) return localReply(typeId, "next", c);

  if (intent === "today") {
    if (c.finished) return { text: a + " Your block is finished and the report is ready.", route: "/blockend", routeLabel: "Read your block report" };
    const week = c.weekNo ? "Week " + c.weekNo + " of " + (c.blockWeeks || 6) + (c.ruleLabel ? ", " + String(c.ruleLabel).toLowerCase() + " week" : "") + ". " : "";
    const focus = c.ruleFocus ? c.ruleFocus + " " : "";
    return { text: (a + " " + week + focus).trim() || a + " Today's workout is ready.", route: "/plan", routeLabel: "Start today's workout" };
  }

  return {
    text: a + " I can tell you what's next, what you did last time, how your week is going, or find you a session without a gym. Ask me any of those.",
  };
}

// Trim the context to what a model needs. Keeps the request small and keeps anything that is
// not training data out of a third party's hands.
export function contextForModel(ctx) {
  const c = ctx || {};
  return {
    mode: c.mode || "dashboard",
    weekNo: c.weekNo || null,
    blockWeeks: c.blockWeeks || null,
    ruleLabel: c.ruleLabel || null,
    ruleFocus: c.ruleFocus || null,
    thisWeek: c.thisWeek || 0,
    pledged: c.pledged || 3,
    streak: c.streak || 0,
    gymReady: Boolean(c.gymReady),
    testWeek: Boolean(c.testWeek),
    finished: Boolean(c.finished),
    session: c.sessionTitle || null,
    exercises: (c.exercises || []).slice(0, 12).map(function (e) {
      return { name: e.name, sets: e.sets || null, done: Boolean(e.done), last: e.last || null };
    }),
  };
}
