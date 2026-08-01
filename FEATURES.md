# Vaeon, feature list

As built on 31 July 2026. Everything below is live in the app unless marked otherwise.

---

## The product argument

Most training apps hand you a workout and never tell you whether it worked. Vaeon profiles
you, tests you in week one, builds every later week from your own logged numbers, and scores
adherence rather than load.

---

## Profiling

- **Eight training personalities** from twelve statements across three dimensions: planned
  or freestyle, outcome or experience, together or solo.
- **Forced-choice tiebreakers** on any dimension that lands dead even, rather than defaulting
  everyone who is genuinely undecided onto one corner of the type cube.
- **Motivation framing**, reward-sensitive or loss-sensitive, from Reinforcement Sensitivity
  Theory. Sits alongside the eight types and shapes coaching tone.
- **Chronotype**, morning or evening, which sets your default reminder time.
- **Type feedback**, a 1 to 5 resonance rating per user, so there is evidence about whether
  the eight types actually land.

## What the type actually changes

- **Coaching voice** across quotes, session intros, praise and the end-of-session line.
- **Accent colour** throughout the app, including a separate light-theme colour per type.
- **The shape of the week.** Freestyle types get the week as a pool to pick from and land on
  the next session they have not done, rather than on today's weekday. Planned types keep
  assigned days.
- **Leaderboard offer.** Solo types get a plainly worded option to step off it.

## Training plans

- **Fourteen goals**, thirteen planned plus **Gym ready** for people who already have a
  personal trainer and just want the counting.
- **Two goals at once**, interleaved across the week.
- **Six-week blocks**, eight for Gym ready, stored per user.
- **Testing week.** Week one prescribes no weight on lifts with no known max. You find your
  own, log it, and it becomes the baseline.
- **Percentage-of-max progression** across the block: 70, 75, 80, deload at 65, peak at 85,
  test at 90.
- **Estimated max from any logged set**, using Epley, so the plan learns from real work
  rather than waiting for a formal test.
- **Ratio table** covering roughly fifty lifts, so anything can borrow a sensible starting
  weight from your two entered baselines.
- **Home and no-kit substitutions**, with the barbell lift swapped for something you can
  actually do and the card retitled accordingly.
- **Finishers**, one per session, dealt and cycled, deliberately excluded from scoring.
- **Warm-ups and stretch flows** per session.

## Logging

- **Previous performance on every set.** What you did last time, with how long ago, both as a
  summary and per set.
- **Smart prefill.** The prescription first, then last time, then the plan target.
- **Correct units per exercise.** Minutes for runs, seconds for holds, distance where that is
  what was asked for.
- **Optional added weight** on loadable bodyweight movements, so a weighted dip records the
  belt rather than just the reps.
- **Auto-finish** when every exercise is ticked off.
- **Quick log** for anything done outside the plan.
- **Gym ready freeform blocks** that prefill their exercise names from last week.

## Rest timer

- Pinned to the bottom of the session screen, one per session, never inside a card.
- **Survives everything.** Nothing counts down: it stores an end timestamp, so locking the
  phone, switching apps or navigating away costs it nothing.
- Turns your accent colour for the final ten seconds.
- Notification when the rest is up, where the browser allows it.

## Adherence and streaks

- **Scored on your own pledge**, not a universal target.
- **Weekly streak** with **one grace week per block**, spent automatically on a missed week
  and only where it actually protects a streak.
- Frozen weeks count toward the streak but never toward achievements.
- **XP and levels** from session effort and duration.
- **Achievements** with a watcher that fires as you earn them.

## Reporting

- **Block-end report**: sessions done against pledged, personal bests with the gain on each,
  lift-by-lift trends, and bodyweight change across the block.
- **Honest trend language**, including stalled, flat and down, not just the good news.
- **Progress charts** for bodyweight, measurements and lift history.
- **One-tap roll into the next block** with your new numbers as the baseline.

## Community

- **Leaderboard** scored on percentage of your own pledge, so a two-a-week user is compared
  fairly with a six-a-week user.
- **Opt-out for anyone**, which hides you from the board without hiding the board from you.
- **Kudos** with a fixed vocabulary of emoji and short lines, deliberately not free text.
- **Group challenges**: a shared collective target with days remaining, group progress, your
  own contribution, and a hide control.

## Reminders

- **One a day at most**, and none at all in a week where you have already hit your pledge.
- **Time defaults from chronotype**, set just before your window rather than inside it.
- **Copy varies by type and by framing**, forty distinct messages.
- **Five occasions**: due, short, missed, drifting, lapsed.
- **Nothing scolds.** Loss framing points at what is worth keeping, never at what was lost.
- **Two routes.** The dashboard card reaches everyone; web push reaches whoever grants
  permission. *Push needs VAPID keys and a cron schedule before it can send.*

## Appearance and accessibility

- **Light and dark**, dark by default, with a one-tap toggle top left on every screen and a
  three-way control in Settings including match-phone.
- **Per-type accent for each theme**, so type identity survives the switch and still passes
  contrast either way.
- **Contrast verified to WCAG AA** on both themes.
- **Reduced-motion respected** on the splash.
- **Tabular figures** everywhere, so counting numbers do not shuffle.
- **Custom icon set**, no emoji, so the app looks the same on every platform.

## Platform

- **Installable as an app** on Android, desktop and iPhone, with platform-correct
  instructions and a real install button where the browser allows one.
- **Opening splash** on a stale timestamp rather than a session flag, so it does not re-fire
  every time iOS discards the web view.
- **Service worker** for notifications.

## Trust and admin

- **Data export.** Everything held about you, as JSON, on one button. Satisfies UK GDPR
  Article 20.
- **Versioned disclaimer**, recording which wording was agreed and when.
- **Row level security on every table**, with all cross-user visibility going through three
  audited functions.
- **Product event log** covering the whole funnel from signup to block end, with personality
  type recorded at the time of each event.

---

## Not finished

- **Web push** is written and needs VAPID keys, a Vercel environment variable and a `pg_cron`
  schedule. Instructions are in the header of the edge function. The in-app reminder works
  for everyone regardless.
- **Age gate at signup.** There are under-18s on the platform. Needs deciding before the
  first stranger signs up.
- **Legal review of the disclaimer.**
- **Low-rep testers never progress past their test.** Documented in HANDOVER.md with the
  numbers. Mitigated by naming a rep range; the real fix needs a schema change.
- **Type sizes.** A lot of 9px and 10px labels, which is below any sensible minimum.
- **Five database indexes** drafted and unapplied on the original tables.
