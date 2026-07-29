"use client";

import { useState } from "react";

// Shares the clean public URL. Native share sheet on phones, copy-to-clipboard everywhere else.
export default function ShareButton({ accent }) {
  const [copied, setCopied] = useState(false);
  const colour = accent || "#22D3EE";
  const url = "https://vaeon-fitness.vercel.app";

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
      className="w-full py-3 rounded-2xl font-bold text-sm border flex items-center justify-center gap-2"
      style={{ borderColor: colour + "55", color: colour, background: colour + "12" }}
    >
      <span aria-hidden="true">{"\u{1F517}"}</span>
      {copied ? "Link copied, pass it on" : "Share Vaeon with a mate"}
    </button>
  );
}
