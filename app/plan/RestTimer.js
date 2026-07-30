"use client";

// Rest timer.
//
// The single loudest complaint lifters make about workout apps is timers that die when
// you switch away to change the music, or that reset on a page navigation. This one is
// built so that neither can happen.
//
// The trick is that NOTHING counts down. There is no accumulating tick value anywhere.
// The only state is an end timestamp in localStorage, and the display is derived from
// (end - now) on each animation of the clock. A setInterval that stops firing while the
// tab is backgrounded therefore costs nothing: when the tab wakes, the next tick reads
// the real clock and shows the right number. A phone that sleeps for four minutes comes
// back to a finished timer rather than to four minutes still on the display.
//
// localStorage rather than component state, because every navigation in this app is a
// full page load. State would not survive the walk from the plan screen to anywhere else
// and back, which is exactly what someone does between sets.
//
// The notification at the end goes through the service worker registered for reminders,
// so it arrives even if the phone is locked. Where that is not available, and it will not
// be on an iPhone that has not installed the app, the timer still runs and still shows
// the count on screen. It just cannot tap you on the shoulder.

import { useEffect, useState, useCallback } from "react";
import { registerWorker } from "@/lib/push";

const KEY = "vaeon-rest-until";
const LEN_KEY = "vaeon-rest-length";

const PRESETS = [60, 90, 120, 180];

function readEnd() {
  try {
    const v = Number(window.localStorage.getItem(KEY));
    return isNaN(v) ? 0 : v;
  } catch (e) {
    return 0;
  }
}

export default function RestTimer({ accent }) {
  const [end, setEnd] = useState(0);
  const [now, setNow] = useState(function () { return Date.now(); });
  const [length, setLength] = useState(90);
  const [open, setOpen] = useState(false);

  // Pick up any timer that was already running before this page loaded.
  //
  // Also registers the service worker. Until now that only happened when somebody turned
  // reminders on, which left the rest timer unable to notify anyone who had not. It is
  // idempotent and costs nothing on a repeat visit.
  useEffect(function () {
    registerWorker();
    setEnd(readEnd());
    try {
      const saved = Number(window.localStorage.getItem(LEN_KEY));
      if (!isNaN(saved) && saved > 0) setLength(saved);
    } catch (e) {}
  }, []);

  // One second is plenty and keeps the phone awake less than rAF would. The value it
  // sets is the wall clock, never an increment, so a missed tick cannot drift.
  useEffect(function () {
    const id = setInterval(function () { setNow(Date.now()); }, 500);
    return function () { clearInterval(id); };
  }, []);

  // A backgrounded tab gets its timers throttled or stopped outright. Re-reading on
  // wake means the display is correct the instant somebody looks at it again.
  useEffect(function () {
    function wake() {
      setNow(Date.now());
      setEnd(readEnd());
    }
    document.addEventListener("visibilitychange", wake);
    window.addEventListener("focus", wake);
    return function () {
      document.removeEventListener("visibilitychange", wake);
      window.removeEventListener("focus", wake);
    };
  }, []);

  const remaining = end > now ? Math.ceil((end - now) / 1000) : 0;
  const running = remaining > 0;

  const start = useCallback(function (secs) {
    const until = Date.now() + secs * 1000;
    try {
      window.localStorage.setItem(KEY, String(until));
      window.localStorage.setItem(LEN_KEY, String(secs));
    } catch (e) {}
    setEnd(until);
    setLength(secs);
    setOpen(false);

    // Ask the service worker to fire a notification when the rest is up. Best effort
    // throughout: no permission, no worker, or no support all just mean a silent timer,
    // which is still a working timer.
    try {
      if (typeof Notification !== "undefined" && Notification.permission === "granted" &&
        navigator.serviceWorker && navigator.serviceWorker.ready) {
        navigator.serviceWorker.ready.then(function (reg) {
          if (reg && reg.active) {
            reg.active.postMessage({ type: "rest-timer", at: until, seconds: secs });
          }
        }).catch(function () {});
      }
    } catch (e) {}
  }, []);

  function stop() {
    try { window.localStorage.removeItem(KEY); } catch (e) {}
    setEnd(0);
  }

  const tone = accent || "#22D3EE";
  const mm = Math.floor(remaining / 60);
  const ss = remaining % 60;

  return (
    <div className="mb-3">
      {running ? (
        <div className="flex items-center gap-3 rounded-2xl border-2 p-3" style={{ borderColor: tone, background: tone + "14" }}>
          <span className="text-2xl font-bold tabular-nums" style={{ color: tone }}>
            {mm}:{String(ss).padStart(2, "0")}
          </span>
          <p className="flex-1 text-xs text-gray-300">Resting. Keeps running if you leave the app.</p>
          <button onClick={function () { start(length + 30); }} className="text-xs font-bold px-2 py-2 rounded-lg border border-white/20">
            +30s
          </button>
          <button onClick={stop} className="text-xs font-bold px-2 py-2 rounded-lg border border-white/20">
            Stop
          </button>
        </div>
      ) : (
        <div>
          <div className="flex gap-2">
            <button onClick={function () { start(length); }}
              className="flex-1 py-3 rounded-2xl font-bold text-sm border-2"
              style={{ borderColor: tone + "66", background: "rgba(255,255,255,0.05)", color: tone }}>
              Start {length}s rest
            </button>
            <button onClick={function () { setOpen(!open); }}
              className="px-4 py-3 rounded-2xl font-bold text-sm border-2"
              style={{ borderColor: "rgba(255,255,255,0.15)", color: "#cbd5e1" }}>
              Change
            </button>
          </div>
          {open ? (
            <div className="flex gap-2 mt-2">
              {PRESETS.map(function (p) {
                return (
                  <button key={p} onClick={function () { start(p); }}
                    className="flex-1 py-2 rounded-xl text-xs font-bold border"
                    style={p === length
                      ? { background: tone, color: "#000000", borderColor: tone }
                      : { background: "rgba(255,255,255,0.05)", color: "#cbd5e1", borderColor: "rgba(255,255,255,0.1)" }}>
                    {p < 60 ? p + "s" : (p / 60) + "m"}
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
