import { TYPES } from "@/lib/personality";
import { BrandLockup, VaeonMark } from "./Brand";
import ThemeToggle from "./ThemeToggle";
import TypeCharacter from "./TypeCharacter";
import Icon from "./Icon";
import { BRAND, TRACK } from "@/lib/brand";

// THE PUBLIC FRONT DOOR.
//
// Rendered by app/page.js for anyone not signed in, so the landing page IS vaeonfitness.com
// rather than a second URL one redirect away. /welcome permanently redirects here.
//
// THIS PAGE DELIBERATELY DOES NOT LOOK LIKE THE APP.
//
// The app is Space Grotesk on near-black at 4px radius, because it is a tool used at arm's
// length in bad gym lighting and it should feel machined. This page is the only screen that
// talks to somebody who has never heard of Vaeon, and the same engineered face that makes
// the app feel precise makes the pitch feel cold. So: Carlito, softer radii, motion. All of
// it scoped to .site-soft and the .site-* classes in globals.css so none of it leaks.
//
// The wordmark is the exception and opts back out via .site-wordmark. BrandLockup sets no
// font-family at all, so it inherits whatever it lands in; without that class the logo
// would quietly change typeface on its own front page.
//
// EVERYTHING ELSE IS BUILT FROM THE APP'S OWN PIECES.
//
// The eight types, their colours, taglines and character art come from lib/personality.js
// and public/characters, so the page cannot describe a product different from the one that
// ships. Change a tagline in one place and the marketing changes with it.

// The hero photograph: public/hero.webp, a sled push, supplied by James.
//
// Pre-cropped to 4:5 and centred on the figure, which is the same ratio the panel below
// declares, so background-size: cover crops nothing. 1000x1250 at 37KB, which is small
// because the frame is mostly dark and webp is very good at that.
//
// Swapping it is a file swap and nothing else. A differently shaped image still works:
// cover plus the center 30% position in globals.css keeps a head in frame rather than a
// midriff. And because this is a background-image and not an <img>, a missing or failed
// file degrades to the empty surface panel instead of a broken-image icon.
const HERO_IMAGE = "url('/hero.webp')";

const FACTS = [
  { figure: "8", label: "training personalities" },
  { figure: "2 min", label: "to find out which you are" },
  { figure: "6 weeks", label: "a block, then it retests you" },
  { figure: "0", label: "sessions you cannot do at home" },
];

const STEPS = [
  {
    icon: "target",
    title: "Two minutes, once",
    body:
      "A short assessment works out how you like to be coached. Not what you want to train for, how you want to be spoken to while you do it.",
  },
  {
    icon: "level",
    title: "A plan off your own numbers",
    body:
      "Week one is a testing week. Everything after that is built from what you actually lifted, not a percentage of somebody else's average.",
  },
  {
    icon: "clock",
    title: "Six week blocks",
    body:
      "Long enough to change something, short enough to see the end from the start. Then it tests you again and rebuilds.",
  },
  {
    icon: "chart",
    title: "A report that says what moved",
    body:
      "At the end of every block you get the honest version. What went up, what did not, and what the next six weeks should do about it.",
  },
];

const IS = [
  "A training plan, a way to log what you did, and progression that comes off your own logged sets.",
  "A week of dinners with a shopping list, if you want one. Optional, and off until you ask.",
  "A leaderboard and kudos if your type is the sort that wants them, and neither if it is not.",
  "A version of every session for the days you cannot get to a gym.",
  "Your data, exportable, and an account you can delete in full whenever you like.",
];

// "A nutrition plan" was in this list until meal planning shipped to every account on
// 2026-10-24, at which point the page was advertising the absence of a feature the product
// has. What belongs here is what Vaeon genuinely will not do, and asking you to photograph
// your lunch is still on that list.
const IS_NOT = [
  "A calorie counter. It will not ask you to log what you ate or weigh anything out.",
  "A substitute for a physio, a doctor, or a coach who can see you move.",
  "A subscription that quietly keeps charging you after you stop opening it.",
];

