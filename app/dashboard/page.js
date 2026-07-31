import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TYPES } from "@/lib/personality";
import { computeStats, coachMessage } from "@/lib/plan";
import { goalNames, primaryCategory } from "@/lib/training";
import { weeksFor } from "@/lib/progression";
import { isGymReady, blockWeeksFor, currentWeekIn, blockCompleteIn } from "@/lib/gymready";
import SignOutButton from "./SignOutButton";
import AchievementWatcher from "./AchievementWatcher";
import KudosCard from "./KudosCard";
import TypeOrb from "../TypeOrb";
import ShareButton from "../ShareButton";
import Track from "../Track";
import ChallengeCard from "./ChallengeCard";
import ToDo from "./ToDo";
import Icon from "../Icon";
import { BRAND, TRACK } from "@/lib/brand";
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

// Shared card. One radius, one border, one surface, all from the token layer rather than
// a bg-brand-surface written out by hand on twenty elements.
const card = "rounded-md border p-4 mb-3";
const cardStyle = { borderColor: BRAND.line, background: BRAND.surface };

return (
<main className="min-h-screen text-white px-5 py-8" style={{ background: "#000000" }}>
<div className="max-w-md mx-auto">

<div className="flex items-center justify-between mb-5">
<div className="flex items-center gap-3">
{type ? <TypeOrb typeId={typeId} size={46} /> : null}
<div>
<p className="font-display text-lg font-normal leading-tight">{profile.screen_name}</p>
<p className="text-[10px] leading-tight uppercase" style={{ color: accent, letterSpacing: TRACK.label }}>
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

{/* SETUP TASKS FIRST, BECAUSE THEY END.
Starting weights, this week's measurements and the install offer are jobs with a
finish line, and each one disappears the moment it is done. Grouped, counted and
placed above the workout button they read as a short list to clear. Left loose below
it, as they were, an amber card about starting weights read as permanent furniture. */}
<ToDo accent={accent} needsBaselines={noBaselines} needsMetrics={!thisWeekMetrics} />

<p className="rule-label rule-label-left mb-2">{profile.fixed_days === false ? "Next up" : today}</p>

{/* Filled, not outlined. The outline version was quieter than the cards around it and
lost the argument: this is the one thing the app wants somebody to do, and on a black
screen a solid accent block is how you say so. The gradient is gone though, and the
type is display weight 400 rather than bold, so it carries the brand rather than
shouting over it. */}
<a href="/plan" className="flex items-center gap-3 rounded-md p-5 mb-3"
style={{ background: accent, color: "#000000" }}>
<div className="flex-1">
<p className="font-display text-2xl font-normal leading-none">Today&rsquo;s workout</p>
<p className="text-xs mt-1.5" style={{ color: "rgba(0,0,0,0.65)" }}>Open and start logging</p>
</div>
<Icon name="arrow" size={22} />
</a>

{/* WHERE YOU ARE IN THE BLOCK, DIRECTLY UNDER THE BUTTON, PERMANENTLY.
This is the context for the thing you are about to do: which week, what that week is
for, and what changes in it. It was sitting near the bottom under the kudos card,
which meant the answer to "why is today heavy" was four scrolls away from today. It
is not a task and it never completes, so unlike the To do group it stays put. */}
<div className="rounded-md border p-4 mb-3" style={{ borderColor: BRAND.line, background: BRAND.surface }}>
<div className="flex items-center justify-between mb-1.5">
<p className="font-display text-sm">Block {profile.block_number || 1} &middot; Week {weekNo}/{blockWeeks}</p>
{/* Was a full pill. Nothing in this app is a pill any more: the mark has no curve in
it anywhere and a lozenge next to it always looked borrowed. */}
{!gym ? (
<span className="text-[9px] uppercase px-2 py-1 rounded-sm border"
style={{ borderColor: accent + "55", color: accent, letterSpacing: TRACK.label }}>{rule.label}</span>
) : null}
</div>
<p className="text-xs leading-relaxed" style={{ color: BRAND.muted }}>
{gym
? "Your coach sets the training. Vaeon counts the sessions and reports back at the end of the block."
: rule.increase}
</p>
{finished ? <a href="/blockend" className="text-xs underline block mt-2" style={{ color: "#3DDC97" }}>Block complete. See your summary and start the next one.</a> : null}
{!profile.block_start ? <a href="/settings" className="text-xs underline block mt-2" style={{ color: "#FFB020" }}>Set your block start date</a> : null}
</div>

<ChallengeCard challenge={challenge} accent={accent} />

{finished ? (
<a href="/blockend" className="flex items-center gap-3 rounded-md border p-4 mb-3" style={{ borderColor: "#3DDC97", background: "rgba(61,220,151,0.08)" }}>
<span style={{ color: "#3DDC97" }}><Icon name="flag" size={20} /></span>
<div className="flex-1">
<p className="font-display text-sm" style={{ color: "#3DDC97" }}>Block {profile.block_number || 1} complete</p>
<p className="text-xs text-gray-300">See your {blockWeeks}-week summary and roll straight into the next one.</p>
</div>
<span style={{ color: "#3DDC97" }}>&rsaquo;</span>
</a>
) : null}


{!gym ? (
<a href="/fallback" className="flex items-center gap-3 rounded-md border p-4 mb-5" style={{ borderColor: "#FFB020", background: "rgba(255,176,32,0.06)" }}>
<span style={{ color: "#FFB020" }}><Icon name="home" size={20} /></span>
<div className="flex-1">
<p className="font-display text-sm" style={{ color: "#FFB020" }}>Can&rsquo;t get to the gym today?</p>
<p className="text-xs text-gray-300">Desk, hotel or home. Keeps your streak alive.</p>
</div>
<span className="text-lg" style={{ color: "#FFB020" }}>&rsaquo;</span>
</a>
) : <div className="mb-5" />}

{/* ONE INSTRUMENT PANEL, NOT THREE BOXES.
Three separately rounded cards each carrying a coloured emoji meant the decoration
outweighed the data on a screen whose entire job is the data. Now it is a single
hairline grid: the number is the largest thing, the label is a tracked micro-caption
above it, and the borders are drawn by the gaps rather than by three sets of corners.
Tabular figures come from globals.css, so nothing shuffles when a digit changes. */}
<div className="grid grid-cols-3 gap-px mb-4 rounded-md overflow-hidden border"
style={{ borderColor: BRAND.line, background: BRAND.line }}>
{[
{ label: "Level", value: String(stats.level), on: false },
{ label: "This week", value: stats.thisWeekCount + "/" + pledged, on: stats.thisWeekCount >= pledged },
{ label: "Streak", value: String(stats.weekStreak), on: stats.weekStreak > 0 },
].map(function (t) {
return (
<div key={t.label} className="px-3 py-3" style={{ background: BRAND.bg }}>
<p className="text-[9px] uppercase" style={{ color: BRAND.dim, letterSpacing: TRACK.label }}>{t.label}</p>
<p className="font-display text-2xl font-normal leading-none mt-1.5"
style={{ color: t.on ? accent : BRAND.text }}>{t.value}</p>
</div>
);
})}
</div>

{/* Grace weeks. Shown whether or not one has been spent, because a safety net nobody
knows about does not do the job: half the value of a freeze is not being afraid of
losing the streak in the first place. When one has been used it says so plainly, since
a streak quietly propped up by a week you did not train would be a lie told kindly. */}
{profile.block_start ? (
<div className="rounded-md border p-3 mb-5 flex items-center gap-3" style={{ borderColor: BRAND.line, background: BRAND.surface }}>
<span style={{ color: BRAND.muted }}><Icon name="shield" size={18} /></span>
<div className="flex-1">
<p className="font-display text-xs">
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
<div className="rounded-md p-4 mb-3 border" style={{ borderColor: accent + "44", background: BRAND.surface }}>
<a href={"/type?id=" + typeId} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 mb-2">
<TypeOrb typeId={typeId} size={24} />
<p className="text-[9px] uppercase flex-1" style={{ color: accent, letterSpacing: TRACK.label }}>The {type.name.replace("The ", "")} style</p>
<span style={{ color: accent }}><Icon name="arrow" size={14} /></span>
</a>
<p className="text-sm leading-relaxed" style={{ color: "#d1d5db" }}>{nudge}</p>
</div>
) : (
<a href="/assessment" className="block rounded-md border p-4 mb-3" style={{ borderColor: BRAND.line, background: BRAND.surface }}>
<p className="font-display text-sm mb-1">Find your training personality</p>
<p className="text-xs text-gray-400">Two minutes. It decides how you get coached.</p>
</a>
)}

{/* ---------- Kudos received ---------- */}
<KudosCard kudos={myKudos} accent={accent} />

<AchievementWatcher profile={plain} />

<p className="rule-label mb-3">Elsewhere</p>

{/* A hairline grid rather than four rounded cards, matching the stat panel above. The
icons are outlines in currentColor, so they take the accent and sit with the mark
instead of importing four more palettes from the emoji font. */}
<div className="grid grid-cols-2 gap-px mb-5 rounded-md overflow-hidden border"
style={{ borderColor: BRAND.line, background: BRAND.line }}>
{[
{ href: "/log", icon: "pencil", label: "Quick log" },
{ href: "/leaderboard", icon: "board", label: "Leaderboard" },
{ href: "/progress", icon: "chart", label: "Progress" },
{ href: "/settings", icon: "sliders", label: "Stats and settings" },
].map(function (t) {
return (
<a key={t.href} href={t.href} className="flex items-center gap-2.5 px-3 py-4" style={{ background: BRAND.bg }}>
<span style={{ color: accent }}><Icon name={t.icon} size={18} /></span>
<span className="text-sm">{t.label}</span>
</a>
);
})}
</div>

<div className="mb-4"><ShareButton accent={accent} /></div>

<a href="/onboarding" className="block text-center text-xs text-gray-500 underline">Change goals, days or sessions a week</a>
<a href="/feedback" className="block text-center text-xs text-gray-500 underline mt-2">Send feedback</a>
</div>
</main>
);
}
