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

---

## Added 2026-08-06: the prefill bug, per-set overload, and the block review

### Every input box was one day stale, matched by position

James reported Back Squat prefilling numbers he had never squatted, Romanian Deadlift with no
target at all, and Leg Press making no sense against what he lifted. All three were one bug.

`DayView` rendered `<ExerciseCard key={i}>`, the array index. `ExerciseCard` seeds its input
boxes in a `useState` initialiser, which runs **only on mount**. React sees the same key
across a day change and reuses the component, so the boxes kept the previous day's values
while every label around them recomputed from props and stayed correct. That is why the
cards looked right and read wrong.

Matched exactly against his data:

| Friday card (st-squat) | index | showed | which is Thursday's (st-bench) |
|---|---|---|---|
| Back Squat | 0 | 80, 90, 90 x 5 | Barbell Bench Press |
| Romanian Deadlift | 2 | 0, 0, 0 x 5, 5, 8 | Weighted Dips |
| Leg Press | 3 | 40, 50, 50 x 10 | Barbell Row |

Now keyed `day.key + "|" + ex.name`. **This is the same bug and the same fix as the HYROX
stations, which were repaired on 4 August in the same file.** The exercise cards were missed.
Worth checking any other `key={i}` on a component holding seeded state.

### "8 of 4 this week"

A true number reading as a broken one: `done` was the raw session count while the score was
already capped, so the two disagreed on screen. `get_leaderboard` now returns `done` capped
at the pledge and the overshoot separately as `extra`, so the card reads "4 of 4 this week
+2". This is now the same definition of a full week that `settle_streak_freezes` and
`weeks_kept` use, which is what James asked for.

Two pre-deploy rows with a null `day_key` were also cleared: each duplicated a session
recorded properly the same day with a `day_key`. The genuine 4 August session and the old
20 July quick log were matched on note and date and left alone.

### Progressive overload on every set

`workingWeight()` returned one number and the card put it in all five boxes, so a five by
five squat read "85, 85, 85, 85, 85". Nobody lifts like that. James logged 60, 65, 70, 80, 90.

`workingSets()` now returns a ramp: the top set is the prescription and earlier sets climb to
it from 70 percent. Week one for his squat comes out **60, 65, 72.5, 77.5, 85** against the
60, 65, 70, 80, 90 he actually did, which is about as good a check as this gets.

`blockProjection()` returns the top set for all six weeks, so the card shows "Week 6 of this
block: 107.5kg" under the prescription. Week one is supposed to feel light and now says why.

### The end of week review

`app/plan/BlockReview.js`. Fires on the block week rolling over, once per week, dismissal
stored per week number so next week's still appears. Shows every lift as last week's top set
against where week six lands, then flags what is reading easy or hard via `readsAs()`.

**No switch-exercise button, deliberately.** A lift reading hard for one week is almost always
the programme working, and an app that answers a hard week by suggesting you drop the movement
teaches people to trade difficulty for novelty. "Not for me" already exists on the card itself
as a considered decision.

`readsAs()` compares the prescribed top set with the heaviest logged, and nothing else,
because reps and bar speed are not in the data. Three answers, wide thresholds, worded as a
prompt to look rather than a verdict.

### Worth knowing before the block starts properly

- **His bench test was 100kg for 5, which `testQuality()` flags as too heavy.** Week six tops
  at 102.5kg, so he barely beats the test. This is the low-rep problem working as documented,
  and it is now visible at the point of testing rather than in week six.
- **Wednesday and Friday share Back Squat, Romanian Deadlift and Leg Press.** Not adjacent, so
  the variance pass allows it, and squatting twice a week is good programming. But Friday is
  currently Wednesday minus two exercises, and both days prescribe the identical ramp. Real
  programmes vary intensity between a week's two squat days (a heavy day and a lighter,
  higher-rep day). Tightening `varyExercises` to cap shared exercises against **any** earlier
  day in the week, not just the previous one, is the obvious next step and was not done.
- Still not deployed.

---

## Added 2026-08-06, later: heavy and volume days

The last gap in the block. After the variance pass, James's week still put Back Squat,
Romanian Deadlift and Leg Press on both Wednesday and Friday with an identical prescription.
Squatting twice a week is good programming. Squatting the same weight for the same reps
twice is one session run twice, and the second one is where people go flat.

`assignIntensity()` in `lib/training.js` tags a repeated lift `heavy` on the day prescribing
the most sets (ties to the earlier day) and `light` on the other. The light day carries more
reps at a lighter bar. `LIGHT_DAY_LOAD` in `lib/progression.js` is 0.80, and `workingSets()`
and `blockProjection()` both take the intensity, so the split runs through all six weeks
rather than being a week one cosmetic.

His week now reads:

| lift | heavy day | volume day |
|---|---|---|
| Back Squat | Wed 5 x 5, top 85kg | Fri 5 x 8, top 67.5kg |
| Romanian Deadlift | Wed 4 x 8, top 85kg | Fri 3 x 10, top 67.5kg |
| Leg Press | Wed 3 x 15, top 105kg | Fri 3 x 15, top 85kg |
| Barbell Bench Press | Tue 5 x 5, top 80kg | Thu 5 x 8, top 65kg |

Two things it deliberately does not do.

**Only bare rep counts are split.** A plank labelled "heavy day" is nonsense, so anything
prescribed in seconds, metres or "per side" is left exactly as authored and never tagged.
`splittable()` enforces this.

**Rep counts snap to values people actually write.** Plain +3 produced elevens and thirteens,
which look like a bug even when the arithmetic is right. `TIDY_REPS` snaps to 6, 8, 10, 12 or
15, and `Math.max(best, n)` guarantees the volume day never prescribes fewer reps than the
heavy day. Verified against every rep count that exists in the content: 3→6, 5→8, 6→8, 8→10,
10→12, 12→15, 15→15, and 20, 25, 40 pass through untouched.

`BlockReview` lists a split lift once, on its heavy day. Two rows for one movement showing
two different numbers reads as a contradiction in a summary.

Swept across all 5,880 realistic goal and session-count combinations: 0 adjacent repeats,
0 exercises appearing three or more times, 0 empty days, 0 duplicate day titles, 5,496
intensity tags across 1,200 weeks, and **0 light days without a matching heavy day**, which
is the invariant that matters. Build clean, 20 routes.

Still not deployed.

---

## Added 2026-08-06, corrected: the prescription was rep-blind

James reported that Friday's volume day was carrying over less than he had lifted on
Wednesday. He was right, and the cause was worse than the symptom.

`workingWeight()` multiplied an estimated one-rep max by the week's percentage and **ignored
the prescribed rep count entirely**. A percentage of a one-rep max means nothing until you
say how many times you intend to lift it, so the same formula failed in opposite directions
depending on the exercise:

| lift | he logged | old week 6 | verdict |
|---|---|---|---|
| Back Squat, volume day, 8 reps | 90kg x 10 | 85kg | below what he already did |
| Leg Press, heavy day, 15 reps | 100kg x 15 | **135kg** | thirty five percent beyond his test |

Low-rep lifts came out far too light, high-rep lifts came out impossible, and the flat
`LIGHT_DAY_LOAD = 0.80` stacked on top of the first failure to produce the number he
reported.

### The fix

`repPct(reps)` is the **exact inverse of `estimateMax()`**, so the model round-trips: lift W
for R reps and full effort prescribes W for R reps back. Verified exact on every lift in his
log (90x10, 100x15, 100x5, 60x8, 50x6).

`weekFactor(pct)` rescales the ladder from "fraction of a one-rep max" to "fraction of what
you proved in the test", mapping the deload to 0.80 and week six to 1.05. Without this the
rep-aware base could only ever equal the test and the block could not overload at all.

`LIGHT_DAY_LOAD` dropped from 0.80 to 0.95. The twenty percent cut existed to make the volume
day easier when both days were prescribed from the same rep-blind number. Now the volume day
is lighter for the correct reason, because it asks for more reps, and only needs a small trim
to stay submaximal.

`repsFrom()` parses the prescription, so "12 per leg" reads as twelve and "45 sec" never
reaches the load maths at all.

### His block after the correction

| lift | day | week 1 top | week 6 top | his test |
|---|---|---|---|---|
| Back Squat | heavy, 5 reps | 90kg | 112.5kg | 90 x 10 |
| Back Squat | volume, 8 reps | 75kg | 95kg | 90 x 10 |
| Leg Press | heavy, 15 reps | 85kg | 105kg | 100 x 15 |
| Leg Press | volume, 15 reps | 80kg | 100kg | 100 x 15 |
| Romanian Deadlift | heavy, 8 reps | 80kg | 100kg | 90 x 10 |
| Barbell Bench Press | heavy, 5 reps | 85kg | 107.5kg | 100 x 5 |

Every week six figure now sits above the tested performance once converted to a common rep
basis, and no figure asks for something the lifter has not demonstrated a path to.

**The lesson worth keeping: any prescription derived from a one-rep max must carry the rep
count with it.** Three separate reports (leg press making no sense, the volume day going
backwards, and the original low-rep testing problem) were all this same omission.

Sweep after the change: 5,880 combinations, 0 adjacent repeats, 0 over-frequency, 0 empty
days, 0 duplicate titles, 0 light days without a heavy day. Build clean, 20 routes.
Still not deployed.

### Correction, same day: the volume day was not progressing at all

Reported as "deployed but not updated". The deploy had in fact landed (the numbers on screen
matched the rep-aware model exactly), but checking them against the tested capacity exposed
a worse problem than a stale build.

`LIGHT_DAY_LOAD` was 0.95 and the week six factor is 1.05. **1.05 x 0.95 = 0.9975**, so the
volume day finished the block 0.2 percent BELOW where it started. Six weeks of training, on
half the sessions, prescribing no progress whatsoever.

Every individual number looked plausible, which is why it survived two reviews and an
independent audit. It was only visible by computing the gain across the block rather than
reading any single week.

`LIGHT_DAY_LOAD` is now 1.0, and the constant is kept only to document why there is no flat
trim: **the rep count is the trim.** The volume day is already lighter because it asks for
eight or ten reps instead of five, and the rep-aware base turns that into a genuinely lighter
bar. A second discount on top was always double-counting.

| lift | day | wk1 top | wk6 top | gain across block |
|---|---|---|---|---|
| Back Squat | heavy, 5 reps | 90kg | 112.5kg | +5.5% |
| Back Squat | volume, 8 reps | 80kg | 100kg | +5.6% |
| Leg Press | volume, 15 reps | 85kg | 105kg | +5.0% |

**Rule worth keeping: check a block by its start-to-finish gain, not by whether each week's
number looks sensible.** Two compounding multipliers can each be defensible and still cancel.

