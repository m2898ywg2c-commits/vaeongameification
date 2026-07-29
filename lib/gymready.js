// Gym ready: the "I already have a plan" goal.
//
// This is for people who already train, get their programme from a PT, and want Vaeon
// only to record what they lift and report progress back. Vaeon counts, the coach coaches.
// That means NO prescribed exercises, NO periodisation phases, NO working weights and no
// baseline nags for these users. The eight-week block is a measurement window: it drives
// leaderboard adherence and triggers the block-end report, nothing more.
//
// Everything Gym ready needs lives in this one file on purpose. lib/training.js is ~700
// lines of exercise data and lib/progression.js holds the periodisation tables and the
// lift ratio table. Both are committed through a bulk-upload pipeline that replaces whole
// files, so editing them in place risks corrupting data that has nothing to do with this
// feature. Additive is safer.

import { GOALS, DAY_LABELS } from "@/lib/training";

export const GYM_READY_ID = "gymready";
export const GYM_READY_BLOCK_WEEKS = 8;
export const DEFAULT_BLOCK_WEEKS = 6;

// Shaped like the entries in GOAL_LIST so the onboarding grid can render it alongside
// the other twelve without special casing the markup.
export const GYM_READY_GOAL = {
  id: GYM_READY_ID,
  name: "Gym ready",
  blurb: "You already have a plan. Vaeon just records it and shows you the progress.",
  category: "own",
};

export function isGymReady(goals) {
  return Array.isArray(goals) && goals.indexOf(GYM_READY_ID) !== -1;
}

// Gym ready is deliberately exclusive. Pairing it with, say, Marathon would give someone
// two contradictory plans, and buildWeek would be asked to both prescribe and not prescribe.
export function toggleGoal(picked, id, max) {
  const list = picked || [];
  const limit = max || 2;
  if (id === GYM_READY_ID) {
    return list.indexOf(GYM_READY_ID) !== -1 ? [] : [GYM_READY_ID];
  }
  const withoutGym = list.filter(function (g) { return g !== GYM_READY_ID; });
  if (withoutGym.indexOf(id) !== -1) {
    return withoutGym.filter(function (g) { return g !== id; });
  }
  if (withoutGym.length >= limit) return withoutGym;
  return withoutGym.concat([id]);
}

// ---------- Block length ----------
// Block length is per user, stored on profiles.block_weeks, so it can be adjusted for an
// individual later without touching any logic. These mirror currentWeek and blockComplete
// in lib/progression.js but take the length as an argument instead of using the constant.

export function blockWeeksFor(profile) {
  if (!profile) return DEFAULT_BLOCK_WEEKS;
  const n = Number(profile.block_weeks);
  if (n && n > 0) return n;
  return isGymReady(profile.goals) ? GYM_READY_BLOCK_WEEKS : DEFAULT_BLOCK_WEEKS;
}

export function currentWeekIn(blockStart, blockWeeks) {
  const total = blockWeeks || DEFAULT_BLOCK_WEEKS;
  if (!blockStart) return 1;
  const start = new Date(blockStart);
  start.setHours(0, 0, 0, 0);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const days = Math.floor((now - start) / (24 * 60 * 60 * 1000));
  if (days < 0) return 1;
  const w = Math.floor(days / 7) + 1;
  return Math.min(total, Math.max(1, w));
}

export function blockCompleteIn(blockStart, blockWeeks) {
  const total = blockWeeks || DEFAULT_BLOCK_WEEKS;
  if (!blockStart) return false;
  const start = new Date(blockStart);
  const days = Math.floor((new Date() - start) / (24 * 60 * 60 * 1000));
  return days >= total * 7;
}

// ---------- The week ----------
// Synthetic days with no prescribed content. The keys must stay stable across weeks,
// because logged exercise names are looked up by day_key to prefill next time.

const SPREAD = {
  2: [1, 4],
  3: [1, 3, 5],
  4: [1, 2, 3, 4],
  5: [0, 1, 2, 4, 5],
  6: [0, 1, 2, 3, 4, 5],
};

export const BLOCKS_PER_DAY = 4;
export const SETS_PER_BLOCK = 3;

export function buildGymWeek(sessionsPerWeek) {
  const n = Math.max(2, Math.min(6, sessionsPerWeek || 3));
  const slots = SPREAD[n] || SPREAD[3];
  const days = [];
  for (let i = 0; i < n; i++) {
    days.push({
      key: "own-" + (i + 1),
      title: "Your session",
      focus: "Your plan",
      warmup: [],
      exercises: [],
      conditioning: [],
      dayLabel: DAY_LABELS[slots[i]],
    });
  }
  return days;
}

// ---------- Exercise names ----------
// Free text would quietly break progress tracking: liftTrends groups by exact string and
// record_lift_max upserts per name, so "bench", "Bench Press" and "BB bench" become three
// different lifts with one data point each. Autocomplete against the names Vaeon already
// knows keeps the data joined up, while still accepting anything not on the list.

function collectExercises() {
  const seen = {};
  const out = [];
  Object.keys(GOALS).forEach(function (goalId) {
    (GOALS[goalId].days || []).forEach(function (day) {
      (day.exercises || []).forEach(function (ex) {
        const name = (ex.name || "").trim();
        if (!name) return;
        const key = name.toLowerCase();
        if (seen[key]) return;
        seen[key] = name;
        out.push(name);
      });
    });
  });
  return out.sort(function (a, b) { return a.localeCompare(b); });
}

export const ALL_EXERCISES = collectExercises();

const BY_LOWER = {};
ALL_EXERCISES.forEach(function (n) { BY_LOWER[n.toLowerCase()] = n; });

// Matches that start with the query rank above ones that merely contain it, so typing
// "bench" offers "Bench Press" before "Dumbbell Bench Press".
export function suggestExercises(query, limit) {
  const q = (query || "").trim().toLowerCase();
  const max = limit || 6;
  if (q.length < 2) return [];
  const starts = [];
  const contains = [];
  for (let i = 0; i < ALL_EXERCISES.length; i++) {
    const name = ALL_EXERCISES[i];
    const lower = name.toLowerCase();
    if (lower === q) continue;
    if (lower.indexOf(q) === 0) starts.push(name);
    else if (lower.indexOf(q) !== -1) contains.push(name);
    if (starts.length >= max) break;
  }
  return starts.concat(contains).slice(0, max);
}

// Anything typed gets tidied to one canonical form before it is stored, so casing and
// stray spaces do not fragment someone's history.
export function canonicalName(input) {
  const trimmed = (input || "").trim().replace(/\s+/g, " ");
  if (!trimmed) return "";
  const hit = BY_LOWER[trimmed.toLowerCase()];
  return hit || trimmed;
}
