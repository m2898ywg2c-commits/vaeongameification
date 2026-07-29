"use client";

import { useEffect, useState } from "react";
import { BRAND } from "@/lib/brand";

// "Add to home screen" nudge.
//
// Two completely different jobs behind one component, because the platforms do
// not agree:
//
//   Android / desktop Chrome fire a `beforeinstallprompt` event that can be
//   captured and replayed later, so we can offer a real button that opens the
//   native install sheet.
//
//   iOS has no such API and never has. Safari can only install via Share, Add
//   to Home Screen, done by hand. So there we show instructions instead of a
//   button, because a button that cannot do anything is worse than no button.
//
// Renders nothing at all once installed, and nothing for a while after it is
// dismissed. Nobody should be nagged about this twice in a week.

const DISMISSED_KEY = "vaeon.install.dismissed";
const DISMISS_FOR_MS = 14 * 24 * 60 * 60 * 1000;

function isStandalone() {
  // Android and desktop report through the media query; iOS uses a non-standard
  // navigator flag and ignores the query entirely.
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true
  );
}

function isIOS() {
  const ua = window.navigator.userAgent;
  // iPadOS 13 and later report themselves as Macintosh. The touch point count
  // is the usual way to tell an iPad from an actual Mac.
  return (
    /iphone|ipad|ipod/i.test(ua) ||
    (/Macintosh/.test(ua) && window.navigator.maxTouchPoints > 1)
  );
}

export default function InstallPrompt() {
  const [mode, setMode] = useState(null);
  const [deferred, setDeferred] = useState(null);

  useEffect(function () {
    if (isStandalone()) return;

    try {
      const at = parseInt(window.localStorage.getItem(DISMISSED_KEY), 10) || 0;
      if (Date.now() - at < DISMISS_FOR_MS) return;
    } catch (e) {
      return;
    }

    if (isIOS()) {
      setMode("ios");
      return;
    }

    const onPrompt = function (e) {
      // Chrome shows its own mini-infobar unless the event is cancelled. We
      // cancel it and hold the event so the offer appears where it makes sense
      // rather than over the top of whatever the user was reading.
      e.preventDefault();
      setDeferred(e);
      setMode("android");
    };

    window.addEventListener("beforeinstallprompt", onPrompt);
    return function () {
      window.removeEventListener("beforeinstallprompt", onPrompt);
    };
  }, []);

  const dismiss = function () {
    try {
      window.localStorage.setItem(DISMISSED_KEY, String(Date.now()));
    } catch (e) {}
    setMode(null);
  };

  const install = async function () {
    if (!deferred) return;
    deferred.prompt();
    await deferred.userChoice;
    // The event is single use. Whatever the user chose, it cannot be replayed.
    setDeferred(null);
    dismiss();
  };

  if (!mode) return null;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 mb-4">
      <div className="flex items-start justify-between gap-3 mb-2">
        <p className="text-sm font-bold">Put Vaeon on your home screen</p>
        <button onClick={dismiss} aria-label="Dismiss" className="text-gray-500 text-lg leading-none">
          &times;
        </button>
      </div>

      {mode === "android" ? (
        <>
          <p className="text-xs text-gray-400 mb-3">
            Opens full screen, no browser bar, and lands in your app switcher like anything else.
          </p>
          <button
            onClick={install}
            className="px-5 py-2.5 rounded-full font-bold text-xs"
            style={{ background: BRAND.accent, color: BRAND.bg }}
          >
            Add to home screen
          </button>
        </>
      ) : (
        <p className="text-xs text-gray-400">
          Tap the Share button in Safari, then <span className="text-white">Add to Home Screen</span>.
          It opens full screen after that, with no browser bar.
        </p>
      )}
    </div>
  );
}
