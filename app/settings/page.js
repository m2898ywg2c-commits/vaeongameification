"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { currentWeek, blockComplete, BLOCK_WEEKS } from "@/lib/progression";
import { WEIGHT_ANCHORS, EFFORT_ANCHORS, STARTER_GUIDE } from "@/lib/exercisedb";
import { SESSION_CHOICES } from "@/lib/training";
import { TYPES } from "@/lib/personality";
import Home from "../Home";

const EQUIPMENT = [
{ id: "gym", icon: "🏋️", name: "Full gym" },
{ id: "home", icon: "🎒", name: "Some kit at home" },
{ id: "none", icon: "🤸", name: "Freestyling" },
];

// 0 = Sunday, matching profiles.train_days
const WEEKDAYS = [
{ n: 1, short: "Mon" },
{ n: 2, short: "Tue" },
{ n: 3, short: "Wed" },
{ n: 4, short: "Thu" },
{ n: 5, short: "Fri" },
{ n: 6, short: "Sat" },
{ n: 0, short: "Sun" },
];

const MEASURES = [
{ key: "bodyweight", label: "Bodyweight", unit: "kg", placeholder: "78" },
{ key: "chest", label: "Chest", unit: "cm", placeholder: "100" },
{ key: "waist", label: "Waist", unit: "cm", placeholder: "86" },
{ key: "hips", label: "Hips", unit: "cm", placeholder: "98" },
{ key: "thigh", label: "Thigh", unit: "cm", placeholder: "58" },
{ key: "arm", label: "Arm", unit: "cm", placeholder: "35" },
];

export default function SettingsPage() {
const [profile, setProfile] = useState(null);
const [screenName, setScreenName] = useState("");
const [birthYear, setBirthYear] = useState("");
const [blockStart, setBlockStart] = useState("");
const [bench, setBench] = useState("");
const [squat, setSquat] = useState("");
const [equipment, setEquipment] = useState("gym");
const [fixedDays, setFixedDays] = useState(true);
const [sessions, setSessions] = useState(3);
const [trainDays, setTrainDays] = useState([]);
const [typeId, setTypeId] = useState(null);
const [showHelp, setShowHelp] = useState(false);
const [savedWhat, setSavedWhat] = useState(null);
const [userId, setUserId] = useState(null);
const [stats, setStats] = useState({});
const [lastStats, setLastStats] = useState(null);
const [statsMsg, setStatsMsg] = useState(null);
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
if (p.screen_name) setScreenName(p.screen_name);
if (p.birth_year) setBirthYear(String(p.birth_year));
if (p.block_start) setBlockStart(p.block_start);
if (p.baseline_bench) setBench(String(p.baseline_bench));
if (p.baseline_squat) setSquat(String(p.baseline_squat));
if (p.equipment) setEquipment(p.equipment);
if (p.sessions_per_week) setSessions(p.sessions_per_week);
if (Array.isArray(p.train_days)) setTrainDays(p.train_days);
setFixedDays(p.fixed_days !== false);
});

supabase.from("assessment_results").select("type_id").eq("user_id", user.id)
.order("completed_at", { ascending: false }).limit(1).maybeSingle()
.then(function (r) { if (r.data) setTypeId(r.data.type_id); });

supabase.from("body_metrics").select("*").eq("user_id", user.id)
.order("logged_at", { ascending: false }).limit(1).maybeSingle()
.then(function (r) {
if (r.data) {
setLastStats(r.data);
// Keep last measurements on screen until they are typed over, like the baselines.
const seed = {};
MEASURES.forEach(function (m) {
if (r.data[m.key] !== null && r.data[m.key] !== undefined) seed[m.key] = String(r.data[m.key]);
});
setStats(seed);
}
});
});
}, [router]);

const patch = async function (fields, label) {
if (!userId) return;
const supabase = createClient();
await supabase.from("profiles").update(fields).eq("id", userId);
setSavedWhat(label);
const r = await supabase.from("profiles").select("*").eq("id", userId).single();
setProfile(r.data);
setTimeout(function () { setSavedWhat(null); }, 2500);
};

const toggleDay = function (n) {
if (trainDays.indexOf(n) !== -1) setTrainDays(trainDays.filter(function (d) { return d !== n; }));
else setTrainDays(trainDays.concat([n]).sort(function (a, b) { return a - b; }));
};

const saveSchedule = function () {
patch({ sessions_per_week: sessions, fixed_days: fixedDays, train_days: trainDays }, "schedule");
};

const startNextBlock = function () {
const today = new Date().toISOString().slice(0, 10);
setBlockStart(today);
patch({ block_start: today, block_number: ((profile && profile.block_number) || 1) + 1 }, "block");
};

