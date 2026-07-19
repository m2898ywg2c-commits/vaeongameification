import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TYPES } from "@/lib/personality";
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

  const type = assessment ? TYPES[assessment.type_id] : null;

  return (
    <main className="min-h-screen bg-[#0E1224] text-white px-6 py-12">
      <div className="max-w-md mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold">
            {profile ? "Welcome, " + profile.screen_name : "Welcome"}
          </h1>
          <SignOutButton />
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 p-5 mb-4">
          <p className="text-xs uppercase tracking-wide text-gray-400 mb-2">Account</p>
          <p className="text-sm">Email: {user.email}</p>
          <p className="text-sm mt-1">Age group: {profile?.age_group || "not set"}</p>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 p-5">
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
              <p className="text-sm mb-3">{type.plan}</p>
              <p className="text-sm text-gray-300 mb-4">{type.coaching}</p>
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
      </div>
    </main>
  );
}
