"use client";

// How did that feel?
//
// WHY THIS IS THREE WORDS AND NOT A CHAT WINDOW.
//
// The signal is wanted so the programme can be built better. A conversation would collect
// richer text from the small number of people who would ever type into it, and nothing at
// all from everybody else. Three buttons on a card that has just been closed get answered
// because answering costs one tap at the moment the memory is freshest.
//
// WHY NOT GOOD AND BAD.
//
// Good and bad record a mood. Too easy and too hard name the change to make. Only one of
// those is worth a table.
//
// Failure is silent on purpose. This is a nice-to-have sitting on the critical path of
// finishing a session, and an error toast because a preference did not save would be a
// worse outcome than losing the row.

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const CHOICES = [
  { id: "easy", label: "Too easy" },
  { id: "right", label: "Just right" },
  { id: "hard", label: "Too hard" },
];

export default function SetFeedback({ dayKey, exercise, initial }) {
  const [picked, setPicked] = useState(initial || null);

  async function choose(verdict) {
    // Optimistic. The tap has to feel instant in a gym.
    setPicked(verdict);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from("set_feedback").upsert({
        user_id: user.id, day_key: dayKey, exercise: exercise, verdict: verdict,
        logged_at: new Date().toISOString(),
      }, { onConflict: "user_id,day_key,exercise" });
    } catch (e) {}
  }

  return (
    <div className="flex items-center gap-1.5">
      {CHOICES.map(function (c) {
        const on = picked === c.id;
        return (
          <button
            key={c.id}
            type="button"
            aria-pressed={on}
            aria-label={c.label}
            onClick={function (e) { e.stopPropagation(); choose(c.id); }}
            className="px-2 py-1 rounded-sm text-[0.6875rem] border font-display"
            style={on
              ? { borderColor: "#3DDC97", color: "#3DDC97", background: "rgba(61,220,151,0.16)" }
              : { borderColor: "var(--brand-line)", color: "var(--brand-dim)" }}>
            {c.label}
          </button>
        );
      })}
    </div>
  );
}
