"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ENGINE_COUNT, currentSession, nextSession, rotationLap, scoreToStations, scoreWords } from "@/lib/engine";
import { TYPES } from "@/lib/personality";
import { BRAND, TRACK } from "@/lib/brand";
import Home from "../Home";

// THE ENGINE ROOM.
//
// One conditioning session, unlocked by rotation, scored in rounds rather than load.
//
// WHY THIS IS NOT IN app/plan.
//
// Everything there is sets by reps by weight. None of this is: an AMRAP has a cap and a
// score, an EMOM has an interval and a station. The clock is the screen here and everything
// else is subordinate to it, which is the exact opposite of the exercise card, where the
// prescribed number is the screen and time barely features. Four of these sessions are
// Revolution Gym's own boards, so this is also the one screen that has to match a whiteboard
// James is standing in front of.
//
// THE CLOCK COUNTS, IT DOES NOT POLICE.
//
// It never auto-finishes and never blocks logging. Somebody will start it late, pause to move
// a sled, or run the gym's own wall clock and use this only to record the score. A timer that
// ended the session for them would be wrong in all three cases. The cap is shown and counted
// toward; what happens at zero is the user's business, and the clock keeps going.

const EFFORTS = [
  { id: "easy", label: "Easy" },
  { id: "right", label: "Right" },
  { id: "brutal", label: "Brutal" },
];

function mmss(total) {
  const s = Math.max(0, Math.floor(total));
  return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
}