### Correction: the block started far too low

Reported as "this is still low, Wednesday went up to 90". Correct, and this one was a
judgement error rather than an arithmetic one.

`weekFactor` mapped week one to 0.85 of demonstrated capacity. That scale is written for a
testing week that produces a near-maximal single, which is the classic 70-to-90-percent
ladder assumption. **This app does not ask for that.** It asks for a working set of 8 to 10
stopping two short, and James delivered a full five set session ramping to 90kg x 10.
Opening the next week at 85 percent of that told a man who had just done five sets of ten to
go and do less. Nobody follows a plan that starts by demoting them.

Rescaled to 0.88 at the deload and 1.08 at week six. Week one now lands just under
demonstrated capacity, which reads as a start rather than a step back.

| Back Squat, heavy day, 5 reps | top set | vs his 90 x 10 test |
|---|---|---|
| week 1 | 97.5kg | -9% |
| week 3 | 107.5kg | +1% |
| week 4 | 95kg | -11% (deload) |
| week 6 | 115kg | +8% |

The volume day tracks the same shape at 87.5kg to 102.5kg, and Leg Press runs 92.5kg to
107.5kg against his 100 x 15.

Eight percent across a block is ambitious for a true intermediate and about right for a first
structured block. The safety net was already written and is the reason this is the right side
to err on: every card says hold the weight and add a rep if a lift stalls, and `readsAs()` in
the end of week review flags anything coming in under target.

**Three corrections in one day on the same function, each found by James checking a
prescription against what he had actually lifted.** The pattern worth keeping: numbers derived
from a model are only testable against real logged performance, never against whether they
look reasonable in isolation.

### Correction: a floor, because periodisation theory does not outrank arithmetic

Reported as "still no good, Wednesday was 90 and 10 reps, Friday ends on 87.5 on 8".

He was right and the previous two corrections had both missed the actual point. 87.5kg for 8
is less weight AND fewer reps than 90kg for 10. There is no model, no taper and no first-week
argument under which that is harder. A week one is allowed to be easier. It is not allowed to
be **strictly dominated on both axes** by a session the person has already completed, because
that is not periodisation, it is the app not knowing what you did.

`floorFromHistory(loggedSets, prescribedReps)` returns the heaviest load already completed for
that many reps **or more**, since doing something for more reps proves at least that much for
fewer. Taken from the most recent session for the lift, which the plan page already loads.

The first attempt clamped each week at the floor independently and produced Leg Press at
100, 100, 100, 100, 105, 107.5: a wall with a bump on the end. The block is now **anchored**
instead. If the floor says week one starts at 100kg, the whole block shifts up so it begins
there and still climbs. The lift is capped at ten percent so a single fluke set in the history
cannot drag a block somewhere unsafe, with the hard clamp kept underneath as a backstop.

His block now, against a logged 90kg x 10:

| Back Squat | wk1 | wk2 | wk3 | wk4 | wk5 | wk6 |
|---|---|---|---|---|---|---|
| heavy, 5 reps | 97.5 | 102.5 | 107.5 | 95 | 110 | 115 |
| volume, 8 reps | 90 | 92.5 | 97.5 | 90 | 100 | 105 |

Leg Press volume against 100 x 15: 100, 102.5, 107.5, 100, 112.5, 115.

**Invariant now under test.** 672 combinations of logged history against prescribed rep
counts, both intensities, all six weeks: zero prescriptions strictly beaten by logged
performance. This is the check that should have existed from the start, and it is the one that
would have caught all four of today's errors on this function in a single run.

### Correction: the floor had to compare effort, not the number on the bar

Reported as "still, reps from Wednesday are lower with the same weights as Friday".

The previous floor guaranteed the **weight** was never below what had been lifted. It floored
Friday at 90kg because 90kg had been logged. But the logged set was 90kg x **10** and the
prescription was 90kg x **8**: same bar, two fewer reps, plainly easier. Matching the weight is
not enough. Fewer reps has to mean more weight.

`floorFromHistory` now puts both sides on a common footing. Every logged set converts to an
estimated max, the best is taken, and that converts back to a load at the rep count being
prescribed. 90 x 10 is an estimated 120, which at eight reps is 95kg. **95 x 8 is the genuine
equivalent of 90 x 10**, and that is the floor.

Rounded **up** to the nearest 2.5kg, never down. Rounding to nearest left the floor fractions
of a percent below the effort it existed to guarantee (90 x 10 floored to 112.5 for a triple,
which is a whisker easier than the set it came from). A floor that can dip under the thing it
is flooring is not a floor.

Two knock-on changes fell out of this:

**The ladder spread came down from 1.17 to 1.10.** The scale used to decide both where the
block starts and how far it climbs. The floor now sets the start, so the scale only carries
the shape. Anchored to a week one that already equals a maximal effort, the old spread
projected a twenty percent gain in six weeks. Nobody adds twenty percent in six weeks, and a
final week that is fantasy is as useless as a first week that is too light. Now 0.94 to 1.06.

**The deload is exempt from the hard clamp.** Week four is a deliberate, labelled, one week
reduction and is the only week allowed under the floor. Clamping it too flattened it into a
repeat of week one and left the block with no recovery week at all.

His block, every figure measured against the 90 x 10 he actually did:

| Back Squat | wk1 | wk2 | wk3 | wk4 | wk5 | wk6 |
|---|---|---|---|---|---|---|
| heavy, 5 reps | 107.5 | 110 | 112.5 | 105 | 115 | 117.5 |
| effort vs his session | +1% | +3% | +5% | -2% | +8% | +10% |
| volume, 8 reps | 95 | 95 | 97.5 | 92.5 | 100 | 102.5 |
| effort vs his session | +0% | +0% | +3% | -2% | +6% | +8% |

**Invariant, now tested properly:** 768 combinations of logged history against prescribed rep
counts, both intensities, all six weeks. Zero non-deload prescriptions easier than the logged
effort. The earlier version of this test compared weights and passed while the bug was live,
which is why it did not catch it. Comparing effort is the only version worth having.

---

## Added 2026-08-09: Sunday weeks, and a quote that changes

### The week now starts on Sunday

Requested. The interesting part is not the day, it is that **the boundary existed in ten
independent copies**: seven `(d.getDay() + 6) % 7` in app/ and lib/, and three
`date_trunc('week', ...)` in Postgres. Every one had to agree and nothing enforced it. The
plan week rolling over on a different day from the leaderboard was already fixed by hand once;
ten copies is how that comes back.

**`lib/week.js`** is now the only definition on the app side, exporting `WEEK_STARTS_ON`,
`startOfWeek`, `startOfThisWeekISO`, `weeksBetween` and `dayIndexInWeek`. All seven call sites
import it: `app/dashboard`, `app/progress`, `app/plan`, `lib/plan.js`, `lib/progression.js`
(two places) and `lib/gymready.js`. `mondayOf()` is gone.

**`public.week_start(date)`** is the matching definition in Postgres, used by
`get_leaderboard()` and `settle_streak_freezes()`. `date_trunc('week', ...)` is ISO and always
returns Monday with no setting to change it, so the SQL side needs its own helper: shift
forward a day, truncate, shift back.

To move the week again, change `WEEK_STARTS_ON` and `week_start()` together. Nothing else.

Verified: JS and SQL produce the identical week start for all 14 days across a fortnight
boundary, and `week_start()` returns a Sunday for all 731 days from 2025 to 2027. James's
block, which began Tuesday 4 August, now runs week 1 through Saturday 8 August and rolls to
week 2 on Sunday 9 August.

One consequence worth knowing: the leaderboard reset this morning, because today is Sunday
9 August. Everyone shows 0 for the new week. That is correct, not a regression.

### The Ready card quote

`quoteFor(typeId, seed)` was `(dayOfMonth + tabIndex) % 6`, which is fixed for a whole day.
Four visits on a Tuesday gave the same line four times, which is how a motivational quote
becomes wallpaper.

It now takes a `rotation` counter, bumped once per plan visit via `nextQuoteRotation()` and
persisted in `localStorage`. **Cycling, not random**: with six quotes per type, random repeats
back to back about one time in six, and a back-to-back repeat is the exact thing being fixed.
Cycling shows all six before any comes round again.

Read in a `useState` lazy initialiser so it advances on mount rather than on every re-render,
which would otherwise change the quote mid-session while logging sets. Wrapped in try/catch
because `localStorage` throws in private browsing on iOS, which is a real configuration here.

Verified: ten consecutive opens give zero back-to-back repeats and all six distinct quotes
within the first six.

Build clean, 20 routes. No `getDay() + 6`, `mondayOf` or `date_trunc('week'` left anywhere in
app/ or lib/.

---

## Added 2026-08-09, later: the block now answers back

Requested as "the progressive overload needs to adjust each week if the weights go beyond or
less than what you have predicted". Everything before this was decided once, on day one, from
a single tested set. The floor could raise it. Nothing could lower it, and nothing at all
responded to somebody outperforming their own test.

`adaptFrom()` in `lib/progression.js` compares, for every finished week, the best effort
demonstrated against **what that week's card actually asked for**, and moves the anchor half
the distance. The factor multiplies `est` inside `workingWeight`, so the ramp, the six week
projection and the floor comparison all move together rather than a fourth multiplier being
bolted onto the end.

Per-week history is built in `app/plan/page.js` from the `recentLogs` query that was already
there, keyed by `weekOfBlock()`, and passed through `DayView` to `ExerciseCard` and to
`BlockReview`. No new queries and no migration: the factor is re-derived on every load, so it
cannot go stale and there is no second copy of the truth.

### Four decisions, three of which were wrong first

**It compares effort, not the number on the bar.** Both sides go through `estimateMax`, the
same as `floorFromHistory`. 95kg x 8 and 90kg x 10 are the same session.

**It compares against the prescription, not against the ladder.** The prescription includes the
floor anchoring, which already sits several percent above the raw model. Judging against the
model read a perfectly followed week as a five percent overshoot. Related and worse: `floorEst`
starts seeded from `est_max` rather than from zero, because `est_max` came from a real logged
set and so the floor was already in force on the very first card. Seeded at zero, week one
re-prescribed at 102.5kg against the 107.5kg actually shown, and **every user would have
drifted upwards for doing exactly as they were told.**

**The deadbands are asymmetric, 3 percent up and 6 percent down.** The symmetric version had a
systematic downward bias and it took a convergence test to see it. The ladder asks for about
twelve percent more in week six than in week one, and that climb is an intention rather than a
forecast. Almost nobody adds twelve percent to a lift in six weeks, so with one shared band
every ordinary user missed the later weeks by four or five percent and was quietly backed off.
Measured: a lifter whose test was exactly right, hitting their honest best every session, was
adapted down to 0.946 by week six for the crime of not getting stronger on schedule.

