import { TYPES } from "@/lib/personality";

// Shared so the persons type shows up everywhere, not just on the assessment result.
export default function TypeOrb({ typeId, size }) {
  const t = TYPES[typeId];
  if (!t) return null;
  const s = size || 40;
  const gid = "orb-" + typeId + "-" + s;
  return (
    <svg width={s} height={s} viewBox="0 0 100 100" aria-hidden="true" style={{ flexShrink: 0 }}>
      <defs>
        <radialGradient id={gid} cx="35%" cy="28%" r="80%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="16%" stopColor={t.colors[0]} />
          <stop offset="100%" stopColor={t.colors[1]} />
        </radialGradient>
      </defs>
      <ellipse cx="50" cy="90" rx="26" ry="5" fill="#000000" opacity="0.35" />
      <circle cx="50" cy="47" r="38" fill={"url(#" + gid + ")"} />
      <ellipse cx="37" cy="29" rx="13" ry="7" fill="#ffffff" opacity="0.35" transform="rotate(-25 37 29)" />
      <text x="50" y="58" textAnchor="middle" fontSize="30" fontWeight="700" fill="#ffffff" opacity="0.92">
        {t.letter}
      </text>
    </svg>
  );
}

// A compact header strip: orb, name, and the one-line tagline.
export function TypeHeader({ typeId, subtitle }) {
  const t = TYPES[typeId];
  if (!t) return null;
  return (
    <div className="flex items-center gap-3">
      <TypeOrb typeId={typeId} size={44} />
      <div>
        <p className="text-sm font-bold leading-tight">{t.name}</p>
        <p className="text-xs text-gray-400 leading-tight">{subtitle || t.tagline}</p>
      </div>
    </div>
  );
}

