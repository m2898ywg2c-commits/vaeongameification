"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { SESSION_TYPES } from "@/lib/plan";
import Home from "../Home";

const DURATIONS = [15, 30, 45, 60, 90];

export default function LogPage() {
  const [sessionType, setSessionType] = useState("Strength");
  const [duration, setDuration] = useState(30);
  const [effort, setEffort] = useState(3);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);
  const [recent, setRecent] = useState([]);
  const [userId, setUserId] = useState(null);
  const router = useRouter();

  useEffect(function () {
    const supabase = createClient();
    supabase.auth.getUser().then(function (res) {
      const user = res.data.user;
      if (!user) {
        router.push("/login");
        return;
      }
      setUserId(user.id);
      supabase
        .from("training_sessions")
        .select("*")
        .eq("user_id", user.id)
        .order("logged_at", { ascending: false })
        .limit(10)
        .then(function (r) {
          setRecent(r.data || []);
        });
    });
  }, [router]);

  const save = async function () {
    if (!userId) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    const supabase = createClient();
    const { error: insertError } = await supabase.from("training_sessions").insert({
      user_id: userId,
      session_type: sessionType,
      duration_min: duration,
      effort: effort,
      note: note || null,
    });
    setSaving(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setSaved(true);
    setNote("");
    const r = await supabase
      .from("training_sessions")
      .select("*")
      .eq("user_id", userId)
      .order("logged_at", { ascending: false })
      .limit(10);
    setRecent(r.data || []);
  };

  const remove = async function (id) {
    const supabase = createClient();
    await supabase.from("training_sessions").delete().eq("id", id);
    setRecent(
      recent.filter(function (s) {
        return s.id !== id;
      })
    );
  };

  const pill = function (active) {
    return (
      "px-4 py-2 rounded-full text-sm font-medium border " +
      (active ? "border-white bg-white/20" : "border-white/15 bg-white/5")
    );
  };

  return (
    <main className="min-h-screen bg-[#0E1224] text-white px-6 py-12">
      <div className="max-w-md mx-auto">
        <div className="mb-6">
          <Home />
        </div>
        <h1 className="text-2xl font-bold mb-6">Log a session</h1>

        <p className="text-xs uppercase tracking-wide text-gray-400 mb-2">What was it?</p>
        <div className="flex flex-wrap gap-2 mb-6">
          {SESSION_TYPES.map(function (t) {
            return (
              <button key={t} onClick={function () { setSessionType(t); }} className={pill(sessionType === t)}>
                {t}
              </button>
            );
          })}
        </div>

        <p className="text-xs uppercase tracking-wide text-gray-400 mb-2">How long?</p>
        <div className="flex flex-wrap gap-2 mb-6">
          {DURATIONS.map(function (d) {
            return (
              <button key={d} onClick={function () { setDuration(d); }} className={pill(duration === d)}>
                {d} min
              </button>
            );
          })}
        </div>

        <p className="text-xs uppercase tracking-wide text-gray-400 mb-2">How hard? 1 easy, 5 brutal</p>
        <div className="flex gap-2 mb-6">
          {[1, 2, 3, 4, 5].map(function (e) {
            return (
              <button key={e} onClick={function () { setEffort(e); }} className={pill(effort === e)}>
                {e}
              </button>
            );
          })}
        </div>

        <input
          value={note}
          onChange={function (e) { setNote(e.target.value); }}
          placeholder="Optional note"
          className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-sm mb-6 placeholder-gray-500"
        />

        <button
          onClick={save}
          disabled={saving}
          className="px-8 py-3 rounded-full font-bold text-sm mb-3"
          style={{ background: "linear-gradient(90deg, #2DD4BF, #0F766E)", color: "#0E1224" }}
        >
          {saving ? "Saving..." : "Save session"}
        </button>
        {saved ? <p className="text-sm text-emerald-400 mb-3">Logged. Nice work.</p> : null}
        {error ? <p className="text-sm text-red-400 mb-3">{error}</p> : null}

        <div className="mt-8">
          <p className="text-xs uppercase tracking-wide text-gray-400 mb-3">Recent sessions</p>
          {recent.length === 0 ? (
            <p className="text-sm text-gray-500">Nothing logged yet.</p>
          ) : (
            <div className="space-y-2">
              {recent.map(function (s) {
                return (
                  <div
                    key={s.id}
                    className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3"
                  >
                    <div className="flex-1">
                      <p className="text-sm">
                        {s.session_type} - {s.duration_min} min - effort {s.effort}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(s.logged_at).toLocaleDateString()}
                        {s.note ? " - " + s.note : ""}
                      </p>
                    </div>
                    <button
                      onClick={function () { remove(s.id); }}
                      className="text-xs text-gray-500 underline"
                    >
                      Delete
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