**`ADAPT_MIN` is 0.91 and it is arithmetic, not taste.** The ladder climbs 0.964 to 1.06, a
ratio of 1.0996, so a factor falling faster than 1/1.0996 = 0.9094 outruns the block's own
progression and the block finishes below where it started. At 0.85 it did exactly that: an
optimistic test produced six weeks running 107.5 down to 100. **Same class of error as
`LIGHT_DAY_LOAD` at 0.95 against a week six factor of 1.05.** Two defensible multipliers,
multiplied, cancelling. Check a block by its start-to-finish gain, never week by week.

The deload is not evidence, because plenty of people ignore it and lifting last week's weight
on the one week designed to be easy would otherwise drive the largest increase in the block. A
missed week is not a failed week either: no logged sets means no opinion.

### Convergence, which is the test that matters

A person with a fixed true capacity, lifting their honest best. Does the model find the truth
and then stop moving?

| Their real capacity vs the test | Factor by week 6 | Block gain wk1 to wk6 |
|---|---|---|
| Test was right, 120 | 1.00 | +9.3% |
| Test 10% optimistic, 108 | 0.91 | 0.0% |
| Test 17% optimistic, 100 | 0.91 | -4.7% |
| Test pessimistic, truly 140 | 1.00 | +16.3% |

The third row is negative and is meant to be. That block's week one was built on a test the
person could never repeat, so walking down to reality is the correct outcome and prescribing
107.5kg in week six to somebody whose honest best is 90kg would be worse. `testQuality()`
exists to catch it at the point of testing, which is the cheaper place.

Note the fourth row. Somebody stronger than their test is no longer capped by it.

**Sweep: 129,654 prescriptions** across seven logged weights, seven logged rep counts, seven
prescribed rep counts, three intensities, three set counts and seven behaviour profiles from
20 percent under target to 25 percent over. Zero non-deload prescriptions strictly beaten by a
logged effort, zero factors outside the caps, zero non-finite results, zero ramps that fall,
and zero blocks finishing below where they started for anyone who met or beat the plan.

The card explains itself: `adaptNote()` puts one muted line under the prescription saying which
way it moved and why. A plan that silently rewrites itself is indistinguishable from a plan
with a bug in it, and a downward adjustment especially must not arrive looking like a
telling-off.

Build clean, 22 routes. Not deployed.

### CHARACTER-BRIEF.md rewritten around the robots

The animals are formally cancelled. The brief now describes the eight robots that actually
shipped and what is wrong with them: no alpha, identity carried by the background rather than
by the character (the Hunter is an orange type with cyan eyes standing in an orange scene),
eight different cameras and poses, and one flat raster with nothing in it that can move.

The substance of the rewrite is a **layered delivery spec**, because the completion fanfare is
already as good as a flat asset allows. Seven layers per character on an identical canvas,
emissive drawn in flat white so the app tints it with the user's own accent, a `rig.json` of
pivots as canvas fractions, and one shared neutral pose so eight characters can share one
animation. Plus the three-beat fanfare it makes possible, and the `prefers-reduced-motion`
collapse, specified but deliberately not built until assets exist.

Honest note in there about Canva: it cannot produce true alpha or split a figure into
registered layers, so it is the wrong tool for the character and the right one for the deck,
the share card and the store artwork.

**Do the Hunter only.** One character all the way through to a moving rig, then decide about
the other seven once week six of the test says whether type predicts adherence at all.

### Split into eight, because Canva caps a field at 4,000 characters

`character-briefs/` now holds one standalone file per character plus `00-README.md` as the
index. Each is 3,500 to 3,800 characters and carries its own prompt, palette, layer filenames
and a full copy of the locked rules. The prompt block alone is 861 characters if a tighter
field ever turns up, and it is the only part an image generator acts on: the tables are for
whoever judges the result.

Each brief also names what actually distinguishes that character once the background is gone,
which the combined document never did. The Hunter has a visor slit rather than the full oval,
the Monk a completely seamless shell, the Wanderer exposed joints and no plating. This mattered
more than expected: several of the shipped renders are currently identifiable only by the
colour of the scenery behind them.

**The locked rules now exist in nine places**, this file's master copy and one per brief. That
is the same trap as `lib/brand.js` against `app/globals.css` and it is called out in both
documents. Change one, change all nine.

---

## Added 2026-08-09, later still: "1 of the last 8 weeks"

Reported as "progress says you have hit 1 of your 8 last week, I am only doing 4 per week".
Four separate problems behind one sentence, and the reported one was the least serious.

**A session was a ROW, and it was counted that way in four places.** `get_leaderboard`,
`weeks_kept` inside it, `settle_streak_freezes` and `computeStats` all did `count(*)` over
`training_sessions`, and a row is written every time a plan day is completed. James's week
beginning 2 August: **ten rows across five days**, of which `hyrox-push` appears on four
consecutive days. That is one plan slot filled four times, not four sessions. The progress
chart drew a bar of ten against a pledge line of four.

Checked against the other testers before touching anything: Hampo8 logged five rows on five
days and CatFisher one on one, so this was not a duplicate-write bug. The write guard added on
4 August works. It is a definition problem, and the definition was in four copies.

`public.session_key(day_key, id)` and `sessionKey()` in `lib/week.js` are now the single
definition, mirrored the same way `week_start()` and `startOfWeek()` are. Plan days collapse by
`day_key`; anything with a null `day_key` is a quick log, cannot be proved a repeat of
anything, and stands alone. That errs towards crediting work rather than withholding it, which
is the right direction in an app whose whole problem is people not coming back.

James's week now reads 5 rather than 10, in SQL and in JS, verified against each other.
`sessionsByWeek()` is the one function every adherence screen should go through.

**The current week was scored as a miss.** The chart covered eight weeks and scored all eight,
and the eighth is the week in progress. On a Sunday that week is a few hours old and cannot
possibly have met a pledge, so everybody's number dropped every Sunday and climbed back through
the week. Finished weeks only now, seven of them, and the current week's bar is drawn as a
dashed outline rather than the same grey as a real miss.

**The eight-week walk-back was DST-unsafe, in two files.** `thisWeek - i * 7 * 24 * 60 * 60 *
1000` in the progress chart and `w -= weekMs` in `computeStats` both assume every week is
exactly 604800000ms. The week containing the last Sunday in October is 25 hours. From November
onwards every key before the change comes out an hour adrift of the keys sessions are filed
under, the chart shows zeros for half the year and a long streak silently truncates at the
clock change. Both now step the date and re-derive the boundary. Verified: eight consecutive
buckets back from 15 November 2026 are all local-midnight Sundays.

**And the copy.** "You hit your pledge in 1 of the last 8 weeks" has two numbers in it and
names only one of them, which is why the man who set the pledge to four read the eight as a
target. It now says "You pledged 4 sessions a week, and hit that in 1 of the last 7 full
weeks."

Migration `supabase/2026-08-09_session_key.sql`, **applied**. Build clean.

### schema-live.sql regenerated, and it was not bookkeeping

The previous capture was 30 July and had gone eleven days stale, which is about the fortnight
its own header warned about. Missing entirely: `exercise_prefs`, `set_feedback`,
`streak_freezes`, `challenges`, `push_subscriptions` and `body_metrics`; four columns on
`exercise_logs`; three on `lift_maxes`; eight on `profiles`; both unique de-duplication
indexes; the `profiles` trigger; and six functions.

Regenerating from `pg_catalog` surfaced **three live defects nobody had reported**, all now
fixed and applied.

**`due_reminders()` was still on ISO Mondays.** The Sunday work earlier today verified "no
`date_trunc('week'` left anywhere" by grepping the repo, and this call site lives only in the
database. On a Sunday, `date_trunc('week')` returns the Monday six days ago, so
`done_this_week` counted the week that had just ended: anybody who met their pledge last week
was treated as already finished on the first day of the new one, and their Sunday nudge never
fired. The day the reminder matters most was the one day it could not arrive.
**Grep the database, not the checkout.** `week_start` is now verified to be the only function
in `public` whose body contains `date_trunc('week')`, which is correct, since it is the
definition.

**`due_reminders()` and `current_challenge()` still counted rows**, so they were two more
copies of the session-definition bug and were not in the morning's pass. Both now use
`session_key()`.

**`session_key` was executable by `anon`, and my own revoke had not worked.** This is a second
trap on top of the one `rpc_permissions.sql` documents. Revoking from PUBLIC is not enough on
Supabase: its `ALTER DEFAULT PRIVILEGES` grants EXECUTE on every new function in `public` to
`anon`, `authenticated` and `service_role` **explicitly** at creation, so after revoking PUBLIC
the ACL still read `anon=X/postgres`. Both revokes are needed. Caught only because the
regeneration reads `has_function_privilege` for every function rather than trusting that the
statement succeeded, which is exactly what that file tells you to do.

Migration `supabase/2026-08-09_reminder_week_and_challenge_count.sql`, **applied**.

All three SQL files parse under the real Postgres parser (`pglast`, libpg_query): 108, 7 and 2
statements. The snapshot's gaps section is rewritten and ordered by what I would close first;
the top two are unchanged from July and both are about durability rather than features, namely
the client-side profile creation that orphans auth users, and **the free plan meaning no daily
backups on a database that has already had a day of manual data surgery.**

One deliberate non-change: `week_start` is still executable by `anon` and still carries the
default PUBLIC grant. It is an immutable pure function over a date, so the exposure is nil, but
it is the last inconsistency in the grant table. Left alone on purpose, because a snapshot
regeneration is not where behaviour should change. It is listed in the gaps.

---

## Added 2026-08-09: the nutrition tab

`/nutrition`. A weekly meal plan that learns from like and not-for-me, with a shopping list
scaled to the household. **Gated on `profiles.nutrition_enabled`, true for Hampo-1978 only.**

The gate is not caution for its own sake. The six week test is running and exists to measure
whether this app gets somebody to session three. A new tab appearing mid-block would make the
31 August block end report unreadable as evidence, because nobody could say afterwards which
change moved the number. Open it up after 10 September.

**Files.** `supabase/2026-08-09_nutrition.sql` (applied), `lib/nutrition.js`,
`app/nutrition/page.js`, a `basket` icon, and a gated tile on the dashboard.

**Three tables.** `meals` is a shared read-only library, maintained by migration, with no
insert policy at all: a user-editable recipe library is a moderation problem nobody here has
time to run. `meal_prefs` is one verdict per person per meal, changed rather than appended,
because "do you like this" has a current answer rather than a history. `meal_plans` stores the
week that was actually issued.

