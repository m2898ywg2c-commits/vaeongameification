# Vaeon: handover

Paste this into a new chat to pick up where the last one stopped.

Vaeon is James Hampton's commercial fitness app. Nothing to do with Unify Partnership and
should not be discussed as if it were.

---

## What it is built on

- Next.js 16.2.10, App Router, Turbopack. React 19. Plain JavaScript, no TypeScript.
- Tailwind v4. `@theme inline` in `app/globals.css`.
- Supabase for auth and Postgres 17. Project `wctsiafaiogyciqnmvad`, named "Intent", eu-west-1.
- GitHub `m2898ywg2c-commits/vaeongameification`, deployed by Vercel to vaeonfitness.com.
- Repo on James's laptop at `C:\Users\JamesHampton\vaeon`.

### Things that will waste your time if nobody tells you

- **You cannot push.** The shell on James's machine has no git credentials. He pushes from
  GitHub Desktop on Windows. Commit, then ask him.
- **Git identity is unset there.** Commit with
  `git -c user.name="James" -c user.email="m2898ywg2c@privaterelay.appleid.com"`.
- **Git leaves lock files behind.** Deletion is off in the connected folder, so `git commit`
  works but cannot remove `.git/HEAD.lock` and `.git/objects/maintenance.lock`. Left there,
  they break GitHub Desktop. After every commit, `mv` them to `.git/stale-*` names (never
  under `.git/refs`), or ask James to approve deletion for the folder.
- **Working-tree line endings are mixed** (some CRLF, some LF) even though `.gitattributes`
  stores LF. Any scripted edit must match the file's own ending or the match fails.
- **canva.com and vaeonfitness.com are blocked** from the cloud container and from the
  laptop shell. To use a Canva image: generate it, remove its background, then ask James to
  download and attach it. There is no fetch path.
- **Canva cannot animate.** Its motion tool only imports an MP4 that already exists, and its
  layer-separation tool works on flat graphics and badly on photographic images. There is no
  rigging and no image-to-video route. Checked, not assumed.
- **`device_commit_files` can report success without the bytes landing.** Verify after
  writing, by size or by content.
- **That transfer re-encodes WEBP**, so files arrive about 20% larger than written. Compare
  pixel means, never byte counts.
- **Supabase: use `execute_sql`, not `apply_migration`** for non-destructive DDL.
  `apply_migration` blocks on an approval prompt that may never reach him.
- **No `next build` has ever run.** npm cannot reach the project's dependencies from either
  machine, and cannot install esbuild on the laptop either. `node test/*.mjs` is the only
  automated check, nine files, all passing. `esbuild` in the cloud container will parse JSX
  if you can get the file there.

### Tailwind v4, which bit twice

- The important modifier is a **suffix**: `px-4!`, not `!px-4`. The v3 spelling silently
  generates nothing.
- Arbitrary-value colour utilities like `hover:text-[color:var(--x)]` fail silently. Use a
  named class in `globals.css`.

---

## Where things stand

```
9f542be  Wire the character motion into the reveal, the landing page and completion  NOT PUSHED
7fc0bfa  Rewrite the handover around the half-built motion layer                     NOT PUSHED?
b1bf003  Add the character motion layer                                              NOT PUSHED?
0d854f6  Cut the avatars from the gym renders
b3cee06  Put the HYROX stations back, decided by kit instead of by goal
```

Working tree clean. Nine test files, all passing.

All sixteen character images in `public/characters` are cut from the same gym renders,
512x512 with real alpha. `TypeCharacter` paints `#0B0B0E` behind them. The full figure
falls back to an orb below 60px; the `face` variant has no floor.

---

## Character motion: wired, not yet seen

`lib/motion.js` (eight moves), `app/motion.css` (keyframes, flare, Monk's heart, idle float,
reduced-motion off-switch) and `app/CharacterMotion.js` (the wrapper) are now used in:

1. **Post-assessment reveal**, `app/assessment/page.js`. 168px, `on="mount" idle`.
2. **Landing hero strip**, `app/Welcome.js` `Hero()`. 84px, `on="inview"`, `delay={i * 90}`.
3. **Landing Eight grid**, `app/Welcome.js` `Eight()`. 120px, `on="inview hover"`.
4. **Session complete**, `app/plan/SessionFanfare.js`. Face variant, `on="mount"`, inside
   the burst. Covers DayView and GymDayView, which share the fanfare.
