"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { TYPES, isSolo } from "@/lib/personality";
import { currentScheme, accentFor } from "@/lib/theme";
import { KUDOS_EMOJI, KUDOS_NOTES, noteText } from "@/lib/kudos";
import TypeOrb from "../TypeOrb";
import TypeCharacter from "../TypeCharacter";
import Home from "../Home";
import { track, trackOnce, EVENTS } from "@/lib/events";

const TOP_N = 5;

export default function LeaderboardPage() {
const [rows, setRows] = useState([]);
const [meId, setMeId] = useState(null);
const [myType, setMyType] = useState(null);
const [myKudos, setMyKudos] = useState({}); // to_user -> { emoji, note }
const router = useRouter();
const [filter, setFilter] = useState("all"); // all | mine
const [pickerFor, setPickerFor] = useState(null);
const [noteFor, setNoteFor] = useState(null);
const [expanded, setExpanded] = useState(false);
const [loading, setLoading] = useState(true);
// null means they have never been asked, in which case their type decides. See
// supabase/leaderboard_opt_in.sql.
const [optIn, setOptIn] = useState(null);
const [joining, setJoining] = useState(false);

// The recent-PB feed and the PR star both used to live here. Both are gone: in a testing
// week every logged set is a new max, so the feed buried the board and the star ended up
// on practically everyone, which made it meaningless. get_recent_pbs still exists in the
// database if we ever want it somewhere it can breathe.
const load = async function () {
const supabase = createClient();
const res = await supabase.auth.getUser();
const user = res.data.user;
// SIGNED OUT USERS DO NOT SEE THIS PAGE.
//
// get_leaderboard() used to be callable by the anon role, so a signed-out visitor got the
// whole board: sixteen real people's screen names, types and scores, readable by anyone
// who opened dev tools, because the anon key ships in the client bundle by design. That is
// closed at the database now, in supabase/rpc_permissions.sql.
//
// This is the other half of the same fix. Without it the page still renders, calls an RPC
// it is no longer allowed to call, swallows the error and shows an empty board with no
// explanation. Protecting the data and behaving sensibly are two different jobs.
if (!user) { router.push("/login"); return; }
if (user) {
setMeId(user.id);
const a = await supabase.from("assessment_results").select("type_id")
.eq("user_id", user.id).order("completed_at", { ascending: false }).limit(1).maybeSingle();
if (a.data) setMyType(a.data.type_id);
const pr = await supabase.from("profiles").select("leaderboard_opt_in").eq("id", user.id).maybeSingle();
if (pr.data) setOptIn(pr.data.leaderboard_opt_in);
const k = await supabase.from("kudos").select("to_user, emoji, note_code").eq("from_user", user.id);
const map = {};
(k.data || []).forEach(function (r) { map[r.to_user] = { emoji: r.emoji, note: r.note_code }; });
setMyKudos(map);
}
const lb = await supabase.rpc("get_leaderboard");
setRows(lb.data || []);
setLoading(false);

// load() is called again after every kudos, so this is deliberately once per tab.
// Otherwise sending three kudos would read as four leaderboard visits.
trackOnce(supabase, EVENTS.LEADERBOARD_VIEWED, { rows: (lb.data || []).length });
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
// Deliberately does not record who it went to. This is a product measure of whether
// the community half works, not a social graph, and the smallest version of that
// which answers the question is the one to store.
track(supabase, EVENTS.KUDOS_SENT, { emoji: emoji, changed: Boolean(existing.emoji) });
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

// Whether they are actually on the board, read from the board itself rather than
// recomputed here. get_leaderboard() is the authority on who appears, and a second
// implementation of that rule on the client is a second thing to get out of step.
const onBoard = Boolean(meId) && rows.some(function (r) { return r.user_id === meId; });

// A Solo type who has never been asked. They are on the board, because everybody is, but
// they are the ones most likely to want off it and least likely to go looking for the
// setting. Once they have chosen either way, optIn stops being null and this stops
// nagging them about it.
const soloUndecided = isSolo(myType) && optIn === null && Boolean(TYPES[myType]);

const setBoardVisibility = async function (next) {
if (!meId) return;
setJoining(true);
const supabase = createClient();
await supabase.from("profiles").update({ leaderboard_opt_in: next }).eq("id", meId);
setOptIn(next);
setJoining(false);
await load();
};

const scheme = currentScheme();
const myTypeColour = accentFor(TYPES[myType], scheme);
const visible = rows.filter(function (r) {
return filter === "mine" && myType ? r.type_id === myType : true;
});

// Only the top five by default, so the board stays readable on a phone.
const shown = expanded ? visible : visible.slice(0, TOP_N);
const myIndex = meId ? visible.findIndex(function (r) { return r.user_id === meId; }) : -1;
// If you are outside the top five, your own row is pinned underneath rather than hidden.
// Seeing where you actually sit is the entire reason most people open this page.
const pinMe = !expanded && myIndex >= TOP_N;

const renderRow = function (r, rankIndex) {
const t = r.type_id ? TYPES[r.type_id] : null;
const mine = meId && r.user_id === meId;
const gave = myKudos[r.user_id];
const gaveNote = gave ? noteText(gave.note) : null;
const accent = accentFor(t, scheme);
return (
<div
key={r.user_id}
className={"rounded-md border p-4 " + (mine ? "border-white/40 bg-brand-field" : "border-brand-line bg-brand-surface")}
>
<div className="flex items-center gap-3">
<span className="font-display text-sm w-5 text-brand-muted">{rankIndex + 1}</span>
{t ? <TypeCharacter typeId={r.type_id} size={38} variant="face" /> : <span className="w-[38px] h-[38px] rounded-full bg-brand-field inline-block" />}
<div className="flex-1 min-w-0">
<p className="font-display text-sm truncate">
{r.screen_name}{mine ? " (you)" : ""}
</p>
<p className="text-xs text-brand-muted">
{t ? t.name : "No type yet"} &middot; {r.done} of {r.pledged} this week
{r.weeks_kept > 0 ? " · " + r.weeks_kept + (r.weeks_kept === 1 ? " week kept" : " weeks kept") : ""}
</p>
</div>
<div className="text-right">
<p className="font-display text-lg font-normal leading-none">{r.score}</p>
{r.kudos_count > 0 ? <p className="text-[0.75rem] text-brand-muted mt-1">👏 {r.kudos_count}</p> : null}
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
className="text-xl w-9 h-9 rounded-sm border border-brand-line bg-brand-surface"
style={gave && gave.emoji === em ? { borderColor: accent, background: accent + "22" } : null}
>
{em}
</button>
);
})}
<button onClick={function () { setPickerFor(null); }} className="text-xs text-brand-dim underline ml-1">
close
</button>
</div>
) : noteFor === r.user_id ? (
<div>
<p className="text-xs text-brand-muted mb-2">Add a line? Optional.</p>
<div className="space-y-1.5">
{KUDOS_NOTES.map(function (n) {
const on = gave && gave.note === n.code;
return (
<button
key={n.code}
onClick={function () { sendNote(r.user_id, n.code); }}
className="w-full text-left text-xs px-3 py-2.5 rounded-md border"
style={{
borderColor: on ? accent : "var(--brand-line)",
background: on ? accent + "22" : "var(--brand-surface)",
}}
>
{n.text}
</button>
);
})}
</div>
<button onClick={function () { setNoteFor(null); }} className="text-xs text-brand-dim underline mt-2">
No thanks, just the emoji
</button>
</div>
) : (
<div>
<button
onClick={function () { setPickerFor(r.user_id); }}
className="font-display text-xs px-3 py-1.5 rounded-sm border"
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
{gaveNote ? <p className="text-xs text-brand-muted mt-2 italic">&ldquo;{gaveNote}&rdquo;</p> : null}
</div>
)}
</div>
) : null}
</div>
);
};

