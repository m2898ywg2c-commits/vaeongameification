"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { TYPES } from "@/lib/personality";
import { startOfWeek } from "@/lib/week";
import { pickWeek, shoppingList, dayTotals, DAYS, isShoppingDay, oldEnoughForNutrition, ALLERGEN_LABELS, NUTRITION_MIN_AGE } from "@/lib/nutrition";
import { track, EVENTS } from "@/lib/events";
import Icon from "../Icon";
import Home from "../Home";

// THE NUTRITION TAB.
//
// Gated on profiles.nutrition_enabled, which is false for everybody except James. The six week
// test is measuring whether this app gets people to session three, and a new tab appearing
// mid-block would make the 31 August block end report unreadable as evidence. Turn it on for
// everyone after the test, not during it.
//
// THE WEEK IS WRITTEN ONCE AND THEN IT IS A FACT.
//
// pickWeek is deterministic, so in principle this could compute the week on every load and
// store nothing. It reads preferences though, and preferences change the moment you press
// dislike. A recomputing plan would therefore rewrite Thursday's dinner because you disliked
// Monday's, after you had already bought Thursday's ingredients. So the plan is inserted on
// first view of a new week and read back on every view after that.
//
// A dislike still counts. It just counts from next Sunday, which is also when you next shop.

function localDate(d) {
  const x = d ? new Date(d) : new Date();
  const m = String(x.getMonth() + 1).padStart(2, "0");
  const day = String(x.getDate()).padStart(2, "0");
  return x.getFullYear() + "-" + m + "-" + day;
}

function prettyDate(iso) {
  const d = new Date(iso + "T00:00:00");
  return d.getDate() + " " + d.toLocaleString("en-GB", { month: "long" });
}

