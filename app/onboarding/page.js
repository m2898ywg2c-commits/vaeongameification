"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { GOAL_LIST, SESSION_CHOICES } from "@/lib/training";
import {
GYM_READY_GOAL,
GYM_READY_ID,
GYM_READY_BLOCK_WEEKS,
DEFAULT_BLOCK_WEEKS,
isGymReady,
toggleGoal,
} from "@/lib/gymready";
import { track, EVENTS } from "@/lib/events";

const EQUIPMENT = [
{ id: "gym", icon: "🏋️", name: "I have a gym", blurb: "Barbells, machines, cables, the lot." },
{ id: "home", icon: "🎒", name: "Some kit at home", blurb: "Dumbbells, bands, a bench, that sort of thing." },
{ id: "none", icon: "🤸", name: "Freestyling it", blurb: "Bodyweight, the park, whatever is to hand." },
];

// 0 = Sunday, matching profiles.train_days
const WEEKDAYS = [
{ n: 1, short: "Mon" },
{ n: 2, short: "Tue" },
{ n: 3, short: "Wed" },
{ n: 4, short: "Thu" },
{ n: 5, short: "Fri" },
{ n: 6, short: "Sat" },
{ n: 0, short: "Sun" },
];

// Gym ready sits at the end of the list, after the twelve Vaeon plans for.
const ALL_GOALS = GOAL_LIST.concat([GYM_READY_GOAL]);

