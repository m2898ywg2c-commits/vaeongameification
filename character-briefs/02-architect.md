# The Architect, character brief

**2 of 8.** Planned - Outcome - Solo. "Precision-built progress, one block at a time."

**Palette: `#7C8CF8` main, `#3D2E8C` deep. Nothing else appears on this character.**

## What makes this one the Architect

Distinguishing feature: a **single slim antenna** from the crown of the helmet, plus
fine panel seams down the torso and limbs, as though it were assembled rather than moulded.
Precise, not fussy. The seams are drawn lines, not texture. If they turn to mush at 60px they
were too fine.

The current render stands in front of floating holographic panels. Those go. The character has
to be the Architect on its own.

## The prompt

> A stylised 3D chibi robot character, standing neutrally at rest, weight even on both feet,
> arms relaxed at the sides with clear space between the arms and the torso. Three-quarter
> view, eye level, head turned to camera, confident and capable rather than cute. Large
> rounded pearl-white helmet with a smooth dark visor, matte charcoal armour panels, chunky
> boots, a small V chevron on the chest. A single slim antenna rising from the crown of the
> helmet, fine panel seams along the torso and limbs. Accent panels and glowing eyes in soft
> periwinkle blue #7C8CF8, with deep indigo #3D2E8C in the recesses, no other hues. Soft key
> light from upper left, gentle rim light on the right edge. Clean vector-friendly forms,
> smooth surfaces, minimal texture. Full body, centred, generous margin. Transparent
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
| `architect-shadow.png` | Contact shadow only, black on alpha |
| `architect-body.png` | Torso, hips, legs, boots. No arms, no head |
| `architect-arm-l.png` | Shoulder to fingertip, cut at the joint |
| `architect-arm-r.png` | As above |
| `architect-head.png` | Helmet shell. **Visor cut out to transparent** |
| `architect-visor.png` | The dark glass only, no eyes |
| `architect-glow.png` | Eyes and chest mark, **drawn in flat white** |

**The glow layer is white, not soft periwinkle blue.** The app tints it with the user's own colour at
runtime, so the eyes can never disagree with the type and light theme needs no second artwork.

Behind each arm needs painting in, or the arm rotates and reveals a hole.

## Before you accept it

1. Squint. Does the **silhouette alone** read as a Vaeon robot?
2. Beside the shipped Architect, is it recognisably the same character?
3. Delete the background. Is there a character left, or was it the scenery?
4. At 60px, do the details above survive?
5. **Rotate an arm layer 30 degrees. Does it clip the torso?** This is the one that fails.

## Its flourish

All eight share one animation. On top of it, this one gets a single move on the glow layer:
**the antenna tip pulses twice, quickly, like something transmitting**.
