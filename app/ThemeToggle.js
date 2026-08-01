"use client";

// The night and day toggle, in the brand bar so it is on every screen.
//
// Settings has the full three-way control including "match my phone". This is the fast
// path: one tap, dark to light and back, from wherever you happen to be standing. Somebody
// who has walked out of a dark gym into daylight should not have to go and find a settings
// page to be able to read their own session.
//
// Deliberately in the bar rather than on the dashboard. The plan screen is where reading in
// bad light actually bites, and that is the screen you are on when it matters.

import { useEffect, useState } from "react";
import { applyChoice, currentScheme } from "@/lib/theme";
import Icon from "./Icon";

export default function ThemeToggle() {
  const [scheme, setScheme] = useState("dark");

  // After mount. The server rendered the page from the cookie, and reading the document
  // during render would make the two disagree about the first paint.
  useEffect(function () {
    setScheme(currentScheme());
  }, []);

  function flip() {
    const next = scheme === "light" ? "dark" : "light";
    applyChoice(next);
    setScheme(next);
  }

  return (
    <button
      onClick={flip}
      className="flex items-center justify-center rounded-sm"
      style={{ width: 26, height: 26, color: "var(--brand-muted)" }}
      aria-label={scheme === "light" ? "Switch to dark colours" : "Switch to light colours"}
      title={scheme === "light" ? "Switch to dark" : "Switch to light"}
    >
      {/* Shows where you are going, not where you are. A sun on a dark screen reads as
          "tap for light", which is what people expect from this control. */}
      <Icon name={scheme === "light" ? "moon" : "sun"} size={16} />
    </button>
  );
}
