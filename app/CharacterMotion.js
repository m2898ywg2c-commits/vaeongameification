"use client";

import { useEffect, useRef, useState } from "react";
import TypeCharacter from "./TypeCharacter";
import { TYPES } from "@/lib/personality";
import { moveFor, clipFor, motionAllowed } from "@/lib/motion";

// A character that moves.
//
// TWO KINDS OF MOVE, AND WHICH ONE PLAYS IS DECIDED AT THE MOMENT IT PLAYS.
//
// Every character has a CSS move (lib/motion.js, app/motion.css): whole-body, free, instant,
// and the only thing the 40px faces can use. Each of the eight also has a short video of it
// doing its own gym move, in public/characters/motion. Pass `clip` and, where the character
// is big enough to read and the viewer has not asked for less motion or less data, the video
// plays instead of the CSS move. If the video cannot play for any reason, the CSS move plays
// in its place, so a missing file or a blocked autoplay costs nothing but the upgrade.
//
// THE VIDEO IS NOT FETCHED UNTIL THE FIRST TIME IT IS NEEDED.
//
// No src until the first play, so a page with eight clip-enabled characters below the fold
// downloads none of them until somebody scrolls there. Once loaded it stays mounted and
// shows its last frame, which was cut to match its first, so the character does not jump
// back to the still render when the clip ends.
//
// WHY THE CSS ANIMATION IS RESTARTED BY TOGGLING A CLASS AND NOT BY CHANGING A KEY.
//
// Keying the element would remount TypeCharacter, and remounting it remounts an <img>.
// Cached or not, that is a frame where the picture is not there, and on a hover-to-play
// strip the user would see eight characters blink every time the mouse crossed one.
// Removing the class, forcing a reflow so the removal actually lands, then adding it back
// restarts the keyframes on the SAME element with the SAME image. The reflow read is not
// superstition: without it the browser coalesces the remove and the add and nothing
// replays.
//
// WHY REDUCED MOTION IS HANDLED IN CSS FOR THE CSS MOVES.
//
// Every mv-* class is switched off under prefers-reduced-motion in motion.css, so a user
// who changes the setting while the app is open gets the new behaviour immediately. The
// video is gated in JavaScript by motionAllowed(), checked at play time for the same reason.
//
// on: which triggers play the move. Any combination of "mount", "hover" and "inview".
//     "inview" plays each time the character scrolls back into view, not only the first
//     time, because a landing page people scroll up and down should keep its life.
// idle: a slow ambient float underneath the move. For the big reveal, where the character
//     is on screen for a while and standing perfectly still looks dead.
// delay: ms to wait before playing, so a row of eight can stagger rather than twitch in
//     unison.
// replayKey: change it to play the move again on an element that is already mounted.
// clip: play the character's video move instead of the CSS one where possible.
const CLIP_FLOOR = 60;

