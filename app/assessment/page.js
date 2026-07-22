"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  ANSWERS,
  QUESTIONS,
  FRAMING_QUESTIONS,
  CHRONOTYPE_PROMPT,
  CHRONOTYPE_OPTIONS,
  TYPES,
  scoreAnswers,
  scoreFraming,
} from "@/lib/personality";
import {
  FRAMING_LABEL,
  FRAMING_EXPLAINER,
  CHRONOTYPE_LABEL,
  CHRONOTYPE_TIP,
} from "@/lib/framing";

const GRAD = "linear-gradient(90deg, #2DD4BF, #0F766E)";

function Orb({ type, size }) {
  const s = size || 96;
  const gid = "orb-" + type.letter;
  return (
    <svg width={s} height={s} viewBox="0 0 100 100" aria-hidden="true">
      <defs>
        <radialGradient id={gid} cx="35%" cy="28%" r="80%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="16%" stopColor={type.colors[0]} />
          <stop offset="100%" stopColor={type.colors[1]} />
        </radialGradient>
      </defs>
      <ellipse cx="50" cy="90" rx="28" ry="6" fill="#000000" opacity="0.4" />
      <circle cx="50" cy="47" r="38" fill={"url(#" + gid + ")"} />
      <ellipse cx="37" cy="29" rx="13" ry="7" fill="#ffffff" opacity="0.35" transform="rotate(-25 37 29)" />
      <text x="50" y="58" textAnchor="middle" fontSize="30" fontWeight="700" fill="#ffffff" opacity="0.92">
        {type.letter}
      </text>
    </svg>
  );
}

