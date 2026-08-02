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
import { CHOICES, CHOICE_LABEL, THEME_COOKIE, applyChoice,
  TEXT_SIZES, TEXT_LABEL, applyTextSize, currentTextSize } from "@/lib/theme";
import { BRAND, TRACK } from "@/lib/brand";
import Icon from "../Icon";

function readChoice() {
  try {
    const m = document.cookie.match(/(?:^|; )vaeon_theme=([^;]*)/);
    // Dark, not system. No cookie means nobody has chosen, and the app defaults to dark,
    // so showing "Match phone" as selected would be the settings screen disagreeing with
    // what the user is actually looking at.
    const v = m ? decodeURIComponent(m[1]) : "dark";
    return CHOICES.indexOf(v) === -1 ? "dark" : v;
  } catch (e) {
    return "dark";
  }
}

export default function ThemeSettings({ accent }) {
  const [choice, setChoice] = useState("dark");
  const [textSize, setTextSize] = useState("normal");

  // After mount, not during render. The server rendered this with a guess, and reading the
  // cookie while rendering would make the two disagree about the first paint.
  useEffect(function () {
    setChoice(readChoice());
    setTextSize(currentTextSize());
  }, []);

  function pick(next) {
    setChoice(next);
    applyChoice(next);
  }

  // This was missing entirely. The buttons below called pickText, nothing defined it, and
  // every click threw a ReferenceError into the console and changed nothing. A build will
  // never catch that, because it is a runtime reference inside a handler.
  function pickText(next) {
    setTextSize(next);
    applyTextSize(next);
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

      <p className="text-[0.75rem] text-brand-dim leading-relaxed mt-3">
        {choice === "system"
          ? "Following whatever your phone is set to, and it will change with it."
          : "Set to " + CHOICE_LABEL[choice].toLowerCase() + " on this device, whatever your phone does."}
      </p>

      {/* TEXT SIZE.
          Separate control, separate cookie. Somebody who needs larger type usually does not
          also need a different background, and bundling the two forces a choice nobody
          asked to make.

          It scales the root font size, so it moves the whole interface rather than a
          handful of headings. That only works because the app's hardcoded px labels were
          converted to rem first: an absolute px size ignores this entirely, which would
          have left the smallest labels untouched for exactly the people who need it. */}
      <div className="mt-5 pt-5" style={{ borderTop: "1px solid " + BRAND.line }}>
        <p className="font-display text-base font-normal mb-1">Text size</p>
        <p className="text-sm text-brand-muted mb-4">
          Makes everything bigger, not just the headings. If you are squinting at your phone in
          a gym, use it.
        </p>

        <div className="grid grid-cols-3 gap-2">
          {TEXT_SIZES.map(function (t) {
            const on = textSize === t;
            return (
              <button key={t} onClick={function () { pickText(t); }}
                className="py-3 rounded-sm font-display border"
                // The button itself previews the size it sets, which saves a round trip of
                // choose, look, change your mind.
                style={Object.assign(
                  { fontSize: t === "normal" ? "0.8rem" : (t === "large" ? "0.95rem" : "1.1rem") },
                  on
                    ? { background: tone, color: "var(--brand-bg)", borderColor: tone }
                    : { borderColor: BRAND.line, color: BRAND.muted }
                )}>
                {TEXT_LABEL[t]}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
