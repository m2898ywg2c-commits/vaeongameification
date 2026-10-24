import { TYPES } from "@/lib/personality";
import { BrandLockup } from "./Brand";
import ThemeToggle from "./ThemeToggle";
import TypeOrb from "./TypeOrb";
import Icon from "./Icon";
import { BRAND, TRACK } from "@/lib/brand";

// THE PUBLIC FRONT DOOR.
//
// Rendered by app/page.js for anyone not signed in, so the landing page IS vaeonfitness.com
// rather than a second URL one redirect away. That matters for two reasons: the canonical
// address a stranger types is the one that sells the product, and there is no hop between
// arriving and reading.
//
// A COMPONENT RATHER THAN A ROUTE, ON PURPOSE.
//
// It was app/welcome/page.js, which made it a second indexable URL carrying the same copy
// as the root. Two addresses for one page is duplicate content, and it meant the root had
// to redirect to reach it. As a component the root renders it directly and /welcome is a
// permanent redirect home, so old links still work and there is one canonical page.
//
// EVERYTHING HERE IS BUILT FROM THE APP'S OWN PIECES.
//
// The eight types, their colours and their taglines come from lib/personality.js, and the
// orbs are the same component the dashboard uses. The page therefore cannot describe a
// product different from the one that ships. Change a tagline in one place and the
// marketing changes with it, which is the only way this stays true after six months.
//
// The brand bar does not render here: "/" is already in HIDE_BAR_ON in app/Brand.js,
// because this page carries its own header and the lockup should not appear twice.

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
  "A leaderboard and kudos if your type is the sort that wants them, and neither if it is not.",
  "A version of every session for the days you cannot get to a gym.",
  "Your data, exportable, and an account you can delete in full whenever you like.",
];

const IS_NOT = [
  "A nutrition plan, a calorie counter, or a video library you will not watch.",
  "A substitute for a physio, a doctor, or a coach who can see you move.",
  "A subscription that quietly keeps charging you after you stop opening it.",
];

// Shared focus treatment. The page is mostly links on a near-black ground, where the
// browser default focus ring is close to invisible, and this is the one page where a
// first-time visitor is most likely to be on a keyboard.
const FOCUS =
  "outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2";

function PrimaryLink({ href, children, pad, className }) {
  // Solid accent with background-coloured type. Deliberately not a gradient and
  // deliberately not a pill: see brandGradient in lib/brand.js and the radius note in
  // app/globals.css.
  return (
    <a
      href={href}
      className={
        "inline-flex items-center justify-center gap-2 font-display text-sm rounded-sm transition-opacity hover:opacity-90 " +
        (pad || "px-7 py-3.5") + " " +
        FOCUS +
        " focus-visible:outline-current " +
        (className || "")
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
        "inline-flex items-center justify-center font-display text-sm px-7 py-3.5 rounded-sm border transition-colors " +
        FOCUS +
        " focus-visible:outline-current " +
        (className || "")
      }
      style={{ borderColor: BRAND.lineStrong, color: "var(--brand-text)" }}
    >
      {children}
    </a>
  );
}

