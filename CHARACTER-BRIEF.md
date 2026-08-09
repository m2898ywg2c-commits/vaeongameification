# Vaeon type characters, creative brief

Rewritten 2026-08-09. The previous version of this file briefed eight 3D animal mascots and
was already historical when it was written: what actually shipped was eight stylised robots
cropped out of a poster. **The animals are cancelled.** Nobody is commissioning an owl.

This brief keeps the robots that exist, fixes what is wrong with them, and adds the one thing
they were never built to do, which is move.

---

## What exists today, and the four things wrong with it

`public/characters/` holds sixteen 512px WebP files, a full figure and a face crop for each of
the eight types, about 250KB for the set. They are chibi robots: a large rounded pearl-white
helmet, a glossy black visor, glowing eyes, black armour panels, a small V chevron on the
chest, stubby limbs and chunky boots. The read is right. Confident, capable, not cute, not
aggressive. Keep the character.

Everything else about the delivery is a problem.

**1. The background is baked in and there is no alpha.** The characters are charcoal black and
so are their backdrops, so nothing can key them apart. This is why `TypeCharacter` frames them
in a dark medallion: dropped raw onto the light theme they are black rectangles, and light
theme is the one feature in this app that exists for accessibility rather than taste. The
medallion is an honest workaround for a bad asset, not a design decision, and it should not
survive this round.

**2. The identity lives in the scenery, which is the part that has to go.** Look at the
Hunter. Orange is its colour, the scene is full of orange lightning, and the robot's own eyes
are cyan. The Architect stands in front of violet holographic panels. The Anchor is ringed by
a magenta halo. Strip the background, which we must, and roughly half the set stops being
identifiable as its type at all.

**3. Every one is a different photograph.** The Hunter is mid-stride, cropped tight and
diagonal. The Anchor is centred, full body, hugging a glowing heart. The Architect is
three-quarter with its arms out at a console. Different camera, different scale, different
eye-line, different pose. They read as a set only because the backgrounds are dark. You cannot
write one animation that works across a running figure and a standing one.

**4. It is a single flat raster, so nothing can move.** This is the whole reason for the
rewrite.

---

## The point of this round: assets that can be animated

The completion fanfare (`app/plan/SessionFanfare.js`) currently draws rays, rings, sparks or a
bloom in the user's own two colours and puts a **static face crop** in the middle of it. The
burst is decent. The character just sits there while it happens.

That is not a code problem. There is nothing in a flattened JPEG-with-extra-steps to move. The
fanfare is as good as a flat asset allows, and every further hour spent on the CSS returns
almost nothing until the artwork changes.

So the deliverable is not eight pictures. **It is eight rigs.**

---

## The delivery spec, which is the part that matters

Get this wrong and the whole exercise produces prettier versions of the same dead end.

### Layers, exported separately

Seven files per character, plus the rig file. Every layer sits on the **identical square
canvas** at the identical position, so the app stacks them with `position:absolute; inset:0`
and no arithmetic. No trimming, no cropping to content, no "tidying up" the bounding box. A
layer trimmed to its own content is a layer that will not line up, and finding that out costs
an afternoon per character.

| Layer | File | Contains |
|---|---|---|
| Shadow | `hunter-shadow.png` | The soft contact shadow only. Black on alpha, nothing else |
| Body | `hunter-body.png` | Torso, hips, legs, boots. No arms, no head |
| Left arm | `hunter-arm-l.png` | Shoulder to fingertip, cut at the shoulder joint |
| Right arm | `hunter-arm-r.png` | As above |
| Head | `hunter-head.png` | Helmet shell and ears. **Visor cut out to transparent** |
| Visor | `hunter-visor.png` | The dark glass only, no eyes |
| Emissive | `hunter-glow.png` | Eyes and the chest chevron, **drawn in flat white** |

### The emissive layer is drawn white on purpose

The app tints it at runtime with the user's own accent. Three things fall out of that, all of
them worth more than they sound:

- **The Hunter can never again have cyan eyes.** A character's glow cannot disagree with its
  type when the type is what colours it.
- **Light theme works for free.** `lib/personality.js` already carries two colours per type,
  `colors[0]` for dark and `colors[1]` for light, and `accentFor()` already picks between
  them. The glow follows the theme with no second set of artwork.
- **The fanfare gets something to drive.** Pulsing a white mask through the user's colour is
  one CSS filter. Repainting a baked-in orange glow to violet is not possible at all.

### Registration and pivots

Deliver one `rig.json` for the set, pivots expressed as fractions of the canvas so they hold at
every render size:

```json
{
  "hunter": {
    "shoulderL": [0.34, 0.46], "shoulderR": [0.66, 0.46],
    "bob":       [0.50, 0.72],
    "eyeLine":    0.28,
    "groundLine": 0.88
  }
}
```

`bob` is the pivot for the whole-body squash and jump. `eyeLine` and `groundLine` are what let
eight different characters share one animation without one of them appearing to float.

### Pose

