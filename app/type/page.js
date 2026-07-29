"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { TYPES } from "@/lib/personality";
import { DIMENSIONS, TYPE_POLES, DIM_ORDER, LAYERS, modelsFor, sourcesFor } from "@/lib/typeguide";
import TypeOrb from "../TypeOrb";

function joinModels(models) {
if (models.length <= 1) return models.join("");
return models.slice(0, -1).join(", ") + ", and " + models[models.length - 1];
}

// 1-5 resonance rating, so we learn whether each type actually lands.
function TypeFeedback({ typeId, accent }) {
const [score, setScore] = useState(null);
const [saved, setSaved] = useState(false);

useEffect(function () {
const supabase = createClient();
supabase.auth.getUser().then(function (res) {
const user = res.data.user;
if (!user) return;
supabase.from("type_feedback").select("score")
.eq("user_id", user.id).eq("type_id", typeId).maybeSingle()
.then(function (r) { if (r.data) setScore(r.data.score); });
});
}, [typeId]);

const rate = async function (v) {
setScore(v);
setSaved(true);
const supabase = createClient();
const res = await supabase.auth.getUser();
const user = res.data.user;
if (!user) return;
await supabase.from("type_feedback").upsert(
{ user_id: user.id, type_id: typeId, score: v },
{ onConflict: "user_id,type_id" }
);
setTimeout(function () { setSaved(false); }, 2000);
};

return (
<div className="rounded-2xl border p-5 mb-4" style={{ borderColor: accent + "55", background: "rgba(255,255,255,0.04)" }}>
<p className="text-sm font-bold mb-1">How well does this fit you?</p>
<p className="text-xs text-gray-400 mb-3">1 is nothing like me, 5 is that is me exactly. It helps us tune the types.</p>
<div className="grid grid-cols-5 gap-2">
{[1, 2, 3, 4, 5].map(function (v) {
const on = score === v;
return (
<button
key={v}
onClick={function () { rate(v); }}
className="py-3 rounded-2xl border text-lg font-bold"
style={{
borderColor: on ? accent : "rgba(255,255,255,0.12)",
background: on ? accent + "22" : "rgba(255,255,255,0.05)",
color: on ? accent : "#fff",
}}
>
{v}
</button>
);
})}
</div>
{score ? (
<p className="text-xs mt-3" style={{ color: accent }}>
{saved ? "Thanks, saved." : "You rated this " + score + " out of 5."}
</p>
) : null}
<a href="/assessment" className="block text-center text-sm underline mt-4" style={{ color: accent }}>
Not quite you? Retake the assessment
</a>
</div>
);
}

function TypeContent() {
const sp = useSearchParams();
const id = sp.get("id");
const type = id ? TYPES[id] : null;
const poles = id ? TYPE_POLES[id] : null;

if (!type || !poles) {
return (
<main className="min-h-screen bg-brand-bg text-white px-6 py-12">
<div className="max-w-md mx-auto">
<p className="text-sm text-gray-300 mb-4">That training type was not found.</p>
<a href="/dashboard" className="text-sm underline" style={{ color: "#22D3EE" }}>Back to dashboard</a>
</div>
</main>
);
}

const accent = type.colors[0];
const deep = type.colors[1];
const models = modelsFor(id);
const sources = sourcesFor(id);

return (
<main className="min-h-screen text-white px-5 py-8" style={{ background: "#000000" }}>
<div className="max-w-md mx-auto">
<a href="/dashboard" className="inline-block text-xs text-gray-400 underline mb-6">Back to dashboard</a>

<div className="rounded-2xl p-6 mb-6 text-center" style={{ background: "linear-gradient(135deg, " + accent + "22, transparent)" }}>
<div className="flex justify-center mb-2"><TypeOrb typeId={id} size={120} /></div>
<p className="text-xs uppercase tracking-wide text-gray-400 mb-1">{type.code}</p>
<h1 className="text-3xl font-bold mb-1">About the {type.name.replace("The ", "")} training style</h1>
<p className="text-sm text-gray-300">{type.tagline}</p>
</div>

{/* ---------- Grounding intro ---------- */}
<div className="rounded-2xl border p-5 mb-4" style={{ borderColor: accent + "55", background: "rgba(255,255,255,0.04)" }}>
<p className="text-sm text-gray-100">
The {type.name.replace("The ", "")} sits where three strands of motivation science meet:{" "}
<span className="font-bold">{joinModels(models)}</span>. None of this is horoscope. Each dial below
is drawn from research on why people actually stick with training, and what makes them quit.
</p>
</div>

{/* ---------- The three dimensions ---------- */}
{DIM_ORDER.map(function (dim) {
const pole = DIMENSIONS[dim][poles[dim]];
return (
<div key={dim} className="rounded-2xl border border-white/10 bg-white/5 p-5 mb-4">
<div className="flex items-center justify-between mb-2">
<p className="text-xs uppercase tracking-wide text-gray-400">{DIMENSIONS[dim].label}</p>
<span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: accent + "22", color: accent }}>{pole.pole}</span>
</div>
<p className="text-xs mb-2" style={{ color: accent }}>Grounded in {pole.model}</p>
<p className="text-sm text-gray-200 mb-3">{pole.body}</p>
<a href={pole.source.url} target="_blank" rel="noopener noreferrer" className="text-xs underline text-gray-400">
{pole.source.title}
</a>
</div>
);
})}

{/* ---------- What it means in the app ---------- */}
<div className="rounded-2xl border p-5 mb-4" style={{ borderColor: accent + "40", background: "linear-gradient(135deg, " + deep + "22, transparent)" }}>
<p className="text-xs uppercase tracking-wide text-gray-400 mb-1">How Vaeon builds your plan</p>
<p className="text-sm text-gray-100 mb-4">{type.plan}</p>
<p className="text-xs uppercase tracking-wide text-gray-400 mb-1">Your coaching voice</p>
<p className="text-sm text-gray-100">{type.coaching}</p>
</div>

{/* ---------- The two personal layers ---------- */}
<div className="rounded-2xl border border-white/10 bg-white/5 p-5 mb-4">
<p className="text-xs uppercase tracking-wide text-gray-400 mb-3">On top of your type</p>
{LAYERS.map(function (l, i) {
return (
<div key={i} className={i > 0 ? "mt-4 pt-4 border-t border-white/10" : ""}>
<p className="text-sm font-bold mb-1">{l.name}</p>
<p className="text-xs mb-2" style={{ color: accent }}>{l.model}</p>
<p className="text-sm text-gray-200 mb-2">{l.body}</p>
<a href={l.source.url} target="_blank" rel="noopener noreferrer" className="text-xs underline text-gray-400">
{l.source.title}
</a>
</div>
);
})}
</div>

{/* ---------- Does it resonate? ---------- */}
<TypeFeedback typeId={id} accent={accent} />

{/* ---------- Sources ---------- */}
<div className="rounded-2xl border border-white/10 bg-white/5 p-5 mb-4">
<p className="text-xs uppercase tracking-wide text-gray-400 mb-3">Sources</p>
<ol className="space-y-2 list-decimal list-inside">
{sources.map(function (s, i) {
return (
<li key={i} className="text-xs text-gray-300">
<a href={s.url} target="_blank" rel="noopener noreferrer" className="underline" style={{ color: accent }}>{s.title}</a>
</li>
);
})}
</ol>
</div>

<a href="/dashboard" className="block text-center text-xs text-gray-500 underline">Back to dashboard</a>
</div>
</main>
);
}

export default function TypePage() {
return (
<Suspense fallback={<main className="min-h-screen bg-brand-bg" />}>
<TypeContent />
</Suspense>
);
}
