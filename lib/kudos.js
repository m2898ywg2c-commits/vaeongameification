// Kudos vocabulary. Deliberately a fixed list rather than free text.
//
// A bounded set keeps the social layer warm without turning the app into a messaging
// product, which would bring moderation, abuse and safeguarding duties with it. The same
// list is mirrored as a CHECK constraint on kudos.note_code in the database, so an invalid
// code cannot be stored even if someone bypasses this UI and calls the API directly.
//
// Adding a line here means also updating the constraint:
//   alter table kudos drop constraint kudos_note_code_check;
//   alter table kudos add constraint kudos_note_code_check
//     check (note_code is null or note_code in ( ...codes... ));

export const KUDOS_EMOJI = ["👏", "🔥", "💪", "🙌", "⚡", "👊"];

export const KUDOS_NOTES = [
  { code: "consistent", text: "You keep showing up. That is the whole thing." },
  { code: "strong_week", text: "Strong week. It did not go unnoticed." },
  { code: "inspiring", text: "You have got me training harder." },
  { code: "keep_going", text: "Keep going, you are onto something." },
  { code: "welcome", text: "Good to see you on the board." },
  { code: "comeback", text: "Good to see you back at it." },
  { code: "respect", text: "Respect for the work you are putting in." },
  { code: "big_lift", text: "That is a proper jump. Well done." },
];

const BY_CODE = {};
KUDOS_NOTES.forEach(function (n) { BY_CODE[n.code] = n.text; });

// Unknown or missing codes return null rather than throwing, so an older client or a
// retired line degrades to just the emoji instead of breaking the page.
export function noteText(code) {
  if (!code) return null;
  return BY_CODE[code] || null;
}
