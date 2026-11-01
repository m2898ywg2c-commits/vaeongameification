import CharacterMotion from "../CharacterMotion";
import TypeOrb from "../TypeOrb";
import CoachTalk from "../coach/CoachTalk";
import Icon from "../Icon";
import { TRACK } from "@/lib/brand";

// THE COACH BRIEFING: THE TOP OF THE DASHBOARD IS NOW YOUR CHARACTER TALKING TO YOU.
//
// It replaces three things that all said something about today: the date label, the workout
// card and the line of weekly guidance. The character is shown at the size the artwork was
// made for, playing its own gym move, instead of a 46px face in a header. Underneath it, one
// line of fact and one line in its voice (lib/briefing.js), then one button. Everything else
// on the old dashboard is still there, in the drawer below the route.
//
// The figure stands on a HUD plinth: a thin ellipse in the user's colour, a faint grid and a
// scan line. Lines and hairlines only, so it stays inside the brand rules (no gradients in
// chrome, nothing round except the orbs) and still reads as a screen from a machine.

export default function CoachBrief({ typeId, typeName, framing, brief, finished, blockNumber, blockWeeks, gym, talkContext }) {
  const accent = "var(--accent)";
  const now = new Date();
  const stamp = now.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });

  return (
    <section className="hud-panel hud-grid relative rounded-md border mb-3 overflow-hidden" style={{ borderColor: "color-mix(in srgb, var(--accent) 30%, var(--brand-line))" }}>
      <div className="hud-scan" aria-hidden="true" />
      <div className="relative flex items-end gap-1 px-3 pt-3">
        <div className="relative flex-shrink-0" style={{ width: 132, height: 140 }}>
          <svg className="absolute" viewBox="0 0 132 30" width="132" height="30" style={{ left: 0, bottom: 0 }} aria-hidden="true">
            <ellipse cx="66" cy="18" rx="54" ry="8" fill="none" stroke={accent} strokeWidth="1.2" className="hud-plinth" />
            <ellipse cx="66" cy="18" rx="36" ry="5" fill="none" stroke={accent} strokeOpacity="0.45" strokeWidth="1" />
          </svg>
          <div className="absolute" style={{ left: 2, bottom: 6 }}>
            {typeId
              ? <CharacterMotion typeId={typeId} size={128} on="mount" idle clip />
              : <TypeOrb typeId="architect" size={96} />}
          </div>
        </div>

        <div className="flex-1 min-w-0 pb-3">
          <p className="text-[0.6875rem] uppercase mb-1.5" style={{ color: accent, letterSpacing: TRACK.label }}>
            <span className="hud-dot" aria-hidden="true" /> {typeName ? typeName.replace("The ", "") : "Coach"} &middot; {stamp}
          </p>
          <p className="font-display text-xl font-normal leading-tight">{brief.fact}</p>
          <p className="text-[0.9375rem] leading-snug mt-1.5" style={{ color: "var(--brand-muted)" }}>
            {brief.voice}
          </p>
        </div>
      </div>

      <div className="relative px-3 pb-3 pt-1 grid gap-2">
        {finished ? (
          <a href="/blockend" className="flex items-center gap-3 rounded-md px-4"
            style={{ height: 56, background: "#3DDC97", color: "#000000" }}>
            <span className="flex-1 font-display text-lg">Read your block {blockNumber || 1} report</span>
            <Icon name="arrow" size={22} />
          </a>
        ) : (
          <a href="/plan" className="hud-go flex items-center gap-3 rounded-md px-4"
            style={{ height: 56, background: accent, color: "var(--on-accent)" }}>
            <span className="flex-1 font-display text-lg">Start today&rsquo;s workout</span>
            <Icon name="arrow" size={22} />
          </a>
        )}
        <CoachTalk typeId={typeId} framing={framing} mode="dashboard" context={talkContext} />
      </div>
    </section>
  );
}
