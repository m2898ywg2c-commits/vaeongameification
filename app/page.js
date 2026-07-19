import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const hasEnvVars =
    !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  let connectionStatus = "Not configured yet";
  let connectionOk = false;

  if (hasEnvVars) {
    try {
      const supabase = await createClient();
      // a harmless call that just proves the client can reach Supabase
      const { error } = await supabase.auth.getSession();
      connectionOk = !error;
      connectionStatus = error ? `Connected, but returned an error: ${error.message}` : "Connected successfully";
    } catch (e) {
      connectionStatus = `Could not connect: ${e.message}`;
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-[#0E1224] text-white px-6">
      <h1 className="text-3xl font-bold mb-2">Coach — Next.js + Supabase</h1>
      <p className="text-sm text-gray-400 mb-8">Project scaffold is live.</p>

      <div className="w-full max-w-md rounded-xl border border-white/10 bg-white/5 p-5">
        <p className="text-xs uppercase tracking-wide text-gray-400 mb-1">Environment variables</p>
        <p className="text-sm mb-4">
          {hasEnvVars ? "Found" : "Missing"} — set these in Vercel under Settings, Environment
          Variables: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.
        </p>

        <p className="text-xs uppercase tracking-wide text-gray-400 mb-1">Supabase connection</p>
        <p className={`text-sm ${connectionOk ? "text-emerald-400" : "text-amber-400"}`}>
          {connectionStatus}
        </p>
      </div>

      <div className="flex gap-3 mt-6">
        <a
          href="/signup"
          className="px-6 py-2.5 rounded-full font-bold text-sm"
          style={{ background: "linear-gradient(90deg, #4CC9F0, #FF6B57)", color: "#0E1224" }}
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
