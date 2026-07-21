"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LOCATIONS, fallbackFor } from "@/lib/fallbacks";
import { primaryCategory } from "@/lib/training";
import Home from "../Home";

export default function FallbackPage() {
  const [category, setCategory] = useState("general");
  const [location, setLocation] = useState(null);
  const [userId, setUserId] = useState(null);
  const [logged, setLogged] = useState(false);
  const router = useRouter();

  useEffect(function () {
    const supabase = createClient();
    supabase.auth.getUser().then(function (res) {
      const user = res.data.user;
      if (!user) { router.push("/login"); return; }
      setUserId(user.id);
      supabase.from("profiles").select("goals").eq("id", user.id).single().then(function (r) {
        if (r.data) setCategory(primaryCategory(r.data.goals));
      });
    });
  }, [router]);

  const logIt = async function (workout) {
    if (!userId) return;
    const supabase = createClient();
    await supabase.from("training_sessions").insert({
      user_id: userId,
      session_type: "Other",
      duration_min: workout.minutes,
      effort: 3,
      note: workout.title,
    });
    setLogged(true);
  };

  if (location) {
    const workout = fallbackFor(category, location);
    return (
      <main className="min-h-screen bg-[#0E1224] text-white px-6 py-10">
        <div className="max-w-md mx-auto">
          <div className="flex items-center justify-between mb-6">
            <Home />
            <button onClick={function () { setLocation(null); setLogged(false); }} className="text-xs text-gray-400 underline">
              Pick a different place
            </button>
          </div>
          <h1 className="text-2xl font-bold mb-1">{workout.title}</h1>
          <p className="text-xs uppercase tracking-wide text-gray-400 mb-5">{workout.minutes} minutes</p>

          <div className="rounded-xl border border-white/10 bg-white/5 p-5 mb-5">
            <ol className="text-sm space-y-2 list-decimal list-inside text-gray-100">
              {workout.items.map(function (item, i) { return <li key={i}>{item}</li>; })}
            </ol>
          </div>

          <p className="text-sm text-gray-300 mb-6">{workout.note}</p>

          <button
            onClick={function () { logIt(workout); }}
            className="w-full px-6 py-3 rounded-full font-bold text-sm mb-2"
            style={{ background: "linear-gradient(90deg, #2DD4BF, #0F766E)", color: "#0E1224" }}
          >
            {logged ? "Logged" : "Done, log it"}
          </button>
          {logged ? <p className="text-sm text-emerald-400 text-center">Counts towards your week. Streak intact.</p> : null}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0E1224] text-white px-6 py-10">
      <div className="max-w-md mx-auto">
        <div className="mb-6">
          <Home />
        </div>
        <h1 className="text-2xl font-bold mb-2">Cannot get to the gym?</h1>
        <p className="text-sm text-gray-300 mb-8">
          Missing a session is how streaks die. Pick where you actually are and do something
          smaller instead. It still counts.
        </p>

        <div className="space-y-3">
          {LOCATIONS.map(function (loc) {
            return (
              <button
                key={loc.id}
                onClick={function () { setLocation(loc.id); }}
                className="w-full text-left rounded-xl border border-white/10 bg-white/5 p-4"
              >
                <p className="font-bold text-sm">{loc.name}</p>
                <p className="text-xs text-gray-400 mt-1">{loc.blurb}</p>
              </button>
            );
          })}
        </div>
      </div>
    </main>
  );
}
