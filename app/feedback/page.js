"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Home from "../Home";

export default function FeedbackPage() {
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const submit = async function (e) {
    e.preventDefault();
    if (!message.trim()) return;
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const res = await supabase.auth.getUser();
    const user = res.data.user;
    if (!user) { router.push("/login"); return; }
    const { error: e2 } = await supabase.from("feedback").insert({
      user_id: user.id,
      message: message.trim(),
    });
    setLoading(false);
    if (e2) { setError(e2.message); return; }
    setSent(true);
    setMessage("");
  };

  return (
    <main className="min-h-screen bg-[#0E1224] text-white px-5 py-8">
      <div className="max-w-md mx-auto">
        <div className="mb-6"><Home /></div>
        <h1 className="text-2xl font-bold mb-2">Tell us what you think</h1>
        <p className="text-sm text-gray-300 mb-6">
          Anything at all. What works, what does not, what is missing, what would make you use this more.
          It goes straight to the team.
        </p>

        {sent ? (
          <div className="rounded-2xl border border-white/15 bg-white/5 p-5">
            <p className="text-sm text-gray-200 mb-3">Got it, thank you. This genuinely helps shape what gets built next.</p>
            <button onClick={function () { setSent(false); }} className="text-sm underline" style={{ color: "#2DD4BF" }}>
              Send another
            </button>
          </div>
        ) : (
          <form onSubmit={submit}>
            <textarea
              value={message}
              onChange={function (e) { setMessage(e.target.value); }}
              rows={6}
              placeholder="Your thoughts..."
              className="w-full rounded-2xl px-4 py-3 bg-white/5 border border-white/10 text-white outline-none focus:border-[#2DD4BF] mb-3 text-sm"
            />
            {error ? <p className="text-sm text-red-400 mb-3">{error}</p> : null}
            <button
              type="submit"
              disabled={loading || !message.trim()}
              className="w-full py-3 rounded-full font-bold text-sm"
              style={{
                background: message.trim() ? "linear-gradient(90deg, #2DD4BF, #0F766E)" : "rgba(255,255,255,0.08)",
                color: message.trim() ? "#0E1224" : "rgba(255,255,255,0.4)",
              }}
            >
              {loading ? "Sending..." : "Send feedback"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
