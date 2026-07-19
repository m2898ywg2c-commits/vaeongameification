"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const AGE_GROUPS = ["Under 18", "18-24", "25-34", "35-44", "45-54", "55-64", "65+"];

export default function SignUpPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [screenName, setScreenName] = useState("");
  const [ageGroup, setAgeGroup] = useState(AGE_GROUPS[1]);
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

    router.push("/dashboard");
    router.refresh();
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-[#0E1224] text-white px-6 py-12">
      <div className="w-full max-w-sm">
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
              className="w-full rounded-lg px-3 py-2 bg-white/5 border border-white/10 text-white outline-none focus:border-[#FF6B57]"
            />
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wide text-gray-400 mb-1">Age group</label>
            <select
              value={ageGroup}
              onChange={(e) => setAgeGroup(e.target.value)}
              className="w-full rounded-lg px-3 py-2 bg-white/5 border border-white/10 text-white outline-none focus:border-[#FF6B57]"
            >
              {AGE_GROUPS.map((a) => (
                <option key={a} value={a} className="bg-[#0E1224]">
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
              className="w-full rounded-lg px-3 py-2 bg-white/5 border border-white/10 text-white outline-none focus:border-[#FF6B57]"
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
              className="w-full rounded-lg px-3 py-2 bg-white/5 border border-white/10 text-white outline-none focus:border-[#FF6B57]"
            />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-full font-bold text-sm"
            style={{ background: "linear-gradient(90deg, #4CC9F0, #FF6B57)", color: "#0E1224" }}
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
