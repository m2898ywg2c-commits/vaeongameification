# Vaeon, feature list

As built on 4 August 2026. Everything below is live in the app unless marked otherwise.

Where a line says NEW or FIXED it landed on 4 August and is not in any earlier version of
this file. If you are reading this in a handover, those are the ones most likely to be
unfamiliar.

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
- NEW **A character per type**, three tiers by size. Under 38px the coloured orb, which is
  the only one of the three that is legible that small and the only one carrying the type
  letter. From 38px a head-and-shoulders avatar. At 84px and above the full figure. The
  floor is enforced in `TypeCharacter`, which hands back an orb rather than degrading.

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
- FIXED **The days you chose are now used.** `buildWeek()` never read `profiles.train_days`.
  It was written at onboarding, read back into the settings screen so it looked honoured,
  and thrown away when the plan was built, so everyone got a hardcoded spread. Somebody who
  picked Monday to Friday got Mon Tue Wed Fri Sat. `slotsFor()` in `lib/training.js` now
  owns this for both the normal and the Gym ready week, and a byte-identical duplicate of
  the spread table has been deleted from `lib/gymready.js`.

## Logging

- **Previous performance on every set.** What you did last time, with how long ago, both as a
  summary and per set.
- **Smart prefill.** The prescription first, then last time, then the plan target.
- **Optional added weight** on loadable bodyweight movements, so a weighted dip records the
  belt rather than just the reps.
- **Auto-finish** when every exercise is ticked off.
- **Quick log** for anything done outside the plan, with delete.
- **Gym ready freeform blocks** that prefill their exercise names from last week.
- FIXED **The prescription now beats the name.** Substring matching on the exercise name ran
  before the rep count, so "hang" made Hanging Leg Raise ask for seconds when the plan had
  just said three sets of fifteen, and "carry" did the same to a 200m Farmers Carry. Eight
  exercises were being logged in the wrong unit. Verified against every exercise in
  `lib/training.js`.
- NEW **Endurance work records distance and duration as numbers**, in `exercise_logs`
  `distance_km` and `duration_min`, so pace is derivable. It used to be one free-text box
  labelled "time or distance". Loaded carries, sleds and broad jumps are excluded by name
  and keep the free-text box, because nobody wants a pace over fifty metres of sled.
- NEW **Per-side logging on timed holds.** Twenty four exercises are prescribed "per side"
  and three set rows recorded half of them. Thirteen timed holds now get an L and an R box
  and write two rows tagged with `side`. Deliberately not applied to "12 per leg" rep work,
  where the set is continuous and splitting it doubles the taps for nothing.
- FIXED **Decimal minutes are typeable.** The time box was `inputMode="numeric"`, which on
  iOS is the keypad with no decimal point on it, so 23.11 minutes could not be entered at
  all.
- FIXED **Completing an exercise twice no longer logs it twice.** `completeSet()` was a bare
  insert, so every tap appended another full batch. 37 of 151 live rows were surplus, back
  to 29 July. It now replaces that day's rows for that exercise. See the 4 August section of
  HANDOVER.md for the three migrations that cleaned up the existing data.
- FIXED **Completion survives closing the app.** The per-exercise done map was React state
  seeded empty on every load, so a session logged in the morning looked untouched by
  evening. It is rebuilt from the week's logs and holds until the week rolls over.
- FIXED **A week you have already trained shows what you did**, not next week's progression.
  Where an exercise has logs for this week on this day, those win the prefill.
- FIXED **Reads key on `set_index`, not array position.** With duplicate rows present, a
  positional read showed set one's second copy as set two, which is how a card displayed
  60, 25, 25.

## HYROX stations

- **One station per session**, dealt from a pool of five and cycled.
- NEW **The pool rotates across weeks, not just within one.** The deal used to start at zero
  on every build, so a four session week dealt the same four stations every week and
  `Weighted Lunge Walk`, fifth of five, was unreachable for an entire block. Week one gives
  Ski, Row, Ropes, Sled; week two gives Row, Ropes, Sled, Lunge Walk.
- NEW **Two ways to log, because they are not the same question.** A SkiErg or a Row is one
  number you chase and beat. Battle ropes, the sled and the lunge walk are rounds you tick
  off as you finish them. Asking for "your time or score" on the second kind produced an
  empty box people sensibly ignored.
- FIXED **A station score no longer copies across days.** State was keyed by index, every day
  has exactly one station so the index was always 0, and DayView is not unmounted on a day
  change. Monday's box and Tuesday's box were the same box.

## Rest timer

