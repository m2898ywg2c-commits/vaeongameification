import { startOfWeek } from "./week";

// Nutrition. A weekly meal plan that learns what you actually eat.
//
// Everything in this file is a pure function over data the page already has, for the same
// reason lib/progression.js is: numbers that decide what somebody eats need to be testable
// against real preferences without standing up a browser.
//
// THE ONE FAILURE MODE THIS FILE EXISTS TO AVOID
//
// A preference learner that only ever serves you what you have already liked narrows to five
// meals and then you stop opening the tab. It is the same shape as the Ready card quote that
// became wallpaper because it was fixed for a whole day: technically working, practically
// dead. So the picker is deliberately not a pure ranking. It reserves a slot every week for
// something with no history at all, it caps how much of the week can share one protein, and it
// refuses to repeat anything served recently even if it scored top.
//
// Liking things is the signal. It is not the whole instruction.

// How many weeks a meal sits out after being served. Two is the honest maximum against a
// fourteen dinner library, because seven a week for two weeks is the entire library.
export const REPEAT_WINDOW_WEEKS = 2;

// At most this many dinners in a week can share a primary protein. Without it, four likes on
// salmon produces a week of salmon, which nobody wants and which is how a plan stops feeling
// like it was designed by someone who eats.
export const MAX_PER_PROTEIN = 2;

// Tags treated as the primary protein for the variety cap. First match wins, so order matters.
const PROTEIN_TAGS = ["beef", "chicken", "salmon", "prawn", "white-fish", "fish", "pork", "egg", "vegetarian"];

export function primaryProtein(meal) {
  const tags = (meal && meal.tags) || [];
  for (let i = 0; i < PROTEIN_TAGS.length; i++) {
    if (tags.indexOf(PROTEIN_TAGS[i]) !== -1) return PROTEIN_TAGS[i];
  }
  return "other";
}