// HOW THE PLAN IS BUILT. Every line here is something the engine actually does, and the
// file it lives in is named so nobody has to take the marketing on trust.
const ENGINE_POINTS = [
  {
    icon: "level",
    title: "It reads your sets, not a template",
    body:
      "Every working weight is a percentage of an estimated max worked out from what you actually lifted, across your last three sessions. Nobody else's averages come into it.",
  },
  {
    icon: "chart",
    title: "It moves with you, both ways",
    body:
      "Finish a block above target and the next one climbs faster. Come in under and it backs off and makes you earn it again. The step shrinks as the bar gets heavier, because a plate is a bigger ask at 150kg than at 60kg.",
  },
  {
    icon: "sliders",
    title: "It works around you",
    body:
      "Mark a movement not for me and it finds a replacement that trains the same thing. No gym today and it rebuilds the session for a front room.",
  },
  {
    icon: "target",
    title: "It talks to you the way you need",
    body:
      "Your type decides the structure, the tone and whether there is a leaderboard at all. The same block is a different app depending which of the eight you are.",
  },
];

const FOOD_POINTS = [
  "A week of dinners, picked for you, that you can change.",
  "A shopping list that scales to however many people you are feeding, sorted the way a supermarket is actually walked.",
  "It learns. Like something and you get more of that sort of thing; not for me and it goes away.",
  "Fourteen UK allergens filtered properly, including the ones recipes forget to mention.",
];

const FOCUS =
  "outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current";

function PrimaryLink({ href, children, pad, className }) {
  // Solid accent, background-coloured type, no gradient. Padding is a prop rather than an
  // override: Tailwind v4 moved the important modifier from a prefix to a suffix, so a v3
  // "!px-4" generates nothing and would silently leave the button full size.
  return (
    <a
      href={href}
      className={
        "btn-soft inline-flex items-center justify-center gap-2 text-sm font-bold transition-transform hover:-translate-y-0.5 " +
        (pad || "px-7 py-3.5") + " " + FOCUS + " " + (className || "")
      }
      style={{ background: BRAND.accent, color: "var(--brand-bg)" }}
    >
      {children}
    </a>
  );
}

function GhostLink({ href, children, className }) {
  return (
    <a
      href={href}
      className={
        "btn-soft btn-ghost inline-flex items-center justify-center text-sm px-7 py-3.5 border " +
        FOCUS + " " + (className || "")
      }
      style={{ borderColor: BRAND.lineStrong, color: "var(--brand-text)" }}
    >
      {children}
    </a>
  );
}

// THE OPENING.
//
// The mark lands, then Vaeon rises a letter at a time, then the card lifts off the hero.
// Entirely CSS: the stagger is an animation-delay per letter and the lift is one keyframe,
// so there is no client component, no timer to drift and no hydration mismatch. The
// reduced-motion opt-out in globals.css removes the card outright rather than racing it.
//
// aria-hidden because it is decoration over content that is already in the DOM, and
// pointer-events are off throughout so it never eats the first tap.
function Opening() {
  const letters = "Vaeon".split("");

  return (
    <div className="site-opening" aria-hidden="true">
      <div className="flex flex-col items-center gap-6">
        <span className="site-opening-mark" style={{ color: BRAND.text }}>
          <VaeonMark size={52} accent={BRAND.text} />
        </span>
        <span
          className="site-wordmark text-5xl sm:text-6xl"
          style={{ color: BRAND.text, lineHeight: 1 }}
        >
          {letters.map(function (ch, i) {
            return (
              <span
                key={i}
                className="site-opening-letter"
                style={{ animationDelay: 430 + i * 85 + "ms" }}
              >
                {ch}
              </span>
            );
          })}
        </span>
      </div>
    </div>
  );
}