**Why the plan is stored rather than recomputed.** The picker is deterministic, so it could be
pure. It reads preferences though, and preferences change the moment you press dislike, so a
recomputing plan would rewrite Thursday's dinner because you disliked Monday's, after you had
already bought Thursday's ingredients. The week is written once on first view and is then a
fact. Verdicts land the following Sunday, which is also when you next shop.

### The learner did nothing at all, and the tests are the only reason I know

The first version passed every invariant: deterministic, no duplicates, dislikes never return,
no deadlock on a small library, protein cap respected. All green, and completely useless.

Measuring the actual effect rather than the correctness is what caught it. Liking every
traybake in the library moved traybake frequency **from 1.78 dinners a week to 1.68**. Not just
too small to notice, the wrong sign. Two independent causes, both invisible to a pass-or-fail
test:

**`scoreMeal` divided by every tag, not by the judged ones.** Meals carry three to five tags,
so a strong opinion about "traybake" on a dish tagged `{chicken, korean, noodle, traybake,
spicy}` was divided by five before it reached the picker. Every signal in the system was
quartered. It now averages over tags that have an opinion and damps by the square root of
coverage, so partial overlap still counts as the weaker evidence it is rather than as nothing.

**The weighting was linear and far too flat.** `0.15 + (score + 1)` maps neutral to 1.15 and a
strong like to 1.82, which through a `1/weight` exponent is very nearly no difference. Now
`exp(2.5 * score)`: -1 maps to 0.08, 0 to 1, +1 to 12. Bounded both ends, never zero, so a
merely unfavoured meal still surfaces occasionally rather than being buried for good.

After both: liking one traybake lifts its tag-mates from 1.25 a week to 1.49, and a curry
preference lifts curry from 1.45 to 1.71. Real, and visible within a month.

**The remaining limit is the library, not the algorithm, and it is measurable.** Preference
lift against library size, holding everything else constant:

| Dinners in library | Lift from a like |
|---|---|
| 14 (today) | 26% |
| 21 | 40% |
| 28 | 48% |
| 42 | 58% |

At fourteen dinners the picker takes half the library every week, so there is barely any room
for a preference to express itself. **Getting to about thirty dinners is worth more than any
further work on the scoring.** That is the next job on this feature, and it is data entry
rather than engineering.

### Things it deliberately does not do

**One dinner a week is always something never served before**, taken first so the protein cap
and the repeat window cannot crowd it out. A learner that only serves your favourites narrows
to five meals and then you stop opening the tab. Same failure as the Ready card quote that was
fixed for a whole day: technically working, practically dead. Verified: twelve weeks under a
strong salmon preference still touched all fourteen dinners.

**No more than two dinners a week share a primary protein**, whatever the preferences say.

**Pressing the verdict you already gave clears it.** "Not for me" on the exercise card has
already shown what a one-way door does to somebody who mis-taps.

**Nothing fails hard.** With a small library or after a run of dislikes, a strict picker returns
four dinners and a broken screen. It relaxes the repeat window, then the protein cap, and only
then allows a short week. A plan that quietly repeats last Tuesday is a far better failure than
a plan with holes in it. Tested down to a seven dinner library with everything recently served.

### Two smaller things

The Elsewhere grid needed an even number of tiles, which is why the fallback tile is greyed
rather than removed for Gym ready users. The nutrition tile broke that from the other side by
adding one. The last tile now spans both columns when the count is odd, which is general rather
than a patch and means the next tile added will not reopen the hole.

Macros on meal cards are estimates and the schema says so with `macros_estimated`. Nobody has
put these dishes through a lab. Intake is controlled by the weighed portion rule on the page,
not by the number on the card, and the card should not be allowed to start pretending
otherwise.

Recipe links go to real published pages, checked against the live site rather than assembled
from a pattern. The ingredient lists are ours, deliberately: they scale to the household and
carry an aisle so the list sorts the way a supermarket is walked.

Build clean, 23 routes. Not deployed.

---

## Added 2026-08-09: web push, finished

The item that had been sitting at number three on the outstanding list since 30 July, written
but never deployed. It is deployed now.

**Done, and verified:**

- `send-reminders` edge function **deployed**, version 1, `verify_jwt` on, status ACTIVE. The
  functions directory now holds two live functions rather than one of each.
- `pg_cron` 1.6.4 and `pg_net` 0.20.4 enabled.
- Job `vaeon-reminders` scheduled hourly, `0 * * * *`, active.
- `due_reminders()` checked end to end against live data. One candidate right now, correctly
  classified as `lapsed` at 999 days since log. She has no device registered, so the function
  will skip her, which is the right behaviour rather than a bug.
- Migration recorded in `supabase/2026-08-09_push_schedule.sql`.

**The service role key is read from Vault, not pasted into the schedule.** The old instructions
in the function header had it inline in the cron command. That would leave the one key that
bypasses every RLS policy in the project sitting in `cron.job` in plain text, readable by
anything that can read the database, and in a place nobody thinks to look when rotating. The
command now looks it up in `vault.decrypted_secrets` when it fires.

**The job was scheduled before the secret existed, deliberately.** The command is SQL text
evaluated at execution time, so until the Vault secret is created the header resolves to
`Bearer ` and the call 401s. It fails harmlessly every hour and starts working the moment the
secret appears, with nothing further to do. That is a better failure than a schedule somebody
has to remember to add later, which is precisely how this feature came to sit undeployed for
ten days.

**Four manual steps remain and all four have to be manual.** They are the halves of this system
that must never pass through a repository, a tool call or a chat transcript:

1. Supabase, Edge Functions -> send-reminders -> Secrets: `VAPID_PUBLIC_KEY`,
   `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`
2. Vercel: `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, **then redeploy**. It is baked in at build time, so
   setting it without a rebuild changes nothing at all.
3. SQL editor, once: `select vault.create_secret('<service role key>', 'service_role_key');`
4. Settings -> reminders, turn them on. `reminder_enabled` is currently false on Hampo-1978,
   so nothing will arrive until it is switched on and a device is registered.

**The VAPID pair was generated into `vapid-keys.local.txt`, which is gitignored** and was
written without the values ever being printed. Delete the file once both halves are pasted.
Rotating means generating a new pair and re-pasting both; most browsers survive a key change
but not all, so expect one or two people to have to re-enable.

Until the VAPID secrets exist the function returns 500 with `VAPID keys not configured` and
sends nothing. Loud, in the logs, and impossible to mistake for "nobody was due".

### The rollout gate, and the near miss that prompted it

`due_reminders()` scans every profile with `reminder_enabled` set, and **Netballsue already had
it on**. She would have started receiving push notifications the moment the VAPID secrets
landed, for a feature she had never been told existed. Caught before the secrets were set
rather than after, which is the only reason this is a note rather than an apology.

`profiles.push_enabled` is now an operator gate, default false, true for Hampo-1978 only, and
`due_reminders()` filters on it.

**It is deliberately a second flag rather than a reuse of `reminder_enabled`.** The shortcut
was to switch her `reminder_enabled` to false and keep her out of the pilot that way. That
silently overrides a preference she set herself and leaves her with no way to understand why
her reminders stopped. `reminder_enabled` is what the user asked for; `push_enabled` is whether
the account is in the pilot. Two meanings, two columns.

The in-app reminder is untouched and still reaches everyone, because it is client side and
never goes through `due_reminders()`. Only push is gated, which is the right split: push is the
half that needs permission and arrives on a lock screen.

Verified inside a rolled-back transaction: opening the gate for Netballsue makes her a
candidate, closing it removes her. The gate is what excludes her rather than some incidental
condition that might later stop holding.

**Still not built:** the Sunday shopping list push from the nutrition tab. It is unblocked now
rather than done. Worth getting one push type working end to end before adding a second.

---

## Added 2026-08-09: allergies, goals, registration, and Joe Wicks

`/nutrition/setup`. Nutrition opened to **CEO-jamie and Hampo8** as well as Hampo-1978.

### The age check, which was not asked for

CEO-jamie's `birth_year` is 2007. He is nineteen, so this is fine, but he is nineteen by a
year, and the open item about under-18s on the platform stopped being abstract at that point.

Everything else in this app is exercise, which is safe for a fifteen year old. **This is the one
feature that hands somebody a calorie figure**, and calorie targets aimed at adolescents are a
recognised risk factor for disordered eating. So nutrition checks age directly, at
`NUTRITION_MIN_AGE`, on both the setup screen and the plan screen, and **fails closed on an
unknown birth year**. A missing date of birth is not evidence of being an adult.

It is checked separately from `nutrition_enabled` on purpose. That flag is a rollout decision
and somebody could open it to everybody one afternoon without stopping to think about who
"everybody" includes.

### Allergies

Fourteen UK allergens on `profiles.allergens`, `meals.allergens`, collected on the setup screen.

**Excluded at the pool, which is the whole safety argument.** All three fallback passes draw
from one filtered list, so there is no code path that can relax an allergen the way it relaxes
the repeat window and the protein cap. Tested against a library that is deliberately almost all
fish with a fish allergy declared: twenty weeks, zero allergens served, including when the
person had *liked* a meal containing one.

**The library is over-tagged where uncertain, deliberately.** Meatballs carry gluten and eggs
because breadcrumbs and egg are the usual binder even when a recipe does not mention them, soy
sauce carries gluten because most of it is brewed with wheat, oats carry gluten because UK
labelling treats them that way unless certified otherwise. Removing a meal somebody could have
eaten is an annoyance. Serving one they cannot is not. The asymmetry decides the default.

**And it is not sold as a guarantee.** The warning is on the setup form and again on the plan
itself, in plain words rather than a footnote: this filters our own list, the recipes are on
other people's sites and can change, and cross-contamination and "may contain" are not modelled
at all. A filter somebody trusts more than it deserves is worse than no filter.

**The empty list problem.** An empty `allergens` array cannot mean both "none" and "not asked",
so the form requires either a tick or an explicit "I have no allergies". Silence is not a
declaration.

### A short week is now honest rather than hidden

The comment in the picker claimed it would "quietly repeat last Tuesday" rather than return a
short week. **It does not, and never did.** Testing a fish allergy against a mostly-fish library
returned two dinners, not seven, because the picker dedupes within a week.

Two dinners turned out to be the right answer and the comment was wrong. Serving the same meal
four nights running to somebody whose allergies have starved the library is a bug wearing a
plan's clothes, and it hides the real problem, which is that there is not enough food in the
library that this person can eat. `pickWeek` now returns `short` and the screen says so, and
says it is our fault rather than theirs.

### Goals, and the multipliers came down

`targetsFor()` does Mifflin-St Jeor, then an activity multiplier, then a goal offset.

The cut is **banded on BMI**, 30 percent at 30 and over, 25 percent from 25, 20 percent below,
and floored at BMR. A flat percentage is wrong in both directions: thirty percent is reasonable
at a BMI of 33 and mostly costs you muscle at 23.

The gain side is **capped hard and low**, fifteen percent to a maximum of 500. Past roughly 400
over maintenance the extra is very largely fat, and bulking as commonly practised is a long way
of arriving back where you started with further to go. The worked example for a 70kg nineteen
year old comes out at 3,100 and 0.37kg a week.

**The activity multipliers are below the textbook figures on purpose.** The standard
1.2/1.375/1.55/1.725/1.9 are derived from self-reported activity and run high, and the error
compounds because somebody training six times a week ticks the highest box they honestly can.
Overestimating maintenance is the expensive direction: the deficit shrinks, nothing happens,
and the person concludes the app does not work. They are now 1.2/1.35/1.45/1.55/1.7.

The check that set them: James comes out at a maintenance of 2,897 here, against the 2,900
arrived at by hand this morning before the function existed. The textbook 1.725 said 3,224.

**His stored target moved from 2,000 to 2,050**, which is one rounding step and not worth having
two answers to one question. His height, sex, activity and goal are now stored so the formula
can be re-run rather than the number sitting there unexplained.

### Joe Wicks, and the library is nearly big enough now

Ten Body Coach recipes added alongside the fourteen from Jamie Oliver, links checked against
the live site. `meals.source` records which. **Dinners are now 24, up from 14**, which against
the scaling measured earlier takes the preference lift from about 26 percent to somewhere near
45. The 30 I said was needed is close.

`meals.cost` bands every dish low, mid or high, and `budget_pref = 'economical'` roughly doubles
the odds on cheap meals and halves them on expensive ones. **A nudge, not a filter**, and that
is the point: a hard cost filter hands a student ten identical mince dinners and gets ignored by
the second week. Measured across 200 weeks, cheap dinners rise from 710 to 878 and expensive
ones still appear 522 times.

CEO-jamie is prefilled as gain and economical. He and Hampo8 have no targets until they fill the
form in, and the plan screen sends them there rather than showing a plan built on a default.
Guessing somebody's maintenance calories is not a thing this app is going to do.

Build clean, 24 routes. Not deployed.

---

## Added 2026-09-12: the block was overloading itself, and six weeks of data to prove it

The six week test finished. **James is the only person who completed a block**, so this is the
first time the engine has been measurable against reality rather than against whether its
numbers looked sensible. It did not survive the measurement.

### What the data says

Adherence: **13 sessions logged against 24 pledged.** He pledged four a week, hit four in
exactly one week of six, did two in four of them, and week four was zero. The pledge was
fiction and the leaderboard scored him against it every week.

Progression, as estimated max, week one to week six:

| lift | week 1 | week 6 | change |
|---|---|---|---|
| Back Squat | 120 | 168 | **+40%** |
| Romanian Deadlift | 120 | 187 | **+56%** |
| Hip Thrust | 140 | 207 | **+48%** |
| Leg Press | 150 | 409 | **+173%** |
| **Barbell Bench Press** | **114** | **130** | **+2.5% on the top set** |

Bench is the tell. It is the only lift whose testing week was a genuine effort, which
`testQuality()` flagged at the time as too heavy, and it went 100 to 102.5 to 105 to 107 and
back to 100. **Every lift that "gained" forty percent and up is a lift whose week one was
entered light**, and the engine booked the correction as progress. The block end report would
have told him he got dramatically stronger, and it is not true. For an app whose entire pitch
is that it tells you whether the training worked, that was the most serious thing in the
block.

### The cause, which is not the one he reported

He reported it as the overload being too ambitious once the weights get heavy. The weekly
steps say the opposite: squat +20% into week two, +8.3%, +3.8%, +3.7%. **The steps at the top
of the block were the smallest in it.** The heavy weeks felt brutal because they carried six
weeks of compounded inflation.

The actual fault is a feedback loop with nothing damping it:

```
the prescription is a percentage of lift_maxes.est_max
  -> the set gets hit
  -> record_lift_max() does greatest(existing, new), so est_max rises
  -> next week prescribes a percentage of the NEW est_max
  -> round again, compounding, for six weeks
