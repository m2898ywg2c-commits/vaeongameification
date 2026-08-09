# The Monk, character brief

**4 of 8.** Planned - Experience - Solo. "Discipline as a daily ritual."

**Palette: `#4CC9F0` main, `#155E75` deep. Nothing else appears on this character.**

## What makes this one the Monk

The only one defined by what it does not have. Distinguishing feature: a
**completely smooth, seamless shell**. No panel lines, no plating, no fittings. One continuous
surface from helmet to boot. Still and balanced, weight perfectly even, as though it could hold
the pose for an hour.

**Check it against the Captain.** Same 20 degree hue gap, opposite treatment: that one is the
most built-up figure in the set and this is the smoothest. The contrast has to carry them
apart at small sizes, because the colours barely will.

## The prompt

> A stylised 3D chibi robot character, standing neutrally at rest, weight even on both feet,
> arms relaxed at the sides with clear space between the arms and the torso. Three-quarter
> view, eye level, head turned to camera, confident and capable rather than cute. Large
> rounded pearl-white helmet with a smooth dark visor, matte charcoal armour panels, chunky
> boots, a small V chevron on the chest. A completely smooth seamless shell with no panel
> lines, no plating and no fittings, perfectly balanced stance. Accent panels and glowing eyes
> in clear sky blue #4CC9F0, with deep petrol blue #155E75 in the recesses, no other hues.
> Soft key light from upper left, gentle rim light on the right edge. Clean vector-friendly
> forms, smooth surfaces, minimal texture. Full body, centred, generous margin. Transparent
> background, no floor, no shadow, no scenery, no light effects.

## Locked, identical across all eight

| Rule | Value |
|---|---|
| Camera | Three-quarter, eye level, head to camera |
| Pose | Neutral standing, arms clear of the torso |
| Lighting | Key upper left, soft rim right, no cast shadow |
| Crop | Full body, centred, same scale as the other seven |
| Background | **Genuinely transparent.** Not dark, not "removable later" |
| Palette | Neutral chassis plus the two colours above, nothing else |
| Mood | Confident and capable. Never aggressive, comic or cute |
| Output | 2048px square, PNG with alpha |

## Seven layers, not one picture

All seven on the **identical 2048px canvas at the identical position**. No trimming, no
cropping to content. A layer trimmed to its own content will not line up.

| File | Contains |
|---|---|
| `monk-shadow.png` | Contact shadow only, black on alpha |
| `monk-body.png` | Torso, hips, legs, boots. No arms, no head |
| `monk-arm-l.png` | Shoulder to fingertip, cut at the joint |
| `monk-arm-r.png` | As above |
| `monk-head.png` | Helmet shell. **Visor cut out to transparent** |
| `monk-visor.png` | The dark glass only, no eyes |
| `monk-glow.png` | Eyes and chest mark, **drawn in flat white** |

**The glow layer is white, not clear sky blue.** The app tints it with the user's own colour at
runtime, so the eyes can never disagree with the type and light theme needs no second artwork.

Behind each arm needs painting in, or the arm rotates and reveals a hole.

## Before you accept it

1. Squint. Does the **silhouette alone** read as a Vaeon robot?
2. Beside the shipped Monk, is it recognisably the same character?
3. Delete the background. Is there a character left, or was it the scenery?
4. At 60px, do the details above survive?
5. **Rotate an arm layer 30 degrees. Does it clip the torso?** This is the one that fails.

## Its flourish

All eight share one animation. On top of it, this one gets a single move on the glow layer:
**one slow breath, the glow swelling and settling, nothing else moving**.
