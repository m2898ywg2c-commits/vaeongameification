# The Anchor, character brief

**5 of 8.** Planned - Experience - Together. "The reliable heartbeat of every class."

**Palette: `#AE63F0` main, `#5B2394` deep. Nothing else appears on this character.**

## What makes this one the Anchor

Distinguishing feature: a **heart outline on the chest**, drawn as an emissive ring
around the V chevron rather than instead of it. The chevron stays, it is on all eight. Planted
stance, feet a touch wider than the others, low centre of gravity. It should look like it is
not going anywhere.

This type moved from amber to violet and the shipped render was recoloured by hue rotation
rather than redrawn. Draw this one violet from the start. Both posters still show an orange
Anchor and need doing separately.

## The prompt

> A stylised 3D chibi robot character, standing neutrally at rest, weight even on both feet,
> arms relaxed at the sides with clear space between the arms and the torso. Three-quarter
> view, eye level, head turned to camera, confident and capable rather than cute. Large
> rounded pearl-white helmet with a smooth dark visor, matte charcoal armour panels, chunky
> boots, a small V chevron on the chest. An emissive heart outline on the chest surrounding
> the V chevron, planted stance with feet slightly wider than shoulder width. Accent panels
> and glowing eyes in bright violet #AE63F0, with deep royal purple #5B2394 in the recesses,
> no other hues. Soft key light from upper left, gentle rim light on the right edge. Clean
> vector-friendly forms, smooth surfaces, minimal texture. Full body, centred, generous
> margin. Transparent background, no floor, no shadow, no scenery, no light effects.

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
| `anchor-shadow.png` | Contact shadow only, black on alpha |
| `anchor-body.png` | Torso, hips, legs, boots. No arms, no head |
| `anchor-arm-l.png` | Shoulder to fingertip, cut at the joint |
| `anchor-arm-r.png` | As above |
| `anchor-head.png` | Helmet shell. **Visor cut out to transparent** |
| `anchor-visor.png` | The dark glass only, no eyes |
| `anchor-glow.png` | Eyes and chest mark, **drawn in flat white** |

**The glow layer is white, not bright violet.** The app tints it with the user's own colour at
runtime, so the eyes can never disagree with the type and light theme needs no second artwork.

Behind each arm needs painting in, or the arm rotates and reveals a hole.

## Before you accept it

1. Squint. Does the **silhouette alone** read as a Vaeon robot?
2. Beside the shipped Anchor, is it recognisably the same character?
3. Delete the background. Is there a character left, or was it the scenery?
4. At 60px, do the details above survive?
5. **Rotate an arm layer 30 degrees. Does it clip the torso?** This is the one that fails.

## Its flourish

All eight share one animation. On top of it, this one gets a single move on the glow layer:
**a double heartbeat in the chest, then a slow decay**.