```

**est_max was at the same time an input to the prescription and an output of following it.**
Every safeguard in `lib/progression.js` guards one week: `floorFromHistory` stops a week being
easier than something already done, `adaptFrom` caps how far the anchor MULTIPLIER can drift.
Neither can see the anchor itself moving underneath. There was a floor test and no ceiling
test.

### What changed

**1. The anchor is recent form, not `greatest()`.** `anchorFrom()` takes the best effort across
the last three SESSIONS, capped at `ANCHOR_RECENT_TOLERANCE` above the most recent one.
`est_max` and `record_lift_max` are untouched and still hold the personal best; `app/plan/page.js`
now overrides the prescription anchor from `exercise_logs`. Three sessions alone was not
enough: Overhead Press has only ever been logged twice, 50kg x 6 in week one and 30kg x 6 in
week six, so both were in the window and the bad one still won. The most recent session is the
best estimate of today, so it sets a ceiling with ten percent of room for one rough morning.

**2. `blockGainCap()` caps the total, and the cap shrinks as the bar gets heavier.** The ladder
asked about ten percent of everybody at every load. Ten percent of a 60kg squat is six kilos;
of a 140kg squat it is fourteen, which is most of a good year. Decays with the log of the
load: 11% at 60kg, 8% at 100kg, 6% at 150kg, 3.8% at 200kg, times `DEFICIT_GAIN_SCALE` of 0.6
when `nutrition_goal` is `lose`.

**3. Progression uses whichever instrument is finer, and the obvious answer is backwards.**
James asked for "more weight one week, more reps the other". The arithmetic decides it, and it
goes the other way on his main lifts. One extra rep multiplies effort by `1 + 1/(30 + reps)`,
about 2.5 percent nearly everywhere. One plate pair is `2.5/load`, which is 4.2 percent on a
60kg bar and 1.7 percent on a 150kg one. **So on a heavy lift the plate is the fine adjustment
and a rep is the blunt one, and on a light accessory it is the other way round.** Each climbing
week picks from hold, add a plate, or add a rep, and takes whichever lands closest to the
week's capped effort target. Heavy barbell work comes out as plates with hold weeks between.
Cables and dumbbells come out as reps. Nobody chose: the loads chose.

**4. Bodyweight and hold work progresses at all, which it previously did not.** His Plank read
45 seconds in week one and 45 seconds in week six. His Hanging Leg Raise was 15 reps from week
two to the end. Not a man who stopped improving: `workingSets` only fires on kind `weight`,
`workingHold` is gated behind yoga, and `splittable()` was quietly doing double duty as the
reason nothing else moved. `bodyweightLadder()` anchors on logged reps or seconds with its own
log-decaying cap, and **no deficit penalty, deliberately** — losing weight makes pull ups
easier, and scaling them down as he cuts would have the model predict the opposite.

**5. `bonus_day` on `profiles`.** `sessions_per_week` was deciding both how many days the week
contains and the denominator adherence is scored against. `bonus_day` adds a day to the plan
without touching the pledge, so "three mornings, maybe four" scores as "3 of 3 +1" using the
`extra` column `get_leaderboard` already returns. **There is no Settings toggle for it yet.**

### The bug that explains the missing conditioning, and it was never findable

Six weeks of a HYROX plan produced **twelve strength sessions and five conditioning entries**:
SkiErg once, Row three times, sled once, slam balls once, against an event that is eight
kilometres of running and eight stations.

`buildWeek` does `primary.days.slice(0, n)`, and hyrox's two conditioning days sat at
**positions five and six**. At three or four sessions a week they were **unreachable**. Nobody
could have found them. What conditioning did exist was an optional ten minute finisher, and
the optional thing is what gets dropped after an hour in the gym. Engine Day is now third in
the list, and `week.mjs` asserts that a hybrid goal at three or more sessions always contains
conditioning work.

### The new goal: `hyroxlean`

`GOALS.hyroxlean` in `lib/training.js`. Three mornings, each roughly half strength and half
engine, with the conditioning as **prescribed exercises rather than a finisher**. Squat, bench
and a conventional Deadlift kept as the main lifts; SkiErg, Row, Sled Push, Sled Pull, Farmers
Carry, Dead Hang, Burpee Broad Jumps, Wall Balls, Pull Ups, curls and an ab movement a day
added. Fourth day is a fixed HYROX simulation, last in the list so only `bonus_day` reaches it.

Nothing repeats across consecutive days, so the variance pass has nothing to substitute and
the week that renders is the week that was authored. That is deliberate: last block's numbers
are only interpretable because the sessions stayed the same week to week.

**`fixed: true` is new on the day shape.** A race simulation must not be substituted or
intensity-tagged. Run through the normal passes it came out mangled: its Row clashed with
Thursday's Row so the table swapped it for Bike Intervals, and its Wall Balls were tagged the
"volume day" of a pair with Tuesday, complete with a note telling him to leave the heavy work
for the other session. `varyExercises` and `assignIntensity` both skip fixed days and leave
them out of the week count.

### Tests, finally committed

`test/`, plain Node, no runner, no `node_modules`. `node test/invariants.mjs` sweeps 58,368
combinations against seven invariants; `test/bodyweight.mjs` 360 anchors against four;
`test/week.mjs` 18,000 weeks against eight. All pass. Read `test/README.md` first: it lists the
four total-gain bugs this engine has shipped, each of which looked fine week by week, and three
of which were found by these sweeps during this session rather than by review.

`lib/progression.js` now imports `./week.js` with the extension so Node can load it directly.
Webpack and Turbopack resolve both. **Do not take it off again.**

### Applied to the live database

`supabase/2026-09-12_block_two_anchor_and_bonus_day.sql`, on `wctsiafaiogyciqnmvad`.

- `profiles.bonus_day`, plus column comments on it and on `lift_maxes.est_max` recording that
  est_max is no longer the prescription anchor.
- **Two poisoned maxes corrected by hand.** Overhead Press 60 to 36; Incline Dumbbell Press 114
  to 78.9, off a week one "90kg x 8" that is either the pair or a slip against 44 to 64 in
  every session since. **Leg Press deliberately left at 408.8** despite growing 173 percent:
  272.5kg x 15 on a plate-loaded press is plausible for a man squatting 140 and he logged it
  nine days ago. Week one at 100kg was the under-entry, not week six.
- `baseline_squat` and `baseline_bench` moved from the 100/100 typed in at onboarding to his
  measured 167.8/133, because they are the ratio-table fallback and block two introduces a
  Deadlift he has never logged.
- James's profile set to block two: `hyroxlean`, three sessions, `bonus_day`, train days
  Tue/Wed/Thu plus Sat, `block_start` 2026-09-13.

`block_start` had to be written through the `vaeon.system_write` escape hatch.
`protect_profile_system_columns` clamps a future `block_start` to today, and today is a
Saturday whose week began on 6 September and is already over, so he would have opened the app
on Tuesday already in week two.

Four duplicate `body_metrics` rows removed. **`body_metrics` never got the delete-then-insert
guard** that `completeSet`, `logStation` and `finish` got on 4 and 5 August, so the duplicate
write bug is still live there. The 11 September pair disagrees, 95.5kg against 99.5kg, and was
left for him to resolve.

### Outstanding, in the order I would do it

1. **Not deployed.** Nothing in this session has been through `next build`, because
   `registry.npmjs.org` returns 403 under this environment's egress policy so `npm install`
   cannot run. Every import was walked against the filesystem and both lib modules execute
   under Node via the test suites, but **the JSX in `page.js`, `ExerciseCard.js` and
   `DayView.js` has been bracket-checked and not parsed.** Build before deploying and read the
   build log rather than trusting this paragraph.
2. **A Settings toggle for `bonus_day`.** It is set directly in his row and nothing in the UI
   can change it.
3. **The delete-then-insert guard on `body_metrics`**, and a unique index behind it. This is
   the third table to need it.
4. **`exercise_logs` has no unit on the cardio fields.** His Row entries read "20", "5:36" and
   "5.39" in `time_text`, three formats in one column, so six weeks of conditioning data is
   unusable. `duration_min` and `distance_km` exist for this and the card is not always
   filling them. Fix before the conditioning half of this block generates a block's worth of
   the same mess.
5. **`readsAs()` still compares loads only**, so a rep week or a hold week reads as flat. It
   needs the rep count, the way `adaptFrom` now takes it.
6. **The block end report has still never been seen by anyone.** His block completed on
   12 September. That screen is the first time the app has to prove its own argument, and it is
   now being fed numbers that are honest rather than inflated, which makes it a much harder
   test than it would have been last week.
7. `FEATURES.md` has not been updated for any of this.

### Where I would push back on him

Last block he asked for polish while retention was flat, and the note from 4 August said to
watch the block end report rather than the next feature. That still stands, with one
correction: **he was right to push on the numbers.** Three of the four corrections on this
engine in August came from him checking a prescription against what he had actually lifted,
and the compounding loop was found the same way this time. His instinct that something was
wrong with the overload was correct even though his diagnosis of where was not.

The thing to watch now is not the engine. It is that **the app has just stopped promising him
forty percent and started promising him three**, and three percent is the honest number. If a
truthful block is less motivating than an inflated one, that is worth knowing at week six of
block two, and it is a far more important finding than anything in this file.

---

## Added 2026-09-12, later: he read the block and the block was wrong twice more

Two rounds of feedback on the block built earlier today, both correct, and between them they
undid most of the first pass. Worth reading in order, because each one exposed a fault the
previous fix had created.

### Round one: "the starting weights are too heavy"

They were, and not for the reason the earlier section would suggest. **The floor was setting
the start.** `floorFromHistory` refuses to prescribe anything easier than the best effort
logged, and the plan page fed it `last`, the most recent session for the lift regardless of
when it happened. So the previous block's peak sat under the next block's week one and **every
block had to open at a personal best.** His squat opened at 150kg x 5 against a best five of
140, because 132.5kg x 8 converts to 150kg x 5 at full Epley equivalence and rep-specific
strength is the hole in that conversion.

He also sent a corrected table with week one lowered and weeks two to six left where they
were, which put **+13 percent between weeks one and two** and then two flat weeks. That is the
same shape as the fault the whole day was spent removing, compressed into one step, so the
numbers were not taken as given.

Three changes:

- **`floorFromEst` and `bestInBlock`.** The floor is now built from THIS BLOCK's logged bests,
  which the plan page already has as `weekBests`, and is empty on week one of a new block. The
  original argument for the floor is untouched and still right, it just does not reach across
  a block boundary: Wednesday 90kg x 10 against Friday 87.5kg x 8 is two sessions in one week,
  and nothing in that argument says a new block cannot open below the old peak.
- **`OPENING_FACTOR`**, week one as a fraction of demonstrated capacity, so the opener is a
  decision rather than a side effect of the floor.
- **`capacityAt` and `anchorEstFor`.** A clean reference for "100 percent of what you can do at
  this rep count", split out so `weekFactor`'s absolute values stop being load-setting. They
  had been re-argued three times precisely because one function was doing both jobs.

### Round two: "what about adding more reps at a weight before increasing weights, we seem to be only doing 5 and 8 reps"

Also right, and this one deleted a large piece of the first pass.

The first pass chose, week by week, whichever of a plate or a rep landed closest to a capped
effort target, on the argument that at heavy loads a plate is the finer instrument. That
argument is correct and the conclusion was still wrong. It produced heavy lifts reading 150,
150, 152.5, 152.5, 155 with **nothing to chase in three of the six weeks**, and "hold the same
weight and make it cleaner" is a coaching instruction, not a prescription. Optimal tracking of
a curve is not a programme anybody wants to follow.

**Replaced with true double progression.** Each lift carries a rep RANGE. Reps climb by one
every climbing week; when the top of the range is reached the bar goes up one step and the reps
drop back to the bottom. Better for three reasons that have nothing to do with precision: there
is something to chase every week, accumulating reps at a load is real volume progression rather
than a proxy for load, and you earn the load increase by first demonstrating the reps.

**The cap now governs LOAD ONLY, and that is a correction.** `blockGainCap` limits one-rep-max
equivalent gain. Reps at a submaximal load are mostly work capacity, which comes far faster.
Epley scores 130kg x 6 to 130kg x 10 as eleven percent, which breaches a 3.3 percent cap, and
treating those as one currency is what made the first pass refuse to move the reps at all.

**The range is sized to the block.** Five climbing weeks with week one at the bottom needs four
increments, so a range four wide fills one cycle exactly: 6, 7, 8, deload, 9, 10. Derived from
the ladder, not hardcoded, and an authored range narrower than that is widened. Capped at four
because a set of six and a set of twelve train different things.

### Four faults the sweeps found during those two rounds

Each of these was live for at least one commit and each was found by a test rather than by
reading the code.

1. **An opener of 0.90 made the block loop.** A range four wide is worth 11.1 percent of
   effort, so opening at 0.90 landed the final week at 1.000 of capacity, dead level. The next
   block then re-derives the same anchor, opens at the same fraction and prescribes the same
   weight forever. **A block that only reaches capacity is a block that loops.** 0.93 lands it
   3.3 percent past, which is what the cap allows a heavy lift on a cut, so the two halves of
   the design agree without being made to.
2. **`capacityAt` inherited `workingWeight`'s 2.5kg rounding**, which put a 42kg Tricep
   Pushdown's capacity at 43.6 and a 408.8 Leg Press's at 410.3. Small, and it fed the opener
   and the break-even guard where a kilo decides whether a block finishes above capacity.
   `anchorEstFor` now serves both, unrounded.
3. **The opener rounded UP past its own ceiling.** Rounding to nearest put a Tricep Pushdown at
   30kg against an intended 28.9, which is capacity exactly rather than 93 percent of it. It
   floors to the step now: at light loads 2.5kg is most of the gap between submaximal and
   maximal.
4. **`splittable` rejected rep ranges**, so on a two-goal week the heavy day of a shared lift
   went untagged while the other goal's bare rep count still got tagged light. 768 combinations
   came out with a volume day and no heavy day to be the volume of, which is the one invariant
   that mechanism exists to keep. `lighterReps` now shifts a range as a range: 6-10 heavy
   becomes 9-13 light.

### And two in the ratio table, which is scanned first-match-wins

`test/ratios.mjs` is new and exists because of these. The table is scanned top to bottom and
the first substring match wins, so **a qualifier sitting above a movement silently captures
it**:

- **"Incline DB Curl" matched `incline` at 0.8 of the bench max** and prescribed a 72.5kg
  dumbbell curl to a man who curls 30. Renamed to Seated DB Curl as well, since the name was
  ambiguous to a reader too.
- **"Romanian Deadlift" matched the plain `deadlift` row** at 1.2 of the squat max rather than
  its own at 1.0. A twenty percent over-estimate on one of the four main lifts in his block,
  sitting there unnoticed through the whole of the earlier work.

**The rule, now written into the table itself: the specific variant and the movement go ABOVE
the generic movement and the qualifier.** Fourteen further ratios were added for movements that
the substitution table can produce and that had no row at all, so a substituted exercise no
longer arrives with no week-one suggestion.

### His block two, final

Three mornings plus the Saturday simulation. Squat, deadlift and bench on 6-10; Romanian
deadlift and incline press on 8-12; curls and the ab work on 10-15.

| lift | wk1 | wk2 | wk3 | wk4 | wk5 | wk6 |
|---|---|---|---|---|---|---|
| Back Squat | 130x6 | 130x7 | 130x8 | 120x6 | 130x9 | 130x10 |
| Bench Press | 102.5x6 | 102.5x7 | 102.5x8 | 95x6 | 102.5x9 | 102.5x10 |
| Romanian Deadlift | 135x8 | 135x9 | 135x10 | 125x8 | 135x11 | 135x12 |
| Incline DB Press | 50x8 | 50x9 | 50x10 | 45x8 | 50x11 | 50x12 |
| Cable Crunch | 25x12 | 25x13 | 25x14 | 22.5x12 | 25x15 | 27.5x16 |
| Plank | 60s | 65s | 75s | 55s | 80s | 85s |

Week one lands within 3.6 percent of every number he asked for, expressed as sixes and eights
rather than fives, and every lift finishes above demonstrated capacity. **Ab Wheel is out and
Cable Crunch is in**: he has no wheel, and the replacement is loaded on purpose so it
progresses on the same ladder as everything else rather than depending on a bodyweight anchor.

**Incline Dumbbell Press `est_max` is pinned to 69, not derived.** The card says "log the weight
of ONE dumbbell" and his logged sets read 60, 64 and 44, which as single dumbbells would be
elite for a 100kg bencher. He asked for 50kg, and 69 is the anchor that produces it. One of the
instruction and the entries is wrong and **only he can say which** — ask before touching it.

**Deadlift is new to him and has no row in `lift_maxes`**, so week one is correctly a test and
the 155kg in the table above is only the ratio-table suggestion behind it.

### Tests

`test/`, still plain Node with no dependencies. Now four suites, all passing:

```
node test/invariants.mjs   # 87,552 ladder combinations + 1,536 floor, 9 invariants
node test/week.mjs         # 18,000 weeks, 8 invariants
node test/bodyweight.mjs   # 360 anchors, 4 invariants
node test/ratios.mjs       # every ratio-table row resolves to the right movement
```

`invariants.mjs` was rewritten for double progression, and **the change worth understanding is
that effort is no longer monotonic and must not be asserted as such.** Resetting the reps when
the bar goes up makes that week genuinely easier than the last, and every lifter recognises it.
What holds instead: the bar never falls, reps stay inside the range, reps never fall at a given
load, every climbing week moves one axis or the other, the block finishes above capacity, and
load gain stays inside the cap.

### Still outstanding

1. **Still not deployed and still not built.** `registry.npmjs.org` returns 403 under this
   environment's egress policy, so `npm install` and therefore `next build` cannot run. Imports
   are walked against the filesystem, the lib modules execute under the four test suites, and
   the JSX is bracket-checked only. **Build locally and read the build log.**
2. Settings toggle for `bonus_day`.
3. The delete-then-insert guard on `body_metrics`, plus a unique index.
4. `exercise_logs` cardio units: "20", "5:36" and "5.39" all in `time_text`.
5. `FEATURES.md` and `GUIDE.md` say nothing about rep ranges, and `GUIDE.md` is what a user
   reads to understand the plan. The rep range IS the user-visible change here.
6. `increaseHint()` still returns "+2.5kg when all sets move well", which is now wrong advice:
   the answer under double progression is "add a rep until you reach the top of the range".

---

## Added 2026-09-13: the session screens, rebuilt around swiping

He said the set and rep screens were too small to read and press. Measuring the card rather
than taking that at face value moved the diagnosis: **the inputs and the log button were
already fine.** The inputs were 20px in a 56px box and the button 16px in a 56px box.
Everything he had to READ was 11 to 14px, and the worst line on the screen was the set label,
which was small AND uppercase AND letter-spaced AND in `--brand-dim`, the lowest-contrast
colour in the app. Four separate legibility costs on one line.

And it had a structural cause. One "Completed as planned" per exercise meant ten input boxes
shared a five-set card, so nothing else got room, and on Back Squat the button sat about 900px
below where you started reading.

### What changed, in the order it matters

**1. A set is logged when you do it, not at the end of the exercise.** This is the change that
makes the rest possible. `ExerciseCard` now renders a 76px row per set showing the prescribed
load and reps at 28px with a 56px tick; tapping it logs that set as prescribed with nothing
typed. The keypad still exists behind "Change the numbers" and is unchanged, because a number
a long way off plan still needs typing.

**2. One exercise per screen, swiped.** `DayView`'s vertical list of every card is now a
horizontal scroll-snap pager. It is the same list with different CSS on the container, so the
keying, the props and the state are untouched.

**3. Nothing you read mid-session is under 16px any more**, in either file, and nothing small
is also dim. `grep text-xs app/plan/ExerciseCard.js app/plan/DayView.js` returns nothing.

**4. Reference is behind one "Details" toggle**: the intensity note, the week-six projection,
the adaptation note, last time, and the form and coach tips. About 200px of card that you read
once at the start and never between sets.

**5. The five-number prescription line is gone.** "Today: 90 · 100 · 110 · 120 · 130kg" at 14px
asked you to find one number out of five. Each row carries its own.

### The three things in the write path that had to change first

These are the risky part, and all three are commented at length where they live.

- **`queueWrite` in page.js.** The duplicate-write guard was `if (writing.current[key]) return;`,
  which is correct for a double tap on one button and wrong the moment two different sets share
  a lock key: tapping set 1 then set 2 a second later silently dropped the second while the
  tick still lit up. Writes now queue behind each other rather than being discarded. Serialised,
  so the delete-then-insert pairs still cannot interleave. `logStation` and `finish` keep the
  old drop-the-second-tap behaviour, which is right for them.
- **`writeSets` skips a set with nothing in it.** It built a row per prescribed set regardless,
  so a part-filled card wrote rows of nulls. Harmless when the only way to log was one button
  at the end; not harmless when every write carries the sets that have not happened yet.
- **`doneFor` counts rows against the prescription** instead of returning true on any row. The
  first tap on Back Squat would otherwise have collapsed the card and hidden the other four
  sets, and DayView's auto-finish would have logged the session after one set of each.
  Consequence worth knowing: **skip a set and the session no longer auto-finishes.** The
  Finish session button further down DayView is still there for the days you cut short.

**Why per-set logging is safe against this project's duplicate-write history:** `completeSet`
was already a delete-then-insert of every row for the exercise on that day, so it is
idempotent. Calling it after each set replaces the exercise's rows with the current field
state rather than appending. Nothing new writes to the database.

### The pager, and the one thing that will bite whoever touches it next

Native CSS scroll-snap, no library. Three lines do the real work:

- **`overscrollBehaviorX: "contain"`** stops a swipe past the last panel chaining up to the
  browser and firing its back gesture. Without it you lose the session mid-workout.
- **`scrollSnapStop: "always"`** makes one flick move one exercise rather than skimming three.
- **The panels are INSET, not full bleed.** Nothing in CSS outranks a system gesture, so the
  edge-swipe-back on iOS and Android cannot be overridden, only avoided. A swipe that starts on
  a panel is unambiguously ours and the screen edge stays the phone's. The sliver of the next
  panel this produces is also the only thing telling anyone it swipes at all.

**`flex: "0 0 100%"` on a panel is deliberate and is not a bug.** flex-basis resolves against
the track's CONTENT box, which the 22px padding has already inset, so 100 percent IS the inset
panel. Writing `calc(100% - 44px)` subtracts the inset twice and leaves the panel at about 72
percent of the screen. I did that twice in one day, once in the prototype and once here.

**Use `scrollIntoView`, never a computed `scrollLeft`.** With `scroll-snap-type: mandatory` the
browser re-snaps to the nearest snap point after any layout change and quietly corrects a
hand-computed position to the neighbouring panel. `block: "nearest"` matters too, or logging a
set scrolls the whole page vertically.

A swipe is invisible, unreliable with wet hands and unavailable to a keyboard, so the gesture
is the fast path and the 56px arrows and dots are the contract. The session list under the
pager answers "how much is left", which is the one thing a pager takes away that a scrolling
list gave for free, and doubles as the jump menu.

`.pager` in `app/globals.css` hides the track's scrollbar. It is in the stylesheet rather than
inline because a scrollbar is a pseudo-element and an inline style cannot reach one.

### How this was verified, since `next build` still cannot run

`registry.npmjs.org` returns 403 under this environment's egress policy, so there is still no
real build. But `tsc` is available and **parses JSX**, and `react` and `react-dom` are
installed globally, which together get much closer than the bracket-counting the last two
sessions relied on:

- All four files in `app/plan/` **parse** via
  `tsc --noEmit --allowJs --jsx preserve --noResolve`. This caught a genuine bug: two `style`
  attributes on one element in DayView, which is a JSX syntax error that no amount of reading
  had spotted.
- `ExerciseCard` and `DayView` were **compiled and server-rendered** against stubs for the JSX
  imports and the real `lib/progression.js`, then asserted: the week 2 squat ramp comes out
  `90/100/110/120/130 x 7`, week 4 deloads to `120 x 6`, two logged sets render two ticks, the
  plank climbs off its logged best to 65 seconds, the five-number line is gone, nothing renders
  under 16px, and the pager emits seven inset panels with snap, containment, dots and a
  correctly disabled Previous. Every exercise kind renders without throwing: weighted,
  bodyweight reps, timed hold, per side, distance and cardio.
- The four Node suites in `test/` still pass unchanged.

**What is still NOT verified: how it looks.** The SSR output uses Tailwind classes that do not
resolve without the build, so a screenshot of it would be misleading. The visual reference is
the prototype in `_scratch/vaeon-set-logging.html`, which uses the same sizes and spacing and
can be opened in any browser. **Build it and look at it on a phone before trusting the
layout.**

### Outstanding

1. **Not deployed and not built.** As above.
2. `RestTimer` does not start when a set is logged. It should: that is the natural moment, and
   it is most of the value of logging per set rather than per exercise.
3. The **rest of the app has not had this pass.** Gym ready (`GymDayView`) still has the old
   dense layout, and the reporting screens were never looked at.
4. Settings toggle for `bonus_day`.
5. The delete-then-insert guard on `body_metrics`, plus a unique index.
6. `exercise_logs` cardio units: "20", "5:36" and "5.39" all in `time_text`.
7. `increaseHint()` still says "+2.5kg when all sets move well", which is wrong advice under
   double progression. It is no longer rendered on the card, so it is now dead copy in a live
   function rather than a visible lie, but it should be rewritten or removed.
8. `FEATURES.md` and `GUIDE.md` describe neither the rep ranges nor any of this.

---

## Added 2026-10-24: the move onto vaeonfitness.com

The app answers on **https://vaeonfitness.com**, and that is now the only address it serves
from. There were three live hostnames doing the same job: the domain, vaeon-fitness.vercel.app
and vaeongameification.vercel.app. The two vercel.app ones are now **308 Permanent Redirects**
to the domain, set in the project's Domains settings, so every old link still works and every
one of them arrives at the same place.

308 rather than 307 because permanent is what consolidates a canonical address: search engines
fold the old hosts into the new one instead of treating three addresses as three sites. The
cost is that browsers cache a permanent redirect hard, so undoing it does not take effect for
anyone who has already followed it. That is the right trade here, because the two vercel.app
names are auto-generated aliases nobody would ever want back as separate destinations.

**The domain.** Registered 3 August 2026 through Vercel, which resells via Name.com, and
delegated to NS1/NS2.VERCEL-DNS.COM. There is no registrar DNS to manage, which is the one real
advantage of having bought it inside Vercel. It is connected at the **apex** rather than a
subdomain, so there is no www record and no marketing site in front of the app. If a landing
page is ever wanted, the app moves to app.vaeonfitness.com and the apex gets the site, and that
is a change to this connection rather than to any code.

**NEXT_PUBLIC_SITE_URL is now the contract for "where does this app live".** Set to
https://vaeonfitness.com, Production only, as a Config rather than a Secret because it is a
public string that ends up in the client bundle regardless and ought to stay readable.

Two places read it:

- `app/ShareButton.js`, which previously hardcoded the vercel.app URL. That URL was correct at
  the time, which is exactly why it was worth removing: **a share URL is the one string in the
  app that nothing ever exercises**, so the day the canonical address changes it goes stale in
  silence and keeps sending people to the old host. It now falls back to the origin the visitor
  is actually on, so it cannot be wrong even if the variable is deleted.
- `app/layout.js`, via `metadataBase`, which is what lets WhatsApp, Slack and iMessage resolve
  `/icon-512.png` to something absolute. There was no `metadataBase` and no `openGraph` at all
  before this, so every shared link rendered a blank card.

**It must include the protocol.** `new URL()` throws at build time on a bare hostname. That is
deliberate and worth keeping: a failed deploy is a far better outcome than a silently wrong
canonical domain, because nothing in the app surfaces the difference.

The Open Graph image is the 512 app icon, not a purpose-made asset. It is square where the
platforms want 1200x630, so it renders as a thumbnail rather than a banner. Enough to stop links
looking broken. A proper OG image wants the wordmark on it and is a separate job.

### Still manual, and it will break password resets if it is forgotten

**Supabase Auth, URL Configuration.** Site URL must be set to https://vaeonfitness.com, and
`https://vaeonfitness.com/**` must be added to the Redirect URLs allow-list.
`app/forgot-password/page.js` builds its link from `window.location.origin`, so a reset
requested from the new domain is rejected until that origin is allow-listed. Everything else in
the auth flow is origin-relative and needs nothing.

