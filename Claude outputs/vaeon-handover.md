# Vaeon: handover

Paste this into a new chat to pick up where this one stopped.

Vaeon is James Hampton's commercial fitness app. It is nothing to do with Unify
Partnership and should not be discussed as if it were.

---

## What it is built on

- Next.js 16.2.10, App Router, Turbopack. React 19. Plain JavaScript, no TypeScript.
- Tailwind v4. `@theme inline` lives in `app/globals.css`.
- Supabase for auth and Postgres 17. Project `wctsiafaiogyciqnmvad`, named "Intent", eu-west-1.
- GitHub `m2898ywg2c-commits/vaeongameification`, deployed by Vercel to vaeonfitness.com.
- The repo sits on James's laptop at `C:\Users\JamesHampton\vaeon`.

### Things that will waste your time if nobody tells you

- **You cannot push.** The shell on James's machine has no git credentials: no helper,
  no token, no SSH key. James pushes himself from GitHub Desktop on Windows. Commit,
  then ask him.
- **Git identity is unset in that shell.** Commit with
  `git -c user.name="James" -c user.email="m2898ywg2c@privaterelay.appleid.com"`,
  which matches the existing history.
- **canva.com and vaeonfitness.com are both blocked** from the cloud container and from
  the laptop shell. Package registries work in the container. To get a Canva image,
  generate it, remove its background, then ask James to download and attach it.
- **`device_commit_files` can report success without the bytes landing.** It did exactly
  that once in this session. Verify afterwards by size or content, not by the response.
- **That transfer re-encodes WEBP**, so files arrive roughly 20% larger than you wrote.
  Compare pixel means, never byte counts, when checking a file arrived intact.
- **Supabase: use `execute_sql`, not `apply_migration`** for non-destructive DDL.
  `apply_migration` blocks on an approval prompt that may never reach him. It timed out
  four times before anyone worked that out.
- **No `next build` has ever run.** npm cannot reach the project's dependencies from
  either machine, so every visual change in this project is unverified until deployed.
  `node test/*.mjs` is the only automated check, and all eight files currently pass.
  `esbuild` installed in the container will parse JSX if you need a syntax check.

### Tailwind v4, which bit twice

- The important modifier is a **suffix** now: `px-4!`, not `!px-4`. The v3 spelling
  silently generates nothing.
- Arbitrary-value colour utilities like `hover:text-[color:var(--x)]` fail silently.
  Use a named class in `globals.css` instead.

---

## Where things stand

Last four commits, newest first:

```
b3cee06  Put the HYROX stations back, decided by kit instead of by goal     NOT PUSHED
f4272ea  Create vaeon-handover.md
12f1df8  Put the gym robots on the front page and say an AI writes the plan
7bfb16c  Decide line endings once, in the repo, instead of 77 times a day
c3dc6fb  Rebuild the Wanderer so it belongs to the family
3044ae1  Put the characters in the gym
```

Working tree is clean. Only `b3cee06` is waiting to go up.

Nine test files now, not eight. `test/finishers.mjs` is the new one.

The eight character renders in `public/characters/*.webp` are now gym poses with real
alpha channels, 512x512. The eight `*-face.webp` crops were deliberately left alone and
are still the older calm portraits, so the two sets are different artwork of the same
character tied together by accent colour. That is written down in `app/TypeCharacter.js`
so nobody reads it as an oversight.

---

## Open items, most important first

### 1. HYROX stations are back, decided by kit  (DONE, 26 Oct, commit b3cee06)

This was the top item and it is now fixed, so read it as context rather than as work.

The stations were reachable only by picking a HYROX goal, and once both HYROX goals left
the picker they were reachable by nobody. Gating on the goal was the wrong axis: a sled
push is not a preference, it is a question of whether there is a sled in the room. So
`finisherPool()` in `lib/training.js` now asks about kit. A gym gets HYROX stations
whatever goal was picked; home or no equipment keeps the kit-free set. Null counts as a
gym, matching onboarding's default and `plan/page.js`'s existing homeMode rule.

`buildWeek` gained a sixth argument, `equipment`, passed from `app/plan/page.js`.

The pool was also five stations against an eight station event, so burpee broad jumps,
farmers carry and wall balls were added.

Two things to know. Fourteen of twenty accounts are at a gym and every one of their weeks
now ends differently. And running and yoga goals still get no finisher at all, whatever
the kit, because every focus they own is on `NO_FINISHER`. The stations land on the
lifting goals: cut, bulk, glutes, strength, calisthenics and general.

`test/finishers.mjs` holds the line, 2731 checks. The one that matters is that no home or
equipment-free profile is ever handed a station.

Calisthenics at a gym now gets sled pushes, which follows the kit rule but may not be what
anyone wants. Nobody has looked at that yet.

### 2. Two live accounts are mid-block on hyroxlean

`james.hampton828@gmail.com` is on block three with a start date of 25 October, the day
before the goal was cut. `james@james.com` is on block one. Both keep training normally,
because `buildWeek` reads `GOALS` and never reads `GOAL_ORDER`. What they lose is the
ability to choose it again: open the goal picker, change anything, and the option they are
currently training under is not on the list.

Unlike the five goals removed on the 24th, this one was not unoccupied. Worth telling him
plainly if he touches goals again.

### 3. Push notifications have never worked in production

`NEXT_PUBLIC_VAPID_PUBLIC_KEY` is absent from Vercel entirely. The code ships, the feature
cannot work. This is the oldest unfixed thing on the list.

### 4. Vercel housekeeping

- Auto-renewal is **off** on vaeonfitness.com. It expires 3 August 2027.
- Billing address and payment method are incomplete.
- The team is on the Hobby plan. Commercial use needs Pro.

### 5. Asked for, never started

- **Post-assessment reveal**: when someone finishes the assessment, the robot should be
  front and centre and animated. Nothing has been built.
- **Engine Room placement**: it is buried in the "Elsewhere" grid on the dashboard.
  Promoting it to a proper card was recommended and not accepted or refused.
- **`engine_logs.effort`** is written on every Engine Room session and read by nothing.
  The intended loop, three "easy" scores lengthening the cap or adding a station, is
  unbuilt.

### 6. Optional

The face crops could be regenerated from the new gym poses for consistency. The argument
against is that a head-and-shoulders crop of a robot mid sled-push makes a poor 38px
avatar, which is why it has not been done. His call.

---

## Settled, so nobody reopens them

- **The `/onboarding` redirect is not a bug.** A browser signed in as `james@james2.com`,
  a test account created on 24 October with `goals = []`, correctly gets sent from the
  dashboard to onboarding. His real accounts have goals and go straight through.
- **Nothing auto-pushes.** An earlier commit appearing on the remote unprompted was James
  pushing it himself between messages.
- **The line-ending churn is fixed.** 77 files showed as permanently modified because the
  repo stored LF, the worktree wrote CRLF, and git had no instruction. `.gitattributes`
  settles it. Nothing needed renormalising, because what was in git was already correct.

---

## How James works

British English. Warm and direct, no corporate polish, no em dashes. He wants pushback and
a better way when one exists, not agreement. Do not sugar-coat and do not over-format.
He is building this himself and takes correction well, so tell him when something he asked
for conflicts with something else he asked for, which has happened twice now.
