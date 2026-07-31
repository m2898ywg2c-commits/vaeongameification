"use client";

import Link from "next/link";

export default function Home({ accent }) {
  const colour = accent || "#22D3EE";
  return (
    <Link
      href="/dashboard"
      aria-label="Home"
      className="inline-flex items-center gap-2 px-4 py-3 rounded-sm border font-display text-sm"
      style={{ borderColor: colour + "55", background: colour + "18", color: colour }}
    >
      <span className="text-base" aria-hidden="true">&#127968;</span>
      <span>Home</span>
    </Link>
  );
}
