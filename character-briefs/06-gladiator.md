# The Gladiator, character brief

**6 of 8.** Freestyle - Outcome - Together. "Built for game day."

**Palette: `#E052A0` main, `#6B1547` deep. Nothing else appears on this character.**

## What makes this one the Gladiator

Distinguishing feature: **layered forearm bracers and shin guards**, thicker than
anything else in the set. The heaviest build of the eight.

Ready rather than aggressive, and this is the line to hold. Kit for competing, not for
fighting. Nothing spiked, nothing bladed, no scowl. The mood rule bites hardest here because
the name pulls the other way. Weight slightly forward on the balls of the feet, but still a
neutral standing pose: it shares a rig with seven others and cannot have its own.

## The prompt

> A stylised 3D chibi robot character, standing neutrally at rest, weight even on both feet,
> arms relaxed at the sides with clear space between the arms and the torso. Three-quarter
> view, eye level, head turned to camera, confident and capable rather than cute. Large
> rounded pearl-white helmet with a smooth dark visor, matte charcoal armour panels, chunky
> boots, a small V chevron on the chest. Layered armoured forearm bracers and shin guards, the
> heaviest build in the set, weight slightly forward. Accent panels and glowing eyes in hot
> magenta pink #E052A0, with deep plum #6B1547 in the recesses, no other hues. Soft key light
> from upper left, gentle rim light on the right edge. Clean vector-friendly forms, smooth
> surfaces, minimal texture. Full body, centred, generous margin. Transparent background, no
> floor, no shadow, no scenery, no light effects.

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
| `gladiator-shadow.png` | Contact shadow only, black on alpha |
| `gladiator-body.png` | Torso, hips, legs, boots. No arms, no head |
| `gladiator-arm-l.png` | Shoulder to fingertip, cut at the joint |
| `gladiator-arm-r.png` | As above |
| `gladiator-head.png` | Helmet shell. **Visor cut out to transparent** |
| `gladiator-visor.png` | The dark glass only, no eyes |
| `gladiator-glow.png` | Eyes and chest mark, **drawn in flat white** |

**The glow layer is white, not hot magenta pink.** The app tints it with the user's own colour at
runtime, so the eyes can never disagree with the type and light theme needs no second artwork.

Behind each arm needs painting in, or the arm rotates and reveals a hole.

## Before you accept it

1. Squint. Does the **silhouette alone** read as a Vaeon robot?
2. Beside the shipped Gladiator, is it recognisably the same character?
3. Delete the background. Is there a character left, or was it the scenery?
4. At 60px, do the details above survive?
5. **Rotate an arm layer 30 degrees. Does it clip the torso?** This is the one that fails.

## Its flourish

All eight share one animation. On top of it, this one gets a single move on the glow layer:
**the forearm bands light in sequence, wrist to elbow**.
