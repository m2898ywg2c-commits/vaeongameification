# Tests

Plain Node, no runner, no dependencies. `node_modules` is not installed in this repo and these
deliberately do not need it.

```
node test/invariants.mjs   # the load ladder: 87,552 combinations + 1,536 floor, 9 invariants
node test/week.mjs         # buildWeek: 18,000 weeks, 8 invariants
node test/bodyweight.mjs   # the bodyweight and hold ladder: 360 anchors, 4 invariants
node test/ratios.mjs       # every LIFT_RATIOS row resolves to the right movement
node test/ladder.mjs       # James's real six weeks, printed rather than asserted
node test/block2.mjs       # block two as the cards will render it, printed
```

They import `lib/progression.js` and `lib/training.js` directly, which is why
`lib/progression.js` imports `./week.js` with the extension rather than `./week`. Webpack and
Turbopack resolve both; Node only resolves the first. Do not take the extension off again.

## Why these exist

Every serious bug in the progression engine has been a bug in a TOTAL, not in a week, and every
one survived review because each week looked fine on its own:

- `LIGHT_DAY_LOAD` at 0.95 against a week six factor of 1.05, so the volume day finished a
  block 0.2 percent below where it started. Two defensible multipliers, cancelling.
- The anchor feeding on its own output, so six weeks compounded 40 to 173 percent onto James's
  lifts while every single week's step looked reasonable.
- The floor pinned to all history rather than to the block, so every block had to open at a
  personal best.
- An opener of 0.90 against a rep range worth 11.1 percent, which landed the final week dead
  level with capacity. **A block that only reaches capacity is a block that loops**: the next
  one re-derives the same anchor and prescribes the same weight forever.

**Check a block by its start-to-finish gain, never by whether each week looks sensible.**

## The invariants

### Load ladder (`invariants.mjs`)

Double progression, so **effort is not monotonic and must not be asserted as such**. Resetting
the reps when the bar goes up makes that week genuinely easier than the last, and every lifter
recognises it. What holds is the contract:

1. The bar never goes down across climbing weeks.
2. Reps always sit inside the range.
3. At a given load the reps never go down.
4. Every climbing week adds a rep or adds load, unless the range is topped out AND the load
   allowance is spent, which is the only legal hold.
5. The block finishes above demonstrated capacity.
6. Load gain across the block stays inside `blockGainCap`, with one step always allowed.
7. The deload is lighter than the week before it and back at the bottom of the range.
8. `workingSets`, `ladderFor` and `blockProjection` agree week for week.
9. The in-block floor is never breached on a non-deload week.

### Week builder (`week.mjs`)

1. No exercise repeats on consecutive days.
2. Nothing appears more than twice in a week.
3. No empty days, no duplicate day titles, every day gets a slot.
4. No light day without a matching heavy day.
5. A `fixed` day arrives exactly as authored: no substitutions, no intensity tags.
6. A hybrid goal at three or more sessions always contains conditioning work.

Number six is there because it did not hold. The HYROX goal's two conditioning days sat at
positions five and six of its day list, and `buildWeek` takes `days.slice(0, n)`, so at three or
four sessions a week they were unreachable. Six weeks of a HYROX plan produced five conditioning
entries in total.

Number four is there because it stopped holding when rep ranges were added: `splittable`
rejected "8-12", so a shared lift's heavy day went untagged while the other goal's bare rep
count still got tagged light.

### Ratio table (`ratios.mjs`)

`LIFT_RATIOS` is scanned top to bottom and the **first substring match wins**, so a qualifier
sitting above a movement silently captures it. Two shipped:

- "Incline DB Curl" matched `incline` at 0.8 of the bench max and prescribed a 72.5kg dumbbell
  curl to a man who curls 30.
- "Romanian Deadlift" matched the plain `deadlift` row at 1.2 of the squat max rather than its
  own at 1.0, a twenty percent over-estimate on one of his four main lifts.

**The rule: the specific variant and the movement go ABOVE the generic movement and the
qualifier.** A curl, a fly or a raise goes above `incline`; `incline`, `decline` and grip
variations go below. `romanian` and `rdl` go above `deadlift`.
