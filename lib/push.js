// Web push subscription, client side.
//
// Everything here degrades to "not supported" rather than throwing, because the set of
// browsers that half-support push is large and irritating: iOS Safari has the APIs but
// refuses to deliver unless the app was installed to the home screen first, some embedded
// web views expose Notification and not PushManager, and private windows vary by vendor.
// A settings screen that crashes on an unusual browser is worse than one that quietly
// offers less.
//
// The public VAPID key is public by design. It is the identifier the push service uses to
// verify the sender, and it is safe in the client bundle. The private half lives only as
// an edge function secret and must never appear in this repository.

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";

export function pushSupported() {
  try {
    return (
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window
    );
  } catch (e) {
    return false;
  }
}

// True when running as an installed PWA rather than a browser tab. On iOS this is the
// difference between push working and push silently never arriving, so the settings UI
// needs to be able to say so rather than letting somebody enable a reminder that cannot
// possibly be delivered.
export function isStandalone() {
  try {
    if (typeof window === "undefined") return false;
    if (window.navigator && window.navigator.standalone) return true;
    return window.matchMedia && window.matchMedia("(display-mode: standalone)").matches;
  } catch (e) {
    return false;
  }
}

export function isApple() {
  try {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  } catch (e) {
    return false;
  }
}

// Push services want the key as a Uint8Array, and VAPID keys are distributed as base64url.
// Neither atob nor the URL-safe alphabet meet in the middle without this.
function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export async function registerWorker() {
  if (!pushSupported()) return null;
  try {
    return await navigator.serviceWorker.register("/sw.js");
  } catch (e) {
    return null;
  }
}

// Asks for permission and subscribes, then stores the endpoint against the user.
//
// Returns { ok: true } or { ok: false, reason }. Reasons are surfaced to the user as
// plain sentences, so they are coarse on purpose: the difference between a rejected
// permission and a blocked one changes what the person has to do next, and nothing else
// does.
export async function enablePush(supabase, userId) {
  if (!pushSupported()) return { ok: false, reason: "unsupported" };
  if (!VAPID_PUBLIC_KEY) return { ok: false, reason: "not_configured" };
  if (isApple() && !isStandalone()) return { ok: false, reason: "ios_needs_install" };

  let permission;
  try {
    permission = await Notification.requestPermission();
  } catch (e) {
    return { ok: false, reason: "unsupported" };
  }
  if (permission !== "granted") return { ok: false, reason: "denied" };

  const reg = await registerWorker();
  if (!reg) return { ok: false, reason: "unsupported" };

  // The worker has to be active before it can hold a subscription, and register()
  // resolves before that on a first install.
  try {
    await navigator.serviceWorker.ready;
  } catch (e) {
    return { ok: false, reason: "unsupported" };
  }

  let sub;
  try {
    sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        // Non-visible push is not permitted by any current browser, and we would not want
        // it anyway: a reminder the user cannot see is a reminder that does nothing.
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
    }
  } catch (e) {
    return { ok: false, reason: "subscribe_failed" };
  }

  const json = sub.toJSON();
  if (!json || !json.keys) return { ok: false, reason: "subscribe_failed" };

  // Upsert on (user_id, endpoint). Re-enabling on a device that already has a
  // subscription must not create a duplicate, or the sender would push twice to one
  // phone.
  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: userId,
      endpoint: json.endpoint,
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 300) : null,
    },
    { onConflict: "user_id,endpoint" }
  );
  if (error) return { ok: false, reason: "save_failed" };

  return { ok: true };
}

// Unsubscribes this device only. Somebody with a phone and a laptop who turns reminders
// off on the laptop has not asked to be left alone by the phone.
export async function disablePush(supabase, userId) {
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = reg ? await reg.pushManager.getSubscription() : null;
    if (sub) {
      const endpoint = sub.endpoint;
      await sub.unsubscribe();
      await supabase.from("push_subscriptions").delete().eq("user_id", userId).eq("endpoint", endpoint);
    }
  } catch (e) {
    // The row may already be gone, or the browser may have dropped the subscription on
    // its own. Either way the user's intent is satisfied.
  }
  return { ok: true };
}

export const PUSH_REASONS = {
  unsupported: "This browser cannot do reminders. Chrome on Android or an installed app on iPhone can.",
  not_configured: "Reminders are not switched on for this build yet.",
  ios_needs_install: "On iPhone, add Vaeon to your home screen first. Notifications only work from the installed app.",
  denied: "Notifications are blocked. You can turn them back on in your browser or phone settings.",
  subscribe_failed: "Could not set up notifications on this device. Try again, or try a different browser.",
  save_failed: "Could not save your reminder. Check your connection and try again.",
};