// FNV-1a, the same hash SessionFanfare uses, and here for the same reason.
//
// The week has to be stable. A random pick would reshuffle on every re-render, so pressing
// dislike on Monday would silently change Thursday while you were looking at it. Seeded on the
// user id and the week start, this returns the same week all week, and a different week to two
// people who share a birthday.
function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// A small deterministic generator, so one seed produces a whole sequence rather than one value.
function rng(seed) {
  let s = seed >>> 0;
  return function () {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// HOW A LIKE TURNS INTO A PREDICTION.
//
// Every meal carries tags. A verdict on one meal is therefore a weak verdict on every tag it
// carries, and the score for an unjudged meal is the average of what you have said about its
// tags.
//
// Smoothed with a +2 in the denominator on purpose. Without it, one like on one Korean dish
// gives "korean" a perfect score of 1.0 off a single data point, and the picker starts treating
// a coincidence as a preference. With it, one like out of one judgement scores 0.33 and three
// likes out of three scores 0.6, which is the shape you want: confidence has to be earned by
// repetition rather than granted by a single Tuesday.
//
// prefs is [{ meal_id, verdict }]. mealsById maps id to meal.
export function tagScores(prefs, mealsById) {
  const tally = {};
  (prefs || []).forEach(function (p) {
    const meal = mealsById[p && p.meal_id];
    if (!meal) return;
    const delta = p.verdict === "like" ? 1 : -1;
    (meal.tags || []).forEach(function (t) {
      if (!tally[t]) tally[t] = { net: 0, n: 0 };
      tally[t].net += delta;
      tally[t].n += 1;
    });
  });
  const out = {};
  Object.keys(tally).forEach(function (t) {
    out[t] = tally[t].net / (tally[t].n + 2);
  });
  return out;
}

// Score in the range roughly -1 to 1. Zero means no opinion either way, which is exactly what
// an untried meal should score.
//
// AVERAGED OVER THE TAGS THAT HAVE AN OPINION, NOT OVER ALL OF THEM.
//
// The first version divided by the total tag count, so a dish tagged
// {chicken, korean, noodle, traybake, spicy} where you had only ever judged "traybake" scored
// one fifth of your actual feeling about traybakes. Every meal in the library carries three to
// five tags, so in practice every signal was divided by four and the whole learner sat within
// noise of doing nothing. Measured before the fix: liking all four traybakes moved their
// frequency from 1.78 a week to 1.68, which is to say it moved nothing and the sign was wrong.
//
// Damped by the square root of coverage so a meal sharing one tag out of five still scores
// lower than one sharing four out of five. Partial overlap is weaker evidence, but it is
// evidence, and dividing it into invisibility was the bug.
export function scoreMeal(meal, scores) {
  const tags = (meal && meal.tags) || [];
  if (!tags.length) return 0;
  let sum = 0;
  let judged = 0;
  tags.forEach(function (t) {
    if (scores[t] === undefined) return;
    sum += scores[t];
    judged += 1;
  });
  if (!judged) return 0;
  return (sum / judged) * Math.sqrt(judged / tags.length);
}

// Has this meal been served in the last REPEAT_WINDOW_WEEKS weeks?
//
// history is [{ week_start, slots }], most recent first, as stored on meal_plans.
export function recentlyServed(history, weeks) {
  const window = Number(weeks) > 0 ? Number(weeks) : REPEAT_WINDOW_WEEKS;
  const seen = {};
  (history || []).slice(0, window).forEach(function (row) {
    const slots = (row && row.slots) || {};
    ["dinners", "breakfasts", "lunches"].forEach(function (k) {
      (slots[k] || []).forEach(function (id) { seen[id] = true; });
    });
  });
  return seen;
}

// THE PICKER.
//
// Returns { dinners: [7 ids], breakfasts: [3], lunches: [3], explored: id or null }.
//
// Breakfast and lunch are pools of three rather than a fixed day each, because nobody decides
// on Sunday what they will want at 7am on Thursday, and a plan that pretends otherwise gets
// ignored by Wednesday. Dinners are a named week because they need shopping for.
//
// THE ORDER OF THE FILTERS MATTERS AND EACH ONE CAN BE SWITCHED OFF UNDER PRESSURE.
//
// Dislikes are absolute and are never relaxed. Everything else is a preference that gives way
// rather than a rule that fails: with a small library, or after a run of dislikes, a strict
// picker returns four dinners and a broken screen. It relaxes the repeat window first, then the
// protein cap, and only then allows a short week. A plan that quietly repeats last Tuesday is a
// far better failure than a plan with holes in it.
export function pickWeek(meals, prefs, history, userId, weekStart) {
  const all = (meals || []).filter(function (m) { return m && m.active !== false; });
  const mealsById = {};
  all.forEach(function (m) { mealsById[m.id] = m; });

  const verdicts = {};
  (prefs || []).forEach(function (p) { if (p) verdicts[p.meal_id] = p.verdict; });

  const scores = tagScores(prefs, mealsById);
  const recent = recentlyServed(history, REPEAT_WINDOW_WEEKS);
  const seed = hash(String(userId || "") + "|" + String(weekStart || ""));
  const rand = rng(seed);

  const bySlot = function (slot) {
    return all.filter(function (m) {
      return m.slot === slot && verdicts[m.id] !== "dislike";
    });
  };

  // Weighted shuffle. Score shifts the odds, it does not dictate the order, so a well-liked
  // meal appears often rather than always. Deterministic because rand is seeded.
  const shuffled = function (list) {
    return list
      .map(function (m) {
        // Efraimidis-Spirakis weighted sampling without replacement: raise a uniform random to
        // the power of one over the weight, then sort descending.
        //
        // THE WEIGHT IS EXPONENTIAL, AND THE LINEAR VERSION WAS TOO WEAK TO SEE.
        //
        // It was 0.15 + (score + 1), which maps a score of 0 to 1.15 and a strongly liked 0.67
        // to 1.82. Through a 1/weight exponent that is almost no difference at all, and the
        // measured effect of liking every traybake in the library was nought point one of a
        // dinner a week. A preference feature you cannot detect after thirty weeks is not a
        // feature, it is a database table with a nice comment on it.
        //
        // exp(2.5 * score) maps -1 to 0.08, 0 to 1 and +1 to 12. Bounded either side, strongly
        // ordered in the middle, and it never reaches zero, so a merely unfavoured meal still
        // surfaces occasionally instead of being quietly buried for good.
        const weight = Math.exp(2.5 * scoreMeal(m, scores));
        return { meal: m, key: Math.pow(rand(), 1 / weight) };
      })
      .sort(function (a, b) { return b.key - a.key; })
      .map(function (r) { return r.meal; });
  };

  const pickDinners = function () {
    const pool = bySlot("dinner");
    const chosen = [];
    const proteinCount = {};

    // THE EXPLORATION SLOT, TAKEN FIRST SO IT CANNOT BE CROWDED OUT.
    //
    // One dinner a week that has never been judged, chosen before anything else. If it is left
    // to the end it loses to the protein cap and the repeat window in exactly the weeks where
    // the plan has become most predictable, which is when it is most needed.
    let explored = null;
    const untried = shuffled(pool.filter(function (m) {
      return verdicts[m.id] === undefined && !recent[m.id];
    }));
    if (untried.length) {
      explored = untried[0];
      chosen.push(explored);
      proteinCount[primaryProtein(explored)] = 1;
    }

    // Three passes, each relaxing one rule. See the note above on why nothing here is fatal.
    const passes = [
      { skipRecent: true, cap: MAX_PER_PROTEIN },
      { skipRecent: false, cap: MAX_PER_PROTEIN },
      { skipRecent: false, cap: 99 },
    ];
    for (let p = 0; p < passes.length && chosen.length < 7; p++) {
      const rule = passes[p];
      const candidates = shuffled(pool);
      for (let i = 0; i < candidates.length && chosen.length < 7; i++) {
        const m = candidates[i];
        if (chosen.indexOf(m) !== -1) continue;
        if (rule.skipRecent && recent[m.id]) continue;
        const prot = primaryProtein(m);
        if ((proteinCount[prot] || 0) >= rule.cap) continue;
        chosen.push(m);
        proteinCount[prot] = (proteinCount[prot] || 0) + 1;
      }
    }

    return { dinners: chosen, explored: explored };
  };

  const pickPool = function (slot, n) {
    const pool = bySlot(slot);
    const fresh = shuffled(pool).filter(function (m) { return !recent[m.id]; });
    const rest = shuffled(pool).filter(function (m) { return recent[m.id]; });
    return fresh.concat(rest).slice(0, n);
  };

  const d = pickDinners();
  return {
    dinners: d.dinners.map(function (m) { return m.id; }),
    breakfasts: pickPool("breakfast", 3).map(function (m) { return m.id; }),
    lunches: pickPool("lunch", 3).map(function (m) { return m.id; }),
    explored: d.explored ? d.explored.id : null,
  };
}

export const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Aisle order, so the list reads the way a supermarket is walked rather than the way the
// recipes happened to be written. Produce first because it is by the door in most of them.
export const AISLES = ["produce", "meat", "fish", "dairy", "bakery", "frozen", "cupboard"];

const AISLE_LABELS = {
  produce: "Fruit and veg",
  meat: "Meat",
  fish: "Fish",
  dairy: "Dairy and chilled",
  bakery: "Bakery",
  frozen: "Frozen",
  cupboard: "Store cupboard",
};

// THE SHOPPING LIST.
//
// Aggregates the week's dinners across the household plus seven breakfasts and seven lunches
// for one person, and merges anything that matches on item and unit.
//
// SCALED, THEN ROUNDED UP, NEVER DOWN. A recipe for four scaled to five is 1.25 portions of
// everything, and a list that rounds 500g of mince down to 600g for five people sends somebody
// back to the shop. Weights round up to the nearest 50g, counts to the nearest whole thing.
// Being slightly over on a shop is a leftover. Being slightly under is a ruined Tuesday.
//
// Items with no quantity, the "cumin, chilli powder, cinnamon" sort, pass through once without
// a number. Multiplying a spice jar by 1.25 is not information.
export function shoppingList(plan, mealsById, householdSize) {
  const people = Math.max(1, Number(householdSize) || 1);
  const lines = {};

  const add = function (meal, servingsNeeded) {
    if (!meal) return;
    const serves = Math.max(1, Number(meal.serves) || 1);
    const factor = servingsNeeded / serves;
    (meal.ingredients || []).forEach(function (ing) {
      if (!ing || !ing.item) return;
      const aisle = AISLES.indexOf(ing.aisle) !== -1 ? ing.aisle : "cupboard";
      const key = aisle + "|" + ing.item + "|" + (ing.unit || "");
      const qty = Number(ing.qty);
      if (!lines[key]) {
        lines[key] = { item: ing.item, unit: ing.unit || "", aisle: aisle, qty: 0, countless: false };
      }
      if (!qty) { lines[key].countless = true; return; }
      lines[key].qty += qty * factor;
    });
  };

  (plan.dinners || []).forEach(function (id) { add(mealsById[id], people); });
  // Breakfast and lunch are for one person, seven of each, spread across whatever pool of three
  // was picked. Not exact, because nobody eats the pool evenly, but it is the right total.
  const spread = function (ids) {
    const list = ids || [];
    if (!list.length) return;
    for (let i = 0; i < 7; i++) add(mealsById[list[i % list.length]], 1);
  };
  spread(plan.breakfasts);
  spread(plan.lunches);

  const round = function (line) {
    if (line.countless && !line.qty) return null;
    const u = (line.unit || "").toLowerCase();
    if (u === "g" || u === "ml") return Math.ceil(line.qty / 50) * 50;
    if (u === "kg") return Math.ceil(line.qty * 10) / 10;
    return Math.ceil(line.qty);
  };

  const out = AISLES.map(function (aisle) {
    const items = Object.keys(lines)
      .filter(function (k) { return lines[k].aisle === aisle; })
      .map(function (k) {
        const l = lines[k];
        const q = round(l);
        return {
          item: l.item,
          text: q === null ? l.item : (q + (l.unit ? " " + l.unit : " x") + " " + l.item),
        };
      })
      .sort(function (a, b) { return a.item.localeCompare(b.item); });
    return { aisle: aisle, label: AISLE_LABELS[aisle], items: items };
  }).filter(function (g) { return g.items.length; });

  return out;
}

// What the plan adds up to against the targets, as a sanity check rather than a promise.
// Estimates in, estimates out: see the note on macros_estimated in the meals table.
export function dayTotals(plan, mealsById) {
  const avg = function (ids) {
    const list = (ids || []).map(function (id) { return mealsById[id]; }).filter(Boolean);
    if (!list.length) return { kcal: 0, protein: 0 };
    let k = 0, p = 0;
    list.forEach(function (m) { k += Number(m.kcal) || 0; p += Number(m.protein_g) || 0; });
    return { kcal: Math.round(k / list.length), protein: Math.round(p / list.length) };
  };
  const b = avg(plan.breakfasts);
  const l = avg(plan.lunches);
  const d = avg(plan.dinners);
  return {
    kcal: b.kcal + l.kcal + d.kcal,
    protein: b.protein + l.protein + d.protein,
    breakfast: b, lunch: l, dinner: d,
  };
}

// Is today the day the shopping list matters? The week turns on Sunday, which is also the day
// most people can get to a supermarket, and that is not a coincidence: the whole feature is
// built around the plan landing before the shop rather than after it.
export function isShoppingDay(date) {
  const d = date ? new Date(date) : new Date();
  return startOfWeek(d).getTime() === new Date(d).setHours(0, 0, 0, 0);
}
