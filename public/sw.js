// Vaeon service worker. Push notifications only.
//
// Deliberately does NOT cache anything. A caching service worker on an app that changes
// several times a week is a way of shipping a fix and having half your users not receive
// it, and this app is not used offline: every screen reads from Supabase, so a cached
// shell would show a logged-out skeleton rather than anything useful. If offline support
// is ever wanted it should be added on purpose, with a versioning strategy, not
// accidentally as a side effect of wanting notifications.
//
// The only reason this file exists is that web push requires a service worker to receive
// the message, even when the page is closed. That is the whole job.
//
// On iOS this file only runs at all if the user has added Vaeon to their home screen.
// Safari does not deliver push to a normal browser tab. That is a platform rule, not
// something the app can work around, and it is why InstallPrompt matters more here than
// it does on a typical web app.

self.addEventListener("install", function (event) {
  // Take over immediately rather than waiting for every existing tab to close. Without
  // this, someone who enables reminders would not actually get a working worker until the
  // next time they fully quit the app, which for an installed PWA can be days.
  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", function (event) {
  // The sender always posts JSON, but a push can arrive empty (some services send a
  // test ping with no payload) and an exception here would mean no notification at all.
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (e) {
    payload = {};
  }

  const title = payload.title || "Vaeon";
  const options = {
    body: payload.body || "Time to train.",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    // Same tag for every reminder, so a second one replaces the first rather than
    // stacking. Nobody wants to unlock their phone to four days of unread nagging, and
    // seeing the pile is itself a reason to give up.
    tag: "vaeon-reminder",
    renotify: false,
    data: { url: payload.url || "/dashboard?r=1", occasion: payload.occasion || null },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Rest timer.
//
// A page can only show a notification while it is open, which is precisely when a rest
// timer does not need one. Handing the end time to the worker means the alert still
// arrives with the phone in a pocket.
//
// setTimeout inside a service worker is not guaranteed: the browser is free to kill an
// idle worker, and several do. That is acceptable here. This is a nice-to-have on top of
// an on-screen timer that is already correct, not the mechanism the timer depends on.
// The alternative, keeping the worker alive with a waitUntil for three minutes, would
// drain battery to guarantee a beep.
self.addEventListener("message", function (event) {
  const data = event.data || {};
  if (data.type !== "rest-timer" || !data.at) return;

  const delay = data.at - Date.now();
  if (delay <= 0 || delay > 15 * 60 * 1000) return;

  setTimeout(function () {
    self.registration.showNotification("Rest over", {
      body: "Next set.",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      // Its own tag, so a rest alert never replaces a training reminder or vice versa.
      tag: "vaeon-rest",
      // Short and sharp. This one is worth a buzz because the person is mid-session and
      // waiting for it, which is the opposite of the daily nudge.
      vibrate: [120, 60, 120],
      data: { url: "/plan" },
    });
  }, delay);
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/dashboard?r=1";

  // Focus an existing window if there is one rather than opening a second copy of the
  // app. The r=1 parameter is what the client reads to record reminder_opened, which is
  // the only way to know whether any of this works.
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (list) {
      for (let i = 0; i < list.length; i++) {
        const client = list[i];
        if ("focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
      return undefined;
    })
  );
});
