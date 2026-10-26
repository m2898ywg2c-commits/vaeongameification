import TypeOrb from "./TypeOrb";
import { TYPES } from "@/lib/personality";

// Types whose render still shows the old colour. Empty: the Anchor's render was recoloured
// in place when its palette moved, so nothing is currently waiting on new artwork.
const PENDING_ARTWORK = [];

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
// The full renders now carry a real alpha channel, so the medallion is no longer covering
// for a baked-in backdrop. It still earns its place. The characters are charcoal-black, so
// cut out and dropped onto the light theme they read as black silhouettes, and the accent
// colour that identifies the type goes with them. The medallion supplies the dark ground
// they were lit against: invisible in dark mode, a framed picture in light mode. Change
// the colour here and you are changing what the artwork sits on, not just its frame.
//
// Both variants now come from the same gym renders, so the avatar on the dashboard and the
// figure on the type page are finally the same character.
//
// The face crop was held back at first on the theory that a head-and-shoulders crop of a
// robot mid sled-push would make a poor avatar. That was wrong, and the old portraits were
// reported from the dashboard as an unreadable pale shape at 46px. The crop is the helmet
// plus a hint of shoulder, found by taking the largest bright desaturated blob in the top
// two thirds of the frame, which in these renders can only be the glossy white dome.
//
// It also helps the colour-blindness problem noted above, though it does not solve it. The
// eight domes differ in visor shape and eye shape as well as hue, so there is now something
// other than colour to go on. At 38px that difference is slight. The alt text is still what
// actually carries the name.
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
