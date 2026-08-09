// THE WEEK BOUNDARY, IN ONE PLACE.
//
// This existed in seven separate copies of `(d.getDay() + 6) % 7` across app/ and lib/, plus
// three `date_trunc('week', ...)` calls in Postgres. Every one of them had to agree, and
// nothing enforced that they did. The plan week rolling over on a different day from the
// leaderboard was already fixed once by hand; seven independent copies is how it comes back.
//
// So there is now one definition, imported everywhere, and a matching public.week_start() in
// the database. Change the constant below and the whole app moves together.
//
// Sunday, at James's request. Postgres date_trunc('week', ...) is ISO and always returns
// Monday, which is why the SQL side needs its own helper rather than a config value.
export const WEEK_STARTS_ON = 0; // 0 = Sunday, 1 = Monday

// Local midnight at the start of the week containing `date`.
export function startOfWeek(date) {
  const d = date ? new Date(date) : new Date();
  d.setHours(0, 0, 0, 0);
  // Days elapsed since the configured start of the week.
  const offset = (d.getDay() - WEEK_STARTS_ON + 7) % 7;
  d.setDate(d.getDate() - offset);
  return d;
}

// Same thing as an ISO string, which is what the Supabase filters want.
export function startOfThisWeekISO() {
  return startOfWeek(new Date()).toISOString();
}

// Whole weeks from the week containing `from` to the week containing `to`. Counted between
// week starts rather than between the raw dates, so a block beginning mid week does not roll
// its plan over mid week. That was the original Wednesday bug.
export function weeksBetween(from, to) {
  const a = startOfWeek(from);
  const b = startOfWeek(to || new Date());
  return Math.round((b - a) / (7 * 24 * 60 * 60 * 1000));
}

// Days since the start of the week, 0 to 6. Replaces the open-coded (getDay() + 6) % 7,
// which silently assumed Monday.
export function dayIndexInWeek(date) {
  const d = date ? new Date(date) : new Date();
  return (d.getDay() - WEEK_STARTS_ON + 7) % 7;
}

// WHAT COUNTS AS ONE SESSION IN A WEEK.
//
// Here for the same reason as the week boundary: it was open-coded in four places and they
// disagreed. get_leaderboard, settle_streak_freezes, computeStats and the progress chart all
// counted ROWS, and a row is written every time a plan day is completed. Completing the same
// push session on four different days in one week therefore filled a four session pledge on
// its own, and the progress chart drew a bar of ten against a pledge line of four for a week
// that contained five days of training.
//
// The pledge is a number of sessions FROM THE PLAN. The plan has four slots. Filling the same
// slot four times is one slot filled four times.
//
// day_key is null on quick logs and on anything written before day_key existed. Those cannot
// be proved to be a repeat of anything, so each stands alone: this errs towards crediting work
// rather than withholding it, which is the right side to be wrong on in an app whose whole
// problem is people not coming back.
//
// The matching definition is public.session_key(text, uuid) in Postgres, added in
// supabase/2026-08-09_session_key.sql. Change one, change both.
export function sessionKey(session) {
  if (!session) return null;
  const k = String(session.day_key == null ? "" : session.day_key).trim();
  return k || "adhoc:" + String(session.id);
}

// Sessions per week, keyed by week start, counting distinct sessions rather than rows.
// Every screen that reports adherence should go through this rather than tallying the array.
export function sessionsByWeek(sessions) {
  const seen = {};
  const counts = {};
  (sessions || []).forEach(function (s) {
    if (!s) return;
    const w = startOfWeek(s.logged_at).getTime();
    const key = w + "|" + sessionKey(s);
    if (seen[key]) return;
    seen[key] = true;
    counts[w] = (counts[w] || 0) + 1;
  });
  return counts;
}
