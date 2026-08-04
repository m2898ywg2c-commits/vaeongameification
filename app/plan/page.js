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
import { currentScheme, accentFor, deepFor } from "@/lib/theme";
import TypeOrb from "../TypeOrb";
import TypeCharacter from "../TypeCharacter";
import DayView from "./DayView";
import GymDayView from "./GymDayView";

const SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const TAB_KEY = "vaeon-plan-tab";

// Monday, local time. Used to work out which of this week's sessions are already done, so
// a freestyle user can be dropped on the next one they have not touched. Matches the
// week boundary the dashboard and the leaderboard already use.
// Which exercises in a day already have logs this week.
//
// Matched on the exercise name rather than the index, because a swapped exercise logs
// under its original name on purpose (see the note in ExerciseCard) and an index would
// drift the moment the plan changed.
function doneFor(day, weekLogs) {
  if (!day || !day.exercises || !weekLogs) return {};
  const forDay = weekLogs[day.key] || {};
  const out = {};
  day.exercises.forEach(function (ex, i) {
    if (forDay[(ex.name || "").toLowerCase()]) out[i] = true;
  });
  return out;
}

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
const [avoided, setAvoided] = useState({});
// What has already been logged this week, by day and by exercise. See the note where it
// is built for why per-exercise completion could not survive a reload without it.
const [weekLogs, setWeekLogs] = useState({});

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
.select("exercise, set_index, weight, reps, time_text, distance_km, duration_min, side, logged_at")
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
// KEYED BY set_index, NOT BY POSITION IN THE ARRAY.
//
// A positional read assumes one row per set. Where duplicates exist, and they do, sets[1]
// can be the second copy of set one rather than set two, which is how a card ended up
// showing 60, 25, 25. Collapsing to the newest row per set index makes the read correct
// even where the underlying data is still messy.
Object.keys(lastByExercise).forEach(function (k) {
const bySet = {};
lastByExercise[k].sets.forEach(function (r) {
const idx = (Number(r.set_index) || 1) - 1;
if (!bySet[idx]) bySet[idx] = r;
});
const out = [];
Object.keys(bySet).forEach(function (i) { out[Number(i)] = bySet[i]; });
lastByExercise[k].sets = out;
});
// Gym ready users bring their own plan, so the week is empty slots rather than
// prescribed sessions.
const week = isGymReady(p.goals)
? buildGymWeek(p.sessions_per_week || 3, p.train_days, p.fixed_days)
: buildWeek(p.goals, p.sessions_per_week || 3, p.train_days, p.fixed_days,
currentWeekIn(p.block_start, blockWeeksFor(p)));
// Freestyle types land on a choice, not on a weekday.
//
// A Hunter or a Wanderer opening the app on a Wednesday and being shown "Wednesday"
// is the app telling them the schedule decides, which is precisely what their type
// screen promised would not happen. Landing them on the first session they have not
// logged yet turns the same week into a pool with an obvious next pick, without
// changing a single exercise, the progression, or how adherence is scored.
const free = isFreestyle(a ? a.type_id : null);
// Exercises this person has told us to stop giving them. Keyed lowercase because the
// plan and the stored preference do not always agree on capitalisation.
const avoid = {};
(await supabase.from("exercise_prefs").select("exercise")
.eq("user_id", user.id)).data?.forEach(function (r) { avoid[(r.exercise || "").toLowerCase()] = true; });
setAvoided(avoid);

// COMPLETION HAS TO SURVIVE CLOSING THE APP.
//
// The per-exercise `done` map was React state seeded empty on every load, so a session
// logged this morning came back looking untouched this evening: every card open, every
// box prefilled with next week's prescription rather than what was actually done. The
// rows were in the database the whole time, the screen had just forgotten.
//
// This reads the week's work at exercise level rather than day level, so `done` can be
// rebuilt and a completed exercise can show what was logged instead of what is next.
const loggedKeys = {};
const wl = {};
(await supabase.from("exercise_logs")
.select("day_key, exercise, set_index, weight, reps, time_text, distance_km, duration_min, side")
.eq("user_id", user.id)
// Newest first, so the de-duplication below keeps the most recent row per set rather
// than whichever one Postgres happened to return.
.order("logged_at", { ascending: false })
.gte("logged_at", startOfThisWeek())).data?.forEach(function (r) {
loggedKeys[r.day_key] = true;
const ex = (r.exercise || "").toLowerCase();
if (!wl[r.day_key]) wl[r.day_key] = {};
if (!wl[r.day_key][ex]) wl[r.day_key][ex] = [];
wl[r.day_key][ex].push(r);
});
// Same rule as lastByExercise: slot by set_index so a duplicated row cannot shunt the
// others along by one.
Object.keys(wl).forEach(function (k) {
Object.keys(wl[k]).forEach(function (e2) {
const bySet = {};
wl[k][e2].forEach(function (r) {
const idx = (Number(r.set_index) || 1) - 1;
if (!bySet[idx]) bySet[idx] = r;
});
const out = [];
Object.keys(bySet).forEach(function (i) { out[Number(i)] = bySet[i]; });
wl[k][e2] = out;
});
});
setWeekLogs(wl);

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
setDone(doneFor(week[idx], wl));
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
// Read off the document rather than recomputed, so the client agrees with whatever the
// inline script in app/layout.js settled on before first paint.
const scheme = currentScheme();
const accent = accentFor(type, scheme);
const deep = deepFor(type, scheme);
// FILTERED HERE, NOT IN THE PLAN BUILDER.
//
// buildWeek() still returns the whole prescription and the stored preference is applied on
// top of it. That keeps one plan per goal rather than one per person, and it means undoing
// a preference is a row delete rather than a rebuild of somebody's block.
const rawDay = days[active] || null;
const day = rawDay && rawDay.exercises
? Object.assign({}, rawDay, {
exercises: rawDay.exercises.filter(function (ex) {
return !avoided[(ex.name || "").toLowerCase()];
}),
})
: rawDay;
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

