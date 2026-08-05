# Vaeon Fitness — handover

Everything a new session needs to pick up development. Last updated 2026-08-04.

---

## START HERE, if you are a new session

Last worked on 4 August 2026. Everything below is in the working tree; **check with James
whether it is committed and pushed**, because this has now bitten twice. The accent bug was
reported as "committed but not changed" and was a deploy gap, and on 4 August a build failed
twice against a commit that predated the fix sitting on his disk. The build log is always
telling you the truth about what it was given.

**Do not treat a clean `esbuild` run as a build.** `esbuild --outfile=/dev/null` parses a
file and confirms the syntax. It does not resolve imports, so a file can be well-formed and
still reference three modules that are not there, which is exactly how the 4 August
deployment failed. If you cannot run `next build`, at minimum walk every relative and `@/`
import against the filesystem before you claim anything is verified.

**The single most important fact about this project.** Twelve to fifteen profiles, and only
four people have ever logged an exercise. The longest anyone has kept it up is three
separate days. A six-week test started on 30 July to find out whether any of this works. Do
not add features without asking whether they get somebody to session three in their first
fortnight, because that is the number that decides whether there is a business here.

**Read `FEATURES.md`** for what exists and **`GUIDE.md`** for how a user is meant to use it.
`FEATURES.md` was rewritten on 4 August and marks everything added that day.

**`CHARACTER-BRIEF.md` is now largely historical.** It specifies eight 3D animal mascots,
generated then redrawn. What actually shipped is a set of stylised robot characters cropped
out of a poster James generated, at 512px WebP in `public/characters/`. The brief's locked
style rules and the palette table are still correct and still useful. The animal casting and
the pilot instructions are not what happened. Do not commission eight animals off the back
of it without asking him first.

### Three things that will bite you

**1. The per-type accent colour. Do not "simplify" it.** It took three attempts and the
final shape is the only one that works. The dashboard writes the user's two hex codes into a
`<style>` block scoped to the page, keyed on `[data-accent]`, and CSS picks between them on
`data-theme`. There is no `var()` indirection and the server never chooses.

The two failed attempts, so nobody repeats them:
- Resolving the scheme server-side from a cookie. The cookie goes stale, the server picks the
  light colour, the inline script paints the page dark, and you get dark brown on black.
- Declaring `--accent: var(--type-dark)` on `:root` while `--type-dark` lives on `<main>`.
  **`var()` is substituted where a property is DECLARED, not where it is used.** It resolved
  against a `:root` with no `--type-dark`, fell through to the cyan fallback, and every type
  came out Vaeon cyan.

**2. The progression maths has a known characteristic, documented with numbers further down.**
Low-rep testers never exceed their week-one load across the whole block. Mitigated by naming
a rep range; the real fix needs a column to store the tested working load.

**3. Line endings are mixed and must be preserved per file.** Most files are CRLF, a dozen
are LF. Do not normalise. Check with `file` before and after any scripted edit.

### What is outstanding, in the order I would do it

1. **An undo for "not for me".** The delete policy is in `supabase/exercise_prefs.sql` and
   nothing calls it, so a mis-tap permanently removes a lift from a plan with no route back.
   Needs a list in Settings. Do this before anyone leans on the feature.
2. **A `test_week` flag on `set_feedback`.** On testing week there is no prescription, so
   "too heavy" means "I chose badly", which is a fact about the user rather than the
   programme. Both currently land in one column and will poison the signal the table exists
   to collect.
3. **Web push.** Written, not deployed. Needs VAPID keys, a Vercel env var and a `pg_cron`
   schedule. Instructions are in the header of `supabase/functions/send-reminders/index.ts`.
   The in-app reminder works for everyone regardless, so this is not blocking. Note
   `delete-account` IS deployed, so the functions directory now holds one of each.
4. **Age gate at signup.** Under-18s are on the platform. Needs deciding before the first
   stranger signs up.
5. **The Captain and the Monk are 20 degrees apart** in hue, measured on the rendered
   artwork rather than the hex codes. Tightest pair in the set now the Anchor has moved.
