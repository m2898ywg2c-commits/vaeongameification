"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { TYPES } from "@/lib/personality";
import { KUDOS_EMOJI, KUDOS_NOTES, noteText } from "@/lib/kudos";
import TypeOrb from "../TypeOrb";
import Home from "../Home";

export default function LeaderboardPage() {
const [rows, setRows] = useState([]);
const [meId, setMeId] = useState(null);
const [myType, setMyType] = useState(null);
const [myKudos, setMyKudos] = useState({}); // to_user -> { emoji, note }
const [filter, setFilter] = useState("all"); // all | mine
const [pickerFor, setPickerFor] = useState(null);
const [noteFor, setNoteFor] = useState(null);
const [loading, setLoading] = useState(true);

// The recent-PB feed and the PR star both used to live here. Both are gone: in a testing
// week every logged set is a new max, so the feed buried the board and the star ended up
// on practically everyone, which made it meaningless. get_recent_pbs still exists in the
// database if we ever want it somewhere it can breathe.
const load = async function () {
const supabase = createClient();
const res = await supabase.auth.getUser();
const user = res.data.user;
if (user) {
setMeId(user.id);
const a = await supabase.from("assessment_results").select("type_id")
.eq("user_id", user.id).order("completed_at", { ascending: false }).limit(1).maybeSingle();
if (a.data) setMyType(a.data.type_id);
const k = await supabase.from("kudos").select("to_user, emoji, note_code").eq("from_user", user.id);
const map = {};
(k.data || []).forEach(function (r) { map[r.to_user] = { emoji: r.emoji, note: r.note_code }; });
setMyKudos(map);
}
const lb = await supabase.rpc("get_leaderboard");
setRows(lb.data || []);
setLoading(false);
};

useEffect(function () { load(); }, []);

// One tap still sends. The note panel opens afterwards so adding a line is a bonus
// rather than an extra hurdle, which matters with a phone and sweaty hands.
const sendKudos = async function (toUser, emoji) {
if (!meId) return;
const existing = myKudos[toUser] || {};
const next = Object.assign({}, myKudos);
next[toUser] = { emoji: emoji, note: existing.note || null };
setMyKudos(next);
setPickerFor(null);
setNoteFor(toUser);
const supabase = createClient();
await supabase.from("kudos").upsert(
{ from_user: meId, to_user: toUser, emoji: emoji, note_code: existing.note || null },
{ onConflict: "from_user,to_user" }
);
load();
};

const sendNote = async function (toUser, code) {
if (!meId) return;
const existing = myKudos[toUser] || {};
if (!existing.emoji) return;
const next = Object.assign({}, myKudos);
next[toUser] = { emoji: existing.emoji, note: code };
setMyKudos(next);
setNoteFor(null);
const supabase = createClient();
await supabase.from("kudos").upsert(
{ from_user: meId, to_user: toUser, emoji: existing.emoji, note_code: code },
{ onConflict: "from_user,to_user" }
);
load();
};

const myTypeColour = myType && TYPES[myType] ? TYPES[myType].colors[0] : "#2DD4BF";
const visible = rows.filter(function (r) {
return filter === "mine" && myType ? r.type_id === myType : true;
});

return (
<main className="min-h-screen bg-[#0E1224] text-white px-5 py-8">
<div className="max-w-md mx-auto">
<div className="mb-6"><Home accent={myTypeColour} /></div>

<h1 className="text-2xl font-bold mb-2">This block</h1>
<p className="text-sm text-gray-300 mb-5">
Scored on how much of your own pledge you have hit so far this six-week block, not raw
counts, so someone in week one is compared fairly with someone in week six. Resets when
your block does.
</p>

{/* ---------- Filter ---------- */}
<div className="grid grid-cols-2 gap-2 mb-4">
<button
onClick={function () { setFilter("all"); }}
className="py-2.5 rounded-full border text-sm font-bold"
style={{
borderColor: filter === "all" ? myTypeColour : "rgba(255,255,255,0.12)",
background: filter === "all" ? myTypeColour + "22" : "rgba(255,255,255,0.04)",
}}
>
Everyone
</button>
<button
onClick={function () { if (myType) setFilter("mine"); }}
disabled={!myType}
className="py-2.5 rounded-full border text-sm font-bold"
style={{
borderColor: filter === "mine" ? myTypeColour : "rgba(255,255,255,0.12)",
background: filter === "mine" ? myTypeColour + "22" : "rgba(255,255,255,0.04)",
opacity: myType ? 1 : 0.4,
}}
>
My fellow {myType && TYPES[myType] ? TYPES[myType].name.replace("The ", "") + "s" : "types"}
</button>
</div>

{loading ? (
<p className="text-sm text-gray-400">Loading...</p>
) : visible.length === 0 ? (
<p className="text-sm text-gray-400">
{filter === "mine" ? "Nobody of your type on the board yet." : "Nobody has logged anything yet."}
</p>
) : (
<div className="space-y-2">
{visible.map(function (r, i) {
const t = r.type_id ? TYPES[r.type_id] : null;
const mine = meId && r.user_id === meId;
const gave = myKudos[r.user_id];
const gaveNote = gave ? noteText(gave.note) : null;
const accent = t ? t.colors[0] : "#2DD4BF";
return (
<div
key={r.user_id}
className={"rounded-2xl border p-4 " + (mine ? "border-white/40 bg-white/15" : "border-white/10 bg-white/5")}
>
<div className="flex items-center gap-3">
<span className="text-sm font-bold w-5 text-gray-400">{i + 1}</span>
{t ? <TypeOrb typeId={r.type_id} size={38} /> : <span className="w-[38px] h-[38px] rounded-full bg-white/10 inline-block" />}
<div className="flex-1 min-w-0">
<p className="text-sm font-bold truncate">
{r.screen_name}{mine ? " (you)" : ""}
</p>
<p className="text-xs text-gray-400">
{t ? t.name : "No type yet"} &middot; {r.done} this block &middot; wk {r.weeks}/6
</p>
</div>
<div className="text-right">
<p className="text-lg font-bold leading-none">{r.score}</p>
{r.kudos_count > 0 ? <p className="text-[11px] text-gray-400 mt-1">👏 {r.kudos_count}</p> : null}
</div>
</div>

{!mine ? (
<div className="mt-3">
{pickerFor === r.user_id ? (
<div className="flex items-center gap-2 flex-wrap">
{KUDOS_EMOJI.map(function (em) {
return (
<button
key={em}
onClick={function () { sendKudos(r.user_id, em); }}
className="text-xl w-9 h-9 rounded-full border border-white/15 bg-white/5"
style={gave && gave.emoji === em ? { borderColor: accent, background: accent + "22" } : null}
>
{em}
</button>
);
})}
<button onClick={function () { setPickerFor(null); }} className="text-xs text-gray-500 underline ml-1">
close
</button>
</div>
) : noteFor === r.user_id ? (
<div>
<p className="text-xs text-gray-400 mb-2">Add a line? Optional.</p>
<div className="space-y-1.5">
{KUDOS_NOTES.map(function (n) {
const on = gave && gave.note === n.code;
return (
<button
key={n.code}
onClick={function () { sendNote(r.user_id, n.code); }}
className="w-full text-left text-xs px-3 py-2.5 rounded-xl border"
style={{
borderColor: on ? accent : "rgba(255,255,255,0.12)",
background: on ? accent + "22" : "rgba(255,255,255,0.04)",
}}
>
{n.text}
</button>
);
})}
</div>
<button onClick={function () { setNoteFor(null); }} className="text-xs text-gray-500 underline mt-2">
No thanks, just the emoji
</button>
</div>
) : (
<div>
<button
onClick={function () { setPickerFor(r.user_id); }}
className="text-xs font-bold px-3 py-1.5 rounded-full border"
style={{ borderColor: accent + "55", color: accent, background: accent + "12" }}
>
{gave ? "Sent " + gave.emoji + " · change" : "＋ Send kudos"}
</button>
{gave ? (
<button
onClick={function () { setNoteFor(r.user_id); }}
className="text-xs underline ml-3"
style={{ color: accent }}
>
{gaveNote ? "Change your line" : "Add a line"}
</button>
) : null}
{gaveNote ? <p className="text-xs text-gray-400 mt-2 italic">&ldquo;{gaveNote}&rdquo;</p> : null}
</div>
)}
</div>
) : null}
</div>
);
})}
</div>
)}

<p className="text-xs text-gray-500 mt-6">
Kudos are one per person, and you can change the emoji or the line any time. Consistency
across the block beats a single big week, which is the whole point.
</p>
</div>
</main>
);
}
