"use client";

// The dashboard kudos card. A client component purely so it can carry a Clear button:
// the dashboard itself is a server component and cannot hold an onClick.
//
// Clearing writes a timestamp to profiles.kudos_cleared_at rather than deleting anything.
// The kudos rows survive, so leaderboard counts are unaffected, and clearing on a phone
// stays cleared on a laptop. get_my_kudos() only returns kudos newer than that timestamp.

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { noteText } from "@/lib/kudos";
import TypeOrb from "../TypeOrb";

const SHOWN = 5;

export default function KudosCard({ kudos, accent }) {
const [items, setItems] = useState(kudos || []);
const [error, setError] = useState(null);

if (!items.length) return null;

const clear = async function () {
const previous = items;
setItems([]); // the whole box goes at once, which is the point
setError(null);
const supabase = createClient();
const res = await supabase.auth.getUser();
const user = res.data.user;
if (!user) { setItems(previous); return; }
const { error: e } = await supabase
.from("profiles")
.update({ kudos_cleared_at: new Date().toISOString() })
.eq("id", user.id);
// If the write fails, put them back rather than pretending it worked.
if (e) { setItems(previous); setError(e.message); }
};

const shown = items.slice(0, SHOWN);
const extra = items.length - shown.length;

return (
<div className="rounded-md border border-brand-line bg-brand-surface p-4 mb-3">
<div className="flex items-center justify-between mb-3">
<p className="font-display text-xs uppercase tracking-wide text-brand-muted">Your kudos</p>
<button onClick={clear} className="text-xs underline text-brand-muted">Clear</button>
</div>

<div className="space-y-3">
{shown.map(function (k, i) {
const line = noteText(k.note_code);
return (
<div key={i} className="flex items-start gap-3">
{k.from_type_id ? <TypeOrb typeId={k.from_type_id} size={26} /> : <span className="w-[26px] flex-shrink-0" />}
<div className="flex-1 min-w-0">
<p className="text-sm">
<span className="font-display">{k.from_screen_name}</span> sent you {k.emoji}
</p>
{line ? <p className="text-xs text-brand-muted italic mt-0.5">&ldquo;{line}&rdquo;</p> : null}
</div>
</div>
);
})}
</div>

{extra > 0 ? (
<p className="text-xs text-brand-dim mt-3">and {extra} more</p>
) : null}

{error ? <p className="text-xs text-red-400 mt-3">{error}</p> : null}

<a href="/leaderboard" className="inline-block text-xs underline mt-3" style={{ color: accent }}>
Send some back
</a>
</div>
);
}
