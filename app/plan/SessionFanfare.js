"use client";

import TypeCharacter from "../TypeCharacter";
import { TYPES } from "@/lib/personality";

// The session fanfare.
//
// WHY IT IS DETERMINISTIC AND NOT RANDOM.
//
// "A different one each day" cannot be Math.random(), because this sits inside a React
// tree that re-renders while the animation is playing. A random pick would swap variant
// mid-burst and restart it. Hashing the day key and the type id gives a value that is
// stable for the whole session, genuinely varies day to day, and differs between two
// people finishing the same session on the same day because their type is in the hash.
//
// WHY NO CONFETTI LIBRARY.
//
// The smallest respectable one is around 10KB of JavaScript to draw shapes this app can
// already draw. Four keyframes in globals.css cost nothing on the wire, and more to the
// point they inherit the user's own two colours, which a generic confetti burst does not.
// The point of this moment is that it belongs to that person, not that something popped.

const VARIANTS = ["rays", "rings", "sparks", "bloom"];

// FNV-1a. Small, stable, and does not pull in a dependency to hash eight characters.
function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export default function SessionFanfare({ typeId, dayKey, size }) {
  const t = TYPES[typeId];
  const s = size || 54;
  const box = Math.round(s * 2.3);

  if (!t) return <TypeCharacter typeId={typeId} size={s} variant="face" />;

  const seed = hash(String(dayKey || "") + "|" + String(typeId));
  const variant = VARIANTS[seed % VARIANTS.length];
  const main = t.colors[0];
  const deep = t.colors[1];
  const bits = [];

  if (variant === "rays") {
    for (let i = 0; i < 10; i++) {
      bits.push(<i key={i} className="vf-ray" style={{
        "--va": (i * 36) + "deg", "--vc": i % 2 ? deep : main,
        animationDelay: (i % 5) * 45 + "ms",
      }} />);
    }
  } else if (variant === "rings") {
    for (let i = 0; i < 3; i++) {
      bits.push(<i key={i} className="vf-ring" style={{
        "--vc": i === 1 ? deep : main, animationDelay: i * 150 + "ms",
      }} />);
    }
  } else if (variant === "sparks") {
    for (let i = 0; i < 14; i++) {
      // Angles walk by a non-divisor of 360 so they never line up into a wheel, and the
      // radius wobbles off the seed so two types do not scatter identically.
      const a = (i * 47 + (seed >> (i % 8)) % 23) * Math.PI / 180;
      const r = box * (0.30 + ((seed >> i) % 17) / 100);
      bits.push(<i key={i} className="vf-spark" style={{
        "--vx": Math.round(Math.cos(a) * r) + "px",
        "--vy": Math.round(Math.sin(a) * r) + "px",
        "--vc": i % 3 === 0 ? deep : main,
        animationDelay: (i % 6) * 40 + "ms",
      }} />);
    }
  } else {
    bits.push(<i key="b" className="vf-bloom" style={{ "--vc": main }} />);
    for (let i = 0; i < 6; i++) {
      bits.push(<i key={i} className="vf-ray" style={{
        "--va": (i * 60 + 15) + "deg", "--vc": deep,
        animationDelay: 120 + (i % 3) * 70 + "ms",
      }} />);
    }
  }

  return (
    <div className="vf-wrap" style={{ width: box, height: box }} aria-hidden="false">
      <div className="vf-layer">{bits}</div>
      <TypeCharacter typeId={typeId} size={s} variant="face" />
    </div>
  );
}