Everyone is signed out by the move, because Supabase auth cookies are scoped per origin.

### Three things found while doing this

1. **Auto Renewal is OFF on the domain**, which expires 3 August 2027 at $11.25 a year. Vercel
   is also showing "the billing address or payment method is missing or incomplete", which is
   almost certainly the cause. Fix the payment method, then turn auto-renewal on. Losing the
   name the brand is built on, to an unticked box, would be a bad way to find this out.
2. **The team is on the Hobby plan.** Fine for a private test. Vercel's terms require Pro for
   commercial use, which matters the moment this takes money.
3. **`NEXT_PUBLIC_VAPID_PUBLIC_KEY` is not set in Vercel at all.** `lib/push.js` defaults it to
   an empty string, so `subscribeToPush` cannot ever have produced a valid subscription. That
   is consistent with `push_subscriptions` being empty: **the reminders feature has never been
   able to work in production**, and no error was ever surfaced because the whole module
   degrades to "not supported" rather than throwing. The private half is in
   `vapid-keys.local.txt`, which `.gitignore` says to delete once both halves are pasted into
   Vercel and Supabase. Only the Supabase half appears to have happened.

### The line endings, which are now in the way

About eighty files in the working tree are CRLF while every committed version is LF, so
`git status` reports the whole project as modified and every diff is unreadable. This predates
all of the above. `app/ShareButton.js` was converted to LF as part of this change so that its
diff could be reviewed at all; the rest were deliberately left alone, because renormalising
eighty files inside a domain-migration commit would bury the actual change.

