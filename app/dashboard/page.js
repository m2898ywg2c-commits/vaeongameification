import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TYPES } from "@/lib/personality";
import { computeStats, coachMessage } from "@/lib/plan";
import { goalNames, adherenceScore, primaryCategory } from "@/lib/training";
import { currentWeek, weeksFor, blockComplete, BLOCK_WEEKS } from "@/lib/progression";
import SignOutButton from "./SignOutButton";
import AchievementWatcher from "./AchievementWatcher";
import TypeOrb from "../TypeOrb";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  if (!profile || !profile.goals || profile.goals.length === 0) redirect("/onboarding");

  const { data: assessment } = await supabase
    .from("assessment_results")
    .select("*")
    .eq("user_id", user.id)
    .order("completed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: sessions } = await supabase
    .from("training_sessions")
    .select("*")
    .eq("user_id", user.id)
    .order("logged_at", { ascending: false })
    .limit(300);

  const pledged = profile.sessions_per_week || 3;
  const typeId = assessment ? assessment.type_id : null;
  const type = typeId ? TYPES[typeId] : null;
  const stats = computeStats(sessions || [], pledged);
  const score = adherenceScore(stats.thisWeekCount, pledged);
  const nudge = type ? coachMessage(typeId, stats) : null;
  const names = goalNames(profile.goals);
  const category = primaryCategory(profile.goals);
  const weekNo = currentWeek(profile.block_start);
  const rule = weeksFor(category)[weekNo - 1] || weeksFor(category)[0];
  const finished = blockComplete(profile.block_start);
  const today = DAYS[new Date().getDay()];

  const plain = { sessions_per_week: pledged, block_start: profile.block_start || null };

  return (
    <main className="min-h-screen bg-[#0E1224] text-white px-5 py-8">
      <div className="max-w-md mx-auto">

        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            {type ? <TypeOrb typeId={typeId} size={46} /> : null}
            <div>
              <p className="text-lg font-bold leading-tight">{profile.screen_name}</p>
              <p className="text-xs leading-tight" style={{ color: type ? type.colors[0] : "#8B93A7" }}>
                {type ? type.name : names.join(" + ")}
              </p>
            </div>
          </div>
          <SignOutButton />
        </div>

        <a
          href="/plan"
          className="block rounded-2xl p-5 mb-3"
          style={{ background: "linear-gradient(135deg, #4CC9F0, #FF6B57)", color: "#0E1224" }}
        >
          <p className="text-xs font-bold uppercase tracking-wide opacity-70">{today}</p>
          <p className="text-2xl font-bold leading-tight">Today is workout</p>
          <p className="text-sm font-medium opacity-80 mt-1">Tap to open and start logging</p>
        </a>

        <a
          href="/fallback"
          className="flex items-center gap-3 rounded-2xl border-2 p-4 mb-5"
          style={{ borderColor: "#FFB020", background: "rgba(255,176,32,0.08)" }}
        >
          <span className="text-2xl" aria-hidden="true">🏠</span>
          <div className="flex-1">
            <p className="text-sm font-bold" style={{ color: "#FFB020" }}>Cannot get to the gym today?</p>
            <p className="text-xs text-gray-300">Desk, hotel or home. Keeps your streak alive.</p>
          </div>
          <span className="text-lg" style={{ color: "#FFB020" }}>›</span>
        </a>

        <div className="grid grid-cols-3 gap-2 mb-5">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-center">
            <p className="text-xl" aria-hidden="true">⚡</p>
            <p className="text-xl font-bold leading-tight">{stats.level}</p>
            <p className="text-[10px] uppercase tracking-wide text-gray-400">Level</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-center">
            <p className="text-xl" aria-hidden="true">🎯</p>
            <p className="text-xl font-bold leading-tight">{stats.thisWeekCount}/{pledged}</p>
            <p className="text-[10px] uppercase tracking-wide text-gray-400">This week</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-center">
            <p className="text-xl" aria-hidden="true">🔥</p>
            <p className="text-xl font-bold leading-tight">{stats.weekStreak}</p>
            <p className="text-[10px] uppercase tracking-wide text-gray-400">Streak</p>
          </div>
        </div>

        {type ? (
          <div
            className="rounded-2xl p-4 mb-3 border"
            style={{ borderColor: type.colors[0] + "55", background: type.colors[1] + "22" }}
          >
            <div className="flex items-center gap-2 mb-2">
              <TypeOrb typeId={typeId} size={26} />
              <p className="text-xs font-bold uppercase tracking-wide" style={{ color: type.colors[0] }}>
                {type.name} says
              </p>
            </div>
            <p className="text-sm">{nudge}</p>
          </div>
        ) : (
          <a
            href="/assessment"
            className="block rounded-2xl border border-white/15 bg-white/5 p-4 mb-3"
          >
            <p className="text-sm font-bold mb-1">Find your training personality</p>
            <p className="text-xs text-gray-400">Two minutes. It decides how you get coached.</p>
          </a>
        )}

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 mb-5">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-bold">
              Block {profile.block_number || 1} · Week {weekNo}/{BLOCK_WEEKS}
            </p>
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: "#4CC9F033", color: "#4CC9F0" }}
            >
              {rule.label}
            </span>
          </div>
          <p className="text-xs text-gray-300">{rule.increase}</p>
          {finished ? (
            <a href="/settings" className="text-xs underline block mt-2" style={{ color: "#3DDC97" }}>
              Block complete. Start the next one.
            </a>
          ) : null}
          {!profile.block_start ? (
            <a href="/settings" className="text-xs underline block mt-2" style={{ color: "#FFB020" }}>
              Set your block start date
            </a>
          ) : null}
        </div>

        <AchievementWatcher profile={plain} />

        <div className="grid grid-cols-2 gap-2 mb-5">
          <a href="/log" className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xl mb-1" aria-hidden="true">✏️</p>
            <p className="text-sm font-bold">Quick log</p>
          </a>
          <a href="/leaderboard" className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xl mb-1" aria-hidden="true">🏆</p>
            <p className="text-sm font-bold">Leaderboard</p>
          </a>
          <a href="/progress" className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xl mb-1" aria-hidden="true">📈</p>
            <p className="text-sm font-bold">Progress</p>
          </a>
          <a href="/settings" className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xl mb-1" aria-hidden="true">⚙️</p>
            <p className="text-sm font-bold">Settings</p>
          </a>
        </div>

        <a href="/onboarding" className="block text-center text-xs text-gray-500 underline">
          Change goals or sessions a week
        </a>
      </div>
    </main>
  );
}
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TYPES } from "@/lib/personality";
import { computeStats, coachMessage } from "@/lib/plan";
import { goalNames, adherenceScore, primaryCategory } from "@/lib/training";
import { currentWeek, weeksFor, blockComplete, BLOCK_WEEKS } from "@/lib/progression";
import SignOutButton from "./SignOutButton";
import AchievementWatcher from "./AchievementWatcher";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();

  if (!profile || !profile.goals || profile.goals.length === 0) redirect("/onboarding");

  const { data: assessment } = await supabase
    .from("assessment_results")
    .select("*")
    .eq("user_id", user.id)
    .order("completed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: sessions } = await supabase
    .from("training_sessions")
    .select("*")
    .eq("user_id", user.id)
    .order("logged_at", { ascending: false })
    .limit(300);

  const pledged = profile.sessions_per_week || 3;
  const type = assessment ? TYPES[assessment.type_id] : null;
  const stats = computeStats(sessions || [], pledged);
  const score = adherenceScore(stats.thisWeekCount, pledged);
  const nudge = type ? coachMessage(assessment.type_id, stats) : null;
  const names = goalNames(profile.goals);
  const category = primaryCategory(profile.goals);
  const weekNo = currentWeek(profile.block_start);
  const rule = weeksFor(category)[weekNo - 1] || weeksFor(category)[0];
  const finished = blockComplete(profile.block_start);

  const plain = {
    sessions_per_week: pledged,
    block_start: profile.block_start || null,
  };

  return (
    <main className="min-h-screen bg-[#0E1224] text-white px-6 py-10">
      <div className="max-w-md mx-auto">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold">Welcome, {profile.screen_name}</h1>
          <SignOutButton />
        </div>
        <p className="text-sm text-gray-400 mb-6">{names.join(" + ")}</p>

        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-center">
            <p className="text-2xl font-bold">{stats.level}</p>
            <p className="text-[10px] uppercase tracking-wide text-gray-400 mt-1">Level</p>
            <p className="text-[10px] text-gray-500 mt-1">{stats.intoLevel}/{stats.needed} xp</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-center">
            <p className="text-2xl font-bold">{stats.thisWeekCount}/{pledged}</p>
            <p className="text-[10px] uppercase tracking-wide text-gray-400 mt-1">This week</p>
            <p className="text-[10px] text-gray-500 mt-1">score {score}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-center">
            <p className="text-2xl font-bold">{stats.weekStreak}</p>
            <p className="text-[10px] uppercase tracking-wide text-gray-400 mt-1">Week streak</p>
            <p className="text-[10px] text-gray-500 mt-1">{stats.totalXp} xp</p>
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 p-5 mb-4">
          <div className="flex items-baseline justify-between mb-1">
            <p className="text-sm font-bold">
              Block {profile.block_number || 1}, week {weekNo} of {BLOCK_WEEKS}
            </p>
            <span className="text-xs text-gray-400">{rule.label}</span>
          </div>
          <p className="text-sm text-gray-300">{rule.increase}</p>
          {finished ? (
            <p className="text-sm text-emerald-400 mt-3">
              Block complete. <a href="/settings" className="underline">Update your baselines and start the next one</a>.
            </p>
          ) : null}
          {!profile.block_start ? (
            <p className="text-xs text-amber-400 mt-3">
              <a href="/settings" className="underline">Set your block start date</a> so this tracks properly.
            </p>
          ) : null}
        </div>

        {type ? (
          <div className="rounded-xl border border-white/10 bg-white/5 p-5 mb-4">
            <p className="text-xs uppercase tracking-wide text-gray-400 mb-2">Your coach says</p>
            <p className="text-sm mb-4">{nudge}</p>
            <div className="flex flex-wrap gap-2">
              <a
                href="/plan"
                className="px-5 py-2 rounded-full font-bold text-sm"
                style={{ background: "linear-gradient(90deg, #4CC9F0, #FF6B57)", color: "#0E1224" }}
              >
                Today is plan
              </a>
              <a href="/log" className="px-5 py-2 rounded-full font-bold text-sm border border-white/20">
                Quick log
              </a>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-white/10 bg-white/5 p-5 mb-4">
            <p className="text-sm text-gray-300 mb-4">
              One thing left: the two-minute assessment that decides how you get coached.
            </p>
            <a
              href="/assessment"
              className="inline-block px-5 py-2 rounded-full font-bold text-sm"
              style={{ background: "linear-gradient(90deg, #4CC9F0, #FF6B57)", color: "#0E1224" }}
            >
              Find your training personality
            </a>
          </div>
        )}

        <AchievementWatcher profile={plain} />

        <div className="grid grid-cols-2 gap-3 mb-4">
          <a href="/leaderboard" className="rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-sm font-bold">Leaderboard</p>
            <p className="text-xs text-gray-400 mt-1">Scored on your own pledge</p>
          </a>
          <a href="/progress" className="rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-sm font-bold">Progress</p>
            <p className="text-xs text-gray-400 mt-1">Is it actually working?</p>
          </a>
          <a href="/fallback" className="rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-sm font-bold">Cannot get to the gym</p>
            <p className="text-xs text-gray-400 mt-1">Desk, hotel or home</p>
          </a>
          <a href="/settings" className="rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-sm font-bold">Settings</p>
            <p className="text-xs text-gray-400 mt-1">Block dates and baselines</p>
          </a>
        </div>

        <a href="/onboarding" className="block rounded-xl border border-white/10 bg-white/5 p-4 mb-4">
          <p className="text-sm font-bold">Change goals</p>
          <p className="text-xs text-gray-400 mt-1">Goals and sessions a week</p>
        </a>

        {type ? (
          <div className="rounded-xl border border-white/10 bg-white/5 p-5">
            <p className="text-xs uppercase tracking-wide text-gray-400 mb-2">Training personality</p>
            <div
              className="inline-block px-3 py-1 rounded-full text-xs font-bold mb-2"
              style={{ background: "linear-gradient(90deg, " + type.colors[0] + ", " + type.colors[1] + ")" }}
            >
              {type.name}
            </div>
            <p className="text-sm text-gray-300 mb-3">{type.coaching}</p>
            <a href="/assessment" className="text-xs underline text-gray-400">Retake the assessment</a>
          </div>
        ) : null}
      </div>
    </main>
  );
}
