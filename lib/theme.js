// Light and dark.
//
// WHY THIS EXISTS
//
// Dark is not automatically the accessible choice, which is the assumption most dark-first
// apps quietly make. Roughly half of people have some degree of astigmatism, and on a dark
// background light text produces halation: the letters bleed outwards and blur. Preference
// research splits roughly a third light, a third dark, a third either, and satisfaction
// rises when people can switch by context rather than being handed one.
//
// So this is not a cosmetic toggle. For some users the light theme is the only comfortable
// way to read the app, and for others the dark one is. The only wrong answer is choosing
// for them.
//
// THE TYPE ACCENT PROBLEM, AND WHY IT SOLVED ITSELF
//
// Each personality type owns a colour pair. The first was designed to glow on black and
// the second was the deep end of a gradient that no longer exists. Measured against white,
// every one of the eight first colours fails WCAG AA badly, between 1.8:1 and 3.6:1. Every
// one of the eight second colours passes, between 5.5:1 and 11.5:1.
//
// So the palette already contained both halves without anyone planning it. colors[0] is
// the dark theme accent, colors[1] is the light theme accent, and a user's type identity
// survives the switch intact rather than being flattened to a safe grey.
//
// HOW THE PREFERENCE TRAVELS
//
// A cookie, not localStorage. The dashboard is a server component and it computes the
// accent colour during render, so the server has to know the scheme before it can pick the
// right one. localStorage is invisible to the server and would mean one render in the
// wrong colour on every page load, on an app where every navigation is a full page load.

export const THEME_COOKIE = "vaeon_theme";
export const SCHEME_COOKIE = "vaeon_scheme";

// What the user chose. "system" defers to the device.
export const CHOICES = ["system", "dark", "light"];

export const CHOICE_LABEL = {
  system: "Match my phone",
  dark: "Dark",
  light: "Light",
};

// Resolve a stored choice plus the last known device scheme into an actual theme.
// DARK IS THE DEFAULT, AND ONLY AN EXPLICIT "system" DEFERS TO THE DEVICE.
//
// Following the phone automatically sounds like the polite choice and is the wrong one
// here. Vaeon is a black app: the mark, the splash and every screenshot assume it, and a
// user whose phone happens to be in light mode would open it for the first time into a
// scheme nobody designed. Light is a deliberate choice somebody makes because they can read
// it better, not something that happens to them.
export function resolveScheme(choice, deviceScheme) {
  if (choice === "light") return "light";
  if (choice === "system") return deviceScheme === "light" ? "light" : "dark";
  return "dark";
}

// The accent for a type in a given scheme. Falls back to Vaeon cyan and its deep partner
// for anyone who has not taken the assessment yet.
export function accentFor(type, scheme) {
  if (!type || !type.colors) {
    return scheme === "light" ? "#0E7490" : "#22D3EE";
  }
  return scheme === "light" ? type.colors[1] : type.colors[0];
}

// The paired deeper colour, still used in a couple of places for two-tone treatments.
export function deepFor(type, scheme) {
  if (!type || !type.colors) {
    return scheme === "light" ? "#22D3EE" : "#3B82F6";
  }
  return scheme === "light" ? type.colors[0] : type.colors[1];
}

// CLIENT ONLY. Reads what the inline script in app/layout.js already resolved and wrote
// onto the document, so client components agree with the server rather than recomputing.
export function currentScheme() {
  try {
    if (typeof document === "undefined") return "dark";
    return document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
  } catch (e) {
    return "dark";
  }
}

// Writes the choice as a cookie so the next server render picks it up, and applies it to
// the live document so the current page changes immediately rather than on next load.
export function applyChoice(choice) {
  const c = CHOICES.indexOf(choice) === -1 ? "system" : choice;
  let device = "dark";
  try {
    device = window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  } catch (e) {}

  const scheme = resolveScheme(c, device);

  try {
    // A year, path-wide, Lax. Nothing here is sensitive: it is which colours somebody
    // finds easier to read.
    document.cookie = THEME_COOKIE + "=" + c + ";path=/;max-age=31536000;SameSite=Lax";
    document.cookie = SCHEME_COOKIE + "=" + scheme + ";path=/;max-age=31536000;SameSite=Lax";
    document.documentElement.setAttribute("data-theme", scheme);
  } catch (e) {}

  return scheme;
}
