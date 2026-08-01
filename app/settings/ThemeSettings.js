"use client";

// Night and day.
//
// WHY THIS IS AN ACCESSIBILITY FEATURE AND NOT A PREFERENCE TOGGLE
//
// Dark-first apps tend to assume dark is the kind option. It is not, for everyone. Around
// half of people have some degree of astigmatism, and on a dark background light text
// produces halation: the glyphs bleed outwards and blur, which makes fine print genuinely
// harder to read rather than merely less fashionable. Preference research splits roughly a
// third light, a third dark, a third either, and satisfaction goes up when people can
// switch rather than being handed one.
//
// So for some users the light theme is the only comfortable way to read this app. That is
// a different class of thing from liking it better.
//
// WHY THE CHOICE IS THREE-WAY
//
// Matching the phone is the right default, because anyone who needs one of these has
// almost certainly already set it system-wide and should not have to tell every app
// separately. The explicit options exist because plenty of people want their phone dark
// and this app light, or the reverse, and an app that only follows the system quietly
// tells them they are wrong.
//
// The preference is a cookie rather than localStorage. The dashboard picks a user's accent
// colour on the server during render, and it needs to know the scheme to choose the right
// half of their type's colour pair. See lib/theme.js.

import { useEffect, useState } from "react";
import { CHOICES, CHOICE_LABEL, THEME_COOKIE, applyChoice } from "@/lib/theme";
import { BRAND, TRACK } from "@/lib/brand";
import Icon from "../Icon";

function readChoice() {
  try {
    const m = document.cookie.match(/(?:^|; )vaeon_theme=([^;]*)/);
    const v = m ? decodeURIComponent(m[1]) : "system";
    return CHOICES.indexOf(v) === -1 ? "system" : v;
  } catch (e) {
    return "system";
  }
}

export default function ThemeSettings({ accent }) {
  const [choice, setChoice] = useState("system");

  // After mount, not during render. The server rendered this with a guess, and reading the
  // cookie while rendering would make the two disagree about the first paint.
  useEffect(function () {
    setChoice(readChoice());
  }, []);

  function pick(next) {
    setChoice(next);
    applyChoice(next);
  }

  const tone = accent || BRAND.accent;

  return (
    <div className="rounded-md border border-brand-line bg-brand-surface p-5 mb-4">
      <div className="flex items-center gap-2 mb-1">
        <span style={{ color: tone }}><Icon name="clock" size={16} /></span>
        <p className="font-display text-base font-normal">Night and day</p>
      </div>

      <p className="text-sm text-brand-muted mb-4">
        Vaeon is built dark, but light text on a dark background is genuinely harder to read
        for a lot of people, and easier for others. Pick whichever you can read most
        comfortably. It changes straight away.
      </p>

      <div className="grid grid-cols-3 gap-2">
        {CHOICES.map(function (c) {
          const on = choice === c;
          return (
            <button key={c} onClick={function () { pick(c); }}
              className="py-3 rounded-sm font-display text-xs border"
              style={on
                ? { background: tone, color: "var(--brand-bg)", borderColor: tone }
                : { borderColor: BRAND.line, color: BRAND.muted }}>
              {CHOICE_LABEL[c]}
            </button>
          );
        })}
      </div>

      <p className="text-[11px] text-brand-dim leading-relaxed mt-3">
        {choice === "system"
          ? "Following whatever your phone is set to, and it will change with it."
          : "Set to " + CHOICE_LABEL[choice].toLowerCase() + " on this device, whatever your phone does."}
      </p>
    </div>
  );
}
