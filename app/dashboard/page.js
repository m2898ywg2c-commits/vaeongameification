import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TYPES } from "@/lib/personality";
import { computeStats, coachMessage } from "@/lib/plan";
import { goalNames, primaryCategory } from "@/lib/training";
import { currentWeek, weeksFor, blockComplete, BLOCK_WEEKS } from "@/lib/progression";
import SignOutButton from "./SignOutButton";
import AchievementWatcher from "./AchievementWatcher";
import KudosCard from "./KudosCard";
import TypeOrb from "../TypeOrb";
import ShareButton from "../ShareButton";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function startOfWeek() {
const d = new Date();
const day = (d.getDay() + 6) % 7;
d.setHours(0, 0, 0, 0);
d.setDate(d.getDate() - day);
return d.toISOString();
}

export default async function DashboardPage() {
const supabase = await createClient();
const { data: { user } } = await supabase.auth.getUser();
if (!user) redirect("/login");

const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
if (!profile || !profile.goals || profile.goals.length === 0) redirect("/onboarding");

const { data: assessment } = await supabase.from("assessment_results").select("*")
.eq("user_id", user.id).order("completed_at", { ascending: false }).limit(1).maybeSingle();

const { data: sessions } = await supabase.from("training_sessions").select("*")
.eq("user_id", user.id).order("logged_at", { ascending: false }).limit(300);

// Have they logged body stats this week?
const { data: thisWeekMetrics } = await supabase.from("body_metrics").select("id")
.eq("user_id", user.id).gte("logged_at", startOfWeek()).limit(1).maybeSingle();

// Kudos sent TO me. RLS on the kudos table is outgoing-only, so this comes from a
// security definer function rather than a direct select. Anything cleared is already
// filtered out inside the function.
const { data: kudosIn } = await supabase.rpc("get_my_kudos");
const myKudos = kudosIn || [];

const pledged = profile.sessions_per_week || 3;
const typeId = assessment ? assessment.type_id : null;
const type = typeId ? TYPES[typeId] : null;
const stats = computeStats(sessions || [], pledged);
const nudge = type ? coachMessage(typeId, stats, profile.framing) : null;
const names = goalNames(profile.goals);
const category = primaryCategory(profile.goals);
const weekNo = currentWeek(profile.block_start);
const rule = weeksFor(category)[weekNo - 1] || weeksFor(category)[0];
const finished = blockComplete(profile.block_start);
const today = DAYS[new Date().getDay()];
const accent = type ? type.colors[0] : "#2DD4BF";
const deep = type ? type.colors[1] : "#0F766E";
const noBaselines = !profile.baseline_bench && !profile.baseline_squat;
const plain = { sessions_per_week: pledged, block_start: profile.block_start || null };

const tile = "rounded-2xl border border-white/10 bg-white/5 p-3 text-center";

return (
<main className="min-h-screen text-white px-5 py-8" style={{ background: "#0E1224" }}>
<div className="max-w-md mx-auto">

<div className="flex items-center justify-between mb-5">
<div className="flex items-center gap-3">
{type ? <TypeOrb typeId={typeId} size={46} /> : null}
<div>
<p className="text-lg font-bold leading-tight">{profile.screen_name}</p>
<p className="text-xs leading-tight" style={{ color: accent }}>{type ? type.name : names.join(" + ")}</p>
</div>
</div>
<SignOutButton />
</div>

{finished ? (
<a href="/blockend" className="flex items-center gap-3 rounded-2xl border-2 p-4 mb-3" style={{ borderColor: "#3DDC97", background: "rgba(61,220,151,0.10)" }}>
<span className="text-2xl" aria-hidden="true">{"\u{1F3C1}"}</span>
<div className="flex-1">
<p className="text-sm font-bold" style={{ color: "#3DDC97" }}>Block {profile.block_number || 1} complete</p>
<p className="text-xs text-gray-300">See your six-week summary and roll straight into the next one.</p>
</div>
<span style={{ color: "#3DDC97" }}>&rsaquo;</span>
</a>
) : null}

{noBaselines ? (
<a href="/settings" className="flex items-center gap-3 rounded-2xl border-2 p-4 mb-3" style={{ borderColor: "#FFB020", background: "rgba(255,176,32,0.10)" }}>
<span className="text-2xl" aria-hidden="true">{"⚠️"}</span>
<div className="flex-1">
<p className="text-sm font-bold" style={{ color: "#FFB020" }}>Set your starting weights</p>
<p className="text-xs text-gray-300">Takes a minute. No idea what they are? We will help.</p>
</div>
<span style={{ color: "#FFB020" }}>&rsaquo;</span>
</a>
) : null}

{!thisWeekMetrics ? (
<a href="/settings" className="flex items-center gap-3 rounded-2xl border-2 p-4 mb-3" style={{ borderColor: accent, background: accent + "1A" }}>
<span className="text-2xl" aria-hidden="true">{"\u{1F4CF}"}</span>
<div className="flex-1">
<p className="text-sm font-bold" style={{ color: accent }}>Log this week&rsquo;s stats</p>
<p className="text-xs text-gray-300">Weight and measurements. Takes twenty seconds and makes your charts worth reading.</p>
</div>
<span style={{ color: accent }}>&rsaquo;</span>
</a>
) : null}

<a href="/plan" className="block rounded-2xl p-5 mb-3" style={{ background: "linear-gradient(135deg, " + accent + ", " + deep + ")", color: "#fff" }}>
<p className="text-xs font-bold uppercase tracking-wide opacity-80">{profile.fixed_days === false ? "Next up" : today}</p>
<p className="text-2xl font-bold leading-tight">Today&rsquo;s workout</p>
<p className="text-sm font-medium opacity-90 mt-1">Tap to open and start logging</p>
</a>

<a href="/fallback" className="flex items-center gap-3 rounded-2xl border-2 p-4 mb-5" style={{ borderColor: "#FFB020", background: "rgba(255,176,32,0.08)" }}>
<span className="text-2xl" aria-hidden="true">{"\u{1F3E0}"}</span>
<div className="flex-1">
<p className="text-sm font-bold" style={{ color: "#FFB020" }}>Can&rsquo;t get to the gym today?</p>
<p className="text-xs text-gray-300">Desk, hotel or home. Keeps your streak alive.</p>
</div>
<span className="text-lg" style={{ color: "#FFB020" }}>&rsaquo;</span>
</a>

<div className="grid grid-cols-3 gap-2 mb-5">
<div className={tile}>
<p className="text-xl" aria-hidden="true">{"⚡"}</p>
<p className="text-xl font-bold leading-tight">{stats.level}</p>
<p className="text-[10px] uppercase tracking-wide text-gray-400">Level</p>
</div>
<div className={tile}>
<p className="text-xl" aria-hidden="true">{"\u{1F3AF}"}</p>
<p className="text-xl font-bold leading-tight">{stats.thisWeekCount}/{pledged}</p>
<p className="text-[10px] uppercase tracking-wide text-gray-400">This week</p>
</div>
<div className={tile}>
<p className="text-xl" aria-hidden="true">{"\u{1F525}"}</p>
<p className="text-xl font-bold leading-tight">{stats.weekStreak}</p>
<p className="text-[10px] uppercase tracking-wide text-gray-400">Streak</p>
</div>
</div>

{type ? (
<div className="rounded-2xl p-4 mb-3 border" style={{ borderColor: accent + "55", background: "rgba(255,255,255,0.04)" }}>
<a href={"/type?id=" + typeId} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 mb-2">
<TypeOrb typeId={typeId} size={26} />
<p className="text-xs font-bold uppercase tracking-wide flex-1" style={{ color: accent }}>About the {type.name.replace("The ", "")} training style</p>
<span className="text-sm" style={{ color: accent }} aria-hidden="true">{"↗"}</span>
</a>
<p className="text-sm">{nudge}</p>
</div>
) : (
<a href="/assessment" className="block rounded-2xl border border-white/15 bg-white/5 p-4 mb-3">
<p className="text-sm font-bold mb-1">Find your training personality</p>
<p className="text-xs text-gray-400">Two minutes. It decides how you get coached.</p>
</a>
)}

{/* ---------- Kudos received ---------- */}
<KudosCard kudos={myKudos} accent={accent} />

<div className="rounded-2xl border border-white/10 bg-white/5 p-4 mb-5">
<div className="flex items-center justify-between mb-1">
<p className="text-sm font-bold">Block {profile.block_number || 1} &middot; Week {weekNo}/{BLOCK_WEEKS}</p>
<span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: accent + "33", color: accent }}>{rule.label}</span>
</div>
<p className="text-xs text-gray-300">{rule.increase}</p>
{finished ? <a href="/blockend" className="text-xs underline block mt-2" style={{ color: "#3DDC97" }}>Block complete. See your summary and start the next one.</a> : null}
{!profile.block_start ? <a href="/settings" className="text-xs underline block mt-2" style={{ color: "#FFB020" }}>Set your block start date</a> : null}
</div>

