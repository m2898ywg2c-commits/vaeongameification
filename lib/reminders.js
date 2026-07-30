// Reminders: when to nudge, and what to say.
//
// Two rules shape everything in this file.
//
// FIRST, the miss matters more than the nudge. Anyone can write "time to train". The
// message that decides whether somebody stays is the one they get after they have already
// let themselves down, and the evidence on that is unambiguous: self-compassion after a
// lapse predicts getting back to it, and shame predicts quietly deleting the app. So
// nothing in here scolds. No "you failed", no counting up what was missed, no guilt as a
// motivator. Loss framing points at what is worth keeping, never at what has been lost.
//
// That is not softness, it is the accurate move. It also matters because there are
// under-18s on this platform, and an app that makes a teenager feel bad about missing
// exercise is doing something worse than not existing.
//
// SECOND, the type changes the words and the framing changes the angle, but neither
// changes the ask. Every occasion resolves to the same small request: do one session. A
// personality model that let the Wanderer off the hook would not be personalisation, it
// would be the app helping somebody avoid the thing they signed up for.
//
// KEEP IN SYNC. The occasion names here mirror due_reminders() in supabase/reminders.sql,
// and the push sender carries its own copy of these strings. Change an occasion in one
// place and change it in all three. This is the same trade already made for KUDOS_NOTES.

// Occasions, most urgent first. See supabase/reminders.sql for the thresholds.
export const OCCASIONS = ["lapsed", "drifting", "missed", "short", "due"];

// Default reminder time by chronotype.
//
// Deliberately BEFORE the window rather than inside it. A morning type does not want to
// be told to train at 07:00 while they are training at 07:00, they want twenty minutes of
// warning while they are deciding whether to bother. Evening types are nudged before the
// commute home, which is where that decision actually gets made.
//
// Neutral defaults to early evening rather than midday, because "no strong preference" in
// practice means training fits around the working day, not that any hour is equally
// likely.
export const DEFAULT_TIME = {
  morning: { hour: 6, minute: 45 },
  evening: { hour: 16, minute: 30 },
  neutral: { hour: 17, minute: 0 },
};

export function defaultTimeFor(chronotype) {
  return DEFAULT_TIME[chronotype] || DEFAULT_TIME.neutral;
}

// The browser's own zone, so a reminder set for 07:00 stays at 07:00 through a clock
// change and still means 07:00 if somebody signs up outside the UK.
export function detectTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/London";
  } catch (e) {
    return "Europe/London";
  }
}

export function formatTime(hour, minute) {
  const h = String(hour == null ? 17 : hour).padStart(2, "0");
  const m = String(minute || 0).padStart(2, "0");
  return h + ":" + m;
}

// ---------------------------------------------------------------------------
// The words
// ---------------------------------------------------------------------------
//
// Eight types by five occasions. Written out in full rather than composed from fragments,
// because composed coaching copy reads like composed coaching copy, and the whole claim of
// this product is that it sounds like somebody who knows you.
//
// Titles are short enough to survive a notification shade on a narrow phone, roughly
// thirty characters. Bodies assume they may be the only thing the person reads today.