- Pinned to the bottom of the session screen, one per session, never inside a card.
- **Survives everything.** Nothing counts down: it stores an end timestamp, so locking the
  phone, switching apps or navigating away costs it nothing.
- Turns your accent colour for the final ten seconds.
- Notification when the rest is up, where the browser allows it.
- NEW **Screen wake lock while a rest is running**, released the instant it ends. The timer
  was already immune to the phone locking; what it could not do was stay visible, and ninety
  seconds is past most auto-lock settings. Works on iOS 16.4 and later, unlike the haptics.

## Adherence, streaks and reward

- **Scored on your own pledge**, not a universal target.
- **Weekly streak** with **one grace week per block**, spent automatically on a missed week
  and only where it actually protects a streak.
- Frozen weeks count toward the streak but never toward achievements.
- **XP and levels** from session effort and duration.
- **Achievements** with a watcher that fires as you earn them.
- NEW **Haptic on each achievement**, one buzz per achievement rather than one per batch.
  Android only. Safari has never implemented the Vibration API, so on an iPhone this is a
  silent no-op and cannot be made otherwise. See the header of `lib/haptics.js`.
- NEW **Session fanfare**, a burst in the user's own two colours behind their character when
  a session is logged. Four variants chosen by hashing the day key with the type id, so it
  varies day to day and cannot re-roll mid-animation. Pure CSS keyframes, no library.
  Reduced motion switches it off.

## Reporting

- **Block-end report**: sessions done against pledged, personal bests with the gain on each,
  lift-by-lift trends, and bodyweight change across the block.
- **Honest trend language**, including stalled, flat and down, not just the good news.
- **Progress charts** for bodyweight, measurements and lift history.
- **One-tap roll into the next block** with your new numbers as the baseline.
- FIXED **Body metrics no longer appear to revert.** The bodyweight placeholder was "78" and
  a successful save cleared the form, so the grey placeholder appeared and read as the value
  reverting. A tester saved 60.3 twice, ten seconds apart, because she did not believe it.
  The data was always correct. The form now keeps what was just saved on screen.

## Community

- **Leaderboard** scored on percentage of your own pledge, so a two-a-week user is compared
  fairly with a six-a-week user.
- **Opt-out for anyone**, which hides you from the board without hiding the board from you.
- **Kudos** with a fixed vocabulary of emoji and short lines, deliberately not free text.
- **Group challenges**: a shared collective target with days remaining, group progress, your
  own contribution, and a hide control.
- FIXED **The leaderboard is no longer public.** `get_leaderboard()` was callable by the
  `anon` role, so anybody holding the published anon key got all sixteen rows signed out.
  Tested, not assumed. Closed at the database and the page now redirects signed-out visitors
  to login. See `supabase/rpc_permissions.sql`, including the note about why revoking from
  `anon` alone silently does nothing.

## Reminders

- **One a day at most**, and none at all in a week where you have already hit your pledge.
- **Time defaults from chronotype**, set just before your window rather than inside it.
- **Copy varies by type and by framing**, forty distinct messages.
- **Five occasions**: due, short, missed, drifting, lapsed.
- **Nothing scolds.** Loss framing points at what is worth keeping, never at what was lost.
- **Two routes.** The dashboard card reaches everyone; web push reaches whoever grants
  permission. *Push needs VAPID keys and a cron schedule before it can send.*

## Feedback collection

All of this is new on 4 August, and all of it is deliberately not a chatbot. The only free
corner on a phone is already occupied by the rest timer, and a conversation collects rich
text from the few who would type and nothing from everybody else.

- NEW **Per-exercise load feedback.** Too easy, just right, too hard, one tap on the card as
  it collapses. Not good/bad: those record a mood, these name the adjustment. One row per
  exercise per day in `set_feedback`, matching the grain already used for `EXERCISE_LOGGED`.
- NEW **"Not for me"**, a separate and deliberately quieter control with three fixed reasons:
  do not fancy it, no kit for it, it hurts. The first two drop the exercise from the plan.
  The third drops it, says one sentence pointing at a GP or physio, and pointedly does not
  suggest a replacement, because the app cannot tell a niggle from a tear. Stored in
  `exercise_prefs` and applied on top of `buildWeek()` rather than inside it, so one plan per
  goal is preserved and undoing is a row delete.
- NEW **Floating feedback button** on every signed-in screen. Lifts clear of the rest timer
  on `/plan` rather than hiding, since that bar reserves 80px. Hidden only where it would be
  broken: the signed-out routes, where `/feedback` would bounce somebody to login.

## Appearance and accessibility

- **Light and dark**, dark by default, with a one-tap toggle top left on every screen and a
  three-way control in Settings including match-phone.
