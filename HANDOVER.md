# Vaeon Fitness — handover

Everything a new session needs to pick up development. Last updated 2026-07-30.

---

## What it is

A training app that records what you actually do and reports whether it is working.
Solo build by James Hampton. Live, with roughly a dozen real users including family
testers. Not launched publicly.

The product argument, which shapes most decisions: most training apps hand you a
workout and never tell you whether it worked. Vaeon profiles you, tests you in week
one, builds from your own numbers, and scores adherence rather than load.

---

## Stack

- Next.js 16.2.10, App Router, Turbopack. **`AGENTS.md` warns this version differs
  from model training data. Read `node_modules/next/dist/docs/` before writing
  anything version-sensitive.**
- React 19, plain JavaScript, no TypeScript
- Tailwind v4 (`@theme inline` in `app/globals.css`, not a config file)
- Supabase: auth plus Postgres 17. Project "Intent", `wctsiafaiogyciqnmvad`, eu-west-1

---

## House style

Match what is there. It is consistent and deliberate.

- `function () {}` expressions, not arrow functions, in most files
- Inline `style={{ }}` objects wherever colour is involved, because accents are
  computed per user at runtime and cannot be Tailwind classes
- Plain `<a href>` for navigation, not `next/link`. **Every navigation is a full page
  load**, so nothing survives in React state between screens
- Comments explain *why*, at length, especially where a decision looks odd. This
  codebase is unusually well commented. Keep that standard up
- British English, no em dashes
- **Files are CRLF.** Preserve it

---

## Core concepts

**Eight personality types** (`lib/personality.js`). Three dimensions, twelve
statements, eight types, each owning a colour pair. **A user's accent colour is their
type.** This is a product feature, not theming — do not flatten it during a rebrand.
The no-type fallback is Vaeon cyan.

**Goals** (`lib/training.js`). Thirteen plus `gymready`. `buildWeek(goalIds, sessions)`
picks days, interleaving a second goal if present.

**Blocks.** Six weeks, eight for Gym ready. Stored per user as `profiles.block_weeks`,
deliberately not derived from the goal. Week one is a testing week: weighted lifts with
no known max get no prescribed weight, you find and log your own, and that becomes the
baseline.

**Gym ready.** The fourteenth goal, for people who already have a PT. Freeform logging,
eight-week blocks, no prescriptions. Vaeon counts, the coach coaches. `lib/gymready.js`,
`app/plan/GymDayView.js`, `app/plan/GymBlock.js`.

**Finishers.** Every non-conditioning session ends with one ~10 minute finisher, dealt
one per day and cycled. HYROX draws from its own stations, everything else from a
general pool. Optional — does not gate session logging or scoring.

**Leaderboard.** Scores adherence (sessions logged against sessions pledged), not
weight moved. `get_leaderboard()` in Postgres.

---

## Brand

Black `#000000` background, white text, cyan `#22D3EE` to electric blue `#3B82F6`.

**Type.** Space Grotesk for display, the wordmark and all numbers; Inter for body. Both via
`next/font/google` in `app/layout.js`, exposed as `--font-display` and `--font-body`. The
body font was Arial, and because the wordmark in `Brand.js` is live text rather than a
traced path, **the logo itself was rendering in Arial**. That was most of why the app never
looked like its own mark. `font-variant-numeric: tabular-nums` is set on `body`: this app is
mostly numbers, and proportional figures make the rest timer and the stat tiles visibly
shuffle their own digits.

**Radius.** `--r-sm` 2px, `--r-md` 4px, `--r-lg` 6px. Was a flat 16px everywhere with full
pills on buttons. The mark is built from mitred angles with no curve in it anywhere, so soft
rectangles fought it on every screen. **Nothing is a pill any more.** Do not reintroduce one.

**Weight.** One bold element per card, and hierarchy comes from tracking, size and colour
rather than weight, which is what the lockup does. Space Grotesk is loaded at 300/400/500
only; there is deliberately no bold available for the display face.

**The rule label.** `.rule-label` in `globals.css` is the lockup's own device, a tracked word
between two hairlines, reused as the section heading. It is the cheapest way to make an
ordinary screen feel like it came from the same place as the logo.

**Icons.** `app/Icon.js`. Roughly eighteen outline SVGs on a 24 unit grid, 1.5 stroke,
`strokeLinejoin: miter`, inheriting `currentColor` so they take the user's type accent. They
replaced emoji, which rendered differently on every platform (so the brand looked like a
different product on Android), imported a dozen unchosen colours into a two-colour app, and
were round and soft next to a mark made of thin mitred bands.

Tokens live in **two mirrored places** — `lib/brand.js` (JS, for inline styles) and
`app/globals.css` (CSS vars plus Tailwind `@theme`). **Change both together.**