export default function NutritionPage() {
  const [supabase] = useState(function () { return createClient(); });
  const [loading, setLoading] = useState(true);
  const [blocked, setBlocked] = useState(false);
  const [profile, setProfile] = useState(null);
  const [typeId, setTypeId] = useState(null);
  const [meals, setMeals] = useState([]);
  const [plan, setPlan] = useState(null);
  const [prefs, setPrefs] = useState({});
  const [showList, setShowList] = useState(false);
  const router = useRouter();

  const weekStart = localDate(startOfWeek(new Date()));

  useEffect(function () {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      const { data: p } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      if (!p) { router.push("/onboarding"); return; }
      if (!p.nutrition_enabled) { setBlocked("off"); setLoading(false); return; }
      // Age is checked here as well as on the setup screen rather than only there. A profile
      // whose birth year is corrected downwards after setup would otherwise keep a calorie
      // target it should no longer have, because the gate would only ever have run once.
      if (!oldEnoughForNutrition(p.birth_year)) { setBlocked("age"); setLoading(false); return; }
      // Unconfigured accounts go and configure. There is nothing sensible to show somebody
      // whose maintenance calories are unknown, and a plan built on a default would be a
      // confident wrong number, which is worse than a form.
      if (!p.kcal_target || !p.nutrition_goal) { router.push("/nutrition/setup"); return; }

      const { data: a } = await supabase.from("assessment_results").select("type_id")
        .eq("user_id", user.id).order("completed_at", { ascending: false }).limit(1).maybeSingle();

      const { data: allMeals } = await supabase.from("meals").select("*").eq("active", true);
      const { data: myPrefs } = await supabase.from("meal_prefs")
        .select("meal_id, verdict").eq("user_id", user.id);
      // Three weeks back covers the two week repeat window with one spare, so the window can be
      // widened later without another query.
      const { data: history } = await supabase.from("meal_plans")
        .select("week_start, slots").eq("user_id", user.id)
        .order("week_start", { ascending: false }).limit(3);

      const prefMap = {};
      (myPrefs || []).forEach(function (r) { prefMap[r.meal_id] = r.verdict; });

      let thisWeek = (history || []).find(function (h) { return h.week_start === weekStart; });

      if (!thisWeek) {
        const picked = pickWeek(allMeals || [], myPrefs || [],
          (history || []).filter(function (h) { return h.week_start !== weekStart; }),
          user.id, weekStart,
          { allergens: p.allergens || [], budget: p.budget_pref });
        // Upsert rather than insert. Two tabs opened on a Sunday morning is a real thing and
        // the unique index would otherwise throw on the second one. Same lesson as the
        // duplicate exercise_logs: guard the write, do not hope.
        const { data: saved } = await supabase.from("meal_plans")
          .upsert({ user_id: user.id, week_start: weekStart, slots: picked },
                  { onConflict: "user_id,week_start" })
          .select("week_start, slots").single();
        thisWeek = saved || { week_start: weekStart, slots: picked };
      }

      setProfile(p);
      setTypeId(a ? a.type_id : null);
      setMeals(allMeals || []);
      setPrefs(prefMap);
      setPlan(thisWeek);
      setShowList(isShoppingDay(new Date()));
      setLoading(false);

      track(supabase, EVENTS.PLAN_VIEWED, { screen: "nutrition", week_start: weekStart });
    }
    load();
  }, [supabase, router, weekStart]);

  const mealsById = {};
  meals.forEach(function (m) { mealsById[m.id] = m; });

  const judge = async function (mealId, verdict) {
    // Pressing the verdict you already gave clears it. A preference you can only ever add to is
    // a preference you cannot correct, and "not for me" on the exercise card has already shown
    // what a one way door does to somebody who mis-taps.
    const current = prefs[mealId];
    const next = current === verdict ? null : verdict;
    setPrefs(function (prev) {
      const copy = Object.assign({}, prev);
      if (next) copy[mealId] = next; else delete copy[mealId];
      return copy;
    });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    if (next) {
      await supabase.from("meal_prefs").upsert({
        user_id: user.id, meal_id: mealId, verdict: next,
        week_start: weekStart, updated_at: new Date().toISOString(),
      }, { onConflict: "user_id,meal_id" });
    } else {
      await supabase.from("meal_prefs").delete()
        .eq("user_id", user.id).eq("meal_id", mealId);
    }
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
                + " and over. Nothing else in Vaeon is affected."
              : "Meal planning is being tested before it goes out properly. It will open up once "
                + "the current six week block has finished."}
          </p>
        </div>
      </main>
    );
  }

  const type = typeId ? TYPES[typeId] : null;
  const accent = type ? type.colors[0] : "#22D3EE";
  const slots = (plan && plan.slots) || {};
  const totals = dayTotals(slots, mealsById);
  const list = shoppingList(slots, mealsById, profile.household_size);
  const kcalTarget = profile.kcal_target || 2000;
  const proteinTarget = profile.protein_target || 150;

  const Verdict = function ({ mealId }) {
    const v = prefs[mealId];
    return (
      <div className="flex gap-1.5 shrink-0">
        {[["like", "Like"], ["dislike", "Not for me"]].map(function (opt) {
          const on = v === opt[0];
          return (
            <button
              key={opt[0]}
              type="button"
              onClick={function () { judge(mealId, opt[0]); }}
              aria-pressed={on}
              className="text-[0.65rem] uppercase tracking-wide px-2 py-1 rounded-sm border"
              style={{
                borderColor: on ? accent : "var(--brand-line)",
                color: on ? accent : "var(--brand-dim)",
                background: on ? accent + "14" : "transparent",
              }}
            >
              {opt[1]}
            </button>
          );
        })}
      </div>
    );
  };

  const MealRow = function ({ id, label }) {
    const m = mealsById[id];
    if (!m) return null;
    return (
      <div className="py-3 border-b" style={{ borderColor: "var(--brand-line)" }}>
        <div className="flex items-start justify-between gap-3 mb-1">
          <div className="min-w-0">
            {label ? (
              <p className="text-[0.65rem] uppercase tracking-wide mb-0.5" style={{ color: "var(--brand-dim)" }}>{label}</p>
            ) : null}
            {m.url ? (
              <a href={m.url} target="_blank" rel="noopener noreferrer"
                 className="text-sm underline decoration-1 underline-offset-2">{m.name}</a>
            ) : (
              <span className="text-sm">{m.name}</span>
            )}
            <p className="text-[0.7rem] mt-0.5" style={{ color: "var(--brand-dim)" }}>
              approx {m.kcal} cal · {m.protein_g}g protein
              {slots.explored === id ? " · new this week" : ""}
            </p>
          </div>
          <Verdict mealId={id} />
        </div>
      </div>
    );
  };

  return (
    <main className="min-h-screen bg-brand-bg text-brand-text px-5 py-8">
      <div className="max-w-md mx-auto">
        <div className="mb-6"><Home /></div>

        <h1 className="font-display text-2xl font-normal mb-1">This week's food</h1>
        <p className="text-sm text-brand-muted mb-5">Week beginning {prettyDate(weekStart)}</p>

        {/* Targets. Deliberately the first thing, because the plan is only meaningful against
            a number, and the number is the thing that is easy to forget by Wednesday. */}
        <div className="rounded-md border p-4 mb-5" style={{ borderColor: "var(--brand-line)" }}>
          <p className="rule-label mb-3">Daily target</p>
          <div className="flex gap-6">
            <div>
              <p className="font-display text-xl" style={{ color: accent }}>{kcalTarget}</p>
              <p className="text-[0.7rem]" style={{ color: "var(--brand-dim)" }}>calories</p>
            </div>
            <div>
              <p className="font-display text-xl" style={{ color: accent }}>{proteinTarget}g</p>
              <p className="text-[0.7rem]" style={{ color: "var(--brand-dim)" }}>protein</p>
            </div>
            <div>
              <p className="font-display text-xl">{totals.kcal}</p>
              <p className="text-[0.7rem]" style={{ color: "var(--brand-dim)" }}>plan average</p>
            </div>
          </div>
          <p className="text-xs text-brand-muted mt-3">
            Plan figures are estimates. Your intake is controlled by the weighed portion, not by
            the number on the card: 200g raw protein, vegetables free, carbohydrate weighed.
          </p>
          <p className="text-xs mt-2">
            <a href="/nutrition/setup" className="underline decoration-1 underline-offset-2"
               style={{ color: accent }}>Goal, weight, allergies and budget</a>
          </p>
        </div>

        {/* The shopping list. Open by default on a Sunday and folded away the rest of the week,
            because it is the single reason to open this tab on the day the week turns and it is
            clutter on a Wednesday. */}
        <button
          type="button"
          onClick={function () { setShowList(!showList); }}
          className="w-full flex items-center justify-between rounded-md border px-4 py-3 mb-3"
          style={{ borderColor: showList ? accent + "66" : "var(--brand-line)",
                   background: showList ? accent + "0F" : "transparent" }}
        >
          <span className="flex items-center gap-2.5">
            <span style={{ color: accent }}><Icon name="basket" size={18} /></span>
            <span className="text-sm">Shopping list for {profile.household_size}</span>
          </span>
          <span className="text-[0.7rem] uppercase tracking-wide" style={{ color: "var(--brand-dim)" }}>
            {showList ? "Hide" : "Show"}
          </span>
        </button>

        {showList ? (
          <div className="rounded-md border p-4 mb-5" style={{ borderColor: "var(--brand-line)" }}>
            {list.map(function (group) {
              return (
                <div key={group.aisle} className="mb-4 last:mb-0">
                  <p className="rule-label mb-2">{group.label}</p>
                  <ul className="text-sm space-y-1">
                    {group.items.map(function (it, i) {
                      return <li key={i} style={{ color: "var(--brand-muted)" }}>{it.text}</li>;
                    })}
                  </ul>
                </div>
              );
            })}
            <p className="text-xs mt-4" style={{ color: "var(--brand-dim)" }}>
              Dinners scaled to {profile.household_size} and rounded up. Breakfasts and lunches
              are for one, seven of each. Rounded up rather than down on purpose: being over is
              a leftover, being under is a ruined Tuesday.
            </p>
          </div>
        ) : null}

        {/* Said out loud rather than shown as a half-empty week. If somebody's allergies have
            starved the library, that is our problem to fix and they should be told it is ours
            rather than left wondering whether the app is broken. */}
        {slots.short ? (
          <div className="rounded-md border p-4 mb-5" style={{ borderColor: accent + "66" }}>
            <p className="rule-label mb-2">A short week, and that is on us</p>
            <p className="text-sm text-brand-muted">
              Once your allergies are taken out there are not yet enough meals in the library to
              fill a full week. You are getting {(slots.dinners || []).length} dinners rather
              than seven. We would rather hand you a short list than serve the same thing four
              nights running or, worse, something you cannot eat. More meals are being added.
            </p>
          </div>
        ) : null}

        {/* Dinners. A named day each, because these are the ones that need shopping for and
            thawing. Breakfast and lunch are pools further down. */}
        <p className="rule-label mb-1">Dinners, all {profile.household_size} of you</p>
        <div className="mb-6">
          {(slots.dinners || []).map(function (id, i) {
            return <MealRow key={id + i} id={id} label={DAYS[(i + 1) % 7]} />;
          })}
        </div>

        <p className="rule-label mb-1">Breakfast, pick one</p>
        <div className="mb-6">
          {(slots.breakfasts || []).map(function (id, i) { return <MealRow key={id + i} id={id} />; })}
        </div>

        <p className="rule-label mb-1">Lunch, pick one</p>
        <div className="mb-6">
          {(slots.lunches || []).map(function (id, i) { return <MealRow key={id + i} id={id} />; })}
        </div>

        {/* A standing option rather than a picked meal, because it is not a choice between
            things, it is the same thing after every session. Sits inside the day's calories. */}
        <div className="rounded-md border p-4 mb-5" style={{ borderColor: "var(--brand-line)" }}>
          <p className="rule-label mb-2">After training</p>
          <p className="text-sm mb-1">40g plain whey in water, or in 300ml semi-skimmed milk on a hard day.</p>
          <p className="text-xs text-brand-muted">
            Roughly 160 or 300 calories, 32 or 42g protein. Plain or naturally flavoured only. Nothing
            ending in -itol: sugar alcohols are the usual way a diet plan gives somebody gut symptoms
            they then misread as something worse.
          </p>
        </div>

        {/* Stated on the plan itself, not just on the form that collected it. Somebody looking
            at a week of food needs to know what the filter does and does not cover at the
            moment they are deciding whether to trust it. */}
        {profile.allergens && profile.allergens.length ? (
          <div className="rounded-md border p-4 mb-5" style={{ borderColor: "var(--brand-line)" }}>
            <p className="rule-label mb-2">Kept out of your plan</p>
            <p className="text-sm mb-2">
              {profile.allergens.map(function (k) { return ALLERGEN_LABELS[k] || k; }).join(", ")}
            </p>
            <p className="text-xs text-brand-muted">
              Filtered on our own list of what is in each dish. The recipes are on other people's
              sites and can change, and nothing here knows about cross-contamination or what a
              shop has put in a jar. Check the recipe and the labels.
            </p>
            <p className="text-xs mt-2">
              <a href="/nutrition/setup" className="underline decoration-1 underline-offset-2"
                 style={{ color: accent }}>Change this</a>
            </p>
          </div>
        ) : null}

        <div className="rounded-md border p-4" style={{ borderColor: "var(--brand-line)" }}>
          <p className="rule-label mb-2">How this learns</p>
          <p className="text-xs text-brand-muted">
            Like and not-for-me both count. A verdict on one meal is a weak verdict on everything
            sharing its tags, so liking two salmon traybakes moves salmon and traybakes rather than
            just those two dishes. Anything marked not-for-me never comes back.
          </p>
          <p className="text-xs text-brand-muted mt-2">
            Changes land next Sunday, not today, so a plan you have already shopped for cannot
            rewrite itself underneath you. One dinner a week is always something you have never
            been given, whatever your preferences say, because a plan that only serves your
            favourites gets boring in a month and then you stop opening it.
          </p>
        </div>
      </div>
    </main>
  );
}
