"use client";

import { usePathname } from "next/navigation";
import { BRAND } from "@/lib/brand";
import ThemeToggle from "./ThemeToggle";

// Vaeon Fitness brand assets.
//
// Colour convention follows Home.js: an optional `accent` prop, here defaulting
// to white so the mark stands on its own rather than borrowing whichever accent
// the user's training type supplies. `backdrop` is the black every page paints
// on itself, used for knocking the mark out of the circle variant. Both come
// from lib/brand.js.

const ACCENT = BRAND.text;
const BACKDROP = BRAND.bg;

// Height of the brand bar in pixels. If you change this, change the matching
// calc() in globals.css or every page gains that many pixels of dead scroll.
export const BAR_HEIGHT = 34;

// The mark is wider than it is tall, so `size` means height and the width
// follows. Keeping the viewBox tight to the artwork matters: a square box with
// built-in padding would force the mark to render small to fit a 34px bar, and
// it would sit visually high against the wordmark.
//
// 226 x 188 is the artwork's own pixel box, traced from the logo export, so the
// path coordinates below are the real ones rather than a redrawing. Both shapes
// are filled polygons rather than strokes: a stroked V would need its width
// scaling separately from the mark and the mitre at the point would drift.
const MARK_RATIO = 226 / 188;

// The outer V band. Traced left-outer edge down to the point, up the right-outer
// edge, then back down the inner edges to the inner apex at y=148.
const MARK_OUTER = "M 0 0 L 112.5 188 L 223 0 L 200 0 L 112.5 148 L 24 0 Z";

// The solid chevron nested inside, notched at the top so it reads as an arrowhead.
const MARK_INNER = "M 47 12 L 112.5 41 L 178 12 L 112.5 123 Z";

// Pages that are already all about the brand, or that should stay uncluttered.
// The bar hides itself here so the big lockup is not doubled up.
const HIDE_BAR_ON = ["/", "/login", "/signup", "/forgot-password", "/reset-password"];

/**
 * The V mark on its own: an open outlined V with a solid chevron nested inside.
 *
 * @param {number}  size     Rendered height in pixels. Width follows the ratio.
 * @param {string}  accent   Mark colour. Defaults to white.
 * @param {boolean} circle   Knock the mark out of a filled disc, for the favicon
 *                           and the icon on your home screen.
 * @param {string}  backdrop Colour showing through the knockout.
 */
export function VaeonMark({ size = 18, accent, circle = false, backdrop = BACKDROP }) {
  const colour = accent || ACCENT;

  if (circle) {
    // Square box here on purpose: a disc needs equal sides. The mark is scaled
    // down and centred inside it rather than filling it.
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" role="img" aria-label="Vaeon Fitness">
        <circle cx="12" cy="12" r="12" fill={colour} />
        {/* Mark scaled to 13 units wide and optically centred in the disc. */}
        <g transform="translate(5.5 6.6) scale(0.0575)">
          <path d={MARK_OUTER} fill={backdrop} />
          <path d={MARK_INNER} fill={backdrop} />
        </g>
      </svg>
    );
  }

  return (
    <svg
      width={Math.round(size * MARK_RATIO)}
      height={size}
      viewBox="0 0 226 188"
      role="img"
      aria-label="Vaeon Fitness"
    >
      <path d={MARK_OUTER} fill={colour} />
      <path d={MARK_INNER} fill={colour} />
    </svg>
  );
}

/**
 * Mark plus wordmark.
 *
 * Two shapes on purpose. The compact form is mark plus "Vaeon" and is what the
 * brand bar uses: at 18px the "FITNESS" line and its rules turn to mush and eat
 * horizontal space that mid-session belongs to exercise cards. The full form
 * reproduces the real lockup and is for login, signup and the opening splash,
 * where there is room to breathe.
 *
 * @param {number}  size    Height of the mark. Type scales from it.
 * @param {boolean} full    Include the rule-flanked FITNESS line.
 * @param {boolean} stacked Mark above wordmark rather than beside it.
 */
export function BrandLockup({ size = 18, accent, circle = false, stacked = false, full = false }) {
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

      {/* Column stretches to the width of "Vaeon", so the FITNESS row below can
          size itself against the wordmark rather than against a guessed width. */}
      <span className="inline-flex flex-col items-stretch" style={{ gap: size * 0.24 }}>
        <span
          style={{
            fontSize: size * 0.95,
            letterSpacing: "-0.01em",
            whiteSpace: "nowrap",
            fontWeight: 400,
          }}
        >
          Vaeon
        </span>

        {full && (
          // Rules flex equally and the word sits between them, so the row is
          // symmetrical under "Vaeon" at any size. The artwork itself has
          // unequal rules (93.75 and 141 units) because tracking leaves a
          // trailing space after the final S and the gaps were measured off the
          // text box rather than the ink. Stripping that trailing space with the
          // negative margin below fixes the cause, so both rules can match.
          <span className="flex items-center" style={{ gap: size * 0.18 }}>
            <span style={{ flex: 1, height: 1, background: colour, opacity: 0.75 }} />
            <span
              style={{
                // 0.286 of the wordmark, taken from the cap heights in the
                // source: 37.83 units against 132.31.
                fontSize: size * 0.27,
                letterSpacing: "0.38em",
                marginRight: "-0.38em",
                whiteSpace: "nowrap",
                fontWeight: 400,
              }}
            >
              FITNESS
            </span>
            <span style={{ flex: 1, height: 1, background: colour, opacity: 0.75 }} />
          </span>
        )}
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
      className="flex items-center gap-3 px-4 border-b shrink-0"
      style={{ height: BAR_HEIGHT, background: BACKDROP, borderColor: "var(--brand-line)" }}
    >
      {/* Top left, on every screen. See app/ThemeToggle.js for why it lives here rather
          than only in settings. */}
      <ThemeToggle />
      <BrandLockup size={16} accent={accent} />
    </header>
  );
}