export default function CharacterMotion({ typeId, size, variant, on, idle, delay, replayKey, className, clip }) {
  const move = moveFor(typeId);
  const t = TYPES[typeId];
  const s = size || 120;
  const clipSrc = clip && variant !== "face" && s >= CLIP_FLOOR ? clipFor(typeId) : null;

  const [plays, setPlays] = useState(0);
  const [clipOn, setClipOn] = useState(false);
  const [clipShown, setClipShown] = useState(false);
  const [clipFailed, setClipFailed] = useState(false);
  const bodyRef = useRef(null);
  const wrapRef = useRef(null);
  const videoRef = useRef(null);

  const modes = String(on || "mount");
  const onMount = modes.indexOf("mount") !== -1;
  const onHover = modes.indexOf("hover") !== -1;
  const onInview = modes.indexOf("inview") !== -1;
  const wait = Number(delay) || 0;

  function play() {
    setPlays(function (n) { return n + 1; });
  }

  useEffect(function () {
    if (!onMount) return undefined;
    const id = setTimeout(play, 60 + wait);
    return function () { clearTimeout(id); };
  }, [onMount, wait, replayKey]);

  useEffect(function () {
    if (!onInview) return undefined;
    const el = wrapRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return undefined;
    let timer = null;
    const io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        timer = setTimeout(play, wait);
      });
    }, { threshold: 0.35 });
    io.observe(el);
    return function () {
      io.disconnect();
      if (timer) clearTimeout(timer);
    };
  }, [onInview, wait]);

  // The CSS move, or the hand-off to the clip.
  useEffect(function () {
    if (!plays) return undefined;
    if (clipSrc && !clipFailed && motionAllowed()) {
      setClipOn(true);
      return undefined;
    }
    const el = bodyRef.current;
    if (!el) return undefined;
    const cls = "mv-" + move.key;
    el.classList.remove(cls);
    // Read a layout property so the class removal is committed before it is re-added.
    // Without this the two mutations collapse into no change at all and nothing replays.
    void el.offsetWidth;
    el.classList.add(cls);
    const id = setTimeout(function () { el.classList.remove(cls); }, move.ms + 60);
    return function () { clearTimeout(id); };
  }, [plays, move.key, move.ms, clipSrc, clipFailed]);

  // Start the clip from the top on every play. A rejected play() is an autoplay policy or a
  // missing file; either way the clip is abandoned for this character and the CSS move takes
  // over, so the user still sees something happen.
  useEffect(function () {
    if (!clipOn || !plays) return;
    const v = videoRef.current;
    if (!v) return;
    try { v.currentTime = 0; } catch (e) { /* not loaded yet; play() starts at 0 anyway */ }
    const p = v.play();
    if (p && typeof p.catch === "function") {
      p.catch(function () {
        setClipFailed(true);
        setClipOn(false);
        setClipShown(false);
        setPlays(function (n) { return n + 1; });
      });
    }
  }, [clipOn, plays]);

  if (!t) return <TypeCharacter typeId={typeId} size={s} variant={variant} className={className} />;

  const hover = onHover ? play : undefined;
  const usingClip = clipOn && !clipFailed;
  const radius = Math.round(s * 0.14);

  return (
    <div
      ref={wrapRef}
      className={"mv-wrap" + (className ? " " + className : "")}
      style={{ "--mv-accent": t.colors[0], width: s, height: s }}
      onMouseEnter={hover}
      onFocus={hover}
    >
      {plays > 0 ? <i key={"flare" + plays} className="mv-flare" aria-hidden="true" /> : null}
      {plays > 0 && move.ornament === "heart" && !usingClip ? (
        <svg key={"heart" + plays} className="mv-heart" viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M12 21s-7.5-4.7-9.4-9.2C1.2 8.3 3.1 5 6.4 5c2 0 3.4 1.1 4.3 2.4l1.3 1.8 1.3-1.8C14.2 6.1 15.6 5 17.6 5c3.3 0 5.2 3.3 3.8 6.8C19.5 16.3 12 21 12 21z"
            fill="var(--mv-accent)"
          />
        </svg>
      ) : null}
      <div ref={bodyRef} className="mv-body" style={{ animationDuration: move.ms + "ms" }}>
        <div className={idle ? "mv-idle" : undefined} style={{ position: "relative", width: s, height: s }}>
          <TypeCharacter typeId={typeId} size={s} variant={variant} />
          {usingClip ? (
            // Inset by the medallion's 1px border so the accent ring stays visible round the
            // clip. The clips were graded to fade to #0B0B0E, the medallion's own colour, so
            // there is no visible edge where the video meets the frame.
            <video
              ref={videoRef}
              src={clipSrc}
              muted
              playsInline
              preload="auto"
              aria-hidden="true"
              onPlaying={function () { setClipShown(true); }}
              onError={function () { setClipFailed(true); setClipOn(false); setClipShown(false); }}
              style={{
                position: "absolute",
                inset: 1,
                width: s - 2,
                height: s - 2,
                borderRadius: Math.max(0, radius - 1),
                objectFit: "cover",
                background: "#0B0B0E",
                opacity: clipShown ? 1 : 0,
                transition: "opacity 160ms ease-out",
                pointerEvents: "none",
              }}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
