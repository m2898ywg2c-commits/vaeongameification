"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Home from "../Home";

export default function LeaderboardPage() {
  const [rows, setRows] = useState([]);
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(function () {
    const supabase = createClient();
    supabase.auth.getUser().then(function (res) {
      const user = res.data.user;
      if (user) {
        supabase.from("profiles").select("screen_name").eq("id", user.id).single().then(function (r) {
          if (r.data) setMe(r.data.screen_name);
        });
      }
    });
    supabase.rpc("get_leaderboard").then(function (r) {
      setRows(r.data || []);
      setLoading(false);
    });
  }, []);

  return (
    <main className="min-h-screen bg-[#0E1224] text-white px-6 py-10">
      <div className="max-w-md mx-auto">
        <div className="mb-6">
          <Home />
        </div>
        <h1 className="text-2xl font-bold mb-2">This week</h1>
        <p className="text-sm text-gray-300 mb-6">
          Scored on the percentage of your own pledge you actually hit, so someone training twice
          a week can top someone training six. Pledging more days gives a small edge, but only if
          you turn up for all of them.
        </p>

        {loading ? (
          <p className="text-sm text-gray-400">Loading...</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-gray-400">Nobody has logged anything yet this week.</p>
        ) : (
          <div className="space-y-2">
            {rows.map(function (r, i) {
              const mine = me && r.screen_name === me;
              return (
                <div
                  key={r.screen_name + i}
                  className={
                    "flex items-center gap-3 rounded-xl border p-4 " +
                    (mine ? "border-white/40 bg-white/15" : "border-white/10 bg-white/5")
                  }
                >
                  <span className="text-sm font-bold w-6 text-gray-400">{i + 1}</span>
                  <div className="flex-1">
                    <p className="text-sm font-bold">
                      {r.screen_name}{mine ? " (you)" : ""}
                    </p>
                    <p className="text-xs text-gray-400">
                      {r.done} of {r.pledged} sessions pledged
                    </p>
                  </div>
                  <span className="text-lg font-bold">{r.score}</span>
                </div>
              );
            })}
          </div>
        )}

        <p className="text-xs text-gray-500 mt-6">
          Resets every Monday. Consistency beats volume here, which is the whole point.
        </p>
      </div>
    </main>
  );
}
