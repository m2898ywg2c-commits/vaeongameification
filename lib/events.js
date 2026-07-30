// Product instrumentation. Client side only.
//
// The rule this file lives by: instrumentation must never be able to break the thing it
// is measuring. Every function here swallows its own errors and returns undefined. A
// missing events table, an expired session, a blocked storage API and a network failure
// all produce the same outcome, which is that the event is lost and the user notices
// nothing. Losing an event is a bad day for analysis. Throwing inside a log button is a
// bad day for the user, and they are not the same size of problem.
//
// Everything is fire and forget. Nothing here is awaited by a caller that has anything
// better to do, and no UI state should ever depend on a track() resolving.

import { TYPES } from "@/lib/personality";

// The vocabulary. Adding a name here is the whole ceremony for adding an event, because
// events has no CHECK constraint on name (see supabase/events.sql for why). The trade is
// that this list is the only thing standing between the table and a slow drift into
// "log_exercise" and "exercise_logged" being two different events that mean one thing,
// so send names from this object rather than string literals.
export const EVENTS = {
  // Acquisition and setup
  SIGNUP_COMPLETED: "signup_completed",
  ASSESSMENT_STARTED: "assessment_started",
  ASSESSMENT_COMPLETED: "assessment_completed",
  ONBOARDING_COMPLETED: "onboarding_completed",

  // Return. app_opened is the retention event: everything else is downstream of someone
  // deciding to open the thing again.
  APP_OPENED: "app_opened",
  PLAN_VIEWED: "plan_viewed",
  DAY_OPENED: "day_opened",
  PROGRESS_VIEWED: "progress_viewed",
  LEADERBOARD_VIEWED: "leaderboard_viewed",
  TYPE_VIEWED: "type_viewed",

  // The thing the product is for
  EXERCISE_LOGGED: "exercise_logged",
  SESSION_LOGGED: "session_logged",
  DAY_COMPLETED: "day_completed",
  BLOCK_STARTED: "block_started",
  BLOCKEND_VIEWED: "blockend_viewed",

  // Community
  KUDOS_SENT: "kudos_sent",

  // Reminders. The funnel that matters is sent -> opened -> a log the same day.
  REMINDER_ENABLED: "reminder_enabled",
  REMINDER_DISABLED: "reminder_disabled",
  REMINDER_SENT: "reminder_sent",
  REMINDER_OPENED: "reminder_opened",

  // Install
  INSTALL_PROMPTED: "install_prompted",
  INSTALL_ACCEPTED: "install_accepted",
};

const VALID = Object.keys(EVENTS).map(function (k) {
  return EVENTS[k];
});

const IDENTITY_KEY = "vaeon_evt_identity";
const SESSION_KEY = "vaeon_evt_session";
const ONCE_PREFIX = "vaeon_evt_once_";

// Identity is cached for the life of the browser tab. Every navigation in this app is a
// full page load, so without a cache each page would pay two round trips before it could
// record anything, and the first event on every screen would race the page it is meant
// to be measuring. sessionStorage survives a full page load within a tab, which is
// exactly the lifetime we want: it clears when the tab does.
const IDENTITY_TTL_MS = 30 * 60 * 1000;

function storage(kind) {
  // Storage throws rather than returning null in a few real situations: Safari private
  // browsing historically, and any embedded web view with storage disabled. Treat all of
  // them as "no storage" and carry on with no cache.
  try {
    if (typeof window === "undefined") return null;
    return kind === "local" ? window.localStorage : window.sessionStorage;
  } catch (e) {
    return null;
  }
}

function sessionId() {
  const store = storage("session");
  if (!store) return null;
  try {
    let id = store.getItem(SESSION_KEY);
    if (!id) {
      id = Math.random().toString(36).slice(2) + Date.now().toString(36);
      store.setItem(SESSION_KEY, id);
    }
    return id;
  } catch (e) {
    return null;
  }
}

function readIdentity() {
  const store = storage("session");
  if (!store) return null;
  try {
    const raw = store.getItem(IDENTITY_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.at || Date.now() - parsed.at > IDENTITY_TTL_MS) return null;
    return parsed;
  } catch (e) {
    return null;
  }
}

