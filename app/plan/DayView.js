"use client";

import { useState, useEffect } from "react";
import { stretchFor } from "@/lib/exercisedb";
import { sessionMusic, stationMusic } from "@/lib/music";
import ExerciseCard from "./ExerciseCard";
import RestTimer from "./RestTimer";
import TypeOrb from "../TypeOrb";
import TypeCharacter from "../TypeCharacter";
import SessionFanfare from "./SessionFanfare";
import { sessionDone } from "@/lib/voice";

const SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function DayView({ day, active, profile, rule, accent, deep, tid, homeMode, done, maxes, isTestWeek, lastSets, holdProgression, onComplete, onReopen, finished, onFinish, onStation, onAvoid, loggedThisWeek }) {
const [openWarmup, setOpenWarmup] = useState(false);
const [openFlow, setOpenFlow] = useState(false);
// KEYED BY DAY AND STATION NAME, NOT BY INDEX.
//
// Every day has exactly one station, so the index was always 0. DayView is not unmounted
// when you switch day, it just gets a new `day` prop, so index 0 on Monday and index 0 on
// Tuesday shared one box and your SkiErg time appeared under Row. Same class of bug as the
// per-exercise completion that used to vanish on reload.
const [stations, setStations] = useState({});
const [loggedStations, setLoggedStations] = useState({});
function stationKey(c) { return (day ? day.key : "") + "|" + (c && c.name ? c.name : ""); }

// Auto-finish: when every exercise card is collapsed, log the session without
// making anyone hunt for the button with sweaty hands. Short delay so the last
// tick lands visually first.
//
// The finisher deliberately does NOT gate this. It used to: a day with stations
// would not auto-finish until three of them were logged, which made an optional
// extra into a compulsory one and quietly punished anyone who ran out of time.
// It is now the same deal as the stretch flow, worth doing, not scored.
const allExercisesDone = !!day && day.exercises.length > 0 &&
day.exercises.every(function (ex, i) { return !!done[i]; });

useEffect(function () {
if (!allExercisesDone || finished) return;
const t = setTimeout(function () { onFinish(); }, 900);
return function () { clearTimeout(t); };
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [allExercisesDone, finished]);

if (!day) return null;
const flow = stretchFor(day);
// active is the session's index in the week, so two sessions on the same day get
// different suggestions rather than the same one twice.
const music = sessionMusic(day, profile.birth_year, active);
const stationTunes = stationMusic(profile.birth_year);
const label = profile.fixed_days === false
? "Session " + (active + 1)
: (day.dayLabel === SHORT[new Date().getDay()] ? "Today" : day.dayLabel);

const panel = "w-full flex items-center justify-between rounded-md border border-brand-line bg-brand-surface p-4 mb-3 text-left";
const field = "w-full px-3 py-3 rounded-md bg-brand-field border border-brand-line font-display text-base font-normal text-center text-brand-text placeholder-brand-dim";

return (
<>
<div className="rounded-md p-5 mb-4" style={{ background: accent, color: "var(--brand-bg)" }}>
<p className="font-display text-xs uppercase tracking-wide opacity-80">{label}</p>
<p className="font-display text-2xl font-normal leading-tight">{day.title}</p>
<p className="text-sm opacity-90 mt-1">{day.focus} &middot; {rule.focus}</p>
</div>

<a href={music.href} target="_blank" rel="noopener noreferrer"
className="flex items-center justify-between rounded-md border p-4 mb-3"
style={{ borderColor: "rgba(30,215,96,0.4)", background: "rgba(30,215,96,0.08)" }}>
<span className="text-sm font-medium text-brand-text">{music.label}</span>
<span className="font-display text-xs flex-shrink-0 ml-3" style={{ color: "#1ED760" }}>Open Spotify</span>
</a>

<button onClick={function () { setOpenWarmup(!openWarmup); }} className={panel}>
<span className="font-display text-sm">Warm up</span>
<span className="text-xs text-brand-muted">{openWarmup ? "Hide" : "Show"}</span>
</button>
{openWarmup ? (
<div className="rounded-md border border-brand-line bg-brand-surface p-4 mb-3">
{day.warmup.map(function (w, i) {
return <p key={i} className="text-sm text-brand-muted mb-1">&middot; {w}</p>;
})}
</div>
) : null}

{day.exercises.map(function (ex, i) {
// KEYED BY DAY AND EXERCISE, NOT BY POSITION.
//
// With key={i} React reused the same ExerciseCard instance across a day change, and
// ExerciseCard seeds its input boxes in a useState initialiser that only runs on mount.
// So Friday's Back Squat inherited Thursday's Bench Press numbers, Romanian Deadlift
// inherited Weighted Dips, and Leg Press inherited Barbell Row: every box one day stale,
// matched by position in the list. Every label around them recomputed from props and was
// correct, which is exactly why the card looked right and read wrong.
//
// Same bug and same fix as the HYROX stations further down this file.
return (
<ExerciseCard key={day.key + "|" + ex.name} ex={ex} exIdx={i} dayKey={day.key} profile={profile}
weekPct={rule.pct} accent={accent} homeMode={homeMode} done={!!done[i]}
maxes={maxes} isTestWeek={isTestWeek} holdProgression={holdProgression}
last={lastSets ? lastSets[(ex.name || "").toLowerCase()] : null}
onComplete={onComplete} onReopen={onReopen} onAvoid={onAvoid}
logged={loggedThisWeek ? loggedThisWeek[(ex.name || "").toLowerCase()] : null} />
);
})}

{day.conditioning && day.conditioning.length ? (
<div className="rounded-md border border-brand-line bg-brand-surface p-4 mb-3">
<div className="flex items-center justify-between mb-1">
<p className="font-display text-xs uppercase tracking-wide" style={{ color: accent }}>10 minute finisher</p>
<a href={stationTunes.href} target="_blank" rel="noopener noreferrer"
className="font-display text-xs" style={{ color: "#1ED760" }}>Loud tunes</a>
</div>
<p className="text-xs text-brand-muted mb-3">
Optional. Does not count towards your score, and the session logs without it.
Log a number if you do it and you will have something to beat next time.
</p>
{day.conditioning.map(function (c, i) {
const sk = stationKey(c);
// Already logged this week shows what was done, same rule as the exercise cards.
const priorRows = loggedThisWeek ? loggedThisWeek[(c.name || "").toLowerCase()] : null;
const prior = priorRows && priorRows.length ? (priorRows[0].time_text || "") : "";
const v = stations[sk] !== undefined ? stations[sk] : prior;
const isLogged = !!loggedStations[sk] || !!prior;
const rounds = c.log === "rounds" ? (Number(c.rounds) || 5) : 0;
const doneRounds = rounds ? Number(String(v).match(/^\d+/) || 0) : 0;
// A sled is measured in metres. It used to be ticked off in rounds, which made it the odd
// one out next to SkiErg and Row: those hand you a number to beat and five ticks tell you
// nothing about the load or the floor you pushed it on.
const distance = c.log === "distance";
return (
<div key={i} className="mb-4">
<div className="flex items-center gap-2">
{isLogged ? <span className="text-sm" style={{ color: "#3DDC97" }} aria-hidden="true">&#10003;</span> : null}
<p className="font-display text-sm">{c.name}</p>
</div>
<p className="text-xs text-brand-muted mb-2">{c.target} &middot; {c.note}</p>
{/* Rounds get ticked off. A time gets typed. See the note on HYROX_STATIONS for why
    these are not the same question. */}
{rounds ? (
<div className="flex gap-1.5 flex-wrap mb-2">
{Array.from({ length: rounds }).map(function (_, r) {
const on = r < doneRounds;
return (
<button key={r} type="button"
onClick={function () {
// Tapping the round you are already on clears back to it, so an over-tap is
// one tap to undo rather than a reset.
const next = (r + 1 === doneRounds) ? r : r + 1;
setStations(function (st) {
const o = Object.assign({}, st);
o[sk] = next ? next + "/" + rounds + " rounds" : "";
return o;
});
}}
className="w-9 h-9 rounded-sm font-display text-xs border"
style={on
  ? { borderColor: accent, background: accent, color: "var(--brand-bg)" }
  : { borderColor: "var(--brand-line)", color: "var(--brand-dim)" }}>
{r + 1}
</button>
);
})}
</div>
) : null}
<div className="flex gap-2">
{!rounds ? (
<input
type="text"
inputMode={distance ? "numeric" : "text"}
placeholder={distance ? (c.target_m ? "metres, e.g. " + c.target_m : "metres") : "your time"}
value={v}
onChange={function (e) {
const val = e.target.value;
setStations(function (st) {
const next = Object.assign({}, st);
next[sk] = val;
return next;
});
}}
className={field}
/>
) : null}
<button
onClick={function () {
onStation(c, v);
if (v) setLoggedStations(function (l) {
const next = Object.assign({}, l);
next[sk] = true;
return next;
});
}}
className="px-5 rounded-md font-display text-sm flex-shrink-0"
style={{ background: isLogged ? "rgba(61,220,151,0.2)" : accent, color: isLogged ? "#3DDC97" : "#000000",
flexGrow: rounds ? 1 : 0 }}
>
{isLogged ? "Logged" : "Log"}
</button>
</div>
</div>
);
})}
</div>
) : null}

{flow ? (
<>
<button onClick={function () { setOpenFlow(!openFlow); }} className={panel}>
<span>
<span className="font-display text-sm block">{flow.name}</span>
<span className="text-xs text-brand-muted">Optional. Does not count towards your score.</span>
</span>
<span className="text-xs text-brand-muted">{openFlow ? "Hide" : "Show"}</span>
</button>
{openFlow ? (
<div className="rounded-md p-4 mb-3 border" style={{ borderColor: "rgba(61,220,151,0.35)", background: "rgba(61,220,151,0.08)" }}>
{flow.moves.map(function (m, i) {
return <p key={i} className="text-sm text-brand-muted mb-1">&middot; {m}</p>;
})}
</div>
) : null}
</>
) : null}

{finished ? (
<div className="rounded-md p-5 mb-6 text-center border" style={{ borderColor: accent, background: "var(--brand-surface)" }}>
<div className="flex justify-center mb-2"><SessionFanfare typeId={tid} dayKey={day ? day.key : ""} size={54} /></div>
<p className="font-display text-base font-normal">{sessionDone(tid)}</p>
<p className="text-xs text-brand-muted mt-1">Session logged.</p>
<a href="/dashboard" className="inline-block mt-4 text-sm underline" style={{ color: accent }}>Back to dashboard</a>
</div>
) : (
<button onClick={onFinish} className="w-full py-5 rounded-md font-display text-lg mb-6"
style={{ background: accent, color: "var(--brand-bg)" }}>
Finish session
</button>
)}

{/* Last in the tree so its spacer lands at the end of the page. The bar itself is
fixed to the bottom of the viewport, so where it sits here only decides where the
spacer goes, and the spacer is what stops it covering the Finish button. */}
<RestTimer accent={accent} />
</>
);
}
