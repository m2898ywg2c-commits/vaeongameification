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
          <p className="text-2xl font-bold leading-tight">Todays workout</p>
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
          <a href="/assessment" className="block rounded-2xl border border-white/15 bg-white/5 p-4 mb-3">
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