function Header() {
  return (
    <header className="site-header sticky top-0 z-30 border-b">
      <div className="max-w-5xl mx-auto px-5 sm:px-8 h-14 flex items-center gap-4">
        <a href="/" className={"shrink-0 " + FOCUS + " focus-visible:outline-current"} aria-label="Vaeon home">
          <BrandLockup size={17} />
        </a>

        <nav className="hidden md:flex items-center gap-7 ml-4 text-sm">
          <a href="#how" className={"site-nav-link " + FOCUS + " focus-visible:outline-current"}>
            How it works
          </a>
          <a href="#types" className={"site-nav-link " + FOCUS + " focus-visible:outline-current"}>
            The eight types
          </a>
          <a href="#plainly" className={"site-nav-link " + FOCUS + " focus-visible:outline-current"}>
            What it is
          </a>
        </nav>

        <div className="ml-auto flex items-center gap-2 sm:gap-4">
          <ThemeToggle />
          <a
            href="/login"
            className={"hidden sm:inline text-sm site-nav-link " + FOCUS + " focus-visible:outline-current"}
          >
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
    <section className="max-w-5xl mx-auto px-5 sm:px-8 pt-20 pb-16 sm:pt-28 sm:pb-24">
      <div className="max-w-3xl">
        <p className="rule-label rule-label-left mb-7">Eight training personalities</p>

        <h1 className="font-display font-normal leading-[1.08] text-[2.1rem] sm:text-[3.1rem] lg:text-[3.6rem] mb-7">
          Most training plans tell you what to do.
          <br />
          <span style={{ color: BRAND.accent }}>This one works out how you need to be told.</span>
        </h1>

        <p className="text-base sm:text-lg leading-relaxed max-w-xl mb-10" style={{ color: BRAND.muted }}>
          Two people can want the same result and need completely different coaching to get
          there. One wants the week planned to the hour. One wants a list and to be left
          alone. Vaeon works out which you are, and then behaves like it.
        </p>

        <div className="flex gap-3 flex-wrap">
          <PrimaryLink href="/signup">
            Find your type
            <span aria-hidden="true" className="inline-flex">
              <Icon name="arrow" size={15} />
            </span>
          </PrimaryLink>
          <GhostLink href="/login">Log in</GhostLink>
        </div>
      </div>
    </section>
  );
}

