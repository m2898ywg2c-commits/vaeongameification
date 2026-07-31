"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { BrandLockup } from "../Brand";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-brand-bg text-white px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-7">
          <BrandLockup size={30} full />
        </div>

        <h1 className="font-display text-3xl font-normal mb-1">Welcome back</h1>
        <p className="text-sm text-gray-400 mb-8">Log in to pick up where you left off.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs uppercase tracking-wide text-gray-400 mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-sm px-3 py-2 bg-brand-surface border border-brand-line text-white outline-none focus:border-[#22D3EE]"
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wide text-gray-400 mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-sm px-3 py-2 bg-brand-surface border border-brand-line text-white outline-none focus:border-[#22D3EE]"
            />
            <div className="text-right mt-1">
              <a href="/forgot-password" className="text-xs text-gray-400 underline">Forgot password?</a>
            </div>
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-sm font-display text-sm"
            style={{ background: "#22D3EE", color: "#000000" }}
          >
            {loading ? "Logging in..." : "Log in"}
          </button>
        </form>

        <div className="flex items-center gap-3 my-7">
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-xs uppercase tracking-wide text-gray-500">or</span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        <div className="rounded-md border border-brand-line bg-brand-surface p-5 text-center">
          <p className="font-display text-lg font-normal mb-1">New here?</p>
          <p className="text-sm text-gray-300 mb-4">
            It takes about a minute. Tell us what you are training for and we will build the plan.
          </p>
          <a
            href="/signup"
            className="block w-full py-3 rounded-sm font-display text-sm border"
            style={{ borderColor: "#22D3EE", color: "#22D3EE" }}
          >
            Create an account
          </a>
        </div>
      </div>
    </main>
  );
}
