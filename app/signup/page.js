"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { BrandLockup } from "../Brand";
import { DISCLAIMER_SHORT, DISCLAIMER_VERSION } from "../Disclaimer";
import { track, EVENTS } from "@/lib/events";

const AGE_GROUPS = ["Under 18", "18-24", "25-34", "35-44", "45-54", "55-64", "65+"];

export default function SignUpPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [screenName, setScreenName] = useState("");
  const [ageGroup, setAgeGroup] = useState(AGE_GROUPS[1]);
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();

    const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      const { error: profileError } = await supabase.from("profiles").insert({
        id: data.user.id,
        screen_name: screenName,
        age_group: ageGroup,
      });
      if (!profileError) {
        // Written separately and allowed to fail, because supabase/disclaimer.sql is a
        // later migration: until it is applied the columns do not exist. The tick box
        // still gates the form, so nobody signs up without agreeing either way. What is
        // lost before the migration lands is the evidence, not the consent.
        try {
          await supabase.from("profiles")
            .update({
              disclaimer_accepted_at: new Date().toISOString(),
              disclaimer_version: DISCLAIMER_VERSION,
            })
            .eq("id", data.user.id);
        } catch (ignored) {}
      }
      if (profileError) {
        setError(
          profileError.message.includes("duplicate")
            ? "That screen name's already taken, try another."
            : profileError.message
        );
        setLoading(false);
        return;
      }
    }

    // Only after the profile row exists. events.user_id is a foreign key to profiles, so
    // firing this any earlier would fail the constraint and lose the event, which is the
    // one signup event that has to land.
    track(supabase, EVENTS.SIGNUP_COMPLETED, { age_group: ageGroup });

    router.push("/dashboard");
    router.refresh();
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-brand-bg text-white px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-6">
          <BrandLockup size={30} full />
        </div>

        <h1 className="text-2xl font-bold mb-1">Create your account</h1>
        <p className="text-sm text-gray-400 mb-6">Your screen name is what other people see, never your real name.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs uppercase tracking-wide text-gray-400 mb-1">Screen name</label>
            <input
              type="text"
              required
              value={screenName}
              onChange={(e) => setScreenName(e.target.value)}
              placeholder="e.g. IronOtter"
              className="w-full rounded-lg px-3 py-2 bg-white/5 border border-white/10 text-white outline-none focus:border-[#22D3EE]"
            />
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wide text-gray-400 mb-1">Age group</label>
            <select
              value={ageGroup}
              onChange={(e) => setAgeGroup(e.target.value)}
              className="w-full rounded-lg px-3 py-2 bg-white/5 border border-white/10 text-white outline-none focus:border-[#22D3EE]"
            >
              {AGE_GROUPS.map((a) => (
                <option key={a} value={a} className="bg-brand-bg">
                  {a}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wide text-gray-400 mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg px-3 py-2 bg-white/5 border border-white/10 text-white outline-none focus:border-[#22D3EE]"
            />
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wide text-gray-400 mb-1">Password</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg px-3 py-2 bg-white/5 border border-white/10 text-white outline-none focus:border-[#22D3EE]"
            />
          </div>

          {/* Required, and deliberately not pre-ticked. A box the user actually clicked is
              evidence; a box that arrived ticked is not. */}
          <label className="flex gap-3 items-start rounded-2xl border border-white/10 bg-white/5 p-4 cursor-pointer">
            <input
              type="checkbox"
              required
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-[#22D3EE]"
            />
            <span className="text-xs text-gray-300 leading-relaxed">
              {DISCLAIMER_SHORT}{" "}
              <a href="/disclaimer" target="_blank" className="text-white underline">
                Read the full version
              </a>
              .
            </span>
          </label>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={loading || !accepted}
            className="w-full py-3 rounded-full font-bold text-sm"
            style={
              accepted
                ? { background: "linear-gradient(90deg, #22D3EE, #3B82F6)", color: "#000000" }
                : { background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.4)" }
            }
          >
            {loading ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p className="text-sm text-gray-400 mt-6 text-center">
          Already got an account?{" "}
          <a href="/login" className="text-white underline">
            Log in
          </a>
        </p>
      </div>
    </main>
  );
}