**One neutral pose, identical across all eight.** Standing, weight even, arms relaxed at the
sides with a hand's width of daylight between arm and torso so the arm layer can rotate without
clipping. Three-quarter view, head to camera, eye level.

Characterisation comes from the silhouette and the fittings, not from a different pose. The
Architect keeps its antenna. The Anchor keeps the chest heart. The Gladiator keeps whatever the
Gladiator has. What none of them keeps is its own private camera angle, because a shared rig is
the entire point and a running figure cannot share a rig with a standing one.

If losing the Hunter mid-stride feels like a loss, it is not: a rigged character can run. A
picture of a running character can only ever run in that one direction at that one speed.

### Output

- **2048px square masters, PNG with alpha**, one per layer.
- Ship at **512px WebP with alpha**, same as now. Fifty-six files across the set, but a user
  only ever loads their own, so it is about 200 to 300KB per person. That is the same budget
  as today for something that moves.
- No drop shadow, no glow, no ambient light and no floor ring baked into any layer. All of it
  is drawn by CSS in the user's colours. **Nothing may carry a colour that is not the
  character's own.**

---

## The locked rules

Unchanged from the previous brief where they were right, which is most of them. Lock these
before generating number two.

**These live in two places.** This table and a copy inside every one of the eight briefs in
`character-briefs/`. Change one, change all nine, the same discipline as `lib/brand.js` and
`app/globals.css`. The duplication is deliberate, because a brief that points elsewhere for its
rules is a brief whose rules do not get read, but duplication only survives if everybody knows
it is there.

| Rule | Value |
|---|---|
| Subject | Chibi robot, as shipped: pearl helmet, dark visor, armour panels, V chevron |
| Camera | Three-quarter view, eye level, head to camera |
| Pose | Neutral standing, arms clear of the torso |
| Lighting | Key from upper left, soft rim from the right, no cast shadow in the layers |
| Crop | Full body, centred, generous margin, identical scale across all eight |
| Background | **Genuinely transparent.** Not dark. Not "removable later" |
| Palette | Neutral chassis, plus that type's pair on the panels and the glow, nothing else |
| Surface | Smooth, vector-friendly, minimal texture |
| Mood | Confident and capable. Never aggressive, never comic, never cute |
| Output | 2048px square, PNG with alpha, layered per the table above |

---

## The eight, one file each

**This document does not brief the characters.** Canva caps a field at 4,000 characters and
this file is four times that. Eight characters in one document is also how a rule gets changed
for one of them and quietly not for the other seven.

Each character has a standalone brief in `character-briefs/`, between 3,500 and 3,800
characters, carrying its own prompt, palette, layer filenames and the locked rules repeated in
full. Hand over one file, get back one character. `character-briefs/00-README.md` is the index.

| Brief | Type | Code | Main | Deep | Distinguishing feature |
|---|---|---|---|---|---|
| `01-hunter.md` | The Hunter | Freestyle · Outcome · Solo | `#FF8C42` | `#7A2E0E` | Narrow visor slit, head forward |
| `02-architect.md` | The Architect | Planned · Outcome · Solo | `#7C8CF8` | `#3D2E8C` | Antenna, fine panel seams |
| `03-captain.md` | The Captain | Planned · Outcome · Together | `#2DD4BF` | `#0F766E` | Raised shoulder pauldrons |
| `04-monk.md` | The Monk | Planned · Experience · Solo | `#4CC9F0` | `#155E75` | Smooth seamless shell |
| `05-anchor.md` | The Anchor | Planned · Experience · Together | `#AE63F0` | `#5B2394` | Chest heart, planted stance |
| `06-gladiator.md` | The Gladiator | Freestyle · Outcome · Together | `#E052A0` | `#6B1547` | Bracers and shin guards |
| `07-wanderer.md` | The Wanderer | Freestyle · Experience · Solo | `#3DDC97` | `#0E5C3F` | No plating, exposed joints |
| `08-spark.md` | The Spark | Freestyle · Experience · Together | `#FF6B57` | `#8C2318` | Oversized visor, roundest |

Everything the briefs share, they repeat rather than reference. That is deliberate: a brief
that says "see the other document for the rules" is a brief whose rules do not get read.

The numbering is the order to make them in. **The Hunter is first because it is the pilot**:
strongest colour in the set, the type James holds so he will spot a wrong note fastest, and the
one currently taking its whole identity from its background, which makes it the hardest case
rather than the easiest. Take it all the way through to layered files and a working animation
in the app before anybody generates a second character.

Two pairs to watch, both flagged again inside their own briefs:

- **The Captain and the Monk are 20 degrees apart in hue**, measured on the rendered artwork
  rather than the hex codes, and they are the tightest pair in the set. That is why they are
  consecutive. Make them back to back and put them side by side at 38px before committing to
  anything after them.
- **The Spark and the Hunter** are both warm, coral against orange. Round against trim, and the
  largest visor in the set against the smallest, is all that separates them.

---

## Where Canva fits, honestly

Canva is the wrong tool for the character itself and the right tool for everything around it.

