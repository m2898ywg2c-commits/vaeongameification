"use client";

import { useEffect, useState } from "react";
import { BrandLockup } from "./Brand";
import { BRAND } from "@/lib/brand";

// Opening card.
//
// Black screen, "Welcome to", and the Vaeon lockup beneath it.
//
// Timing is deliberately a stale-timestamp check rather than a session flag.
// sessionStorage sounds right ("once per session") but is unreliable in the
// case that matters most: launched from the home screen, iOS discards the web
// view aggressively when you switch apps, so a session flag can vanish after a
// thirty second detour and the card fires again on return. Reading the last
// shown time and comparing it to a threshold does what an app splash actually
// does. Navigating between pages never re-fires it, because the last shown time
// is seconds old; coming back tomorrow does.
//
// Note the app links with plain <a href>, so every navigation is a full page
// load. Anything held in React state would be lost each time. It has to be
// storage.

const SEEN_KEY = "vaeon.splash.lastShown";

// How long the app must have been away before the card earns another showing.
// Thirty minutes is long enough that a session of logging sets never triggers
// it, short enough that picking the app up after work feels like opening it.
const STALE_AFTER_MS = 30 * 60 * 1000;

// How long the card holds before it starts fading, and how long the fade runs.
// The fade duration must match the transition in .vaeon-splash (globals.css).
const HOLD_MS = 1600;
const FADE_MS = 420;

export default function Splash() {
  // null means "not yet decided". Rendering nothing on the first pass keeps the
  // server and client markup identical; localStorage does not exist during SSR,
  // so reading it inline would hydrate-mismatch on every load.
  const [phase, setPhase] = useState(null);

  useEffect(function () {
    let last = 0;
    try {
      last = parseInt(window.localStorage.getItem(SEEN_KEY), 10) || 0;
    } catch (e) {
      // Private mode and locked-down browsers can throw on storage access.
      // Failing closed here means the card simply never shows, which is a
      // better outcome than an unhandled error on app open.
      last = Date.now();
    }

    if (Date.now() - last < STALE_AFTER_MS) {
      setPhase("done");
      return;
    }

    try {
      window.localStorage.setItem(SEEN_KEY, String(Date.now()));
    } catch (e) {
      // Non-fatal. Worst case the card shows again on the next navigation.
    }

    setPhase("visible");

    const toFade = setTimeout(function () {
      setPhase("fading");
    }, HOLD_MS);

    const toDone = setTimeout(function () {
      setPhase("done");
    }, HOLD_MS + FADE_MS);

    return function () {
      clearTimeout(toFade);
      clearTimeout(toDone);
    };
  }, []);

  if (phase === null || phase === "done") return null;

  const fading = phase === "fading";

  return (
    <div
      className="vaeon-splash fixed inset-0 z-50 flex flex-col items-center justify-center"
      style={{
        background: BRAND.bg,
        opacity: fading ? 0 : 1,
        // Once the fade starts the card must stop swallowing taps, otherwise a
        // fast user loses their first interaction to an invisible overlay.
        pointerEvents: fading ? "none" : "auto",
      }}
      role="status"
      aria-label="Welcome to Vaeon Fitness"
      onClick={function () {
        setPhase("done");
      }}
    >
      <div className="vaeon-splash-content flex flex-col items-center gap-4 px-6 text-center">
        <p className="text-sm tracking-[0.28em] uppercase" style={{ color: BRAND.muted }}>
          Welcome to
        </p>
        <BrandLockup size={40} accent={BRAND.text} full />
      </div>
    </div>
  );
}
