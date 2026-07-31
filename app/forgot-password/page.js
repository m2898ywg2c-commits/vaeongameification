"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const redirectTo = window.location.origin + "/reset-password";
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    setLoading(false);
    // Always show the same confirmation, so we never reveal whether an email exists.
    if (resetError) { setError(resetError.message); return; }
    setSent(true);
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-brand-bg text-white px-6 py-12">
      <div className="w-full max-w-sm">
        <a href="/login" className="inline-block text-xs text-gray-400 underline mb-6">Back to log in</a>
        <h1 className="font-display text-3xl font-normal mb-1">Forgot your password?</h1>
        <p className="text-sm text-gray-400 mb-8">
          Pop your email in and we will send a link to set a new one.
        </p>

        {sent ? (
          <div className="rounded-md border border-brand-line bg-brand-surface p-5">
            <p className="text-sm text-gray-200">
              If an account exists for <span className="font-display">{email}</span>, a reset link is on its way.
              Check your inbox, and your spam folder just in case.
            </p>
          </div>
        ) : (
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
            {error && <p className="text-sm text-red-400">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-sm font-display text-sm"
              style={{ background: "#22D3EE", color: "#000000" }}
            >
              {loading ? "Sending..." : "Send reset link"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
