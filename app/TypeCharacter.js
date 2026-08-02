import TypeOrb from "./TypeOrb";
import { TYPES } from "@/lib/personality";

// Types whose render still shows the old colour. See the note in the component.
const PENDING_ARTWORK = ["anchor"];

// The type character.
//
// WHY THERE IS A HARD FLOOR AT 60px.
//
// These are raster renders, not vectors, and they were measured before they were used.
// Cropped out of the poster and shrunk, all eight are the same white face on a dark body
// by 38px and an indistinguishable smear by 24px. The orb is legible at every one of the
// eleven sizes this app asks for; the character is not. So the component refuses rather
// than degrades: ask for anything under 60 and you get the orb back. If a future pass
// wants a character on the leaderboard, it has to replace the artwork first, not the floor.
//
// WHY THE DARK MEDALLION.
//
// The renders have their background baked in. There is no alpha, and there cannot be,
// because the characters are charcoal-black and so is the backdrop, so nothing can key
// them apart. Dropped straight onto the light theme they are black rectangles, which
// would break the one feature in this app that exists for accessibility rather than taste.
//
// Framing them in their own dark tile fixes that honestly. In dark mode the tile all but
// disappears. In light mode it reads as a framed picture, which is what it is, rather than
// as a broken asset. The poster already does this; the cards are the frame.
export default function TypeCharacter({ typeId, size, className }) {
  const t = TYPES[typeId];
  if (!t) return null;

  const s = size || 120;
  if (s < 60) return <TypeOrb typeId={typeId} size={s} />;
  // The Anchor moved to violet and its artwork did not. Until it is regenerated it falls
  // back to the orb, which is already the right colour, rather than shipping a type whose
  // character and accent disagree on the same screen. Delete it from this set the day the
  // new render lands. Nothing else needs to change.
  if (PENDING_ARTWORK.indexOf(typeId) !== -1) return <TypeOrb typeId={typeId} size={s} />;

  return (
    <div
      className={className}
      style={{
        width: s, height: s, flexShrink: 0,
        borderRadius: Math.round(s * 0.14),
        overflow: "hidden",
        background: "#0B0B0E",
        border: "1px solid " + t.colors[0] + "40",
        boxShadow: "0 0 " + Math.round(s * 0.18) + "px " + t.colors[0] + "24",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={"/characters/" + typeId + ".webp"}
        alt={t.name}
        width={s}
        height={s}
        loading="lazy"
        decoding="async"
        style={{ display: "block", width: "100%", height: "100%", objectFit: "cover" }}
      />
    </div>
  );
}