6. **`metadataBase` is unset.** Breaks Open Graph on the share card the moment
   `vaeonfitness.com` goes live.
7. **The landing page** is parked at `app/welcome/page.js`, unlinked and unfinished. Nothing
   routes to it and `/` now redirects: signed in to the dashboard, signed out to `/login`.
   It goes back into `app/page.js` when it is ready. Its imports are `../`, not `./`, which
   is what broke two deploys on 4 August when it moved a directory deeper.
8. **Two log conflicts need a person**, listed at the end of the 4 August session notes.
9. **Consider paying for Supabase.** Free plan means no daily backups, and a day of data
   surgery on somebody's training history was done without a safety net.

### Where I would push back on him

He moves fast and asks for polish while the retention number is flat. The colour, the theme,
the typography and the characters are all real improvements and none of them will get a
thirteenth person to log a session. The six-week test ends around 10 September. **The block
end report on 31 August is the first time the app has to prove its own argument**, and
nobody has ever seen that screen because no block has completed. That is the thing to watch,
not the next feature.

That said, be fair about where the value came from on 4 August. Almost every genuine bug
found that day came from his testers rather than from a plan: the chosen training days being
ignored, the phantom weight revert, hanging leg raises asking for seconds, yoga logging half
a session. Feedback from sixteen people found more than a day of feature work did. The
`feedback` table and the new `set_feedback` and `exercise_prefs` tables are the cheapest
instrument on this project. Read them before building anything.

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

**Dark is the default, and only an explicit "match phone" defers to the device.** Following
the system automatically sounds like the polite choice and is wrong here: Vaeon is a black
app, and a user whose phone happens to be light would open it for the first time into a
scheme nobody designed. Light is a choice somebody makes because they read it better, not
something that happens to them. The three-way control lives in Settings; a one-tap sun/moon
toggle sits **top left in the brand bar on every screen**, because the plan screen is where
reading in bad light actually bites and that is the screen you are on when it matters.

**Dashboard, simplified 2026-07-31.** Order of priority is unchanged: To do, then today,
then everything else. What changed is that it is now nine blocks instead of fourteen.

- The date label, the workout button and the block card were three stacked blocks all
  describing the same session. **They are one card now**, with block and week on it, because
  the block line is the answer to "why is today heavy".
- When the block is finished that card becomes the block end link. There used to be **two**
  separate "block complete" prompts on this screen fighting each other.
- The grace week was a bordered card to say one sentence about the number directly above it.
  It is a footnote under the stats now.
- The week's coaching guidance is a line of prose, not a card. It is a sentence, not an
  object.
- "Can't get to the gym today?" was a permanent amber banner asking a question whose answer
  is usually no. It is a destination, so it moved into the Elsewhere grid, along with Send
  feedback.

**Night and day.** `lib/theme.js`, `app/settings/ThemeSettings.js`, plus a `[data-theme="light"]`
block in `globals.css`. Three-way setting: match the phone, dark, light.

Not a cosmetic toggle. Around half of people have some astigmatism, and on a dark background
light text produces halation, where the glyphs bleed and blur. Preference splits roughly a
third each way. **For some users light is the only comfortable way to read this app.**

- **The preference is a COOKIE, not localStorage.** The dashboard picks a user's accent
  colour on the server during render, so the server has to know the scheme. An inline script
  in the head corrects the cookie against the device before first paint, so there is no
  flash.
- **The type palette already contained both halves.** Every `colors[0]` fails on a light
  background, 1.8:1 to 3.6:1. Every `colors[1]` passes, 5.5:1 to 11.5:1. So `colors[0]` is
  the dark accent and `colors[1]` is the light one, via `accentFor()`. Type identity survives
  the switch rather than being flattened to grey.
- **Nothing may hardcode a colour any more.** Every `#000000` background, `text-gray-*`,
  `bg-white/*` and raw `rgba(255,255,255,...)` was swept to a token. `lib/brand.js` chrome
  values are now `var(--brand-*)` strings, so inline styles follow the theme without any
  component knowing a theme exists. `BRAND.accent` stays hex because it is concatenated with
  alpha suffixes and `var(--x)0F` is not a colour.
