"use client";

// Take your data with you.
//
// Two reasons, one legal and one competitive.
//
// UK GDPR Article 20 gives people the right to receive their personal data in a
// structured, commonly used and machine-readable format. A download button is the
// cheapest possible way to satisfy that, and the alternative is answering the request by
// hand in a mailbox at some point when it is least convenient.
//
// The competitive reason is that lifters talk about this constantly. Losing years of
// training history to an app that would not let it out is one of the most common
// complaints in the category, and "you can take it with you" is a reason to trust a
// twelve-user app enough to start putting real data into it. An app that is confident
// about export is telling you it expects to earn the next month rather than hold you.
//
// Everything here is a plain select constrained by RLS, so this can only ever return the
// caller's own rows. There is no privileged path and no server route to get wrong.
//
// Deliberately JSON rather than CSV. This data is nested, a session has sets which have
// weights, and flattening it into one CSV would lose that while several CSVs in a zip
// would need a zip library for no gain. JSON opens in anything and reimports cleanly.

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Every table that holds something about a person. push_subscriptions is deliberately
// excluded: it is device plumbing, it contains no training history, and the endpoint is a
// credential rather than a fact about them.
const TABLES = [
  { name: "profile", table: "profiles", column: "id" },
  { name: "assessment_results", table: "assessment_results", column: "user_id" },
  { name: "training_sessions", table: "training_sessions", column: "user_id" },
  { name: "exercise_logs", table: "exercise_logs", column: "user_id" },
  { name: "body_metrics", table: "body_metrics", column: "user_id" },
  { name: "lift_maxes", table: "lift_maxes", column: "user_id" },
  { name: "achievements", table: "achievements", column: "user_id" },
  { name: "streak_freezes", table: "streak_freezes", column: "user_id" },
  { name: "type_feedback", table: "type_feedback", column: "user_id" },
  { name: "events", table: "events", column: "user_id" },
];

export default function ExportData({ profile }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function run() {
    if (!profile) return;
    setBusy(true);
    setError(null);
    const supabase = createClient();

    const out = {
      exported_at: new Date().toISOString(),
      app: "Vaeon Fitness",
      // Named so a future reader knows which shape they are looking at, since the
      // schema will move underneath any file somebody kept.
      format_version: 1,
    };

    try {
      for (let i = 0; i < TABLES.length; i++) {
        const t = TABLES[i];
        // Tables added by a later migration may not exist on every environment. One
        // missing table should not cost somebody the other nine.
        try {
          const { data } = await supabase.from(t.table).select("*").eq(t.column, profile.id);
          out[t.name] = data || [];
        } catch (e) {
          out[t.name] = [];
        }
      }

      // Kudos sent TO this person come through a definer function, because the kudos
      // table is outgoing-only under RLS. Included because a note somebody sent you is
      // as much a part of your record here as a set you logged.
      try {
        const { data: received } = await supabase.rpc("get_my_kudos");
        out.kudos_received = received || [];
      } catch (e) {
        out.kudos_received = [];
      }

      const blob = new Blob([JSON.stringify(out, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "vaeon-" + (profile.screen_name || "export").replace(/[^a-z0-9]/gi, "-").toLowerCase() +
        "-" + new Date().toISOString().slice(0, 10) + ".json";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      // Revoking immediately can cancel the download on some browsers, so give it a beat.
      setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
    } catch (e) {
      setError("Could not build the file. Check your connection and try again.");
    }

    setBusy(false);
  }

  if (!profile) return null;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5 mb-4">
      <p className="text-base font-bold mb-1">Your data</p>
      <p className="text-sm text-gray-300 mb-4">
        Everything Vaeon holds about you, in one file. Your profile, every session, every set,
        your measurements, your type and your kudos. It is yours and you can take it whenever
        you like.
      </p>
      <button onClick={run} disabled={busy}
        className="block w-full py-4 rounded-full font-bold text-sm text-center border border-white/20">
        {busy ? "Building your file..." : "Download my data"}
      </button>
      {error ? <p className="text-xs mt-2" style={{ color: "#FF6B57" }}>{error}</p> : null}
    </div>
  );
}
