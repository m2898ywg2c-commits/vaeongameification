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
// SPEECH IN AND OUT IS THE BROWSER'S OWN.
//
// SpeechRecognition (webkit-prefixed on Safari) for listening, speechSynthesis for talking,
// with each type's pace and pitch from lib/coachtalk.js. Both are free and on the device or
// the platform's own service. Where recognition is missing the mic button hides and typing
// still works; where synthesis is missing the replies are text. Voice replies can be muted
// and the choice is remembered.
//
// iOS ONLY SPEAKS AFTER A TAP.
//
// Safari refuses speechSynthesis until it has been triggered inside a user gesture. Opening
// the link is that gesture, so it speaks an empty utterance there to unlock the engine, and
// every later reply, even one that arrives after a network wait, is allowed.
//
// THE WORDS ARE NEVER STORED.
//
// The coach_asked event records the mode, the channel (chip, voice, typed), the intent and
// which brain answered. Not the message. That is enough to know whether this feature earns
// its keep without keeping anybody's mid-workout muttering.

const MUTE_KEY = "vaeon-coach-muted";

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

export default function CoachTalk({ typeId, framing, context, mode, variant, accent }) {
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

  const supabaseRef = useRef(null);
  const recRef = useRef(null);
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
    try { recRef.current && recRef.current.abort(); } catch (e) {}
    setListening(false);
    setSpeaking(false);
    return undefined;
  }, [open]);

  function client() {
    if (!supabaseRef.current) supabaseRef.current = createClient();
    return supabaseRef.current;
  }

  function speak(text) {
    if (muted || !text) return;
    try {
      const synth = window.speechSynthesis;
      if (!synth) return;
      synth.cancel();
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
      synth.speak(u);
    } catch (e) {
      setSpeaking(false);
    }
  }

  function say(reply) {
    setMessages(function (list) { return list.concat([Object.assign({ role: "assistant" }, reply)]); });
    speak(reply.text);
  }

  function openLink() {
    setOpen(true);
    // Unlock speech on iOS inside the tap. See the note at the top.
    try {
      if (window.speechSynthesis && !muted) {
        const u = new SpeechSynthesisUtterance(" ");
        u.volume = 0;
        window.speechSynthesis.speak(u);
      }
    } catch (e) {}
    if (!messages.length) {
      const hello = { text: greetingFor(tid, m) };
      setMessages([Object.assign({ role: "assistant" }, hello)]);
      setTimeout(function () { speak(hello.text); }, 120);
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
    if (next) { try { window.speechSynthesis.cancel(); } catch (e) {} setSpeaking(false); }
  }

  const status = listening ? "Listening" : thinking ? "Thinking" : speaking ? "Speaking" : offline ? "Offline brain" : "Online";
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
              <button type="button" onClick={toggleMute} aria-label={muted ? "Turn voice replies on" : "Turn voice replies off"}
                className="flex items-center justify-center rounded-md border" style={{ width: 44, height: 44, borderColor: "var(--brand-line)", color: muted ? "var(--brand-dim)" : ac }}>
                <Icon name={muted ? "mute" : "speaker"} size={20} />
              </button>
              <button type="button" onClick={function () { setOpen(false); }} aria-label="Close the coach link"
                className="flex items-center justify-center rounded-md border" style={{ width: 44, height: 44, borderColor: "var(--brand-line)", color: "var(--brand-muted)" }}>
                <Icon name="close" size={18} />
              </button>
            </div>

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
              Your coach reads your plan, it never changes it. Not medical advice.
            </p>
          </div>
        </div>
      ) : null}
    </>
  );
}
