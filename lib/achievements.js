// Achievements are stored in the database with a timestamp, so each one fires exactly once.

export const ACHIEVEMENTS = [
  {
    code: "first_session",
    name: "On the board",
    blurb: "Logged your first session.",
    hint: "Log any session.",
    icon: "1",
    tier: "bronze",
    test: function (c) { return c.stats.totalSessions >= 1; },
  },
  {
    code: "sessions_5",
    name: "Five down",
    blurb: "Five sessions logged. It is becoming a habit.",
    hint: "Log 5 sessions.",
    icon: "5",
    tier: "bronze",
    test: function (c) { return c.stats.totalSessions >= 5; },
  },
  {
    code: "sessions_25",
    name: "Quarter century",
    blurb: "Twenty five sessions. Most people never get here.",
    hint: "Log 25 sessions.",
    icon: "25",
    tier: "silver",
    test: function (c) { return c.stats.totalSessions >= 25; },
  },
  {
    code: "sessions_50",
    name: "Half a hundred",
    blurb: "Fifty sessions in the bank.",
    hint: "Log 50 sessions.",
    icon: "50",
    tier: "silver",
    test: function (c) { return c.stats.totalSessions >= 50; },
  },
  {
    code: "sessions_100",
    name: "Century",
    blurb: "One hundred sessions. That is a different person to the one who signed up.",
    hint: "Log 100 sessions.",
    icon: "100",
    tier: "gold",
    test: function (c) { return c.stats.totalSessions >= 100; },
  },
  {
    code: "perfect_week",
    name: "Kept your word",
    blurb: "Hit every session you pledged in a week.",
    hint: "Complete your full weekly pledge once.",
    icon: "W",
    tier: "bronze",
    test: function (c) { return c.stats.perfectWeeks >= 1; },
  },
  {
    code: "streak_2",
    name: "Back to back",
    blurb: "Two weeks running, pledge met both times.",
    hint: "Hit your pledge two weeks in a row.",
    icon: "2",
    tier: "bronze",
    test: function (c) { return c.stats.weekStreak >= 2; },
  },
  {
    code: "streak_4",
    name: "A month of it",
    blurb: "Four straight weeks. This is what consistency looks like.",
    hint: "Hit your pledge four weeks in a row.",
    icon: "4",
    tier: "silver",
    test: function (c) { return c.stats.weekStreak >= 4; },
  },
  {
    code: "streak_8",
    name: "Unshakeable",
    blurb: "Eight weeks unbroken. Life got in the way and you went anyway.",
    hint: "Hit your pledge eight weeks in a row.",
    icon: "8",
    tier: "gold",
    test: function (c) { return c.stats.weekStreak >= 8; },
  },
  {
    code: "streak_12",
    name: "Twelve weeks deep",
    blurb: "A full quarter without missing your pledge. Genuinely rare.",
    hint: "Hit your pledge twelve weeks in a row.",
    icon: "12",
    tier: "gold",
    test: function (c) { return c.stats.weekStreak >= 12; },
  },
  {
    code: "level_5",
    name: "Level five",
    blurb: "Enough hard sessions to reach level five.",
    hint: "Reach level 5.",
    icon: "L5",
    tier: "bronze",
    test: function (c) { return c.stats.level >= 5; },
  },
  {
    code: "level_10",
    name: "Level ten",
    blurb: "Level ten. The XP does not lie.",
    hint: "Reach level 10.",
    icon: "L10",
    tier: "silver",
    test: function (c) { return c.stats.level >= 10; },
  },
  {
    code: "first_pb",
    name: "First personal best",
    blurb: "Beat your own number for the first time.",
    hint: "Log a heavier set than you have before on any lift.",
    icon: "PB",
    tier: "bronze",
    test: function (c) { return c.pbCount >= 1; },
  },
  {
    code: "pb_10",
    name: "Ten personal bests",
    blurb: "Ten times you have gone past your old ceiling.",
    hint: "Set 10 personal bests.",
    icon: "10",
    tier: "silver",
    test: function (c) { return c.pbCount >= 10; },
  },
  {
    code: "tonnage_10k",
    name: "Ten tonnes",
    blurb: "Ten thousand kilos moved. Your body noticed.",
    hint: "Move 10,000kg of total volume.",
    icon: "10t",
    tier: "silver",
    test: function (c) { return c.tonnage >= 10000; },
  },
  {
    code: "tonnage_50k",
    name: "Fifty tonnes",
    blurb: "Fifty thousand kilos. That is a lot of quiet work.",
    hint: "Move 50,000kg of total volume.",
    icon: "50t",
    tier: "gold",
    test: function (c) { return c.tonnage >= 50000; },
  },
  {
    code: "block_complete",
    name: "Block finished",
    blurb: "Six weeks, start to finish. Now go and beat those numbers.",
    hint: "Complete a full six week block.",
    icon: "B",
    tier: "gold",
    test: function (c) { return c.blockFinished; },
  },
  {
    code: "comeback",
    name: "Back in it",
    blurb: "Returned after a week away. Restarting is harder than starting.",
    hint: "Log a session after seven or more days off.",
    icon: "R",
    tier: "silver",
    test: function (c) { return c.hadComeback; },
  },
];

export const TIER_COLOURS = {
  bronze: ["#D08B5B", "#7A4A22"],
  silver: ["#C4CCD6", "#6B7684"],
  gold: ["#F3C558", "#A67C10"],
};

// Count personal bests: a set that beats every previous set on that exercise.
export function countPersonalBests(logs) {
  const sorted = (logs || [])
    .filter(function (l) { return l.weight; })
    .slice()
    .sort(function (a, b) { return new Date(a.logged_at) - new Date(b.logged_at); });
  const best = {};
  let count = 0;
  sorted.forEach(function (l) {
    const w = Number(l.weight);
    if (best[l.exercise] === undefined) {
      best[l.exercise] = w;
      return;
    }
    if (w > best[l.exercise]) {
      best[l.exercise] = w;
      count += 1;
    }
  });
  return count;
}

// Did they return after a gap of a week or more?
export function detectComeback(sessions) {
  const times = (sessions || [])
    .map(function (s) { return new Date(s.logged_at).getTime(); })
    .sort(function (a, b) { return a - b; });
  for (let i = 1; i < times.length; i++) {
    if (times[i] - times[i - 1] >= 7 * 24 * 60 * 60 * 1000) return true;
  }
  return false;
}

export function buildContext(stats, sessions, logs, blockFinished) {
  const tonnage = (logs || []).reduce(function (sum, l) {
    if (l.weight && l.reps) return sum + Number(l.weight) * Number(l.reps);
    return sum;
  }, 0);
  return {
    stats: stats,
    tonnage: tonnage,
    pbCount: countPersonalBests(logs),
    hadComeback: detectComeback(sessions),
    blockFinished: !!blockFinished,
  };
}

export function earnedCodes(context) {
  return ACHIEVEMENTS.filter(function (a) {
    try {
      return a.test(context);
    } catch (e) {
      return false;
    }
  }).map(function (a) {
    return a.code;
  });
}

export function byCode(code) {
  return ACHIEVEMENTS.find(function (a) { return a.code === code; }) || null;
}

// The next few worth chasing, so the cabinet is never just a list of what you missed.
export function nextUp(earned, limit) {
  const have = earned || [];
  return ACHIEVEMENTS.filter(function (a) {
    return have.indexOf(a.code) === -1;
  }).slice(0, limit || 3);
}

