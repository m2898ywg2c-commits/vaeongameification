import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TYPES } from "@/lib/personality";
import { computeStats, coachMessage } from "@/lib/plan";
import { goalNames, adherenceScore } from "@/lib/training";
import SignOutButton from "./SignOutButton";

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

  const type = assessment ? TYPES[assessment.type_id] : null;
  const stats = computeStats(sessions || []);
  const pledged = profile.sessions_per_week || 3;
  const score = adherenceScore(stats.thisWeekCount, pledged);
  const nudge = type ? coachMessage(assessment.type_id, stats) : null;
  const names = goalNames(profile.goals);

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

        <div className="grid grid-cols-2 gap-3 mb-4">
          <a href="/leaderboard" className="rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-sm font-bold">Leaderboard</p>
            <p className="text-xs text-gray-400 mt-1">Scored on your own pledge</p>
          </a>
          <a href="/progress" className="rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-sm font-bold">Progress</p>
            <p className="text-xs text-gray-400 mt-1">Measurements and lifts</p>
          </a>
          <a href="/fallback" className="rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-sm font-bold">Cannot get to the gym</p>
            <p className="text-xs text-gray-400 mt-1">Desk, hotel or home</p>
          </a>
          <a href="/onboarding" className="rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-sm font-bold">Change goals</p>
            <p className="text-xs text-gray-400 mt-1">Goals and sessions a week</p>
          </a>
        </div>

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
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TYPES } from "@/lib/personality";
import { computeStats, coachMessage, WEEKLY_TARGET } from "@/lib/plan";
import SignOutButton from "./SignOutButton";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();

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

  const type = assessment ? TYPES[assessment.type_id] : null;
  const stats = computeStats(sessions || []);
  const nudge = type ? coachMessage(assessment.type_id, stats) : null;

  return (
    <main className="min-h-screen bg-[#0E1224] text-white px-6 py-12">
      <div className="max-w-md mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold">
            {profile ? "Welcome, " + profile.screen_name : "Welcome"}
          </h1>
          <SignOutButton />
        </div>

        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-center">
            <p className="text-2xl font-bold">{stats.level}</p>
            <p className="text-[10px] uppercase tracking-wide text-gray-400 mt-1">Level</p>
            <p className="text-[10px] text-gray-500 mt-1">
              {stats.intoLevel}/{stats.needed} xp
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-center">
            <p className="text-2xl font-bold">
              {stats.thisWeekCount}/{WEEKLY_TARGET}
            </p>
            <p className="text-[10px] uppercase tracking-wide text-gray-400 mt-1">This week</p>
            <p className="text-[10px] text-gray-500 mt-1">sessions</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-center">
            <p className="text-2xl font-bold">{stats.weekStreak}</p>
            <p className="text-[10px] uppercase tracking-wide text-gray-400 mt-1">Week streak</p>
            <p className="text-[10px] text-gray-500 mt-1">{stats.totalXp} xp total</p>
          </div>
        </div>

        {type ? (
          <div className="rounded-xl border border-white/10 bg-white/5 p-5 mb-4">
            <p className="text-xs uppercase tracking-wide text-gray-400 mb-2">Your coach says</p>
            <p className="text-sm mb-3">{nudge}</p>
            <div className="flex gap-3">
              <a
                href="/log"
                className="px-5 py-2 rounded-full font-bold text-sm"
                style={{ background: "linear-gradient(90deg, #4CC9F0, #FF6B57)", color: "#0E1224" }}
              >
                Log a session
              </a>
              <a
                href="/plan"
                className="px-5 py-2 rounded-full font-bold text-sm border border-white/20"
              >
                View plan
              </a>
            </div>
          </div>
        ) : null}

        <div className="rounded-xl border border-white/10 bg-white/5 p-5 mb-4">
          <p className="text-xs uppercase tracking-wide text-gray-400 mb-2">Training personality</p>
          {type ? (
            <div>
              <div
                className="inline-block px-3 py-1 rounded-full text-xs font-bold mb-2"
                style={{
                  background: "linear-gradient(90deg, " + type.colors[0] + ", " + type.colors[1] + ")",
                }}
              >
                {type.name}
              </div>
              <p className="text-xs text-gray-400 mb-2">{type.code}</p>
              <p className="text-sm text-gray-300 mb-3">{type.coaching}</p>
              <a href="/assessment" className="text-xs underline text-gray-400">
                Retake the assessment
              </a>
            </div>
          ) : (
            <div>
              <p className="text-sm text-gray-300 mb-4">
                Take the two-minute assessment to discover your training personality. It shapes
                the plan Vaeon builds for you and how you are coached.
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
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 p-5">
          <p className="text-xs uppercase tracking-wide text-gray-400 mb-2">Account</p>
          <p className="text-sm">Email: {user.email}</p>
          <p className="text-sm mt-1">Age group: {profile?.age_group || "not set"}</p>
        </div>
      </div>
    </main>
  );
}
