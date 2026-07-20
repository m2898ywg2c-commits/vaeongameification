"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { currentWeek, blockComplete, BLOCK_WEEKS } from "@/lib/progression";
import { WEIGHT_ANCHORS, EFFORT_ANCHORS, STARTER_GUIDE } from "@/lib/exercisedb";
import { TYPES } from "@/lib/personality";

const EQUIPMENT = [
  { id: "gym", icon: "🏋️", name: "Full gym" },
  { id: "home", icon: "🎒", name: "Some kit at home" },
  { id: "none", icon: "🤸", name: "Freestyling" },
];

export default function SettingsPage() {
  const [profile, setProfile] = useState(null);
  const [blockStart, setBlockStart] = useState("");
  const [bench, setBench] = useState("");
  const [squat, setSquat] = useState("");
  const [equipment, setEquipment] = useState("gym");
  const [fixedDays, setFixedDays] = useState(true);
  const [theme, setTheme] = useState("dark");
  const [typeId, setTypeId] = useState(null);
  const [showHelp, setShowHelp] = useState(false);
  const [savedWhat, setSavedWhat] = useState(null);
  const [userId, setUserId] = useState(null);
  const router = useRouter();

  useEffect(function () {
    const supabase = createClient();
    supabase.auth.getUser().then(function (res) {
      const user = res.data.user;
      if (!user) { router.push("/login"); return; }
      setUserId(user.id);
      supabase.from("profiles").select("*").eq("id", user.id).single().then(function (r) {
        const p = r.data;
        if (!p) return;
        setProfile(p);
        if (p.block_start) setBlockStart(p.block_start);
        if (p.baseline_bench) setBench(String(p.baseline_bench));
        if (p.baseline_squat) setSquat(String(p.baseline_squat));
        if (p.equipment) setEquipment(p.equipment);
        if (p.theme) setTheme(p.theme);
        setFixedDays(p.fixed_days !== false);
      });
      supabase.from("assessment_results").select("type_id").eq("user_id", user.id)
        .order("completed_at", { ascending: false }).limit(1).maybeSingle()
        .then(function (r) { if (r.data) setTypeId(r.data.type_id); });
    });
  }, [router]);

  const patch = async function (fields, label) {
    if (!userId) return;
    const supabase = createClient();
    await supabase.from("profiles").update(fields).eq("id", userId);
    setSavedWhat(label);
    const r = await supabase.from("profiles").select("*").eq("id", userId).single();
    setProfile(r.data);
    setTimeout(function () { setSavedWhat(null); }, 2500);
  };

  const startNextBlock = function () {
    const today = new Date().toISOString().slice(0, 10);
    setBlockStart(today);
    patch({ block_start: today, block_number: ((profile && profile.block_number) || 1) + 1 }, "block");
  };

  const type = typeId ? TYPES[typeId] : null;
  const accent = type ? type.colors[0] : "#4CC9F0";
  const deep = type ? type.colors[1] : "#3D2E8C";
  const week = profile ? currentWeek(profile.block_start) : 1;
  const finished = profile ? blockComplete(profile.block_start) : false;
  const noBaselines = !bench && !squat;

  const bigInput = "w-full px-4 py-4 rounded-2xl bg-white/8 border-2 text-2xl font-bold text-center";
  const primaryBtn = { background: "linear-gradient(90deg, #4CC9F0, #FF6B57)", color: "#0E1224" };

  return (
    <main className="min-h-screen text-white px-5 py-8" style={{ background: "linear-gradient(180deg, " + deep + "26 0%, #0E1224 45%)" }}>
      <div className="max-w-md mx-auto">
        <a href="/dashboard" className="text-xs text-gray-400 underline">Back</a>
        <h1 className="text-2xl font-bold mt-4 mb-6">Settings</h1>

        <div className="rounded-2xl border-2 p-5 mb-4" style={{ borderColor: noBaselines ? "#FFB020" : accent + "55", background: noBaselines ? "rgba(255,176,32,0.10)" : "rgba(255,255,255,0.04)" }}>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl" aria-hidden="true">{noBaselines ? "⚠️" : "🏋️"}</span>
            <p className="text-base font-bold" style={{ color: noBaselines ? "#FFB020" : "#fff" }}>
              {noBaselines ? "Set your starting weights" : "Your starting weights"}
            </p>
          </div>
          <p className="text-sm text-gray-300 mb-4">
            {noBaselines
              ? "Vaeon needs these to work out what you should lift each week. Without them your plan has no numbers on it."
              : "Vaeon uses these to calculate your working weight for every week of the block."}
          </p>

          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-xs uppercase tracking-wide text-gray-400 mb-2">Bench (kg)</label>
              <input value={bench} onChange={function (e) { setBench(e.target.value); }} inputMode="decimal" placeholder="20"
                className={bigInput} style={{ borderColor: accent + "66" }} />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wide text-gray-400 mb-2">Squat (kg)</label>
              <input value={squat} onChange={function (e) { setSquat(e.target.value); }} inputMode="decimal" placeholder="20"
                className={bigInput} style={{ borderColor: accent + "66" }} />
            </div>
          </div>

          <button onClick={function () { setShowHelp(!showHelp); }} className="text-sm underline mb-3" style={{ color: accent }}>
            {showHelp ? "Hide" : "I have no idea what mine are"}
          </button>

          {showHelp ? (
            <div className="rounded-xl bg-black/25 p-4 mb-3">
              <p className="text-sm font-bold mb-2">Start here, honestly</p>
              <p className="text-sm text-gray-200 mb-1">{STARTER_GUIDE.bench.line}</p>
              <p className="text-xs text-gray-400 mb-4">{STARTER_GUIDE.bench.detail}</p>
              <p className="text-xs uppercase tracking-wide text-gray-400 mb-2">What weight actually feels like</p>
              <div className="space-y-1 mb-4">
                {WEIGHT_ANCHORS.map(function (a) {
                  return (
                    <div key={a.kg} className="flex items-center gap-3 text-sm">
                      <span className="font-bold w-12" style={{ color: accent }}>{a.kg}kg</span>
                      <span className="text-gray-300">{a.thing}</span>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs uppercase tracking-wide text-gray-400 mb-2">And effort, for the cardio bits</p>
              <div className="space-y-1">
                {EFFORT_ANCHORS.map(function (a) {
                  return (
                    <div key={a.level} className="flex items-start gap-3 text-sm">
                      <span className="font-bold w-6" style={{ color: accent }}>{a.level}</span>
                      <span className="text-gray-300">{a.thing}</span>
                    </div>
                  );
                })}
              </div>
              <button onClick={function () { setBench("20"); setSquat("20"); }} className="mt-4 text-sm underline" style={{ color: accent }}>
                Just use the empty bar for both
              </button>
            </div>
          ) : null}

          <button onClick={function () { patch({ baseline_bench: bench ? Number(bench) : null, baseline_squat: squat ? Number(squat) : null }, "lifts"); }}
            className="w-full py-4 rounded-full font-bold text-sm" style={primaryBtn}>
            {savedWhat === "lifts" ? "✓ Saved" : "Save starting weights"}
          </button>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-5 mb-4">
          <p className="text-sm font-bold mb-3">Block {(profile && profile.block_number) || 1} · week {week} of {BLOCK_WEEKS}</p>
          <input type="date" value={blockStart} onChange={function (e) { setBlockStart(e.target.value); }}
            className="w-full px-4 py-4 rounded-2xl bg-white/8 border-2 border-white/15 text-lg mb-3" />
          <button onClick={function () { patch({ block_start: blockStart }, "date"); }}
            className="w-full py-3 rounded-full font-bold text-sm mb-3" style={primaryBtn}>
            {savedWhat === "date" ? "✓ Saved" : "Save start date"}
          </button>
          <button onClick={startNextBlock} className="w-full py-3 rounded-full font-bold text-sm border border-white/20">
            {finished ? "Start block " + (((profile && profile.block_number) || 1) + 1) : "Restart from today"}
          </button>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-5 mb-4">
          <p className="text-sm font-bold mb-3">Where you train</p>
          <div className="grid grid-cols-3 gap-2">
            {EQUIPMENT.map(function (o) {
              const on = equipment === o.id;
              return (
                <button key={o.id} onClick={function () { setEquipment(o.id); patch({ equipment: o.id }, "kit"); }}
                  className="py-4 rounded-2xl border text-center"
                  style={{ borderColor: on ? accent : "rgba(255,255,255,0.1)", background: on ? accent + "22" : "rgba(255,255,255,0.05)" }}>
                  <span className="block text-xl" aria-hidden="true">{o.icon}</span>
                  <span className="block text-[11px] mt-1">{o.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-5 mb-4">
          <p className="text-sm font-bold mb-3">How to label sessions</p>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={function () { setFixedDays(true); patch({ fixed_days: true }, "days"); }}
              className="py-4 rounded-2xl border text-center"
              style={{ borderColor: fixedDays ? accent : "rgba(255,255,255,0.1)", background: fixedDays ? accent + "22" : "rgba(255,255,255,0.05)" }}>
              <span className="block text-xl" aria-hidden="true">📅</span>
              <span className="block text-[11px] mt-1">Days of the week</span>
            </button>
            <button onClick={function () { setFixedDays(false); patch({ fixed_days: false }, "days"); }}
              className="py-4 rounded-2xl border text-center"
              style={{ borderColor: !fixedDays ? accent : "rgba(255,255,255,0.1)", background: !fixedDays ? accent + "22" : "rgba(255,255,255,0.05)" }}>
              <span className="block text-xl" aria-hidden="true">🔢</span>
              <span className="block text-[11px] mt-1">Session 1, 2, 3</span>
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <p className="text-sm font-bold mb-3">Appearance</p>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={function () { setTheme("dark"); patch({ theme: "dark" }, "theme"); }}
              className="py-4 rounded-2xl border text-center"
              style={{ borderColor: theme === "dark" ? accent : "rgba(255,255,255,0.1)", background: theme === "dark" ? accent + "22" : "rgba(255,255,255,0.05)" }}>
              <span className="block text-xl" aria-hidden="true">🌙</span>
              <span className="block text-[11px] mt-1">Night</span>
            </button>
            <button onClick={function () { setTheme("light"); patch({ theme: "light" }, "theme"); }}
              className="py-4 rounded-2xl border text-center"
              style={{ borderColor: theme === "light" ? accent : "rgba(255,255,255,0.1)", background: theme === "light" ? accent + "22" : "rgba(255,255,255,0.05)" }}>
              <span className="block text-xl" aria-hidden="true">☀️</span>
              <span className="block text-[11px] mt-1">Day</span>
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

