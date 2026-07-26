"use client";

import { usePathname } from "next/navigation";

// Vaeon Fitness brand assets.
//
// Colour convention follows Home.js: an optional `accent` prop, here defaulting
// to white so the mark stands on its own rather than borrowing the teal the
// buttons use. `backdrop` is the navy every page paints on itself, used both
// for the bar background and for knocking the triangle out of the circle mark.

const ACCENT = "#FFFFFF";
const BACKDROP = "#0E1224";

// Height of the brand bar in pixels. If you change this, change the matching
// calc() in globals.css or every page gains that many pixels of dead scroll.
export const BAR_HEIGHT = 34;

// Pages that are already all about the brand, or that should stay uncluttered.
// The bar hides itself here so the big lockup is not doubled up.
const HIDE_BAR_ON = ["/", "/login", "/signup", "/forgot-password", "/reset-password"];

/**
 * The triangle on its own.
 *
 * @param {number}  size     Pixel size of the square mark.
 * @param {string}  accent   Triangle colour. Defaults to white.
 * @param {boolean} circle   Knock the triangle out of a filled disc, matching
 *                           the favicon and the icon on your home screen.
 * @param {string}  backdrop Colour showing through the knockout.
 */
export function VaeonMark({ size = 18, accent, circle = false, backdrop = BACKDROP }) {
  const colour = accent || ACCENT;

  if (circle) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" role="img" aria-label="Vaeon">
        <circle cx="12" cy="12" r="12" fill={colour} />
        <path
          d="M12 6.6 L18 17 L6 17 Z"
          fill={backdrop}
          stroke={backdrop}
          strokeWidth="2.1"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" role="img" aria-label="Vaeon">
      <path
        d="M12 4 L20.5 19 L3.5 19 Z"
        fill={colour}
        stroke={colour}
        strokeWidth="2.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Triangle plus wordmark. Use at a larger size on login and signup.
 *
 * @param {number}  size    Height of the mark. The wordmark scales from it.
 * @param {boolean} stacked Mark above wordmark rather than beside it.
 */
export function BrandLockup({ size = 18, accent, circle = false, stacked = false }) {
  const colour = accent || ACCENT;
  return (
    <span
      className="inline-flex items-center"
      style={{
        flexDirection: stacked ? "column" : "row",
        gap: stacked ? size * 0.4 : size * 0.44,
        color: colour,
        lineHeight: 1,
      }}
    >
      <VaeonMark size={size} accent={colour} circle={circle} />
      <span style={{ fontSize: size * 0.72, letterSpacing: "-0.015em", whiteSpace: "nowrap" }}>
        <span className="font-bold">Vaeon</span>
        <span style={{ fontWeight: 400, opacity: 0.72, marginLeft: "0.28em" }}>Fitness</span>
      </span>
    </span>
  );
}

/**
 * The small bar at the top of every page.
 *
 * Deliberately quiet: it matches the page background rather than sitting on a
 * strip of its own, carries a hairline rule, and does not stick. Mid-session on
 * a phone you want vertical space for exercise cards, not a permanent header.
 */
export default function BrandBar({ accent }) {
  const pathname = usePathname();
  if (HIDE_BAR_ON.includes(pathname)) return null;

  return (
    <header
      className="flex items-center px-4 border-b border-white/10 shrink-0"
      style={{ height: BAR_HEIGHT, background: BACKDROP }}
    >
      <BrandLockup size={18} accent={accent} />
    </header>
  );
}
