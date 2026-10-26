"use client";

import { useState, useEffect, useRef } from "react";
import { stretchFor } from "@/lib/exercisedb";
import { sessionMusic, stationMusic } from "@/lib/music";
import ExerciseCard from "./ExerciseCard";
import RestTimer from "./RestTimer";
import TypeOrb from "../TypeOrb";
import TypeCharacter from "../TypeCharacter";
import SessionFanfare from "./SessionFanfare";
import { sessionDone } from "@/lib/voice";

const SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function DayView({ day, active, profile, rule, accent, deep, tid, homeMode, done, maxes, isTestWeek, lastSets, weekBests, liftSessions, weekNo, ladder, holdProgression, onComplete, onReopen, finished, onFinish, onStation, onAvoid, loggedThisWeek }) {
const [openWarmup, setOpenWarmup] = useState(false);
const [openFlow, setOpenFlow] = useState(false);
// KEYED BY DAY AND STATION NAME, NOT BY INDEX.
//
// Every day has exactly one station, so the index was always 0. DayView is not unmounted
// when you switch day, it just gets a new `day` prop, so index 0 on Monday and index 0 on
// Tuesday shared one box and your SkiErg time appeared under Row. Same class of bug as the
// per-exercise completion that used to vanish on reload.
const [stations, setStations] = useState({});
// ---- the pager ----------------------------------------------------------------------
const trackRef = useRef(null);
const [panel, setPanel] = useState(0);
const [openList, setOpenList] = useState(false);

// READ THE POSITION OFF THE ELEMENTS, NOT OFF clientWidth.
//
// The panels are narrower than the track and separated by a gap, so dividing scrollLeft by
// the track width drifts and is half a panel out by the seventh exercise.
function nearestPanel(track) {
const els = track.querySelectorAll("[data-panel]");
const mid = track.scrollLeft + track.clientWidth / 2;
let best = 0;
let bestD = Infinity;
for (let i = 0; i < els.length; i++) {
const c = els[i].offsetLeft + els[i].offsetWidth / 2;
const d = Math.abs(c - mid);
if (d < bestD) { bestD = d; best = i; }
}
return best;
}

// Coalesced to one frame. A scroll event fires dozens of times a swipe and setState on
// every one of them re-renders seven ExerciseCards mid-gesture, which stutters.
const scrollRaf = useRef(0);
function onTrackScroll(e) {
const track = e.currentTarget;
if (scrollRaf.current) return;
scrollRaf.current = requestAnimationFrame(function () {
scrollRaf.current = 0;
if (!track) return;
const p = nearestPanel(track);
setPanel(function (cur) { return p === cur ? cur : p; });
});
}

// scrollIntoView rather than a computed scrollLeft, because with scroll-snap-type set to
// mandatory the browser re-snaps to the NEAREST snap point after any layout change and
// quietly corrects a hand-computed position to the neighbouring panel. Letting the browser
// resolve the target means the snap engine and this code agree about where it went.
// block: "nearest" matters too, or logging a set scrolls the whole page vertically.
function goPanel(i) {
const track = trackRef.current;
if (!track) return;
const els = track.querySelectorAll("[data-panel]");
const n = els.length;
const next = Math.max(0, Math.min(n - 1, i));
if (els[next]) els[next].scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
setPanel(next);
}

// How many sets of an exercise are logged, for the session list. Same source as the cards.
function setsLogged(ex, i) {
const rows = loggedThisWeek ? loggedThisWeek[(ex.name || "").toLowerCase()] : null;
if (!rows) return 0;
const need = Math.max(1, Number(ex.sets) || 1);
let have = 0;
for (let k = 0; k < need; k++) if (rows[k]) have++;
return have;
}

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

const panelCls = "w-full flex items-center justify-between rounded-md border border-brand-line bg-brand-surface p-4 mb-3 text-left";
const panel2 = panelCls;
const doneExercises = day.exercises.filter(function (ex, i) { return !!done[i]; }).length;
const field = "w-full px-3 py-3 rounded-md bg-brand-field border border-brand-line font-display text-base font-normal text-center text-brand-text placeholder-brand-dim";

return (
<>
<div className="rounded-md p-5 mb-4" style={{ background: accent, color: "var(--brand-bg)" }}>
<p className="font-display text-sm uppercase tracking-wide opacity-80">{label}</p>
<p className="font-display text-2xl font-normal leading-tight">{day.title}</p>
<p className="text-sm opacity-90 mt-1">{day.focus} &middot; {rule.focus}</p>
</div>

<a href={music.href} target="_blank" rel="noopener noreferrer"
className="flex items-center justify-between rounded-md border p-4 mb-3"
style={{ borderColor: "rgba(30,215,96,0.4)", background: "rgba(30,215,96,0.08)" }}>
<span className="text-sm font-medium text-brand-text">{music.label}</span>
<span className="font-display text-sm flex-shrink-0 ml-3" style={{ color: "#1ED760" }}>Open Spotify</span>
</a>

<button onClick={function () { setOpenWarmup(!openWarmup); }} className={panelCls}>
<span className="font-display text-sm">Warm up</span>
<span className="text-base text-brand-muted">{openWarmup ? "Hide" : "Show"}</span>
</button>
{openWarmup ? (
<div className="rounded-md border border-brand-line bg-brand-surface p-4 mb-3">
{day.warmup.map(function (w, i) {
return <p key={i} className="text-sm text-brand-muted mb-1">&middot; {w}</p>;
})}
</div>
) : null}

{/* ==================================================================================
    ONE EXERCISE PER SCREEN, SWIPED. Added 2026-09-12, at James's request.

    This was a vertical list of every card in the session, which is why the cards had to
    be small: seven exercises deep on a Wednesday, so each one competed for a phone
    screen and lost. A pager gives every exercise the whole width and the size problem
    mostly solves itself.

    NATIVE SCROLL-SNAP, NO LIBRARY. The track is this same list with different CSS on the
    container, so the keying, the props and the state below are untouched. The platform's
    own momentum and rubber-banding come free, and they are most of what makes a pager
    feel right and most of what a hand-rolled drag handler gets wrong.

    THREE LINES DO THE REAL WORK, AND EACH IS THERE FOR A REASON.

    overscrollBehaviorX: "contain" stops a swipe past the last panel chaining up to the
    browser and firing its back gesture. Without it you lose the session mid-workout.

    scrollSnapStop: "always" makes one flick move one exercise. Without it a firm swipe
    skims three and you have no idea where you are.

    The panels are INSET rather than full bleed: flex-basis 100% inside a track with 22px
    of padding, which resolves against the track's CONTENT box and so comes out at the
    track width minus 44. Writing calc(100% - 44px) here subtracts the inset twice and
    leaves the panel at about 72 percent of the screen, which I did once already. Nothing in CSS outranks a system gesture, so the edge-swipe-back on both iOS
    and Android cannot be overridden, only avoided: a swipe that starts on a panel is
    unambiguously ours and the screen edge stays the phone's. The sliver of the next
    panel that falls out of this is also the only thing telling anyone it swipes at all.
    ================================================================================== */}
<div
ref={trackRef}
onScroll={onTrackScroll}
className="pager flex mb-3"
style={{
overflowX: "auto", overflowY: "hidden",
scrollSnapType: "x mandatory",
overscrollBehaviorX: "contain",
WebkitOverflowScrolling: "touch",
gap: 10, paddingInline: 22, scrollPaddingInline: 22,
}}
>
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
<section key={day.key + "|" + ex.name}
data-panel={i}
aria-roledescription="slide"
aria-label={"Exercise " + (i + 1) + " of " + day.exercises.length + ", " + ex.name}
style={{
flex: "0 0 100%",
scrollSnapAlign: "center", scrollSnapStop: "always",
overflowY: "auto", overscrollBehaviorY: "contain",
WebkitOverflowScrolling: "touch",
maxHeight: "72vh",
}}>
{/* The section's aria-label already says this, so it is decoration to a screen reader. */}
<p aria-hidden="true" className="font-display mb-2 text-brand-muted" style={{ fontSize: "0.8125rem", letterSpacing: "0.22em", textTransform: "uppercase" }}>
Exercise {i + 1} of {day.exercises.length}
</p>
<ExerciseCard ex={ex} exIdx={i} dayKey={day.key} profile={profile}
weekPct={rule.pct} accent={accent} homeMode={homeMode} done={!!done[i]}
maxes={maxes} isTestWeek={isTestWeek} holdProgression={holdProgression}
last={lastSets ? lastSets[(ex.name || "").toLowerCase()] : null}
history={weekBests ? weekBests[(ex.name || "").toLowerCase()] : null}
sessions={liftSessions ? liftSessions[(ex.name || "").toLowerCase()] : null}
weekNo={weekNo} ladder={ladder}
onComplete={onComplete} onReopen={onReopen} onAvoid={onAvoid} typeId={tid}
logged={loggedThisWeek ? loggedThisWeek[(ex.name || "").toLowerCase()] : null} />
</section>
);
})}
</div>