- Contrast verified both ways. Light: text 19:1, muted 7.7:1, dim 5.3:1, accent 5.4:1. Dark:
  text 21:1, muted 7.8:1, dim 5.2:1, accent 11.6:1. `--brand-dim` was **#6B7280 and failing
  at 4.1:1**, which mattered because it carries the smallest type in the app.

**Still outstanding on accessibility.** The restyle added a lot of 9px and 10px tracked
uppercase labels. That is below any sensible minimum and no theme fixes it.

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

## Recent work (session of 2026-08-04)

Driven almost entirely by tester feedback rather than a roadmap.

**Applied to the live database.** These are not pending, they are done, on project
`wctsiafaiogyciqnmvad`. The `.sql` files in `supabase/` are the record, not the instruction.

- `set_feedback` and `exercise_prefs`, new tables with RLS and four policies each.
- `exercise_logs.distance_km`, `duration_min` and `side`, three new columns.
- `rpc_permissions.sql`. **Read the comment in that file before touching function grants.**
  `revoke execute ... from anon` reports success and does nothing, because Postgres grants
  EXECUTE to PUBLIC by default and `anon` inherits it. It has to come off PUBLIC first.
  Verify with `has_function_privilege()`, never with the statement succeeding.
- Note: `set_feedback` and `exercise_prefs` had shipped in code days before the tables
  existed. Both callers swallow failures on purpose, so nothing broke and nothing was
  collected. Committing a migration file is not running it.

**Deployed.** `delete-account` edge function, `verify_jwt` on. The user id comes from the
caller's verified JWT and never from the body, or any signed-in user could delete anybody.

**Brand change.** The Anchor moved from `#FFB020` amber to `#AE63F0` violet. It was 14
degrees from the Hunter in the palette and 6 degrees in the rendered artwork, so three of
eight types shared one wedge and were indistinguishable as orbs at 24px. `#FFB020` was also
the app's warning amber in twelve places, so an Anchor's own colour was the colour that told
them off. Those twelve are untouched. Both posters still show an orange Anchor and are now
wrong; the shipped render was recoloured by hue rotation rather than regenerated.

**Assets.** `public/characters/` holds sixteen WebP files, a full figure and a face crop for
each type, about 250KB for the set. Cropped from a poster, so they have their backgrounds
baked in and cannot be keyed out. That is why `TypeCharacter` frames them in a dark
medallion: dropped raw onto the light theme they are black rectangles.

Home screen icons were rebuilt on black. All four carried `#0F1C31`, the pre-rebrand navy.
**iOS caches these hard**: an existing install keeps the old one until it is removed and
re-added, so testers will need telling rather than assuming it did not work.

### The logging bugs, second half of the day

All four found by testers inside one evening. All four were long-standing, none were new.

**Duplicate exercise_logs, the worst of them.** `completeSet()` did a bare insert with no
guard, so every tap of "Completed as planned" appended another full batch of rows. 37 of 151
rows were surplus, going back to 29 July, across three users. A five set bench press had
fifteen rows. It now deletes that day's rows for that exercise before inserting, so a
re-complete is a correction rather than an addition. Scoped to the calendar day, not the
week, because a freestyle type can genuinely take the same session twice in a week.

**Both read paths keyed on array position rather than `set_index`.** With duplicates present
`sets[1]` could be the second copy of set one, which is how a card displayed 60, 25, 25.
`lastByExercise` and `weekLogs` both now slot by `set_index` and keep the newest row per set.

**Per-exercise completion never survived a reload.** The `done` map was React state seeded
empty on every load and explicitly wiped on tab change, so a session logged in the morning
looked untouched by evening. It is now rebuilt from `weekLogs`, which reads the week at
exercise level rather than day level. Related: an exercise already logged this week now
prefills from what was logged rather than from the prescription, because showing next week's
progression over a week you have already trained reads as the app having lost your work.

**The read path never learned about the columns the write path gained.** `distance_km`,
`duration_min` and `side` were added and written the same day, and the `select` was not
updated, so logged endurance work displayed nothing. There is a `time_text` fallback for
rows written before those columns existed.

