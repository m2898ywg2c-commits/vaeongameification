"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { TYPES } from "@/lib/personality";
import { targetsFor, ALLERGENS, ALLERGEN_LABELS, ageFrom, oldEnoughForNutrition, NUTRITION_MIN_AGE } from "@/lib/nutrition";
import { track, EVENTS } from "@/lib/events";
import Home from "../../Home";

// NUTRITION REGISTRATION.
//
// Collected once, editable afterwards from the same screen. Everything here exists because the
// targets cannot be computed without it, with one exception: allergies, which are collected
// because serving somebody food they cannot eat is the worst thing this feature could do.
//
// WHY WEIGHT AND HEIGHT ARE ASKED FOR RATHER THAN INFERRED.
//
// body_metrics already holds bodyweight for some users and the temptation is to read it and
// skip a question. It is optional, frequently months stale, and a maintenance figure computed
// from a stale weight is wrong in a way nobody can see. One question is cheaper than a wrong
// number that looks right.
//
// WHY THE AGE CHECK IS HERE AND NOT ONLY ON THE PILOT FLAG.
//
// There are under-18s on this platform. Everything else in this app is exercise, which is
// safe for a fifteen year old. This is the one feature that hands somebody a calorie figure,
// and calorie targets aimed at adolescents are a recognised risk factor for disordered eating.
// The pilot flag is a rollout decision that could be opened to everyone one afternoon without
// anybody stopping to think about who "everyone" includes. This check is separate on purpose.

const GOALS = [
  { id: "lose", label: "Lose weight", blurb: "A deficit sized to how much there is to lose, floored at your resting requirement." },
  { id: "maintain", label: "Stay where I am", blurb: "Eat at maintenance and let the training do the changing." },
  { id: "gain", label: "Build", blurb: "A lean surplus. Capped, because past roughly 400 over maintenance the extra is mostly fat." },
];

const ACTIVITIES = [
  { id: "light", label: "1 to 2 sessions a week" },
  { id: "moderate", label: "3 to 4 sessions a week" },
  { id: "very", label: "5 to 6 sessions a week" },
  { id: "extra", label: "Twice a day, or physical job" },
];

