"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { currentWeek, blockComplete, BLOCK_WEEKS } from "@/lib/progression";

export default function SettingsPage() {
  const [profile, setProfile] = useState(null);
  const [blockStart, setBlockStart] = useState("");
  const [bench, setBench] = useState("");
  const [squat, setSquat] = useState("");
  const [savedDate, setSavedDate] = useState(false);
  const [savedLifts, setSavedLifts] = useState(false);
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
      });
    });
  }, [router]);

  const saveDate = async function () {
    if (!userId || !blockStart) return;
    const supabase = createClient();
    await supabase.from("profiles").update({ block_start: blockStart }).eq("id", userId);
    setSavedDate(true);
    const r = await supabase.from("profiles").select("*").eq("id", userId).single();
    setProfile(r.data);
  };

  const saveLifts = async function () {
    if (!userId) return;
    const supabase = createClient();
    await supabase
      .from("profiles")
      .update({
        baseline_bench: bench ? Number(bench) : null,
        baseline_squat: squat ? Number(squat) : null,
      })
      .eq("id", userId);
    setSavedLifts(true);
  };

  const startNextBlock = async function () {
    if (!userId || !profile) return;
    const supabase = createClient();
    const today = new Date().toISOString().slice(0, 10);
    await supabase
      .from("profiles")
      .update({ block_start: today, block_number: (profile.block_number || 1) + 1 })
      .eq("id", userId);
    const r = await supabase.from("profiles").select("*").eq("id", userId).single();
    setProfile(r.data);
    setBlockStart(today);
  };

  const week = profile ? currentWeek(profile.block_start) : 1;
  const finished = profile ? blockComplete(profile.block_start) : false;

  return (
    <main className="min-h-screen bg-[#0E1224] text-white px-6 py-10">
      <div className="max-w-md mx-auto">
        <a href="/dashboard" className="text-xs text-gray-400 underline">Back to dashboard</a>
        <h1 className="text-2xl font-bold mt-4 mb-6">Settings</h1>

        <div className="rounded-xl border border-white/10 bg-white/5 p-5 mb-4">
          <p className="text-xs uppercase tracking-wide text-gray-400 mb-3">
            Block {profile ? profile.block_number || 1 : 1} start date
          </p>
          <input
            type="date"
            value={blockStart}
            onChange={function (e) { setBlockStart(e.target.value); setSavedDate(false); }}
            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm mb-3"
          />
          <p className="text-sm text-gray-300 mb-3">
            {profile && profile.block_start
              ? "Based on this date you are in week " + week + " of " + BLOCK_WEEKS + "."
              : "Set this and Vaeon works out which week of the block you are in."}
          </p>
          <button
            onClick={saveDate}
            className="px-5 py-2 rounded-full font-bold text-sm"
            style={{ background: "linear-gradient(90deg, #4CC9F0, #FF6B57)", color: "#0E1224" }}
          >
            {savedDate ? "Saved" : "Save date"}
          </button>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 p-5 mb-4">
          <p className="text-xs uppercase tracking-wide text-gray-400 mb-3">Baseline lifts</p>
          <p className="text-sm text-gray-300 mb-4">
            Your current best working set. Vaeon uses these to calculate what you should be lifting
            each week of the block.
          </p>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="block text-[10px] uppercase tracking-wide text-gray-500 mb-1">Bench (kg)</label>
              <input
                value={bench}
                onChange={function (e) { setBench(e.target.value); setSavedLifts(false); }}
                inputMode="decimal"
                placeholder="e.g. 80"
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm placeholder-gray-600"
              />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-wide text-gray-500 mb-1">Squat (kg)</label>
              <input
                value={squat}
                onChange={function (e) { setSquat(e.target.value); setSavedLifts(false); }}
                inputMode="decimal"
                placeholder="e.g. 100"
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm placeholder-gray-600"
              />
            </div>
          </div>
          <button
            onClick={saveLifts}
            className="px-5 py-2 rounded-full font-bold text-sm"
            style={{ background: "linear-gradient(90deg, #4CC9F0, #FF6B57)", color: "#0E1224" }}
          >
            {savedLifts ? "Saved" : "Save baselines"}
          </button>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 p-5">
          <p className="text-xs uppercase tracking-wide text-gray-400 mb-3">Start the next block</p>
          <p className="text-sm text-gray-300 mb-4">
            {finished
              ? "Block " + (profile ? profile.block_number || 1 : 1) + " is done. Update your baselines to whatever you hit in week six, then start block " + ((profile ? profile.block_number || 1 : 1) + 1) + "."
              : "Opens a fresh six weeks from today. Your logs are kept, nothing is lost."}
          </p>
          <button
            onClick={startNextBlock}
            className="px-5 py-2 rounded-full font-bold text-sm border border-white/20"
          >
            Start block {(profile ? profile.block_number || 1 : 1) + 1}
          </button>
        </div>
      </div>
    </main>
  );
}

