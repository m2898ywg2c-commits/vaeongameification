"use client";

// End-of-block summary. A whole block of effort deserves more than a one-line link, so this
// pulls the block's sessions, personal bests and lift trends into one honest debrief,
// then rolls you into the next block with a single tap.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { TYPES } from "@/lib/personality";
import { estimateMax, liftTrends, trendSummary } from "@/lib/progression";
import { blockWeeksFor, currentWeekIn, blockCompleteIn, isGymReady } from "@/lib/gymready";
import TypeOrb from "../TypeOrb";

export default function BlockEndPage() {
const router = useRouter();
const [supabase] = useState(function () { return createClient(); });
const [loading, setLoading] = useState(true);
const [profile, setProfile] = useState(null);
const [typeId, setTypeId] = useState(null);
const [sessionsDone, setSessionsDone] = useState(0);
const [pbs, setPbs] = useState([]);
const [trends, setTrends] = useState([]);
const [weightDelta, setWeightDelta] = useState(null);
const [starting, setStarting] = useState(false);
const [error, setError] = useState(null);

useEffect(function () {
async function load() {
const { data: { user } } = await supabase.auth.getUser();
if (!user) { router.push("/login"); return; }
const { data: p } = await supabase.from("profiles").select("*").eq("id", user.id).single();
if (!p || !p.block_start) { router.push("/dashboard"); return; }

const start = new Date(p.block_start);
start.setHours(0, 0, 0, 0);
const weeks = blockWeeksFor(p);
const end = new Date(start.getTime() + weeks * 7 * 24 * 60 * 60 * 1000);

const { data: a } = await supabase.from("assessment_results").select("type_id")
.eq("user_id", user.id).order("completed_at", { ascending: false }).limit(1).maybeSingle();

const { data: sess } = await supabase.from("training_sessions").select("id, logged_at")
.eq("user_id", user.id)
.gte("logged_at", start.toISOString())
.lt("logged_at", end.toISOString());

const { data: logs } = await supabase.from("exercise_logs").select("exercise, weight, reps, logged_at")
.eq("user_id", user.id).not("weight", "is", null);

const { data: bw } = await supabase.from("body_metrics").select("bodyweight, logged_at")
.eq("user_id", user.id).not("bodyweight", "is", null)
.order("logged_at", { ascending: true });

// Personal bests: the best estimated max inside the block against the best before it.
const before = {};
const inside = {};
(logs || []).forEach(function (l) {
const t = new Date(l.logged_at);
const est = estimateMax(l.weight, l.reps);
if (!est) return;
if (t < start) {
if (!before[l.exercise] || est > before[l.exercise]) before[l.exercise] = est;
} else if (t < end) {
if (!inside[l.exercise] || est > inside[l.exercise]) inside[l.exercise] = est;
}
});
const pbList = [];
Object.keys(inside).forEach(function (k) {
const prev = before[k] || null;
if (!prev || inside[k] > prev) {
pbList.push({
name: k,
est: Math.round(inside[k] * 10) / 10,
gain: prev ? Math.round((inside[k] - prev) * 10) / 10 : null,
});
}
});
pbList.sort(function (x, y) { return (y.gain || 0) - (x.gain || 0); });

const blockLogs = (logs || []).filter(function (l) {
const t = new Date(l.logged_at);
return t >= start && t < end;
});

// Bodyweight over the block: last entry at or before the start against the last inside it.
const entries = (bw || []).filter(function (b) { return new Date(b.logged_at) < end; });
let delta = null;
let startEntry = null;
entries.forEach(function (b) { if (new Date(b.logged_at) <= start) startEntry = b; });
if (!startEntry && entries.length) startEntry = entries[0];
const endEntry = entries.length ? entries[entries.length - 1] : null;
if (startEntry && endEntry && startEntry !== endEntry) {
delta = Math.round((Number(endEntry.bodyweight) - Number(startEntry.bodyweight)) * 10) / 10;
}

setProfile(p);
setTypeId(a ? a.type_id : null);
setSessionsDone((sess || []).length);
setPbs(pbList.slice(0, 5));
setTrends(liftTrends(blockLogs));
setWeightDelta(delta);
setLoading(false);
}
load();
}, [supabase, router]);

async function startNextBlock() {
if (!profile) return;
setStarting(true);
setError(null);
const today = new Date().toISOString().slice(0, 10);
const { error: e } = await supabase.from("profiles").update({
block_start: today,
block_number: (profile.block_number || 1) + 1,
}).eq("id", profile.id);
setStarting(false);
if (e) { setError(e.message); return; }
router.push("/plan");
}

if (loading) {
return (
<main className="min-h-screen text-white flex items-center justify-center" style={{ background: "#000000" }}>
<p className="text-sm text-gray-400">Adding up your block...</p>
</main>
);
}

const type = typeId ? TYPES[typeId] : null;
const tid = typeId || "architect";
const accent = type ? type.colors[0] : "#22D3EE";
const deep = type ? type.colors[1] : "#3B82F6";
const blockNo = profile.block_number || 1;
const blockWeeks = blockWeeksFor(profile);
const gym = isGymReady(profile.goals);
const complete = blockCompleteIn(profile.block_start, blockWeeks);
const weekNo = currentWeekIn(profile.block_start, blockWeeks);
const pledged = profile.sessions_per_week || 3;
const target = pledged * blockWeeks;
const pct = target > 0 ? Math.min(100, Math.round((sessionsDone / target) * 100)) : 0;

let verdict;
if (pct >= 85) verdict = "You did what you pledged, week after week. That consistency is the whole game, and you played it well.";
else if (pct >= 60) verdict = "A solid block. Not every week landed, but the pattern held, and patterns beat perfect weeks.";
else if (sessionsDone > 0) verdict = "The block got away from you a bit. No drama, it happens. The next one starts from zero and owes nothing to this one.";
else verdict = "Nothing logged this block. If life got in the way, fair enough. Start the next one small and honest.";

const tile = "rounded-2xl border border-white/10 bg-white/5 p-4 text-center";
const cardCls = "rounded-2xl border border-white/10 bg-white/5 p-5 mb-4";

return (
<main className="min-h-screen text-white px-5 py-8" style={{ background: "#000000" }}>
<div className="max-w-md mx-auto">
<a href="/dashboard" className="inline-block text-xs text-gray-400 underline mb-6">Back to dashboard</a>

<div className="rounded-2xl p-6 mb-4 text-center" style={{ background: "linear-gradient(135deg, " + accent + "33, transparent)", border: "2px solid " + accent + "55" }}>
<div className="flex justify-center mb-2"><TypeOrb typeId={tid} size={84} /></div>
<p className="text-xs uppercase tracking-wide text-gray-400 mb-1">{complete ? "Block " + blockNo + " complete" : "Block " + blockNo + " · week " + weekNo + " of " + blockWeeks}</p>
<h1 className="text-3xl font-bold mb-2">{complete ? blockWeeks + " weeks, done." : "Mid-block snapshot"}</h1>
<p className="text-sm text-gray-300">{verdict}</p>
</div>

<div className="grid grid-cols-3 gap-2 mb-4">
<div className={tile}>
<p className="text-2xl font-bold leading-tight">{sessionsDone}</p>
<p className="text-[10px] uppercase tracking-wide text-gray-400">Sessions</p>
</div>
<div className={tile}>
<p className="text-2xl font-bold leading-tight" style={{ color: accent }}>{pct}%</p>
<p className="text-[10px] uppercase tracking-wide text-gray-400">Of your pledge</p>
</div>
<div className={tile}>
<p className="text-2xl font-bold leading-tight">{pbs.length}</p>
<p className="text-[10px] uppercase tracking-wide text-gray-400">New bests</p>
</div>
</div>

{pbs.length ? (
<div className={cardCls}>
<p className="text-xs uppercase tracking-wide text-gray-400 mb-3">Personal bests this block</p>
{pbs.map(function (pb, i) {
return (
<div key={i} className={"flex items-center justify-between" + (i > 0 ? " mt-3 pt-3 border-t border-white/10" : "")}>
<div>
<p className="text-sm font-bold">{pb.name}</p>
<p className="text-xs text-gray-400">Estimated max {pb.est}kg</p>
</div>
<span className="text-sm font-bold" style={{ color: "#3DDC97" }}>
{pb.gain ? "+" + pb.gain + "kg" : "First max set"}
</span>
</div>
);
})}
</div>
) : (
<div className={cardCls}>
<p className="text-xs uppercase tracking-wide text-gray-400 mb-1">Personal bests this block</p>
<p className="text-sm text-gray-300">No weighted sets logged this block, so nothing to compare. Log your lifts next block and this fills itself in.</p>
</div>
)}

<div className={cardCls}>
<p className="text-xs uppercase tracking-wide text-gray-400 mb-1">How your lifts moved</p>
<p className="text-sm text-gray-200 mb-3">{trendSummary(trends)}</p>
{trends.slice(0, 4).map(function (t, i) {
return (
<div key={i} className={i > 0 ? "mt-3 pt-3 border-t border-white/10" : ""}>
<p className="text-sm font-bold">{t.name}</p>
<p className="text-xs text-gray-400">{t.message}</p>
</div>
);
})}
</div>

{weightDelta !== null ? (
<div className={cardCls}>
<p className="text-xs uppercase tracking-wide text-gray-400 mb-1">Bodyweight</p>
<p className="text-sm text-gray-200">
{weightDelta === 0 ? "Held steady across the block." : (weightDelta > 0 ? "Up " + weightDelta + "kg across the block." : "Down " + Math.abs(weightDelta) + "kg across the block.")}{" "}
Whether that is good news depends entirely on what you were aiming for.
</p>
</div>
) : null}

{error ? <p className="text-sm text-red-400 mb-3">{error}</p> : null}

{complete ? (
<button onClick={startNextBlock} disabled={starting}
className="w-full py-5 rounded-2xl font-bold text-lg mb-3"
style={{ background: "linear-gradient(135deg, " + accent + ", " + deep + ")", color: "#fff" }}>
{starting ? "Setting up..." : "Start block " + (blockNo + 1) + " today"}
</button>
) : (
<a href="/plan" className="block w-full py-5 rounded-2xl font-bold text-lg mb-3 text-center"
style={{ background: "linear-gradient(135deg, " + accent + ", " + deep + ")", color: "#fff" }}>
Back to this week
</a>
)}
<p className="text-xs text-gray-500 text-center mb-6">
{complete ? (gym ? "A fresh block starts today. Same routine, clean slate on the numbers." : "Week one of the new block is a testing week, so your first job is simply to land on honest numbers.") : "Come back when the block wraps and this becomes your full debrief."}
</p>
</div>
</main>
);
}
