// THE COACH BRIEFING. ONE SENTENCE OF FACT, ONE IN THE CHARACTER'S OWN VOICE.
//
// This replaces the dashboard's stack of cards with the thing a coach would actually say when
// you walked in: where you are, what today is for, and a push in their own register. Oura
// rebuilt its home screen around the same idea, one thing to focus on rather than a grid of
// scores, and it is the shortest route from opening the app to starting a session.
//
// IT READS NUMBERS, IT NEVER MAKES THEM.
//
// Every figure in the briefing comes from computeStats(), the block calendar and the week's
// rule, exactly as the old dashboard showed them. Nothing here calculates a load, a rep or a
// target. That is a rule worth keeping when a language model starts talking for these
// characters too: the progression engine decides, the coach only reports.
//
// Pure functions, no imports from React or Supabase, so test/briefing.mjs can run it in Node.

// Each type's sign-off by situation. Short on purpose: it sits under a 28px headline and is
// read in about a second. Written to match lib/voice.js, where the Monk does not shout and
// the Gladiator does.
const SIGN_OFF = {
  architect: {
    fresh: "First data point today. Get it on the sheet.",
    behind: "The plan still works if you do. One session closes the gap.",
    ontrack: "On plan. Do exactly what is written.",
    met: "Pledge met. Anything else is a bonus, not a requirement.",
    lapsed: "Gap in the data. Today fixes it.",
    finished: "Block complete. The report is ready, read it before the next one.",
  },
  captain: {
    fresh: "Right. First one sets the standard. Let us go.",
    behind: "Front of the queue, now. We are chasing this week.",
    ontrack: "Good shift so far. Lead from the front again today.",
    met: "Week won. Go and lift somebody else on the board.",
    lapsed: "Nobody follows a captain who is not there. Back in today.",
    finished: "Block done and well led. Come and see what it bought you.",
  },
  monk: {
    fresh: "Begin. That is all today asks.",
    behind: "No hurry. Return to the ritual, one session at a time.",
    ontrack: "The rhythm is holding. Keep it quiet and keep it going.",
    met: "The week is complete. Rest is part of the work.",
    lapsed: "The thread slipped. Pick it up gently, today.",
    finished: "Six weeks of returning. Sit with the summary for a moment.",
  },
  anchor: {
    fresh: "Your first one is waiting. Just turn up, the rest follows.",
    behind: "Still time this week. Same place, same time, you know the drill.",
    ontrack: "Showing up again. That is the whole secret.",
    met: "Week done. Lovely, steady work.",
    lapsed: "Your spot is still there. Come back in today.",
    finished: "You kept turning up for a whole block. Come and see it.",
  },
  hunter: {
    fresh: "First target is live. Beat it, log it.",
    behind: "Targets left standing this week. Pick one off today.",
    ontrack: "Targets falling. Next one, before the scent goes cold.",
    met: "Week cleared. Anything now is a trophy.",
    lapsed: "No kills logged. One target. Today.",
    finished: "Block down. Check the haul.",
  },
  gladiator: {
    fresh: "Season opener. Come out swinging.",
    behind: "You are behind on the scoreboard. Fix it today.",
    ontrack: "Winning form. Do not let it drop now.",
    met: "Week won! Anything else is showing off, and I approve.",
    lapsed: "Gone quiet. Not like you. Back in the arena.",
    finished: "Block finished. Come and see the damage you did.",
  },
  wanderer: {
    fresh: "No pressure. Wander in and see how it feels.",
    behind: "Plenty of week left. Pick whichever one you fancy.",
    ontrack: "Still moving, still curious. Where today?",
    met: "Week done. Anything else is just for fun.",
    lapsed: "The trail went cold for a bit. Short is fine, just go.",
    finished: "That was a proper journey. Have a look back at it.",
  },
  spark: {
    fresh: "First one is the fun one. Let us light it up!",
    behind: "A couple to go this week. Grab someone and make it loud!",
    ontrack: "You are on fire. Keep it coming!",
    met: "Week smashed! Go and tell someone.",
    lapsed: "It has gone a bit quiet without you. Come back and make noise!",
    finished: "Block done! Come and see the highlights.",
  },
};

// The situation, decided once so the headline and the sign-off cannot disagree.
export function situationFor(stats, pledged, finished) {
  if (finished) return "finished";
  if (!stats || stats.daysSinceLast === null) return "fresh";
  if ((stats.thisWeekCount || 0) >= pledged) return "met";
  if (stats.daysSinceLast >= 4) return "lapsed";
  // Behind means more sessions left than days left to fit them in comfortably.
  const left = pledged - (stats.thisWeekCount || 0);
  const daysLeft = 7 - (new Date().getDay());
  return left >= daysLeft ? "behind" : "ontrack";
}

// The factual half. Never more than one short sentence, and it carries every number.
export function factLine(opts) {
  const pledged = opts.pledged || 3;
  const done = opts.stats ? opts.stats.thisWeekCount || 0 : 0;
  if (opts.finished) return "Block " + (opts.blockNumber || 1) + " is finished.";
  const weekPart = "Week " + opts.weekNo + " of " + opts.blockWeeks +
    (opts.ruleLabel && !opts.gym ? ", " + opts.ruleLabel.toLowerCase() + " week" : "");
  if (done >= pledged) return weekPart + ". All " + pledged + " done.";
  if (done === 0) return weekPart + ". " + pledged + " to do.";
  return weekPart + ". " + done + " of " + pledged + " done.";
}

export function briefingFor(opts) {
  const typeId = opts.typeId && SIGN_OFF[opts.typeId] ? opts.typeId : "architect";
  const situation = situationFor(opts.stats, opts.pledged || 3, opts.finished);
  return {
    situation: situation,
    fact: factLine(opts),
    voice: SIGN_OFF[typeId][situation],
  };
}
