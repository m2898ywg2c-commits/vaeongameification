"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { TYPES, isFreestyle } from "@/lib/personality";
import { buildWeek, primaryCategory, defaultSessionType } from "@/lib/training";
import { currentWeek, weeksFor, BLOCK_WEEKS, estimateMax } from "@/lib/progression";
import { isGymReady, buildGymWeek, blockWeeksFor, currentWeekIn } from "@/lib/gymready";
import { quoteFor, sessionIntro, praiseFor } from "@/lib/voice";
import { track, rememberIdentity, EVENTS } from "@/lib/events";
import TypeOrb from "../TypeOrb";
import DayView from "./DayView";
import GymDayView from "./GymDayView";

const SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const TAB_KEY = "vaeon-plan-tab";

// Monday, local time. Used to work out which of this week's sessions are already done, so
// a freestyle user can be dropped on the next one they have not touched. Matches the
// week boundary the dashboard and the leaderboard already use.
function startOfThisWeek() {
const d = new Date();
const day = (d.getDay() + 6) % 7;
d.setHours(0, 0, 0, 0);
d.setDate(d.getDate() - day);
return d.toISOString();
}

export default function PlanPage() {
const router = useRouter();
const [supabase] = useState(function () { return createClient(); });
const [loading, setLoading] = useState(true);
const [profile, setProfile] = useState(null);
const [typeId, setTypeId] = useState(null);
const [days, setDays] = useState([]);
const [active, setActive] = useState(0);
const [done, setDone] = useState({});
const [praise, setPraise] = useState(null);
const [count, setCount] = useState(0);
const [showQuote, setShowQuote] = useState(true);
const [finished, setFinished] = useState(false);
const [maxes, setMaxes] = useState({});
const [freestyle, setFreestyle] = useState(false);
const [doneKeys, setDoneKeys] = useState({});
const [lastSets, setLastSets] = useState({});

useEffect(function () {
async function load() {
const { data: { user } } = await supabase.auth.getUser();
if (!user) { router.push("/login"); return; }
const { data: p } = await supabase.from("profiles").select("*").eq("id", user.id).single();
if (!p || !p.goals || p.goals.length === 0) { router.push("/onboarding"); return; }
const { data: a } = await supabase.from("assessment_results").select("*")
.eq("user_id", user.id).order("completed_at", { ascending: false }).limit(1).maybeSingle();
const { data: lm } = await supabase.from("lift_maxes").select("exercise, est_max").eq("user_id", user.id);
const map = {};
(lm || []).forEach(function (r) { map[(r.exercise || "").toLowerCase()] = Number(r.est_max); });

// What was actually done last time, set by set.
//
// The most-praised feature in every workout tracker worth copying, and the one thing
// this app asked people to do from memory. lift_maxes already holds an ESTIMATED max
// per lift, which is what the prescription is built from, but an estimate is not the
// same as "you did 60kg for 8, 8 and 6 on Tuesday and the last one was a grind".
//
// Fetched as a flat recent slice and grouped here rather than asked for per exercise.
// One query beats eight, and at this volume the whole table is smaller than the
// round trips would be.
const { data: recentLogs } = await supabase.from("exercise_logs")
.select("exercise, set_index, weight, reps, time_text, logged_at")
.eq("user_id", user.id)
.order("logged_at", { ascending: false })
.limit(400);

const lastByExercise = {};
(recentLogs || []).forEach(function (r) {
const key = (r.exercise || "").toLowerCase();
if (!key) return;
const day = String(r.logged_at).slice(0, 10);
// Rows arrive newest first, so the first day seen for an exercise is the most recent
// one. Anything older is ignored: "last time" means one session, not a merge of
// several, or a set you did a fortnight ago could reappear alongside yesterday's.
if (!lastByExercise[key]) lastByExercise[key] = { day: day, sets: [] };
if (lastByExercise[key].day !== day) return;
lastByExercise[key].sets.push(r);
});
Object.keys(lastByExercise).forEach(function (k) {
lastByExercise[k].sets.sort(function (a, b) { return (a.set_index || 0) - (b.set_index || 0); });
});
// Gym ready users bring their own plan, so the week is empty slots rather than
// prescribed sessions.
const week = isGymReady(p.goals)
? buildGymWeek(p.sessions_per_week || 3)
: buildWeek(p.goals, p.sessions_per_week || 3);
// Freestyle types land on a choice, not on a weekday.
//
// A Hunter or a Wanderer opening the app on a Wednesday and being shown "Wednesday"
// is the app telling them the schedule decides, which is precisely what their type
// screen promised would not happen. Landing them on the first session they have not
// logged yet turns the same week into a pool with an obvious next pick, without
// changing a single exercise, the progression, or how adherence is scored.
const free = isFreestyle(a ? a.type_id : null);
const loggedKeys = {};
(await supabase.from("exercise_logs").select("day_key")
.eq("user_id", user.id)
.gte("logged_at", startOfThisWeek())).data?.forEach(function (r) { loggedKeys[r.day_key] = true; });

let idx;
if (free) {
idx = week.findIndex(function (d) { return !loggedKeys[d.key]; });
if (idx < 0) idx = 0;
} else {
idx = week.findIndex(function (d) { return d.dayLabel === SHORT[new Date().getDay()]; });
if (idx < 0) idx = 0;
}
// Numbered-session users have no natural "today", so put them back on the tab they
// last had open. Day-of-week users still land on today, which is the better default.
// Freestyle types are excluded: their default is "the next one you have not done",
// which is a better answer than whichever tab they happened to close on.
if (p.fixed_days === false && !free) {
try {
const saved = Number(window.localStorage.getItem(TAB_KEY));
if (!isNaN(saved) && saved >= 0 && saved < week.length) idx = saved;
} catch (e) {}
}
setProfile(p);
setTypeId(a ? a.type_id : null);
setMaxes(map);
setDays(week);
setActive(idx);
setFreestyle(free);
setDoneKeys(loggedKeys);
setLastSets(lastByExercise);
setLoading(false);

// Identity first, so the events this page fires carry a type rather than a null.
rememberIdentity(user.id, a ? a.type_id : null, p.framing);
track(supabase, EVENTS.PLAN_VIEWED, {
gym: isGymReady(p.goals),
sessions_per_week: p.sessions_per_week || 3,
fixed_days: p.fixed_days !== false,
// The six-week question: do freestyle types behave differently now that the plan
// stops pretending they are not freestyle?
freestyle: free,
done_this_week: Object.keys(loggedKeys).length,
});
}
load();
}, [supabase, router]);

const type = typeId ? TYPES[typeId] : null;
const tid = typeId || "architect";
const accent = type ? type.colors[0] : "#4CC9F0";
const deep = type ? type.colors[1] : "#3D2E8C";
const day = days[active] || null;
const gym = profile ? isGymReady(profile.goals) : false;
const blockWeeks = profile ? blockWeeksFor(profile) : BLOCK_WEEKS;
const weekNo = profile ? currentWeekIn(profile.block_start, blockWeeks) : 1;
// Gym ready has no testing week: Vaeon is not setting the loads, so there is nothing
// to calibrate and no reason to interrupt someone following their coach's programme.
const isTestWeek = !gym && weekNo === 1;
const cat = profile ? primaryCategory(profile.goals) : "general";
const rule = weeksFor(cat)[weekNo - 1] || weeksFor(cat)[0];
const homeMode = profile && profile.equipment && profile.equipment !== "gym";
const noBaselines = profile && !gym && !profile.baseline_bench && !profile.baseline_squat;

async function completeSet(ex, exIdx, fields, total, kind) {
const { data: { user } } = await supabase.auth.getUser();
if (user && day) {
const rows = [];
for (let i = 0; i < total; i++) {
const v = fields[i] || {};
rows.push({
user_id: user.id, day_key: day.key, exercise: ex.name, set_index: i + 1,
weight: kind === "weight" && v.weight ? Number(v.weight) : null,
reps: v.reps ? Number(v.reps) : null,
// The unit rides along in the field rather than as another argument, because
// a run is logged in minutes and a plank in seconds. Defaulting to sec keeps
// older callers and the Gym ready path behaving as they did.
time_text: kind === "time" ? (v.secs ? v.secs + " " + (v.unit || "sec") : null) : (kind === "distance" ? (v.text || null) : null),
});
}
await supabase.from("exercise_logs").insert(rows);

// One event per exercise, not per set. Sets are a property of the exercise here, and
// counting them separately would make a five-set squat look like five times the
// engagement of a one-set deadlift when comparing types.
track(supabase, EVENTS.EXERCISE_LOGGED, {
exercise: ex.name, sets: total, kind: kind, day_key: day.key,
week: weekNo, test_week: isTestWeek,
});

// Learn this lift's max from what was actually done, so the plan builds off real data.
// Gym ready logs feed this too, which is why block titles are canonicalised: without
// that, one lift would fragment across several spellings and the trends would be junk.
if (kind === "weight") {
let best = 0;
for (let i = 0; i < total; i++) {
const v = fields[i] || {};
if (v.weight) {
const est = estimateMax(v.weight, v.reps);
if (est > best) best = est;
}
}
if (best > 0) {
await supabase.rpc("record_lift_max", { p_exercise: ex.name, p_est: best });
setMaxes(function (m) {
const next = Object.assign({}, m);
const key = (ex.name || "").toLowerCase();
next[key] = Math.max(next[key] || 0, best);
return next;
});
}
}
}
const n = count + 1;
setCount(n);
setPraise(praiseFor(tid, n));
setTimeout(function () { setPraise(null); }, 1600);
setDone(function (d) {
const next = Object.assign({}, d);
next[exIdx] = true;
return next;
});
}

function reopen(exIdx) {
setDone(function (d) {
const next = Object.assign({}, d);
delete next[exIdx];
return next;
});
}

async function logStation(station, value) {
if (!value) return;
const { data: { user } } = await supabase.auth.getUser();
if (user && day) {
await supabase.from("exercise_logs").insert({
user_id: user.id, day_key: day.key, exercise: station.name, set_index: 1,
weight: null, reps: null, time_text: value,
});
}
setPraise("Logged");
setTimeout(function () { setPraise(null); }, 1400);
}

async function finish() {
const { data: { user } } = await supabase.auth.getUser();
if (user && day) {
await supabase.from("training_sessions").insert({
user_id: user.id,
session_type: gym ? "Strength" : defaultSessionType(profile.goals, day.key),
duration_min: 60, effort: 3, note: gym ? "Own plan" : day.title,
});
track(supabase, EVENTS.SESSION_LOGGED, {
gym: gym, day_key: day.key, week: weekNo, block: profile.block_number || 1,
exercises_logged: count,
});
}
setFinished(true);
}

if (loading) {
return (
<main className="min-h-screen text-white flex items-center justify-center" style={{ background: "#000000" }}>
<p className="text-sm text-gray-400">Building your session...</p>
</main>
);
}

return (
<main className="min-h-screen text-white px-5 py-6" style={{ background: "#000000" }}>
<div className="max-w-md mx-auto">

{showQuote ? (
<div className="fixed inset-0 z-50 flex items-center justify-center px-6" style={{ background: "rgba(6,8,18,0.94)" }}>
<div className="w-full max-w-sm rounded-3xl p-6 text-center border-2" style={{ borderColor: accent + "66", background: "#141A2E" }}>
<div className="flex justify-center mb-3"><TypeOrb typeId={tid} size={72} /></div>
<p className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: accent }}>{type ? type.name : "Your coach"}</p>
<p className="text-lg font-bold leading-snug mb-4">{quoteFor(tid, active)}</p>
{!gym ? <p className="text-xs text-gray-400 mb-5">{sessionIntro(tid, rule.label)}</p> : <p className="text-xs text-gray-400 mb-5">Log it as you go.</p>}
<button onClick={function () { setShowQuote(false); }} className="w-full py-4 rounded-2xl font-bold"
style={{ background: "linear-gradient(135deg, " + accent + ", " + deep + ")", color: "#fff" }}>Ready</button>
</div>
</div>
) : null}

