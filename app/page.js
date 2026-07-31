import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function Landing() {
  const supabase = await createClient();
  const res = await supabase.auth.getUser();
  if (res && res.data && res.data.user) redirect("/dashboard");

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-brand-bg text-white px-6 text-center">
      <h1 className="text-4xl font-display mb-3">Welcome to Vaeon</h1>
      <p className="text-base text-gray-300 mb-10 max-w-md">
        Your bespoke personal trainer and accountability partner.
      </p>

      <div className="flex gap-3">
        <a
          href="/signup"
          className="px-6 py-2.5 rounded-sm font-display text-sm"
          style={{ background: "#22D3EE", color: "#000000" }}
        >
          Create account
        </a>
        <a href="/login" className="px-6 py-2.5 rounded-sm font-display text-sm border border-brand-line">
          Log in
        </a>
      </div>
    </main>
  );
}
