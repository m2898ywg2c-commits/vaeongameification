"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { GOAL_LIST, SESSION_CHOICES } from "@/lib/training";

const EQUIPMENT = [
  { id: "gym", icon: "🏋️", name: "I have a gym", blurb: "Barbells, machines, cables, the lot." },
  { id: "home", icon: "🎒", name: "Some kit at home", blurb: "Dumbbells, bands, a bench, that sort of thing." },
  { id: "none", icon: "🤸", name: "Freestyling it", blurb: "Bodyweight, the park, whatever is to hand." },
];

// 0 = Sunday, matching profiles.train_days
const WEEKDAYS = [
  { n: 1, short: "Mon" },
  { n: 2, short: "Tue" },
  { n: 3, short: "Wed" },
  { n: 4, short: "Thu" },
  { n: 5, short: "Fri" },
  { n: 6, short: "Sat" },
  { n: 0, short: "Sun" },
];

export default function OnboardingPage() {
  const [step, setStep] = useState("goals");
  const [picked, setPicked] = useState([]);
  const [sessions, setSessions] = useState(3);
  const [equipment, setEquipment] = useState("gym");
  const [fixedDays, setFixedDays] = useState(null);
  const [trainDays, setTrainDays] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const router = useRouter();

  const toggle = function (id) {
    if (picked.indexOf(id) !== -1) setPicked(picked.filter(function (g) { return g !== id; }));
    else if (picked.length < 2) setPicked(picked.concat([id]));
  };

  const toggleDay = function (n) {
    if (trainDays.indexOf(n) !== -1) setTrainDays(trainDays.filter(function (d) { return d !== n; }));
    else setTrainDays(trainDays.concat([n]).sort(function (a, b) { return a - b; }));
  };

  const save = async function () {
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const res = await supabase.auth.getUser();
    const user = res.data.user;
    if (!user) { router.push("/login"); return; }
    const { error: e } = await supabase.from("profiles").update({
      goals: picked,
      sessions_per_week: sessions,
      equipment: equipment,
      fixed_days: fixedDays === null ? true : fixedDays,
      train_days: fixedDays ? trainDays : [],
    }).eq("id", user.id);
    setSaving(false);
    if (e) { setError(e.message); return; }
    router.push("/assessment");
    router.refresh();
  };

  const card = function (active) {
    return "w-full text-left px-4 py-4 rounded-2xl border text-sm font-medium " +
      (active ? "border-white bg-white/20" : "border-white/10 bg-white/5");
  };

  const primaryBtn = { background: "linear-gradient(90deg, #2DD4BF, #0F766E)", color: "#0E1224" };
  const dimBtn = { background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.4)" };

  if (step === "equipment") {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center bg-[#0E1224] text-white px-6 py-12">
        <div className="w-full max-w-md">
          <p className="text-xs uppercase tracking-wide text-gray-400 mb-2">Where will you train</p>
          <h1 className="text-3xl font-bold mb-2">What have you got?</h1>
          <p className="text-sm text-gray-300 mb-8">
            No gym is completely fine. We swap every exercise for something you can actually do.
          </p>
          <div className="space-y-3 mb-8">
            {EQUIPMENT.map(function (opt) {
              return (
                <button key={opt.id} onClick={function () { setEquipment(opt.id); }} className={card(equipment === opt.id)}>
                  <span className="flex items-center gap-3">
                    <span className="text-2xl" aria-hidden="true">{opt.icon}</span>
                    <span>
                      <span className="block font-bold">{opt.name}</span>
                      <span className="block text-xs text-gray-400">{opt.blurb}</span>
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
          <div className="flex gap-3">
            <button onClick={function () { setStep("sessions"); }} className="px-6 py-3 rounded-full font-bold text-sm" style={primaryBtn}>Next</button>
            <button onClick={function () { setStep("goals"); }} className="px-6 py-3 rounded-full font-bold text-sm border border-white/20">Back</button>
          </div>
        </div>
      </main>
    );
  }

  if (step === "sessions") {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center bg-[#0E1224] text-white px-6 py-12">
        <div className="w-full max-w-md">
          <p className="text-xs uppercase tracking-wide text-gray-400 mb-2">Be honest with yourself</p>
          <h1 className="text-3xl font-bold mb-2">How many sessions a week?</h1>
          <p className="text-sm text-gray-300 mb-8">
            This is your pledge, and what the leaderboard scores you against. Two you actually do beats five you do not.
          </p>
          <div className="grid grid-cols-5 gap-2 mb-8">
            {SESSION_CHOICES.map(function (n) {
              const on = sessions === n;
              return (
                <button key={n} onClick={function () { setSessions(n); }}
                  className={"py-4 rounded-2xl border text-lg font-bold " + (on ? "border-white bg-white/20" : "border-white/10 bg-white/5")}>
                  {n}
                </button>
              );
            })}
          </div>
          <div className="flex gap-3">
            <button onClick={function () { setStep("days"); }} className="px-6 py-3 rounded-full font-bold text-sm" style={primaryBtn}>Next</button>
            <button onClick={function () { setStep("equipment"); }} className="px-6 py-3 rounded-full font-bold text-sm border border-white/20">Back</button>
          </div>
        </div>
      </main>
    );
  }

  if (step === "days") {
    const needsDays = fixedDays === true && trainDays.length === 0;
    const blocked = fixedDays === null || needsDays;
    const mismatch = fixedDays === true && trainDays.length > 0 && trainDays.length !== sessions;

    return (
      <main className="min-h-screen flex flex-col items-center justify-center bg-[#0E1224] text-white px-6 py-12">
        <div className="w-full max-w-md">
          <p className="text-xs uppercase tracking-wide text-gray-400 mb-2">Last one</p>
          <h1 className="text-3xl font-bold mb-2">Do you train on set days?</h1>
          <p className="text-sm text-gray-300 mb-8">
            Some people like Tuesday to mean Tuesday. Others just want to know what is next.
          </p>
          <div className="space-y-3 mb-8">
            <button onClick={function () { setFixedDays(true); }} className={card(fixedDays === true)}>
              <span className="flex items-center gap-3">
                <span className="text-2xl" aria-hidden="true">&#128197;</span>
                <span>
                  <span className="block font-bold">Yes, give me days</span>
                  <span className="block text-xs text-gray-400">Mon, Tue, Wed and so on</span>
                </span>
              </span>
            </button>
            <button onClick={function () { setFixedDays(false); setTrainDays([]); }} className={card(fixedDays === false)}>
              <span className="flex items-center gap-3">
                <span className="text-2xl" aria-hidden="true">&#128290;</span>
                <span>
                  <span className="block font-bold">No, just number them</span>
                  <span className="block text-xs text-gray-400">Session 1, 2, 3. Do them whenever suits.</span>
                </span>
              </span>
            </button>
          </div>

          {fixedDays === true ? (
            <div className="mb-8">
              <p className="text-xs uppercase tracking-wide text-gray-400 mb-3">Which days?</p>
              <div className="grid grid-cols-4 gap-2">
                {WEEKDAYS.map(function (d) {
                  const on = trainDays.indexOf(d.n) !== -1;
                  return (
                    <button
                      key={d.n}
                      onClick={function () { toggleDay(d.n); }}
                      className={"py-4 rounded-2xl border text-sm font-bold " + (on ? "border-white bg-white/20" : "border-white/10 bg-white/5")}
                    >
                      {d.short}
                    </button>
                  );
                })}
              </div>
              {mismatch ? (
                <p className="text-xs mt-3" style={{ color: "#FFB020" }}>
                  {trainDays.length} day{trainDays.length === 1 ? "" : "s"} picked against a pledge of {sessions}. You can change either later.
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="rounded-2xl border p-4 mb-4" style={{ borderColor: "#2DD4BF55", background: "rgba(45,212,191,0.08)" }}>
            <p className="text-sm font-bold mb-1" style={{ color: "#2DD4BF" }}>Next: find your training type</p>
            <p className="text-xs text-gray-300">
              A quick two-minute quiz. To build you the best training experience we can, we need to understand how you tick: what actually drives you, how you like to train, and when your body is at its best. That is what finding your type means.
            </p>
          </div>

          {error ? <p className="text-sm text-red-400 mb-3">{error}</p> : null}
          <div className="flex gap-3">
            <button onClick={save} disabled={saving || blocked}
              className="px-6 py-3 rounded-full font-bold text-sm"
              style={blocked ? dimBtn : primaryBtn}>
              {saving ? "Saving..." : needsDays ? "Pick your days" : "Find my type"}
            </button>
            <button onClick={function () { setStep("sessions"); }} className="px-6 py-3 rounded-full font-bold text-sm border border-white/20">Back</button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-[#0E1224] text-white px-6 py-12">
      <div className="w-full max-w-lg">
        <a href="/dashboard" className="inline-block text-xs text-gray-400 underline mb-4">Back to dashboard</a>
        <p className="text-xs uppercase tracking-wide text-gray-400 mb-2">What is this really for</p>
        <h1 className="text-3xl font-bold mb-2">Pick up to two.</h1>
        <p className="text-sm text-gray-300 mb-8">Your goals decide the sessions Vaeon builds for you.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
          {GOAL_LIST.map(function (g) {
            const active = picked.indexOf(g.id) !== -1;
            const full = picked.length >= 2 && !active;
            return (
              <button key={g.id} onClick={function () { toggle(g.id); }}
                className={"text-left px-4 py-3 rounded-xl border text-sm font-medium " +
                  (active ? "border-white bg-white/20" : full ? "border-white/5 bg-white/5 opacity-40" : "border-white/10 bg-white/5")}>
                {g.name}
              </button>
            );
          })}
        </div>
        <button onClick={function () { if (picked.length) setStep("equipment"); }} disabled={picked.length === 0}
          className="w-full px-6 py-4 rounded-full font-bold text-sm"
          style={picked.length ? primaryBtn : dimBtn}>
          {picked.length ? "Continue" : "Pick at least one"}
        </button>
      </div>
    </main>
  );
}