export default function AssessmentPage() {
  const [stage, setStage] = useState("intro");
  const [index, setIndex] = useState(0);
  const [values, setValues] = useState([]);
  const [chrono, setChrono] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  const TYPE_N = QUESTIONS.length;
  const FRAMING_N = FRAMING_QUESTIONS.length;
  const LIKERT_N = TYPE_N + FRAMING_N;
  const TOTAL = LIKERT_N + 1; // final step is the chronotype choice

  const finalise = async (vals, chronoValue) => {
    const scored = scoreAnswers(vals.slice(0, TYPE_N));
    const framed = scoreFraming(vals.slice(TYPE_N, LIKERT_N));
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }
    const { error: insertError } = await supabase.from("assessment_results").insert({
      user_id: user.id,
      type_id: scored.typeId,
      structure_score: scored.structure,
      orientation_score: scored.orientation,
      social_score: scored.social,
      goals: [],
    });
    if (insertError) {
      setSaving(false);
      setError(insertError.message);
      return;
    }
    // Framing and chronotype live on the profile, not the assessment row, so the coach
    // and any future reminder timing can read the latest without a join.
    const { error: profileError } = await supabase.from("profiles").update({
      framing: framed.framing,
      framing_score: framed.score,
      chronotype: chronoValue,
    }).eq("id", user.id);
    setSaving(false);
    if (profileError) {
      setError(profileError.message);
      return;
    }
    setResult({ scored: scored, framed: framed, chrono: chronoValue });
    setStage("result");
  };

  const answer = (value) => {
    const next = values.slice();
    next[index] = value;
    setValues(next);
    setIndex(index + 1); // Likert steps always advance; the chronotype step ends the survey
  };

  const chooseChrono = (value) => {
    setChrono(value);
    finalise(values, value);
  };

  const back = () => {
    if (index > 0) setIndex(index - 1);
    else setStage("intro");
  };

  if (stage === "quiz") {
    const onChrono = index >= LIKERT_N;
    const pct = Math.round((index / TOTAL) * 100);
    const section = index < TYPE_N ? "How you like to train"
      : index < LIKERT_N ? "What drives you"
      : "When you are at your best";

    return (
      <main className="min-h-screen flex flex-col items-center justify-center bg-[#0E1224] text-white px-6 py-12">
        <div className="w-full max-w-md">
          <p className="text-xs uppercase tracking-wide text-gray-400 mb-1">{section}</p>
          <p className="text-xs text-gray-500 mb-2">Step {index + 1} of {TOTAL}</p>
          <div className="h-1.5 rounded-full bg-white/10 mb-8">
            <div className="h-1.5 rounded-full" style={{ width: pct + "%", background: GRAD }} />
          </div>

          {onChrono ? (
            <div>
              <h1 className="text-xl font-bold mb-2 min-h-8">{CHRONOTYPE_PROMPT}</h1>
              <p className="text-sm text-gray-400 mb-6">
                Your body clock changes when you perform best and how hard a session costs you. No wrong answer.
              </p>
              <div className="space-y-2">
                {CHRONOTYPE_OPTIONS.map((o) => (
                  <button
                    key={o.value}
                    onClick={() => chooseChrono(o.value)}
                    disabled={saving}
                    className="w-full text-left px-4 py-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/15"
                  >
                    <span className="block text-sm font-bold">{o.label}</span>
                    <span className="block text-xs text-gray-400 mt-0.5">{o.blurb}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <h1 className="text-xl font-bold mb-8 min-h-16">
                {index < TYPE_N ? QUESTIONS[index].text : FRAMING_QUESTIONS[index - TYPE_N].text}
              </h1>
              <div className="space-y-2">
                {ANSWERS.map((a) => (
                  <button
                    key={a.value}
                    onClick={() => answer(a.value)}
                    disabled={saving}
                    className="w-full text-left px-4 py-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/15 text-sm font-medium"
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {saving ? <p className="text-sm text-gray-400 mt-4">Saving your result...</p> : null}
          {error ? <p className="text-sm text-red-400 mt-4">{error}</p> : null}
          <button onClick={back} className="text-xs text-gray-500 underline mt-6" disabled={saving}>
            Back
          </button>
        </div>
      </main>
    );
  }

  if (stage === "result" && result) {
    const t = TYPES[result.typeId];
    const framing = result.framed.framing;
    const chronoValue = result.chrono;
    return (
      <main className="min-h-screen flex flex-col items-center justify-center bg-[#0E1224] text-white px-6 py-12">
        <div className="w-full max-w-md text-center">
          <div className="flex justify-center mb-2">
            <Orb type={t} size={140} />
          </div>
          <p className="text-xs uppercase tracking-wide text-gray-400 mb-1">{t.code}</p>
          <h1 className="text-3xl font-bold mb-2">{t.name}</h1>
          <p className="text-sm text-gray-300 mb-8">{t.tagline}</p>

          <div className="rounded-xl border border-white/10 bg-white/5 p-5 text-left mb-4">
            <p className="text-xs uppercase tracking-wide text-gray-400 mb-1">Your training plan</p>
            <p className="text-sm">{t.plan}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-5 text-left mb-4">
            <p className="text-xs uppercase tracking-wide text-gray-400 mb-1">How you will be coached</p>
            <p className="text-sm">{t.coaching}</p>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-5 text-left mb-8">
            <p className="text-xs uppercase tracking-wide text-gray-400 mb-2">What else we learned</p>
            <p className="text-sm mb-2">
              You are <span className="font-bold">{FRAMING_LABEL[framing]}</span>, {FRAMING_EXPLAINER[framing]}
            </p>
            <p className="text-sm">
              At your best <span className="font-bold">{CHRONOTYPE_LABEL[chronoValue]}</span>. {CHRONOTYPE_TIP[chronoValue]}
            </p>
          </div>

          <div className="flex gap-3 justify-center">
            <a href="/dashboard" className="px-6 py-2.5 rounded-full font-bold text-sm" style={{ background: GRAD, color: "#0E1224" }}>
              Go to dashboard
            </a>
            <button
              onClick={() => {
                setValues([]);
                setChrono(null);
                setResult(null);
                setIndex(0);
                setStage("quiz");
              }}
              className="px-6 py-2.5 rounded-full font-bold text-sm border border-white/20"
            >
              Retake
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0E1224] text-white px-6 py-12">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-2 text-center">Find your training personality</h1>
        <p className="text-sm text-gray-300 text-center max-w-xl mx-auto mb-10">
          Seventeen quick questions, about three minutes. Go with your first instinct. Twelve
          statements place you on three dials: how planned you like training, whether numbers or
          feelings drive you, and whether you thrive solo or with others. A few more read what
          switches your motivation on, and when your body is at its best. The result is one of
          eight training personalities, tuned to you.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {Object.keys(TYPES).map((id) => {
            const t = TYPES[id];
            return (
              <div key={id} className="rounded-xl border border-white/10 bg-white/5 p-4 flex flex-col items-center text-center">
                <Orb type={t} size={84} />
                <p className="font-bold text-sm mt-2">{t.name}</p>
                <p className="text-[10px] uppercase tracking-wide text-gray-400 mt-1">{t.code}</p>
                <p className="text-xs text-gray-300 mt-2">{t.tagline}</p>
              </div>
            );
          })}
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 p-5 max-w-xl mx-auto mb-10">
          <p className="text-xs uppercase tracking-wide text-gray-400 mb-2">Why it matters</p>
          <p className="text-sm text-gray-200 mb-3">
            Your type decides the shape of the plan Vaeon builds. Planned types get a structured
            programme with fixed sessions; freestyle types get a flexible menu and rolling challenges.
          </p>
          <p className="text-sm text-gray-200 mb-3">
            It also decides what success looks like, and sets your coaching voice. Solo types get
            sharp, private check-ins; together types get group energy and friendly competition.
          </p>
          <p className="text-sm text-gray-200">
            The last few questions add a personal edge on top: whether your coach frames things
            around chasing a gain or protecting your momentum, and when in the day you train best.
          </p>
        </div>

        <div className="text-center">
          <button
            onClick={() => setStage("quiz")}
            className="px-8 py-3 rounded-full font-bold text-sm"
            style={{ background: GRAD, color: "#0E1224" }}
          >
            Start the assessment
          </button>
          <p className="text-xs text-gray-500 mt-3">You can retake it any time from your dashboard.</p>
        </div>
      </div>
    </main>
  );
}
