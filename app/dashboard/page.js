import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
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

  return (
    <main className="min-h-screen bg-[#0E1224] text-white px-6 py-12">
      <div className="max-w-md mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold">
            {profile ? `Welcome, ${profile.screen_name}` : "Welcome"}
          </h1>
          <SignOutButton />
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 p-5 mb-4">
          <p className="text-xs uppercase tracking-wide text-gray-400 mb-2">Account</p>
          <p className="text-sm">Email: {user.email}</p>
          <p className="text-sm mt-1">Age group: {profile?.age_group || "not set"}</p>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/5 p-5">
          <p className="text-xs uppercase tracking-wide text-gray-400 mb-2">Personality assessment</p>
          {assessment ? (
            <p className="text-sm">
              You're <strong>{assessment.type_id}</strong>, completed{" "}
              {new Date(assessment.completed_at).toLocaleDateString()}
            </p>
          ) : (
            <p className="text-sm text-gray-400">
              Not taken yet, this is step 2, porting the actual assessment onto this account.
            </p>
          )}
        </div>

        <p className="text-xs text-gray-500 mt-8">
          Step 1 of the migration, real account, real database, row-level security switched on
          from the start. Next up: the actual assessment and training log, saving here instead of
          your phone's local storage.
        </p>
      </div>
    </main>
  );
}