The fix is a `.gitattributes` containing `* text=auto eol=lf`, then
`git add --renormalize .` as a commit of its own that touches nothing but endings. Worth doing
before the next real piece of work, not after.

---

## Added 2026-10-24: the front door, and being findable

Typing vaeonfitness.com used to produce a password box. Nothing said what the product was,
there was nothing for a search engine to read, and there was no way in for anyone who had
not already been told about Vaeon by James. The landing page existed the whole time, parked
at app/welcome/page.js with a comment saying it needed more work, and nothing linked to it.

**It now renders at "/" as a component, not as a route.** `app/Welcome.js` is rendered
directly by `app/page.js` for signed-out visitors; signed-in visitors still redirect to the
dashboard exactly as before. Two URLs carrying the same copy is duplicate content, and the
address a stranger types has to be the canonical one, so `/welcome` is now a
`permanentRedirect` home and old links still land somewhere sensible.

The brand bar needed no change: `"/"` was already in `HIDE_BAR_ON` in `app/Brand.js`,
because that list is for pages that carry their own lockup, which this one does.

### What changed in the design, and why

The copy was already good and is almost untouched. The structure was the problem. Everything
sat in one 672px column, every section had the identical label-then-bordered-box rhythm, and
there was no header, so there was no persistent way to log in or to see what the page
contained.

