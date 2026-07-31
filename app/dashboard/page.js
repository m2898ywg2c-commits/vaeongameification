import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TYPES } from "@/lib/personality";
import { computeStats, coachMessage } from "@/lib/plan";
import { goalNames, primaryCategory } from "@/lib/training";
import { weeksFor } from "@/lib/progression";
import { isGymReady, blockWeeksFor, currentWeekIn, blockCompleteIn } from "@/lib/gymready";
import SignOutButton from "./SignOutButton";
import AchievementWatcher from "./AchievementWatcher";
import InstallPrompt from "../InstallPrompt";
import KudosCard from "./KudosCard";
import TypeOrb from "../TypeOrb";
import ShareButton from "../ShareButton";
import Track from "../Track";
import ReminderCard from "./ReminderCard";
import ChallengeCard from "./ChallengeCard";
import { EVENTS } from "@/lib/events";
import { occasionFor } from "@/lib/reminders";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function startOfWeek() {
const d = new Date();
const day = (d.getDay() + 6) % 7;
d.setHours(0, 0, 0, 0);
d.setDate(d.getDate() - day);
return d.toISOString();
}

export default async function DashboardPage({ searchParams }) {
// searchParams is a promise in this version of Next. The service worker sends people
// here with ?r=1 so that a push that gets tapped can be told apart from a normal open,
// which is the only way to know whether reminders do anything.
const sp = await searchParams;
const fromReminder = Boolean(sp && sp.r === "1");

const supabase = await createClient();
const { data: { user } } = await supabase.auth.getUser();
if (!user) redirect("/login");

const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
if (!profile || !profile.goals || profile.goals.length === 0) redirect("/onboarding");

const { data: assessment } = await supabase.from("assessment_results").select("*")
.eq("user_id", user.id).order("completed_at", { ascending: false }).limit(1).maybeSingle();

const { data: sessions } = await supabase.from("training_sessions").select("*")
.eq("user_id", user.id).order("logged_at", { ascending: false }).limit(300);

// Spend a grace week if a completed week fell short, before the streak is calculated.
// Idempotent and safe to call on every load, and it only ever touches the caller's own
// rows. See supabase/streak_freeze.sql. Allowed to fail: if the migration is not applied
// the streak simply behaves as it always has.
let freezeCredits = 0;
let frozenWeeks = [];
try {
const settled = await supabase.rpc("settle_streak_freezes");
freezeCredits = typeof settled.data === "number" ? settled.data : 0;
const { data: fz } = await supabase.from("streak_freezes").select("week_start").eq("user_id", user.id);
frozenWeeks = (fz || []).map(function (r) { return r.week_start; });
} catch (ignored) {}

// Most recent exercise log, for the reminder. Sessions alone are not enough to judge
// staleness: someone who logs every exercise in the plan but never taps Finish has no
// training_sessions row at all, and would be told they had lapsed while training. The
// mirror of this decision lives in due_reminders() in supabase/reminders.sql.
const { data: lastLog } = await supabase.from("exercise_logs").select("logged_at")
.eq("user_id", user.id).order("logged_at", { ascending: false }).limit(1).maybeSingle();

// Have they logged body stats this week?
const { data: thisWeekMetrics } = await supabase.from("body_metrics").select("id")
.eq("user_id", user.id).gte("logged_at", startOfWeek()).limit(1).maybeSingle();

// Kudos sent TO me. RLS on the kudos table is outgoing-only, so this comes from a
// security definer function rather than a direct select. Anything cleared is already
// filtered out inside the function.
const { data: kudosIn } = await supabase.rpc("get_my_kudos");
const myKudos = kudosIn || [];

// The live group challenge, if there is one. Returns no rows when nothing is running,
// and the card renders nothing, so a quiet week costs an empty query and no layout.
let challenge = null;
try {
const { data: ch } = await supabase.rpc("current_challenge");
challenge = ch && ch.length ? ch[0] : null;
} catch (ignored) {}

const pledged = profile.sessions_per_week || 3;
const typeId = assessment ? assessment.type_id : null;
const type = typeId ? TYPES[typeId] : null;
const stats = computeStats(sessions || [], pledged, frozenWeeks);
const nudge = type ? coachMessage(typeId, stats, profile.framing) : null;
const gym = isGymReady(profile.goals);
const names = goalNames(profile.goals);
const category = primaryCategory(profile.goals);
const blockWeeks = blockWeeksFor(profile);
const weekNo = currentWeekIn(profile.block_start, blockWeeks);
const rule = weeksFor(category)[weekNo - 1] || weeksFor(category)[0];
const finished = blockCompleteIn(profile.block_start, blockWeeks);
const today = DAYS[new Date().getDay()];
const accent = type ? type.colors[0] : "#22D3EE";
const deep = type ? type.colors[1] : "#3B82F6";
// Gym ready users get their loads from their coach, so nagging them for baselines is
// both useless and a bit insulting.
const noBaselines = !gym && !profile.baseline_bench && !profile.baseline_squat;
const plain = { sessions_per_week: pledged, block_start: profile.block_start || null };

// Latest sign of life from either source, matching greatest() in due_reminders().
const lastSession = sessions && sessions.length ? sessions[0].logged_at : null;
const lastExercise = lastLog ? lastLog.logged_at : null;
const lastActivity = [lastSession, lastExercise].filter(Boolean).sort().pop() || null;
const occasion = occasionFor(lastActivity, stats.thisWeekCount, pledged);

const tile = "rounded-2xl border border-white/10 bg-white/5 p-3 text-center";

return (
<main className="min-h-screen text-white px-5 py-8" style={{ background: "#000000" }}>
<div className="max-w-md mx-auto">

<div className="flex items-center justify-between mb-5">
<div className="flex items-center gap-3">
{type ? <TypeOrb typeId={typeId} size={46} /> : null}
<div>
<p className="text-lg font-bold leading-tight">{profile.screen_name}</p>
<p className="text-xs leading-tight" style={{ color: accent }}>
{type ? type.name : (gym ? "Gym ready" : names.join(" + "))}
</p>
</div>
</div>
<SignOutButton />
</div>

<Track name={EVENTS.APP_OPENED} once userId={user.id} typeId={typeId} framing={profile.framing} props={{ block: profile.block_number || 1, week: weekNo, occasion: occasion }} />

{fromReminder ? (
<Track name={EVENTS.REMINDER_OPENED} once userId={user.id} typeId={typeId} framing={profile.framing} props={{ occasion: occasion }} />
) : null}

{/* THE PRIMARY ACTION, FIRST.
Everything else on this dashboard is context for this one button. It used to sit
below the banners, the install prompt and the challenge, which meant the single
thing the app wants somebody to do was the fifth thing they saw and often below
the fold. Nothing above it now except who they are. */}
<a href="/plan" className="block rounded-2xl p-5 mb-3" style={{ background: "linear-gradient(135deg, " + accent + ", " + deep + ")", color: "#fff" }}>
<p className="text-xs font-bold uppercase tracking-wide opacity-80">{profile.fixed_days === false ? "Next up" : today}</p>
<p className="text-2xl font-bold leading-tight">Today&rsquo;s workout</p>
<p className="text-sm font-medium opacity-90 mt-1">Tap to open and start logging</p>
</a>

<ReminderCard occasion={occasion} typeId={typeId} framing={profile.framing} accent={accent} />

{/* Directly under the action and the nudge, ahead of the housekeeping banners. The
shared goal is the reason to open the app a second time this week, and it was
sitting below three prompts about baselines and measurements. */}
<ChallengeCard challenge={challenge} accent={accent} />

<InstallPrompt accent={accent} />

{finished ? (
<a href="/blockend" className="flex items-center gap-3 rounded-2xl border-2 p-4 mb-3" style={{ borderColor: "#3DDC97", background: "rgba(61,220,151,0.10)" }}>
<span className="text-2xl" aria-hidden="true">{"\u{1F3C1}"}</span>
<div className="flex-1">
<p className="text-sm font-bold" style={{ color: "#3DDC97" }}>Block {profile.block_number || 1} complete</p>
<p className="text-xs text-gray-300">See your {blockWeeks}-week summary and roll straight into the next one.</p>
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


{!gym ? (
<a href="/fallback" className="flex items-center gap-3 rounded-2xl border-2 p-4 mb-5" style={{ borderColor: "#FFB020", background: "rgba(255,176,32,0.08)" }}>
<span className="text-2xl" aria-hidden="true">{"\u{1F3E0}"}</span>
<div className="flex-1">
<p className="text-sm font-bold" style={{ color: "#FFB020" }}>Can&rsquo;t get to the gym today?</p>
<p className="text-xs text-gray-300">Desk, hotel or home. Keeps your streak alive.</p>
</div>
<span className="text-lg" style={{ color: "#FFB020" }}>&rsaquo;</span>
</a>
) : <div className="mb-5" />}

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

{/* Grace weeks. Shown whether or not one has been spent, because a safety net nobody
knows about does not do the job: half the value of a freeze is not being afraid of
losing the streak in the first place. When one has been used it says so plainly, since
a streak quietly propped up by a week you did not train would be a lie told kindly. */}
{profile.block_start ? (
<div className="rounded-2xl border border-white/10 bg-white/5 p-3 mb-5 flex items-center gap-3">
<span className="text-lg" aria-hidden="true">{"\u{1F9CA}"}</span>
<div className="flex-1">
<p className="text-xs font-bold">
{stats.frozenInStreak > 0
? "Grace week used"
: (freezeCredits > 0 ? "Grace week available" : "No grace week left this block")}
</p>
<p className="text-[11px] text-gray-400 leading-snug">
{stats.frozenInStreak > 0
? "A week you missed is being held for you, so the streak stands. " + (freezeCredits > 0 ? "You have another in reserve." : "That was your one for this block.")
: (freezeCredits > 0
? "Miss a week and your streak survives it. Illness, travel and bad weeks are not failures."
: "Your next missed week will reset the streak. It refreshes when your next block starts.")}
</p>
</div>
</div>
) : null}

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
<p className="text-sm font-bold">Block {profile.block_number || 1} &middot; Week {weekNo}/{blockWeeks}</p>
{!gym ? (
<span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: accent + "33", color: accent }}>{rule.label}</span>
) : null}
</div>
<p className="text-xs text-gray-300">
{gym
? "Your coach sets the training. Vaeon counts the sessions and reports back at the end of the block."
: rule.increase}
</p>
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