export default function OnboardingPage() {
const [step, setStep] = useState("goals");
const [picked, setPicked] = useState([]);
const [sessions, setSessions] = useState(3);
const [equipment, setEquipment] = useState("gym");
const [fixedDays, setFixedDays] = useState(null);
const [trainDays, setTrainDays] = useState([]);
const [saving, setSaving] = useState(false);
const [error, setError] = useState(null);
const [hasType, setHasType] = useState(false);
const router = useRouter();

// Your training type is about how you like to be coached, not what you are training for,
// so changing goals should never send you back through the assessment. We only route
// people to it if they have genuinely never taken it.
useEffect(function () {
const supabase = createClient();
supabase.auth.getUser().then(function (res) {
const user = res.data.user;
if (!user) return;
supabase.from("assessment_results").select("type_id")
.eq("user_id", user.id).limit(1).maybeSingle()
.then(function (r) { if (r.data && r.data.type_id) setHasType(true); });
});
}, []);

const gym = isGymReady(picked);

const toggle = function (id) {
setPicked(toggleGoal(picked, id, 2));
};

const toggleDay = function (n) {
if (trainDays.indexOf(n) !== -1) setTrainDays(trainDays.filter(function (d) { return d !== n; }));
else setTrainDays(trainDays.concat([n]).sort(function (a, b) { return a - b; }));
};

const save = async function () {
setSaving(true);
setError(null);
const supabase = createClient();
const res = await supabase.auth.getUser();
const user = res.data.user;
if (!user) { router.push("/login"); return; }
const { error: e } = await supabase.from("profiles").update({
goals: picked,
sessions_per_week: sessions,
equipment: equipment,
fixed_days: fixedDays === null ? true : fixedDays,
train_days: fixedDays ? trainDays : [],
}).eq("id", user.id);
if (e) { setSaving(false); setError(e.message); return; }

// Block length is stored per user so an individual's block can be changed later without
// touching any logic. Written separately and allowed to fail, because profiles.block_weeks
// is a later migration: until it exists, blockWeeksFor() derives the same answer from the
// goal, so nothing breaks either way.
try {
await supabase.from("profiles")
.update({ block_weeks: gym ? GYM_READY_BLOCK_WEEKS : DEFAULT_BLOCK_WEEKS })
.eq("id", user.id);
} catch (ignored) {}

track(supabase, EVENTS.ONBOARDING_COMPLETED, {
goals: picked, sessions_per_week: sessions, equipment: equipment,
fixed_days: fixedDays === null ? true : fixedDays, gym: gym,
// Whether this was first-run setup or someone changing their mind later. The
// dashboard links back here to edit goals, so without this flag the funnel would
// count every edit as a fresh activation.
had_type: hasType,
});

setSaving(false);
router.push(hasType ? "/dashboard" : "/assessment");
router.refresh();
};

const card = function (active) {
return "w-full text-left px-4 py-4 rounded-2xl border text-sm font-medium " +
(active ? "border-white bg-white/20" : "border-white/10 bg-white/5");
};

const primaryBtn = { background: "linear-gradient(90deg, #22D3EE, #3B82F6)", color: "#000000" };
const dimBtn = { background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.4)" };

// Back sits on the left and forward on the right, matching the direction of travel.
const navRow = "flex items-center gap-3";
const backBtn = "px-6 py-3 rounded-full font-bold text-sm border border-white/20";

if (step === "equipment") {
return (
<main className="min-h-screen flex flex-col items-center justify-center bg-brand-bg text-white px-6 py-12">
<div className="w-full max-w-md">
<p className="text-xs uppercase tracking-wide text-gray-400 mb-2">Where will you train</p>
<h1 className="text-3xl font-bold mb-2">What have you got?</h1>
<p className="text-sm text-gray-300 mb-8">
No gym is completely fine. We swap every exercise for something you can actually do.
</p>
<div className="space-y-3 mb-8">
{EQUIPMENT.map(function (opt) {
return (
<button key={opt.id} onClick={function () { setEquipment(opt.id); }} className={card(equipment === opt.id)}>
<span className="flex items-center gap-3">
<span className="text-2xl" aria-hidden="true">{opt.icon}</span>
<span>
<span className="block font-bold">{opt.name}</span>
<span className="block text-xs text-gray-400">{opt.blurb}</span>
</span>
</span>
</button>
);
})}
</div>
<div className={navRow}>
<button onClick={function () { setStep("goals"); }} className={backBtn}>Back</button>
<button onClick={function () { setStep("sessions"); }} className="ml-auto px-6 py-3 rounded-full font-bold text-sm" style={primaryBtn}>Next</button>
</div>
</div>
</main>
);
}

if (step === "sessions") {
return (
<main className="min-h-screen flex flex-col items-center justify-center bg-brand-bg text-white px-6 py-12">
<div className="w-full max-w-md">
<p className="text-xs uppercase tracking-wide text-gray-400 mb-2">Be honest with yourself</p>
<h1 className="text-3xl font-bold mb-2">How many sessions a week?</h1>
<p className="text-sm text-gray-300 mb-8">
This is your pledge, and what the leaderboard scores you against. Two you actually do beats five you do not.
</p>
<div className="grid grid-cols-5 gap-2 mb-8">
{SESSION_CHOICES.map(function (n) {
const on = sessions === n;
return (
<button key={n} onClick={function () { setSessions(n); }}
className={"py-4 rounded-2xl border text-lg font-bold " + (on ? "border-white bg-white/20" : "border-white/10 bg-white/5")}>
{n}
</button>
);
})}
</div>
<div className={navRow}>
<button onClick={function () { setStep("equipment"); }} className={backBtn}>Back</button>
<button onClick={function () { setStep("days"); }} className="ml-auto px-6 py-3 rounded-full font-bold text-sm" style={primaryBtn}>Next</button>
</div>
</div>
</main>
);
}

if (step === "days") {
const needsDays = fixedDays === true && trainDays.length === 0;
const blocked = fixedDays === null || needsDays;
const mismatch = fixedDays === true && trainDays.length > 0 && trainDays.length !== sessions;

return (
<main className="min-h-screen flex flex-col items-center justify-center bg-brand-bg text-white px-6 py-12">
<div className="w-full max-w-md">
<p className="text-xs uppercase tracking-wide text-gray-400 mb-2">Last one</p>
<h1 className="text-3xl font-bold mb-2">Do you train on set days?</h1>
<p className="text-sm text-gray-300 mb-8">
Some people like Tuesday to mean Tuesday. Others just want to know what is next.
</p>
<div className="space-y-3 mb-8">
<button onClick={function () { setFixedDays(true); }} className={card(fixedDays === true)}>
<span className="flex items-center gap-3">
<span className="text-2xl" aria-hidden="true">&#128197;</span>
<span>
<span className="block font-bold">Yes, give me days</span>
<span className="block text-xs text-gray-400">Mon, Tue, Wed and so on</span>
</span>
</span>
</button>
<button onClick={function () { setFixedDays(false); setTrainDays([]); }} className={card(fixedDays === false)}>
<span className="flex items-center gap-3">
<span className="text-2xl" aria-hidden="true">&#128290;</span>
<span>
<span className="block font-bold">No, just number them</span>
<span className="block text-xs text-gray-400">Session 1, 2, 3. Do them whenever suits.</span>
</span>
</span>
</button>
</div>

{fixedDays === true ? (
<div className="mb-8">
<p className="text-xs uppercase tracking-wide text-gray-400 mb-3">Which days?</p>
<div className="grid grid-cols-4 gap-2">
{WEEKDAYS.map(function (d) {
const on = trainDays.indexOf(d.n) !== -1;
return (
<button
key={d.n}
onClick={function () { toggleDay(d.n); }}
className={"py-4 rounded-2xl border text-sm font-bold " + (on ? "border-white bg-white/20" : "border-white/10 bg-white/5")}
>
{d.short}
</button>
);
})}
</div>
{mismatch ? (
<p className="text-xs mt-3" style={{ color: "#FFB020" }}>
{trainDays.length} day{trainDays.length === 1 ? "" : "s"} picked against a pledge of {sessions}. You can change either later.
</p>
) : null}
</div>
) : null}

{hasType ? (
<div className="rounded-2xl border p-4 mb-4" style={{ borderColor: "#22D3EE55", background: "rgba(34,211,238,0.08)" }}>
<p className="text-sm font-bold mb-1" style={{ color: "#22D3EE" }}>Your training type stays as it is</p>
<p className="text-xs text-gray-300">
Your type is about how you like to be coached, not what you are training for, so there is
nothing to redo. You can retake the assessment any time from Settings if it stops fitting.
</p>
</div>
) : (
<div className="rounded-2xl border p-4 mb-4" style={{ borderColor: "#22D3EE55", background: "rgba(34,211,238,0.08)" }}>
<p className="text-sm font-bold mb-1" style={{ color: "#22D3EE" }}>Next: find your training type</p>
<p className="text-xs text-gray-300">
A quick two-minute quiz. To build you the best training experience we can, we need to understand how you tick: what actually drives you, how you like to train, and when your body is at its best. That is what finding your type means.
</p>
</div>
)}

{error ? <p className="text-sm text-red-400 mb-3">{error}</p> : null}
<div className={navRow}>
<button onClick={function () { setStep("sessions"); }} className={backBtn}>Back</button>
<button onClick={save} disabled={saving || blocked}
className="ml-auto px-6 py-3 rounded-full font-bold text-sm"
style={blocked ? dimBtn : primaryBtn}>
{saving ? "Saving..." : needsDays ? "Pick your days" : (hasType ? "Save changes" : "Find my type")}
</button>
</div>
</div>
</main>
);
}

return (
<main className="min-h-screen flex flex-col items-center justify-center bg-brand-bg text-white px-6 py-12">
<div className="w-full max-w-lg">
<a href="/dashboard" className="inline-block text-xs text-gray-400 underline mb-4">Back to dashboard</a>
<p className="text-xs uppercase tracking-wide text-gray-400 mb-2">What is this really for</p>
<h1 className="text-3xl font-bold mb-2">Pick up to two.</h1>
<p className="text-sm text-gray-300 mb-8">Your goals decide the sessions Vaeon builds for you.</p>
<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
{ALL_GOALS.map(function (g) {
const active = picked.indexOf(g.id) !== -1;
// Gym ready means Vaeon does not plan, so it cannot sit alongside a goal that
// says it should. Selecting either clears the other. The others are deliberately
// NOT dimmed while Gym ready is on: they still work, they just swap you over, and
// dimming would imply they are disabled when they are not.
const blocked = gym ? false : (g.id === GYM_READY_ID ? false : picked.length >= 2 && !active);
const own = g.id === GYM_READY_ID;
return (
<button key={g.id} onClick={function () { toggle(g.id); }}
className={"text-left px-4 py-3 rounded-xl border text-sm font-medium " +
(active ? "border-white bg-white/20" : blocked ? "border-white/5 bg-white/5 opacity-40" : "border-white/10 bg-white/5") +
(own ? " sm:col-span-2" : "")}>
<span className="block">{g.name}</span>
{own ? <span className="block text-xs text-gray-400 mt-1">{g.blurb}</span> : null}
</button>
);
})}
</div>

{gym ? (
<p className="text-xs text-gray-400 mb-8">
Gym ready replaces the other goals, because your coach is setting the plan. Vaeon will
record your sessions, track your lifts and report back every eight weeks.
</p>
) : <div className="mb-8" />}

<button onClick={function () { if (picked.length) setStep("equipment"); }} disabled={picked.length === 0}
className="w-full px-6 py-4 rounded-full font-bold text-sm"
style={picked.length ? primaryBtn : dimBtn}>
{picked.length ? "Continue" : "Pick at least one"}
</button>
</div>
</main>
);
}
