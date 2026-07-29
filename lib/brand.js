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
  surface: "#0B1220",
  line: "rgba(255,255,255,0.10)",
  text: "#FFFFFF",
  muted: "#9CA3AF",
  accent: "#22D3EE",
  accentDeep: "#3B82F6",
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
 * @param {string} accent Start colour. Defaults to the brand accent.
 * @param {string} deep   End colour. Defaults to the brand deep accent.
 */
export function brandGradient(accent, deep) {
  return "linear-gradient(90deg, " + (accent || DEFAULT_ACCENT) + ", " + (deep || DEFAULT_DEEP) + ")";
}