function writeIdentity(identity) {
  const store = storage("session");
  if (!store) return;
  try {
    store.setItem(IDENTITY_KEY, JSON.stringify(Object.assign({}, identity, { at: Date.now() })));
  } catch (e) {
    // Nothing to do. The next event pays for the lookup again, which is survivable.
  }
}

// Called by any screen that has already loaded the profile and type, so the common case
// costs nothing. Cheap to call repeatedly: it only refreshes the timestamp.
export function rememberIdentity(userId, typeId, framing) {
  if (!userId) return;
  writeIdentity({ userId: userId, typeId: typeId || null, framing: framing || null });
}

// Clear on sign out, so a shared device does not attribute one person's events to
// whoever logged in next.
export function forgetIdentity() {
  const store = storage("session");
  if (!store) return;
  try {
    store.removeItem(IDENTITY_KEY);
    store.removeItem(SESSION_KEY);
  } catch (e) {
    // Ignore.
  }
}

async function resolveIdentity(supabase) {
  const cached = readIdentity();
  if (cached) return cached;

  const auth = await supabase.auth.getUser();
  const user = auth && auth.data ? auth.data.user : null;
  if (!user) return null;

  // Type and framing are denormalised onto every event, so they have to be resolved
  // before the first event of the tab. Two queries once per tab is the price. Both are
  // allowed to fail: an event with a null type is still worth more than no event.
  let typeId = null;
  let framing = null;
  try {
    const assess = await supabase
      .from("assessment_results")
      .select("type_id")
      .eq("user_id", user.id)
      .order("completed_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (assess && assess.data) typeId = assess.data.type_id || null;
  } catch (e) {
    // Ignore.
  }
  try {
    const prof = await supabase.from("profiles").select("framing").eq("id", user.id).maybeSingle();
    if (prof && prof.data) framing = prof.data.framing || null;
  } catch (e) {
    // Ignore.
  }

  const identity = { userId: user.id, typeId: typeId, framing: framing };
  writeIdentity(identity);
  return identity;
}

// The main entry point. Deliberately not awaited by callers.
//
// name must come from EVENTS. An unknown name is dropped with a console warning rather
// than written, because a typo that silently lands in the table is worse than a typo that
// shows up the first time anyone runs the screen: the first produces a quiet gap in the
// analysis six weeks later, the second gets fixed in a minute.
export async function track(supabase, name, props) {
  try {
    if (!supabase || !name) return;
    if (VALID.indexOf(name) === -1) {
      if (typeof console !== "undefined" && console.warn) {
        console.warn("[events] unknown event name, not recorded:", name);
      }
      return;
    }

    const identity = await resolveIdentity(supabase);
    if (!identity || !identity.userId) return;

    // The user's own clock hour, not UTC. This is what makes the chronotype question
    // answerable: whether self-reported morning types actually train in the morning.
    const localHour = new Date().getHours();

    await supabase.from("events").insert({
      user_id: identity.userId,
      name: name,
      type_id: identity.typeId,
      framing: identity.framing,
      session_id: sessionId(),
      local_hour: localHour,
      props: props || {},
    });
  } catch (e) {
    // Swallowed on purpose. See the note at the top of this file.
  }
}

// For events that should fire at most once per browser tab, app_opened being the obvious
// one. Without this, a user who bounces between the dashboard and the plan five times
// registers five opens and the retention number quietly inflates.
export async function trackOnce(supabase, name, props) {
  const store = storage("session");
  if (store) {
    try {
      if (store.getItem(ONCE_PREFIX + name)) return;
      store.setItem(ONCE_PREFIX + name, "1");
    } catch (e) {
      // No storage means no deduplication. Better a duplicate event than no event.
    }
  }
  return track(supabase, name, props);
}

// Convenience for the type-shaped analysis, so a caller does not have to import TYPES
// just to attach a readable label to a props payload.
export function typeName(typeId) {
  return TYPES[typeId] ? TYPES[typeId].name : null;
}