export default function EnginePage() {
  const [supabase] = useState(function () { return createClient(); });
  const [loading, setLoading] = useState(true);
  const [typeId, setTypeId] = useState(null);
  const [index, setIndex] = useState(0);
  const [lastSame, setLastSame] = useState(null);

  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [rounds, setRounds] = useState(0);
  const [extra, setExtra] = useState(0);
  const [effort, setEffort] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);

  const startedAt = useRef(null);

  useEffect(function () {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = "/login"; return; }
      const { data: p } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      if (!p) { window.location.href = "/dashboard"; return; }
      setTypeId(p.personality_type || null);
      const i = Number(p.engine_index) || 0;
      setIndex(i);

      // The same session, last time round the rotation. The only honest comparison there is:
      // scores from two different sessions are not comparable at all.
      const s = currentSession(i);
      const { data: prev } = await supabase
        .from("engine_logs")
        .select("rounds, extra_stations, stations_total, log_date")
        .eq("user_id", user.id).eq("session_key", s.key)
        .order("logged_at", { ascending: false }).limit(1);
      if (prev && prev.length) setLastSame(prev[0]);
      setLoading(false);
    }
    load();
  }, [supabase]);

  // Time is derived from a start timestamp rather than incremented per tick. setInterval is
  // throttled hard in a backgrounded tab and a phone in a pocket mid-session is exactly that;
  // Date.now() does not care.
  useEffect(function () {
    if (!running) return;
    const id = setInterval(function () {
      if (startedAt.current) setElapsed(Math.floor((Date.now() - startedAt.current) / 1000));
    }, 250);
    return function () { clearInterval(id); };
  }, [running]);

  if (loading) {
    return (
      <main className="min-h-screen bg-brand-bg text-brand-text px-5 py-8">
        <div className="max-w-md mx-auto"><p className="text-sm text-brand-muted">Loading...</p></div>
      </main>
    );
  }

  const session = currentSession(index);
  const upNext = nextSession(index);
  const lap = rotationLap(index);
  const type = typeId ? TYPES[typeId] : null;
  const accent = type ? type.colors[0] : BRAND.accent;

  const capSecs = (Number(session.cap) || 0) * 60;
  const remaining = capSecs - elapsed;
  const over = remaining < 0;
  const stationCount = session.stations.length;
  const isAmrap = session.format !== "emom";

  // Purely a reading aid so the eye lands on the right line. Nothing is derived from it and
  // nothing is logged from it.
  const liveStation = running && isAmrap ? extra % stationCount : -1;

  function start() {
    startedAt.current = Date.now() - elapsed * 1000;
    setRunning(true);
  }

  function addStation() {
    const n = extra + 1;
    if (n >= stationCount) { setRounds(rounds + 1); setExtra(0); } else setExtra(n);
  }

  function removeStation() {
    if (extra > 0) { setExtra(extra - 1); return; }
    if (rounds > 0) { setRounds(rounds - 1); setExtra(stationCount - 1); }
  }

  async function finish() {
    setSaving(true);
    setError(null);
    const { data: { user } } = await supabase.auth.getUser();
    const total = scoreToStations(session, rounds, extra);

    const { error: e1 } = await supabase.from("engine_logs").insert({
      user_id: user.id,
      session_key: session.key,
      rounds: rounds,
      extra_stations: isAmrap ? extra : 0,
      stations_total: total,
      effort: effort,
    });
    if (e1) { setSaving(false); setError(e1.message); return; }

    // ADVANCING IS A SECOND WRITE AND IT HAPPENS SECOND ON PURPOSE.
    //
    // If the score fails to save, the rotation must not move, or the session is both
    // unrecorded and unreachable. The opposite failure is harmless by comparison: a score
    // saved against a rotation that did not advance just offers the same session again.
    const { error: e2 } = await supabase
      .from("profiles").update({ engine_index: index + 1 }).eq("id", user.id);
    if (e2) { setSaving(false); setError("Score saved, but the rotation did not advance: " + e2.message); return; }

    setRunning(false);
    setSaved(true);
    setSaving(false);
  }

  const btn = "w-full rounded-md py-3 font-display text-sm";

  if (saved) {
    const total = scoreToStations(session, rounds, extra);
    const beat = lastSame ? total - Number(lastSame.stations_total || 0) : null;
    return (
      <main className="min-h-screen bg-brand-bg text-brand-text px-5 py-8">
        <div className="max-w-md mx-auto">
          <div className="mb-6"><Home /></div>
          <p className="rule-label rule-label-left mb-3">Logged</p>
          <h1 className="font-display text-2xl font-normal mb-1">{session.name}</h1>
          <p className="text-sm text-brand-muted mb-6">
            {isAmrap ? scoreWords(rounds, extra) + " · " + total + " stations" : rounds + " laps"}
          </p>

          <div className="rounded-md border p-4 mb-6"
            style={beat !== null && beat !== 0
              ? { borderColor: accent + "55", background: accent + "12" }
              : { borderColor: "var(--brand-line)" }}>
            <p className="text-sm" style={{ color: beat !== null && beat !== 0 ? accent : "var(--brand-muted)" }}>
              {beat === null ? "First time on this one. Next time round there is a number to beat."
                : beat > 0 ? "Up " + beat + " stations on last time."
                : beat === 0 ? "Dead level with last time."
                : "Down " + Math.abs(beat) + " stations on last time."}
            </p>
          </div>

          <p className="text-sm text-brand-muted mb-1">Next in the rotation</p>
          <p className="font-display text-base mb-6">{upNext.name}</p>
          <a href="/dashboard" className={btn + " block text-center"}
            style={{ background: accent, color: "var(--brand-bg)" }}>Done</a>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-brand-bg text-brand-text px-5 py-8">
      <div className="max-w-md mx-auto">
        <div className="mb-6"><Home /></div>

        <div className="flex items-baseline gap-3 mb-1">
          <h1 className="font-display text-2xl font-normal">{session.name}</h1>
          <span className="ml-auto text-[0.625rem] uppercase font-display shrink-0"
            style={{ color: accent, letterSpacing: TRACK.label }}>
            {isAmrap ? "AMRAP " + session.cap : "EMOM " + session.cap}
          </span>
        </div>
        <p className="text-sm text-brand-muted mb-1">{session.blurb}</p>
        <p className="text-xs mb-6" style={{ color: BRAND.dim }}>
          {session.source === "revolution" ? "From Revolution Gym's board. " : "Vaeon session. "}
          Session {(index % ENGINE_COUNT) + 1} of {ENGINE_COUNT}, lap {lap}.
        </p>

        <div className="rounded-md border p-5 mb-4 text-center" style={{ borderColor: "var(--brand-line)" }}>
          <p className="font-display leading-none"
            style={{ fontSize: "2.75rem", color: over ? accent : "var(--brand-text)" }}>
            {over ? "+" + mmss(-remaining) : mmss(remaining)}
          </p>
          <p className="text-[0.625rem] uppercase mt-2" style={{ color: BRAND.dim, letterSpacing: TRACK.label }}>
            {over ? "over the cap" : running ? "remaining" : "cap " + session.cap + " min"}
          </p>
          {!running ? (
            <button type="button" onClick={start} className={btn + " mt-4"}
              style={{ background: accent, color: "var(--brand-bg)" }}>
              {elapsed > 0 ? "Resume" : "Start"}
            </button>
          ) : (
            <button type="button" onClick={function () { setRunning(false); }}
              className={btn + " mt-4 border"} style={{ borderColor: "var(--brand-line-strong)" }}>Pause</button>
          )}
        </div>

        <p className="rule-label rule-label-left mb-3">{isAmrap ? "One round" : "Stations, in order"}</p>
        <div className="rounded-md border overflow-hidden mb-4"
          style={{ borderColor: "var(--brand-line)", background: "var(--brand-line)" }}>
          {session.stations.map(function (st, i) {
            const on = i === liveStation;
            return (
              <div key={i} className="flex items-start gap-3 px-3 py-2.5"
                style={{ background: on ? accent + "14" : "var(--brand-bg)",
                         marginBottom: i === stationCount - 1 ? 0 : 1 }}>
                <span className="font-display text-sm shrink-0" style={{ color: accent, minWidth: "4.4rem" }}>{st.qty}</span>
                <span className="text-sm">{st.move}</span>
              </div>
            );
          })}
        </div>

        <div className="rounded-md border p-4 mb-4" style={{ borderColor: "var(--brand-line)" }}>
          <div className="flex items-center gap-3">
            <div className="min-w-0">
              <p className="font-display text-2xl leading-none">
                {isAmrap ? scoreWords(rounds, extra) : rounds + (rounds === 1 ? " lap" : " laps")}
              </p>
              <p className="text-xs mt-1" style={{ color: BRAND.dim }}>
                {isAmrap ? scoreToStations(session, rounds, extra) + " stations" : "of the " + stationCount}
              </p>
            </div>
            <div className="ml-auto flex gap-2 shrink-0">
              <button type="button" aria-label={isAmrap ? "One station back" : "One lap back"}
                onClick={isAmrap ? removeStation : function () { setRounds(Math.max(0, rounds - 1)); }}
                className="w-11 h-11 rounded-md border text-lg" style={{ borderColor: "var(--brand-line-strong)" }}>&minus;</button>
              <button type="button" aria-label={isAmrap ? "One station done" : "One lap done"}
                onClick={isAmrap ? addStation : function () { setRounds(rounds + 1); }}
                className="w-11 h-11 rounded-md border text-lg"
                style={{ borderColor: accent, color: accent }}>+</button>
            </div>
          </div>
          <p className="text-xs mt-3" style={{ color: BRAND.dim }}>
            {isAmrap
              ? "Tap plus as each station finishes. It rolls into a round on its own."
              : (session.work ? session.work + " seconds on, " + session.rest + " off. " : "") +
                "Count a lap each time you come back round to the first station."}
          </p>
        </div>

        <p className="rule-label rule-label-left mb-3">How did that feel?</p>
        <div className="grid grid-cols-3 gap-2 mb-4">
          {EFFORTS.map(function (e) {
            const on = effort === e.id;
            return (
              <button key={e.id} type="button" aria-pressed={on}
                onClick={function () { setEffort(on ? null : e.id); }}
                className="rounded-md border py-2.5 text-sm"
                style={{ borderColor: on ? accent : "var(--brand-line)",
                         background: on ? accent + "12" : "transparent",
                         color: on ? accent : "var(--brand-text)" }}>
                {e.label}
              </button>
            );
          })}
        </div>

        {lastSame ? (
          <p className="text-xs mb-4" style={{ color: BRAND.dim }}>
            Last time on this one: {scoreWords(lastSame.rounds, lastSame.extra_stations)}.
          </p>
        ) : null}

        {error ? <p className="text-sm mb-3" style={{ color: "#f87171" }}>{error}</p> : null}

        <button type="button" onClick={finish} disabled={saving} className={btn}
          style={{ background: accent, color: "var(--brand-bg)", opacity: saving ? 0.6 : 1 }}>
          {saving ? "Saving..." : "Finish and score"}
        </button>
        <p className="text-xs mt-3 text-center" style={{ color: BRAND.dim }}>
          Finishing unlocks {upNext.name}.
        </p>
      </div>
    </main>
  );
}