- **A sticky header** with the lockup, three section anchors, the theme toggle and the
  primary action. This is most of what makes a page read as a site rather than an app screen.
- **Varied widths.** Prose stays near 36rem where it is readable; the grids go to 64rem.
  One column for everything is what made it feel like a phone screen stretched wide.
- **A hairline figure row** under the hero: eight types, two minutes, six week blocks, zero
  sessions you cannot do at home. Four facts before anybody has to read a paragraph.
- **The eight types go four across** on a wide screen instead of two. They are the strongest
  visual asset in the product and they were being shown small.
- **What it is and what it is not sit side by side** rather than stacked in one box, because
  the honesty is the argument and splitting it makes both halves read.

Everything still comes from `lib/personality.js` and `lib/brand.js`, so the page cannot
describe a product different from the one that ships, and it follows `data-theme` like every
other screen rather than hardcoding the dark palette.

### Two Tailwind v4 traps this hit, both caught before deploy

**The important modifier moved from a prefix to a suffix.** `!px-4` is v3 and generates
nothing in v4; it is `px-4!` now. The header button was written with `!px-4 !py-2` and would
have silently rendered at full size, which is the worst kind of bug because the page still
builds and still looks deliberate. Fixed by passing padding as a prop, which cannot fail
that way. **If a utility seems to do nothing in this repo, check it is not v3 spelling.**

**Arbitrary-value colour hovers are fragile.** `hover:text-[color:var(--brand-text)]` is a
v3 spelling whose failure mode is a nav that looks dead on hover. Replaced with a
`.site-nav-link` class in `globals.css`. Same for the sticky header's translucency, which
needs a solid fallback and therefore two declarations of the same property, which an inline
style object cannot express: it is `.site-header`, behind an `@supports` query for
`backdrop-filter`.

### Indexing

`app/robots.js` and `app/sitemap.js` are new. Everything behind the login is disallowed, not
because it is secret, it is protected by auth rather than by robots.txt, but because a
crawler that follows `/dashboard` gets bounced to the login form and reports a pile of thin
near-identical pages. That is how a small site teaches Google most of it is worthless. The
sitemap lists three URLs: the landing page, signup and the disclaimer.

Both read `NEXT_PUBLIC_SITE_URL` and fall back to the literal domain.

**Google still has to be told the site exists.** Nothing here submits it. Add the property in
Search Console and submit `https://vaeonfitness.com/sitemap.xml`.

### Verification, given there is still no local build

`node_modules` is not installed and npm is blocked by the egress policy, so none of this has
been through `next build`. What it has been through: a `tsc` parse of every changed file, a
`react-dom/server` render of the landing page asserting 40 things including that all eight
types appear with their orbs and taglines and that every nav anchor has a matching target, 11
assertions on the robots and sitemap output, and 8 source checks that specifically fail if
either Tailwind v3-ism reappears. **The thing none of that covers is what it looks like.**
Open it and judge the design with your eyes before telling anyone about it.

---

## Added 2026-10-24, later: the landing page gets a voice of its own

Second pass on the front door, at James's direction: an opening animation, a photograph,
softer type, softer buttons, the character renders instead of the orbs, and the Unify credit
removed.

**The page no longer looks like the app, on purpose.** The app is Space Grotesk on near-black
at 4px radius because it is a tool used at arm's length in bad gym lighting and it should feel
machined. This is the one screen talking to somebody who has never heard of Vaeon, and that
same engineered face makes the pitch feel cold. So the page runs **Carlito** (metric-compatible
with Calibri, derived from Lato), 12px buttons and 14px panels.

**All of it is scoped.** `.site-soft` and the `.site-*` / `.btn-*` / `.panel-*` classes in
globals.css. Nothing touches the app. If that divergence is wrong and the whole product should
soften, the change is in those classes rather than scattered through the page.

**Carlito ships 400 and 700 and nothing else.** Asking next/font for 300, 500 or 600 fails the
build, so the page is designed in two weights deliberately. Do not reach for `font-medium` or
`font-semibold` here.

### A latent bug this surfaced

`BrandLockup` sets **no font-family at all**, so it inherits whatever it lands in. app/layout.js
says "Space Grotesk for display and the wordmark", but since body is Inter, the wordmark has in
fact been rendering in Inter everywhere in the app. On this page it would have inherited
Carlito, i.e. the logo quietly changing typeface on its own front page.

Patched here with `.site-wordmark`, which pins the display face back on. **The app-wide version
of this bug is still live.** The real fix is a font-family inside BrandLockup, which would
correct every screen at once; it was left alone because it changes the look of the whole app
and that is a decision rather than a tidy-up.

### The opening, and why it is pure CSS

The mark lands, then Vaeon rises a letter at a time, then the card lifts off the hero. The
stagger is an `animation-delay` per letter and the lift is one keyframe. No client component,
no timer to drift, no hydration mismatch. `visibility` is animated to hidden at the end so the
card cannot sit invisible over the hero swallowing the first tap.

**app/Splash.js is suppressed on "/"** via a new `HIDE_ON` list. Otherwise a first-time visitor
got the app's "Welcome to Vaeon" card and then this one: two intros on one page load.

Scroll reveals use `animation-timeline: view()` behind an `@supports` query rather than an
IntersectionObserver. No JavaScript, nothing to leak, and a browser without support simply shows
the content, which is the right fallback for a page whose job is to be readable.

Every animation has a `prefers-reduced-motion` path, and the reduced-motion case removes the
opening card outright rather than racing it.

### The hero photograph

`public/hero.webp`: a sled push, supplied by James. Pre-cropped to 4:5 and centred on the
figure, which is the ratio the panel declares, so `background-size: cover` crops nothing.
1000x1250, 37KB, small because the frame is mostly dark and webp handles that well.

The crop was placed by finding the figure rather than the frame: a brightness centroid put
it at 39% across, which was the white lane markings, so it was redone on warm pixels
(R-B > 38) and landed at 60%, which is where he actually is. Worth remembering if the
image is ever swapped for another dark-track shot.

Swapping it is a file swap and nothing else. A differently shaped image still works, since
`cover` plus `center 30%` keeps a head in frame. A missing file degrades to the empty
surface panel rather than a broken-image icon, because this is a background-image.

**Two things to settle about this picture, neither of them technical.** It carries a visible
adidas wordmark on the headband, which is incidental in a photograph but is a third-party
trade mark on a commercial page. And nobody has written down where the photograph came from
or who owns it: if it is not James's own, a licence needs to exist before this is marketing
rather than a test.

### Verification

Still no local build. 37 render assertions, 43 source checks, and a `tsc` parse of every changed
file. The source checks specifically fail if a Tailwind v3 spelling returns, if any animation
loses its reduced-motion path, or if a class is used in JS without being defined in CSS.

**Unverified: that Carlito 400/700 resolves on Google Fonts.** It is a four-style family and
those are the two upright weights, but the check could not be completed from here. A wrong
weight fails `next build` loudly rather than shipping broken, so the deploy log is the test.
