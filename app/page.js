import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function Landing() {
  const supabase = await createClient();
  const res = await supabase.auth.getUser();
  if (res && res.data && res.data.user) redirect("/dashboard");

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-[#0E1224] text-white px-6 text-center">
      <h1 className="text-4xl font-bold mb-3">Welcome to Vaeon</h1>
      <p className="text-base text-gray-300 mb-10 max-w-md">
        Your bespoke personal trainer and accountability partner.
      </p>

      <div className="flex gap-3">
        <a
          href="/signup"
          className="px-6 py-2.5 rounded-full font-bold text-sm"
          style={{ background: "linear-gradient(90deg, #2DD4BF, #0F766E)", color: "#0E1224" }}
        >
          Create account
        </a>
        <a href="/login" className="px-6 py-2.5 rounded-full font-bold text-sm border border-white/20">
          Log in
        </a>
      </div>
    </main>
  );
}
