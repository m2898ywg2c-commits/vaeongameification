import TypeCharacter from "../TypeCharacter";
import { sessionsByWeek, startOfWeek } from "@/lib/week";
import { TRACK } from "@/lib/brand";

// THE BLOCK, DRAWN AS A ROUTE WITH THE FINISH LINE ALREADY IN SIGHT.
//
// The whole argument for Vaeon is the report at the end of a block: did any of it work. That
// report is the one screen nobody has ever seen, because it only exists at the end, and until
// now the block itself was a 12px line of text on the workout card. This draws it as a trail.
//
// Three borrowed ideas, named so the next person knows what they are protecting:
// - IKEA opens every set of instructions with a picture of the finished thing. The verdict
//   node at the far end is that picture: locked, but visible from day one.
// - Gentler Streak's Activity Path, a single line you can see yourself on.
// - Duolingo's path, minus the part people hated. Duolingo took away choice and users were
//   furious. Nothing here is tappable as a route through the plan; it is a map, and the plan
//   screen still lets freestyle types pick any session in the week.
//
// The light weeks (deload, recovery, restore) sit lower on the line on purpose. A dip that
// looks like a dip is the cheapest way to stop somebody reading an easier week as going
// backwards.
//
// NOTHING HERE IS CALCULATED THAT WAS NOT ALREADY CALCULATED.
//
// Week counts come from sessionsByWeek(), the same definition the streak and the
// leaderboard use. Frozen weeks come from streak_freezes. The week labels come from the
// existing weeksFor() table. Draw only.
//
// Diamonds rather than circles because the mark is all mitred angles and the brand rules
// keep round shapes for the orbs alone.

const LIGHT_WEEKS = ["deload", "recovery", "restore"];
const DAY = 24 * 60 * 60 * 1000;