### HYROX stations

- `stations[i]` was DayView local state keyed by index. Every day has one station so the
  index is always 0, and DayView is not unmounted on a day change, so Monday's box and
  Tuesday's box were the same box. Now keyed by day key plus station name.
- Stations gained `log: "time"` or `log: "rounds"`. A SkiErg or Row is one number you chase.
  Ten thirty-second rope intervals and a sled are not, and asking for "your time or score"
  on those produced an empty box people sensibly ignored. Rounds tick off; tapping the round
  you are on clears back to it.
- `dealt` started at zero on every build, so a four session week dealt the same four
  stations every week and `Weighted Lunge Walk`, fifth of five, was unreachable for a whole
  block. It now offsets by week number and the pool walks.

### Data migrations, and what they cost

Three ran, in this order, and **none of it is recoverable**: the project is on the Supabase
free plan, so there are no daily backups.

1. `dedupe_identical_exercise_log_rows` removed byte-identical repeats only. 17 rows.
2. `exercise_logs_newest_wins` resolved the remaining conflicting batches. James chose the
   rule. 20 rows. **It deleted the correct data on his bench**: 60/65/70/80/90 lost to
   20/25/25/25/25 logged sixty seconds later by the prefill bug above.
3. `restore_hampo_bench_and_incline_weights` put those weights back by UPDATE, since the rep
   counts matched and only the weights ever disagreed.

151 rows to 114, zero conflicts remaining.

**`lift_maxes` is deliberately NOT recalculated by any of this.** `record_lift_max` upserts
with `greatest()` and only ever moves up, so a max survives its source rows being deleted.
It happens to agree now, 114kg estimated from 90x8, but a future cleanup could easily leave
a max that nothing in the logs supports and it would still drive the prescription.

**Still unresolved, needs a human:** Hampo-1978's Weighted Dips reads 3 reps where an earlier
batch said 10. CatFisher's Plank reads 20 sec where an earlier batch said 45. Both have the
same shape as the bench and may be the same bug. Nobody has said which is real.

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

## Added 2026-07-31, later

**Password reveal.** `app/PasswordField.js`, used on login, signup and reset. Typing a
password blind on a phone keyboard is how people get locked out of an app they only joined
because a relative asked them to, and it is an accessibility issue as much as a convenience.
Both NCSC and NIST now recommend offering a reveal. Two details worth keeping: the button is
`type="button"` (a bare button inside a form submits, so the eye would have attempted a
login) and `tabIndex={-1}` so tapping it does not dismiss the mobile keyboard.

**Text size.** Three steps, scaling the root font size, in Settings next to the theme.
**This only works because every hardcoded `text-[9px]`, `text-[10px]` and `text-[11px]` was
converted to rem first** — an absolute px size ignores the root entirely, which would have
left the smallest labels untouched for exactly the people who need this. The same sweep
lifted the floor: nothing is below `0.6875rem` (11px) any more, which closes the accessibility
regression the restyle introduced. `.rule-label` moved off 9px too.

**Yoga.** A fourteenth goal with its own category and its own six-week ladder in
`YOGA_WEEKS`, because a yoga block progresses in seconds and depth rather than kilos.

- **The anchor is the hold you logged, not a max derived from it.** `workingHold()`
  multiplies week one directly, so the low-rep problem that affects the lifting ladder
  cannot happen here: there is no estimation step to get wrong.
- Week one prescribes nothing and asks for an honest hold. Weeks then run 1.15, 1.3, **0.85**,
  1.45, 1.6. Week four goes down on purpose: connective tissue adapts slower than muscle and
  a six-week ramp with no let-up is how somebody tears a hamstring in week five.
- `holdProgression` is passed **only for the yoga category**. Every other plan has timed work
  in it, and turning this on globally would silently convert every plank in the app into a
  percentage of your best plank.
- Holds are stored in `lift_maxes` in seconds. `record_lift_max()` uses `greatest()`, which
  is the right rule for a best hold as well as a best lift.
