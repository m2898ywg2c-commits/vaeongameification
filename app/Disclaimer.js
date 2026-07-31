import { BRAND } from "@/lib/brand";

// Training and AI disclaimer.
//
// NOT LEGAL ADVICE AND NOT LEGALLY REVIEWED. Have a solicitor read this before
// launch. One thing worth knowing before anyone edits it toward something
// stronger: under UK law you cannot exclude liability for death or personal
// injury caused by negligence. Unfair Contract Terms Act 1977 s.2(1) and
// Consumer Rights Act 2015 s.65 both make that term void. Wording along the
// lines of "any injury is the user's responsibility, not ours" is therefore
// worse than useless, because it will be struck out and it reads as though we
// were trying it on.
//
// What this copy does instead, which is enforceable and useful:
//   - makes clear Vaeon gives general training guidance, not medical advice
//   - tells people to stop if something hurts and to get checked if unsure
//   - is honest that the guidance is AI-generated and can be wrong
//
// The real protection is insurance, not paragraphs.

// Bump this whenever the wording changes materially. Acceptance is stored
// against the version, so "what exactly did this user agree to, and when" stays
// answerable after the copy has moved on. A bare boolean cannot answer that,
// which is the only question that matters if it is ever asked in anger.
export const DISCLAIMER_VERSION = "2026-07-29";

export const DISCLAIMER_SHORT =
  "Vaeon recommends training. It does not supervise it. Sessions are general " +
  "guidance, not medical advice. Train within your limits, stop if something " +
  "hurts, and speak to a doctor before starting if you have an injury or health " +
  "condition. Vaeon's guidance is AI-generated and can be wrong.";

/**
 * Full disclaimer.
 *
 * @param {boolean} compact Tighter spacing and smaller type, for a settings
 *                          panel rather than a standalone legal page.
 */
export default function Disclaimer({ compact = false }) {
  const body = compact ? "text-xs" : "text-sm";
  const gap = compact ? "space-y-3" : "space-y-5";

  return (
    <div className={body + " " + gap} style={{ color: "rgba(255,255,255,0.72)" }}>
      <div>
        <h2 className="font-display mb-1" style={{ color: BRAND.text }}>
          Before you train
        </h2>
        <p>
          Vaeon recommends training. It does not supervise it. Everything you see here is
          general guidance built from what you tell us and what you log. It is not medical
          advice, physiotherapy, or a substitute for a qualified coach watching you lift.
        </p>
      </div>

      <div>
        <h2 className="font-display mb-1" style={{ color: BRAND.text }}>
          Train within your limits
        </h2>
        <p>
          Only you know how you feel on the day. Warm up properly, use a weight you can
          control with good technique, and stop if something hurts. Pain is information,
          not weakness. If a session looks wrong for you, skip it or scale it back. Nothing
          Vaeon suggests is an instruction.
        </p>
      </div>

      <div>
        <h2 className="font-display mb-1" style={{ color: BRAND.text }}>
          Get checked if you are unsure
        </h2>
        <p>
          Speak to your GP or a qualified professional before starting if you have an
          injury, a heart or joint condition, are pregnant or recently postnatal, are
          returning from illness or surgery, or have simply not trained in a long time.
          Do the same if anything unexpected happens while you are training: chest pain,
          dizziness, breathlessness or a joint that gives way all mean stop and get advice.
        </p>
      </div>

      <div>
        <h2 className="font-display mb-1" style={{ color: BRAND.text }}>
          The guidance is AI-generated
        </h2>
        <p>
          Vaeon builds your plan, your coaching and your exercise notes using AI, drawing on
          published training principles. We have put real work into making it sensible and we
          review it, but it can still be wrong, out of date, or a poor fit for your particular
          body. Treat it as a well-informed starting point rather than the last word, and back
          your own judgement over ours when the two disagree.
        </p>
      </div>

      <div>
        <h2 className="font-display mb-1" style={{ color: BRAND.text }}>
          Where you already have a coach
        </h2>
        <p>
          If you are using Gym ready, Vaeon is recording what you do and reporting on it.
          It is not writing your programme and it is not checking your coach's work. Your
          coach remains responsible for what they prescribe.
        </p>
      </div>
    </div>
  );
}
