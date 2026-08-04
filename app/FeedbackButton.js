"use client";

// The floating feedback button.
//
// WHERE IT DOES NOT APPEAR, AND THE LIST IS SHORTER THAN IT WAS.
//
// The brief was "sits on the corner all the time" and the first version hid it on ten
// routes, most of which were taste rather than reason. Assessment and onboarding in
// particular were exactly wrong: those are the screens where a new person gets confused
// and gives up, which is precisely when you want to hear from them.
//
// What is left are the cases where the button would be broken rather than merely
// unwelcome. /feedback needs a signed-in user, so on the signed-out pages the button would
// bounce somebody to a login screen, which is a worse first impression than no button at
// all. And linking to the page you are already looking at is not a feature.
//
// ON /plan IT MOVES RATHER THAN DISAPPEARS.
//
// RestTimer is fixed to the bottom at z-30 and reserves an 80px spacer for itself, so a
// button at the usual 18px would sit on top of a running rest timer. It lifts clear of the
// bar instead. Same button, same corner, out of the way of the one thing on that screen
// somebody is actually watching.
//
// WHY IT IS A LINK AND NOT A CHAT WIDGET.
//
// Same argument as the set feedback: a widget that opens a conversation needs somewhere to
// live, and the only free corner on a phone is already spoken for. This is one tap to a
// page that already exists and already works.

import { usePathname } from "next/navigation";
import Icon from "./Icon";
import { BRAND } from "@/lib/brand";

// Signed-out routes plus the feedback page itself. Nothing else.
const HIDE_ON = ["/", "/login", "/signup", "/forgot-password", "/reset-password", "/disclaimer", "/feedback"];

// The rest timer's own spacer is h-20, so 80px, plus a little air.
const CLEAR_REST_TIMER = 92;

export default function FeedbackButton() {
  const path = usePathname();
  if (!path || HIDE_ON.indexOf(path) !== -1) return null;
  const lifted = path.indexOf("/plan") === 0;

  return (
    <a
      href="/feedback"
      aria-label="Send feedback"
      title="Send feedback"
      className="fixed z-20 flex items-center justify-center rounded-full border"
      style={{
        right: 18,
        // Clears the iOS home indicator on an installed app, where there is no browser
        // chrome to push content up off the bottom edge.
        bottom: "calc(" + (lifted ? CLEAR_REST_TIMER : 18) + "px + env(safe-area-inset-bottom, 0px))",
        width: 48,
        height: 48,
        background: BRAND.surface,
        borderColor: BRAND.lineStrong,
        color: BRAND.accent,
        boxShadow: "0 2px 14px rgba(0,0,0,0.55)",
      }}
    >
      <Icon name="kudos" size={20} />
    </a>
  );
}