function Header() {
  return (
    <header className="site-header sticky top-0 z-30 border-b">
      <div className="max-w-5xl mx-auto px-5 sm:px-8 h-14 flex items-center gap-4">
        <a href="/" className={"site-wordmark shrink-0 " + FOCUS} aria-label="Vaeon home">
          <BrandLockup size={17} />
        </a>

        <nav className="hidden md:flex items-center gap-7 ml-4 text-sm">
          <a href="#how" className={"site-nav-link " + FOCUS}>How it works</a>
          <a href="#engine" className={"site-nav-link " + FOCUS}>How it builds it</a>
          <a href="#types" className={"site-nav-link " + FOCUS}>The eight types</a>
          <a href="#food" className={"site-nav-link " + FOCUS}>Food</a>
        </nav>

        <div className="ml-auto flex items-center gap-2 sm:gap-4">
          <ThemeToggle />
          {/* Hidden below 640px: lockup, toggle, this and the button together overflow a
              320px screen, and Log in is also in the hero and the footer. */}
          <a href="/login" className={"hidden sm:inline text-sm site-nav-link " + FOCUS}>
            Log in
          </a>
          <PrimaryLink href="/signup" pad="px-4 py-2 sm:px-5">
            Find your type
          </PrimaryLink>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="max-w-5xl mx-auto px-5 sm:px-8 pt-16 pb-16 sm:pt-24 sm:pb-24">
      <div className="grid lg:grid-cols-12 gap-10 lg:gap-12 items-center">
        <div className="lg:col-span-7">
          <p className="rule-label rule-label-left mb-7">Eight training personalities</p>

          <h1 className="font-bold leading-[1.06] text-[2.1rem] sm:text-[3rem] lg:text-[3.4rem] mb-7">
            Most training plans tell you what to do.
            <br />
            <span style={{ color: BRAND.accent }}>This one works out how you need to be told.</span>
          </h1>

          <p className="text-base sm:text-lg leading-relaxed max-w-xl mb-9" style={{ color: BRAND.muted }}>
            Two people can want the same result and need completely different coaching to get
            there. One wants the week planned to the hour. One wants a list and to be left
            alone. Vaeon works out which you are, and then behaves like it.
          </p>

          <div className="flex gap-3 flex-wrap mb-9">
            <PrimaryLink href="/signup">
              Find your type
              <span aria-hidden="true" className="inline-flex"><Icon name="arrow" size={15} /></span>
            </PrimaryLink>
            <GhostLink href="/login">Log in</GhostLink>
          </div>

          {/* The eight, as faces, high on the page. They are the most distinctive thing the
              product has and they were buried three sections down. The face variant is a
              head-and-shoulders crop with no size floor, which is why it works at 46px
              where the full figure would collapse into eight identical pale blobs. */}
          <div className="flex items-center gap-2 flex-wrap">
            {Object.keys(TYPES).map(function (id) {
              return <TypeCharacter key={id} typeId={id} size={46} variant="face" />;
            })}
            <span className="text-sm ml-1" style={{ color: BRAND.dim }}>One of these is you.</span>
          </div>
        </div>

        {/* The photograph drains from colour to greyscale once the wordmark has finished
            building. Background-image rather than <img>, so a missing file degrades to an
            empty surface instead of a broken-image icon. backgroundColor rather than the
            background shorthand: the shorthand would reset background-image and the photo
            would never appear at all. */}
        <div className="lg:col-span-5">
          <div
            className="site-hero-media panel-soft border w-full"
            style={{
              "--hero-image": HERO_IMAGE,
              backgroundColor: BRAND.surface,
              borderColor: BRAND.line,
              aspectRatio: "4 / 5",
            }}
            role="img"
            aria-label="An athlete mid sled push on an indoor track"
          />
        </div>
      </div>
    </section>
  );
}

