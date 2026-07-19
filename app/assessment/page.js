"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ANSWERS, QUESTIONS, TYPES, scoreAnswers } from "@/lib/personality";

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
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  const answer = async (value) => {
    const next = values.slice();
    next[index] = value;
    setValues(next);
    if (index + 1 < QUESTIONS.length) {
      setIndex(index + 1);
      return;
    }
    const scored = scoreAnswers(next);
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
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
    setSaving(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setResult(scored);
    setStage("result");
  };

  const back = () => {
    if (index > 0) setIndex(index - 1);
    else setStage("intro");
  };

  if (stage === "quiz") {
    const q = QUESTIONS[index];
    const pct = Math.round((index / QUESTIONS.length) * 100);
    return (
      <main className="min-h-screen flex flex-col items-center justify-center bg-[#0E1224] text-white px-6 py-12">
        <div className="w-full max-w-md">
          <p className="text-xs uppercase tracking-wide text-gray-400 mb-2">
            Statement {index + 1} of {QUESTIONS.length}
          </p>
          <div className="h-1.5 rounded-full bg-white/10 mb-8">
            <div
              className="h-1.5 rounded-full"
              style={{ width: pct + "%", background: "linear-gradient(90deg, #4CC9F0, #FF6B57)" }}
            />
          </div>
          <h1 className="text-xl font-bold mb-8 min-h-16">{q.text}</h1>
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
          <div className="rounded-xl border border-white/10 bg-white/5 p-5 text-left mb-8">
            <p className="text-xs uppercase tracking-wide text-gray-400 mb-1">How you will be coached</p>
            <p className="text-sm">{t.coaching}</p>
          </div>

          <div className="flex gap-3 justify-center">
            <a
              href="/dashboard"
              className="px-6 py-2.5 rounded-full font-bold text-sm"
              style={{ background: "linear-gradient(90deg, #4CC9F0, #FF6B57)", color: "#0E1224" }}
            >
              Go to dashboard
            </a>
            <button
              onClick={() => {
                setValues([]);
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
          Twelve quick statements, about two minutes. There are no right or wrong answers, so go
          with your first instinct. Your answers place you on three dials: how planned you like
          training to be, whether numbers or feelings drive you, and whether you thrive solo or
          with others. The combination reveals one of eight training personalities.
        </p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {Object.keys(TYPES).map((id) => {
            const t = TYPES[id];
            return (
              <div
                key={id}
                className="rounded-xl border border-white/10 bg-white/5 p-4 flex flex-col items-center text-center"
              >
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
            Your type decides the shape of the plan Vaeon builds for you. Planned types get a
            structured programme with fixed sessions; freestyle types get a flexible menu and
            rolling challenges.
          </p>
          <p className="text-sm text-gray-200 mb-3">
            It also decides what success looks like. Outcome types chase numbers, personal bests
            and streaks; experience types build habits measured by consistency and how sessions
            feel.
          </p>
          <p className="text-sm text-gray-200">
            Most of all, it sets your coaching voice. Solo types get sharp, private check-ins;
            together types get group energy, shared goals and friendly competition. Same goal,
            very different journey.
          </p>
        </div>

        <div className="text-center">
          <button
            onClick={() => setStage("quiz")}
            className="px-8 py-3 rounded-full font-bold text-sm"
            style={{ background: "linear-gradient(90deg, #4CC9F0, #FF6B57)", color: "#0E1224" }}
          >
            Start the assessment
          </button>
          <p className="text-xs text-gray-500 mt-3">You can retake it any time from your dashboard.</p>
        </div>
      </div>
    </main>
  );
}

