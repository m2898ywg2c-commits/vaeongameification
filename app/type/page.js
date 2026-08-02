"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { TYPES } from "@/lib/personality";
import { DIMENSIONS, TYPE_POLES, DIM_ORDER, LAYERS, modelsFor, sourcesFor } from "@/lib/typeguide";
import TypeOrb from "../TypeOrb";
import { track, EVENTS } from "@/lib/events";
import { accentFor, deepFor } from "@/lib/theme";

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
<div className="rounded-md border p-5 mb-4" style={{ borderColor: "var(--accent-55)", background: "var(--brand-surface)" }}>
<p className="font-display text-sm mb-1">How well does this fit you?</p>
<p className="text-xs text-brand-muted mb-3">1 is nothing like me, 5 is that is me exactly. It helps us tune the types.</p>
<div className="grid grid-cols-5 gap-2">
{[1, 2, 3, 4, 5].map(function (v) {
const on = score === v;
return (
<button
key={v}
onClick={function () { rate(v); }}
className="py-3 rounded-md border font-display text-lg font-normal"
style={{
borderColor: on ? accent : "var(--brand-line)",
background: on ? "var(--accent-22)" : "var(--brand-line)",
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

// This page opens in a new tab from the dashboard, so it gets its own sessionStorage
// and pays for an identity lookup. Worth it: whether people read about their type is
// the cheapest available read on whether the personality layer is interesting or
// merely decorative.
useEffect(function () {
if (!id || !TYPES[id]) return;
track(createClient(), EVENTS.TYPE_VIEWED, { type_id: id });
}, [id]);

if (!type || !poles) {
return (
<main className="min-h-screen bg-brand-bg text-brand-text px-6 py-12">
<div className="max-w-md mx-auto">
<p className="text-sm text-brand-muted mb-4">That training type was not found.</p>
<a href="/dashboard" className="text-sm underline" style={{ color: "#22D3EE" }}>Back to dashboard</a>
</div>
</main>
);
}

// THE ACCENT, EMITTED AS LITERAL HEX IN A SCOPED STYLE TAG.
//
// Same shape as the dashboard, and for the same reasons. This page used to read
// type.colors[0] straight off the type object, which is the DARK-theme colour, so in light
// mode it painted the bright colour onto a near-white page. The Monk was all but invisible.
// Both pairs now go into a scoped style block as literal hex and CSS picks on data-theme.
// No var() indirection, no scheme guessed in JS. See the long note in app/dashboard/page.js
// for the two attempts that failed before this shape.
const accentDark = accentFor(type, "dark");
const accentLight = accentFor(type, "light");
const deepDark = deepFor(type, "dark");
const deepLight = deepFor(type, "light");
const accentCss =
"[data-accent]{--accent:" + accentDark + ";--accent-deep:" + deepDark + ";--accent-55:" + accentDark + "55;--accent-40:" + accentDark + "40;--accent-22:" + accentDark + "22;--deep-22:" + deepDark + "22}" +
"[data-theme=\"light\"] [data-accent]{--accent:" + accentLight + ";--accent-deep:" + deepLight + ";--accent-55:" + accentLight + "55;--accent-40:" + accentLight + "40;--accent-22:" + accentLight + "22;--deep-22:" + deepLight + "22}";
const accent = "var(--accent)";
const deep = "var(--accent-deep)";
const models = modelsFor(id);
const sources = sourcesFor(id);

return (
<main data-accent className="min-h-screen text-brand-text px-5 py-8" style={{ background: "var(--brand-bg)" }}>
{/* Scoped to this page, generated from the user's own colour pair. See accentCss above. */}
<style dangerouslySetInnerHTML={{ __html: accentCss }} />
<div className="max-w-md mx-auto">
<a href="/dashboard" className="inline-block text-xs text-brand-muted underline mb-6">Back to dashboard</a>

<div className="rounded-md p-6 mb-6 text-center" style={{ background: "linear-gradient(135deg, var(--accent-22), transparent)" }}>
<div className="flex justify-center mb-2"><TypeOrb typeId={id} size={120} /></div>
<p className="text-xs uppercase tracking-wide text-brand-muted mb-1">{type.code}</p>
<h1 className="font-display text-3xl font-normal mb-1">About the {type.name.replace("The ", "")} training style</h1>
<p className="text-sm text-brand-muted">{type.tagline}</p>
</div>

{/* ---------- Grounding intro ---------- */}
<div className="rounded-md border p-5 mb-4" style={{ borderColor: "var(--accent-55)", background: "var(--brand-surface)" }}>
<p className="text-sm text-brand-text">
The {type.name.replace("The ", "")} sits where three strands of motivation science meet:{" "}
<span className="font-display">{joinModels(models)}</span>. None of this is horoscope. Each dial below
is drawn from research on why people actually stick with training, and what makes them quit.
</p>
</div>

{/* ---------- The three dimensions ---------- */}
{DIM_ORDER.map(function (dim) {
const pole = DIMENSIONS[dim][poles[dim]];
return (
<div key={dim} className="rounded-md border border-brand-line bg-brand-surface p-5 mb-4">
<div className="flex items-center justify-between mb-2">
<p className="text-xs uppercase tracking-wide text-brand-muted">{DIMENSIONS[dim].label}</p>
<span className="text-[0.75rem] font-display px-2 py-0.5 rounded-sm" style={{ background: "var(--accent-22)", color: accent }}>{pole.pole}</span>
</div>
<p className="text-xs mb-2" style={{ color: accent }}>Grounded in {pole.model}</p>
<p className="text-sm text-brand-text mb-3">{pole.body}</p>
<a href={pole.source.url} target="_blank" rel="noopener noreferrer" className="text-xs underline text-brand-muted">
{pole.source.title}
</a>
</div>
);
})}

{/* ---------- What it means in the app ---------- */}
<div className="rounded-md border p-5 mb-4" style={{ borderColor: "var(--accent-40)", background: "linear-gradient(135deg, var(--deep-22), transparent)" }}>
<p className="text-xs uppercase tracking-wide text-brand-muted mb-1">How Vaeon builds your plan</p>
<p className="text-sm text-brand-text mb-4">{type.plan}</p>
<p className="text-xs uppercase tracking-wide text-brand-muted mb-1">Your coaching voice</p>
<p className="text-sm text-brand-text">{type.coaching}</p>
</div>

{/* ---------- The two personal layers ---------- */}
<div className="rounded-md border border-brand-line bg-brand-surface p-5 mb-4">
<p className="text-xs uppercase tracking-wide text-brand-muted mb-3">On top of your type</p>
{LAYERS.map(function (l, i) {
return (
<div key={i} className={i > 0 ? "mt-4 pt-4 border-t border-brand-line" : ""}>
<p className="font-display text-sm mb-1">{l.name}</p>
<p className="text-xs mb-2" style={{ color: accent }}>{l.model}</p>
<p className="text-sm text-brand-text mb-2">{l.body}</p>
<a href={l.source.url} target="_blank" rel="noopener noreferrer" className="text-xs underline text-brand-muted">
{l.source.title}
</a>
</div>
);
})}
</div>

{/* ---------- Does it resonate? ---------- */}
<TypeFeedback typeId={id} accent={accent} />

{/* ---------- Sources ---------- */}
<div className="rounded-md border border-brand-line bg-brand-surface p-5 mb-4">
<p className="text-xs uppercase tracking-wide text-brand-muted mb-3">Sources</p>
<ol className="space-y-2 list-decimal list-inside">
{sources.map(function (s, i) {
return (
<li key={i} className="text-xs text-brand-muted">
<a href={s.url} target="_blank" rel="noopener noreferrer" className="underline" style={{ color: accent }}>{s.title}</a>
</li>
);
})}
</ol>
</div>

<a href="/dashboard" className="block text-center text-xs text-brand-dim underline">Back to dashboard</a>
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
