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
// The UK's fourteen. Used by the setup screen and by the exclusion below.
export const ALLERGENS = [
  "gluten", "crustaceans", "eggs", "fish", "peanuts", "soya", "milk",
  "nuts", "celery", "mustard", "sesame", "sulphites", "lupin", "molluscs",
];

export const ALLERGEN_LABELS = {
  gluten: "Cereals containing gluten", crustaceans: "Crustaceans", eggs: "Eggs",
  fish: "Fish", peanuts: "Peanuts", soya: "Soya", milk: "Milk", nuts: "Tree nuts",
  celery: "Celery", mustard: "Mustard", sesame: "Sesame", sulphites: "Sulphites",
  lupin: "Lupin", molluscs: "Molluscs",
};

// options is { allergens: [...], budget: "any" | "economical" }.
export function pickWeek(meals, prefs, history, userId, weekStart, options) {
  const opts = options || {};
  const avoid = opts.allergens || [];
  const all = (meals || []).filter(function (m) { return m && m.active !== false; });
  const mealsById = {};
  all.forEach(function (m) { mealsById[m.id] = m; });

  const verdicts = {};
  (prefs || []).forEach(function (p) { if (p) verdicts[p.meal_id] = p.verdict; });

  const scores = tagScores(prefs, mealsById);
  const recent = recentlyServed(history, REPEAT_WINDOW_WEEKS);
  const seed = hash(String(userId || "") + "|" + String(weekStart || ""));
  const rand = rng(seed);

  // ALLERGENS ARE EXCLUDED HERE, AT THE POOL, AND THAT LOCATION IS THE WHOLE SAFETY ARGUMENT.
  //
  // Every one of the three fallback passes below draws from this function, so there is no code
  // path anywhere that can relax an allergen the way it relaxes the repeat window and the
  // protein cap. If the exclusion leaves fewer than seven dinners, the picker repeats a meal.
  // It does not reach for an excluded one. That ordering is deliberate and is tested.
  //
  // What this is NOT: a guarantee. The tags are our own best effort over our own ingredient
  // lists, the linked recipes are third party and can change under us, and cross-contamination
  // and "may contain" are not modelled at all. Anybody with a real allergy has to read the
  // recipe and the labels, and the screen says so rather than leaving it implied.
  const safe = function (m) {
    if (!avoid.length) return true;
    const has = m.allergens || [];
    for (let i = 0; i < avoid.length; i++) {
      if (has.indexOf(avoid[i]) !== -1) return false;
    }
    return true;
  };

  const bySlot = function (slot) {
    return all.filter(function (m) {
      return m.slot === slot && verdicts[m.id] !== "dislike" && safe(m);
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
        //
        // Budget is a nudge in the same currency rather than a filter, which is why it is a
        // multiplier here and not an exclusion above. A student on a tight week still wants the
        // occasional salmon, and a hard filter on cost would hand them ten identical mince
        // dinners and be quietly ignored by the second week. Cheap roughly doubles the odds,
        // expensive roughly halves them.
        let weight = Math.exp(2.5 * scoreMeal(m, scores));
        if (opts.budget === "economical") {
          if (m.cost === "low") weight *= 2;
          else if (m.cost === "high") weight *= 0.4;
        }
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
    //
    // NOTE THAT A MEAL IS NEVER REPEATED INSIDE ONE WEEK, EVEN AT THE END OF THE LAST PASS.
    //
    // An earlier comment here claimed the picker would "quietly repeat last Tuesday" rather
    // than return a short week. It does not, and testing it against a heavily restricted
    // library is what showed that up: a fish allergy against a library that is mostly fish
    // returned two dinners, not seven.
    //
    // Two dinners is the right answer and the comment was wrong. Serving the same meal four
    // times in one week to somebody whose allergies have starved the library is not a plan, it
    // is a bug wearing a plan's clothes, and it hides the actual problem, which is that there
    // is not enough food in the library that this person can eat. The result carries `short`
    // so the screen can say that out loud instead.
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
  const breakfasts = pickPool("breakfast", 3);
  const lunches = pickPool("lunch", 3);
  return {
    dinners: d.dinners.map(function (m) { return m.id; }),
    breakfasts: breakfasts.map(function (m) { return m.id; }),
    lunches: lunches.map(function (m) { return m.id; }),
    explored: d.explored ? d.explored.id : null,
    // True when restrictions have left the library too thin to fill the week. The screen says
    // so plainly rather than showing a half-empty plan and letting somebody assume it broke.
    short: d.dinners.length < 7 || breakfasts.length < 3 || lunches.length < 3,
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

// ======================================================================================
// TARGETS
// ======================================================================================

// EIGHTEEN AND OVER, AND THIS ONE IS NOT NEGOTIABLE.
//
// There are under-18s on this platform, supervised family members, and the age gate at signup
// is still an open item. Everything else in this app is exercise, which a fifteen year old can
// do perfectly safely. This feature prescribes a calorie figure, and a calorie figure handed to
// a teenager is a different object entirely: restriction targets aimed at adolescents are a
// recognised risk factor for disordered eating, and the Children's Code applies on top.
//
// So nutrition checks age directly rather than relying on the pilot flag. The flag is a rollout
// decision and could be opened to everybody one afternoon without anybody thinking about who
// "everybody" includes.
export const NUTRITION_MIN_AGE = 18;

export function ageFrom(birthYear, now) {
  const y = Number(birthYear);
  if (!y) return null;
  const d = now ? new Date(now) : new Date();
  return d.getFullYear() - y;
}

export function oldEnoughForNutrition(birthYear, now) {
  const age = ageFrom(birthYear, now);
  // Unknown age fails closed. A missing birth year is not evidence of being an adult.
  if (age === null) return false;
  return age >= NUTRITION_MIN_AGE;
}

// DELIBERATELY LOWER THAN THE TEXTBOOK NUMBERS.
//
// The standard Harris-Benedict multipliers are 1.2 / 1.375 / 1.55 / 1.725 / 1.9, and they are
// well known to run high: they were derived from self-reported activity, and self-reported
// activity is generous. Doubly-labelled water studies put real expenditure below them for most
// people, and the error compounds because somebody training six times a week ticks the highest
// box they honestly can.
//
// Overestimating maintenance is the expensive direction to be wrong in. It shrinks the deficit,
// the person does not lose weight, and they conclude the app does not work rather than that the
// multiplier was optimistic. Underestimating it means they lose slightly faster than predicted,
// notice, and are pleased. So these are pulled down by roughly a tenth at the top end.
//
// Sanity check that set them: James at 101kg, 175cm, 48, training six-plus times a week comes
// out at a maintenance of about 2,900 here, which is the figure arrived at independently by
// hand before this function existed. The textbook 1.725 would have said 3,224.
const ACTIVITY = { sedentary: 1.2, light: 1.35, moderate: 1.45, very: 1.55, extra: 1.7 };

// Mifflin-St Jeor. Chosen over Harris-Benedict because it is the more accurate of the two in
// every comparison since the 1990s, and over Katch-McArdle because that needs a body fat
// percentage nobody here has measured properly.
export function bmr(sex, weightKg, heightCm, age) {
  const w = Number(weightKg), h = Number(heightCm), a = Number(age);
  if (!w || !h || !a) return null;
  const base = 10 * w + 6.25 * h - 5 * a;
  return Math.round(sex === "female" ? base - 161 : base + 5);
}

// THE DEFICIT SCALES WITH HOW MUCH THERE IS TO LOSE, AND THE SURPLUS DOES NOT SCALE AT ALL.
//
// A flat percentage is wrong in both directions. Thirty percent off maintenance is reasonable
// at a BMI of 33 and reckless at 23, where it mostly costs you muscle. So the cut is banded on
// BMI, and the result is floored at BMR: eating below your own resting requirement while
// training six times a week is where sleep, recovery and the training block all go at once.
//
// The gain side is capped hard and low on purpose. Beyond roughly 400 calories over
// maintenance, the extra is very largely fat, and "bulking" as commonly practised is a long
// way of arriving back where you started with further to go. Fifteen percent, capped at 500,
// is a lean gain of roughly a quarter to a half a kilo a week.
export function targetsFor(input) {
  const i = input || {};
  const weight = Number(i.weightKg);
  const height = Number(i.heightCm);
  const age = Number(i.age);
  const goal = i.goal || "maintain";
  const mult = ACTIVITY[i.activity] || ACTIVITY.moderate;

  const rest = bmr(i.sex, weight, height, age);
  if (!rest) return null;
  const tdee = Math.round(rest * mult);

  const bmi = height ? weight / Math.pow(height / 100, 2) : null;
  let kcal;
  let note = null;

  if (goal === "lose") {
    const band = bmi === null ? 0.20 : bmi >= 30 ? 0.30 : bmi >= 25 ? 0.25 : 0.20;
    kcal = Math.max(rest, tdee - tdee * band);
    if (kcal <= rest + 1) {
      note = "Held at your resting requirement. A larger deficit than this would mean eating "
        + "below what your body uses lying still, which is where recovery and training go first.";
    }
  } else if (goal === "gain") {
    kcal = tdee + Math.min(500, tdee * 0.15);
    note = "A surplus of about " + Math.round(Math.min(500, tdee * 0.15)) + " calories. Bigger "
      + "than this and most of the extra is fat rather than muscle, whatever the internet says.";
  } else {
    kcal = tdee;
  }

  // Protein per kilo of current bodyweight. Highest in a deficit, because that is when there is
  // something to protect rather than something to build.
  const perKg = goal === "lose" ? 1.75 : goal === "gain" ? 1.8 : 1.6;
  const protein = Math.round((weight * perKg) / 5) * 5;

  // Fat floored at 0.8g/kg for hormonal function, carbohydrate takes the remainder.
  const fat = Math.max(Math.round(weight * 0.8), Math.round((kcal * 0.25) / 9));
  const carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4));

  return {
    bmr: rest,
    tdee: tdee,
    bmi: bmi === null ? null : Math.round(bmi * 10) / 10,
    kcal: Math.round(kcal / 50) * 50,
    protein: protein,
    fat: fat,
    carbs: carbs,
    goal: goal,
    note: note,
    // Roughly, at 7,700 calories to the kilogram. Signed: negative is loss.
    weeklyKg: Math.round(((kcal - tdee) * 7 / 7700) * 100) / 100,
  };
}
