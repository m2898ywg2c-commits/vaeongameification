"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { GOAL_LIST, SESSION_CHOICES } from "@/lib/training";

export default function OnboardingPage() {
  const [step, setStep] = useState("goals");
  const [picked, setPicked] = useState([]);
  const [sessions, setSessions] = useState(3);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const router = useRouter();

  const toggle = function (id) {
    if (picked.indexOf(id) !== -1) {
      setPicked(picked.filter(function (g) { return g !== id; }));
    } else if (picked.length < 2) {
      setPicked(picked.concat([id]));
    }
  };

  const save = async function () {
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const res = await supabase.auth.getUser();
    const user = res.data.user;
    if (!user) {
      router.push("/login");
      return;
    }
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ goals: picked, sessions_per_week: sessions })
      .eq("id", user.id);
    setSaving(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    router.push("/assessment");
    router.refresh();
  };

  if (step === "sessions") {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center bg-[#0E1224] text-white px-6 py-12">
        <div className="w-full max-w-md">
          <p className="text-xs uppercase tracking-wide text-gray-400 mb-2">Be honest with yourself</p>
          <h1 className="text-3xl font-bold mb-2">How many sessions a week?</h1>
          <p className="text-sm text-gray-300 mb-8">
            This is what you are pledging, and what the leaderboard scores you against. Two
            sessions you actually do beats five you do not.
          </p>
          <div className="space-y-2 mb-8">
            {SESSION_CHOICES.map(function (n) {
              const active = sessions === n;
              return (
                <button
                  key={n}
                  onClick={function () { setSessions(n); }}
                  className={
                    "w-full text-left px-4 py-3 rounded-xl border text-sm font-medium " +
                    (active ? "border-white bg-white/20" : "border-white/10 bg-white/5")
                  }
                >
                  {n} sessions a week
                </button>
              );
            })}
          </div>
          {error ? <p className="text-sm text-red-400 mb-3">{error}</p> : null}
          <div className="flex gap-3">
            <button
              onClick={save}
              disabled={saving}
              className="px-6 py-2.5 rounded-full font-bold text-sm"
              style={{ background: "linear-gradient(90deg, #4CC9F0, #FF6B57)", color: "#0E1224" }}
            >
              {saving ? "Saving..." : "Next, find my type"}
            </button>
            <button
              onClick={function () { setStep("goals"); }}
              className="px-6 py-2.5 rounded-full font-bold text-sm border border-white/20"
            >
              Back
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-[#0E1224] text-white px-6 py-12">
      <div className="w-full max-w-lg">
        <p className="text-xs uppercase tracking-wide text-gray-400 mb-2">What is this really for</p>
        <h1 className="text-3xl font-bold mb-2">Pick up to two.</h1>
        <p className="text-sm text-gray-300 mb-8">
          Your goals decide the sessions Vaeon builds for you. Pick one to keep it focused, or two
          if you are chasing a combination.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
          {GOAL_LIST.map(function (g) {
            const active = picked.indexOf(g.id) !== -1;
            const full = picked.length >= 2 && !active;
            return (
              <button
                key={g.id}
                onClick={function () { toggle(g.id); }}
                className={
                  "text-left px-4 py-3 rounded-xl border text-sm font-medium " +
                  (active
                    ? "border-white bg-white/20"
                    : full
                    ? "border-white/5 bg-white/5 opacity-40"
                    : "border-white/10 bg-white/5")
                }
              >
                {g.name}
              </button>
            );
          })}
        </div>

        <button
          onClick={function () { if (picked.length) setStep("sessions"); }}
          disabled={picked.length === 0}
          className="w-full px-6 py-3 rounded-full font-bold text-sm"
          style={
            picked.length
              ? { background: "linear-gradient(90deg, #4CC9F0, #FF6B57)", color: "#0E1224" }
              : { background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.4)" }
          }
        >
          {picked.length ? "Continue" : "Pick at least one"}
        </button>
      </div>
    </main>
  );
}

