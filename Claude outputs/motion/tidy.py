# Tidy a Dreamina character clip for Vaeon: fade everything outside the figure to the
# app's own #0B0B0E so it sits invisibly in TypeCharacter's medallion, which also buries
# the corner "AI" badge. Usage: python3 tidy.py in.mp4 out_stem
import sys, subprocess, numpy as np
src, stem = sys.argv[1], sys.argv[2]
# Optional third argument: how wide the protected area is, as a share of half the frame.
# 0.70 suits a figure on its own; a barbell reaching the edges needs about 1.0.
XW = float(sys.argv[3]) if len(sys.argv) > 3 else 0.70
W = H = 960; OUT = 512
BG = np.array([11, 11, 14], np.float32)
dec = subprocess.Popen(["ffmpeg","-v","error","-i",src,"-vf","fps=24","-f","rawvideo","-pix_fmt","rgb24","-"], stdout=subprocess.PIPE)
yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
# Ellipse round the figure. Wider than tall would cut feet, so it is tall and narrow,
# centred slightly low because the figure stands low in frame.
nx = (xx - W*0.5) / (W*0.5); ny = (yy - H*0.52) / (H*0.5)
# Superellipse rather than ellipse: square-ish, so it protects the feet near the bottom
# edge and the dome near the top while still clearing all four corners and both sides.
d = ((nx/XW)**4 + (ny/1.0)**4) ** 0.25
keep = np.clip((1.15 - d) / 0.20, 0, 1); keep = keep*keep*(3-2*keep)  # smoothstep
keep = keep[..., None]
frames = []
while True:
    buf = dec.stdout.read(W*H*3)
    if len(buf) < W*H*3: break
    f = np.frombuffer(buf, np.uint8).reshape(H, W, 3).astype(np.float32)
    # Pull the background's grey down towards BG without touching the bright parts of
    # the robot: only pixels darker than ~70 are drawn towards BG, in proportion.
    lum = f.mean(axis=2, keepdims=True)
    sat = f.max(axis=2, keepdims=True) - f.min(axis=2, keepdims=True)
    # Greys only. The accent lights and their reflections are saturated, so they are
    # left exactly as rendered; only the near-neutral studio backdrop is pulled down.
    dark = np.clip((70 - lum) / 50, 0, 1) * np.clip((28 - sat) / 18, 0, 1) * 0.55
    f = f*(1-dark) + BG*dark
    f = f*keep + BG*(1-keep)
    frames.append(np.clip(f, 0, 255).astype(np.uint8))
dec.wait()
a, b = frames[0].astype(np.float32), frames[-1].astype(np.float32)
gap = float(np.abs(a-b).mean())
print("frames", len(frames), "first/last mean abs diff", round(gap, 2))
# A loop whose last frame does not land on its first hitches on every repeat. When the
# gap is bigger than the clean clips (3 to 4), blend the final third of a second into the
# opening frame so the repeat is a settle rather than a jump.
if gap > 6:
    N = 8
    for i in range(N):
        k = len(frames) - N + i
        t = (i + 1) / N; t = t*t*(3-2*t)
        frames[k] = (frames[k].astype(np.float32)*(1-t) + a*t).astype(np.uint8)
    print("crossfaded last", N, "frames; new gap", round(float(np.abs(a-frames[-1].astype(np.float32)).mean()), 2))
raw = b"".join(fr.tobytes() for fr in frames)
common = ["ffmpeg","-v","error","-y","-f","rawvideo","-pix_fmt","rgb24","-s",f"{W}x{H}","-r","24","-i","-","-an","-vf",f"scale={OUT}:{OUT}:flags=lanczos"]
subprocess.run(common+["-c:v","libx264","-preset","veryfast","-crf","22","-pix_fmt","yuv420p","-movflags","+faststart",stem+".mp4"], input=raw, check=True)
subprocess.run(common+["-c:v","libvpx-vp9","-b:v","0","-crf","42","-row-mt","1","-deadline","good","-cpu-used","4",stem+".webm"], input=raw, check=True)
from PIL import Image
Image.fromarray(frames[0]).resize((OUT,OUT), Image.LANCZOS).save(stem+"-poster.webp", quality=85)
# contact sheet: 5 frames
idx = np.linspace(0, len(frames)-1, 5).astype(int)
sheet = Image.new("RGB", (5*240, 240))
for i,k in enumerate(idx): sheet.paste(Image.fromarray(frames[k]).resize((240,240)), (i*240,0))
sheet.save(stem+"-sheet.png")
