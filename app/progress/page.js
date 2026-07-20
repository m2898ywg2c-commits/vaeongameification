"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const FIELDS = [
  { key: "bodyweight", label: "Bodyweight (kg)" },
  { key: "chest", label: "Chest (cm)" },
  { key: "waist", label: "Waist (cm)" },
  { key: "hips", label: "Hips (cm)" },
  { key: "thigh", label: "Thigh (cm)" },
  { key: "arm", label: "Arm flexed (cm)" },
];

export default function ProgressPage() {
  const [vals, setVals] = useState({});
  const [history, setHistory] = useState([]);
  const [logs, setLogs] = useState([]);
  const [userId, setUserId] = useState(null);
  const [saved, setSaved] = useState(false);
  const router = useRouter();

  const load = function (supabase, uid) {
    supabase.from("body_metrics").select("*").eq("user_id", uid).order("logged_at", { ascending: false }).limit(12).then(function (r) {
      setHistory(r.data || []);
    });
    supabase.from("exercise_logs").select("*").eq("user_id", uid).order("logged_at", { ascending: false }).limit(500).then(function (r) {
      setLogs(r.data || []);
    });
  };

  useEffect(function () {
    const supabase = createClient();
    supabase.auth.getUser().then(function (res) {
      const user = res.data.user;
      if (!user) { router.push("/login"); return; }
      setUserId(user.id);
      load(supabase, user.id);
    });
  }, [router]);

  const save = async function () {
    if (!userId) return;
    const supabase = createClient();
    const row = { user_id: userId };
    FIELDS.forEach(function (f) {
      if (vals[f.key]) row[f.key] = Number(vals[f.key]);
    });
    const { error } = await supabase.from("body_metrics").insert(row);
    if (!error) {
      setSaved(true);
      setVals({});
      load(supabase, userId);
    }
  };

  const tonnage = logs.reduce(function (sum, l) {
    if (l.weight && l.reps) return sum + l.weight * l.reps;
    return sum;
  }, 0);

  const bests = {};
  logs.forEach(function (l) {
    if (!l.weight) return;
    if (!bests[l.exercise] || l.weight > bests[l.exercise]) bests[l.exercise] = l.weight;
  });
  const bestList = Object.keys(bests).map(function (k) { return { name: k, weight: bests[k] }; });
  bestList.sort(function (a, b) { return b.weight - a.weight; });

  const latest = history[0];
  const earliest = history[history.length - 1];

  return (
    <main className="min-h-screen bg-[#0E1224] text-white px-6 py-10">
      <div className="max-w-md mx-auto">
        <a href="/dashboard" className="text-xs text-gray-400 underline">Back to dashboard</a>
        <h1 className="text-2xl font-bold mt-4 mb-6">Progress</h1>

        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-xl font-bold">{Math.round(tonnage).toLocaleString()}kg</p>
            <p className="text-[10px] uppercase tracking-wide text-gray-400 mt-1">Total tonnage</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-xl font-bold">{bestList.length}</p>
            <p className="text-[10px] uppercase tracking-wide text-gray-400 mt-1">Lifts tracked</p>
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 p-5 mb-6">
          <p className="text-xs uppercase tracking-wide text-gray-400 mb-3">Log your measurements</p>
          <div className="grid grid-cols-2 gap-3 mb-4">
            {FIELDS.map(function (f) {
              return (
                <div key={f.key}>
                  <label className="block text-[10px] uppercase tracking-wide text-gray-500 mb-1">{f.label}</label>
                  <input
                    value={vals[f.key] || ""}
                    onChange={function (e) {
                      const next = Object.assign({}, vals);
                      next[f.key] = e.target.value;
                      setVals(next);
                      setSaved(false);
                    }}
                    inputMode="decimal"
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm"
                  />
                </div>
              );
            })}
          </div>
          <button
            onClick={save}
            className="px-5 py-2 rounded-full font-bold text-sm"
            style={{ background: "linear-gradient(90deg, #4CC9F0, #FF6B57)", color: "#0E1224" }}
          >
            {saved ? "Saved" : "Save measurements"}
          </button>
          <p className="text-xs text-gray-500 mt-3">
            Once a week, same day and time. These move slower than the weights on the bar.
          </p>
        </div>

        {latest && earliest && history.length > 1 ? (
          <div className="rounded-xl border border-white/10 bg-white/5 p-5 mb-6">
            <p className="text-xs uppercase tracking-wide text-gray-400 mb-3">Change so far</p>
            {FIELDS.map(function (f) {
              if (!latest[f.key] || !earliest[f.key]) return null;
              const diff = Number(latest[f.key]) - Number(earliest[f.key]);
              const sign = diff > 0 ? "+" : "";
              return (
                <p key={f.key} className="text-sm mb-1">
                  {f.label}: <span className="text-gray-300">{latest[f.key]}</span>
                  <span className={diff === 0 ? "text-gray-500" : diff > 0 ? "text-amber-400" : "text-emerald-400"}>
                    {" "}({sign}{diff.toFixed(1)})
                  </span>
                </p>
              );
            })}
          </div>
        ) : null}

        {bestList.length ? (
          <div className="rounded-xl border border-white/10 bg-white/5 p-5 mb-6">
            <p className="text-xs uppercase tracking-wide text-gray-400 mb-3">Best lifts</p>
            {bestList.slice(0, 10).map(function (b) {
              return (
                <div key={b.name} className="flex justify-between text-sm mb-1">
                  <span className="text-gray-200">{b.name}</span>
                  <span className="font-bold">{b.weight}kg</span>
                </div>
              );
            })}
          </div>
        ) : null}

        {history.length ? (
          <div className="rounded-xl border border-white/10 bg-white/5 p-5">
            <p className="text-xs uppercase tracking-wide text-gray-400 mb-3">Measurement history</p>
            {history.map(function (h) {
              return (
                <div key={h.id} className="text-sm mb-2">
                  <span className="text-gray-400 text-xs">{new Date(h.logged_at).toLocaleDateString()}</span>
                  {h.bodyweight ? <span className="ml-3">{h.bodyweight}kg</span> : null}
                  {h.waist ? <span className="ml-3 text-gray-400">waist {h.waist}cm</span> : null}
                </div>
              );
            })}
          </div>
        ) : null}
      </div>
    </main>
  );
}

