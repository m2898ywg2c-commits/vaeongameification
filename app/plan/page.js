"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { buildWeek, goalNames, defaultSessionType, primaryCategory } from "@/lib/training";
import { weeksFor, currentWeek, workingWeight, increaseHint, BLOCK_WEEKS } from "@/lib/progression";

export default function PlanPage() {
  const [profile, setProfile] = useState(null);
  const [week, setWeek] = useState([]);
  const [active, setActive] = useState(0);
  const [showWarmup, setShowWarmup] = useState(true);
  const [entries, setEntries] = useState({});
  const [saved, setSaved] = useState({});
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState("");
  const [done, setDone] = useState(false);
  const router = useRouter();

  useEffect(function () {
    const supabase = createClient();
    supabase.auth.getUser().then(function (res) {
      const user = res.data.user;
      if (!user) { router.push("/login"); return; }
      setUserId(user.id);
      supabase.from("profiles").select("*").eq("id", user.id).single().then(function (r) {
        const p = r.data;
        setProfile(p);
        if (!p || !p.goals || p.goals.length === 0) { router.push("/onboarding"); return; }
        setWeek(buildWeek(p.goals, p.sessions_per_week));
        setLoading(false);
      });
    });
  }, [router]);

  const key = function (exName, i) { return exName + "::" + i; };

  const setField = function (exName, i, field, value) {
    const k = key(exName, i);
    const cur = entries[k] || {};
    const next = Object.assign({}, cur);
    next[field] = value;
    const all = Object.assign({}, entries);
    all[k] = next;
    setEntries(all);
  };

  const saveSet = async function (exName, i) {
    if (!userId) return;
    const k = key(exName, i);
    const val = entries[k] || {};
    const supabase = createClient();
    const { error } = await supabase.from("exercise_logs").insert({
      user_id: userId,
      day_key: week[active].key,
      exercise: exName,
      set_index: i + 1,
      weight: val.weight ? Number(val.weight) : null,
      reps: val.reps ? Number(val.reps) : null,
      time_text: val.time || null,
    });
    if (!error) {
      const s = Object.assign({}, saved);
      s[k] = true;
      setSaved(s);
    }
  };

  const finishSession = async function () {
    if (!userId || !week[active]) return;
    const supabase = createClient();
    const day = week[active];
    await supabase.from("training_sessions").insert({
      user_id: userId,
      session_type: defaultSessionType(profile.goals, day.key),
      duration_min: 45,
      effort: 4,
      note: note || day.title,
    });
    setDone(true);
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[#0E1224] text-white px-6 py-12">
        <p className="text-sm text-gray-400 max-w-md mx-auto">Loading your plan...</p>
      </main>
    );
  }

  const day = week[active];
  const names = goalNames(profile.goals);
  const category = primaryCategory(profile.goals);
  const weekNo = currentWeek(profile.block_start);
  const weekRules = weeksFor(category);
  const rule = weekRules[weekNo - 1] || weekRules[0];
  const hasBaselines = profile.baseline_bench || profile.baseline_squat;

  return (
    <main className="min-h-screen bg-[#0E1224] text-white px-6 py-10">
      <div className="max-w-md mx-auto">
        <a href="/dashboard" className="text-xs text-gray-400 underline">Back to dashboard</a>
        <h1 className="text-2xl font-bold mt-4 mb-1">Your plan this week</h1>
        <p className="text-sm text-gray-400 mb-1">{names.join(" + ")}</p>
        <p className="text-xs text-gray-500 mb-5">{profile.sessions_per_week} sessions a week</p>

        <div className="rounded-xl border border-white/10 bg-white/5 p-5 mb-5">
          <div className="flex items-baseline justify-between mb-2">
            <p className="text-lg font-bold">
              Week {weekNo} of {BLOCK_WEEKS}
            </p>
            <span
              className="text-xs font-bold px-3 py-1 rounded-full"
              style={{ background: "linear-gradient(90deg, #4CC9F0, #FF6B57)", color: "#0E1224" }}
            >
              {rule.label}
            </span>
          </div>
          <p className="text-sm text-gray-200 mb-3">{rule.focus}</p>
          <p className="text-xs uppercase tracking-wide text-gray-400 mb-1">This week is increases</p>
          <p className="text-sm text-gray-300">{rule.increase}</p>
          {!profile.block_start ? (
            <p className="text-xs text-amber-400 mt-3">
              No block start date set, so this defaults to week 1.{" "}
              <a href="/settings" className="underline">Set it in Settings</a>.
            </p>
          ) : null}
        </div>

        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {week.map(function (dd, i) {
            const on = i === active;
            return (
              <button
                key={dd.key}
                onClick={function () { setActive(i); setDone(false); }}
                className={
                  "px-4 py-2 rounded-xl text-xs font-bold border whitespace-nowrap " +
                  (on ? "border-white bg-white/20" : "border-white/10 bg-white/5")
                }
              >
                {dd.dayLabel}
              </button>
            );
          })}
        </div>

        <h2 className="text-lg font-bold mb-1">{day.title}</h2>
        <p className="text-xs uppercase tracking-wide text-gray-400 mb-5">{day.focus}</p>

        <div className="rounded-xl border border-white/10 bg-white/5 p-4 mb-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs uppercase tracking-wide text-gray-400">Warm-up, 5-6 min</p>
            <button onClick={function () { setShowWarmup(!showWarmup); }} className="text-xs underline text-gray-400">
              {showWarmup ? "hide" : "show"}
            </button>
          </div>
          {showWarmup ? (
            <ol className="text-sm space-y-1 list-decimal list-inside text-gray-200">
              {day.warmup.map(function (wu, i) { return <li key={i}>{wu}</li>; })}
            </ol>
          ) : null}
        </div>

        <div className="space-y-4 mb-6">
          {day.exercises.map(function (ex) {
            const target = category === "endurance" ? null : workingWeight(ex.name, profile, rule.pct);
            return (
              <div key={ex.name} className="rounded-xl border border-white/10 bg-white/5 p-4">
                <p className="font-bold text-sm">{ex.name}</p>
                <p className="text-xs text-gray-400 mb-1">{ex.sets} sets x {ex.reps}</p>
                {target ? (
                  <p className="text-sm mb-1">
                    <span className="text-emerald-400 font-bold">Work at {target}kg</span>
                    <span className="text-gray-500"> ({Math.round(rule.pct * 100)}% of baseline)</span>
                  </p>
                ) : null}
                {ex.note ? <p className="text-xs text-gray-500 mb-1">{ex.note}</p> : null}
                {category !== "endurance" ? (
                  <p className="text-xs text-gray-500 mb-3">{increaseHint(ex.name)}</p>
                ) : null}
                <div className="space-y-2">
                  {Array.from({ length: ex.sets }).map(function (_, i) {
                    const k = key(ex.name, i);
                    const v = entries[k] || {};
                    return (
                      <div key={i} className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 w-10">Set {i + 1}</span>
                        <input
                          value={v.weight || ""}
                          onChange={function (e) { setField(ex.name, i, "weight", e.target.value); }}
                          placeholder={target ? String(target) : "kg"}
                          inputMode="decimal"
                          className="w-16 px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-sm placeholder-gray-600"
                        />
                        <input
                          value={v.reps || ""}
                          onChange={function (e) { setField(ex.name, i, "reps", e.target.value); }}
                          placeholder="reps"
                          inputMode="numeric"
                          className="w-16 px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-sm placeholder-gray-600"
                        />
                        <button
                          onClick={function () { saveSet(ex.name, i); }}
                          className="text-xs px-3 py-1.5 rounded-lg border border-white/15 bg-white/5"
                        >
                          {saved[k] ? "Saved" : "Save"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {!hasBaselines && category !== "endurance" ? (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 mb-6">
            <p className="text-sm text-amber-200">
              Set your bench and squat baselines in{" "}
              <a href="/settings" className="underline font-bold">Settings</a>{" "}
              and Vaeon will tell you exactly what to load each week.
            </p>
          </div>
        ) : null}

        {day.conditioning && day.conditioning.length ? (
          <div className="mb-6">
            <p className="text-xs uppercase tracking-wide text-gray-400 mb-3">Conditioning stations</p>
            <div className="space-y-3">
              {day.conditioning.map(function (st) {
                const k = key(st.name, 0);
                const v = entries[k] || {};
                return (
                  <div key={st.name} className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <p className="font-bold text-sm">{st.name}</p>
                    <p className="text-xs text-gray-400 mb-1">{st.target}</p>
                    <p className="text-xs text-gray-500 mb-3">{st.note}</p>
                    <div className="flex items-center gap-2">
                      <input
                        value={v.time || ""}
                        onChange={function (e) { setField(st.name, 0, "time", e.target.value); }}
                        placeholder="mm:ss"
                        className="w-24 px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-sm placeholder-gray-600"
                      />
                      <button
                        onClick={function () { saveSet(st.name, 0); }}
                        className="text-xs px-3 py-1.5 rounded-lg border border-white/15 bg-white/5"
                      >
                        {saved[k] ? "Saved" : "Save"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        <div className="rounded-xl border border-white/10 bg-white/5 p-4 mb-6">
          <p className="text-xs uppercase tracking-wide text-gray-400 mb-2">Notes for today</p>
          <textarea
            value={note}
            onChange={function (e) { setNote(e.target.value); }}
            placeholder="How did it feel, anything that niggled"
            rows={3}
            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm placeholder-gray-600"
          />
        </div>

        <button
          onClick={finishSession}
          className="w-full px-6 py-3 rounded-full font-bold text-sm mb-2"
          style={{ background: "linear-gradient(90deg, #4CC9F0, #FF6B57)", color: "#0E1224" }}
        >
          {done ? "Session logged" : "Finish and log this session"}
        </button>
        {done ? <p className="text-sm text-emerald-400 text-center">Logged. That counts towards your week.</p> : null}

        <p className="text-center mt-6">
          <a href="/fallback" className="text-xs text-gray-400 underline">Cannot get to the gym today?</a>
        </p>
      </div>
    </main>
  );
}