- All six sessions use Mobility, Skill or Recovery focuses, which sit in `NO_FINISHER`, so a
  yoga session never gets a burpee ladder bolted onto the end of it.
- Rounding is length-dependent. Five seconds is sensible on a minute-long pigeon and absurd
  on a fifteen second crow, where it produced a week one target *below* what was just logged.

---

## Progression maths, verified 2026-07-31

Traced end to end: testing week -> `estimateMax()` -> `record_lift_max()` -> `workingWeight()`.
The chain is sound. Exercise names match week to week because `buildWeek()` generates the
same week every week, so the `lift_maxes` lookup key is stable. Two findings.

**FIXED. The copy contradicted the engine.** This is a percentage-of-estimated-max system,
but the week-by-week `increase` strings promised "add 2.5kg upper, 5kg lower", which is
linear progression, a different system. Measured: the real week-two step is +2.5kg at a 50kg
max, +5kg at 100kg, +7.5kg at 150kg, and the deload-to-peak jump is +10, +20 and +30kg. The
copy now describes percentages.

**KNOWN, NOT FIXED. Low-rep testers never progress past their test.** Epley is calibrated
for moderate rep sets, so a heavy triple yields a modest estimated max, and since the ladder
tops out at 90 percent the prescriptions never exceed the tested load.

| Testing week set | Est 1RM | Week 2 | Week 6 | First week beating the test |
|---|---|---|---|---|
| 60kg x 8 | 76.0 | 57.5 | 67.5 | week 5 |
| 100kg x 5 | 116.7 | 87.5 | 105.0 | week 6 |
| 80kg x 3 | 88.0 | 65.0 | 80.0 | **never** |

Mitigated for now by naming a rep range: the testing card and week one both say 8 to 10 reps
stopping 2 short, rather than the old "a strong set". **If it keeps happening, the real fix
is to store the tested working load alongside `est_max` and anchor the ladder to that
instead of to a derived one-rep max.** That needs a column and a migration.

Also worth knowing: `record_lift_max()` does `greatest(existing, new)`, so a max only ever
climbs. One inflated test is permanent until the row is edited by hand.

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

---

## Added 2026-08-05: duplicate writes, the leaderboard, and week alignment

A sweep found that the logging fixes from 4 August were half applied and the data had
already re-corrupted. Nineteen of thirty `training_sessions` rows were surplus and the
leaderboard was running on them.

### What was actually wrong

**`completeSet()` got the delete-then-insert guard on 4 August. `logStation()` and
`finish()` did not.** Both were still bare inserts. `finish()` had written twelve
"Chest & Push" rows for a single Tuesday across forty eight minutes; `logStation()` had
put SkiErg and Row on three rows each with conflicting values, all after the migrations
that were supposed to have cleared exactly this.

**The guard that was added was racy.** Six identical `400m Repeats` rows were written at
06:00:38.860988 and .861710, 0.7ms apart: two concurrent calls, both deletes landing before
either insert. Nothing at the database level was stopping it, because the 4 August work was
data cleanup with no constraint behind it. "Zero conflicts remaining" stopped being true
thirteen minutes after the last migration ran.

**The leaderboard was wrong three ways and every input to it was client-writable.** Scores
exceeded 100 because the cap was applied before the pledge multiplier. `weeks` counted
rolling sevens from `block_start`, which defaults to the signup date, so a user three weeks
in carried a three times harder denominator than someone who joined yesterday. The
denominator used the raw pledge while the bonus floored it at two, so pledging one session
a week was the cheapest route to a full score. Separately, a plain `PATCH /rest/v1/profiles`
set your own `block_start`, `block_weeks` and `freeze_credits`. The three `lock_down_*_rpc`
migrations had secured the read path and left the write path open.

**The Wednesday bug James reported was one cause with two symptoms.** `weekLogs` was loaded
once and never updated after a write, so switching tab and back called
`doneFor(day, weekLogs)`, found nothing for today's key, and reopened every card just
completed. Tuesday stayed collapsed because Tuesday's rows were already in `weekLogs` at
load. The same stale map fed `loggedThisWeek`, so the reopened cards prefilled from the
prescription rather than from what was logged, which is why the exercises looked like a
different week.

