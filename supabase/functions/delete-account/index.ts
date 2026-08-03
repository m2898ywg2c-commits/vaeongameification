// Account deletion. Supabase Edge Function, Deno.
//
// DEPLOYED. Unlike send-reminders alongside it, this one is live: project
// wctsiafaiogyciqnmvad, verify_jwt on. If you change this file, redeploy it, or the repo
// and the running function drift apart silently.
//
// WHY THIS CANNOT LIVE IN THE APP.
//
// Removing an auth user needs auth.admin.deleteUser(), which needs the service role key.
// That key can read and write every row in the database belonging to anybody, so it can
// never touch the client bundle. Hence a function: the key stays on the server, the browser
// gets to ask and nothing more.
//
// THE ONE RULE THAT MATTERS.
//
// The user id is taken from the caller's own verified JWT and NEVER from the request body.
// If it came from the body, any signed-in user could post somebody else's id and delete
// them. There is deliberately no parameter to get this wrong with.
//
// WHAT ACTUALLY GETS DELETED.
//
// profiles.id references auth.users(id) on delete cascade, and fifteen tables cascade from
// profiles in turn: sessions, exercise logs, lift maxes, achievements, kudos in both
// directions, streak freezes, push subscriptions, assessment results, body metrics, set
// feedback and exercise preferences. One call removes all of it.
//
// Two tables are SET NULL rather than CASCADE, by design: events and feedback. Their rows
// survive with a null user_id, which anonymises them rather than destroying the product
// analytics and the written feedback of everyone who ever leaves. That is a defensible
// reading of erasure, because what remains cannot be tied back to a person.

import { createClient } from "jsr:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const auth = req.headers.get("Authorization");
  if (!auth) return json({ error: "Not signed in" }, 401);

  const url = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // Who is asking, according to their own token rather than their own say-so.
  const asCaller = createClient(url, anon, {
    global: { headers: { Authorization: auth } },
  });
  const { data: { user }, error: whoErr } = await asCaller.auth.getUser();
  if (whoErr || !user) return json({ error: "Not signed in" }, 401);

  const admin = createClient(url, service, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { error: delErr } = await admin.auth.admin.deleteUser(user.id);
  if (delErr) {
    console.error("delete-account failed for", user.id, delErr.message);
    return json({ error: "Could not delete the account. Nothing has been removed." }, 500);
  }

  console.log("account deleted", user.id);
  return json({ ok: true }, 200);
});
