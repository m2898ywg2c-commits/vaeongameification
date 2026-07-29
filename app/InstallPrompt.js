"use client";

import { useEffect, useState } from "react";
import { BRAND } from "@/lib/brand";

// "Add to home screen" nudge.
//
// Two completely different jobs behind one component, because the platforms do
// not agree:
//
//   Android and desktop Chrome fire a `beforeinstallprompt` event that can be
//   captured and replayed, so we can offer a real button that opens the native
//   install sheet.
//
//   iOS has no such API and never has. Safari can only install by hand, through
//   Share then Add to Home Screen. So there the card opens instructions with the
//   actual Share glyph drawn out, because "tap the Share button" means nothing
//   if you have never noticed which icon that is.
//
// Renders nothing once installed, and nothing for a fortnight after dismissal.

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

// iOS Share glyph: a box with an arrow leaving the top. Drawn rather than
// described, because nobody knows it by name.
function ShareGlyph({ size = 20, colour }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 3 L12 15" stroke={colour} strokeWidth="2" strokeLinecap="round" />
      <path d="M8.5 6.5 L12 3 L15.5 6.5" stroke={colour} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 11 L4.5 11 L4.5 20.5 L19.5 20.5 L19.5 11 L18 11" stroke={colour} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Step({ n, children, accent }) {
  return (
    <li className="flex gap-3 items-start">
      <span
        className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
        style={{ background: accent, color: BRAND.bg }}
      >
        {n}
      </span>
      <span className="text-sm text-gray-200 leading-relaxed pt-0.5">{children}</span>
    </li>
  );
}

export default function InstallPrompt({ accent = BRAND.accent }) {
  const [mode, setMode] = useState(null);
  const [deferred, setDeferred] = useState(null);
  const [open, setOpen] = useState(false);

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
    setOpen(false);
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
    <>
      <button
        onClick={function () { setOpen(true); }}
        className="w-full flex items-center gap-3 rounded-2xl border-2 p-4 mb-3 text-left"
        style={{ borderColor: accent, background: accent + "1A" }}
      >
        <span className="text-2xl" aria-hidden="true">{"\u{1F4F2}"}</span>
        <span className="flex-1">
          <span className="block text-sm font-bold" style={{ color: accent }}>Put Vaeon on your home screen</span>
          <span className="block text-xs text-gray-300">
            Opens full screen with no browser bar. Takes about fifteen seconds.
          </span>
        </span>
        <span style={{ color: accent }}>&rsaquo;</span>
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.72)" }}
          onClick={function () { setOpen(false); }}
        >
          <div
            className="w-full max-w-sm rounded-3xl border border-white/15 p-5"
            style={{ background: BRAND.surface }}
            onClick={function (e) { e.stopPropagation(); }}
            role="dialog"
            aria-modal="true"
            aria-label="Add Vaeon to your home screen"
          >
            <div className="flex items-start justify-between gap-3 mb-1">
              <p className="text-lg font-bold">Add Vaeon to your home screen</p>
              <button onClick={function () { setOpen(false); }} aria-label="Close" className="text-gray-500 text-2xl leading-none">
                &times;
              </button>
            </div>
            <p className="text-xs text-gray-400 mb-5">
              It behaves like a normal app after this. Full screen, its own icon, and it turns up in
              your app switcher.
            </p>

            {mode === "android" ? (
              <>
                <ol className="space-y-3 mb-5">
                  <Step n="1" accent={accent}>Tap the button below.</Step>
                  <Step n="2" accent={accent}>Confirm <span className="text-white font-bold">Install</span> when your phone asks.</Step>
                </ol>
                <button
                  onClick={install}
                  className="w-full py-4 rounded-2xl font-bold text-base mb-2"
                  style={{ background: accent, color: BRAND.bg }}
                >
                  Add to home screen
                </button>
              </>
            ) : (
              <ol className="space-y-4 mb-5">
                <Step n="1" accent={accent}>
                  <span className="inline-flex items-center gap-2 flex-wrap">
                    <span>Tap the Share button at the bottom of Safari. It is the square with an arrow coming out of the top:</span>
                    <span
                      className="inline-flex items-center justify-center rounded-lg px-2 py-1"
                      style={{ background: "rgba(255,255,255,0.08)" }}
                    >
                      <ShareGlyph size={18} colour={accent} />
                    </span>
                  </span>
                </Step>
                <Step n="2" accent={accent}>
                  Scroll down the list that slides up. It is a fair way down, past the sharing options.
                </Step>
                <Step n="3" accent={accent}>
                  Tap <span className="text-white font-bold">Add to Home Screen</span>.
                </Step>
                <Step n="4" accent={accent}>
                  Tap <span className="text-white font-bold">Add</span> in the top right. Vaeon appears on your home screen.
                </Step>
              </ol>
            )}

            <button onClick={dismiss} className="w-full py-3 rounded-2xl text-xs text-gray-400 border border-white/10">
              Not now, stop asking
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
