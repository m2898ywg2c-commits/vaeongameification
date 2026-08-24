// Reminder sender. Supabase Edge Function, Deno.
//
// DEPLOYED 2026-08-09, version 1, verify_jwt on. Scheduled hourly by pg_cron as
// 'vaeon-reminders'. See supabase/2026-08-09_push_schedule.sql for the job and for why the
// service role key is read from Vault rather than pasted into the schedule.
//
// STILL MANUAL, AND IT HAS TO BE. Three secrets and one environment variable, none of which
// can be set from a migration and none of which should ever pass through this repository:
//
//   Supabase dashboard, Edge Functions -> send-reminders -> Secrets:
//     VAPID_PUBLIC_KEY   the public half
//     VAPID_PRIVATE_KEY  the private half
//     VAPID_SUBJECT      mailto:james@unifypartnership.com
//   Vercel, Project Settings -> Environment Variables:
//     NEXT_PUBLIC_VAPID_PUBLIC_KEY   the same public half, then REDEPLOY. It is baked into
//     the bundle at build time, so setting it without a rebuild changes nothing.
//   SQL editor, once:
//     select vault.create_secret('<service role key>', 'service_role_key');
//
// The public half is meant to be public: it is the identifier the push service uses to verify
// the sender and it is safe in the client bundle. The private half signs the requests.
//
// UNTIL THE VAPID SECRETS EXIST THIS SENDS NOTHING AND SAYS SO. It returns 500 with
// "VAPID keys not configured" rather than half-working, which is the correct failure: loud,
// in the logs, and impossible to mistake for "nobody was due".
//
// Push does not replace the in-app reminder and was never meant to. The dashboard card reads
// the same settings and the same copy, needs no permission and no third party, and reaches
// every user rather than the minority who accept a notification prompt. Push is the same
// message shouted through a smaller door.
//
// KEEP IN SYNC. The REMINDERS and FRAMING_TAIL tables below are a copy of the ones in
// lib/reminders.js. An edge function cannot import from the Next app, so this is
// duplication by necessity rather than choice. Change one, change the other. The same
// trade is already made for KUDOS_NOTES between lib/kudos.js and a CHECK constraint.

import { createClient } from "jsr:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

type Occasion = "lapsed" | "drifting" | "missed" | "short" | "due";

const REMINDERS: Record<string, Record<Occasion, { title: string; body: string }>> = {
  architect: {
    due: { title: "Next line on the sheet", body: "Today's session is written and waiting. You do not need to feel like it, you need to open it." },
    short: { title: "The week is still winnable", body: "A couple of days left and the plan still adds up. Take the next session as written." },
    missed: { title: "One session, back on plan", body: "A gap in the data is not a broken block. Log one session and the numbers stay honest." },
    drifting: { title: "The plan is still here", body: "Three days out is a rounding error over six weeks. Pick up at the next session, not at the beginning." },
    lapsed: { title: "Nothing has been lost", body: "Your baselines are still on file and the block will rebuild around whatever you do next. Start with one session." },
  },
  captain: {
    due: { title: "Front of the queue", body: "Session is ready. Somebody always ends up following how you show up, so give them something." },
    short: { title: "Finish the week properly", body: "You are short of what you promised yourself and there is still time to fix it. Go." },
    missed: { title: "Straight back in", body: "Missing one is nothing. Leaders drop sessions too, they just do not drop two. Take today's." },
    drifting: { title: "Time to lead again", body: "A few days off happens to everyone. Getting back is the bit people actually notice. Do one session." },
    lapsed: { title: "Come back and lead", body: "The board is still there and so is your place on it. One session is all it takes to be back in this." },
  },
  monk: {
    due: { title: "Begin", body: "That is all today asks. Open the session and take the first movement." },
    short: { title: "A quiet week can still finish well", body: "There is time left. One session, unhurried, is enough to keep the rhythm." },
    missed: { title: "Return, that is all", body: "The practice is not the streak. It is coming back. Today is a perfectly good day to." },
    drifting: { title: "The rhythm is still yours", body: "A few days away does not undo anything. Sit down, open the session, begin again." },
    lapsed: { title: "Nothing to make up for", body: "There is no debt to repay here and no catching up to do. There is only the next session, whenever you choose it." },
  },
  anchor: {
    due: { title: "Same as ever", body: "Your session is ready when you are. Turning up is genuinely most of it." },
    short: { title: "Still time this week", body: "You are a bit behind what you set yourself. One session gets you back to steady." },
    missed: { title: "No harm done", body: "Everyone misses one. Come back today and the week still counts as a good one." },
    drifting: { title: "We kept your spot", body: "A few days off is normal life, not a failure. Pick it back up whenever suits." },
    lapsed: { title: "Whenever you are ready", body: "Nothing here expires and nobody is keeping score against you. One session and you are back in the routine." },
  },
  hunter: {
    due: { title: "Target is up", body: "Session is loaded. Go and take it." },
    short: { title: "Short of the number", body: "You are behind what you set. There is still time to close it. Move." },
    missed: { title: "Reset, go again", body: "Missed one. It is gone. The next target is the only one that matters." },
    drifting: { title: "Trail has gone cold", body: "Three days. Pick a session, take it, and it is warm again." },
    lapsed: { title: "Your numbers are still on file", body: "Everything you set is saved and waiting. One session puts you back in the hunt." },
  },
  gladiator: {
    due: { title: "Gate is open", body: "Session is ready. Walk out swinging." },
    short: { title: "Behind on the week", body: "You said more than you have done. Still time to make that right. Get after it." },
    missed: { title: "Round two", body: "Everyone gets caught once. Nobody good gets caught twice. Take today's session." },
    drifting: { title: "Back in the arena", body: "Few days off does not end a campaign. One session and you are back in it." },
    lapsed: { title: "Still your fight", body: "Nothing you built has gone anywhere. Come back, take one session, and start swinging again." },
  },
  wanderer: {
    due: { title: "Go and move", body: "Something is ready for you today. It does not have to be hard, it just has to happen." },
    short: { title: "Room left in the week", body: "You are under what you set yourself. One session, whatever kind you fancy, closes it." },
    missed: { title: "No wrong direction", body: "Missing a day is not going backwards. Move today and you are moving again." },
    drifting: { title: "Been a few days", body: "Nothing lost. Pick whichever session appeals and go and do that one." },
    lapsed: { title: "Whenever you fancy it", body: "This has been waiting patiently and will keep waiting. When you want to move, it is here." },
  },
  spark: {
    due: { title: "Make it a good one", body: "Session is ready. Decent playlist, someone to tell afterwards, done." },
    short: { title: "One more this week", body: "You are a bit under what you said. Grab a mate and knock one out." },
    missed: { title: "No big deal", body: "Missed one, who has not. Today is a much better day for it anyway." },
    drifting: { title: "Come back and enjoy it", body: "Few days off is fine. Pick the most fun session on the list and start there." },
    lapsed: { title: "Still fun in here", body: "Nothing is ruined and nobody minds. Do one session you actually enjoy and you are back." },
  },
};