Chrome only. Per-type accents stay in `lib/personality.js`.

Logo is `app/Brand.js`: an outlined V band with a solid notched chevron, traced from
the real artwork onto a 226x188 box. `BrandLockup` has two shapes — compact (mark plus
"Vaeon") for the 34px bar, and `full` (adds the rule-flanked FITNESS line) for login,
signup and splash.

**Dashboard order, and why.** Top to bottom: who you are, the To do group, today's date as
a rule label, the workout button, where you are in the block, the group challenge, then
everything else. The rule is that **tasks which end sit above the action, and context which
never ends sits below it**. `app/dashboard/ToDo.js` groups the setup jobs under a counted
heading so they read as a list to clear rather than permanent furniture; each disappears
when done. The block line moved up from near the bottom because it answers "why is today
heavy", which was four scrolls from today.

`ReminderCard.js` is **deleted**. It restated what the workout button already said and gave
no action. The copy engine behind it is untouched: `lib/reminders.js` still drives the push
notification and the sender, so the miss response moved off the dashboard rather than being
lost.

**Restyle status: complete.** Every screen is on the new system. The mechanical rules, so
a new screen matches without anyone having to guess:

- **Radius** `rounded-md` for cards and buttons, `rounded-sm` for chips and small controls,
  `rounded-lg` only for a full-bleed panel. **No `rounded-full` except one**, the placeholder
  standing in for a missing TypeOrb on the leaderboard, which has to be a circle because the
  real orbs are.
- **Borders** hairline `border` with `border-brand-line`. `border-2` no longer appears
  anywhere; emphasis comes from colour, not from thickness.
- **Surfaces** `bg-brand-surface`, not `bg-white/5` written out by hand.
- **Weight** `font-bold` appears nowhere in `app/`. Headings and buttons take `font-display`,
  which is Space Grotesk at 400. This is not only taste: the display face is loaded at
  300/400/500 only, so a `font-bold` on one makes the browser synthesise a fake bold and it
  looks smeared.
- **Gradients are gone.** Every primary button, session header and progress bar was a
  cyan-to-blue sweep. A gradient is two colours pretending to be a brand and the mark is one
  flat weight of ink. `brandGradient()` in `lib/brand.js` is now unused and marked
  deprecated rather than deleted, so a call site added from memory gets read instead of
  quietly reintroducing it.
- **Emoji: zero.** Audited across every file.
- **The type orbs are exempt and stay three-dimensional.** Radial gradient, specular
  highlight, contact shadow. They are not chrome, they are the product: the one object that
  belongs to a person, in a colour pair nobody else on the board has. Flattening them to
  coloured discs would turn the whole argument for this app into a status dot. They do not
  fight the logo either, because the mark is white on black and never coloured while the orb
  is coloured and never white. `app/TypeOrb.js` carries this in a comment, since the obvious
  reading of "no gradients" is to flatten them next time.
  The assessment screen used to carry its own near-identical copy of the orb, which is
  exactly how one of two implementations ends up flattened and the other does not. It is
  deduped: there is now one component.

**Verifying a build locally will fail on fonts.** This sandbox has no route to Google Fonts,
so `next/font` cannot fetch at build time here. Vercel can. To check a build, stub the two
font calls in a throwaway copy; do not change them in the repo.

---

## Database

**`supabase/schema-live.sql` is the authoritative snapshot**, read out of `pg_catalog`
on 2026-07-30. The older hand-written `schema.sql` is incomplete and predates several
tables.

Ten tables, all cascading off `profiles`, which cascades off `auth.users` — so deleting
an auth user cleans up everything. `feedback` is `set null` instead, anonymising rather
than destroying.

RLS is on everywhere and every policy is "your own rows only". All cross-user
visibility goes through three `SECURITY DEFINER` functions: `get_leaderboard()`,
`get_my_kudos()`, `record_lift_max()`. `get_recent_pbs()` exists but is dead code.

Migrations are dated files in `supabase/`. Each carries an APPLIED header. Add new ones
the same way and update the snapshot, or it drifts.

---

## Recent work (session of 2026-07-30, second half)

The trigger was reading the live database rather than the handover. Twelve profiles,
**four people have ever logged an exercise**, the longest any single user has kept it up
is three separate days, and the four earliest signups logged nothing at all in ten days.
Every item below follows from that.

- **Events** (`supabase/events.sql`, `lib/events.js`, `app/Track.js`). Append-only product
  log. Working out the numbers above took a hand-written four-table join, which is a
  strange position for an app whose entire argument is that it tells you whether things
  are working. Instrumented across signup, assessment, onboarding, plan, logging,
  leaderboard, progress, block end, install and reminders. Type and framing are
  denormalised onto every row so a later retake cannot rewrite history.
  **Every function swallows its own errors.** Instrumentation must never break what it
  measures.
