# The Captain, character brief

**3 of 8.** Planned - Outcome - Together. "Leads from the front and lifts the room."

**Palette: `#2DD4BF` main, `#0F766E` deep. Nothing else appears on this character.**

## What makes this one the Captain

Distinguishing feature: **raised shoulder pauldrons**, slightly wider than the
chassis, giving it the broadest top half in the set. Upright, chest open, chin level.
Confident rather than swaggering. It is leading, not posing.

**Check it against the Monk before going further.** They are 20 degrees apart in hue on the
rendered artwork and are the tightest pair in the set. If they read as the same character at
38px, the pauldrons are not doing enough work.

## The prompt

> A stylised 3D chibi robot character, standing neutrally at rest, weight even on both feet,
> arms relaxed at the sides with clear space between the arms and the torso. Three-quarter
> view, eye level, head turned to camera, confident and capable rather than cute. Large
> rounded pearl-white helmet with a smooth dark visor, matte charcoal armour panels, chunky
> boots, a small V chevron on the chest. Raised shoulder pauldrons slightly wider than the
> chassis, upright open-chested stance. Accent panels and glowing eyes in bright teal #2DD4BF,
> with deep pine teal #0F766E in the recesses, no other hues. Soft key light from upper left,
> gentle rim light on the right edge. Clean vector-friendly forms, smooth surfaces, minimal
> texture. Full body, centred, generous margin. Transparent background, no floor, no shadow,
> no scenery, no light effects.

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
| `captain-shadow.png` | Contact shadow only, black on alpha |
| `captain-body.png` | Torso, hips, legs, boots. No arms, no head |
| `captain-arm-l.png` | Shoulder to fingertip, cut at the joint |
| `captain-arm-r.png` | As above |
| `captain-head.png` | Helmet shell. **Visor cut out to transparent** |
| `captain-visor.png` | The dark glass only, no eyes |
| `captain-glow.png` | Eyes and chest mark, **drawn in flat white** |

**The glow layer is white, not bright teal.** The app tints it with the user's own colour at
runtime, so the eyes can never disagree with the type and light theme needs no second artwork.

Behind each arm needs painting in, or the arm rotates and reveals a hole.

## Before you accept it

1. Squint. Does the **silhouette alone** read as a Vaeon robot?
2. Beside the shipped Captain, is it recognisably the same character?
3. Delete the background. Is there a character left, or was it the scenery?
4. At 60px, do the details above survive?
5. **Rotate an arm layer 30 degrees. Does it clip the torso?** This is the one that fails.

## Its flourish

All eight share one animation. On top of it, this one gets a single move on the glow layer:
**light sweeps across the pauldrons, left to right, on the release**.
