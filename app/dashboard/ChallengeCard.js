// The shared goal card.
//
// Sits above the personal stats on purpose. The individual tiles below it say "you are on
// two of four", which is a private fact. This says "we are on six of eight, two to go",
// which is the one that gets somebody to text their brother. For a group of twelve who
// are mostly one family, that is the mechanism, not the notification.
//
// Named participants respect leaderboard_opt_in. Somebody who asked not to be ranked in
// public has not agreed to appear in a different public list instead, so their sessions
// count toward the total but their name does not appear. See supabase/challenges.sql.

export default function ChallengeCard({ challenge, accent }) {
  if (!challenge || !challenge.id) return null;

  const tone = accent || "#22D3EE";
  const collective = challenge.kind === "collective";
  const done = collective ? Number(challenge.total_done || 0) : Number(challenge.my_done || 0);
  const target = Number(challenge.target || 1);
  const pct = Math.min(100, Math.round((done / target) * 100));
  const left = Math.max(0, target - done);
  const days = Number(challenge.days_left || 0);
  const hit = done >= target;

  const names = Array.isArray(challenge.participants) ? challenge.participants : [];

  return (
    <div className="rounded-2xl border-2 p-4 mb-3" style={{ borderColor: tone + "55", background: tone + "12" }}>
      <div className="flex items-baseline justify-between gap-2 mb-1">
        <p className="text-sm font-bold" style={{ color: tone }}>{challenge.title}</p>
        <span className="text-[11px] text-gray-400 flex-shrink-0">
          {days <= 0 ? "Last day" : days + (days === 1 ? " day left" : " days left")}
        </span>
      </div>

      {challenge.blurb ? <p className="text-xs text-gray-300 mb-3">{challenge.blurb}</p> : null}

      <div className="flex items-baseline gap-2 mb-2">
        <span className="text-2xl font-bold tabular-nums" style={{ color: tone }}>{done}</span>
        <span className="text-sm text-gray-400">of {target}</span>
        {collective ? <span className="text-xs text-gray-500">together</span> : <span className="text-xs text-gray-500">each</span>}
      </div>

      {/* A plain bar. Progress toward a shared number is the entire message and anything
          decorative competes with it. */}
      <div className="h-2 rounded-full mb-2 overflow-hidden" style={{ background: "rgba(255,255,255,0.10)" }}>
        <div className="h-full rounded-full" style={{ width: pct + "%", background: tone }} />
      </div>

      <p className="text-xs text-gray-300">
        {hit
          ? "Done. That is the target cleared, anything else this week is a bonus."
          : (collective
            ? left + (left === 1 ? " session" : " sessions") + " to go. Any one of us can take it."
            : left + (left === 1 ? " session" : " sessions") + " to go.")}
      </p>

      {collective && names.length ? (
        <p className="text-[11px] text-gray-500 mt-2 leading-snug">
          {names.map(function (p) { return p.name + " " + p.done; }).join(" · ")}
        </p>
      ) : null}
    </div>
  );
}
