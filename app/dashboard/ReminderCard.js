// The in-app nudge, and specifically the one that appears after somebody has missed.
//
// This is the higher-value half of the reminder work, even though push is the half that
// sounds like a feature. Push needs permission, and on iOS needs the PWA installed first,
// so it will always reach a fraction of users. This reaches all of them, and it lands at
// the exact moment that decides whether someone stays: opening the app having not trained
// for a few days and finding out what it thinks of them.
//
// Deliberately silent on the "due" occasion. Somebody who is on track already has a large
// gradient button two inches below this saying "Today's workout", and a card above it
// saying much the same thing is noise. The card earns its place on the recovery
// occasions, where the app otherwise says nothing at all.

import { reminderCopy } from "@/lib/reminders";

// Occasions worth interrupting for. See lib/reminders.js for what each one means.
const SHOW_FOR = ["lapsed", "drifting", "missed", "short"];

export default function ReminderCard({ occasion, typeId, framing, accent }) {
  if (!occasion || SHOW_FOR.indexOf(occasion) === -1) return null;

  const copy = reminderCopy(typeId || "architect", occasion, framing);
  if (!copy) return null;

  // Same accent as everything else the coach says, rather than a warning colour. This is
  // the coach talking, not an error state, and amber would read as "you have done
  // something wrong" which is precisely the tone the copy is written to avoid.
  const tone = accent || "#22D3EE";

  return (
    <div className="rounded-2xl border-2 p-4 mb-3" style={{ borderColor: tone + "55", background: tone + "12" }}>
      <p className="text-sm font-bold mb-1" style={{ color: tone }}>{copy.title}</p>
      <p className="text-xs text-gray-300 leading-relaxed">{copy.body}</p>
      <a href="/plan" className="inline-block text-xs font-bold underline mt-2" style={{ color: tone }}>
        Open today&rsquo;s session
      </a>
    </div>
  );
}