export default function NutritionSetupPage() {
  const [supabase] = useState(function () { return createClient(); });
  const [loading, setLoading] = useState(true);
  const [blocked, setBlocked] = useState(null);
  const [profile, setProfile] = useState(null);
  const [typeId, setTypeId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const [goal, setGoal] = useState("lose");
  const [sex, setSex] = useState("male");
  const [heightCm, setHeightCm] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [activity, setActivity] = useState("moderate");
  const [household, setHousehold] = useState(1);
  const [budget, setBudget] = useState("any");
  const [allergens, setAllergens] = useState([]);
  const [noneConfirmed, setNoneConfirmed] = useState(false);

  const router = useRouter();

  useEffect(function () {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      const { data: p } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      if (!p) { router.push("/onboarding"); return; }
      if (!p.nutrition_enabled) { setBlocked("off"); setLoading(false); return; }
      if (!oldEnoughForNutrition(p.birth_year)) { setBlocked("age"); setLoading(false); return; }

      const { data: a } = await supabase.from("assessment_results").select("type_id")
        .eq("user_id", user.id).order("completed_at", { ascending: false }).limit(1).maybeSingle();

      setProfile(p);
      setTypeId(a ? a.type_id : null);
      if (p.nutrition_goal) setGoal(p.nutrition_goal);
      if (p.sex) setSex(p.sex);
      if (p.height_cm) setHeightCm(String(p.height_cm));
      if (p.activity_level) setActivity(p.activity_level);
      if (p.household_size) setHousehold(p.household_size);
      if (p.budget_pref) setBudget(p.budget_pref);
      if (p.allergens && p.allergens.length) { setAllergens(p.allergens); setNoneConfirmed(true); }
      setLoading(false);
    }
    load();
  }, [supabase, router]);

  const age = profile ? ageFrom(profile.birth_year) : null;
  const preview = targetsFor({
    sex: sex, weightKg: Number(weightKg), heightCm: Number(heightCm),
    age: age, activity: activity, goal: goal,
  });

  const toggleAllergen = function (key) {
    setAllergens(function (prev) {
      return prev.indexOf(key) === -1
        ? prev.concat([key])
        : prev.filter(function (k) { return k !== key; });
    });
  };

  const save = async function (e) {
    e.preventDefault();
    setError(null);
    if (!heightCm || !weightKg) { setError("Height and weight are both needed to work anything out."); return; }
    if (!preview) { setError("Those numbers do not look right. Check the height and weight."); return; }
    // An explicit answer either way, rather than an empty list meaning both "none" and "not
    // asked". Silence is not a declaration that somebody has no allergies.
    if (!allergens.length && !noneConfirmed) { setError("Please confirm you have no allergies, or tick the ones you have."); return; }

    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error: e2 } = await supabase.from("profiles").update({
      nutrition_goal: goal,
      sex: sex,
      height_cm: Number(heightCm),
      activity_level: activity,
      household_size: Number(household),
      budget_pref: budget,
      allergens: allergens,
      kcal_target: preview.kcal,
      protein_target: preview.protein,
    }).eq("id", user.id);
    if (e2) { setSaving(false); setError(e2.message); return; }

    // Weight goes to body_metrics, which is where weight already lives. Duplicating it onto
    // profiles would create two answers to one question and they would diverge within a month.
    await supabase.from("body_metrics").insert({ user_id: user.id, bodyweight: Number(weightKg) });

    track(supabase, EVENTS.PLAN_VIEWED, { screen: "nutrition_setup", goal: goal, allergens: allergens.length });
    window.location.href = "/nutrition";
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-brand-bg text-brand-text px-5 py-8">
        <div className="max-w-md mx-auto"><p className="text-sm text-brand-muted">Loading...</p></div>
      </main>
    );
  }

  if (blocked) {
    return (
      <main className="min-h-screen bg-brand-bg text-brand-text px-5 py-8">
        <div className="max-w-md mx-auto">
          <div className="mb-6"><Home /></div>
          <h1 className="font-display text-2xl font-normal mb-2">
            {blocked === "age" ? "Not available on this account" : "Not switched on yet"}
          </h1>
          <p className="text-sm text-brand-muted">
            {blocked === "age"
              ? "Meal planning and calorie targets are for accounts aged " + NUTRITION_MIN_AGE
                + " and over. Everything else in Vaeon is unaffected. If your date of birth is"
                + " wrong on your profile, put it right and this will open up."
              : "Meal planning is being tested before it goes out properly."}
          </p>
        </div>
      </main>
    );
  }

  const type = typeId ? TYPES[typeId] : null;
  const accent = type ? type.colors[0] : "#22D3EE";

  const Choice = function ({ options, value, onChange, name }) {
    return (
      <div className="grid gap-2">
        {options.map(function (o) {
          const on = value === o.id;
          return (
            <button key={o.id} type="button" onClick={function () { onChange(o.id); }}
              aria-pressed={on}
              className="text-left rounded-md border px-3 py-2.5"
              style={{ borderColor: on ? accent : "var(--brand-line)",
                       background: on ? accent + "12" : "transparent" }}>
              <span className="text-sm" style={{ color: on ? accent : "var(--brand-text)" }}>{o.label}</span>
              {o.blurb ? <span className="block text-xs mt-0.5" style={{ color: "var(--brand-dim)" }}>{o.blurb}</span> : null}
            </button>
          );
        })}
      </div>
    );
  };

  const field = "w-full rounded-sm border bg-transparent px-3 py-2 text-sm";
  const fieldStyle = { borderColor: "var(--brand-line)" };

  return (
    <main className="min-h-screen bg-brand-bg text-brand-text px-5 py-8">
      <div className="max-w-md mx-auto">
        <div className="mb-6"><Home /></div>
        <h1 className="font-display text-2xl font-normal mb-1">Set up your food</h1>
        <p className="text-sm text-brand-muted mb-6">
          Once, and then it plans your week for you. Everything here can be changed later.
        </p>

        <form onSubmit={save}>
          <p className="rule-label mb-2">What are you after</p>
          <div className="mb-6"><Choice options={GOALS} value={goal} onChange={setGoal} /></div>

          <p className="rule-label mb-2">You</p>
          <div className="grid grid-cols-2 gap-2 mb-2">
            <label className="text-xs" style={{ color: "var(--brand-dim)" }}>
              Height, cm
              <input className={field} style={fieldStyle} inputMode="numeric" value={heightCm}
                onChange={function (e) { setHeightCm(e.target.value.replace(/[^0-9]/g, "")); }} />
            </label>
            <label className="text-xs" style={{ color: "var(--brand-dim)" }}>
              Weight, kg
              <input className={field} style={fieldStyle} inputMode="decimal" value={weightKg}
                onChange={function (e) { setWeightKg(e.target.value.replace(/[^0-9.]/g, "")); }} />
            </label>
          </div>
          <div className="mb-2">
            <Choice name="sex" value={sex} onChange={setSex}
              options={[{ id: "male", label: "Male" }, { id: "female", label: "Female" }]} />
            <p className="text-xs mt-1" style={{ color: "var(--brand-dim)" }}>
              Only used for the resting metabolic rate formula, which is calculated differently
              for each. Nothing else in the app reads it.
            </p>
          </div>
          <p className="text-xs mb-6" style={{ color: "var(--brand-dim)" }}>
            Age {age === null ? "unknown" : age}, taken from your profile.
          </p>

          <p className="rule-label mb-2">How much you train</p>
          <div className="mb-6"><Choice options={ACTIVITIES} value={activity} onChange={setActivity} /></div>

          {/* ALLERGIES. The one section on this form that is not about arithmetic. */}
          <p className="rule-label mb-2">Allergies and intolerances</p>
          <p className="text-xs mb-3" style={{ color: "var(--brand-dim)" }}>
            Anything ticked here is removed from your plan entirely and never comes back, whatever
            else the plan is short of.
          </p>
          <div className="grid grid-cols-2 gap-1.5 mb-3">
            {ALLERGENS.map(function (key) {
              const on = allergens.indexOf(key) !== -1;
              return (
                <button key={key} type="button" onClick={function () { toggleAllergen(key); }}
                  aria-pressed={on}
                  className="text-left rounded-sm border px-2.5 py-2 text-xs"
                  style={{ borderColor: on ? accent : "var(--brand-line)",
                           color: on ? accent : "var(--brand-muted)",
                           background: on ? accent + "12" : "transparent" }}>
                  {ALLERGEN_LABELS[key]}
                </button>
              );
            })}
          </div>
          <label className="flex items-start gap-2 text-xs mb-3" style={{ color: "var(--brand-muted)" }}>
            <input type="checkbox" checked={noneConfirmed}
              onChange={function (e) { setNoneConfirmed(e.target.checked); }} className="mt-0.5" />
            <span>I have no allergies or intolerances</span>
          </label>
          {/* Said plainly rather than in a footnote. A filter that somebody trusts more than it
              deserves is more dangerous than no filter at all. */}
          <div className="rounded-md border p-3 mb-6" style={{ borderColor: "var(--brand-line)" }}>
            <p className="text-xs" style={{ color: "var(--brand-muted)" }}>
              <strong style={{ color: accent }}>Read this bit.</strong> This filters our own list
              of what is in each dish. The recipes themselves are on other people's websites and
              can change, and nothing here knows about cross-contamination, "may contain", or
              what a shop has put in a jar. If an allergy of yours is serious, check the actual
              recipe and the labels every time. This is a convenience, not a safety net.
            </p>
          </div>

          <p className="rule-label mb-2">Practical</p>
          <div className="mb-2">
            <label className="text-xs" style={{ color: "var(--brand-dim)" }}>
              How many the evening meal feeds
              <input className={field} style={fieldStyle} inputMode="numeric" value={household}
                onChange={function (e) { setHousehold(e.target.value.replace(/[^0-9]/g, "") || 1); }} />
            </label>
          </div>
          <div className="mb-6">
            <Choice value={budget} onChange={setBudget} options={[
              { id: "any", label: "No particular budget" },
              { id: "economical", label: "Keep it cheap", blurb: "Weights the plan towards low cost meals without banning the rest." },
            ]} />
          </div>

          {/* The numbers, live, before saving. Somebody entering their height should see the
              consequence immediately rather than after a page change. */}
          {preview ? (
            <div className="rounded-md border p-4 mb-5" style={{ borderColor: accent + "66", background: accent + "0F" }}>
              <p className="rule-label mb-3">What that works out as</p>
              <div className="flex gap-5 mb-2">
                <div>
                  <p className="font-display text-xl" style={{ color: accent }}>{preview.kcal}</p>
                  <p className="text-[0.7rem]" style={{ color: "var(--brand-dim)" }}>calories a day</p>
                </div>
                <div>
                  <p className="font-display text-xl" style={{ color: accent }}>{preview.protein}g</p>
                  <p className="text-[0.7rem]" style={{ color: "var(--brand-dim)" }}>protein</p>
                </div>
                <div>
                  <p className="font-display text-xl">{preview.weeklyKg > 0 ? "+" : ""}{preview.weeklyKg}</p>
                  <p className="text-[0.7rem]" style={{ color: "var(--brand-dim)" }}>kg a week</p>
                </div>
              </div>
              <p className="text-xs" style={{ color: "var(--brand-muted)" }}>
                Resting {preview.bmr}, maintenance about {preview.tdee}
                {preview.bmi ? ", BMI " + preview.bmi : ""}. Fat {preview.fat}g, carbs {preview.carbs}g.
              </p>
              {preview.note ? (
                <p className="text-xs mt-2" style={{ color: "var(--brand-muted)" }}>{preview.note}</p>
              ) : null}
            </div>
          ) : (
            <p className="text-xs mb-5" style={{ color: "var(--brand-dim)" }}>
              Height and weight will give you your numbers.
            </p>
          )}

          {error ? <p className="text-sm mb-3" style={{ color: accent }}>{error}</p> : null}

          <button type="submit" disabled={saving}
            className="w-full rounded-md px-4 py-3 font-display text-sm"
            style={{ background: accent, color: "var(--brand-bg)", opacity: saving ? 0.6 : 1 }}>
            {saving ? "Saving..." : "Save and plan my week"}
          </button>

          <p className="text-xs mt-4" style={{ color: "var(--brand-dim)" }}>
            These are calculated figures, not medical advice. If you have a condition that food
            affects, run them past whoever looks after it.
          </p>
        </form>
      </div>
    </main>
  );
}
