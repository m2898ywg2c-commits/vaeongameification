"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { TYPES } from "@/lib/personality";
import TypeOrb from "../TypeOrb";
import Home from "../Home";

const KUDOS_EMOJI = ["👏", "🔥", "💪", "🙌", "⚡", "👊"];

export default function LeaderboardPage() {
const [rows, setRows] = useState([]);
const [pbs, setPbs] = useState([]);
const [meId, setMeId] = useState(null);
const [myType, setMyType] = useState(null);
const [myKudos, setMyKudos] = useState({}); // to_user -> emoji I gave
const [filter, setFilter] = useState("all"); // all | mine
const [pickerFor, setPickerFor] = useState(null);
const [loading, setLoading] = useState(true);

const load = async function () {
const supabase = createClient();
const res = await supabase.auth.getUser();
const user = res.data.user;
if (user) {
setMeId(user.id);
const a = await supabase.from("assessment_results").select("type_id")
.eq("user_id", user.id).order("completed_at", { ascending: false }).limit(1).maybeSingle();
if (a.data) setMyType(a.data.type_id);
const k = await supabase.from("kudos").select("to_user, emoji").eq("from_user", user.id);
const map = {};
(k.data || []).forEach(function (r) { map[r.to_user] = r.emoji; });
setMyKudos(map);
}
const lb = await supabase.rpc("get_leaderboard");
setRows(lb.data || []);
// Still fetched, but only to put a small star against anyone with a recent personal best.
// The full PB feed was dropped: in a testing week it fills the screen and buries the board.
const pb = await supabase.rpc("get_recent_pbs");
setPbs(pb.data || []);
setLoading(false);
};

useEffect(function () { load(); }, []);

const sendKudos = async function (toUser, emoji) {
if (!meId) return;
const next = Object.assign({}, myKudos);
next[toUser] = emoji;
setMyKudos(next);
setPickerFor(null);
const supabase = createClient();
await supabase.from("kudos").upsert(
{ from_user: meId, to_user: toUser, emoji: emoji },
{ onConflict: "from_user,to_user" }
);
load();
};

const myTypeColour = myType && TYPES[myType] ? TYPES[myType].colors[0] : "#2DD4BF";
// Anyone in the recent-PB feed gets a star on their row.
const pbUserIds = {};
pbs.forEach(function (p) { pbUserIds[p.user_id] = true; });
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
{pbUserIds[r.user_id] ? <span title="Just hit a personal best" aria-label="recent PB">⭐ </span> : null}
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
style={gave === em ? { borderColor: accent, background: accent + "22" } : null}
>
{em}
</button>
);
})}
<button onClick={function () { setPickerFor(null); }} className="text-xs text-gray-500 underline ml-1">
close
</button>
</div>
) : (
<button
onClick={function () { setPickerFor(r.user_id); }}
className="text-xs font-bold px-3 py-1.5 rounded-full border"
style={{ borderColor: accent + "55", color: accent, background: accent + "12" }}
>
{gave ? "Sent " + gave + " · change" : "＋ Send kudos"}
</button>
)}
</div>
) : null}
</div>
);
})}
</div>
)}

<p className="text-xs text-gray-500 mt-6">
Kudos are one per person, and you can change the emoji any time. Consistency across the
block beats a single big week, which is the whole point.
</p>
</div>
</main>
);
}