async function completeSet(ex, exIdx, fields, total, kind, perSide) {
const { data: { user } } = await supabase.auth.getUser();
if (user && day) {
const rows = [];
for (let i = 0; i < total; i++) {
const v = fields[i] || {};
// A per-side hold writes two rows for one set, tagged left and right. Warrior II at
// 3 x 30 sec per side is six holds, and logging three of them was throwing away the
// comparison that matters most in yoga.
if (perSide) {
[["left", v.secsL], ["right", v.secsR]].forEach(function (pair) {
if (!pair[1]) return;
rows.push({
user_id: user.id, day_key: day.key, exercise: ex.name, set_index: i + 1,
side: pair[0], weight: null, reps: null,
time_text: pair[1] + " " + (v.unit || "sec"),
duration_min: (v.unit === "min") ? Number(pair[1]) : null,
});
});
continue;
}
rows.push({
user_id: user.id, day_key: day.key, exercise: ex.name, set_index: i + 1,
// Any weight the card collected, not only on prescribed lifts. Weighted dips and
// loaded pull ups are logged as reps but can carry a belt, and dropping that number
// on the way to the database would make a set with 20kg hanging off you look
// identical to a bodyweight one. record_lift_max below is still gated on kind, on
// purpose: belt weight is not a barbell max and should not be treated as one.
weight: v.weight ? Number(v.weight) : null,
reps: v.reps ? Number(v.reps) : null,
// The unit rides along in the field rather than as another argument, because
// a run is logged in minutes and a plank in seconds. Defaulting to sec keeps
// older callers and the Gym ready path behaving as they did.
time_text: kind === "time" ? (v.secs ? v.secs + " " + (v.unit || "sec") : null)
: (kind === "cardio" ? [v.km ? v.km + " km" : null, v.mins ? v.mins + " min" : null].filter(Boolean).join(" in ") || null : null),
// Endurance work as two numbers rather than a sentence. Pace is derivable from these
// and was not derivable from the string that used to be all we kept.
distance_km: kind === "cardio" && v.km ? Number(v.km) : null,
duration_min: kind === "cardio" && v.mins ? Number(v.mins)
: (kind === "time" && v.unit === "min" && v.secs ? Number(v.secs) : null),
});
}
// COMPLETING TWICE IS A CORRECTION, NOT TWICE THE WORK.
//
// This was a bare insert with no guard, so every tap of "Completed as planned" appended
// another full set of rows. Live data has a five set bench press with fifteen rows on one
// day, logged 60/65/70/80/90, then the same again, then 20/25/25/25/25. Somebody reopened
// the card and finished it again, and the app treated that as a third session.
//
// Scoped to the same day rather than the whole week on purpose: a freestyle type genuinely
// can take the same session twice in a week, and that should still be two entries.
const dayStart = new Date();
dayStart.setHours(0, 0, 0, 0);
await supabase.from("exercise_logs").delete()
.eq("user_id", user.id).eq("day_key", day.key).eq("exercise", ex.name)
.gte("logged_at", dayStart.toISOString());
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
// Yoga holds go into the same store as lift maxes, in seconds. record_lift_max uses
// greatest(), which is exactly the right rule for a best hold as well as a best lift.
// Scoped to yoga on purpose: every other plan prescribes its timed work rather than
// growing it from a logged best, so recording planks here would silently convert every
// plank in the app into a percentage of your best plank.
if (kind === "time" && cat === "yoga") {
let bestSecs = 0;
for (let i = 0; i < total; i++) {
const v = fields[i] || {};
// Minutes are stored as minutes in the log line, so convert before comparing.
const raw = Number(v.secs) || 0;
const secs = (v.unit === "min") ? raw * 60 : raw;
if (secs > bestSecs) bestSecs = secs;
}
if (bestSecs > 0) {
await supabase.rpc("record_lift_max", { p_exercise: ex.name, p_est: bestSecs });
setMaxes(function (m) {
const next = Object.assign({}, m);
const key = (ex.name || "").toLowerCase();
next[key] = Math.max(next[key] || 0, bestSecs);
return next;
});
}
}

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
<main className="min-h-screen text-brand-text flex items-center justify-center" style={{ background: "var(--brand-bg)" }}>
<p className="text-sm text-brand-muted">Building your session...</p>
</main>
);
}

