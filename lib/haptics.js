// Haptics.
//
// WHAT THIS DOES NOT DO, FIRST, BECAUSE IT IS THE IMPORTANT PART.
//
// Safari on iOS does not implement the Vibration API. Not in a tab, not installed to the
// home screen, not in any version. navigator.vibrate is simply undefined there. On an
// iPhone every function in this file is a no-op and cannot be made otherwise. Chrome and
// Firefox on Android support it properly. So if the testers are mostly on iPhones, this
// feature exists and nobody will ever feel it. That is a platform fact, not a bug to fix.
//
// Two further rules the browser enforces, not us: vibration only fires while the document
// is visible, and only once the user has interacted with the page. An achievement always
// lands after somebody has tapped something, so in practice both hold.
//
// prefers-reduced-motion is honoured. Vibration is not motion in the vestibular sense, but
// it is the only standard signal a person has for "stop firing things at me", and somebody
// who has set it did not ask to be buzzed either. Cheap to respect, rude to ignore.

export function buzz(pattern) {
  try {
    if (typeof navigator === "undefined") return false;
    if (typeof navigator.vibrate !== "function") return false;
    if (typeof document !== "undefined" && document.visibilityState !== "visible") return false;
    if (typeof window !== "undefined" && window.matchMedia &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
    return navigator.vibrate(pattern);
  } catch (e) {
    return false;
  }
}

// Two short taps rather than one long pulse. A single long buzz reads as an alarm or a
// failure on a phone; a quick double reads as a nudge. The whole thing is under a fifth of
// a second so it lands as punctuation rather than an interruption.
export const CELEBRATE = [16, 70, 32];

export function celebrate() {
  return buzz(CELEBRATE);
}
