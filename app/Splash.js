"use client";

import { useEffect, useState } from "react";
import { BrandLockup } from "./Brand";
import { BRAND } from "@/lib/brand";

// Opening card.
//
// Shows once per browser session: a black screen, "Welcome to", and the Vaeon
// lockup beneath it. sessionStorage rather than localStorage is deliberate.
// localStorage would fire once ever and then never again, which is not an
// opening card, it is a one-time greeting. sessionStorage gives "each fresh
// time the app opens" and still keeps quiet as the user moves between pages.

const SEEN_KEY = "vaeon.splash.seen";

// How long the card holds before it starts fading, and how long the fade runs.
// The fade duration must match the transition in .vaeon-splash (globals.css).
const HOLD_MS = 1600;
const FADE_MS = 420;

export default function Splash() {
  // null means "not yet decided". Rendering nothing on the first pass keeps the
  // server and client markup identical; sessionStorage does not exist during
  // SSR, so reading it inline would hydrate-mismatch on every load.
  const [phase, setPhase] = useState(null);

  useEffect(function () {
    let seen = null;
    try {
      seen = window.sessionStorage.getItem(SEEN_KEY);
    } catch (e) {
      // Private mode and locked-down browsers can throw on storage access.
      // Failing closed here means the splash simply never shows, which is a
      // better outcome than an unhandled error on app open.
      seen = "1";
    }

    if (seen) {
      setPhase("done");
      return;
    }

    try {
      window.sessionStorage.setItem(SEEN_KEY, "1");
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
        <BrandLockup size={40} accent={BRAND.text} />
      </div>
    </div>
  );
}
