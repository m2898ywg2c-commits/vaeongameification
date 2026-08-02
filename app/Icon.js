// Vaeon icons.
//
// WHY THESE EXIST
//
// The app was using emoji as its icon set: a trophy, a chart, a cog, a flame, a target, a
// bolt, a house, a pencil, a tape measure, a chequered flag. Three problems with that,
// in ascending order of seriousness.
//
// They render differently on every platform. Apple, Google and Microsoft each draw their
// own, so the brand looked like a different product on an iPhone than on a Pixel, which
// rather undermines having a brand.
//
// They are full colour, and this is a black and white app with one accent that changes
// per user. A yellow trophy and an orange flame are two more palettes nobody chose.
//
// And they are round, soft and cartoonish, next to a logo built from thin mitred bands.
// That was the loudest single thing making the app not look like its own mark.
//
// HOW THEY ARE DRAWN
//
// Same rules as the V: 1.5 stroke, no fill, mitred joins, drawn on a 24 unit grid, and
// they inherit currentColor so they take the user's type accent wherever one is in play.
// Deliberately geometric and slightly under-detailed. An icon set that tries to be
// charming next to this mark would look like it came from somewhere else.
//
// strokeLinejoin is "miter" throughout rather than the usual "round", which is the single
// detail that makes them read as siblings of the logo.

const COMMON = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "square",
  strokeLinejoin: "miter",
};

const PATHS = {
  // Chevron up inside a frame. Level, progression, rank.
  level: <path d="M4 4h16v16H4z M8 14l4-4 4 4" />,
  // Concentric square rather than the usual circle, so it sits with the mitres.
  target: <path d="M3 3h18v18H3z M8 8h8v8H8z M11.5 11.5h1v1h-1z" />,
  // Streak. A chevron stack, borrowing the mark's own arrowhead rather than a flame.
  streak: <path d="M6 20l6-7 6 7 M6 12l6-7 6 7" />,
  // Grace week. A shield with a horizontal bar: something held, not something earned.
  shield: <path d="M12 3l8 3v6c0 5-4 8-8 9-4-1-8-4-8-9V6z M8 12h8" />,
  // Block complete. A flag on a mast.
  flag: <path d="M5 21V3 M5 4h13l-3 4 3 4H5" />,
  // Leaderboard. Three bars, tallest in the middle, no cup.
  board: <path d="M4 20V12h4v8 M10 20V5h4v15 M16 20v-6h4v6" />,
  // Progress over time.
  chart: <path d="M3 3v18h18 M7 15l4-5 3 3 5-7" />,
  // Settings. A slider bank rather than a cog, which never draws well at 1.5 stroke.
  sliders: <path d="M4 7h10 M18 7h2 M4 12h4 M12 12h8 M4 17h12 M20 17h0 M14 4v6 M8 9v6 M16 14v6" />,
  // Quick log.
  pencil: <path d="M4 20h4L20 8l-4-4L4 16z M14 6l4 4" />,
  // Measurements.
  ruler: <path d="M3 9h18v6H3z M7 9v3 M11 9v4 M15 9v3 M19 9v4" />,
  // Home or fallback session.
  home: <path d="M3 11l9-8 9 8 M6 9v12h12V9" />,
  // Rest timer.
  clock: <path d="M12 3a9 9 0 100 18 9 9 0 000-18z M12 7v5l3 3" />,
  // Group challenge. Two figures reduced to shoulders, no faces.
  group: <path d="M3 20v-3l4-2 M9 20v-3l-2-1 M7 8a2 2 0 100 4 2 2 0 000-4z M13 20v-3l4-2 4 2v3 M17 7a2.5 2.5 0 100 5 2.5 2.5 0 000-5z" />,
  // Kudos. An outlined mark of approval rather than clapping hands.
  kudos: <path d="M4 4h16v12H9l-5 4z M8 10l3 3 5-6" />,
  // Install to home screen.
  install: <path d="M12 3v12 M8 11l4 4 4-4 M4 19h16" />,
  // Warning, for the baselines prompt. Triangle, not a red sign.
  alert: <path d="M12 3l9 17H3z M12 9v5 M12 16.5h0" />,
  // Night and day. Both drawn on the same 24 grid at the same stroke as everything else,
  // so the toggle sits with the mark rather than looking like a borrowed glyph.
  moon: <path d="M20 14a8 8 0 01-10-10 8 8 0 100 10 8 8 0 0010 0z" />,
  sun: <path d="M12 8a4 4 0 100 8 4 4 0 000-8z M12 2v2 M12 20v2 M2 12h2 M20 12h2 M5 5l1.5 1.5 M17.5 17.5L19 19 M19 5l-1.5 1.5 M6.5 17.5L5 19" />,
  // Password reveal. The struck-through version is the "currently hidden" state, which is
  // the way round most people expect: the eye with a line means "you cannot see it".
  eye: <path d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6-10-6-10-6z M12 9a3 3 0 100 6 3 3 0 000-6z" />,
  eyeOff: <path d="M4 4l16 16 M9.5 9.6A3 3 0 0012 15a3 3 0 002.4-1.2 M6.3 6.4C3.7 8.1 2 12 2 12s4 6 10 6c1.7 0 3.2-.5 4.5-1.2 M19.2 15.1C21 13.6 22 12 22 12s-4-6-10-6c-.9 0-1.7.1-2.5.4" />,
  check: <path d="M4 12l5 5L20 6" />,
  arrow: <path d="M4 12h15 M13 6l6 6-6 6" />,
};

export const ICON_NAMES = Object.keys(PATHS);

/**
 * @param {string} name  One of ICON_NAMES.
 * @param {number} size  Rendered box in pixels. 16 to 24 is the sensible range; below 14
 *                       the 1.5 stroke starts to fill in the smaller counters.
 */
export default function Icon({ name, size = 18, style }) {
  const path = PATHS[name];
  if (!path) return null;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      style={Object.assign({ display: "block", flexShrink: 0 }, style || {})}
      {...COMMON}
    >
      {path}
    </svg>
  );
}