const saveStats = async function () {
if (!userId) return;
const row = { user_id: userId };
let any = false;
MEASURES.forEach(function (m) {
const v = stats[m.key];
if (v !== undefined && v !== "" && !isNaN(Number(v))) { row[m.key] = Number(v); any = true; }
});
if (!any) { setStatsMsg("Put a number in at least one box first."); return; }
const supabase = createClient();
const { error: e } = await supabase.from("body_metrics").insert(row);
if (e) { setStatsMsg(e.message); return; }
setStats({});
setLastStats(row);
setStatsMsg("Logged. Nice one.");
setTimeout(function () { setStatsMsg(null); }, 3000);
};

const fillLast = function () {
if (!lastStats) return;
const next = {};
MEASURES.forEach(function (m) {
if (lastStats[m.key] !== null && lastStats[m.key] !== undefined) next[m.key] = String(lastStats[m.key]);
});
setStats(next);
};

const type = typeId ? TYPES[typeId] : null;
const accent = type ? type.colors[0] : "#2DD4BF";
const deep = type ? type.colors[1] : "#0F766E";
const week = profile ? currentWeek(profile.block_start) : 1;
const finished = profile ? blockComplete(profile.block_start) : false;
const noBaselines = !bench && !squat;
const dayMismatch = fixedDays && trainDays.length > 0 && trainDays.length !== sessions;

const bigInput = "w-full px-4 py-4 rounded-2xl bg-white/8 border-2 text-xl font-bold text-center";
const primaryBtn = { background: "linear-gradient(90deg, " + accent + ", " + deep + ")", color: "#0E1224" };
const card = "rounded-2xl border border-white/10 bg-white/5 p-5 mb-4";

