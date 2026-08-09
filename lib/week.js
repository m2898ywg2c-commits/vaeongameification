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