{praise ? (
<div className="fixed left-0 right-0 bottom-8 z-40 flex justify-center pointer-events-none">
<div className="px-6 py-3 rounded-full font-bold shadow-lg" style={{ background: accent, color: "#000000" }}>{praise}</div>
</div>
) : null}

<a href="/dashboard" className="flex items-center justify-center gap-2 w-full py-4 rounded-2xl font-bold text-base mb-4 border-2"
style={{ borderColor: accent + "66", background: "rgba(255,255,255,0.05)", color: accent }}>
&#8592; Back to dashboard
</a>

<div className="flex items-center gap-3 mb-4">
<TypeOrb typeId={tid} size={40} />
<div>
<p className="text-sm font-bold leading-tight">{type ? type.name : "Your plan"}</p>
<p className="text-xs text-gray-400 leading-tight">
Week {weekNo}/{blockWeeks}{gym ? "" : " · " + rule.label}
</p>
</div>
</div>

{isTestWeek ? (
<div className="rounded-2xl border-2 p-4 mb-3" style={{ borderColor: accent + "66", background: accent + "12" }}>
<p className="text-sm font-bold" style={{ color: accent }}>Testing week</p>
<p className="text-xs text-gray-300">
Week one sets your baselines. On the main lifts, work up to a strong set you could stop with a rep or two left, and log what you used. Every block after this builds off those real numbers.
</p>
</div>
) : null}