- **Per-type accent for each theme**, so type identity survives the switch and still passes
  contrast either way.
- **Contrast verified to WCAG AA** on both themes.
- **Reduced-motion respected** on the splash and on the session fanfare.
- **Tabular figures** everywhere, so counting numbers do not shuffle.
- **Custom icon set**, no emoji, so the app looks the same on every platform.
- FIXED **The text size control now works.** `ThemeSettings` called `pickText()`, which was
  never defined. Every tap on Large or Largest threw a ReferenceError and did nothing. It
  shipped broken in the commit titled "Yoga, password eye and big text" and a build will
  never catch it, because it is a runtime reference inside a click handler.

## Platform

- **Installable as an app** on Android, desktop and iPhone, with platform-correct
  instructions and a real install button where the browser allows one.
- **Opening splash** on a stale timestamp rather than a session flag, so it does not re-fire
  every time iOS discards the web view.
- **Service worker** for notifications.
- FIXED **Home screen icons are on black.** All four carried a `#0F1C31` background, the
  pre-rebrand navy that `lib/brand.js` says was removed everywhere else. Rebuilt by
  recovering the mark's per-pixel coverage and recompositing on black, so the anti-aliased
  edges survive. iOS caches these hard: an existing install keeps the navy one until it is
  removed and re-added.
- NEW **`/` is a decision, not a page.** Signed in goes to the dashboard, signed out to
  login. `start_url` stays `/` because it resolves correctly for both.

## Trust and admin

- **Data export.** Everything held about you, as JSON, on one button. Satisfies UK GDPR
  Article 20.
- NEW **Account deletion.** A typed DELETE confirmation, then the `delete-account` edge
  function. `profiles.id` cascades from `auth.users` and fifteen tables cascade from
  `profiles`, so one admin call removes the lot. `events` and `feedback` are SET NULL, so
  they survive anonymised rather than taking the product analytics with them. The user id
  comes from the caller's own verified JWT and never from the request body, which is the
  only rule in that file that matters.
- **Versioned disclaimer**, recording which wording was agreed and when.
- **Row level security on every table**, with all cross-user visibility going through
  audited functions. As of 4 August no `SECURITY DEFINER` function is reachable by `anon`.
- **Product event log** covering the whole funnel from signup to block end, with personality
  type recorded at the time of each event.

---

## Not finished

Ordered roughly by how much trouble it causes.

- **No undo for "not for me".** The delete policy exists and nothing calls it, so a mis-tap
  permanently removes a lift from somebody's plan. Needs a list in settings. Do this before
  anyone leans on the feature.
- **No testing-week flag on `set_feedback`.** On testing week there is no prescription, so
  "too heavy" means "I chose badly", which is a fact about the user rather than the
  programme. Both land in one column. Needs a `test_week boolean` and one prop passed down.
- **Web push** is written and needs VAPID keys, a Vercel environment variable and a `pg_cron`
  schedule. Instructions are in the header of the edge function. `delete-account` is
  deployed; `send-reminders` is not.
- **Age gate at signup.** There are under-18s on the platform. Needs deciding before the
  first stranger signs up.
- **Legal review of the disclaimer.**
- **Low-rep testers never progress past their test.** Documented in HANDOVER.md with the
  numbers. Mitigated by naming a rep range; the real fix needs a schema change.
- **The Captain and the Monk are 20 degrees apart** in hue, the tightest pair in the set now
  the Anchor has moved off orange. Measured on the rendered artwork, not the hex codes.
- **`metadataBase` is unset**, so Open Graph URLs resolve against localhost. Breaks the share
  card the moment a real domain is live.
- **The landing page is parked** at `app/welcome/page.js`, unlinked and unfinished. Nothing
  routes to it. It moves back into `app/page.js` when it is ready.
- **Five database indexes** drafted and unapplied on the original tables.
- **Two log conflicts need a person to decide.** Hampo-1978's Weighted Dips reads 3 reps
  where an earlier batch said 10; CatFisher's Plank reads 20 sec where an earlier said 45.
  Both may be the same prefill bug that cost the bench numbers.
- **`lift_maxes` is never recalculated.** `record_lift_max` only moves up, so a max survives
  its source rows being deleted and still drives the prescription. Currently consistent, but
  nothing enforces that.
- **No backups.** Supabase free plan. A day of data surgery on real training history was
  done with no safety net.
- **Type sizes.** A number of 9px and 10px labels, below any sensible minimum.
- **The character artwork is AI-generated** and probably carries no UK copyright. It is live
  on the assessment result, the type page and block end. A human redraw is what would fix
  that, and the Anchor's violet is a hue rotation of an orange render rather than a fresh
  one.