### What changed

- `logStation()` and `finish()` now delete before inserting, and all three write paths hold
  an in-flight lock in a `useRef` map. A ref, not state, because state updates are batched
  and that is the window being closed.
- `completeSet()` and `logStation()` update `weekLogs` after writing.
- **`exercise_logs.log_date` and `training_sessions.session_date`**, with
  `exercise_logs_one_per_set` and `training_sessions_one_plan_session_per_day`. The session
  index is **partial, on `day_key is not null`**: Quick Log and the fallback workout insert
  without a `day_key` and two identical same-day walks are legitimately two rows. Quick Log
  is also the one path that surfaces insert errors to the user.
- **The client sends the local date** rather than relying on the UTC default. The delete
  guards used local midnight while the columns defaulted to the UTC date, so for anyone on
  BST the two windows did not coincide and a re-complete just after midnight missed the
  earlier rows and then collided with the index.
- **The delete no longer runs when there are no rows to put back.** A calibration week seeds
  the per-side boxes empty and empty sides are skipped, so this could wipe an exercise's
  history, insert nothing, and tick the card green. Delete and insert errors are now checked
  and the UI no longer claims success on a failed write.
- `get_leaderboard()` rewritten: capped at 100, Monday aligned, pledge floored at two in the
  denominator, commitment demoted to a tiebreak. Verified by recomputing every user's score
  from raw rows.
- `profiles` trigger protecting `freeze_credits` and clamping a future `block_start`.
  `block_start`, `block_weeks` and `block_number` stay writable because four legitimate
  paths write them (`blockend`, settings twice, onboarding). `block_weeks` is bounded 4 to 12
  by a CHECK instead. `settle_streak_freezes()` sets `vaeon.system_write` before spending.
- All 44 RLS policies rewritten with `(select auth.uid())`. `record_lift_max` lost the PUBLIC
  and anon grants the three lockdown migrations had missed.

### Plan content

- **Battle Ropes replaced with Slam Balls.** Ropes are the one station a normal commercial
  gym often does not have.
- **Sled Push & Pull logs distance, not rounds.** It was the odd one out next to SkiErg and
  Row, which hand you a number to chase.
- **`spreadDays()` and `varyExercises()` in `buildWeek()`.** Two goals used to mean two
  nearly identical leg days back to back: hyrox plus strength at four sessions put a five by
  five back squat on Wednesday and again on Thursday, with RDL and Leg Press alongside.
  Days are now ordered by least overlap, then anything still repeating is substituted by
  movement pattern. Verified across 5,880 goal and session-count combinations: zero adjacent
  repeats, zero exercises appearing three or more times, zero empty days, zero duplicate
  day titles.

### Week alignment, and why it matters for the six week test

`currentWeekIn()` and `currentWeek()` counted rolling sevens from `block_start`, so a user
who joined on a Tuesday got a new plan week every Tuesday while `weekLogs`, the dashboard,
the streak maths and the leaderboard all ran Monday to Sunday. **Both are now Monday
aligned.** The visible symptom was the plan changing mid-week. The one that matters for the
test is that adherence was being measured against a boundary the prescription did not share,
so week four of the plan straddled weeks four and five of every number used to judge it.

### Still open

- **The plan page changes are not deployed.** Every `training_sessions` row still has a null
  `day_key`, so the partial index currently indexes nothing. First thing to confirm after a
  deploy: a new row arrives with a non-null `day_key`.
- **`weekLogs` loses the left side of per-side holds.** Both the loader and the post-write
  update key by `set_index`, and a per-side set writes two rows sharing one index, so left is
  overwritten by right. The database is correct, the in-memory map is not. Yoga prefill only.
- **Gym ready users can wipe a block by naming two blocks the same.** `GymDayView` collects
  free-text titles and calls `completeSet` per block, so two blocks with one title mean the
  second delete removes the first one's rows.
