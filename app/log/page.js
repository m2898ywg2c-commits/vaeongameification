"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { SESSION_TYPES } from "@/lib/plan";
import Home from "../Home";
import { track, EVENTS } from "@/lib/events";

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
    // Same event as finishing a session in the plan, with source telling them apart.
    // Both mean "a session happened", and adherence should not care which route it
    // came in by, but which route people actually use is worth knowing.
    track(supabase, EVENTS.SESSION_LOGGED, {
      source: "quick_log", session_type: sessionType, duration_min: duration, effort: effort,
    });

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
      "px-4 py-2 rounded-sm text-sm font-medium border " +
      (active ? "border-brand-text bg-brand-field" : "border-brand-line bg-brand-surface")
    );
  };

  return (
    <main className="min-h-screen bg-brand-bg text-brand-text px-6 py-12">
      <div className="max-w-md mx-auto">
        <div className="mb-6">
          <Home />
        </div>
        <h1 className="font-display text-2xl font-normal mb-6">Log a session</h1>

        <p className="text-xs uppercase tracking-wide text-brand-muted mb-2">What was it?</p>
        <div className="flex flex-wrap gap-2 mb-6">
          {SESSION_TYPES.map(function (t) {
            return (
              <button key={t} onClick={function () { setSessionType(t); }} className={pill(sessionType === t)}>
                {t}
              </button>
            );
          })}
        </div>

        <p className="text-xs uppercase tracking-wide text-brand-muted mb-2">How long?</p>
        <div className="flex flex-wrap gap-2 mb-6">
          {DURATIONS.map(function (d) {
            return (
              <button key={d} onClick={function () { setDuration(d); }} className={pill(duration === d)}>
                {d} min
              </button>
            );
          })}
        </div>

        <p className="text-xs uppercase tracking-wide text-brand-muted mb-2">How hard? 1 easy, 5 brutal</p>
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
          className="w-full px-4 py-3 rounded-md border border-brand-line bg-brand-surface text-sm mb-6 placeholder-brand-dim"
        />

        <button
          onClick={save}
          disabled={saving}
          className="px-8 py-3 rounded-sm font-display text-sm mb-3"
          style={{ background: "var(--brand-accent)", color: "var(--brand-bg)" }}
        >
          {saving ? "Saving..." : "Save session"}
        </button>
        {saved ? <p className="text-sm text-emerald-400 mb-3">Logged. Nice work.</p> : null}
        {error ? <p className="text-sm text-red-400 mb-3">{error}</p> : null}

        <div className="mt-8">
          <p className="text-xs uppercase tracking-wide text-brand-muted mb-3">Recent sessions</p>
          {recent.length === 0 ? (
            <p className="text-sm text-brand-dim">Nothing logged yet.</p>
          ) : (
            <div className="space-y-2">
              {recent.map(function (s) {
                return (
                  <div
                    key={s.id}
                    className="flex items-center gap-3 rounded-md border border-brand-line bg-brand-surface px-4 py-3"
                  >
                    <div className="flex-1">
                      <p className="text-sm">
                        {s.session_type} - {s.duration_min} min - effort {s.effort}
                      </p>
                      <p className="text-xs text-brand-dim">
                        {new Date(s.logged_at).toLocaleDateString()}
                        {s.note ? " - " + s.note : ""}
                      </p>
                    </div>
                    <button
                      onClick={function () { remove(s.id); }}
                      className="text-xs text-brand-dim underline"
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