{noBaselines && !isTestWeek ? (
<a href="/settings" className="block rounded-2xl border-2 p-4 mb-3" style={{ borderColor: "#FFB020", background: "rgba(255,176,32,0.10)" }}>
<p className="text-sm font-bold" style={{ color: "#FFB020" }}>Enter your starting weights first</p>
<p className="text-xs text-gray-300">No idea what they are? We explain it in bags of sugar.</p>
</a>
) : null}

{freestyle && !gym ? (
<div className="rounded-2xl border-2 p-4 mb-3" style={{ borderColor: accent + "44", background: accent + "0D" }}>
<p className="text-sm font-bold" style={{ color: accent }}>Your sessions this week</p>
<p className="text-xs text-gray-300">
Pick whichever one you fancy today. They all count the same, the order is yours, and
anything you have already done is ticked off below.
</p>
</div>
) : null}

<div className="flex gap-2 overflow-x-auto pb-2 mb-4">
{days.map(function (d, i) {
const on = i === active;
// Freestyle types see what is left rather than what day it is. A tick on a
// completed session turns the strip from a rota into a list to clear, which is
// the whole difference between being told and choosing.
const doneAlready = Boolean(doneKeys[d.key]);
const label = freestyle
? (doneAlready ? "✓ " : "") + (d.title || d.focus || "Session " + (i + 1)).split(" ")[0]
: (profile.fixed_days === false ? "S" + (i + 1) : d.dayLabel);
return (
<button key={d.key} onClick={function () {
setActive(i); setFinished(false); setDone({});
try { window.localStorage.setItem(TAB_KEY, String(i)); } catch (e) {}
track(supabase, EVENTS.DAY_OPENED, {
day_key: d.key, index: i, week: weekNo, freestyle: freestyle, already_done: doneAlready,
});
}}
className="px-4 py-3 rounded-xl text-sm font-bold flex-shrink-0 border"
style={on ? { background: accent, color: "#000000", borderColor: accent }
: { background: "rgba(255,255,255,0.05)", color: doneAlready ? "#64748b" : "#cbd5e1", borderColor: "rgba(255,255,255,0.1)" }}>
{label}
</button>
);
})}
</div>

{gym ? (
<GymDayView day={day} active={active} profile={profile} accent={accent} deep={deep}
tid={tid} done={done} onComplete={completeSet} onReopen={reopen}
finished={finished} onFinish={finish} />
) : (
<DayView day={day} active={active} profile={profile} rule={rule} accent={accent} deep={deep}
tid={tid} homeMode={homeMode} done={done} maxes={maxes} isTestWeek={isTestWeek} lastSets={lastSets}
onComplete={completeSet} onReopen={reopen} finished={finished} onFinish={finish} onStation={logStation} />
)}
</div>
</main>
);
}
