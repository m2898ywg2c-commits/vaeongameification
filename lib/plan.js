// Stage three: personality-shaped plans, quick logging, XP, streaks and coach voices.

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
  const date = new Date(d);
  const day = (date.getDay() + 6) % 7;
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - day);
  return date.getTime();
}

// target is the number of sessions this person pledged. Their streak is measured
// against their own promise, not a one-size-fits-all number.
export function computeStats(sessions, target) {
  const goal = Math.max(1, target || WEEKLY_TARGET);
  const list = sessions || [];
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
  let streak = 0;
  let w = thisWeek - weekMs;
  while ((counts[w] || 0) >= goal) {
    streak += 1;
    w -= weekMs;
  }
  if (thisWeekCount >= goal) streak += 1;

  // Every completed week where the pledge was met, for achievement milestones.
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

export function coachMessage(typeId, stats) {
  const voice = VOICES[typeId] || VOICES.architect;
  if (stats.daysSinceLast === null) return voice.fresh;
  if (stats.daysSinceLast >= 4) return voice.lapsed;
  return voice.active;
}
// Stage three: personality-shaped plans, quick logging, XP, streaks and coach voices.

export const SESSION_TYPES = ["Strength", "Cardio", "Class", "Mobility", "Sport", "Other"];

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
  const date = new Date(d);
  const day = (date.getDay() + 6) % 7;
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - day);
  return date.getTime();
}

export function computeStats(sessions) {
  const list = sessions || [];
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
  let streak = 0;
  let w = thisWeek - weekMs;
  while ((counts[w] || 0) >= WEEKLY_TARGET) {
    streak += 1;
    w -= weekMs;
  }
  if (thisWeekCount >= WEEKLY_TARGET) streak += 1;
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
    weekStreak: streak,
    daysSinceLast: daysSinceLast,
  };
}

