import { TYPES } from "@/lib/personality";

// The type orb.
//
// DELIBERATELY THREE-DIMENSIONAL, AND EXEMPT FROM THE FLAT RULE.
//
// Everything else in this app was flattened on purpose. Gradients came off every button,
// every session header and every progress bar, because a gradient is two colours
// pretending to be a brand and the mark is one flat weight of ink. That rule stops here.
//
// The orb is not chrome, it is the product. It is the single object that carries a user's
// type: a physical thing with a light source, a specular highlight and a contact shadow,
// in a colour pair nobody else on the leaderboard has. Flattening it to a coloured disc
// would turn the one piece of the interface that belongs to a person into a status dot,
// and the eight types are the whole argument for this app existing.
//
// It also does not fight the logo the way the old button gradients did. The mark is white
// on black and never coloured; the orb is coloured and never white. They occupy different
// registers on purpose, which is why one can be dimensional while the other stays graphic.
//
// So: keep the radial gradient, keep the highlight, keep the shadow. If a future pass
// tries to "make the orbs consistent with the flat system", it has misread which of the
// two things is the system.
//
// Shared so the person's type shows up everywhere, not just on the assessment result. The
// assessment used to carry its own near-identical copy of this, which is precisely how one
// of them ends up flattened and the other does not.
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
        <p className="font-display text-sm leading-tight">{t.name}</p>
        <p className="text-xs text-brand-muted leading-tight">{subtitle || t.tagline}</p>
      </div>
    </div>
  );
}