const REMINDERS = {
  architect: {
    due: { title: "Next line on the sheet", body: "Today's session is written and waiting. You do not need to feel like it, you need to open it." },
    short: { title: "The week is still winnable", body: "A couple of days left and the plan still adds up. Take the next session as written." },
    missed: { title: "One session, back on plan", body: "A gap in the data is not a broken block. Log one session and the numbers stay honest." },
    drifting: { title: "The plan is still here", body: "Three days out is a rounding error over six weeks. Pick up at the next session, not at the beginning." },
    lapsed: { title: "Nothing has been lost", body: "Your baselines are still on file and the block will rebuild around whatever you do next. Start with one session." },
  },
  captain: {
    due: { title: "Front of the queue", body: "Session is ready. Somebody always ends up following how you show up, so give them something." },
    short: { title: "Finish the week properly", body: "You are short of what you promised yourself and there is still time to fix it. Go." },
    missed: { title: "Straight back in", body: "Missing one is nothing. Leaders drop sessions too, they just do not drop two. Take today's." },
    drifting: { title: "Time to lead again", body: "A few days off happens to everyone. Getting back is the bit people actually notice. Do one session." },
    lapsed: { title: "Come back and lead", body: "The board is still there and so is your place on it. One session is all it takes to be back in this." },
  },
  monk: {
    due: { title: "Begin", body: "That is all today asks. Open the session and take the first movement." },
    short: { title: "A quiet week can still finish well", body: "There is time left. One session, unhurried, is enough to keep the rhythm." },
    missed: { title: "Return, that is all", body: "The practice is not the streak. It is coming back. Today is a perfectly good day to." },
    drifting: { title: "The rhythm is still yours", body: "A few days away does not undo anything. Sit down, open the session, begin again." },
    lapsed: { title: "Nothing to make up for", body: "There is no debt to repay here and no catching up to do. There is only the next session, whenever you choose it." },
  },
  anchor: {
    due: { title: "Same as ever", body: "Your session is ready when you are. Turning up is genuinely most of it." },
    short: { title: "Still time this week", body: "You are a bit behind what you set yourself. One session gets you back to steady." },
    missed: { title: "No harm done", body: "Everyone misses one. Come back today and the week still counts as a good one." },
    drifting: { title: "We kept your spot", body: "A few days off is normal life, not a failure. Pick it back up whenever suits." },
    lapsed: { title: "Whenever you are ready", body: "Nothing here expires and nobody is keeping score against you. One session and you are back in the routine." },
  },
  hunter: {
    due: { title: "Target is up", body: "Session is loaded. Go and take it." },
    short: { title: "Short of the number", body: "You are behind what you set. There is still time to close it. Move." },
    missed: { title: "Reset, go again", body: "Missed one. It is gone. The next target is the only one that matters." },
    drifting: { title: "Trail has gone cold", body: "Three days. Pick a session, take it, and it is warm again." },
    lapsed: { title: "Your numbers are still on file", body: "Everything you set is saved and waiting. One session puts you back in the hunt." },
  },
  gladiator: {
    due: { title: "Gate is open", body: "Session is ready. Walk out swinging." },
    short: { title: "Behind on the week", body: "You said more than you have done. Still time to make that right. Get after it." },
    missed: { title: "Round two", body: "Everyone gets caught once. Nobody good gets caught twice. Take today's session." },
    drifting: { title: "Back in the arena", body: "Few days off does not end a campaign. One session and you are back in it." },
    lapsed: { title: "Still your fight", body: "Nothing you built has gone anywhere. Come back, take one session, and start swinging again." },
  },
  wanderer: {
    due: { title: "Go and move", body: "Something is ready for you today. It does not have to be hard, it just has to happen." },
    short: { title: "Room left in the week", body: "You are under what you set yourself. One session, whatever kind you fancy, closes it." },
    missed: { title: "No wrong direction", body: "Missing a day is not going backwards. Move today and you are moving again." },
    drifting: { title: "Been a few days", body: "Nothing lost. Pick whichever session appeals and go and do that one." },
    lapsed: { title: "Whenever you fancy it", body: "This has been waiting patiently and will keep waiting. When you want to move, it is here." },
  },
  spark: {
    due: { title: "Make it a good one", body: "Session is ready. Decent playlist, someone to tell afterwards, done." },
    short: { title: "One more this week", body: "You are a bit under what you said. Grab a mate and knock one out." },
    missed: { title: "No big deal", body: "Missed one, who has not. Today is a much better day for it anyway." },
    drifting: { title: "Come back and enjoy it", body: "Few days off is fine. Pick the most fun session on the list and start there." },
    lapsed: { title: "Still fun in here", body: "Nothing is ruined and nobody minds. Do one session you actually enjoy and you are back." },
  },
};

// Framing tails, appended to the body. Same event, different reason it matters.
//
// The loss lines are the ones to be careful with. They point at what is worth protecting,
// never at what has already gone wrong, because "do not lose your streak" motivates and
// "you lost your streak" simply informs someone that there is no longer a reason to
// bother. On the two occasions where something genuinely has slipped, drifting and
// lapsed, the loss framing deliberately switches to what is still intact.
const FRAMING_TAIL = {
  reward: {
    due: "There is a better number in you today.",
    short: "Finish it and the week goes down as a win.",
    missed: "One session and you are back on for a strong week.",
    drifting: "Everything you were chasing is still ahead of you.",
    lapsed: "Every best you have ever set is still there to beat.",
  },
  loss: {
    due: "You have built something worth keeping. Today keeps it.",
    short: "One session protects the week you have already half earned.",
    missed: "One session stops this becoming a pattern.",
    drifting: "Your baselines and your block are all still intact.",
    lapsed: "The work you already did has not gone anywhere.",
  },
};

// The main entry point for both routes.
//
// Returns { title, body } with the framing tail already folded in, or null if the inputs
// make no sense. Balanced framing gets no tail at all, deliberately: the base line is
// written to stand on its own and a bolted-on flourish would weaken it.
export function reminderCopy(typeId, occasion, framing) {
  const set = REMINDERS[typeId] || REMINDERS.architect;
  const base = set[occasion] || set.due;
  if (!base) return null;

  const tails = FRAMING_TAIL[framing];
  const tail = tails ? tails[occasion] : null;

  return {
    title: base.title,
    body: tail ? base.body + " " + tail : base.body,
  };
}

// ---------------------------------------------------------------------------
// The in-app version
// ---------------------------------------------------------------------------
//
// The same decision, made on the client, for the nudge that appears on the dashboard.
// This is the route that matters most in practice: it needs no permission, no install and
// no third party, so it reaches every user rather than the minority who accept a push
// prompt. Push is the same message shouted through a smaller door.
//
// Mirrors the CASE expression in due_reminders(). Keep them together.
export function occasionFor(lastActivityAt, sessionsThisWeek, pledged, now) {
  const at = now ? new Date(now) : new Date();
  const done = sessionsThisWeek || 0;
  const target = pledged || 3;

  // Pledge kept. Nothing to nudge about, and saying something anyway would be the app
  // failing to understand its own scoring.
  if (done >= target) return null;

  let days = 999;
  if (lastActivityAt) {
    const last = new Date(lastActivityAt);
    days = Math.floor((at.getTime() - last.getTime()) / 86400000);
  }

  if (days >= 7) return "lapsed";
  if (days >= 3) return "drifting";
  if (days >= 1) return "missed";

  // Friday, Saturday or Sunday and still short of the pledge, with time left to fix it.
  const dow = at.getDay();
  if (dow === 5 || dow === 6 || dow === 0) return "short";

  return "due";
}
