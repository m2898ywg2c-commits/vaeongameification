"use client";

// Delete account.
//
// WHY IT MAKES YOU TYPE THE WORD.
//
// This is irreversible and there is no undo, no grace period and no export afterwards.
// A single tap next to Export data would be a mis-tap away from destroying somebody's
// entire training history. Typing DELETE is four seconds of friction against a permanent
// mistake, which is a trade worth making exactly once in an app.
//
// WHY THE BROWSER DOES NOT DO THE DELETING.
//
// Removing an auth user needs the service role key, which can read and write every row
// belonging to anybody. It cannot go in the client bundle. The browser asks the
// delete-account edge function, which works out who is asking from their own verified
// token rather than from anything the browser claims.

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function DeleteAccount() {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const armed = typed.trim().toUpperCase() === "DELETE";

  async function destroy() {
    if (!armed || busy) return;
    setBusy(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error: fnErr } = await supabase.functions.invoke("delete-account", { method: "POST" });
      if (fnErr) throw fnErr;
      // The account is gone, so the session is meaningless. Clear it before leaving,
      // or the next page load spends a round trip discovering the user no longer exists.
      await supabase.auth.signOut();
      window.location.href = "/";
    } catch (e) {
      setError("Could not delete the account. Nothing has been removed. Try again, or email james@unifypartnership.com.");
      setBusy(false);
    }
  }

  return (
    <div className="rounded-md border p-5 mb-4"
         style={{ borderColor: "rgba(255,107,87,0.35)", background: "var(--brand-surface)" }}>
      <p className="font-display text-base font-normal mb-2" style={{ color: "#FF6B57" }}>Delete your account</p>
      <p className="text-sm text-brand-muted leading-relaxed mb-4">
        This removes your profile, every session and exercise you have logged, your lifts,
        your streak, your achievements and your place on the leaderboard. It cannot be undone
        and we cannot get it back for you. If you want a copy first, export your data above.
      </p>

      {!open ? (
        <button type="button" onClick={function () { setOpen(true); }}
          className="text-sm underline" style={{ color: "#FF6B57" }}>
          I want to delete my account
        </button>
      ) : (
        <div>
          <p className="text-xs text-brand-muted mb-2">Type DELETE to confirm.</p>
          <input type="text" value={typed} autoCapitalize="characters" autoCorrect="off"
            onChange={function (e) { setTyped(e.target.value); }}
            className="w-full rounded-sm px-3 py-2 bg-brand-field border text-brand-text outline-none mb-3 text-sm"
            style={{ borderColor: armed ? "#FF6B57" : "var(--brand-line)" }} />
          <div className="flex gap-2">
            <button type="button" onClick={destroy} disabled={!armed || busy}
              className="flex-1 py-3 rounded-md font-display text-sm"
              style={{ background: armed ? "#FF6B57" : "var(--brand-line)",
                       color: armed ? "#000000" : "var(--brand-dim)" }}>
              {busy ? "Deleting..." : "Delete everything"}
            </button>
            <button type="button" onClick={function () { setOpen(false); setTyped(""); setError(null); }}
              className="px-4 py-3 text-sm underline text-brand-muted">Cancel</button>
          </div>
          {error ? <p className="text-xs mt-3" style={{ color: "#FF6B57" }}>{error}</p> : null}
        </div>
      )}
    </div>
  );
}
