# The Spark, character brief

**8 of 8.** Freestyle - Experience - Together. "If it is fun, it gets done."

**Palette: `#FF6B57` main, `#8C2318` deep. Nothing else appears on this character.**

## What makes this one the Spark

The roundest and most open of the eight. Distinguishing feature: an **oversized
visor**, noticeably larger than the rest of the set, in the roundest helmet, on the most
upright body.

This is the one closest to the cute line and it still must not cross it. No head bigger than
the chibi proportion the others share, no exaggerated expression, no tilt. Open and
enthusiastic, not childlike.

**Watch it against the Hunter.** Coral and orange are close and both are warm. The Spark is
round where the Hunter is trim, and has the largest visor in the set where the Hunter has a
slit. Those two facts do all the work.

## The prompt

> A stylised 3D chibi robot character, standing neutrally at rest, weight even on both feet,
> arms relaxed at the sides with clear space between the arms and the torso. Three-quarter
> view, eye level, head turned to camera, confident and capable rather than cute. Large
> rounded pearl-white helmet with a smooth dark visor, matte charcoal armour panels, chunky
> boots, a small V chevron on the chest. An oversized visor noticeably larger than the rest of
> the set, the roundest helmet and the most upright body. Accent panels and glowing eyes in
> warm coral red #FF6B57, with deep rust #8C2318 in the recesses, no other hues. Soft key
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
| `spark-shadow.png` | Contact shadow only, black on alpha |
| `spark-body.png` | Torso, hips, legs, boots. No arms, no head |
| `spark-arm-l.png` | Shoulder to fingertip, cut at the joint |
| `spark-arm-r.png` | As above |
| `spark-head.png` | Helmet shell. **Visor cut out to transparent** |
| `spark-visor.png` | The dark glass only, no eyes |
| `spark-glow.png` | Eyes and chest mark, **drawn in flat white** |

**The glow layer is white, not warm coral red.** The app tints it with the user's own colour at
runtime, so the eyes can never disagree with the type and light theme needs no second artwork.

Behind each arm needs painting in, or the arm rotates and reveals a hole.

## Before you accept it

1. Squint. Does the **silhouette alone** read as a Vaeon robot?
2. Beside the shipped Spark, is it recognisably the same character?
3. Delete the background. Is there a character left, or was it the scenery?
4. At 60px, do the details above survive?
5. **Rotate an arm layer 30 degrees. Does it clip the torso?** This is the one that fails.

## Its flourish

All eight share one animation. On top of it, this one gets a single move on the glow layer:
**a quick triple flicker, then straight into the steady pulse**.
