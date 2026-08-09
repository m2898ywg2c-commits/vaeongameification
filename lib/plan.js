// Stage three: personality-shaped plans, quick logging, XP, streaks and coach voices.

import { framingLine } from "./framing";
import { startOfWeek as startOfWeekShared } from "./week";

export const SESSION_TYPES = ["Strength", "Cardio", "Class", "Mobility", "Sport", "Other"];

// Fallback only. Wherever possible the user's own pledged sessions_per_week is used instead.
export const WEEKLY_TARGET = 3;

export function xpForSession(s) {
  return 10 * (s.effort || 3) + Math.min(s.duration_min || 0, 90);
}

export function levelFromXp(total) {
  let level = 1;
  let need = 200;
  let remaining = total;
  while (remaining >= need) {
    remaining -= need;
    level += 1;
    need = 200 + (level - 1) * 100;
  }
  return { level: level, intoLevel: remaining, needed: need };
}

function weekStart(d) {
  return startOfWeekShared(d).getTime();
}

// A date string of the form YYYY-MM-DD, parsed in LOCAL time.
//
// new Date("2026-07-27") is parsed as UTC midnight, which is the previous evening in any
// negative offset and an hour into the morning here in summer. For a Monday that usually
// lands on the same Monday anyway, which is exactly the sort of nearly-always-right that
// produces one baffling bug report a year from somebody in the wrong timezone.
function parseLocalDate(text) {
  const parts = String(text).slice(0, 10).split("-");
  return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
}

// target is the number of sessions this person pledged. Their streak is measured
// against their own promise, not a one-size-fits-all number.
//
// frozenWeeks is an optional list of week_start dates from the streak_freezes table. A
// frozen week counts as kept. See supabase/streak_freeze.sql for why that mechanism
// exists: a streak that resets to zero for one bad week punishes illness, travel and
// ordinary life, and the fear of losing a long run is itself a reason to stop trying.
export function computeStats(sessions, target, frozenWeeks) {
  const goal = Math.max(1, target || WEEKLY_TARGET);
  const list = sessions || [];
  const frozen = {};
  (frozenWeeks || []).forEach(function (d) {
    frozen[weekStart(parseLocalDate(d))] = true;
  });
  const totalXp = list.reduce(function (sum, s) {
    return sum + xpForSession(s);
  }, 0);
  const lvl = levelFromXp(totalXp);
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  const thisWeek = weekStart(new Date());
  const counts = {};
  list.forEach(function (s) {
    const w = weekStart(s.logged_at);
    counts[w] = (counts[w] || 0) + 1;
  });
  const thisWeekCount = counts[thisWeek] || 0;
  const kept = function (wk) {
    return (counts[wk] || 0) >= goal || Boolean(frozen[wk]);
  };

  let streak = 0;
  let frozenInStreak = 0;
  let w = thisWeek - weekMs;
  while (kept(w)) {
    streak += 1;
    if (frozen[w] && (counts[w] || 0) < goal) frozenInStreak += 1;
    w -= weekMs;
  }
  if (thisWeekCount >= goal) streak += 1;

  // Every completed week where the pledge was actually met. Frozen weeks are deliberately
  // NOT counted here: a freeze protects the streak, it does not award a week that was not
  // trained. Achievements should mean what they say.
  let perfectWeeks = 0;
  Object.keys(counts).forEach(function (k) {
    if (counts[k] >= goal) perfectWeeks += 1;
  });

  let daysSinceLast = null;
  if (list.length) {
    const times = list.map(function (s) {
      return new Date(s.logged_at).getTime();
    });
    const last = Math.max.apply(null, times);
    daysSinceLast = Math.floor((Date.now() - last) / (24 * 60 * 60 * 1000));
  }
  return {
    totalXp: totalXp,
    level: lvl.level,
    intoLevel: lvl.intoLevel,
    needed: lvl.needed,
    thisWeekCount: thisWeekCount,
    weeklyGoal: goal,
    weekStreak: streak,
    // How much of the current streak is standing on a freeze rather than on training.
    // Shown to the user, because a streak that quietly includes weeks they did not train
    // is a lie told kindly, and the whole point of this app is honest reporting.
    frozenInStreak: frozenInStreak,
    perfectWeeks: perfectWeeks,
    totalSessions: list.length,
    daysSinceLast: daysSinceLast,
  };
}

const VOICES = {
  architect: {
    fresh: "Your block starts now. Session one is on the plan, log it today and the data begins.",
    active: "On schedule. Keep the slots, keep the increments, review at the end of the block.",
    lapsed: "The plan has a gap in it. One session today puts the block back on track, that is the only number that matters.",
  },
  captain: {
    fresh: "Squad rules: leaders go first. Get your opening session logged and set the pace for everyone else.",
    active: "You are leading from the front, exactly where you belong. Keep the run going.",
    lapsed: "The team notices when the captain goes quiet. One session today and you are back at the front.",
  },
  monk: {
    fresh: "Begin quietly. One unhurried session today, nothing dramatic, just the first repetition of many.",
    active: "The ritual is holding. Same time, same rhythm, keep it gentle and keep it going.",
    lapsed: "The streak slipped, that is fine, it happens. Return to the ritual today, no judgement, just the next rep.",
  },
  anchor: {
    fresh: "Your first class is waiting. Book it, show up, say hello, the rest looks after itself.",
    active: "Showing up week after week, that is the whole secret and you are doing it.",
    lapsed: "Your usual spot is still there and so are the usual faces. Get to one class this week and you are back in.",
  },
  hunter: {
    fresh: "First target is live. Pick one off the list, beat it, log it.",
    active: "Targets falling nicely. Pick the next one before the scent goes cold.",
    lapsed: "No wins logged this week. One target, today. Go.",
  },
  gladiator: {
    fresh: "Season opener. Book something competitive this week and come out swinging.",
    active: "Winning form. Keep the fixtures coming, you are dangerous when you are match fit.",
    lapsed: "You have gone quiet, which is not like you. Book a rematch, any arena, this week.",
  },
  wanderer: {
    fresh: "No plan, just a direction. Go somewhere new today and count it.",
    active: "Still moving, still curious. Where next?",
    lapsed: "The trail went cold for a few days. No matter, pick a new one today, short is fine.",
  },
  spark: {
    fresh: "First one is the fun one. Grab a friend, pick a class, make some noise.",
    active: "You are lighting it up. Keep the sessions social and the streak will look after itself.",
    lapsed: "It has gone a bit quiet without you. Text a friend, book something fun, that is the whole plan.",
  },
};

// framing is optional. When present (reward | loss) a short RST-based line is appended
// that reframes the same message around gain or protection. Omit it and nothing changes.
export function coachMessage(typeId, stats, framing) {
  const voice = VOICES[typeId] || VOICES.architect;
  let state = "active";
  if (stats.daysSinceLast === null) state = "fresh";
  else if (stats.daysSinceLast >= 4) state = "lapsed";
  const base = voice[state];
  const tag = framingLine(framing, state);
  return tag ? base + " " + tag : base;
}
