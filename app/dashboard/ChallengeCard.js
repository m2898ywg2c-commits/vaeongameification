"use client";

// The shared goal card.
//
// Sits below the workout button and the block line. The individual stats further down say
// "you are on two of four", which is a private fact. This says "we are on six of eight,
// two to go", which is the one that gets somebody to text their brother. For a group of
// twelve who are mostly one family, that is the mechanism, not the notification.
//
// HIDING
//
// Dismissal is local to the device and keyed by challenge id, so hiding this week's
// challenge does not hide next week's. That is deliberate: the alternative, a column on
// profiles, would mean somebody who once found a challenge annoying never sees another
// one, which is a much bigger decision than the tap they actually made. localStorage also
// means the state does not need a round trip and cannot fail.
//
// Named participants respect leaderboard_opt_in. Somebody who asked not to be ranked in
// public has not agreed to appear in a different public list instead, so their sessions
// count toward the total but their name does not appear. See supabase/challenges.sql.

import { useEffect, useState } from "react";
import Icon from "../Icon";
import { BRAND, TRACK } from "@/lib/brand";

const KEY_PREFIX = "vaeon-challenge-hidden-";

export default function ChallengeCard({ challenge, accent }) {
  const [hidden, setHidden] = useState(false);
  const [ready, setReady] = useState(false);

  const id = challenge && challenge.id ? challenge.id : null;

  // Read after mount rather than during render. Reading localStorage while rendering
  // makes the server and client disagree about the first paint, and React is right to
  // complain about that.
  useEffect(function () {
    if (!id) return;
    try {
      setHidden(Boolean(window.localStorage.getItem(KEY_PREFIX + id)));
    } catch (e) {}
    setReady(true);
  }, [id]);

  if (!challenge || !id) return null;

  function hide() {
    try { window.localStorage.setItem(KEY_PREFIX + id, "1"); } catch (e) {}
    setHidden(true);
  }

  function show() {
    try { window.localStorage.removeItem(KEY_PREFIX + id); } catch (e) {}
    setHidden(false);
  }

  const tone = accent || BRAND.accent;
  const collective = challenge.kind === "collective";
  const done = collective ? Number(challenge.total_done || 0) : Number(challenge.my_done || 0);
  const mine = Number(challenge.my_done || 0);
  const target = Number(challenge.target || 1);
  const pct = Math.min(100, Math.round((done / target) * 100));
  const left = Math.max(0, target - done);
  const days = Number(challenge.days_left || 0);
  const hit = done >= target;

  const names = Array.isArray(challenge.participants) ? challenge.participants : [];

  // Hidden state leaves one quiet line rather than nothing at all. A card that vanishes
  // with no way back is a setting the user cannot find again, and this one lives nowhere
  // else.
  if (hidden && ready) {
    return (
      <button onClick={show} className="w-full text-left text-[11px] mb-3 underline"
        style={{ color: BRAND.dim }}>
        Show the group challenge
      </button>
    );
  }

  return (
    <div className="rounded-md border p-4 mb-3" style={{ borderColor: tone + "44", background: BRAND.surface }}>
      <div className="flex items-center gap-2 mb-2.5">
        <span style={{ color: tone }}><Icon name="group" size={16} /></span>
        <p className="text-[9px] uppercase flex-1" style={{ color: tone, letterSpacing: TRACK.label }}>
          {challenge.title}
        </p>
        <button onClick={hide} className="text-[10px] uppercase px-2 py-1"
          style={{ color: BRAND.dim, letterSpacing: "0.16em" }} aria-label="Hide the group challenge">
          Hide
        </button>
      </div>

      {/* The number is the headline. Everything else on this card is a caption for it. */}
      <div className="flex items-baseline gap-2 mb-1">
        <span className="font-display text-3xl leading-none" style={{ color: hit ? "#3DDC97" : tone }}>{done}</span>
        <span className="text-sm" style={{ color: BRAND.muted }}>of {target}</span>
        <span className="flex-1" />
        <span className="text-[11px]" style={{ color: days <= 1 ? "#FFB020" : BRAND.dim }}>
          {days <= 0 ? "Last day" : days + (days === 1 ? " day left" : " days left")}
        </span>
      </div>

      <div className="h-1 mb-2.5 overflow-hidden rounded-sm" style={{ background: "rgba(255,255,255,0.10)" }}>
        <div className="h-full" style={{ width: pct + "%", background: hit ? "#3DDC97" : tone }} />
      </div>

      <p className="text-xs mb-2 leading-relaxed" style={{ color: "#d1d5db" }}>
        {hit
          ? "Cleared. Anything else this week is a bonus."
          : (collective
            ? left + (left === 1 ? " session" : " sessions") + " to go, and any one of us can take it."
            : left + (left === 1 ? " session" : " sessions") + " to go.")}
      </p>

      {/* Your own contribution, stated plainly. "We are on six" is motivating right up
          until you realise you have no idea whether any of them were yours. */}
      {collective ? (
        <div className="flex items-center gap-2 pt-2.5" style={{ borderTop: "1px solid " + BRAND.line }}>
          <span className="text-[9px] uppercase" style={{ color: BRAND.dim, letterSpacing: TRACK.label }}>Yours</span>
          <span className="font-display text-sm" style={{ color: mine > 0 ? tone : BRAND.dim }}>{mine}</span>
          <span className="flex-1" />
          {names.length ? (
            <span className="text-[11px] truncate" style={{ color: BRAND.dim, maxWidth: "62%" }}>
              {names.slice(0, 4).map(function (p) { return p.name + " " + p.done; }).join("  ")}
              {names.length > 4 ? "  +" + (names.length - 4) : ""}
            </span>
          ) : (
            <span className="text-[11px]" style={{ color: BRAND.dim }}>Nobody has logged one yet</span>
          )}
        </div>
      ) : null}
    </div>
  );
}
