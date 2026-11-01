// The coach link's language model. Supabase Edge Function, Deno.
//
// WHAT IT DOES.
//
// Takes one thing the user said, the character they are, and a small JSON summary of where
// they are in their training, and returns one short reply in that character's voice. The
// browser speaks it. Nothing is stored: no transcript table, no logging of the message text.
// The only record is the coach_asked event the browser writes, which carries the channel
// and never the words.
//
// SWITCHED OFF UNTIL A KEY EXISTS.
//
// Without ANTHROPIC_API_KEY set as a function secret this returns 503 "no_model", and the
// app falls back to lib/coachtalk.js, which answers every chip and most questions on its own.
// So deploying this costs nothing until James decides it should. To switch it on:
//
//   Supabase dashboard > Edge Functions > Secrets > add ANTHROPIC_API_KEY
//   Optional: COACH_MODEL to override the model (default below).
//
// THE RULES IN THE PROMPT ARE THE PRODUCT, NOT POLITENESS.
//
// - It never invents a weight, rep or distance. It may only repeat numbers in the context.
//   The progression engine decides; the coach reports.
// - Pain means stop and see someone qualified. No diagnosis, no "push through it".
// - Short. These are spoken between sets, by someone out of breath, through earphones.
//
// COST CONTROL.
//
// One reply is capped at 180 output tokens, the message at 600 characters and the history at
// eight turns. Push-to-talk on the client means nothing is sent unless the user asks.

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

// The eight voices. Kept in step with lib/voice.js and lib/personality.js by hand: if a
// type's register changes there, change it here.
const PERSONA: Record<string, string> = {
  architect: "You are The Architect: planned, outcome-driven, solo. Precise, calm, data-led. You explain the why in one clause and hold people to the plan they agreed. Dry, never gushing.",
  captain: "You are The Captain: planned, outcome-driven, social. You lead from the front, set visible standards and celebrate loudly. Rallying, direct, a little competitive.",
  monk: "You are The Monk: planned, experience-led, solo. Quiet, unhurried, reflective. You protect the ritual and ask how things felt. You never shout and never use exclamation marks.",
  anchor: "You are The Anchor: planned, experience-led, social. Warm, steady and reassuring. Turning up is the win. You speak like a kind regular at the gym.",
  hunter: "You are The Hunter: freestyle, outcome-driven, solo. Clipped and focused. Targets, not feelings. Very few words.",
  gladiator: "You are The Gladiator: freestyle, outcome-driven, social. Loud, competitive, playful trash talk. Short bursts of energy.",
  wanderer: "You are The Wanderer: freestyle, experience-led, solo. Relaxed, curious, low pressure. Any movement counts. Easy-going and friendly.",
  spark: "You are The Spark: freestyle, experience-led, social. Bright, fun, enthusiastic. You love company and noise. Upbeat, never preachy.",
};

const RULES = [
  "You are a coaching character inside Vaeon, a training app. The user is mid-workout or about to train, talking to you through their phone.",
  "Reply in at most two short sentences, under 40 words. It will be read aloud, so no lists, no markdown, no emoji.",
  "British English. Never use em dashes.",
  "NEVER state a weight, rep count, distance or time unless it appears in the CONTEXT JSON. Never suggest increasing or decreasing a load. If asked what weight to use, say the number on their exercise card is the one the plan set for them.",
  "If they mention pain, injury, dizziness or chest symptoms: tell them to stop that exercise and speak to someone qualified. Do not diagnose or suggest pushing through.",
  "No medical, nutritional or supplement advice. You count sessions and encourage; you do not prescribe.",
  "If you do not know something from the context, say so briefly and point them at the screen that would show it.",
  "Stay in character, but be useful first.",
].join("\n");

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const auth = req.headers.get("Authorization");
  if (!auth) return json({ error: "Not signed in" }, 401);

  // Signed-in users only. The JWT is verified by the platform as well (verify_jwt on), but
  // checking the user here means an anonymous key alone cannot spend model credit.
  const url = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const asCaller = createClient(url, anon, { global: { headers: { Authorization: auth } } });
  const { data: { user }, error: whoErr } = await asCaller.auth.getUser();
  if (whoErr || !user) return json({ error: "Not signed in" }, 401);

  const key = Deno.env.get("ANTHROPIC_API_KEY");
  if (!key) return json({ error: "no_model" }, 503);

  let body: any;
  try {
    body = await req.json();
  } catch (_e) {
    return json({ error: "Bad request" }, 400);
  }

  const typeId = typeof body.typeId === "string" && PERSONA[body.typeId] ? body.typeId : "architect";
  const framing = body.framing === "reward" || body.framing === "loss" ? body.framing : null;
  const message = String(body.message || "").slice(0, 600).trim();
  if (!message) return json({ error: "Empty message" }, 400);

  const context = body.context && typeof body.context === "object" ? body.context : {};
  const history = Array.isArray(body.history) ? body.history.slice(-8) : [];

  const framingLine = framing === "reward"
    ? "This person is motivated more by chasing new bests than protecting what they have."
    : framing === "loss"
      ? "This person is motivated more by protecting what they have built, like a streak, than by chasing new bests."
      : "";

  const system = [PERSONA[typeId], framingLine, RULES, "CONTEXT JSON:\n" + JSON.stringify(context).slice(0, 4000)]
    .filter(Boolean).join("\n\n");

  const messages = history
    .filter(function (m: any) { return m && (m.role === "user" || m.role === "assistant") && typeof m.text === "string"; })
    .map(function (m: any) { return { role: m.role, content: m.text.slice(0, 600) }; });
  // The API wants alternating turns starting with the user. Drop a leading assistant turn
  // (the greeting) and anything that would put two of the same role together.
  const clean: { role: string; content: string }[] = [];
  messages.forEach(function (m: { role: string; content: string }) {
    if (!clean.length && m.role !== "user") return;
    if (clean.length && clean[clean.length - 1].role === m.role) return;
    clean.push(m);
  });
  if (clean.length && clean[clean.length - 1].role === "user") clean.pop();
  clean.push({ role: "user", content: message });

  const model = Deno.env.get("COACH_MODEL") || "claude-haiku-5-5";

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({ model, max_tokens: 180, system, messages: clean }),
    });
    if (!res.ok) {
      console.error("coach-talk model error", res.status, await res.text());
      return json({ error: "model_failed" }, 502);
    }
    const out = await res.json();
    const text = (out.content || [])
      .filter(function (b: any) { return b.type === "text"; })
      .map(function (b: any) { return b.text; })
      .join(" ")
      .replace(/\u2014/g, ",")
      .trim();
    if (!text) return json({ error: "model_empty" }, 502);
    return json({ reply: text }, 200);
  } catch (e) {
    console.error("coach-talk fetch failed", String(e));
    return json({ error: "model_unreachable" }, 502);
  }
});