{/* A SWIPE IS INVISIBLE, UNRELIABLE WITH WET HANDS, AND UNAVAILABLE TO A KEYBOARD.
    So the gesture is the fast path and these are the contract. 56px each, always there. */}
<div className="flex items-center gap-2 mb-3">
<button onClick={function () { goPanel(panel - 1); }} disabled={panel === 0}
aria-label="Previous exercise"
className="grid place-items-center rounded-md border border-brand-line-strong text-brand-text"
style={{ width: 56, height: 56, flex: "0 0 56px", opacity: panel === 0 ? 0.3 : 1 }}>
<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"
style={{ fill: "none", stroke: "currentColor", strokeWidth: 1.5, strokeLinejoin: "miter" }}>
<polyline points="15 5 8 12 15 19" />
</svg>
</button>

<div className="flex-1 flex items-center justify-center" style={{ gap: 5 }}>
{day.exercises.map(function (ex, i) {
return (
<button key={i} onClick={function () { goPanel(i); }}
aria-label={"Go to " + ex.name}
aria-current={i === panel ? "true" : "false"}
className="grid place-items-center"
style={{ flex: "1 1 0", maxWidth: 34, height: 44, background: "transparent", border: 0 }}>
<span style={{
display: "block", width: "100%",
height: i === panel ? 6 : 4,
borderRadius: 2,
background: done[i] ? accent : (i === panel ? "var(--brand-text)" : "var(--brand-line-strong)"),
}} />
</button>
);
})}
</div>

