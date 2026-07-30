"use client";

// The session view for Gym ready users. Four freeform blocks of three sets by default,
// with add block and add set. No warm up, no stations, no cool down flow, because Vaeon
// is not planning this session and should not pretend to be.
//
// Block titles prefill from whatever was last logged against this day_key, so someone
// following a fixed programme types their exercises once rather than every week.

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { sessionMusic } from "@/lib/music";
import { BLOCKS_PER_DAY, SETS_PER_BLOCK } from "@/lib/gymready";
import GymBlock from "./GymBlock";
import RestTimer from "./RestTimer";
import TypeOrb from "../TypeOrb";
import { sessionDone } from "@/lib/voice";

const SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function emptyBlocks(n, sets) {
  const out = [];
  for (let i = 0; i < n; i++) out.push({ title: "", sets: sets });
  return out;
}

export default function GymDayView({ day, active, profile, accent, deep, tid, done, onComplete, onReopen, finished, onFinish }) {
  const [blocks, setBlocks] = useState(function () { return emptyBlocks(BLOCKS_PER_DAY, SETS_PER_BLOCK); });
  const [prefilled, setPrefilled] = useState(false);

  // Pull the most recent session logged against this day and reuse its exercise names.
  useEffect(function () {
    let cancelled = false;
    async function loadLast() {
      setBlocks(emptyBlocks(BLOCKS_PER_DAY, SETS_PER_BLOCK));
      setPrefilled(false);
      if (!day) return;
      const supabase = createClient();
      const res = await supabase.auth.getUser();
      const user = res.data.user;
      if (!user) return;
      const { data } = await supabase
        .from("exercise_logs")
        .select("exercise, logged_at")
        .eq("user_id", user.id)
        .eq("day_key", day.key)
        .order("logged_at", { ascending: false })
        .limit(80);
      if (cancelled || !data || !data.length) return;

      // Only the most recent session, not everything ever logged on this day.
      const newest = new Date(data[0].logged_at);
      const sameDay = data.filter(function (r) {
        const t = new Date(r.logged_at);
        return Math.abs(newest - t) < 6 * 60 * 60 * 1000;
      });
      const names = [];
      const seen = {};
      // Reverse so the order matches how they were performed, not how they were returned.
      sameDay.slice().reverse().forEach(function (r) {
        const n = (r.exercise || "").trim();
        if (!n || seen[n.toLowerCase()]) return;
        seen[n.toLowerCase()] = true;
        names.push(n);
      });
      if (!names.length) return;
      const next = names.map(function (n) { return { title: n, sets: SETS_PER_BLOCK }; });
      while (next.length < BLOCKS_PER_DAY) next.push({ title: "", sets: SETS_PER_BLOCK });
      setBlocks(next);
      setPrefilled(true);
    }
    loadLast();
    return function () { cancelled = true; };
  }, [day ? day.key : null]);

  if (!day) return null;

  const music = sessionMusic(day, profile.birth_year);
  const label = profile.fixed_days === false
    ? "Session " + (active + 1)
    : (day.dayLabel === SHORT[new Date().getDay()] ? "Today" : day.dayLabel);

  function setTitle(i, value) {
    setBlocks(function (b) {
      const next = b.slice();
      next[i] = Object.assign({}, next[i], { title: value });
      return next;
    });
  }

  function addSet(i) {
    setBlocks(function (b) {
      const next = b.slice();
      next[i] = Object.assign({}, next[i], { sets: (next[i].sets || SETS_PER_BLOCK) + 1 });
      return next;
    });
  }

  function addBlock() {
    setBlocks(function (b) { return b.concat([{ title: "", sets: SETS_PER_BLOCK }]); });
  }

  const namedCount = blocks.filter(function (b) { return (b.title || "").trim(); }).length;
  const doneCount = Object.keys(done || {}).length;

  return (
    <>
      <div className="rounded-2xl p-5 mb-4" style={{ background: "linear-gradient(135deg, " + accent + ", " + deep + ")" }}>
        <p className="text-xs font-bold uppercase tracking-wide opacity-80">{label}</p>
        <p className="text-2xl font-bold leading-tight">Your session</p>
        <p className="text-sm opacity-90 mt-1">Log what your coach set you.</p>
      </div>

      <a href={music.href} target="_blank" rel="noopener noreferrer"
        className="flex items-center justify-between rounded-2xl border p-4 mb-3"
        style={{ borderColor: "rgba(30,215,96,0.4)", background: "rgba(30,215,96,0.08)" }}>
        <span className="text-sm font-medium text-gray-200">{music.label}</span>
        <span className="text-xs font-bold flex-shrink-0 ml-3" style={{ color: "#1ED760" }}>Open Spotify</span>
      </a>

      {prefilled ? (
        <p className="text-xs text-gray-400 mb-3">
          Filled in from last time. Type over anything that has changed.
        </p>
      ) : null}

      <RestTimer accent={accent} />

      {blocks.map(function (b, i) {
        return (
          <GymBlock
            key={i}
            block={b}
            blockIdx={i}
            accent={accent}
            done={!!(done && done[i])}
            onComplete={onComplete}
            onReopen={onReopen}
            onTitleChange={setTitle}
            onAddSet={addSet}
          />
        );
      })}

      <button
        onClick={addBlock}
        className="w-full py-3 rounded-2xl font-bold text-sm mb-4 border"
        style={{ borderColor: accent + "55", color: accent, background: accent + "12" }}
      >
        ＋ Add another block
      </button>

      {finished ? (
        <div className="rounded-2xl p-5 mb-6 text-center border-2" style={{ borderColor: accent, background: "rgba(255,255,255,0.04)" }}>
          <div className="flex justify-center mb-2"><TypeOrb typeId={tid} size={54} /></div>
          <p className="text-base font-bold">{sessionDone(tid)}</p>
          <p className="text-xs text-gray-400 mt-1">Session logged.</p>
          <a href="/dashboard" className="inline-block mt-4 text-sm underline" style={{ color: accent }}>Back to dashboard</a>
        </div>
      ) : (
        <>
          {/* No auto-finish here. Blocks can be added at any point, so "everything is
              collapsed" is not a reliable signal that the session is over. */}
          <button onClick={onFinish} className="w-full py-5 rounded-2xl font-bold text-lg mb-2"
            style={{ background: "linear-gradient(135deg, " + accent + ", " + deep + ")", color: "#fff" }}>
            Finish session
          </button>
          <p className="text-xs text-gray-500 text-center mb-6">
            {doneCount} of {namedCount || BLOCKS_PER_DAY} blocks logged.
          </p>
        </>
      )}
    </>
  );
}
