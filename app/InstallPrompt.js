"use client";

import { useEffect, useState } from "react";
import { BRAND } from "@/lib/brand";
import { createClient } from "@/lib/supabase/client";
import { track, EVENTS } from "@/lib/events";
import Icon from "./Icon";

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
// Renders nothing once installed, and nothing for a fortnight after an explicit
// dismissal. It does NOT depend on beforeinstallprompt firing: any browser that never
// sends that event still gets the card, with manual instructions instead of a button.

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
        className="flex-shrink-0 w-6 h-6 rounded-sm flex items-center justify-center font-display text-xs"
        style={{ background: accent, color: BRAND.bg }}
      >
        {n}
      </span>
      <span className="text-sm text-gray-200 leading-relaxed pt-0.5">{children}</span>
    </li>
  );
}

// onShow is optional and reports whether this component is actually offering anything.
// The to-do heading above it needs to count this item, and only the browser knows whether
// there is an install to offer: already installed, never fired beforeinstallprompt, or
// dismissed in the last fortnight all mean nothing renders here.
export default function InstallPrompt({ accent = BRAND.accent, onShow }) {
  const [mode, setMode] = useState(null);
  const [deferred, setDeferred] = useState(null);
  const [open, setOpen] = useState(false);

  // THE OFFER IS DRIVEN BY "NOT INSTALLED", NOT BY "AN EVENT FIRED".
  //
  // This used to render nothing at all on desktop and Android unless
  // beforeinstallprompt happened to arrive after React had mounted. Chrome fires that
  // event early in page load, so on a site where every navigation is a full page load it
  // frequently arrived first and was simply lost, and the card appeared at random. Worse,
  // any browser that never fires it, which is most of them, got no offer ever.
  //
  // Now the card shows whenever the app is not already installed. The event only decides
  // whether we can give a one-tap button or have to give instructions.
  useEffect(function () {
    if (isStandalone()) return;

    try {
      const at = parseInt(window.localStorage.getItem(DISMISSED_KEY), 10) || 0;
      if (Date.now() - at < DISMISS_FOR_MS) return;
    } catch (e) {
      // No storage is not a reason to hide the offer. Show it and let them dismiss it
      // again next time, which is the friendlier of the two failure modes.
    }

    if (isIOS()) {
      setMode("ios");
      return;
    }

    // Anything the inline script in app/layout.js already caught, before this component
    // existed.
    if (typeof window !== "undefined" && window.__vaeonInstall) {
      setDeferred(window.__vaeonInstall);
      setMode("android");
    } else {
      // No captured event yet. Offer manual instructions rather than nothing, and upgrade
      // to the one-tap button if the event turns up later.
      setMode("manual");
    }

    const onCaught = function () {
      if (window.__vaeonInstall) {
        setDeferred(window.__vaeonInstall);
        setMode("android");
      }
    };

    window.addEventListener("vaeon:installable", onCaught);
    // Belt and braces: if the inline script is ever removed, this still works on any load
    // where the event happens to arrive late.
    window.addEventListener("beforeinstallprompt", function (e) {
      e.preventDefault();
      window.__vaeonInstall = e;
      onCaught();
    });

    return function () {
      window.removeEventListener("vaeon:installable", onCaught);
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
    const choice = await deferred.userChoice;
    // The event is single use. Whatever the user chose, it cannot be replayed.
    setDeferred(null);
    try { window.__vaeonInstall = null; } catch (e) {}
    const accepted = choice && choice.outcome === "accepted";
    // Installing matters more here than on a normal web app: an installed PWA is the
    // only route to a push reminder on iOS, so this number caps how many people the
    // reminder can ever reach on that platform.
    track(createClient(), accepted ? EVENTS.INSTALL_ACCEPTED : EVENTS.INSTALL_PROMPTED, {
      outcome: choice ? choice.outcome : "unknown",
    });

    // Only hide it if they actually installed. This used to dismiss for a fortnight
    // whatever happened, so backing out of the native sheet by accident cost you the
    // offer entirely, which is the opposite of what cancelling means.
    if (accepted) {
      dismiss();
    } else {
      setOpen(false);
      // The prompt cannot be replayed without a fresh event, so fall back to
      // instructions rather than leaving a button that would now do nothing.
      setMode("manual");
    }
  };

  // Reported through an effect rather than during render, because calling a parent's
  // setState mid-render is the classic way to produce an update-during-render warning.
  useEffect(function () {
    if (onShow) onShow(Boolean(mode));
  }, [mode, onShow]);

  if (!mode) return null;

  return (
    <>
      <button
        onClick={function () { setOpen(true); }}
        className="w-full flex items-center gap-3 rounded-md border p-4 mb-3 text-left"
        style={{ borderColor: accent, background: accent + "1A" }}
      >
        <span style={{ color: accent }}><Icon name="install" size={20} /></span>
        <span className="flex-1">
          <span className="block font-display text-sm" style={{ color: accent }}>Put Vaeon on your home screen</span>
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
            className="w-full max-w-sm rounded-lg border border-brand-line p-5"
            style={{ background: BRAND.surface }}
            onClick={function (e) { e.stopPropagation(); }}
            role="dialog"
            aria-modal="true"
            aria-label="Add Vaeon to your home screen"
          >
            <div className="flex items-start justify-between gap-3 mb-1">
              <p className="font-display text-lg font-normal">Add Vaeon to your home screen</p>
              <button onClick={function () { setOpen(false); }} aria-label="Close" className="text-gray-500 text-2xl leading-none">
                &times;
              </button>
            </div>
            <p className="text-xs text-gray-400 mb-5">
              It behaves like a normal app after this. Full screen, its own icon, and it turns up in
              your app switcher.
            </p>

            {mode === "manual" ? (
              <ol className="space-y-3 mb-5">
                <Step n="1" accent={accent}>Open your browser menu. It is the three dots or lines, usually top right.</Step>
                <Step n="2" accent={accent}>
                  Choose <span className="text-white font-display">Install</span>,{" "}
                  <span className="text-white font-display">Install app</span> or{" "}
                  <span className="text-white font-display">Add to Home screen</span>. The wording
                  depends on the browser.
                </Step>
              </ol>
            ) : mode === "android" ? (
              <>
                <ol className="space-y-3 mb-5">
                  <Step n="1" accent={accent}>Tap the button below.</Step>
                  <Step n="2" accent={accent}>Confirm <span className="text-white font-display">Install</span> when your phone asks.</Step>
                </ol>
                <button
                  onClick={install}
                  className="w-full py-4 rounded-md font-display text-base font-normal mb-2"
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
                      className="inline-flex items-center justify-center rounded-sm px-2 py-1"
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
                  Tap <span className="text-white font-display">Add to Home Screen</span>.
                </Step>
                <Step n="4" accent={accent}>
                  Tap <span className="text-white font-display">Add</span> in the top right. Vaeon appears on your home screen.
                </Step>
              </ol>
            )}

            <button onClick={dismiss} className="w-full py-3 rounded-md text-xs text-gray-400 border border-brand-line">
              Not now, stop asking
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
