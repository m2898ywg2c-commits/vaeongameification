"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { liftTrends, trendSummary, currentWeek, BLOCK_WEEKS } from "@/lib/progression";

const FIELDS = [
  { key: "bodyweight", label: "Bodyweight (kg)" },
  { key: "chest", label: "Chest (cm)" },
  { key: "waist", label: "Waist (cm)" },
  { key: "hips", label: "Hips (cm)" },
  { key: "thigh", label: "Thigh (cm)" },
  { key: "arm", label: "Arm flexed (cm)" },
];

const STATUS_STYLE = {
  down: { dot: "#F87171", label: "Down" },
  stalled: { dot: "#FBBF24", label: "Stalled" },
  flat: { dot: "#FBBF24", label: "Flat" },
  holding: { dot: "#94A3B8", label: "Holding" },
  climbing: { dot: "#34D399", label: "Climbing" },
  new: { dot: "#64748B", label: "New" },
};

export default function ProgressPage() {
  const [vals, setVals] = useState({});
  const [history, setHistory] = useState([]);
  const [logs, setLogs] = useState([]);
  const [profile, setProfile] = useState(null);
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
      supabase.from("profiles").select("*").eq("id", user.id).single().then(function (r) { setProfile(r.data); });
      load(supabase, user.id);
    });
  }, [router]);

  const save = async function () {
    if (!userId) return;
    const supabase = createClient();
    const row = { user_id: userId };
    FIELDS.forEach(function (f) { if (vals[f.key]) row[f.key] = Number(vals[f.key]); });
    const { error } = await supabase.from("body_metrics").insert(row);
    if (!error) { setSaved(true); setVals({}); load(supabase, userId); }
  };

  const tonnage = logs.reduce(function (sum, l) {
    if (l.weight && l.reps) return sum + l.weight * l.reps;
    return sum;
  }, 0);

  const trends = liftTrends(logs);
  const summary = trendSummary(trends);
  const concerns = trends.filter(function (t) {
    return t.status === "down" || t.status === "stalled" || t.status === "flat";
  });
  const latest = history[0];
  const earliest = history[history.length - 1];
  const weekNo = profile ? currentWeek(profile.block_start) : 1;

  return (
    <main className="min-h-screen bg-[#0E1224] text-white px-6 py-10">
      <div className="max-w-md mx-auto">
        <a href="/dashboard" className="text-xs text-gray-400 underline">Back to dashboard</a>
        <h1 className="text-2xl font-bold mt-4 mb-1">Progress</h1>
        <p className="text-sm text-gray-400 mb-6">
          Block {profile ? profile.block_number || 1 : 1}, week {weekNo} of {BLOCK_WEEKS}
        </p>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-xl font-bold">{Math.round(tonnage).toLocaleString()}kg</p>
            <p className="text-[10px] uppercase tracking-wide text-gray-400 mt-1">Total tonnage</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-xl font-bold">{trends.length}</p>
            <p className="text-[10px] uppercase tracking-wide text-gray-400 mt-1">Lifts tracked</p>
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 p-5 mb-4">
          <p className="text-xs uppercase tracking-wide text-gray-400 mb-2">Is it actually working?</p>
          <p className="text-sm text-gray-200 mb-4">{summary}</p>
          {trends.length ? (
            <div className="space-y-3">
              {trends.map(function (t) {
                const s = STATUS_STYLE[t.status] || STATUS_STYLE.new;
                return (
                  <div key={t.name} className="border-t border-white/10 pt-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span style={{ width: 8, height: 8, borderRadius: 8, background: s.dot, display: "inline-block" }} />
                      <span className="text-sm font-bold flex-1">{t.name}</span>
                      <span className="text-xs text-gray-400">{s.label}</span>
                      <span className="text-sm font-bold">{t.latest}kg</span>
                    </div>
                    <p className="text-xs text-gray-400">{t.message}</p>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-gray-500">
              Log a few sets on the plan page and this will tell you honestly whether the weights are
              moving, or whether you are just turning up.
            </p>
          )}
        </div>

        {concerns.length ? (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-5 mb-4">
            <p className="text-xs uppercase tracking-wide text-amber-300 mb-2">Worth addressing</p>
            <p className="text-sm text-amber-100 mb-2">
              {concerns.length} {concerns.length === 1 ? "lift is" : "lifts are"} not moving. Before adding
              more sessions, check the boring things first: are you sleeping, eating enough, and
              actually resting long enough between sets?
            </p>
            <p className="text-xs text-amber-200/70">
              A stall is information, not failure. It usually means recovery, not effort.
            </p>
          </div>
        ) : null}

        <div className="rounded-xl border border-white/10 bg-white/5 p-5 mb-4">
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
          <div className="rounded-xl border border-white/10 bg-white/5 p-5">
            <p className="text-xs uppercase tracking-wide text-gray-400 mb-3">Change so far</p>
            {FIELDS.map(function (f) {
              if (!latest[f.key] || !earliest[f.key]) return null;
              const diff = Number(latest[f.key]) - Number(earliest[f.key]);
              const sign = diff > 0 ? "+" : "";
              return (
                <p key={f.key} className="text-sm mb-1">
                  {f.label}: <span className="text-gray-300">{latest[f.key]}</span>
                  <span className={diff === 0 ? "text-gray-500" : "text-gray-400"}>
                    {" "}({sign}{diff.toFixed(1)})
                  </span>
                </p>
              );
            })}
          </div>
        ) : null}
      </div>
    </main>
  );
}
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