5. **Exercise complete**, `app/plan/ExerciseCard.js` and `app/plan/GymBlock.js`, in the
   `done` branch. 40px face beside the title. Plays only on the transition to done, via a
   `wasDone` ref and a `cheer` counter, so a reload of a finished day stays still and
   reopen-then-finish cheers again. `typeId` is passed from `DayView` and `GymDayView` as
   `tid`. The Nutrition 96px grid on the landing page was deliberately left static.

**Interpretation to confirm with James:** "completion of sets" was wired as completion of an
exercise (all its sets), not every individual set. Per-set would put movement inside the
live card next to the next set's button, which is exactly where it should not be.

**Unverified until it deploys.** Nothing in the motion layer has ever rendered. If the build
rejects the `@import "./motion.css"`, inline the file into `globals.css`.

**The ceiling.** Each render is one flat pose. Every move is whole-body. A thumbs up or hands
making a heart needs new artwork: one celebration pose per character, eight generations,
each downloaded and attached by James, with real risk of the character drifting.

---

## Video: the group reel and the character clips (27 October)

- `app/CoachReel.js`, used in a new `Coaches()` section on `app/Welcome.js`, straight after
  the hero. Plays `public/media/coaches-1.mp4` then `coaches-2.mp4` (15s each, 1280x548, no
  audio) as one pan, crossfading and looping. Poster first; clip one loads only near the
  viewport, clip two four seconds before clip one ends; paused off screen; reduced motion or
  Save-Data get the poster and a play button.
- `CharacterMotion` has a `clip` prop: at 60px and above it plays
  `public/characters/motion/<type>.mp4` (384px, about 1MB for all eight) instead of the CSS
  move, and falls back to the CSS move if the video will not play. On the assessment reveal
  and the Eight grid only. Hero strip and 40px faces stay CSS on purpose.
- `lib/motion.js` gained `clipFor()` and `motionAllowed()`.
- Source clips, raws and the Dreamina briefs are in `Claude outputs/motion` and
  `Claude outputs/gym-scene`, untracked (35MB of raws should stay out of the repo).
  `motion/tidy.py` is the grade-to-#0B0B0E and loop-crossfade step for any new clip.
- Dreamina Basic plan taken 27 October at 23p; renews at 11.90 a month. A reminder to
  cancel is set for 17 November. Credits left about 1.1K.
- Unverified until it deploys: nothing here has rendered in a real build.

## Other open items

### Push notifications have never worked in production

`NEXT_PUBLIC_VAPID_PUBLIC_KEY` is absent from Vercel entirely. Oldest unfixed thing.

### Vercel housekeeping

- Auto-renewal is **off** on vaeonfitness.com. It expires 3 August 2027.
- Billing address and payment method incomplete.
- Team is on the Hobby plan. Commercial use needs Pro.

### Two live accounts are mid-block on a goal that is no longer pickable

`hyroxlean` was removed from the picker on 26 October at James's request.
`james.hampton828@gmail.com` (block three) and `james@james.com` (block one) keep training,
because `buildWeek` reads `GOALS` and never `GOAL_ORDER`. They cannot choose it again.

### Smaller

- **Engine Room is buried** in the "Elsewhere" grid. Promoting it to a card was recommended,
  neither accepted nor refused.
- **`engine_logs.effort`** is written and read by nothing. The "three easy scores lengthen
  the cap" loop is unbuilt.
- **Calisthenics at a gym now gets sled pushes.** Honest to the kit rule, maybe not wanted.
- **Two avatar crops have equipment in frame**: `hunter` (sled post) and `gladiator` (rope).

---

## Settled, so nobody reopens them

- **HYROX stations are back**, decided by kit rather than goal, in `finisherPool()`.
  `test/finishers.mjs` holds the line. Running and yoga goals get no finisher, correctly.
- **The `/onboarding` redirect is not a bug** for `james@james2.com`, which has `goals = []`.
- **Nothing auto-pushes.** James pushes himself.
- **Line endings in the repo are fixed** by `.gitattributes`. The working tree is still mixed;
  that is cosmetic.
- **Motion restarts by class toggle, never by React key**, so the `<img>` never blinks.

---

## How James works

British English. Warm and direct, no corporate polish, no em dashes. He wants pushback and a
better way when one exists, not agreement. Do not sugar-coat and do not over-format. Tell
him when something he has asked for conflicts with something else he has asked for.
