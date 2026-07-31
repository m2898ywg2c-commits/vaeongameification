"use client";

// The to-do group.
//
// These were three loose banners scattered between the workout button and the stats, each
// looking like a permanent part of the furniture. They are not. Every one of them is a
// task that disappears the moment it is done, and that is the thing the old layout failed
// to communicate: without a heading saying so, an amber card about starting weights reads
// as a warning you are stuck with rather than a job with an end.
//
// Grouping them under one counted heading does three things. It says how many there are,
// it promises they will go, and it puts them above the workout button where a setup task
// belongs, without leaving them there forever once the setup is finished.
//
// Client side because the install prompt decides its own visibility at runtime: whether
// the app is already installed, whether the browser has fired beforeinstallprompt, and
// whether the offer was dismissed in the last fortnight are all things only the browser
// knows. The heading has to count that item too, so InstallPrompt reports up.

import { useState } from "react";
import Icon from "../Icon";
import InstallPrompt from "../InstallPrompt";
import { BRAND, TRACK } from "@/lib/brand";

function Row({ href, icon, title, blurb, tone }) {
  return (
    <a href={href} className="flex items-center gap-3 rounded-md border p-4 mb-2"
      style={{ borderColor: tone + "55", background: tone + "0D" }}>
      <span style={{ color: tone }}><Icon name={icon} size={20} /></span>
      <div className="flex-1">
        <p className="font-display text-sm" style={{ color: tone }}>{title}</p>
        <p className="text-xs leading-snug" style={{ color: BRAND.muted }}>{blurb}</p>
      </div>
      <span style={{ color: tone }}><Icon name="arrow" size={16} /></span>
    </a>
  );
}

export default function ToDo({ accent, needsBaselines, needsMetrics }) {
  const [installShowing, setInstallShowing] = useState(false);

  const count = (needsBaselines ? 1 : 0) + (needsMetrics ? 1 : 0) + (installShowing ? 1 : 0);

  return (
    // Never returns null even at zero items, because InstallPrompt has to stay mounted to
    // find out whether it has anything to offer. It reports back through onShow and the
    // heading appears at that point. Returning null early would mean the install offer
    // could never appear at all.
    <div className={count > 0 ? "mb-5" : ""}>
      {count > 0 ? (
        <div className="mb-2">
          <p className="rule-label rule-label-left mb-1.5">
            To do &middot; {count}
          </p>
          <p className="text-xs" style={{ color: BRAND.dim, letterSpacing: TRACK.tight }}>
            {count === 1
              ? "One quick thing to set up. It disappears once it is done."
              : "A few quick things to set up. They disappear as you do them."}
          </p>
        </div>
      ) : null}

      {needsBaselines ? (
        <Row href="/settings" icon="alert" tone="#FFB020"
          title="Set your starting weights"
          blurb="Takes a minute. No idea what they are? We will help." />
      ) : null}

      {needsMetrics ? (
        <Row href="/settings" icon="ruler" tone={accent}
          title="Log this week's stats"
          blurb="Weight and measurements. Twenty seconds, and it makes your charts worth reading." />
      ) : null}

      <InstallPrompt accent={accent} onShow={setInstallShowing} />
    </div>
  );
}