- **Reminders** (`supabase/reminders.sql`, `lib/reminders.js`, `lib/push.js`,
  `public/sw.js`, `app/dashboard/ReminderCard.js`, `app/settings/ReminderSettings.js`).
  Send time defaults from `chronotype`, which had been collected since the assessment
  shipped and used for nothing. Copy varies by type and by framing.
  **Two routes, and the in-app one is the important one:** the dashboard card needs no
  permission, no install and no third party, so it reaches everyone, whereas push reaches
  only people who accept a prompt and, on iOS, only people who installed the PWA first.
  The card deliberately stays silent on the "due" occasion and speaks on the recovery
  occasions, because a missed session is the moment people actually churn.
  **Nothing in the copy scolds.** Shame after a lapse predicts deleting the app; there are
  under-18s here; loss framing points at what is worth keeping, never at what was lost.
- **Personality now changes the product, not just the paint.** `POLES`, `isFreestyle()`
  and `isSolo()` in `lib/personality.js`.
  - Freestyle types (Hunter, Gladiator, Wanderer, Spark) get the week as a pool: they land
    on the next session they have not done rather than on today's weekday, tabs are named
    by session with a tick on anything completed. Same sessions, same progression, same
    adherence maths. Only who decides the order changes.
  - Leaderboard is **opt-out for everyone**. `profiles.leaderboard_opt_in` is nullable;
    null means never asked and you appear. Solo types (Architect, Monk, Hunter, Wanderer)
    get a plainly worded offer to step off, in their own type's terms, until they choose
    either way. Hiding hides you **from** the board, not the board from you: read access
    and kudos both survive.
    An interim version had Solo types hidden by default and it was wrong twice. It left
    five of twelve on the only social surface in the app, and **a type is a description,
    not a permission slip** — preference is not consent, in either direction.
- **The type screen stopped lying.** The `plan` strings promised classes, meet-ups,
  partner workouts, scheduled group sessions and head-to-heads, none of which exist, and
  promised four types a flexible menu before handing them a fixed rota. Rewritten to
  describe what ships. "Variety is the plan" is gone: it told the type least inclined to
  repeat a session that repeating was optional, and overload does not work that way.
- **Two bugs found while building.** `due_reminders()` originally measured staleness from
  `exercise_logs` alone, which would have told a Quick log-only user they had lapsed while
  they were training four times a week (one live user is exactly that). And meeting your
  weekly pledge now outranks staleness, so front-loading a week no longer reads as
  drifting.

- **Streak freeze** (`supabase/streak_freeze.sql`, `lib/plan.js`, dashboard card). One
  grace week per block. A streak that resets to zero for one bad week punishes illness,
  travel and ordinary life, and the fear of losing a long run is itself a reason to stop
  trying. Spent automatically on a completed short week **that interrupts a kept one**, so
  a credit is never burned on somebody who had no streak to protect. Frozen weeks count
  toward the streak but **not** toward `perfectWeeks`, because achievements should mean
  what they say. The card shows the credit whether or not it has been used: half the value
  is not being afraid of losing the streak in the first place.
- **Previous-performance autofill** (`app/plan/ExerciseCard.js`). What you actually did
  last time, per set, with "3 days ago". Precedence is prescription first, last time
  second, plan target third, so the coaching still leads but the gaps where people were
  being asked to remember unaided — testing week, bodyweight reps, timed holds — now fill
  themselves. Swapped exercises show no history on purpose: telling somebody doing park
  bodyweight squats that they did 80kg last time is worse than telling them nothing.
- **Rest timer** (`app/plan/RestTimer.js`). **Nothing counts down.** The only state is an
  end timestamp in `localStorage`, and the display is derived from `end - now`, so a
  throttled background tab, a locked phone and a full page navigation are all free. This
  is the loudest complaint lifters have about workout apps and it is worth keeping built
  this way. The service worker fires a notification at the end where it can.
- **Group challenge** (`supabase/challenges.sql`, `app/dashboard/ChallengeCard.js`).
  Collective target, everybody in, no membership table. A ranking says "you are seventh";
  a challenge says "we are two off, somebody do one", and for a group who are mostly one
  family the second is what actually gets a text sent. A first one is seeded: eight
  sessions in a week, set deliberately low because a challenge nobody reaches teaches
  nothing. Hidden users count toward the total but are not named.
- **Data export** (`app/settings/ExportData.js`). Every row held about a person, as JSON.
  Closes the UK GDPR Article 20 portability obligation and a chronic category complaint in
  one small component.

---

## Recent work (earlier session)