<button onClick={function () { goPanel(panel + 1); }} disabled={panel >= day.exercises.length - 1}
aria-label="Next exercise"
className="grid place-items-center rounded-md border border-brand-line-strong text-brand-text"
style={{ width: 56, height: 56, flex: "0 0 56px", opacity: panel >= day.exercises.length - 1 ? 0.3 : 1 }}>
<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"
style={{ fill: "none", stroke: "currentColor", strokeWidth: 1.5, strokeLinejoin: "miter" }}>
<polyline points="9 5 16 12 9 19" />
</svg>
</button>
</div>

{/* THE ONE THING A PAGER TAKES AWAY is the answer to "how much is left", which a scrolling
    list gave you for free. This is that answer, and it doubles as the jump menu for the
    days when the sled is busy and you want to come back to it. */}
<button onClick={function () { setOpenList(!openList); }} className={panel2}>
<span className="font-display text-base">This session</span>
<span className="text-base text-brand-muted">{doneExercises} of {day.exercises.length} done</span>
</button>
{openList ? (
<div className="rounded-md border border-brand-line bg-brand-surface mb-3">
{day.exercises.map(function (ex, i) {
return (
<button key={i} onClick={function () { setOpenList(false); goPanel(i); }}
className="w-full flex items-center justify-between px-4 text-left"
style={{
minHeight: 56,
borderBottom: i === day.exercises.length - 1 ? "none" : "1px solid var(--brand-line)",
}}>
<span className="text-base" style={{ color: i === panel ? accent : "var(--brand-text)", opacity: done[i] ? 0.6 : 1 }}>
{ex.name}
</span>
<span className="font-display text-base text-brand-muted">{setsLogged(ex, i)}/{Math.max(1, Number(ex.sets) || 1)}</span>
</button>
);
})}
</div>
) : null}

{day.conditioning && day.conditioning.length ? (
<div className="rounded-md border border-brand-line bg-brand-surface p-4 mb-3">
<div className="flex items-center justify-between mb-1">
<p className="font-display text-sm uppercase tracking-wide" style={{ color: accent }}>10 minute finisher</p>
<a href={stationTunes.href} target="_blank" rel="noopener noreferrer"
className="font-display text-sm" style={{ color: "#1ED760" }}>Loud tunes</a>
</div>
<p className="text-base text-brand-muted mb-3">
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
<p className="text-base text-brand-muted mb-2">{c.target} &middot; {c.note}</p>
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
className="rounded-sm font-display text-base border"
style={Object.assign({ width: 48, height: 48 }, on
  ? { borderColor: accent, background: accent, color: "var(--brand-bg)" }
  : { borderColor: "var(--brand-line)", color: "var(--brand-dim)" })}>
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
<button onClick={function () { setOpenFlow(!openFlow); }} className={panelCls}>
<span>
<span className="font-display text-sm block">{flow.name}</span>
<span className="text-base text-brand-muted">Optional. Does not count towards your score.</span>
</span>
<span className="text-base text-brand-muted">{openFlow ? "Hide" : "Show"}</span>
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
<p className="text-base text-brand-muted mt-1">Session logged.</p>
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