export const PLANS = {
  architect: {
    style: "week",
    intro: "A fixed weekly block. Same slots every week, small increases each time. Tick every session and review the numbers monthly.",
    week: [
      { day: "Mon", title: "Strength A: lower body", type: "Strength", minutes: 45 },
      { day: "Tue", title: "Zone 2 cardio, steady pace", type: "Cardio", minutes: 30 },
      { day: "Wed", title: "Mobility reset", type: "Mobility", minutes: 15 },
      { day: "Thu", title: "Strength B: upper body", type: "Strength", minutes: 45 },
      { day: "Fri", title: "Intervals: 6 x 2 minutes hard", type: "Cardio", minutes: 25 },
      { day: "Sat", title: "Long easy session, any mode", type: "Cardio", minutes: 60 },
      { day: "Sun", title: "Full rest", type: null, minutes: 0 },
    ],
  },
  captain: {
    style: "week",
    intro: "A structured week built around people. Book the group slots first, they are the anchors, then fill in the solo work.",
    week: [
      { day: "Mon", title: "Group strength session", type: "Strength", minutes: 45 },
      { day: "Tue", title: "Solo cardio, keep it honest", type: "Cardio", minutes: 30 },
      { day: "Wed", title: "Rest or gentle walk", type: null, minutes: 0 },
      { day: "Thu", title: "Class or team sport night", type: "Class", minutes: 60 },
      { day: "Fri", title: "Strength with a partner", type: "Strength", minutes: 45 },
      { day: "Sat", title: "Parkrun or group ride", type: "Sport", minutes: 60 },
      { day: "Sun", title: "Full rest", type: null, minutes: 0 },
    ],
  },
  monk: {
    style: "week",
    intro: "A calm, repeatable rhythm. Protect the same times each day and let consistency do the heavy lifting.",
    week: [
      { day: "Mon", title: "Morning strength, unhurried", type: "Strength", minutes: 40 },
      { day: "Tue", title: "Quiet cardio, no screens", type: "Cardio", minutes: 30 },
      { day: "Wed", title: "Mobility and breathwork", type: "Mobility", minutes: 20 },
      { day: "Thu", title: "Morning strength, unhurried", type: "Strength", minutes: 40 },
      { day: "Fri", title: "Quiet cardio, no screens", type: "Cardio", minutes: 30 },
      { day: "Sat", title: "Long walk or swim", type: "Cardio", minutes: 60 },
      { day: "Sun", title: "Full rest", type: null, minutes: 0 },
    ],
  },
  anchor: {
    style: "week",
    intro: "Fixed classes, familiar faces. The timetable is the plan, your job is simply to keep showing up.",
    week: [
      { day: "Mon", title: "Evening class", type: "Class", minutes: 45 },
      { day: "Tue", title: "Rest", type: null, minutes: 0 },
      { day: "Wed", title: "Class or partner gym session", type: "Class", minutes: 45 },
      { day: "Thu", title: "Gentle mobility at home", type: "Mobility", minutes: 15 },
      { day: "Fri", title: "Rest", type: null, minutes: 0 },
      { day: "Sat", title: "Weekend class or group walk", type: "Class", minutes: 60 },
      { day: "Sun", title: "Full rest", type: null, minutes: 0 },
    ],
  },
  hunter: {
    style: "menu",
    target: 3,
    intro: "No fixed days. Hit three sessions this week, any order, any time. Each one is a target: beat it, log it, move on.",
    menu: [
      { title: "5k against the clock", type: "Cardio", minutes: 30 },
      { title: "Strength: beat last week by one rep", type: "Strength", minutes: 45 },
      { title: "Hill or stair repeats, 8 rounds", type: "Cardio", minutes: 30 },
      { title: "100 press-ups, fewest sets wins", type: "Strength", minutes: 20 },
      { title: "Row or bike: 10k time trial", type: "Cardio", minutes: 40 },
    ],
  },
  gladiator: {
    style: "menu",
    target: 3,
    intro: "Three sessions a week, built around competition. Book something with stakes, then train so you do not lose it.",
    menu: [
      { title: "Five-a-side, padel or squash", type: "Sport", minutes: 60 },
      { title: "Head-to-head gym challenge", type: "Strength", minutes: 45 },
      { title: "HIIT class, chase the leaderboard", type: "Class", minutes: 45 },
      { title: "Parkrun, race the last one", type: "Cardio", minutes: 30 },
      { title: "Sparring or skills session", type: "Sport", minutes: 60 },
    ],
  },
  wanderer: {
    style: "menu",
    target: 3,
    intro: "Three sessions, zero repetition required. Pick whatever appeals on the day, the only rule is you move.",
    menu: [
      { title: "Explore somewhere new on foot", type: "Cardio", minutes: 60 },
      { title: "Swim, cycle or paddle", type: "Cardio", minutes: 45 },
      { title: "Bodyweight session in the park", type: "Strength", minutes: 30 },
      { title: "Yoga or long stretch", type: "Mobility", minutes: 30 },
      { title: "Anything that sounds fun today", type: "Other", minutes: 30 },
    ],
  },
  spark: {
    style: "menu",
    target: 3,
    intro: "Three sessions a week and at least one with company. If a session sounds boring, swap it for one that does not.",
    menu: [
      { title: "Class with a friend", type: "Class", minutes: 45 },
      { title: "Dance, spin or boxfit", type: "Class", minutes: 45 },
      { title: "Walk and talk with someone", type: "Cardio", minutes: 45 },
      { title: "Social sport night", type: "Sport", minutes: 60 },
      { title: "Partner gym session", type: "Strength", minutes: 40 },
    ],
  },
};

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

export function coachMessage(typeId, stats) {
  const voice = VOICES[typeId] || VOICES.architect;
  if (stats.daysSinceLast === null) return voice.fresh;
  if (stats.daysSinceLast >= 4) return voice.lapsed;
  return voice.active;
}

