"use client";

// The reminder settings card.
//
// Self-contained on purpose. app/settings/page.js is already over five hundred lines and
// holds one big shared save() across body stats, schedule, baselines and equipment;
// threading reminder state through that would make a long file longer and couple two
// things that have no reason to be coupled. This owns its own state and writes its own
// three columns.
//
// The default time comes from chronotype, which the assessment has been collecting since
// it shipped and which has never done anything until now. It is a default and not a rule:
// the one thing worse than no reminder is a reminder at the wrong time every day, so the
// time is editable from the moment it is offered.

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { defaultTimeFor, detectTimezone, formatTime } from "@/lib/reminders";
import { CHRONOTYPE_LABEL } from "@/lib/framing";
import { pushSupported, isApple, isStandalone, enablePush, disablePush, PUSH_REASONS } from "@/lib/push";
import { track, EVENTS } from "@/lib/events";

// Half-hour slots from 05:00 to 21:30. Finer than that is false precision for a habit
// nudge, and a free text time field on a phone is a small misery.
const SLOTS = [];
for (let h = 5; h <= 21; h++) {
  SLOTS.push({ hour: h, minute: 0 });
  SLOTS.push({ hour: h, minute: 30 });
}

export default function ReminderSettings({ profile, accent }) {
  const [supabase] = useState(function () { return createClient(); });
  const [enabled, setEnabled] = useState(Boolean(profile && profile.reminder_enabled));
  const [hour, setHour] = useState(null);
  const [minute, setMinute] = useState(0);
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState(null);
  const [error, setError] = useState(null);

  const chrono = profile ? profile.chronotype : null;

  useEffect(function () {
    if (!profile) return;
    if (profile.reminder_hour != null) {
      setHour(profile.reminder_hour);
      setMinute(profile.reminder_minute || 0);
    } else {
      const d = defaultTimeFor(chrono);
      setHour(d.hour);
      setMinute(d.minute);
    }
  }, [profile, chrono]);

  const tone = accent || "#22D3EE";
  const card = "rounded-2xl border border-white/10 bg-white/5 p-5 mb-4";

  // iPhone in a browser tab is the one case worth calling out before somebody taps.
  // Safari has the APIs and will simply never deliver, so an unexplained silence is the
  // default outcome unless the app has been installed first.
  const needsInstall = isApple() && !isStandalone();

  async function persist(nextEnabled, nextHour, nextMinute) {
    if (!profile) return;
    setSaving(true);
    setError(null);
    setNote(null);

    if (nextEnabled) {
      // Push is best effort. If the browser says no, the reminder still gets saved and
      // still works, because the dashboard nudge reads the same settings and needs no
      // permission from anybody.
      const res = await enablePush(supabase, profile.id);
      if (!res.ok) {
        setNote(PUSH_REASONS[res.reason] || PUSH_REASONS.subscribe_failed);
      }
    } else {
      await disablePush(supabase, profile.id);
    }

    const { error: e } = await supabase.from("profiles").update({
      reminder_enabled: nextEnabled,
      reminder_hour: nextHour,
      reminder_minute: nextMinute,
      reminder_tz: detectTimezone(),
    }).eq("id", profile.id);

    setSaving(false);
    if (e) { setError(e.message); return; }

    setEnabled(nextEnabled);
    track(supabase, nextEnabled ? EVENTS.REMINDER_ENABLED : EVENTS.REMINDER_DISABLED, {
      hour: nextHour, minute: nextMinute, chronotype: chrono,
      // Whether they kept the time chronotype suggested. If almost everyone overrides it,
      // the chronotype question is not earning its place in the assessment.
      default_kept: nextHour === defaultTimeFor(chrono).hour,
      standalone: isStandalone(),
    });
  }

  if (!profile) return null;

  return (
    <div className={card}>
      <p className="text-base font-bold mb-1">Reminders</p>

      <p className="text-sm text-gray-300 mb-4">
        {chrono
          ? "You said you are at your best " + (CHRONOTYPE_LABEL[chrono] || "at any time of day") + ", so this is set just before that window. Change it to whatever actually fits."
          : "Pick a time that fits your week. You will get one nudge a day at most, and none at all in a week where you have already hit your sessions."}
      </p>

      <div className="flex gap-2 mb-4">
        <button
          onClick={function () { persist(true, hour, minute); }}
          disabled={saving}
          className="flex-1 py-4 rounded-full font-bold text-sm border"
          style={enabled
            ? { background: tone, color: "#000000", borderColor: tone }
            : { background: "rgba(255,255,255,0.05)", color: "#cbd5e1", borderColor: "rgba(255,255,255,0.2)" }}>
          {enabled ? "Reminders on" : "Turn on"}
        </button>
        <button
          onClick={function () { persist(false, hour, minute); }}
          disabled={saving || !enabled}
          className="flex-1 py-4 rounded-full font-bold text-sm border"
          style={{ background: "rgba(255,255,255,0.05)", color: "#cbd5e1", borderColor: "rgba(255,255,255,0.2)", opacity: enabled ? 1 : 0.4 }}>
          Turn off
        </button>
      </div>

      <p className="text-xs uppercase tracking-wide text-gray-400 mb-2">Time</p>
      <div className="flex gap-2 overflow-x-auto pb-2 mb-3">
        {SLOTS.map(function (s) {
          const on = s.hour === hour && s.minute === minute;
          return (
            <button key={s.hour + ":" + s.minute}
              onClick={function () {
                setHour(s.hour);
                setMinute(s.minute);
                if (enabled) persist(true, s.hour, s.minute);
              }}
              className="px-3 py-2 rounded-xl text-xs font-bold flex-shrink-0 border"
              style={on
                ? { background: tone, color: "#000000", borderColor: tone }
                : { background: "rgba(255,255,255,0.05)", color: "#cbd5e1", borderColor: "rgba(255,255,255,0.1)" }}>
              {formatTime(s.hour, s.minute)}
            </button>
          );
        })}
      </div>

      {needsInstall ? (
        <p className="text-xs text-gray-400 leading-relaxed mb-2">
          On iPhone, notifications only arrive if Vaeon is added to your home screen. Without that
          you will still get the nudge on your dashboard when you open the app, which is most of the
          value and none of the faff.
        </p>
      ) : null}

      {!pushSupported() ? (
        <p className="text-xs text-gray-400 leading-relaxed mb-2">
          This browser will not send notifications, so your reminder will appear on the dashboard
          when you open Vaeon instead.
        </p>
      ) : null}

      {note ? <p className="text-xs mb-2" style={{ color: "#FFB020" }}>{note}</p> : null}
      {error ? <p className="text-xs mb-2" style={{ color: "#FF6B57" }}>{error}</p> : null}

      <p className="text-[11px] text-gray-500 leading-relaxed">
        One a day at most. Nothing at all once you have hit your sessions for the week.
      </p>
    </div>
  );
}