- **Rebrand.** Navy/teal to black/cyan across 25 files, plus the token layer that did
  not previously exist. Per-type accents preserved; the no-type fallback moved off The
  Captain's teal
- **Opening splash** (`app/Splash.js`). Black card, "Welcome to", lockup. Fires on a
  30-minute stale timestamp in `localStorage`, not a session flag — iOS discards the web
  view when you switch apps, which made session flags re-fire constantly
- **PWA.** Manifest, four generated icons, and `app/InstallPrompt.js` — real install
  button on Android via `beforeinstallprompt`, step-by-step Share instructions on iOS
  because there is no API there
- **Disclaimer** (`app/Disclaimer.js`, `/disclaimer`, settings, signup gate). Acceptance
  is versioned, not boolean. **UK law: you cannot exclude liability for personal injury
  caused by negligence.** Do not let anyone "strengthen" this into something void
- **Finishers** reworked from a five-item menu on two days to one per session
- **Unit fixes.** Runs were prefilling 1200 into a box labelled "seconds". Planks read
  "3 x 45". Freestyle users were shown "Barbell Back Squat" with a kg box
- **Leaderboard bug.** `coalesce(block_start, current_date)` meant a null block start
  moved forward nightly, so those users could never accumulate anything. Backfilled,
  fallback chain fixed, column defaulted

---

## Open items

**Product**
- Age gate at signup. There are under-18s on the platform (family, supervised). Needs
  deciding before the first stranger signs up — Children's Code, and minors cannot be
  bound by the disclaimer
- Legal review of the disclaimer
- Body font is still Arial, and `globals.css` referenced an undefined `--font-geist-sans`

**Reminders, to finish**
- `supabase/functions/send-reminders/index.ts` is written but **not deployed**. It needs a
  VAPID key pair set as edge function secrets, `NEXT_PUBLIC_VAPID_PUBLIC_KEY` in Vercel,
  and a `pg_cron` hourly schedule. Full instructions are in the header of that file.
  Until then the in-app reminder works for everyone; only push is missing
- The copy tables are duplicated between `lib/reminders.js` and the edge function, because
  an edge function cannot import from the Next app. Change one, change both

**Database, before any launch**
- No secondary indexes on the original ten tables. Five `create index` statements are
  drafted in the gaps section of `schema-live.sql`. `events` and `push_subscriptions`
  carry their own already
- Profiles are created client-side on signup, so an interrupted signup orphans an auth
  user. A trigger on `auth.users` would close it
- Drop `get_recent_pbs()` or find it a home

**The six-week test, starting now**
- The events table exists to answer five questions: where the funnel leaks, whether people
  come back, **whether type predicts adherence or is decoration**, whether reminders work,
  and whether freestyle types behave differently now the plan stops pretending. Decide the
  queries now rather than at week six
- `type_feedback` has two rows. Ask everyone at block end whether their type still sounds
  like them. If types do not separate on adherence, the model is decoration and that is
  worth knowing before more is built on it
- `assessment_results.goals` is an empty array on all thirteen rows and is written as `[]`
  by the assessment. Populate it or drop it
- Nobody has ever seen `app/blockend/page.js`. The earliest block completes 31 August. The
  risk is not that it breaks, it is that it is empty, because almost nobody logs enough to
  fill it

**Marketing**
- Canva explainer deck `DAHQwUUrgIk` is built but waiting on the Vaeon brand kit
  (`kAHQwFp29_E`) being updated to black plus the cyan/blue accents. Regenerate after
- A second video covering the community half: kudos, leaderboard, coaching in your
  voice, block-end report, Gym ready
- Script: `vaeon-explainer-script.md` (outputs folder, not the repo)

---

## Gotchas

**Do not run `git` from a Linux sandbox against this repo.** It creates
`.git/index.lock` which the mount will not let you unlink, and GitHub Desktop then
refuses to commit until the user deletes it by hand.

**Git isn't on the user's PowerShell PATH.** GitHub Desktop bundles its own. Ask him to
commit in the GUI rather than handing him git commands.

**CRLF.** `git diff` in a Linux sandbox reports all 54 files as changed. Use
`--ignore-all-space` for the truth.

**`node_modules` is not installed.** To verify a build, copy `app`, `lib`, `public` and
the config files to `/tmp`, `npm install` there, and run `npx next build`. Do not
install into the repo.

**Canva's AI rewrites your copy every single time.** It turned "the plan builds itself
around it" into "achieve optimal results with personalised guidance", invented six
leaderboard cards that were never briefed, and dropped a whole scene. Always budget a
repair pass after generating.

**Auto-finish** in `DayView` fires when every exercise card is collapsed. It used to
also require three stations logged, which quietly made an optional extra compulsory.
Do not reintroduce that coupling.
