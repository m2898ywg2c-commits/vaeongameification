import TypeOrb from "./TypeOrb";
import { TYPES } from "@/lib/personality";

// Types whose render still shows the old colour. See the note by PENDING_ARTWORK below.
const PENDING_ARTWORK = ["anchor"];

// The type character.
//
// TWO VARIANTS, AND THE DIFFERENCE IS NOT DECORATIVE.
//
// "full" is the whole figure. It was measured before it was used: shrunk below about 60px
// all eight are the same pale face on a dark body, so the component refuses rather than
// degrades and hands back the orb instead. The floor is real, not cautious.
//
// "face" is a head-and-shoulders crop, centred on each character by finding the brightest
// cluster in the upper frame rather than assuming the figure sits in the middle of its
// card, which it does not. Cropping to the head is what makes a small avatar work: at 38px
// a full body gives you fifteen pixels of head, and a portrait gives you thirty-eight.
//
// WHAT THE FACE VARIANT COSTS, WRITTEN DOWN SO IT IS A DECISION AND NOT AN ACCIDENT.
//
// The orb carries the type letter. The portrait does not, so on the leaderboard the only
// thing separating eight people is hue. Around one man in twelve has some colour vision
// deficiency, and for them the leaderboard just lost its type column. The alt text carries
// the name for screen readers, but that does nothing for someone who can see the picture
// perfectly well and cannot tell teal from green. If that matters more than the character,
// put the orb back on the leaderboard; it is one word in leaderboard/page.js.
//
// WHY THE DARK MEDALLION ON THE FULL VARIANT.
//
// The renders have their background baked in. There is no alpha and there cannot be,
// because the characters are charcoal-black and so is the backdrop, so nothing can key
// them apart. Dropped raw onto the light theme they are black rectangles, which would
// break the one feature in this app that exists for accessibility rather than taste.
// Framing them fixes it honestly: invisible in dark mode, a framed picture in light mode.
export default function TypeCharacter({ typeId, size, variant, className }) {
  const t = TYPES[typeId];
  if (!t) return null;

  const s = size || 120;
  const face = variant === "face";

  // The Anchor moved to violet and its artwork did not. Until it is regenerated it falls
  // back to the orb, which is already the right colour, rather than shipping a type whose
  // character and accent disagree on the same screen. Delete it from the list above the
  // day the new render lands. Nothing else needs to change.
  if (PENDING_ARTWORK.indexOf(typeId) !== -1) return <TypeOrb typeId={typeId} size={s} />;
  if (!face && s < 60) return <TypeOrb typeId={typeId} size={s} />;

  return (
    <div
      className={className}
      style={{
        width: s, height: s, flexShrink: 0,
        borderRadius: face ? "50%" : Math.round(s * 0.14),
        overflow: "hidden",
        background: "#0B0B0E",
        border: "1px solid " + t.colors[0] + (face ? "55" : "40"),
        boxShadow: "0 0 " + Math.round(s * 0.18) + "px " + t.colors[0] + "24",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={"/characters/" + typeId + (face ? "-face" : "") + ".webp"}
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
