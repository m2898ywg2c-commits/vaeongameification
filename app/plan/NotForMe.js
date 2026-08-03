"use client";

// "Not for me."
//
// Deliberately quiet, deliberately separate from the load feedback, and deliberately three
// fixed answers rather than a text box. See supabase/exercise_prefs.sql for why on all
// three counts.
//
// THE PAIN ANSWER IS HANDLED DIFFERENTLY ON PURPOSE.
//
// "Do not fancy it" and "no kit" drop the exercise and get out of the way. "It hurts" also
// drops it, but says one sentence first, because the app has just been told about pain and
// pretending it has not is its own kind of dishonest. One sentence, once, no alarm, and no
// advice beyond pointing at somebody qualified. It does not suggest a safer alternative for
// the same body part, because it cannot tell a niggle from a tear and should not guess.

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const REASONS = [
  { id: "dislike", label: "Don't fancy it" },
  { id: "no_kit", label: "No kit for it" },
  { id: "hurts", label: "It hurts" },
];

export default function NotForMe({ exercise, onAvoided }) {
  const [open, setOpen] = useState(false);
  const [hurt, setHurt] = useState(false);

  async function choose(reason) {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("exercise_prefs").upsert({
          user_id: user.id, exercise: exercise, reason: reason,
        }, { onConflict: "user_id,exercise" });
      }
    } catch (e) {}
    if (reason === "hurts") { setHurt(true); return; }
    if (onAvoided) onAvoided(exercise);
  }

  if (hurt) {
    return (
      <div className="mt-3 rounded-md border p-3 text-left"
           style={{ borderColor: "var(--brand-line)", background: "var(--brand-surface)" }}>
        <p className="text-xs text-brand-muted leading-relaxed mb-3">
          Dropped from your plan. If it keeps hurting, that is worth a word with a GP or a
          physio rather than an app.
        </p>
        <button type="button" onClick={function () { if (onAvoided) onAvoided(exercise); }}
          className="text-xs underline text-brand-muted">Got it</button>
      </div>
    );
  }

  if (!open) {
    return (
      <button type="button" onClick={function () { setOpen(true); }}
        className="mt-3 text-[0.6875rem] underline text-brand-dim">
        Not for me
      </button>
    );
  }

  return (
    <div className="mt-3">
      <p className="text-[0.6875rem] text-brand-dim mb-2">Stop giving me this one because</p>
      <div className="flex gap-1.5 flex-wrap">
        {REASONS.map(function (r) {
          return (
            <button key={r.id} type="button" onClick={function () { choose(r.id); }}
              className="px-2.5 py-1.5 rounded-sm text-[0.6875rem] border font-display"
              style={{ borderColor: "var(--brand-line)", color: "var(--brand-muted)" }}>
              {r.label}
            </button>
          );
        })}
        <button type="button" onClick={function () { setOpen(false); }}
          className="px-2 py-1.5 text-[0.6875rem] underline text-brand-dim">Cancel</button>
      </div>
    </div>
  );
}
