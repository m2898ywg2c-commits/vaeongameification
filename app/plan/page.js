import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TYPES } from "@/lib/personality";
import { PLANS } from "@/lib/plan";

export default async function PlanPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: assessment } = await supabase
    .from("assessment_results")
    .select("*")
    .eq("user_id", user.id)
    .order("completed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!assessment) redirect("/assessment");

  const type = TYPES[assessment.type_id];
  const plan = PLANS[assessment.type_id];

  return (
    <main className="min-h-screen bg-[#0E1224] text-white px-6 py-12">
      <div className="max-w-md mx-auto">
        <a href="/dashboard" className="text-xs text-gray-400 underline">
          Back to dashboard
        </a>
        <div className="mt-4 mb-6">
          <div
            className="inline-block px-3 py-1 rounded-full text-xs font-bold mb-2"
            style={{
              background: "linear-gradient(90deg, " + type.colors[0] + ", " + type.colors[1] + ")",
            }}
          >
            {type.name}
          </div>
          <h1 className="text-2xl font-bold mb-2">Your plan this week</h1>
          <p className="text-sm text-gray-300">{plan.intro}</p>
        </div>

        {plan.style === "week" ? (
          <div className="space-y-2 mb-8">
            {plan.week.map(function (item) {
              return (
                <div
                  key={item.day}
                  className="flex items-center gap-4 rounded-xl border border-white/10 bg-white/5 px-4 py-3"
                >
                  <span className="text-xs font-bold uppercase text-gray-400 w-10">{item.day}</span>
                  <span className="text-sm flex-1">{item.title}</span>
                  {item.minutes > 0 ? (
                    <span className="text-xs text-gray-400">{item.minutes} min</span>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="mb-8">
            <p className="text-xs uppercase tracking-wide text-gray-400 mb-3">
              Pick any {plan.target} this week
            </p>
            <div className="space-y-2">
              {plan.menu.map(function (item) {
                return (
                  <div
                    key={item.title}
                    className="flex items-center gap-4 rounded-xl border border-white/10 bg-white/5 px-4 py-3"
                  >
                    <span className="text-sm flex-1">{item.title}</span>
                    <span className="text-xs text-gray-400">{item.minutes} min</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <a
          href="/log"
          className="inline-block px-6 py-2.5 rounded-full font-bold text-sm"
          style={{ background: "linear-gradient(90deg, #4CC9F0, #FF6B57)", color: "#0E1224" }}
        >
          Log a session
        </a>
      </div>
    </main>
  );
}

