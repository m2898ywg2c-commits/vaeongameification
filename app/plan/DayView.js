"use client";

import { useState, useEffect } from "react";
import { stretchFor } from "@/lib/exercisedb";
import { sessionMusic, stationMusic } from "@/lib/music";
import ExerciseCard from "./ExerciseCard";
import RestTimer from "./RestTimer";
import TypeOrb from "../TypeOrb";
import { sessionDone } from "@/lib/voice";

const SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function DayView({ day, active, profile, rule, accent, deep, tid, homeMode, done, maxes, isTestWeek, lastSets, onComplete, onReopen, finished, onFinish, onStation }) {
const [openWarmup, setOpenWarmup] = useState(false);
const [openFlow, setOpenFlow] = useState(false);
const [stations, setStations] = useState({});
const [loggedStations, setLoggedStations] = useState({});

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
const music = sessionMusic(day, profile.birth_year);
const stationTunes = stationMusic(profile.birth_year);
const label = profile.fixed_days === false
? "Session " + (active + 1)
: (day.dayLabel === SHORT[new Date().getDay()] ? "Today" : day.dayLabel);

const panel = "w-full flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-4 mb-3 text-left";
const field = "w-full px-3 py-3 rounded-xl bg-white/10 border-2 border-white/15 text-base font-bold text-center text-white placeholder-gray-500";

return (
<>
<div className="rounded-2xl p-5 mb-4" style={{ background: "linear-gradient(135deg, " + accent + ", " + deep + ")" }}>
<p className="text-xs font-bold uppercase tracking-wide opacity-80">{label}</p>
<p className="text-2xl font-bold leading-tight">{day.title}</p>
<p className="text-sm opacity-90 mt-1">{day.focus} &middot; {rule.focus}</p>
</div>

<a href={music.href} target="_blank" rel="noopener noreferrer"
className="flex items-center justify-between rounded-2xl border p-4 mb-3"
style={{ borderColor: "rgba(30,215,96,0.4)", background: "rgba(30,215,96,0.08)" }}>
<span className="text-sm font-medium text-gray-200">{music.label}</span>
<span className="text-xs font-bold flex-shrink-0 ml-3" style={{ color: "#1ED760" }}>Open Spotify</span>
</a>

<button onClick={function () { setOpenWarmup(!openWarmup); }} className={panel}>
<span className="text-sm font-bold">Warm up</span>
<span className="text-xs text-gray-400">{openWarmup ? "Hide" : "Show"}</span>
</button>
{openWarmup ? (
<div className="rounded-2xl border border-white/10 bg-white/5 p-4 mb-3">
{day.warmup.map(function (w, i) {
return <p key={i} className="text-sm text-gray-300 mb-1">&middot; {w}</p>;
})}
</div>
) : null}

<RestTimer accent={accent} />

{day.exercises.map(function (ex, i) {
return (
<ExerciseCard key={i} ex={ex} exIdx={i} dayKey={day.key} profile={profile}
weekPct={rule.pct} accent={accent} homeMode={homeMode} done={!!done[i]}
maxes={maxes} isTestWeek={isTestWeek}
last={lastSets ? lastSets[(ex.name || "").toLowerCase()] : null}
onComplete={onComplete} onReopen={onReopen} />
);
})}

{day.conditioning && day.conditioning.length ? (
<div className="rounded-2xl border border-white/10 bg-white/5 p-4 mb-3">
<div className="flex items-center justify-between mb-1">
<p className="text-xs font-bold uppercase tracking-wide" style={{ color: accent }}>10 minute finisher</p>
<a href={stationTunes.href} target="_blank" rel="noopener noreferrer"
className="text-xs font-bold" style={{ color: "#1ED760" }}>Loud tunes</a>
</div>
<p className="text-xs text-gray-400 mb-3">
Optional. Does not count towards your score, and the session logs without it.
Log a number if you do it and you will have something to beat next time.
</p>
{day.conditioning.map(function (c, i) {
const v = stations[i] || "";
const isLogged = !!loggedStations[i];
return (
<div key={i} className="mb-4">
<div className="flex items-center gap-2">
{isLogged ? <span className="text-sm" style={{ color: "#3DDC97" }} aria-hidden="true">&#10003;</span> : null}
<p className="text-sm font-bold">{c.name}</p>
</div>
<p className="text-xs text-gray-400 mb-2">{c.target} &middot; {c.note}</p>
<div className="flex gap-2">
<input
type="text"
placeholder="your time or score"
value={v}
onChange={function (e) {
const val = e.target.value;
setStations(function (s) {
const next = Object.assign({}, s);
next[i] = val;
return next;
});
}}
className={field}
/>
<button
onClick={function () {
onStation(c, v);
if (v) setLoggedStations(function (l) {
const next = Object.assign({}, l);
next[i] = true;
return next;
});
}}
className="px-5 rounded-xl font-bold text-sm flex-shrink-0"
style={{ background: isLogged ? "rgba(61,220,151,0.2)" : accent, color: isLogged ? "#3DDC97" : "#000000" }}
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
<span className="text-sm font-bold block">{flow.name}</span>
<span className="text-xs text-gray-400">Optional. Does not count towards your score.</span>
</span>
<span className="text-xs text-gray-400">{openFlow ? "Hide" : "Show"}</span>
</button>
{openFlow ? (
<div className="rounded-2xl p-4 mb-3 border" style={{ borderColor: "rgba(61,220,151,0.35)", background: "rgba(61,220,151,0.08)" }}>
{flow.moves.map(function (m, i) {
return <p key={i} className="text-sm text-gray-300 mb-1">&middot; {m}</p>;
})}
</div>
) : null}
</>
) : null}

{finished ? (
<div className="rounded-2xl p-5 mb-6 text-center border-2" style={{ borderColor: accent, background: "rgba(255,255,255,0.04)" }}>
<div className="flex justify-center mb-2"><TypeOrb typeId={tid} size={54} /></div>
<p className="text-base font-bold">{sessionDone(tid)}</p>
<p className="text-xs text-gray-400 mt-1">Session logged.</p>
<a href="/dashboard" className="inline-block mt-4 text-sm underline" style={{ color: accent }}>Back to dashboard</a>
</div>
) : (
<button onClick={onFinish} className="w-full py-5 rounded-2xl font-bold text-lg mb-6"
style={{ background: "linear-gradient(135deg, " + accent + ", " + deep + ")", color: "#fff" }}>
Finish session
</button>
)}
</>
);
}