export default function BlockPath({ typeId, weeks, blockWeeks, weekNo, finished, blockStart, sessions, pledged, frozenWeeks, freezeCredits, blockNumber, gym }) {
  const n = blockWeeks || 6;
  const counts = sessionsByWeek(sessions || []);
  const frozen = {};
  (frozenWeeks || []).forEach(function (w) { frozen[startOfWeek(w).getTime()] = true; });
  const start = blockStart ? startOfWeek(blockStart).getTime() : null;

  // Geometry. A fixed viewBox so the SVG and the HTML overlay share one coordinate system,
  // expressed as percentages when the overlay is placed.
  const W = 340;
  const H = 128;
  const left = 22;
  const right = W - 40;
  const step = (right - left) / n;
  const baseY = 56;

  const nodes = [];
  for (let i = 0; i < n; i += 1) {
    const no = i + 1;
    const rule = weeks && weeks[i] ? weeks[i] : null;
    const label = gym || !rule ? "Wk " + no : rule.label;
    const light = !gym && rule && LIGHT_WEEKS.indexOf(String(rule.label).toLowerCase()) !== -1;
    const testing = !gym && no === 1;
    const wkStart = start !== null ? start + i * 7 * DAY : null;
    const count = wkStart !== null ? counts[wkStart] || 0 : 0;
    let state = "future";
    if (finished || no < weekNo) {
      if (count >= pledged) state = "kept";
      else if (wkStart !== null && frozen[wkStart]) state = "grace";
      else state = "missed";
    } else if (no === weekNo) {
      state = "now";
    }
    // A gentle wave so it reads as a route rather than a progress bar, with light weeks
    // dropped clearly below it.
    const wave = Math.sin(i * 1.3) * 8;
    nodes.push({
      no: no, label: label, light: light, testing: testing, state: state, count: count,
      x: left + step * i + step / 2, y: baseY + wave + (light ? 22 : 0),
    });
  }
  const end = { x: right + 16, y: baseY - 6 };
  const pts = nodes.map(function (p) { return p.x + "," + p.y; }).concat([end.x + "," + end.y]);
  const current = finished ? n : Math.min(weekNo, n);
  // The travelled part of the line runs to the current node, and on to the end once finished.
  const travelled = pts.slice(0, finished ? pts.length : current);

  const accent = "var(--accent)";
  const now = nodes[current - 1];

  function diamond(p, r) {
    return (p.x) + "," + (p.y - r) + " " + (p.x + r) + "," + p.y + " " + p.x + "," + (p.y + r) + " " + (p.x - r) + "," + p.y;
  }

  return (
    <section className="mb-5" aria-label={"Block " + (blockNumber || 1) + ", week " + weekNo + " of " + n}>
      <div className="flex items-baseline justify-between mb-1 px-1">
        <p className="text-[0.6875rem] uppercase" style={{ color: "var(--brand-dim)", letterSpacing: TRACK.label }}>
          Block {blockNumber || 1} route{!finished && now && !gym ? <span style={{ color: accent }}> &middot; {now.label}</span> : null}
        </p>
        <p className="text-[0.6875rem] uppercase" style={{ color: accent, letterSpacing: TRACK.label }}>
          {finished ? "Arrived" : (n - weekNo) + (n - weekNo === 1 ? " week to go" : " weeks to go")}
        </p>
      </div>

      <div className="hud-panel relative rounded-md border overflow-hidden" style={{ borderColor: "var(--brand-line)" }}>
        <svg viewBox={"0 0 " + W + " " + H} width="100%" role="img" aria-hidden="true" style={{ display: "block" }}>
          {/* The whole route, faint and dashed: the weeks still to come. */}
          <polyline points={pts.join(" ")} fill="none" stroke="var(--brand-line-strong)" strokeWidth="1.5" strokeDasharray="3 5" />
          {/* The part already walked, in the user's own colour. */}
          {travelled.length > 1 ? (
            <polyline points={travelled.join(" ")} fill="none" stroke={accent} strokeWidth="2" strokeLinejoin="miter" className="hud-trace" />
          ) : null}

          {nodes.map(function (p) {
            if (p.state === "now") return null;
            const r = 7;
            const fill = p.state === "kept" ? accent : "var(--brand-bg)";
            const stroke = p.state === "future" ? "var(--brand-line-strong)"
              : p.state === "missed" ? "var(--brand-dim)" : accent;
            return (
              <g key={p.no}>
                <polygon points={diamond(p, r)} fill={fill} stroke={stroke} strokeWidth="1.5"
                  strokeDasharray={p.state === "grace" ? "2 2" : undefined} />
                {p.testing && p.state === "future" ? (
                  <polygon points={diamond(p, 3)} fill="var(--brand-line-strong)" />
                ) : null}
              </g>
            );
          })}

          {/* The verdict. Locked until the block is done, but on the map from day one. */}
          <g>
            <polygon points={(end.x) + "," + (end.y - 12) + " " + (end.x + 11) + "," + (end.y - 6) + " " + (end.x + 11) + "," + (end.y + 6) + " " + end.x + "," + (end.y + 12) + " " + (end.x - 11) + "," + (end.y + 6) + " " + (end.x - 11) + "," + (end.y - 6)}
              fill={finished ? accent : "var(--brand-bg)"} stroke={finished ? accent : "var(--brand-line-strong)"} strokeWidth="1.5" />
            {finished ? (
              <polyline points={(end.x - 5) + "," + end.y + " " + (end.x - 1) + "," + (end.y + 4) + " " + (end.x + 5) + "," + (end.y - 4)}
                fill="none" stroke="var(--on-accent)" strokeWidth="2" />
            ) : (
              <g stroke="var(--brand-dim)" strokeWidth="1.4" fill="none">
                <rect x={end.x - 4} y={end.y - 1} width="8" height="6" />
                <path d={"M" + (end.x - 2.5) + " " + (end.y - 1) + " V" + (end.y - 3.5) + " H" + (end.x + 2.5) + " V" + (end.y - 1)} />
              </g>
            )}
          </g>

          {/* Week numbers under the nodes; the current week's name is spelled out in the
              header above, where it has room. Seven full names in 340 units collide. */}
          {nodes.map(function (p) {
            return (
              <text key={"t" + p.no} x={p.x} y={H - 10} textAnchor="middle" fontSize="11"
                fill={p.state === "now" ? accent : "var(--brand-dim)"} style={{ letterSpacing: "0.04em" }}>
                {"W" + p.no}
              </text>
            );
          })}
          <text x={end.x} y={H - 10} textAnchor="middle" fontSize="11" fill={finished ? accent : "var(--brand-dim)"} style={{ letterSpacing: "0.04em" }}>
            End
          </text>
        </svg>

        {/* You are here: the character itself stands on the current node. HTML rather than
            SVG so it is the same component, crop and fallback as everywhere else. */}
        {!finished && now ? (
          <div className="absolute" style={{
            left: (now.x / W * 100) + "%", top: (now.y / H * 100) + "%",
            transform: "translate(-50%, -78%)", pointerEvents: "none",
          }}>
            <div className="hud-beacon" style={{ borderColor: accent }} />
            <TypeCharacter typeId={typeId} size={38} variant="face" />
          </div>
        ) : null}
      </div>

      <p className="text-[0.75rem] leading-snug mt-2 px-1" style={{ color: "var(--brand-dim)" }}>
        {finished
          ? "Your block report is unlocked."
          : (weekNo === 1 && !gym
            ? "Testing week. Find your numbers; every week after this is built from them."
            : "The report at the end tells you honestly whether this block worked.")}
        {freezeCredits > 0 && !finished ? " One grace week in hand." : ""}
      </p>
    </section>
  );
}
