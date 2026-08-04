"use client";

// The floating feedback button.
//
// WHERE IT DELIBERATELY DOES NOT APPEAR.
//
// Not on /plan. Two reasons, and the second matters more than the first. RestTimer is
// fixed to the bottom of the viewport at z-30, so a floating button in that corner would
// sit on top of a running rest timer. And somebody mid-set does not want a prompt to
// review the app; the moment to ask is when they have finished, not while they are under
// a bar.
//
// Not on the signed-out pages either. There is no user to attribute the feedback to, and
// /feedback would bounce them to login, which is a worse first impression than no button.
//
// WHY IT IS A LINK AND NOT A CHAT WIDGET.
//
// Same argument as the set feedback: a widget that opens a conversation needs somewhere to
// live, and the only free corner on a phone is already spoken for. This is one tap to a
// page that already exists and already works.

import { usePathname } from "next/navigation";
import Icon from "./Icon";
import { BRAND } from "@/lib/brand";

const HIDE_ON = ["/", "/login", "/signup", "/forgot-password", "/reset-password", "/feedback", "/plan", "/assessment", "/onboarding", "/disclaimer"];

export default function FeedbackButton() {
  const path = usePathname();
  if (!path || HIDE_ON.indexOf(path) !== -1) return null;

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
        bottom: "calc(18px + env(safe-area-inset-bottom, 0px))",
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