function Facts() {
  return (
    <section className="site-reveal max-w-5xl mx-auto px-5 sm:px-8 pb-20 sm:pb-28">
      <div
        className="grid grid-cols-2 lg:grid-cols-4 gap-px panel-soft overflow-hidden border"
        style={{ borderColor: BRAND.line, background: BRAND.line }}
      >
        {FACTS.map(function (f) {
          return (
            <div key={f.label} className="px-5 py-8" style={{ background: "var(--brand-bg)" }}>
              <p className="font-bold text-3xl sm:text-4xl leading-none mb-2" style={{ color: BRAND.accent }}>
                {f.figure}
              </p>
              <p className="text-sm leading-snug" style={{ color: BRAND.muted }}>{f.label}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function How() {
  return (
    <section id="how" className="site-reveal max-w-5xl mx-auto px-5 sm:px-8 pb-20 sm:pb-28 scroll-mt-20">
      <p className="rule-label rule-label-left mb-3">How it works</p>
      <p className="text-sm sm:text-base leading-relaxed max-w-xl mb-9" style={{ color: BRAND.muted }}>
        Four things happen, in this order, and then it repeats.
      </p>

      <ol
        className="grid grid-cols-1 sm:grid-cols-2 gap-px panel-soft overflow-hidden border"
        style={{ borderColor: BRAND.line, background: BRAND.line }}
      >
        {STEPS.map(function (s, i) {
          return (
            <li key={s.title} className="p-6 sm:p-8" style={{ background: "var(--brand-bg)" }}>
              <div className="flex items-baseline gap-4 mb-4">
                <span className="font-bold text-2xl leading-none" style={{ color: BRAND.dim }}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="shrink-0" style={{ color: BRAND.accent }}>
                  <Icon name={s.icon} size={18} />
                </span>
              </div>
              <p className="font-bold text-lg mb-2 leading-snug">{s.title}</p>
              <p className="text-sm leading-relaxed" style={{ color: BRAND.muted }}>{s.body}</p>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function Eight() {
  const ids = Object.keys(TYPES);

  // The character renders, not the orbs. TypeCharacter falls back to an orb below 60px for
  // the full variant, because under that every one of the eight is the same pale face on a
  // dark body, so the size here is a floor and not a preference.
  return (
    <section id="types" className="site-reveal max-w-5xl mx-auto px-5 sm:px-8 pb-20 sm:pb-28 scroll-mt-20">
      <p className="rule-label rule-label-left mb-3">The eight types</p>
      <p className="text-sm sm:text-base leading-relaxed max-w-2xl mb-9" style={{ color: BRAND.muted }}>
        Three questions, really. Do you want the week planned or open. Are you chasing an
        outcome or an experience. Do you train better alone or with people watching. That
        makes eight, and yours changes the plan, the leaderboard and the way your coach
        talks to you.
      </p>

      <div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px panel-soft overflow-hidden border"
        style={{ borderColor: BRAND.line, background: BRAND.line }}
      >
        {ids.map(function (id) {
          const t = TYPES[id];
          return (
            <div
              key={id}
              className="site-lift p-6 flex flex-col items-center text-center border border-transparent"
              style={{ background: "var(--brand-bg)" }}
            >
              <TypeCharacter typeId={id} size={120} />
              <p className="font-bold text-base leading-tight mt-5 mb-1">{t.name}</p>
              <p
                className="text-[0.625rem] uppercase leading-tight mb-3"
                style={{ color: t.colors[0], letterSpacing: TRACK.label }}
              >
                {t.code}
              </p>
              <p className="text-sm leading-relaxed" style={{ color: BRAND.muted }}>{t.tagline}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Engine() {
  // HOW THE PROGRAMME IS BUILT.
  //
  // The page said "a plan off your own numbers" once, in a four word step, and then moved
  // on. That is the whole product and it was getting a line. This section is the argument.
  //
  // Every claim here is checkable against lib/progression.js, which is deliberate: an app
  // whose pitch is that it tells you the truth cannot describe itself loosely. No claim
  // about understanding you, no claim about anything it does not compute.
  return (
    <section id="engine" className="site-reveal max-w-5xl mx-auto px-5 sm:px-8 pb-20 sm:pb-28 scroll-mt-20">
      <p className="rule-label rule-label-left mb-3">Built, not chosen</p>
      <h2 className="font-bold text-2xl sm:text-3xl leading-tight max-w-2xl mb-4">
        Nobody wrote your programme. It is calculated, every week, from what you lifted.
      </h2>
      <p className="text-sm sm:text-base leading-relaxed max-w-2xl mb-9" style={{ color: BRAND.muted }}>
        A paper plan is a guess made by somebody who has never seen you train. Vaeon does not
        guess. It works out what you can do from your own logged sets and rebuilds the next
        six weeks around the answer, then does it again, and again.
      </p>

      <div
        className="grid grid-cols-1 sm:grid-cols-2 gap-px panel-soft overflow-hidden border"
        style={{ borderColor: BRAND.line, background: BRAND.line }}
      >
        {ENGINE_POINTS.map(function (pt) {
          return (
            <div key={pt.title} className="p-6 sm:p-8" style={{ background: "var(--brand-bg)" }}>
              <span className="inline-flex mb-4" style={{ color: BRAND.accent }}>
                <Icon name={pt.icon} size={20} />
              </span>
              <p className="font-bold text-lg mb-2 leading-snug">{pt.title}</p>
              <p className="text-sm leading-relaxed" style={{ color: BRAND.muted }}>{pt.body}</p>
            </div>
          );
        })}
      </div>

      <p className="text-xs mt-4" style={{ color: BRAND.dim }}>
        The first week of every block is a testing week. That is where the numbers come from,
        and it is why the second week already fits.
      </p>
    </section>
  );
}

function Food() {
  // MEAL PLANNING, SOLD RATHER THAN DISCLAIMED.
  //
  // This was one line in the "what it is not" list saying Vaeon is not a nutrition plan.
  // That stopped being true on 2026-10-24 when meal planning opened to every account.
  //
  // Two things stay honest here. It is OPT IN and says so, because the setup screen now
  // asks before it collects anything. And no calorie promise is made anywhere on this page:
  // the feature plans dinners and writes a shopping list, and an app that hands somebody a
  // daily number is a different and more careful product than this one.
  return (
    <section id="food" className="site-reveal max-w-5xl mx-auto px-5 sm:px-8 pb-20 sm:pb-28 scroll-mt-20">
      <div
        className="panel-soft border overflow-hidden grid md:grid-cols-2"
        style={{ borderColor: BRAND.line, background: BRAND.surface }}
      >
        <div className="p-6 sm:p-10">
          <p className="rule-label rule-label-left mb-3">The food, if you want it</p>
          <h2 className="font-bold text-2xl sm:text-3xl leading-tight mb-4">
            Training is half of it. The other half is what is in the fridge.
          </h2>
          <p className="text-sm sm:text-base leading-relaxed mb-7" style={{ color: BRAND.muted }}>
            Ask for it and Vaeon plans your week of dinners and writes the shopping list to go
            with them. It gets better at it the longer you use it, because it is paying
            attention to what you actually liked.
          </p>

          <ul className="space-y-3.5 text-sm leading-relaxed mb-8" style={{ color: BRAND.muted }}>
            {FOOD_POINTS.map(function (line) {
              return (
                <li key={line} className="flex gap-3">
                  <span className="shrink-0 mt-0.5" style={{ color: BRAND.accent }} aria-hidden="true">
                    <Icon name="basket" size={15} />
                  </span>
                  <span>{line}</span>
                </li>
              );
            })}
          </ul>

          <p className="text-xs" style={{ color: BRAND.dim }}>
            Entirely optional, off until you ask for it, and switchable off again. Meal
            planning is for accounts aged 18 and over; the training side is unaffected.
          </p>
        </div>

        <div className="hidden md:flex items-center justify-center p-10" style={{ background: "var(--brand-bg)" }}>
          <div className="grid grid-cols-2 gap-5">
            {["captain", "monk", "anchor", "spark"].map(function (id) {
              return <TypeCharacter key={id} typeId={id} size={96} />;
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

function Plainly() {
  return (
    <section id="plainly" className="site-reveal max-w-5xl mx-auto px-5 sm:px-8 pb-20 sm:pb-28 scroll-mt-20">
      <p className="rule-label rule-label-left mb-9">What it is, plainly</p>

      <div
        className="grid grid-cols-1 md:grid-cols-2 gap-px panel-soft overflow-hidden border"
        style={{ borderColor: BRAND.line, background: BRAND.line }}
      >
        <div className="p-6 sm:p-8" style={{ background: BRAND.surface }}>
          <p className="font-bold text-base mb-5">What it is</p>
          <ul className="space-y-3.5 text-sm leading-relaxed" style={{ color: BRAND.muted }}>
            {IS.map(function (line) {
              return (
                <li key={line} className="flex gap-3">
                  <span className="shrink-0 mt-0.5" style={{ color: BRAND.accent }} aria-hidden="true">
                    <Icon name="check" size={15} />
                  </span>
                  <span>{line}</span>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="p-6 sm:p-8" style={{ background: BRAND.surface }}>
          <p className="font-bold text-base mb-5">What it is not</p>
          <ul className="space-y-3.5 text-sm leading-relaxed" style={{ color: BRAND.muted }}>
            {IS_NOT.map(function (line) {
              return (
                <li key={line} className="flex gap-3">
                  <span className="shrink-0 mt-0.5" style={{ color: BRAND.dim }} aria-hidden="true">
                    <Icon name="alert" size={15} />
                  </span>
                  <span>{line}</span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}

function Close() {
  return (
    <section className="site-reveal max-w-5xl mx-auto px-5 sm:px-8 pb-20 sm:pb-28">
      <div
        className="panel-soft border px-6 py-14 sm:px-12 sm:py-20 text-center"
        style={{ borderColor: BRAND.lineStrong, background: BRAND.surface }}
      >
        <div className="site-wordmark flex justify-center mb-8">
          <BrandLockup size={26} stacked full />
        </div>
        <p className="font-bold text-xl sm:text-2xl leading-snug max-w-md mx-auto mb-8">
          Two minutes to find out which of the eight you are.
        </p>
        <PrimaryLink href="/signup">
          Start
          <span aria-hidden="true" className="inline-flex"><Icon name="arrow" size={15} /></span>
        </PrimaryLink>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t" style={{ borderColor: BRAND.line }}>
      <div className="max-w-5xl mx-auto px-5 sm:px-8 py-10 flex flex-wrap items-center gap-x-6 gap-y-3 text-xs">
        <a href="/disclaimer" className={"underline underline-offset-2 " + FOCUS} style={{ color: BRAND.dim }}>
          Training and AI disclaimer
        </a>
        <a href="/feedback" className={"underline underline-offset-2 " + FOCUS} style={{ color: BRAND.dim }}>
          Feedback
        </a>
        <a href="/login" className={"underline underline-offset-2 " + FOCUS} style={{ color: BRAND.dim }}>
          Log in
        </a>
      </div>
    </footer>
  );
}

export default function Welcome() {
  return (
    <main
      className="site-soft min-h-screen"
      style={{ background: "var(--brand-bg)", color: "var(--brand-text)" }}
    >
      <Opening />
      <Header />
      <Hero />
      <Facts />
      <How />
      <Engine />
      <Eight />
      <Food />
      <Plainly />
      <Close />
      <Footer />
    </main>
  );
}
