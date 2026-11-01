"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import TypeCharacter from "../TypeCharacter";
import Icon from "../Icon";
import { TYPES } from "@/lib/personality";
import { track, EVENTS } from "@/lib/events";
import { TRACK } from "@/lib/brand";
import {
  CHIPS, LOCAL_FIRST, intentOf, localReply, greetingFor, voiceFor, contextForModel,
  VOICE_CHOICES, DEFAULT_VOICE, voiceChoice,
} from "@/lib/coachtalk";

// THE COACH LINK. TALK TO YOUR CHARACTER, IN ITS OWN VOICE, WHILE YOU TRAIN.
//
// Push to talk, not an open microphone. An always-listening mic in a gym hears the music, the
// person next to you and every dropped plate, and if a model is listening too it costs money
// for every second of it. One tap to speak, one reply, done.
//
// HOW A MESSAGE IS ANSWERED.
//
// Chips and anything the local brain recognises (what's next, last time, no gym, pain) are
// answered by lib/coachtalk.js instantly and offline, because those answers either read the
// plan or concern safety. Everything else goes to the coach-talk Edge Function, which puts a
// language model behind the character. If that function has no key, fails or is slow, the
// local brain answers instead and the link says it is running offline. Nothing breaks.
//
// SPEECH IN IS THE BROWSER'S OWN. SPEECH OUT IS THE CHARACTER'S, WITH THE BROWSER AS BACKUP.
//
// SpeechRecognition (webkit-prefixed on Safari) for listening. Replies are spoken in the
// character's own voice by the coach-voice Edge Function (OpenAI gpt-4o-mini-tts, a base voice
// plus delivery instructions per type), and fall back to the browser's speechSynthesis with each
// type's pace and pitch from lib/coachtalk.js whenever that is unavailable. Both are free and on the device or
// the platform's own service. Where recognition is missing the mic button hides and typing
// still works; where synthesis is missing the replies are text. Voice replies can be muted
// and the choice is remembered.
//
// iOS ONLY SPEAKS AFTER A TAP, AND NOT AT ALL WITH THE RING SWITCH ON SILENT.
//
// Safari refuses speechSynthesis until it has been triggered inside a user gesture. Opening
// the link is that gesture, so the greeting is spoken synchronously inside it, which unlocks
// the engine for every later reply. The silent switch is the phone's decision and no web page
// can override it; the sheet says so the first time.
//
// THE WORDS ARE NEVER STORED.
//
// The coach_asked event records the mode, the channel (chip, voice, typed), the intent and
// which brain answered. Not the message. That is enough to know whether this feature earns
// its keep without keeping anybody's mid-workout muttering.

const MUTE_KEY = "vaeon-coach-muted";

// A tenth of a second of silence, played inside the opening tap to unlock the audio element on
// iOS. Safari only lets an element play sound if it has been played inside a user gesture at
// least once; after that, the real line can be dropped into the same element and played even
// though it arrives after a network round trip.
const SILENCE = "data:audio/wav;base64,UklGRkQDAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YSADAACAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgA==";