return (
<main className="min-h-screen bg-brand-bg text-brand-text px-5 py-8">
<div className="max-w-md mx-auto">
<div className="mb-6"><Home accent={myTypeColour} /></div>

<h1 className="font-display text-2xl font-normal mb-2">This week</h1>
<p className="text-sm text-brand-muted mb-5">
Scored on how much of your own pledge you have hit this week, not raw counts, so
someone training twice is compared fairly with someone training five times. Everybody
starts level again on Monday. Weeks kept counts the finished weeks in your block where
you met your pledge, so consistency still shows without a bad fortnight following you
around.
</p>

{/* ---------- Board visibility ----------

Everybody is on the board unless they have explicitly stepped off it. An earlier
version used the social pole of the type to decide the default, which left five of
twelve people visible and turned the only social surface in the app into a list.
A type is a description, not a permission slip: "trains best alone" is a reason to
offer somebody the exit, not a reason to make the decision for them.

So Solo types get told, in their own terms, that stepping off is available. Everyone
else gets the same option in smaller print. Off the board still means full access to
it, including sending and receiving kudos. See supabase/leaderboard_opt_in.sql. */}
{meId && !onBoard ? (
<div className="rounded-md border p-4 mb-4" style={{ borderColor: myTypeColour + "55", background: myTypeColour + "12" }}>
<p className="font-display text-sm mb-1" style={{ color: myTypeColour }}>You are hidden from the rankings</p>
<p className="text-xs text-brand-muted mb-3">
You asked to be left off the board. You can still see everyone and send kudos, and
you can come back on whenever you like.
</p>
<button onClick={function () { setBoardVisibility(true); }} disabled={joining}
className="w-full py-3 rounded-sm font-display text-sm"
style={{ background: myTypeColour, color: "#000000" }}>
{joining ? "Joining..." : "Put me back on the board"}
</button>
</div>
) : null}

{meId && onBoard && soloUndecided ? (
<div className="rounded-md border p-4 mb-4" style={{ borderColor: "var(--brand-line)", background: "var(--brand-surface)" }}>
<p className="text-xs text-brand-muted mb-2">
The {TYPES[myType].name.replace("The ", "")} trains best alone, so if being ranked is not
for you, step off. You keep the board, the kudos and everything else.
</p>
<button onClick={function () { setBoardVisibility(false); }} disabled={joining}
className="font-display text-xs underline" style={{ color: myTypeColour }}>
{joining ? "Hiding..." : "Hide me from the rankings"}
</button>
</div>
) : null}

{meId && onBoard && !soloUndecided ? (
<button onClick={function () { setBoardVisibility(false); }} disabled={joining}
className="w-full text-center text-xs text-brand-dim underline mb-4">
Hide me from the rankings
</button>
) : null}

{/* ---------- Filter ---------- */}
<div className="grid grid-cols-2 gap-2 mb-4">
<button
onClick={function () { setFilter("all"); setExpanded(false); }}
className="py-2.5 rounded-sm border font-display text-sm"
style={{
borderColor: filter === "all" ? myTypeColour : "var(--brand-line)",
background: filter === "all" ? myTypeColour + "22" : "var(--brand-surface)",
}}
>
Everyone
</button>
<button
onClick={function () { if (myType) { setFilter("mine"); setExpanded(false); } }}
disabled={!myType}
className="py-2.5 rounded-sm border font-display text-sm"
style={{
borderColor: filter === "mine" ? myTypeColour : "var(--brand-line)",
background: filter === "mine" ? myTypeColour + "22" : "var(--brand-surface)",
opacity: myType ? 1 : 0.4,
}}
>
My fellow {myType && TYPES[myType] ? TYPES[myType].name.replace("The ", "") + "s" : "types"}
</button>
</div>

{loading ? (
<p className="text-sm text-brand-muted">Loading...</p>
) : visible.length === 0 ? (
<p className="text-sm text-brand-muted">
{filter === "mine" ? "Nobody of your type on the board yet." : "Nobody has logged anything yet."}
</p>
) : (
<>
<div className="space-y-2">
{shown.map(function (r, i) { return renderRow(r, i); })}
</div>

{pinMe ? (
<div className="mt-2">
<p className="text-center text-xs text-brand-dim mb-2">&middot; &middot; &middot;</p>
{renderRow(visible[myIndex], myIndex)}
</div>
) : null}

{visible.length > TOP_N ? (
<button
onClick={function () { setExpanded(!expanded); }}
className="w-full mt-3 py-3 rounded-sm border font-display text-sm"
style={{ borderColor: myTypeColour + "55", color: myTypeColour, background: myTypeColour + "12" }}
>
{expanded ? "Show top " + TOP_N + " only" : "Show all " + visible.length}
</button>
) : null}
</>
)}

<p className="text-xs text-brand-dim mt-6">
Kudos are one per person, and you can change the emoji or the line any time. Consistency
across the block beats a single big week, which is the whole point.
</p>
</div>
</main>
);
}