<AchievementWatcher profile={plain} />

<div className="grid grid-cols-2 gap-2 mb-5">
<a href="/log" className="rounded-2xl border border-white/10 bg-white/5 p-4">
<p className="text-xl mb-1" aria-hidden="true">{"✏️"}</p>
<p className="text-sm font-bold">Quick log</p>
</a>
<a href="/leaderboard" className="rounded-2xl border border-white/10 bg-white/5 p-4">
<p className="text-xl mb-1" aria-hidden="true">{"\u{1F3C6}"}</p>
<p className="text-sm font-bold">Leaderboard</p>
</a>
<a href="/progress" className="rounded-2xl border border-white/10 bg-white/5 p-4">
<p className="text-xl mb-1" aria-hidden="true">{"\u{1F4C8}"}</p>
<p className="text-sm font-bold">Progress</p>
</a>
<a href="/settings" className="rounded-2xl border border-white/10 bg-white/5 p-4">
<p className="text-xl mb-1" aria-hidden="true">{"⚙️"}</p>
<p className="text-sm font-bold">Log stats and settings</p>
</a>
</div>

<div className="mb-4"><ShareButton accent={accent} /></div>

<a href="/onboarding" className="block text-center text-xs text-gray-500 underline">Change goals, days or sessions a week</a>
<a href="/feedback" className="block text-center text-xs text-gray-500 underline mt-2">Send feedback</a>
</div>
</main>
);
}
