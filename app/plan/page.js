"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { buildWeek, goalNames, defaultSessionType, primaryCategory } from "@/lib/training";
import { weeksFor, currentWeek, workingWeight, increaseHint, BLOCK_WEEKS } from "@/lib/progression";
import { TYPES } from "@/lib/personality";
import { quoteFor, sessionIntro } from "@/lib/voice";
import TypeOrb from "../TypeOrb";

const DAY_INDEX = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 0 };

function videoLink(name) {
  return "https://www.youtube.com/results?search_query=" + encodeURIComponent(name + " proper form technique");
}

export default function PlanPage() {
  const [profile, setProfile] = useState(null);
  const [week, setWeek] = useState([]);
  const [active, setActive] = useState(0);
  const [showWarmup, setShowWarmup] = useState(false);
  const [entries, setEntries] = useState({});
  const [saved, setSaved] = useState({});
  const [openTip, setOpenTip] = useState({});
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState("");
  const [done, setDone] = useState(false);
  const [typeId, setTypeId] = useState(null);
  const [showQuote, setShowQuote] = useState(true);
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
        const w = buildWeek(p.goals, p.sessions_per_week);
        setWeek(w);
        const todayIdx = new Date().getDay();
        let best = 0;
        for (let i = 0; i < w.length; i++) {
          if (DAY_INDEX[w[i].dayLabel] === todayIdx) { best = i; break; }
        }
        setActive(best);
        setLoading(false);
      });
      supabase.from("assessment_results").select("type_id").eq("user_id", user.id)
        .order("completed_at", { ascending: false }).limit(1).maybeSingle()
        .then(function (r) { if (r.data) setTypeId(r.data.type_id); });
    });
  }, [router]);

  const key = function (n, i) { return n + "::" + i; };

  const setField = function (n, i, field, value) {
    const k = key(n, i);
    const next = Object.assign({}, entries[k] || {});
    next[field] = value;
    const all = Object.assign({}, entries);
    all[k] = next;
    setEntries(all);
  };

  const saveSet = async function (n, i) {
    if (!userId) return;
    const k = key(n, i);
    const val = entries[k] || {};
    const supabase = createClient();
    const { error } = await supabase.from("exercise_logs").insert({
      user_id: userId,
      day_key: week[active].key,
      exercise: n,
      set_index: i + 1,
      weight: val.weight ? Number(val.weight) : null,
      reps: val.reps ? Number(val.reps) : null,
      time_text: val.time || null,
    });
    if (!error) { const s = Object.assign({}, saved); s[k] = true; setSaved(s); }
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
      <main className="min-h-screen bg-[#0E1224] text-white px-5 py-10">
        <p className="text-sm text-gray-400 max-w-md mx-auto">Loading...</p>
      </main>
    );
  }

  const day = week[active];
  const category = primaryCategory(profile.goals);
  const weekNo = currentWeek(profile.block_start);
  const rule = weeksFor(category)[weekNo - 1] || weeksFor(category)[0];
  const type = typeId ? TYPES[typeId] : null;
  const accent = type ? type.colors[0] : "#4CC9F0";
  const quote = quoteFor(typeId, active);
  const intro = sessionIntro(typeId, rule.label);
  const isToday = DAY_INDEX[day.dayLabel] === new Date().getDay();

  return (
    <main className="min-h-screen bg-[#0E1224] text-white px-5 py-8">

      {showQuote && type ? (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 60,
            background: "rgba(6,9,20,0.92)",
            display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
          }}
        >
          <div
            className="rounded-3xl p-7 max-w-sm w-full text-center border"
            style={{ borderColor: accent + "66", background: "#141A31" }}
          >
            <div className="flex justify-center mb-4"><TypeOrb typeId={typeId} size={72} /></div>
            <p className="text-[10px] uppercase tracking-widest mb-4" style={{ color: accent }}>
              {type.name}
            </p>
            <p className="text-lg font-bold leading-snug mb-5">{quote}</p>
            <button
              onClick={function () { setShowQuote(false); }}
              className="w-full py-3 rounded-full font-bold text-sm"
              style={{ background: "linear-gradient(90deg, #4CC9F0, #FF6B57)", color: "#0E1224" }}
            >
              Ready
            </button>
          </div>
        </div>
      ) : null}

      <div className="max-w-md mx-auto">
        <a href="/dashboard" className="text-xs text-gray-400 underline">Back</a>

        {type ? (
          <div className="flex items-center gap-3 mt-4 mb-4">
            <TypeOrb typeId={typeId} size={40} />
            <div>
              <p className="text-xs" style={{ color: accent }}>{type.name}</p>
              <p className="text-sm text-gray-300 leading-tight">{intro}</p>
            </div>
          </div>
        ) : null}

        <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
          {week.map(function (dd, i) {
            const on = i === active;
            const t = DAY_INDEX[dd.dayLabel] === new Date().getDay();
            return (
              <button
                key={dd.key}
                onClick={function () { setActive(i); setDone(false); }}
                className="px-4 py-2 rounded-xl text-xs font-bold border whitespace-nowrap"
                style={{
                  borderColor: on ? accent : "rgba(255,255,255,0.1)",
                  background: on ? accent + "22" : "rgba(255,255,255,0.05)",
                  color: on ? accent : t ? "#fff" : "rgba(255,255,255,0.75)",
                }}
              >
                {dd.dayLabel}{t ? " •" : ""}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 mb-1">
          {isToday ? (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: accent, color: "#0E1224" }}>
              TODAY
            </span>
          ) : null}
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "#ffffff18", color: "#cbd2e0" }}>
            WEEK {weekNo}/{BLOCK_WEEKS} · {rule.label.toUpperCase()}
          </span>
        </div>
        <h1 className="text-2xl font-bold mb-4">{day.title}</h1>

        <button
          onClick={function () { setShowWarmup(!showWarmup); }}
          className="w-full flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 mb-3"
        >
          <span className="text-xl" aria-hidden="true">🔥</span>
          <span className="text-sm font-bold flex-1 text-left">Warm-up · 5 min</span>
          <span className="text-xs text-gray-400">{showWarmup ? "hide" : "show"}</span>
        </button>
        {showWarmup ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 mb-3">
            <ol className="text-sm space-y-1 list-decimal list-inside text-gray-200">
              {day.warmup.map(function (w, i) { return <li key={i}>{w}</li>; })}
            </ol>
          </div>
        ) : null}

        <div className="space-y-3 mb-5">
          {day.exercises.map(function (ex) {
            const target = category === "endurance" ? null : workingWeight(ex.name, profile, rule.pct);
            const tipKey = ex.name;
            const open = openTip[tipKey];
            return (
              <div key={ex.name} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="font-bold text-sm flex-1">{ex.name}</p>
                  <a
                    href={videoLink(ex.name)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-lg"
                    title="Watch form videos"
                    aria-label={"Watch form videos for " + ex.name}
                  >
                    ▶️
                  </a>
                </div>
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: "#ffffff14", color: "#cbd2e0" }}>
                    {ex.sets} x {ex.reps}
                  </span>
                  {target ? (
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: "#3DDC9733", color: "#3DDC97" }}>
                      {target}kg
                    </span>
                  ) : null}
                  {category !== "endurance" ? (
                    <span className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: "#4CC9F022", color: "#4CC9F0" }}>
                      {increaseHint(ex.name)}
                    </span>
                  ) : null}
                </div>

                <div className="flex gap-2 mb-3">
                  <button
                    onClick={function () { const o = Object.assign({}, openTip); o[tipKey] = open === "form" ? null : "form"; setOpenTip(o); }}
                    className="text-[11px] px-3 py-1 rounded-full border border-white/15"
                  >
                    Form
                  </button>
                  <button
                    onClick={function () { const o = Object.assign({}, openTip); o[tipKey] = open === "coach" ? null : "coach"; setOpenTip(o); }}
                    className="text-[11px] px-3 py-1 rounded-full border border-white/15"
                  >
                    Coach
                  </button>
                </div>
                {open === "form" ? (
                  <p className="text-xs text-gray-300 mb-3 border-l-2 pl-3" style={{ borderColor: "#4CC9F0" }}>
                    {ex.form || ex.note || "Control the weight, full range, no bouncing."}
                  </p>
                ) : null}
                {open === "coach" ? (
                  <p className="text-xs mb-3 border-l-2 pl-3" style={{ borderColor: accent, color: "#e3e7f0" }}>
                    {ex.coach || ex.note || "Leave one or two reps in the tank on every set."}
                  </p>
                ) : null}

                <div className="space-y-2">
                  {Array.from({ length: ex.sets }).map(function (_, i) {
                    const k = key(ex.name, i);
                    const v = entries[k] || {};
                    return (
                      <div key={i} className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 w-8">{i + 1}</span>
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
                          className="text-xs px-3 py-1.5 rounded-lg border"
                          style={{
                            borderColor: saved[k] ? "#3DDC97" : "rgba(255,255,255,0.15)",
                            color: saved[k] ? "#3DDC97" : "#fff",
                          }}
                        >
                          {saved[k] ? "✓" : "Save"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {day.conditioning && day.conditioning.length ? (
          <div className="mb-5">
            <p className="text-xs uppercase tracking-wide text-gray-400 mb-2">Conditioning</p>
            <div className="space-y-2">
              {day.conditioning.map(function (st) {
                const k = key(st.name, 0);
                const v = entries[k] || {};
                return (
                  <div key={st.name} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="font-bold text-sm">{st.name}</p>
                        <p className="text-xs text-gray-400">{st.target}</p>
                      </div>
                      <a href={videoLink(st.name)} target="_blank" rel="noopener noreferrer" className="text-lg">▶️</a>
                    </div>
                    <div className="flex items-center gap-2 mt-3">
                      <input
                        value={v.time || ""}
                        onChange={function (e) { setField(st.name, 0, "time", e.target.value); }}
                        placeholder="mm:ss"
                        className="w-24 px-2 py-1.5 rounded-lg bg-white/5 border border-white/10 text-sm placeholder-gray-600"
                      />
                      <button
                        onClick={function () { saveSet(st.name, 0); }}
                        className="text-xs px-3 py-1.5 rounded-lg border"
                        style={{ borderColor: saved[k] ? "#3DDC97" : "rgba(255,255,255,0.15)", color: saved[k] ? "#3DDC97" : "#fff" }}
                      >
                        {saved[k] ? "✓" : "Save"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        {day.stretch && day.stretch.length ? (
          <div className="rounded-2xl border p-4 mb-5" style={{ borderColor: "#3DDC9744", background: "#3DDC9711" }}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl" aria-hidden="true">🧘</span>
              <p className="text-sm font-bold" style={{ color: "#3DDC97" }}>Cool down · yoga and pilates</p>
            </div>
            <ul className="text-sm space-y-1 text-gray-200">
              {day.stretch.map(function (s, i) { return <li key={i}>· {s}</li>; })}
            </ul>
          </div>
        ) : null}

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 mb-4">
          <p className="text-xs uppercase tracking-wide text-gray-400 mb-2">Notes</p>
          <textarea
            value={note}
            onChange={function (e) { setNote(e.target.value); }}
            placeholder="How did it feel?"
            rows={2}
            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm placeholder-gray-600"
          />
        </div>

        <button
          onClick={finishSession}
          className="w-full px-6 py-4 rounded-full font-bold text-sm mb-3"
          style={{ background: "linear-gradient(90deg, #4CC9F0, #FF6B57)", color: "#0E1224" }}
        >
          {done ? "✓ Session logged" : "Finish session"}
        </button>

        <a
          href="/fallback"
          className="flex items-center gap-3 rounded-2xl border-2 p-4"
          style={{ borderColor: "#FFB020", background: "rgba(255,176,32,0.08)" }}
        >
          <span className="text-xl" aria-hidden="true">🏠</span>
          <span className="text-sm font-bold flex-1" style={{ color: "#FFB020" }}>Cannot get to the gym?</span>
          <span style={{ color: "#FFB020" }}>›</span>
        </a>
      </div>
    </main>
  );
}
