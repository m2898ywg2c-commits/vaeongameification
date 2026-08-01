"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const router = useRouter();

  // Arriving from the email link, the client picks up the recovery token from the URL and
  // fires a PASSWORD_RECOVERY event, which gives us a temporary session to set a new password.
  useEffect(function () {
    const supabase = createClient();
    supabase.auth.getSession().then(function (r) {
      if (r.data && r.data.session) setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange(function (event) {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    return function () { sub.subscription.unsubscribe(); };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (password.length < 6) { setError("Use at least 6 characters."); return; }
    if (password !== confirm) { setError("Those two do not match."); return; }
    setLoading(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password: password });
    setLoading(false);
    if (updateError) { setError(updateError.message); return; }
    setDone(true);
    setTimeout(function () { router.push("/dashboard"); }, 1500);
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-brand-bg text-brand-text px-6 py-12">
      <div className="w-full max-w-sm">
        <h1 className="font-display text-3xl font-normal mb-1">Set a new password</h1>
        <p className="text-sm text-brand-muted mb-8">Pick something you will remember this time.</p>

        {done ? (
          <div className="rounded-md border border-brand-line bg-brand-surface p-5">
            <p className="text-sm text-brand-text">Done. Taking you to your dashboard.</p>
          </div>
        ) : !ready ? (
          <div className="rounded-md border border-brand-line bg-brand-surface p-5">
            <p className="text-sm text-brand-text mb-2">This link looks incomplete or expired.</p>
            <a href="/forgot-password" className="text-sm underline" style={{ color: "#22D3EE" }}>Request a fresh link</a>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs uppercase tracking-wide text-brand-muted mb-1">New password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-sm px-3 py-2 bg-brand-surface border border-brand-line text-brand-text outline-none focus:border-[#22D3EE]"
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wide text-brand-muted mb-1">Confirm password</label>
              <input
                type="password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full rounded-sm px-3 py-2 bg-brand-surface border border-brand-line text-brand-text outline-none focus:border-[#22D3EE]"
              />
            </div>
            {error && <p className="text-sm text-red-400">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-sm font-display text-sm"
              style={{ background: "var(--brand-accent)", color: "var(--brand-bg)" }}
            >
              {loading ? "Saving..." : "Save new password"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