function recognitionCtor() {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

function pickVoice() {
  try {
    const voices = window.speechSynthesis.getVoices() || [];
    return voices.find(function (v) { return /en-GB/i.test(v.lang); })
      || voices.find(function (v) { return /^en/i.test(v.lang); })
      || null;
  } catch (e) {
    return null;
  }
}

export default function CoachTalk({ typeId, framing, context, mode, variant, accent, voice }) {
  const tid = typeId && TYPES[typeId] ? typeId : "architect";
  const type = TYPES[tid];
  const m = mode === "session" ? "session" : "dashboard";
  const ac = accent || "var(--accent)";

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [thinking, setThinking] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [muted, setMuted] = useState(false);
  const [canListen, setCanListen] = useState(false);
  const [offline, setOffline] = useState(false);
  // The voice the user chose, from profiles.coach_voice, or null for the type's default. The
  // picker opens by itself the first time the link is opened with nothing chosen, which is the
  // "set up" moment: you meet your coach and choose how it sounds in the same breath.
  const [coachVoice, setCoachVoice] = useState(voice || null);
  const [picking, setPicking] = useState(false);
  const [voicesLive, setVoicesLive] = useState(true);

  const supabaseRef = useRef(null);
  const recRef = useRef(null);
  // The character voice. One audio element for the life of the component, unlocked once, plus
  // a cache of lines already spoken so a repeated chip answer is not paid for twice.
  const audioRef = useRef(null);
  const voiceCache = useRef({});
  const voiceOff = useRef(false);
  const playId = useRef(0);
  const scrollRef = useRef(null);
  const ctxRef = useRef(context);
  ctxRef.current = Object.assign({ mode: m }, context || {});

  useEffect(function () {
    setCanListen(Boolean(recognitionCtor()));
    try { setMuted(window.localStorage.getItem(MUTE_KEY) === "1"); } catch (e) {}
    // Voices load asynchronously in Chrome; asking once early means they are ready later.
    try { window.speechSynthesis && window.speechSynthesis.getVoices(); } catch (e) {}
  }, []);

  useEffect(function () {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, thinking, interim]);

  // Close cleanly: stop talking and listening when the sheet goes away or the page unloads.
  useEffect(function () {
    if (open) return undefined;
    try { window.speechSynthesis && window.speechSynthesis.cancel(); } catch (e) {}
    try { audioRef.current && audioRef.current.pause(); } catch (e) {}
    try { recRef.current && recRef.current.abort(); } catch (e) {}
    setListening(false);
    setSpeaking(false);
    return undefined;
  }, [open]);

  function client() {
    if (!supabaseRef.current) supabaseRef.current = createClient();
    return supabaseRef.current;
  }

  // TWO BROWSER QUIRKS HANDLED HERE, BOTH OF WHICH LOOK LIKE "IT JUST DOES NOT TALK".
  // WebKit can drop an utterance queued in the same tick as cancel(), so cancel only when
  // something is actually playing and queue the new line on the next tick. And Chrome can
  // leave the engine paused after a tab has been in the background, so resume() first.
  function speakDevice(text) {
    if (muted || !text) return;
    try {
      const synth = window.speechSynthesis;
      if (!synth) return;
      const busy = synth.speaking || synth.pending;
      if (busy) synth.cancel();
      try { synth.resume(); } catch (e) {}
      const u = new SpeechSynthesisUtterance(text);
      const v = voiceFor(tid);
      u.rate = v.rate;
      u.pitch = v.pitch;
      u.lang = "en-GB";
      const voice = pickVoice();
      if (voice) u.voice = voice;
      u.onstart = function () { setSpeaking(true); };
      u.onend = function () { setSpeaking(false); };
      u.onerror = function () { setSpeaking(false); };
      if (busy) setTimeout(function () { synth.speak(u); }, 60);
      else synth.speak(u);
    } catch (e) {
      setSpeaking(false);
    }
  }

  // THE CHARACTER VOICE, WITH THE PHONE'S OWN VOICE AS THE NET UNDER IT.
  //
  // Asks the coach-voice Edge Function for this line in this character's voice and plays it.
  // Anything going wrong (no key yet, offline, slow, a refused play) falls straight back to the
  // browser's built-in speech for that line. After one 503, which means no key is configured,
  // it stops asking for the rest of the visit rather than paying a round trip on every reply.
  // playId makes a newer line win: if the user taps again before the audio arrives, the older
  // line is dropped rather than playing over the top.
  async function fetchVoice(text) {
    const vid = voiceOverride.current || coachVoice || DEFAULT_VOICE[tid] || "sage";
    voiceOverride.current = null;
    const ck = vid + "|" + text;
    const cached = voiceCache.current[ck];
    if (cached) return cached;
    const { data } = await client().auth.getSession();
    const token = data && data.session ? data.session.access_token : null;
    if (!token) throw new Error("no session");
    const res = await fetch(process.env.NEXT_PUBLIC_SUPABASE_URL + "/functions/v1/coach-voice", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + token,
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text: text, typeId: tid, voice: vid }),
    });
    if (res.status === 503) { voiceOff.current = true; setVoicesLive(false); throw new Error("no voice"); }
    if (!res.ok) throw new Error("voice " + res.status);
    const url = URL.createObjectURL(await res.blob());
    voiceCache.current[ck] = url;
    return url;
  }

  // The sample in the picker has to use the voice just tapped, and state has not updated yet
  // inside the same handler, so the voice is passed through a ref rather than read from state.
  const voiceOverride = useRef(null);
  function speakAs(id, text) {
    voiceOverride.current = id;
    speak(text);
  }

  function speak(text) {
    if (muted || !text) return;
    const audio = audioRef.current;
    if (voiceOff.current || !audio) { speakDevice(text); return; }
    const id = playId.current + 1;
    playId.current = id;
    try { window.speechSynthesis && window.speechSynthesis.cancel(); } catch (e) {}
    try { audio.pause(); } catch (e) {}
    setSpeaking(true);
    const slow = new Promise(function (_r, reject) { setTimeout(function () { reject(new Error("slow")); }, 6000); });
    Promise.race([fetchVoice(text), slow]).then(function (url) {
      if (playId.current !== id) return;
      audio.src = url;
      audio.onended = function () { if (playId.current === id) setSpeaking(false); };
      audio.onerror = function () { if (playId.current === id) { setSpeaking(false); speakDevice(text); } };
      const p = audio.play();
      if (p && typeof p.catch === "function") {
        p.catch(function () { if (playId.current === id) { setSpeaking(false); speakDevice(text); } });
      }
    }).catch(function () {
      if (playId.current !== id) return;
      setSpeaking(false);
      speakDevice(text);
    });
  }

  function say(reply) {
    setMessages(function (list) { return list.concat([Object.assign({ role: "assistant" }, reply)]); });
    speak(reply.text);
  }

  function unlockAudio() {
    // Both sound channels are unlocked here, inside the tap, because iOS will not unlock either
    // later: the audio element for the character voice and the speech engine for the fallback.
    try {
      if (!audioRef.current) audioRef.current = new Audio();
      const a = audioRef.current;
      a.setAttribute("playsinline", "");
      a.src = SILENCE;
      const p = a.play();
      if (p && typeof p.catch === "function") p.catch(function () {});
    } catch (e) {}
    try {
      if (window.speechSynthesis) {
        const u = new SpeechSynthesisUtterance(" ");
        u.volume = 0;
        window.speechSynthesis.speak(u);
      }
    } catch (e) {}
  }

  // Choosing a voice saves it to the profile and plays a sample straight away, so the choice is
  // made by ear rather than by reading a label. The save is fire-and-forget: if it fails the
  // voice still applies for this visit, and the picker will simply offer itself again next time.
  async function chooseVoice(id) {
    setCoachVoice(id);
    voiceOff.current = false;
    unlockAudio();
    const sample = greetingFor(tid, m);
    setTimeout(function () { speakAs(id, sample); }, 120);
    saveVoice(id);
  }

  async function saveVoice(id) {
    try {
      const sb = client();
      const { data } = await sb.auth.getUser();
      if (data && data.user) await sb.from("profiles").update({ coach_voice: id }).eq("id", data.user.id);
    } catch (e) {}
  }

  function openLink() {
    setOpen(true);
    if (!muted) unlockAudio();
    if (!coachVoice && !messages.length) setPicking(true);
    if (!messages.length) {
      const hello = { text: greetingFor(tid, m) };
      setMessages([Object.assign({ role: "assistant" }, hello)]);
      // A beat after the unlock, so the silent clip is not cut off before Safari registers it.
      setTimeout(function () { speak(hello.text); }, 150);
    }
    track(client(), EVENTS.COACH_OPENED, { mode: m });
  }

  async function askModel(text, history) {
    const res = await client().functions.invoke("coach-talk", {
      body: {
        typeId: tid,
        framing: framing || null,
        message: text,
        history: history,
        context: contextForModel(ctxRef.current),
      },
    });
    if (res.error || !res.data || !res.data.reply) throw new Error("no reply");
    return String(res.data.reply);
  }

  async function send(raw, channel, chipIntent) {
    const text = String(raw || "").trim();
    if (!text || thinking) return;
    setInput("");
    setInterim("");
    const history = messages.map(function (x) { return { role: x.role, text: x.text }; });
    setMessages(function (list) { return list.concat([{ role: "user", text: text }]); });

    const intent = chipIntent || intentOf(text);
    let brain = "local";
    if (chipIntent || (intent && LOCAL_FIRST.indexOf(intent) !== -1) || offline) {
      say(localReply(tid, intent, ctxRef.current));
    } else {
      setThinking(true);
      try {
        const reply = await Promise.race([
          askModel(text, history),
          new Promise(function (_r, reject) { setTimeout(function () { reject(new Error("slow")); }, 9000); }),
        ]);
        brain = "model";
        setThinking(false);
        say({ text: reply });
      } catch (e) {
        setThinking(false);
        setOffline(true);
        say(localReply(tid, intent, ctxRef.current));
      }
    }
    track(client(), EVENTS.COACH_ASKED, { mode: m, channel: channel, intent: intent || "chat", brain: brain });
  }

  function toggleListen() {
    if (listening) {
      try { recRef.current && recRef.current.stop(); } catch (e) {}
      return;
    }
    const Ctor = recognitionCtor();
    if (!Ctor) return;
    try { window.speechSynthesis && window.speechSynthesis.cancel(); } catch (e) {}
    try { audioRef.current && audioRef.current.pause(); } catch (e) {}
    playId.current += 1;
    const rec = new Ctor();
    rec.lang = "en-GB";
    rec.interimResults = true;
    rec.continuous = false;
    rec.maxAlternatives = 1;
    let finalText = "";
    rec.onresult = function (ev) {
      let live = "";
      for (let i = ev.resultIndex; i < ev.results.length; i += 1) {
        const r = ev.results[i];
        if (r.isFinal) finalText += r[0].transcript;
        else live += r[0].transcript;
      }
      setInterim(finalText + live);
    };
    rec.onerror = function () { setListening(false); setInterim(""); };
    rec.onend = function () {
      setListening(false);
      if (finalText.trim()) send(finalText, "voice");
      else setInterim("");
    };
    recRef.current = rec;
    try {
      rec.start();
      setListening(true);
    } catch (e) {
      setListening(false);
    }
  }

  function toggleMute() {
    const next = !muted;
    setMuted(next);
    try { window.localStorage.setItem(MUTE_KEY, next ? "1" : "0"); } catch (e) {}
    if (next) {
      try { window.speechSynthesis.cancel(); } catch (e) {}
      try { audioRef.current && audioRef.current.pause(); } catch (e) {}
      playId.current += 1;
      setSpeaking(false);
    } else {
      unlockAudio();
    }
  }

  const status = listening ? "Listening" : thinking ? "Thinking" : speaking ? "Speaking" : offline ? "Offline brain" : muted ? "Voice off" : "Online";
  const name = type ? type.name.replace("The ", "") : "coach";

  const trigger = variant === "compact" ? (
    <button type="button" onClick={openLink} aria-label={"Talk to " + (type ? type.name : "your coach")}
      className="hud-talk flex items-center justify-center gap-1.5 rounded-md border font-display text-base"
      style={{ height: 48, padding: "0 14px", borderColor: ac, color: ac, background: "var(--brand-surface)" }}>
      <Icon name="mic" size={18} /> Talk
    </button>
  ) : (
    <button type="button" onClick={openLink}
      className="hud-talk w-full flex items-center gap-3 rounded-md border px-4 font-display text-base"
      style={{ height: 52, borderColor: "color-mix(in srgb, " + ac + " 55%, transparent)", color: "var(--brand-text)", background: "var(--brand-surface)" }}>
      <span style={{ color: ac, display: "inline-flex" }}><Icon name="mic" size={20} /></span>
      <span className="flex-1 text-left">Talk to the {name}</span>
      <span className="text-[0.6875rem] uppercase" style={{ color: ac, letterSpacing: TRACK.label }}>Coach link</span>
    </button>
  );

  return (
    <>
      {trigger}
      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true" aria-label={"Talking to " + (type ? type.name : "your coach")}>
          <button type="button" aria-label="Close" onClick={function () { setOpen(false); }}
            className="absolute inset-0" style={{ background: "rgba(0,0,0,0.6)" }} />
          <div className="hud-sheet relative w-full max-w-md rounded-t-lg border px-4 pt-4"
            style={{ borderColor: "color-mix(in srgb, " + ac + " 40%, var(--brand-line))", background: "var(--brand-bg)", paddingBottom: "max(16px, env(safe-area-inset-bottom))", "--hud": ac }}>

            <div className="flex items-center gap-3 mb-3">
              <div className={"hud-avatar" + (listening ? " is-listening" : "") + (speaking ? " is-speaking" : "") + (thinking ? " is-thinking" : "")}>
                <TypeCharacter typeId={tid} size={52} variant="face" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-display text-lg leading-tight truncate">{type ? type.name : "Your coach"}</p>
                <p className="text-[0.75rem] uppercase flex items-center gap-1.5" style={{ color: ac, letterSpacing: TRACK.label }}>
                  <span className="hud-dot" aria-hidden="true" />{status}
                </p>
              </div>
              <button type="button" onClick={function () { setPicking(!picking); }} aria-pressed={picking} aria-label="Choose your coach's voice"
                className="flex items-center justify-center rounded-md border px-2 font-display text-sm" style={{ height: 44, borderColor: picking ? ac : "var(--brand-line)", color: ac }}>
                Voice
              </button>
              <button type="button" onClick={toggleMute} aria-label={muted ? "Turn voice replies on" : "Turn voice replies off"}
                className="flex items-center justify-center rounded-md border" style={{ width: 44, height: 44, borderColor: "var(--brand-line)", color: muted ? "var(--brand-dim)" : ac }}>
                <Icon name={muted ? "mute" : "speaker"} size={20} />
              </button>
              <button type="button" onClick={function () { setOpen(false); }} aria-label="Close the coach link"
                className="flex items-center justify-center rounded-md border" style={{ width: 44, height: 44, borderColor: "var(--brand-line)", color: "var(--brand-muted)" }}>
                <Icon name="close" size={18} />
              </button>
            </div>

            {picking ? (
              <div className="mb-3 rounded-md border p-3" style={{ borderColor: "color-mix(in srgb, " + ac + " 40%, var(--brand-line))", background: "var(--brand-surface)" }}>
                <p className="font-display text-base mb-0.5">How should your {name} sound?</p>
                <p className="text-sm mb-2" style={{ color: "var(--brand-muted)" }}>
                  Tap one to hear it. It keeps the {name}&rsquo;s way of talking, only the voice changes.
                </p>
                {!voicesLive ? (
                  <p className="text-sm mb-2" style={{ color: "#FFB020" }}>
                    Character voices are not switched on yet, so this sample uses your phone&rsquo;s voice. Your choice is saved for when they are.
                  </p>
                ) : null}
                <div className="grid grid-cols-2 gap-2 overflow-y-auto pr-1" style={{ maxHeight: "30vh" }}>
                  {VOICE_CHOICES.map(function (v) {
                    const on = (coachVoice || DEFAULT_VOICE[tid]) === v.id;
                    return (
                      <button key={v.id} type="button" onClick={function () { chooseVoice(v.id); }} aria-pressed={on}
                        className="text-left rounded-sm border px-3 py-2"
                        style={{ minHeight: 52, borderColor: on ? ac : "var(--brand-line)", background: on ? "color-mix(in srgb, " + ac + " 12%, transparent)" : "var(--brand-bg)" }}>
                        <span className="block font-display text-base" style={{ color: on ? ac : "var(--brand-text)" }}>
                          {v.label}{DEFAULT_VOICE[tid] === v.id ? " \u00b7 default" : ""}
                        </span>
                        <span className="block text-sm" style={{ color: "var(--brand-muted)" }}>{v.feel}</span>
                      </button>
                    );
                  })}
                </div>
                <button type="button" onClick={function () {
                  // Keeping the default is still a choice, and saving it stops the picker
                  // offering itself on every visit.
                  if (!coachVoice) { const d = DEFAULT_VOICE[tid] || "sage"; setCoachVoice(d); saveVoice(d); }
                  setPicking(false);
                }}
                  className="mt-2 w-full rounded-md font-display text-base" style={{ height: 48, background: ac, color: "var(--on-accent)" }}>
                  {coachVoice ? "Keep " + (voiceChoice(coachVoice) || { label: "this" }).label : "Keep the default"}
                </button>
              </div>
            ) : null}

            <div ref={scrollRef} className="hud-log overflow-y-auto mb-3 pr-1" style={{ maxHeight: "38vh" }} aria-live="polite">
              {messages.map(function (msg, i) {
                const mine = msg.role === "user";
                return (
                  <div key={i} className={"flex mb-2 " + (mine ? "justify-end" : "justify-start")}>
                    <div className={"hud-bubble rounded-md px-3 py-2 text-base leading-snug" + (mine ? " is-mine" : "")}
                      style={mine
                        ? { background: "var(--brand-surface)", border: "1px solid var(--brand-line)", maxWidth: "85%" }
                        : { borderLeft: "2px solid " + (msg.safety ? "#FFB020" : ac), maxWidth: "92%", paddingLeft: 12 }}>
                      {msg.text}
                      {msg.route ? (
                        <a href={msg.route} className="mt-2 flex items-center gap-1.5 font-display text-base" style={{ color: ac }}>
                          {msg.routeLabel || "Go"} <Icon name="arrow" size={16} />
                        </a>
                      ) : null}
                    </div>
                  </div>
                );
              })}
              {listening && interim ? (
                <div className="flex justify-end mb-2">
                  <div className="rounded-md px-3 py-2 text-base" style={{ color: "var(--brand-muted)", border: "1px dashed var(--brand-line-strong)" }}>{interim}</div>
                </div>
              ) : null}
              {thinking ? (
                <div className="flex mb-2"><div className="hud-typing" aria-label="Thinking"><span /><span /><span /></div></div>
              ) : null}
            </div>

            <div className="flex gap-2 overflow-x-auto pb-2 mb-2 pager">
              {CHIPS[m].map(function (chip) {
                return (
                  <button key={chip.id} type="button" onClick={function () { send(chip.label, "chip", chip.id); }}
                    className="flex-shrink-0 rounded-sm border px-3 text-base"
                    style={{ height: 44, borderColor: "color-mix(in srgb, " + ac + " 45%, transparent)", color: "var(--brand-text)", background: "var(--brand-surface)" }}>
                    {chip.label}
                  </button>
                );
              })}
            </div>

            <form className="flex gap-2 items-center" onSubmit={function (e) { e.preventDefault(); send(input, "typed"); }}>
              {canListen ? (
                <button type="button" onClick={toggleListen} aria-pressed={listening}
                  aria-label={listening ? "Stop listening" : "Hold a thought, tap to speak"}
                  className={"hud-mic flex items-center justify-center rounded-md flex-shrink-0" + (listening ? " is-on" : "")}
                  style={{ width: 56, height: 56, background: listening ? ac : "var(--brand-surface)", color: listening ? "var(--on-accent)" : ac, border: "1px solid " + ac }}>
                  <Icon name="mic" size={24} />
                </button>
              ) : null}
              <input value={input} onChange={function (e) { setInput(e.target.value); }}
                placeholder={canListen ? "Tap the mic, or type" : "Ask your coach"}
                className="flex-1 min-w-0 rounded-md border px-3 text-base"
                style={{ height: 56, borderColor: "var(--brand-line)", background: "var(--brand-field)", color: "var(--brand-text)" }}
                enterKeyHint="send" aria-label="Message your coach" />
              <button type="submit" aria-label="Send" disabled={!input.trim()}
                className="flex items-center justify-center rounded-md flex-shrink-0"
                style={{ width: 56, height: 56, background: input.trim() ? ac : "var(--brand-surface)", color: input.trim() ? "var(--on-accent)" : "var(--brand-dim)", border: "1px solid var(--brand-line)" }}>
                <Icon name="send" size={22} />
              </button>
            </form>
            <p className="text-[0.75rem] mt-2 leading-snug" style={{ color: "var(--brand-dim)" }}>
              {muted ? "Voice replies are off. Tap the speaker to hear them. " : "No sound? Check your phone is not on silent. "}
              Your coach reads your plan, it never changes it. Not medical advice.
            </p>
          </div>
        </div>
      ) : null}
    </>
  );
}
