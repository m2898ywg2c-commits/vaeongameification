// The coach's spoken voice. Supabase Edge Function, Deno.
//
// WHAT IT DOES.
//
// Takes one line the coach is about to say and the character saying it, and returns MP3 audio
// of that line spoken in the character's own voice and delivery. The browser plays it. If this
// fails for any reason (no key, the service is down, the phone is offline) the browser falls
// back to its own built-in speech, so the coach is never silent because of this function.
//
// SWITCHED OFF UNTIL A KEY EXISTS.
//
// Needs OPENAI_API_KEY as an Edge Function secret. Without it this returns 503 "no_voice".
// Optional COACH_VOICE_MODEL overrides the model (default gpt-4o-mini-tts).
//
// The user can pick the voice (profiles.coach_voice, sent as `voice`). The delivery always
// comes from the type, so the character survives a change of voice.
//
// WHY THIS MODEL.
//
// gpt-4o-mini-tts takes an `instructions` field describing HOW to speak, not just a voice
// name. That is what makes eight characters out of a handful of base voices: the Monk and the
// Gladiator could share a timbre and still sound like two different people. Roughly $0.015 a
// minute of audio, and coach lines are a few seconds each.
//
// COST CONTROL.
//
// Text is capped at 400 characters (a coach line is under 40 words by design), signed-in
// users only, and the browser caches audio for lines it has already heard, so the fixed chip
// answers and greetings are paid for once per session rather than on every tap.
//
// Nothing is stored. The text goes to OpenAI to be spoken and the audio comes straight back.

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

// Base voice and delivery per character. Kept in step with lib/voice.js and the PERSONA table
// in coach-talk by hand: if a type's register changes there, change it here.
const VOICES: Record<string, { voice: string; how: string }> = {
  architect: { voice: "sage", how: "Precise, calm and measured. Even pace, clear consonants, a dry and quietly confident engineer. No excitement in the voice." },
  captain: { voice: "onyx", how: "A team captain rallying the squad. Firm, warm, upbeat and commanding, projecting slightly as if across a gym floor. Punchy pace." },
  monk: { voice: "ballad", how: "Slow, soft and unhurried, with gentle pauses between phrases. Calm and grounding, like a meditation teacher. Never raise the voice." },
  anchor: { voice: "coral", how: "Warm, friendly and reassuring, like a kind regular at the gym who is pleased to see you. Relaxed, steady pace." },
  hunter: { voice: "ash", how: "Clipped, low and focused. Short, efficient delivery with no warmth wasted, like a tactical briefing. Slightly brisk." },
  gladiator: { voice: "echo", how: "Loud, high-energy and competitive, playful trash talk. Fast, punchy, hyped up like a fight-night announcer." },
  wanderer: { voice: "fable", how: "Laid-back, easy-going and curious. Relaxed pace, a smile in the voice, no pressure at all." },
  spark: { voice: "nova", how: "Bright, bubbly and enthusiastic, bursting with energy. Quick, lively and fun, like a friend hyping you up." },
};

// Voices a user may pick. Must match the check constraint on profiles.coach_voice and
// VOICE_CHOICES in lib/coachtalk.js. Anything else is ignored and the type default is used.
const ALLOWED = ["alloy", "ash", "ballad", "coral", "echo", "fable", "nova", "onyx", "sage", "shimmer", "verse", "marin", "cedar"];

const ACCENT = "Speak with a natural British English accent. Keep it short and conversational; this is played through earphones between sets.";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const auth = req.headers.get("Authorization");
  if (!auth) return json({ error: "Not signed in" }, 401);

  const url = Deno.env.get("SUPABASE_URL")!;
  const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const asCaller = createClient(url, anon, { global: { headers: { Authorization: auth } } });
  const { data: { user }, error: whoErr } = await asCaller.auth.getUser();
  if (whoErr || !user) return json({ error: "Not signed in" }, 401);

  // OPENAI_API_KEY is the intended name. On 2 November the key was saved in the dashboard under
  // the label it was given in OpenAI, "vaeon-coach-voice", and the function sat returning 503
  // with a perfectly good key a line away. Both names are read so that slip cannot recur
  // silently; rename it to OPENAI_API_KEY whenever the key is next rotated.
  const key = Deno.env.get("OPENAI_API_KEY") || Deno.env.get("vaeon-coach-voice");
  if (!key) return json({ error: "no_voice" }, 503);

  let body: any;
  try {
    body = await req.json();
  } catch (_e) {
    return json({ error: "Bad request" }, 400);
  }

  const text = String(body.text || "").replace(/\s+/g, " ").trim().slice(0, 400);
  if (!text) return json({ error: "Empty text" }, 400);
  const v = VOICES[String(body.typeId)] || VOICES.architect;

  try {
    const res = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: Deno.env.get("COACH_VOICE_MODEL") || "gpt-4o-mini-tts",
        voice: ALLOWED.indexOf(String(body.voice)) !== -1 ? String(body.voice) : v.voice,
        input: text,
        instructions: v.how + " " + ACCENT,
        response_format: "mp3",
      }),
    });
    if (!res.ok) {
      console.error("coach-voice error", res.status, await res.text());
      return json({ error: "voice_failed" }, 502);
    }
    return new Response(res.body, {
      status: 200,
      headers: { ...CORS, "Content-Type": "audio/mpeg", "Cache-Control": "no-store" },
    });
  } catch (e) {
    console.error("coach-voice fetch failed", String(e));
    return json({ error: "voice_unreachable" }, 502);
  }
});