return (
<main className="min-h-screen text-brand-text px-5 py-6" style={{ background: "var(--brand-bg)" }}>
<div className="max-w-md mx-auto">

{showQuote ? (
<div className="fixed inset-0 z-50 flex items-center justify-center px-6" style={{ background: "rgba(6,8,18,0.94)" }}>
<div className="w-full max-w-sm rounded-lg p-6 text-center border" style={{ borderColor: accent + "66", background: "#141A2E" }}>
<div className="flex justify-center mb-3"><TypeCharacter typeId={tid} size={72} variant="face" /></div>
<p className="font-display text-xs uppercase tracking-wide mb-3" style={{ color: accent }}>{type ? type.name : "Your coach"}</p>
<p className="font-display text-lg font-normal leading-snug mb-4">{quoteFor(tid, active)}</p>
{!gym ? <p className="text-xs text-brand-muted mb-5">{sessionIntro(tid, rule.label)}</p> : <p className="text-xs text-brand-muted mb-5">Log it as you go.</p>}
<button onClick={function () { setShowQuote(false); }} className="w-full py-4 rounded-md font-display"
style={{ background: accent, color: "var(--brand-bg)" }}>Ready</button>
</div>
</div>
) : null}

{praise ? (
<div className="fixed left-0 right-0 bottom-8 z-40 flex justify-center pointer-events-none">
<div className="px-6 py-3 rounded-sm font-display shadow-lg" style={{ background: accent, color: "var(--brand-bg)" }}>{praise}</div>
</div>
) : null}

<a href="/dashboard" className="flex items-center justify-center gap-2 w-full py-4 rounded-md font-display text-base font-normal mb-4 border"
style={{ borderColor: accent + "66", background: "var(--brand-surface)", color: accent }}>
&#8592; Back to dashboard
</a>

<div className="flex items-center gap-3 mb-4">
<TypeCharacter typeId={tid} size={40} variant="face" />
<div>
<p className="font-display text-sm leading-tight">{type ? type.name : "Your plan"}</p>
<p className="text-xs text-brand-muted leading-tight">
Week {weekNo}/{blockWeeks}{gym ? "" : " · " + rule.label}
</p>
</div>
</div>

{isTestWeek ? (
<div className="rounded-md border p-4 mb-3" style={{ borderColor: accent + "66", background: accent + "12" }}>
<p className="font-display text-sm" style={{ color: accent }}>Testing week</p>
<p className="text-xs text-brand-muted">
Week one sets your baselines. On the main lifts, work up to a strong set you could stop with a rep or two left, and log what you used. Every block after this builds off those real numbers.
</p>
</div>
) : null}

{noBaselines && !isTestWeek ? (
<a href="/settings" className="block rounded-md border p-4 mb-3" style={{ borderColor: "#FFB020", background: "rgba(255,176,32,0.10)" }}>
<p className="font-display text-sm" style={{ color: "#FFB020" }}>Enter your starting weights first</p>
<p className="text-xs text-brand-muted">No idea what they are? We explain it in bags of sugar.</p>
</a>
) : null}

{freestyle && !gym ? (
<div className="rounded-md border p-4 mb-3" style={{ borderColor: accent + "44", background: accent + "0D" }}>
<p className="font-display text-sm" style={{ color: accent }}>Your sessions this week</p>
<p className="text-xs text-brand-muted">
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
setActive(i); setFinished(false); setDone(doneFor(days[i], weekLogs));
try { window.localStorage.setItem(TAB_KEY, String(i)); } catch (e) {}
track(supabase, EVENTS.DAY_OPENED, {
day_key: d.key, index: i, week: weekNo, freestyle: freestyle, already_done: doneAlready,
});
}}
className="px-4 py-3 rounded-md font-display text-sm flex-shrink-0 border"
style={on ? { background: accent, color: "var(--brand-bg)", borderColor: accent }
: { background: "var(--brand-surface)", color: doneAlready ? "var(--brand-dim)" : "var(--brand-muted)", borderColor: "var(--brand-line)" }}>
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
holdProgression={cat === "yoga"}
onComplete={completeSet} onReopen={reopen} finished={finished} onFinish={finish} onStation={logStation}
loggedThisWeek={day ? (weekLogs[day.key] || {}) : {}}
onAvoid={function (name) { setAvoided(function (a) { return Object.assign({}, a, { [String(name || "").toLowerCase()]: true }); }); }} />
)}
</div>
</main>
);
}