return (
<main className="min-h-screen text-white px-5 py-8" style={{ background: "#0E1224" }}>
<div className="max-w-md mx-auto">
<div className="flex items-center justify-between mb-6">
<Home accent={accent} />
<a href="/dashboard" className="text-xs text-gray-400 underline">Back</a>
</div>

<h1 className="text-2xl font-bold mb-6">Log stats and settings</h1>

{/* ---------- Body stats ---------- */}
<div className={card}>
<p className="text-base font-bold mb-1">Log your body stats</p>
<p className="text-sm text-gray-300 mb-4">
Your last numbers stay filled in. Type over whatever has changed, bodyweight alone is enough to draw a trend.
</p>

<div className="grid grid-cols-2 gap-3 mb-3">
{MEASURES.map(function (m) {
return (
<div key={m.key}>
<label className="block text-xs uppercase tracking-wide text-gray-400 mb-2">
{m.label} ({m.unit})
</label>
<input
value={stats[m.key] === undefined ? "" : stats[m.key]}
onChange={function (e) {
const next = Object.assign({}, stats);
next[m.key] = e.target.value;
setStats(next);
}}
inputMode="decimal"
placeholder={m.placeholder}
className={bigInput}
style={{ borderColor: accent + "44" }}
/>
</div>
);
})}
</div>

{lastStats ? (
<button onClick={fillLast} className="text-sm underline mb-3" style={{ color: accent }}>
Start from last time
</button>
) : null}

{statsMsg ? <p className="text-sm text-gray-300 mb-3">{statsMsg}</p> : null}

<button onClick={saveStats} className="w-full py-4 rounded-full font-bold text-sm" style={primaryBtn}>
Log today&apos;s stats
</button>
</div>

{/* ---------- You ---------- */}
<div className={card}>
<p className="text-base font-bold mb-4">You</p>

<label className="block text-xs uppercase tracking-wide text-gray-400 mb-2">Screen name</label>
<input
value={screenName}
onChange={function (e) { setScreenName(e.target.value); }}
placeholder="What the leaderboard calls you"
className="w-full px-4 py-4 rounded-2xl bg-white/8 border-2 text-lg font-bold mb-4"
style={{ borderColor: accent + "44" }}
/>

<label className="block text-xs uppercase tracking-wide text-gray-400 mb-2">Year you were born</label>
<input
value={birthYear}
onChange={function (e) { setBirthYear(e.target.value); }}
inputMode="numeric"
placeholder="1985"
className={bigInput + " mb-2"}
style={{ borderColor: accent + "44" }}
/>
<p className="text-xs text-gray-400 mb-4">
Used to pick the music for your sessions. Nothing else, and nobody sees it.
</p>

<button
onClick={function () {
const y = Number(birthYear);
const valid = birthYear && !isNaN(y) && y > 1900 && y < 2020;
patch({
screen_name: screenName ? screenName.trim() : null,
birth_year: valid ? y : null,
}, "you");
}}
className="w-full py-4 rounded-full font-bold text-sm"
style={primaryBtn}
>
{savedWhat === "you" ? "✓ Saved" : "Save"}
</button>
</div>

{/* ---------- Training type ---------- */}
<div className={card}>
<p className="text-base font-bold mb-1">Your training type</p>
{type ? (
<p className="text-sm text-gray-300 mb-4">
You are <a href={"/type?id=" + typeId} className="underline font-bold" style={{ color: accent }}>{type.name}</a>.
If it has never quite fitted, retake the assessment. Three minutes, and your plan and coaching voice rebuild around the result.
</p>
) : (
<p className="text-sm text-gray-300 mb-4">
You have not found your type yet. It shapes your whole plan, so it is worth the three minutes.
</p>
)}
<a href="/assessment" className="block w-full py-4 rounded-full font-bold text-sm text-center border border-white/20">
{type ? "Retake the assessment" : "Find my type"}
</a>
</div>

{/* ---------- Schedule ---------- */}
<div className={card}>
<p className="text-base font-bold mb-1">Your week</p>
<p className="text-sm text-gray-300 mb-4">
Sessions per week is your pledge. It is what the leaderboard scores you against.
</p>

<label className="block text-xs uppercase tracking-wide text-gray-400 mb-2">Sessions per week</label>
<div className="grid grid-cols-5 gap-2 mb-5">
{SESSION_CHOICES.map(function (n) {
const on = sessions === n;
return (
<button
key={n}
onClick={function () { setSessions(n); }}
className="py-4 rounded-2xl border text-lg font-bold"
style={{
borderColor: on ? accent : "rgba(255,255,255,0.1)",
background: on ? accent + "22" : "rgba(255,255,255,0.05)",
}}
>
{n}
</button>
);
})}
</div>

<label className="block text-xs uppercase tracking-wide text-gray-400 mb-2">How to label sessions</label>
<div className="grid grid-cols-2 gap-2 mb-5">
<button
onClick={function () { setFixedDays(true); }}
className="py-4 rounded-2xl border text-center"
style={{
borderColor: fixedDays ? accent : "rgba(255,255,255,0.1)",
background: fixedDays ? accent + "22" : "rgba(255,255,255,0.05)",
}}
>
<span className="block text-xl" aria-hidden="true">&#128197;</span>
<span className="block text-[11px] mt-1">Days of the week</span>
</button>
<button
onClick={function () { setFixedDays(false); }}
className="py-4 rounded-2xl border text-center"
style={{
borderColor: !fixedDays ? accent : "rgba(255,255,255,0.1)",
background: !fixedDays ? accent + "22" : "rgba(255,255,255,0.05)",
}}
>
<span className="block text-xl" aria-hidden="true">&#128290;</span>
<span className="block text-[11px] mt-1">Session 1, 2, 3</span>
</button>
</div>

{fixedDays ? (
<div className="mb-5">
<label className="block text-xs uppercase tracking-wide text-gray-400 mb-2">
Which days do you train?
</label>
<div className="grid grid-cols-4 gap-2">
{WEEKDAYS.map(function (d) {
const on = trainDays.indexOf(d.n) !== -1;
return (
<button
key={d.n}
onClick={function () { toggleDay(d.n); }}
className="py-4 rounded-2xl border text-sm font-bold"
style={{
borderColor: on ? accent : "rgba(255,255,255,0.1)",
background: on ? accent + "22" : "rgba(255,255,255,0.05)",
}}
>
{d.short}
</button>
);
})}
</div>
{dayMismatch ? (
<p className="text-xs mt-3" style={{ color: "#FFB020" }}>
You have picked {trainDays.length} day{trainDays.length === 1 ? "" : "s"} but pledged {sessions} sessions. Not a problem, just so you know.
</p>
) : null}
</div>
) : null}

<button onClick={saveSchedule} className="w-full py-4 rounded-full font-bold text-sm" style={primaryBtn}>
{savedWhat === "schedule" ? "✓ Saved" : "Save my week"}
</button>
</div>

{/* ---------- Baselines ---------- */}
<div
className="rounded-2xl border-2 p-5 mb-4"
style={{
borderColor: noBaselines ? "#FFB020" : accent + "55",
background: noBaselines ? "rgba(255,176,32,0.10)" : "rgba(255,255,255,0.04)",
}}
>
<div className="flex items-center gap-2 mb-1">
<span className="text-xl" aria-hidden="true">{noBaselines ? "⚠️" : "🏋️"}</span>
<p className="text-base font-bold" style={{ color: noBaselines ? "#FFB020" : "#fff" }}>
{noBaselines ? "Set your starting weights" : "Your starting weights"}
</p>
</div>
<p className="text-sm text-gray-300 mb-2">
{noBaselines
? "Vaeon needs these to work out what you should lift each week. Without them your plan has no numbers on it."
: "Vaeon uses these to calculate your working weight for every week of the block, and to scale every other lift."}
</p>
<p className="text-xs text-gray-400 mb-4">
Enter your working max: the heaviest you can manage for one to three clean reps. Not a true one-rep max, there is no need to test that and it is how people get hurt.
</p>

<div className="grid grid-cols-2 gap-3 mb-3">
<div>
<label className="block text-xs uppercase tracking-wide text-gray-400 mb-2">Bench max (kg)</label>
<input value={bench} onChange={function (e) { setBench(e.target.value); }} inputMode="decimal" placeholder="20"
className={bigInput} style={{ borderColor: accent + "66" }} />
</div>
<div>
<label className="block text-xs uppercase tracking-wide text-gray-400 mb-2">Squat max (kg)</label>
<input value={squat} onChange={function (e) { setSquat(e.target.value); }} inputMode="decimal" placeholder="20"
className={bigInput} style={{ borderColor: accent + "66" }} />
</div>
</div>

<button onClick={function () { setShowHelp(!showHelp); }} className="text-sm underline mb-3" style={{ color: accent }}>
{showHelp ? "Hide" : "I have no idea what mine are"}
</button>

{showHelp ? (
<div className="rounded-xl bg-black/25 p-4 mb-3">
<p className="text-sm font-bold mb-2">Start here, honestly</p>
<p className="text-sm text-gray-200 mb-1">{STARTER_GUIDE.bench.line}</p>
<p className="text-xs text-gray-400 mb-4">{STARTER_GUIDE.bench.detail}</p>
<p className="text-xs uppercase tracking-wide text-gray-400 mb-2">What weight actually feels like</p>
<div className="space-y-1 mb-4">
{WEIGHT_ANCHORS.map(function (a) {
return (
<div key={a.kg} className="flex items-center gap-3 text-sm">
<span className="font-bold w-12" style={{ color: accent }}>{a.kg}kg</span>
<span className="text-gray-300">{a.thing}</span>
</div>
);
})}
</div>
<p className="text-xs uppercase tracking-wide text-gray-400 mb-2">And effort, for the cardio bits</p>
<div className="space-y-1">
{EFFORT_ANCHORS.map(function (a) {
return (
<div key={a.level} className="flex items-start gap-3 text-sm">
<span className="font-bold w-6" style={{ color: accent }}>{a.level}</span>
<span className="text-gray-300">{a.thing}</span>
</div>
);
})}
</div>
<button onClick={function () { setBench("20"); setSquat("20"); }} className="mt-4 text-sm underline" style={{ color: accent }}>
Just use the empty bar for both
</button>
</div>
) : null}

<button
onClick={function () {
patch({
baseline_bench: bench ? Number(bench) : null,
baseline_squat: squat ? Number(squat) : null,
}, "lifts");
}}
className="w-full py-4 rounded-full font-bold text-sm"
style={primaryBtn}
>
{savedWhat === "lifts" ? "✓ Saved" : "Save starting weights"}
</button>
</div>

{/* ---------- Equipment ---------- */}
<div className={card}>
<p className="text-base font-bold mb-3">Where you train</p>
<div className="grid grid-cols-3 gap-2">
{EQUIPMENT.map(function (o) {
const on = equipment === o.id;
return (
<button
key={o.id}
onClick={function () { setEquipment(o.id); patch({ equipment: o.id }, "kit"); }}
className="py-4 rounded-2xl border text-center"
style={{
borderColor: on ? accent : "rgba(255,255,255,0.1)",
background: on ? accent + "22" : "rgba(255,255,255,0.05)",
}}
>
<span className="block text-xl" aria-hidden="true">{o.icon}</span>
<span className="block text-[11px] mt-1">{o.name}</span>
</button>
);
})}
</div>
</div>

{/* ---------- Block ---------- */}
<div className={card}>
<p className="text-base font-bold mb-3">Block {(profile && profile.block_number) || 1} &middot; week {week} of {BLOCK_WEEKS}</p>
<input type="date" value={blockStart} onChange={function (e) { setBlockStart(e.target.value); }}
className="w-full px-4 py-4 rounded-2xl bg-white/8 border-2 border-white/15 text-lg mb-3" />
<button onClick={function () { patch({ block_start: blockStart }, "date"); }}
className="w-full py-3 rounded-full font-bold text-sm mb-3" style={primaryBtn}>
{savedWhat === "date" ? "✓ Saved" : "Save start date"}
</button>
<button onClick={startNextBlock} className="w-full py-3 rounded-full font-bold text-sm border border-white/20">
{finished ? "Start block " + (((profile && profile.block_number) || 1) + 1) : "Restart from today"}
</button>
</div>
</div>
</main>
);
}