**What it cannot reliably do:** produce a character on true alpha, and separate one figure into
seven registered layers. Background Remover will give you a cutout with soft edges and a
guessed matte, which is fine for a poster and useless as an animation layer. Nothing in Canva
splits an arm from a torso and invents what was behind it.

**Two honest routes:**

- **Illustrator, a few hundred pounds.** Give them the eight existing renders, this brief, and
  the rig table. Layered delivery is a normal ask and they will not blink at it. This is also
  what secures the copyright: a purely AI-generated image may attract no UK copyright because
  there is no human author, and significant human modification restores it in the human-added
  parts. Redrawing is that modification.
- **Generate, then cut by hand.** An image model with a transparent-background prompt, then
  separate the layers in Affinity or Photoshop and paint in what was behind each arm. About an
  hour a character once the first one is solved, and free.

**What Canva is genuinely for here:** the explainer deck (`DAHQwUUrgIk`, still waiting on the
brand kit going black with the cyan and blue accents), the share card, the App Store artwork,
the second video covering kudos and the leaderboard. Composite the finished layers there.

And the standing warning: **Canva's AI rewrites your copy every single time.** It turned "the
plan builds itself around it" into "achieve optimal results with personalised guidance",
invented six leaderboard cards nobody briefed, and dropped a whole scene. Budget a repair pass.

---

## What the layers buy: the completion fanfare

Written here rather than in the code, because none of it can be built until the assets exist.
The current implementation is in `app/plan/SessionFanfare.js` and its keyframes are in
`globals.css`. Keep both. This extends them, it does not replace them.

Today: four burst variants, chosen deterministically by hashing the day key and the type id, in
the user's own two colours, behind a static face. **Do not make the burst random**, the reason
is in the file and it is a good one.

With a rig, the moment becomes three beats. Roughly 1.2 seconds end to end, which is long
enough to feel like something and short enough that nobody taps past it on session forty.

**Beat one, anticipation, 0 to 180ms.** Body scales to 0.94 on the vertical about the `bob`
pivot. Arms rotate 8 degrees inward. Shadow tightens and darkens. Emissive dims to 40 percent.
The character gathers itself.

**Beat two, release, 180 to 620ms.** Body springs to 1.06 and translates up about six percent
of the canvas. Arms swing out and up to 45 degrees. Shadow scales out and fades to 30 percent
opacity, which is what sells the jump far more than the jump does. Emissive flares to 100
percent and briefly overshoots to white. The existing burst fires here, on the same frame.

**Beat three, settle, 620 to 1200ms.** Body lands with one small overshoot, 1.02 then 1.0. Arms
ease back to neutral. Shadow returns. Emissive decays to a slow two-second pulse and stays
there while the card is open, so the character is alive rather than merely finished.

Three things to hold onto:

- **The head lags the body by about 60ms** on beats one and two. That single offset is most of
  the difference between a rig moving and a character moving, and it costs one
  `animation-delay`.
- **Per-type flourish on the emissive layer only.** The Architect's antenna pulses twice, the
  Anchor's chest heart beats, the Spark's glow flickers. One layer, one keyframe each, and it
  is the cheapest characterisation in the whole app.
- **`prefers-reduced-motion` collapses all of it** to a 300ms emissive fade with no movement.
  Not an afterthought: a bouncing character is exactly the kind of motion that causes trouble,
  and this app already takes astigmatism and halation seriously enough to have built a whole
  theme system around them.

---

## How they get used in the app

**The orb stays. Do not replace it.** A detailed character is a smudge at 24px and unreadable
at 38px on the leaderboard.

- **Under 60px**, the existing coloured orb. Dashboard header, leaderboard rows, type card.
- **Above that**, the character. Assessment result, type page, block end, share card, and the
  session fanfare, which is the only place it moves.

`TypeCharacter.js` already enforces the 60px floor and hands back the orb below it. When the
alpha assets land, **delete the dark medallion**, the background colour and the border from
that component. The comment explaining why the medallion exists is the acceptance test: when
that comment stops being true, the work is done.

That also means this ships one character at a time. One rigged Hunter is useful on its own.

---

## Timing, honestly

The same warning as the last version of this file, and it has not aged out.

Twelve to fifteen profiles, four people have ever logged an exercise, and the longest anyone
has kept it up is three separate days. The six-week test ends around 10 September and the
block end report on 31 August is the first time this app has to prove its own argument.

**Eight beautiful robots will not get a thirteenth person to log a session.** A better
completion animation is a reward for people who are already finishing sessions, which is
currently a group of four.

Two things make this worth doing anyway, and they are worth being precise about rather than
hand-waving. The first is that the alpha problem is a live bug with a visible workaround, and
that is worth fixing on its own terms whatever happens to the mascots. The second is that the
fanfare is the moment a person might screenshot, and identity is the sharable part.

So: **do the Hunter.** One character, all the way through, alpha and layers and the three-beat
animation in the app. Then look at what week six of the test actually says about whether type
predicts adherence at all, and decide about the other seven with that in hand. If the types
turn out to be decoration, you will have spent one character finding out instead of eight.
