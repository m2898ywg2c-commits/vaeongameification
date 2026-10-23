"use client";

import { useState } from "react";
import Icon from "./Icon";

// Shares the clean public URL. Native share sheet on phones, copy-to-clipboard everywhere else.
export default function ShareButton({ accent }) {
  const [copied, setCopied] = useState(false);
  const colour = accent || "#22D3EE";
  // The canonical public address, read from NEXT_PUBLIC_SITE_URL in Vercel's project
  // settings, falling back to the origin the visitor is actually on.
  //
  // The hardcoded vercel.app URL this replaces was correct at the time. That is exactly
  // why it was worth removing: a share URL is the one string in the app that nothing
  // ever exercises, so the day the canonical address changes it goes stale silently and
  // keeps sending people to the old host. The origin fallback means it cannot.
  const url =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (typeof window !== "undefined" ? window.location.origin : "");

  const share = async function () {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: "Vaeon", text: "Come train with me on Vaeon", url: url });
        return;
      } catch (e) {
        // user cancelled or share unsupported, fall through to copy
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(function () { setCopied(false); }, 2000);
    } catch (e) {
      setCopied(false);
    }
  };

  return (
    <button
      onClick={share}
      className="w-full py-3 rounded-md font-display text-sm border flex items-center justify-center gap-2"
      style={{ borderColor: colour + "55", color: colour, background: colour + "12" }}
    >
      <Icon name="install" size={16} />
      {copied ? "Link copied, pass it on" : "Share Vaeon with a mate"}
    </button>
  );
}
