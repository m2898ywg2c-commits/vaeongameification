"use client";

// A no-render beacon, for firing one event from a server component.
//
// Almost every screen in this app is a client component and can call track() directly.
// The dashboard is the exception, and it happens to be the most important screen to
// measure, because "did they open it again" is the retention question. Rather than turn
// the dashboard into a client component to record one event, drop this in.
//
// It also carries the identity forward. The dashboard has already loaded the profile and
// the assessment, so passing them here saves every subsequent screen in the tab two
// round trips before it can record anything.

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { track, trackOnce, rememberIdentity } from "@/lib/events";

export default function Track({ name, once, props, userId, typeId, framing }) {
  // props is an object literal at almost every call site, so a new reference arrives on
  // every render. Depending on it directly would refire the event on each one. The
  // identity fields are primitives and safe to depend on, and the event name is fixed
  // per mount in practice, so those are the honest dependencies. props is read through
  // the closure and deliberately left out.
  useEffect(function () {
    if (userId) rememberIdentity(userId, typeId, framing);
    if (!name) return;
    const supabase = createClient();
    if (once) trackOnce(supabase, name, props);
    else track(supabase, name, props);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, once, userId, typeId, framing]);

  return null;
}