function Facts() {
  // A hairline grid rather than four cards. The 1px gap over a line-coloured background
  // is the same device the type grid and the steps use, so the page has one rule for how
  // things are divided instead of three.
  return (
    <section className="max-w-5xl mx-auto px-5 sm:px-8 pb-20 sm:pb-28">
      <div
        className="grid grid-cols-2 lg:grid-cols-4 gap-px rounded-md overflow-hidden border"
        style={{ borderColor: BRAND.line, background: BRAND.line }}
      >
        {FACTS.map(function (f) {
          return (
            <div key={f.label} className="px-5 py-7" style={{ background: "var(--brand-bg)" }}>
              <p className="font-display text-3xl sm:text-4xl leading-none mb-2">{f.figure}</p>
              <p className="text-sm leading-snug" style={{ color: BRAND.muted }}>
                {f.label}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function How() {
  return (
    <section id="how" className="max-w-5xl mx-auto px-5 sm:px-8 pb-20 sm:pb-28 scroll-mt-20">
      <p className="rule-label rule-label-left mb-3">How it works</p>
      <p className="text-sm sm:text-base leading-relaxed max-w-xl mb-9" style={{ color: BRAND.muted }}>
        Four things happen, in this order, and then it repeats.
      </p>

      <ol
        className="grid grid-cols-1 sm:grid-cols-2 gap-px rounded-md overflow-hidden border"
        style={{ borderColor: BRAND.line, background: BRAND.line }}
      >
        {STEPS.map(function (s, i) {
          return (
            <li key={s.title} className="p-6 sm:p-8" style={{ background: "var(--brand-bg)" }}>
              <div className="flex items-baseline gap-4 mb-4">
                <span className="font-display text-2xl leading-none" style={{ color: BRAND.dim }}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="shrink-0" style={{ color: BRAND.accent }}>
                  <Icon name={s.icon} size={18} />
                </span>
              </div>
              <p className="font-display text-lg font-normal mb-2 leading-snug">{s.title}</p>
              <p className="text-sm leading-relaxed" style={{ color: BRAND.muted }}>
                {s.body}
              </p>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function Eight() {
  const ids = Object.keys(TYPES);

  return (
    <section id="types" className="max-w-5xl mx-auto px-5 sm:px-8 pb-20 sm:pb-28 scroll-mt-20">
      <p className="rule-label rule-label-left mb-3">The eight types</p>
      <p className="text-sm sm:text-base leading-relaxed max-w-2xl mb-9" style={{ color: BRAND.muted }}>
        Three questions, really. Do you want the week planned or open. Are you chasing an
        outcome or an experience. Do you train better alone or with people watching. That
        makes eight, and yours changes the plan, the leaderboard and the way your coach
        talks to you.
      </p>

      <div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px rounded-md overflow-hidden border"
        style={{ borderColor: BRAND.line, background: BRAND.line }}
      >
        {ids.map(function (id) {
          const t = TYPES[id];
          return (
            <div key={id} className="p-6" style={{ background: "var(--brand-bg)" }}>
              <TypeOrb typeId={id} size={44} />
              <p className="font-display text-base leading-tight mt-4 mb-1">{t.name}</p>
              <p
                className="text-[0.625rem] uppercase leading-tight mb-3"
                style={{ color: t.colors[0], letterSpacing: TRACK.label }}
              >
                {t.code}
              </p>
              <p className="text-sm leading-relaxed" style={{ color: BRAND.muted }}>
                {t.tagline}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Plainly() {
  // Deliberately short and deliberately negative in places. An app whose whole argument is
  // that it tells you the truth about your block cannot open with a page that oversells.
  return (
    <section id="plainly" className="max-w-5xl mx-auto px-5 sm:px-8 pb-20 sm:pb-28 scroll-mt-20">
      <p className="rule-label rule-label-left mb-9">What it is, plainly</p>

      <div
        className="grid grid-cols-1 md:grid-cols-2 gap-px rounded-md overflow-hidden border"
        style={{ borderColor: BRAND.line, background: BRAND.line }}
      >
        <div className="p-6 sm:p-8" style={{ background: BRAND.surface }}>
          <p className="font-display text-base font-normal mb-5">What it is</p>
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
          <p className="font-display text-base font-normal mb-5">What it is not</p>
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
    <section className="max-w-5xl mx-auto px-5 sm:px-8 pb-20 sm:pb-28">
      <div
        className="rounded-md border px-6 py-14 sm:px-12 sm:py-20 text-center"
        style={{ borderColor: BRAND.lineStrong, background: BRAND.surface }}
      >
        <div className="flex justify-center mb-8">
          <BrandLockup size={26} stacked full />
        </div>
        <p className="font-display text-xl sm:text-2xl font-normal leading-snug max-w-md mx-auto mb-8">
          Two minutes to find out which of the eight you are.
        </p>
        <PrimaryLink href="/signup">
          Start
          <span aria-hidden="true" className="inline-flex">
            <Icon name="arrow" size={15} />
          </span>
        </PrimaryLink>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t" style={{ borderColor: BRAND.line }}>
      <div className="max-w-5xl mx-auto px-5 sm:px-8 py-10 flex flex-col sm:flex-row sm:items-center gap-5">
        <p className="text-xs" style={{ color: BRAND.dim }}>
          Vaeon is built by Unify Partnership.
        </p>
        <nav className="sm:ml-auto flex flex-wrap items-center gap-x-6 gap-y-2 text-xs">
          <a
            href="/disclaimer"
            className={"underline underline-offset-2 " + FOCUS + " focus-visible:outline-current"}
            style={{ color: BRAND.dim }}
          >
            Training and AI disclaimer
          </a>
          <a
            href="/feedback"
            className={"underline underline-offset-2 " + FOCUS + " focus-visible:outline-current"}
            style={{ color: BRAND.dim }}
          >
            Feedback
          </a>
          <a
            href="/login"
            className={"underline underline-offset-2 " + FOCUS + " focus-visible:outline-current"}
            style={{ color: BRAND.dim }}
          >
            Log in
          </a>
        </nav>
      </div>
    </footer>
  );
}

export default function Welcome() {
  return (
    <main className="min-h-screen" style={{ background: "var(--brand-bg)", color: "var(--brand-text)" }}>
      <Header />
      <Hero />
      <Facts />
      <How />
      <Eight />
      <Plainly />
      <Close />
      <Footer />
    </main>
  );
}
