"use client";

import { useEffect, useRef, useState } from "react";
import { motionAllowed } from "@/lib/motion";

// THE EIGHT COACHES TRAINING TOGETHER, AS ONE CONTINUOUS PAN.
//
// Two fifteen second clips: the Hunter, Gladiator, Spark and Captain, then the Anchor, Monk,
// Architect and Wanderer. The first ends on a reach to the right and the second opens on a
// hand arriving from the left, so played back to back they read as one camera move across
// one room. They crossfade into each other and loop.
//
// WHY IT LOADS THE WAY IT DOES.
//
// The two files are five megabytes between them, which is more than everything else on this
// page put together, and this page is the one somebody opens on mobile data in a gym. So:
//
//  1. Nothing but a 40KB poster until the reel is within a screen of the viewport. The poster
//     is an <img loading="lazy">, so it costs nothing either until it is near.
//  2. Clip one only gets a src when the reel is about to be seen.
//  3. Clip two gets its src four seconds before clip one ends, not before. Somebody who
//     scrolls past never downloads it.
//  4. Playback pauses whenever the reel is off screen, so a backgrounded tab is not decoding
//     video nobody is watching.
//  5. Reduced motion or Save-Data: the poster stays, with a button to play it on purpose.
//     Choosing to watch is fine; being made to is what those settings are for.
const CLIPS = [
  { src: "/media/coaches-1.mp4", poster: "/media/coaches-1.webp" },
  { src: "/media/coaches-2.mp4", poster: "/media/coaches-2.webp" },
];
const PRELOAD_NEXT_S = 4;
const FADE_MS = 500;

export default function CoachReel({ label }) {
  const wrapRef = useRef(null);
  const vids = [useRef(null), useRef(null)];

  const [near, setNear] = useState(false);
  const [visible, setVisible] = useState(false);
  const [auto, setAuto] = useState(false);
  const [chosen, setChosen] = useState(false);
  const [loaded, setLoaded] = useState([false, false]);
  const [current, setCurrent] = useState(0);
  const [shown, setShown] = useState(false);

  const running = (auto || chosen) && near;

  function load(i) {
    setLoaded(function (l) {
      if (l[i]) return l;
      const next = l.slice();
      next[i] = true;
      return next;
    });
  }

  // Decide once on mount whether this viewer gets autoplay. Decided in an effect because
  // matchMedia does not exist during the server render.
  useEffect(function () { setAuto(motionAllowed()); }, []);

  // Two thresholds from one observer: a generous margin to start loading before the reel
  // arrives, and plain visibility to decide whether to play or pause.
  useEffect(function () {
    const el = wrapRef.current;
    if (!el || typeof IntersectionObserver === "undefined") { setNear(true); setVisible(true); return undefined; }
    const nearIo = new IntersectionObserver(function (e) {
      if (e[0].isIntersecting) setNear(true);
    }, { rootMargin: "100% 0px" });
    const seenIo = new IntersectionObserver(function (e) {
      setVisible(e[0].isIntersecting);
    }, { threshold: 0.15 });
    nearIo.observe(el);
    seenIo.observe(el);
    return function () { nearIo.disconnect(); seenIo.disconnect(); };
  }, []);

  useEffect(function () { if (running) load(0); }, [running]);

  // Play the current clip while on screen, pause it when not.
  useEffect(function () {
    const v = vids[current].current;
    if (!v || !loaded[current]) return;
    if (running && visible) {
      const p = v.play();
      if (p && typeof p.catch === "function") p.catch(function () { /* autoplay refused: poster stays */ });
    } else {
      v.pause();
    }
  }, [running, visible, current, loaded[0], loaded[1]]);

  function onTime(i) {
    const v = vids[i].current;
    if (!v || !v.duration) return;
    if (v.duration - v.currentTime < PRELOAD_NEXT_S) load((i + 1) % CLIPS.length);
  }

  function onEnded(i) {
    const n = (i + 1) % CLIPS.length;
    const next = vids[n].current;
    load(n);
    if (next) {
      try { next.currentTime = 0; } catch (e) { /* not ready; play() starts at 0 */ }
    }
    setCurrent(n);
  }

  return (
    <div
      ref={wrapRef}
      className="panel-soft border overflow-hidden relative w-full"
      style={{ aspectRatio: "1280 / 548", background: "#0B0B0E", borderColor: "var(--brand-line)" }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={CLIPS[0].poster}
        alt={label}
        loading="lazy"
        decoding="async"
        width={1280}
        height={548}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
      />
      {CLIPS.map(function (c, i) {
        return (
          <video
            key={c.src}
            ref={vids[i]}
            src={loaded[i] ? c.src : undefined}
            muted
            playsInline
            preload={loaded[i] ? "auto" : "none"}
            aria-hidden="true"
            onTimeUpdate={function () { onTime(i); }}
            onEnded={function () { onEnded(i); }}
            onPlaying={function () { if (i === current) setShown(true); }}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              opacity: shown && current === i ? 1 : 0,
              transition: "opacity " + FADE_MS + "ms ease-in-out",
              pointerEvents: "none",
            }}
          />
        );
      })}
      {!auto && !chosen ? (
        <button
          type="button"
          onClick={function () { setChosen(true); setNear(true); }}
          className="absolute left-4 bottom-4 px-4 py-2 text-sm font-bold"
          style={{ background: "rgba(11,11,14,0.78)", color: "#fff", border: "1px solid rgba(255,255,255,0.25)", borderRadius: 999 }}
        >
          Play the coaches
        </button>
      ) : null}
    </div>
  );
}
