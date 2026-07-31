// Vaeon Fitness brand tokens, JS side.
//
// Most of the app styles through inline `style={{ ... }}` objects rather than
// Tailwind classes, because accents are computed at runtime from the user's
// training type. Those call sites cannot read CSS custom properties without a
// var() string, so the same values are mirrored here.
//
// The CSS mirror is app/globals.css. Change both together.
//
// IMPORTANT: this file holds CHROME only. Per-type accent colours live in
// lib/personality.js, where each of the eight training types owns a pair. The
// accent a user sees is a product feature, not brand chrome, so a rebrand of
// the app should not flatten them.

export const BRAND = {
  bg: "#000000",
  // Was #0B1220, a navy left over from the pre-rebrand palette that nothing referenced:
  // every card painted itself rgba(255,255,255,0.05) by hand instead. Now a near-black
  // that is genuinely used, so surfaces come from one place.
  surface: "#0A0A0A",
  line: "rgba(255,255,255,0.10)",
  lineStrong: "rgba(255,255,255,0.18)",
  text: "#FFFFFF",
  muted: "#9CA3AF",
  dim: "#6B7280",
  accent: "#22D3EE",
  accentDeep: "#3B82F6",
};

// Corner radii. The mark is built from mitred angles with no curve anywhere in it, so the
// old flat 16px on every card and full pills on every button were fighting it on every
// screen. 4px reads as machined rather than soft. Nothing should be a pill.
export const RADIUS = {
  sm: "2px",
  md: "4px",
  lg: "6px",
};

// Lifted off the lockup, where FITNESS sits at 0.38em between two hairlines. Used for
// section labels so the logo's own device repeats through the app.
export const TRACK = {
  label: "0.28em",
  tight: "-0.02em",
};

// Accent shown before a user has taken the assessment.
//
// This used to be The Captain's teal, which meant every untyped user was shown
// one specific personality's colours by accident. Vaeon cyan is neutral and
// correct: it says "no type yet" rather than "you are a Captain".
export const DEFAULT_ACCENT = BRAND.accent;
export const DEFAULT_DEEP = BRAND.accentDeep;

/**
 * The primary button gradient.
 *
 * DEPRECATED and currently unused. Every primary button in the app is now a solid accent
 * with black type: a gradient is two colours pretending to be a brand, and the mark is one
 * flat weight of ink. Left here rather than deleted only so that a call site added from
 * memory fails to find it and gets read instead of quietly reintroducing the sweep.
 *
 * @param {string} accent Start colour. Defaults to the brand accent.
 * @param {string} deep   End colour. Defaults to the brand deep accent.
 */
export function brandGradient(accent, deep) {
  return "linear-gradient(90deg, " + (accent || DEFAULT_ACCENT) + ", " + (deep || DEFAULT_DEEP) + ")";
}