const FRAMING_TAIL: Record<string, Record<Occasion, string>> = {
  reward: {
    due: "There is a better number in you today.",
    short: "Finish it and the week goes down as a win.",
    missed: "One session and you are back on for a strong week.",
    drifting: "Everything you were chasing is still ahead of you.",
    lapsed: "Every best you have ever set is still there to beat.",
  },
  loss: {
    due: "You have built something worth keeping. Today keeps it.",
    short: "One session protects the week you have already half earned.",
    missed: "One session stops this becoming a pattern.",
    drifting: "Your baselines and your block are all still intact.",
    lapsed: "The work you already did has not gone anywhere.",
  },
};

function copyFor(typeId: string | null, occasion: Occasion, framing: string | null) {
  const set = REMINDERS[typeId || "architect"] || REMINDERS.architect;
  const base = set[occasion] || set.due;
  const tails = framing ? FRAMING_TAIL[framing] : null;
  const tail = tails ? tails[occasion] : null;
  return { title: base.title, body: tail ? base.body + " " + tail : base.body };
}

Deno.serve(async function () {
  const url = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const publicKey = Deno.env.get("VAPID_PUBLIC_KEY");
  const privateKey = Deno.env.get("VAPID_PRIVATE_KEY");
  const subject = Deno.env.get("VAPID_SUBJECT") || "mailto:james@unifypartnership.com";

  if (!publicKey || !privateKey) {
    return new Response(JSON.stringify({ error: "VAPID keys not configured" }), { status: 500 });
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);

  const supabase = createClient(url, serviceKey);

  const { data: due, error } = await supabase.rpc("due_reminders");
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  let sent = 0;
  let failed = 0;

  for (const row of due || []) {
    const { data: subs } = await supabase
      .from("push_subscriptions")
      .select("*")
      .eq("user_id", row.user_id);

    if (!subs || subs.length === 0) continue;

    const copy = copyFor(row.type_id, row.occasion as Occasion, row.framing);
    const payload = JSON.stringify({
      title: copy.title,
      body: copy.body,
      url: "/dashboard?r=1",
      occasion: row.occasion,
    });

    let anyOk = false;

    for (const sub of subs) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        );
        anyOk = true;
        sent++;
        await supabase.from("push_subscriptions")
          .update({ last_ok_at: new Date().toISOString(), last_error: null })
          .eq("id", sub.id);
      } catch (e) {
        failed++;
        const status = (e as { statusCode?: number }).statusCode;
        // 404 and 410 mean the browser has thrown the subscription away for good. Keeping
        // a dead endpoint means retrying it every hour forever, so it goes.
        if (status === 404 || status === 410) {
          await supabase.from("push_subscriptions").delete().eq("id", sub.id);
        } else {
          await supabase.from("push_subscriptions")
            .update({ last_error: String(e).slice(0, 300) })
            .eq("id", sub.id);
        }
      }
    }

    // Marked per user, and only when something actually got through. A total failure
    // should not silence tomorrow's attempt as well.
    if (anyOk) {
      await supabase.rpc("mark_reminded", { p_user: row.user_id });
      // Recorded server side, so reminder_sent exists even though the user was not in the
      // app when it happened. This is the only event not written by lib/events.js, which
      // is why user_id is set explicitly rather than resolved from a session.
      await supabase.from("events").insert({
        user_id: row.user_id,
        name: "reminder_sent",
        type_id: row.type_id,
        framing: row.framing,
        props: { occasion: row.occasion, days_since_log: row.days_since_log },
      });
    }
  }

  return new Response(JSON.stringify({ candidates: (due || []).length, sent, failed }), {
    headers: { "Content-Type": "application/json" },
  });
});
