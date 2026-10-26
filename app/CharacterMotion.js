"use client";

import { useEffect, useRef, useState } from "react";
import TypeCharacter from "./TypeCharacter";
import { TYPES } from "@/lib/personality";
import { moveFor } from "@/lib/motion";

// A character that moves.
//
// WHY THE ANIMATION IS RESTARTED BY TOGGLING A CLASS AND NOT BY CHANGING A KEY.
//
// Keying the element would remount TypeCharacter, and remounting it remounts an <img>.
// Cached or not, that is a frame where the picture is not there, and on a hover-to-play
// strip the user would see eight characters blink every time the mouse crossed one.
// Removing the class, forcing a reflow so the removal actually lands, then adding it back
// restarts the keyframes on the SAME element with the SAME image. The reflow read is not
// superstition: without it the browser coalesces the remove and the add and nothing
// replays.
//
// WHY REDUCED MOTION IS HANDLED IN CSS AND NOT HERE.
//
// Every mv-* class is switched off under prefers-reduced-motion in globals.css. Doing it
// there rather than with a matchMedia check means a user who changes the setting while the
// app is open gets the new behaviour immediately, and it means this component cannot
// accidentally become the one place that forgot.
//
// on: which triggers play the move. Any combination of "mount", "hover" and "inview".
//     "inview" plays each time the character scrolls back into view, not only the first
//     time, because a landing page people scroll up and down should keep its life.
// idle: a slow ambient float underneath the move. For the big reveal, where the character
//     is on screen for a while and standing perfectly still looks dead.
// delay: ms to wait before playing, so a row of eight can stagger rather than twitch in
//     unison.
// replayKey: change it to play the move again on an element that is already mounted.
export default function CharacterMotion({ typeId, size, variant, on, idle, delay, replayKey, className }) {
  const move = moveFor(typeId);
  const t = TYPES[typeId];
  const s = size || 120;

  const [plays, setPlays] = useState(0);
  const bodyRef = useRef(null);
  const wrapRef = useRef(null);

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

  useEffect(function () {
    if (!plays) return undefined;
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
  }, [plays, move.key, move.ms]);

  if (!t) return <TypeCharacter typeId={typeId} size={s} variant={variant} className={className} />;

  const hover = onHover ? play : undefined;

  return (
    <div
      ref={wrapRef}
      className={"mv-wrap" + (className ? " " + className : "")}
      style={{ "--mv-accent": t.colors[0], width: s, height: s }}
      onMouseEnter={hover}
      onFocus={hover}
    >
      {plays > 0 ? <i key={"flare" + plays} className="mv-flare" aria-hidden="true" /> : null}
      {plays > 0 && move.ornament === "heart" ? (
        <svg key={"heart" + plays} className="mv-heart" viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M12 21s-7.5-4.7-9.4-9.2C1.2 8.3 3.1 5 6.4 5c2 0 3.4 1.1 4.3 2.4l1.3 1.8 1.3-1.8C14.2 6.1 15.6 5 17.6 5c3.3 0 5.2 3.3 3.8 6.8C19.5 16.3 12 21 12 21z"
            fill="var(--mv-accent)"
          />
        </svg>
      ) : null}
      <div ref={bodyRef} className="mv-body" style={{ animationDuration: move.ms + "ms" }}>
        <TypeCharacter typeId={typeId} size={s} variant={variant} className={idle ? "mv-idle" : undefined} />
      </div>
    </div>
  );
}