- **A legitimate block restart still resets the leaderboard divisor to one**, which makes a
  full score easier. Not an exploit, it is the restart feature, but a weekly leaderboard
  would remove the lever entirely and would also fix the thirteen-of-seventeen-on-zero
  problem. Product decision, not taken.
- **The mechanical RLS rewrite recreates every policy as PERMISSIVE.** None were RESTRICTIVE,
  so nothing was lost, but do not reuse that script as-is.

---

## Added 2026-08-05, later: weekly leaderboard and a testing week that can be trusted

### The board is now weekly

`get_leaderboard()` scores sessions **this Monday week** against your pledge, capped at 100.
Two reasons, and the second matters more.

The block board divided by weeks elapsed since `block_start`, which is client-writable and
which restarting a block legitimately resets to one. That made a full score easier and there
was no way to close it without penalising a genuine restart.

The product reason: thirteen of seventeen people were sitting on 0.0, several looking at a
zero they earned a fortnight ago and could not move. This app's own copy says shame after a
lapse predicts deleting it, so a board that permanently ranks people by a bad fortnight was
the most demotivating surface in the product. Everybody starts level on Monday.

`weeks_kept` carries the consistency signal instead: completed weeks in the current block
where the pledge was met. No client write changes what happened in a finished week. Returned
columns changed, so `app/leaderboard/page.js` was updated with it (it was the only consumer,
and `r.weeks` / `r.block_weeks` would have rendered undefined).

### The testing week

The known-not-fixed item from 31 July, now understood properly. **The tempting fix was
wrong and was rejected on the numbers.**

Anchoring week one to the tested load so the ladder climbs past it was modelled across five
realistic tests. It prescribes a week six load **above the lifter's true one-rep max in four
of the five**, including for somebody who tested correctly at eight reps. It is not a fix,
it is an injury.

The ladder is not broken. If you can lift 80kg three times your one-rep max is about 85kg,
90 percent of that is 76kg, and a correct six week block never asks you to beat that triple.
That is the ladder being right about a test that was too heavy.

So the fix is at the point of testing:

- **`estimateMax()` is now rep-aware.** Brzycki at five reps and under, Epley above. Epley
  alone drifts high on short sets, which is what fed the problem. They agree closely in the
  8 to 10 range the testing week actually asks for, so nothing changes for anyone who
  followed the instruction.
- **`testQuality(weight, reps)`** returns null for a usable test and, for anything outside
  6 to 12 reps, a reason plus a suggested load. Wired into `completeSet` and shown as a card
  on the plan page. It does not block: the set is logged and the number stands if they meant
  it. It is the difference between the app knowing the block will feel light and the user
  finding out in week six.
- **`lift_maxes.tested_load`, `tested_reps`, `tested_at`** and a new `record_lift_test()`
  RPC, used in place of `record_lift_max()` during the testing week. `est_max` keeps its
  `greatest()` rule; the test details always reflect the most recent test, because "how did
  you arrive at this" should not be frozen at whichever attempt was heaviest.

Verified behaviour:

| test | est 1RM | week 6 | beats the test | flagged |
|---|---|---|---|---|
| 60 x 8 | 76.0 | 67.5 | week 5 | usable |
| 70 x 10 | 93.3 | 85 | week 3 | usable |
| 100 x 5 | 112.5 | 102.5 | week 6 | too heavy, try 85kg |
| 80 x 3 | 84.7 | 75 | never | too heavy, try 62.5kg |
| 50 x 15 | 75.0 | 67.5 | week 1 | too light |

### Still open after this pass

- **Nothing is deployed.** All of today's client work is in the working tree only.
- Turn on **leaked password protection** in the Supabase auth settings. It is the one
  security advisor warning that is not intentional, and it is a toggle.
- The four remaining `authenticated_security_definer_function_executable` warnings are
  correct by design: `current_challenge`, `get_leaderboard`, `get_my_kudos` and
  `settle_streak_freezes` all exist to be called by signed-in users and all scope internally
  on `auth.uid()` or opt-in.
- The per-side `weekLogs` overwrite and the gym-ready same-title block wipe, both described
  in the previous section, are still open.
