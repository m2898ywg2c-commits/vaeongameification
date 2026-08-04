import { TYPES } from "@/lib/personality";
import { BrandLockup } from "../Brand";
import TypeOrb from "../TypeOrb";
import Icon from "../Icon";
import { BRAND, TRACK } from "@/lib/brand";

export const metadata = {
  title: "Vaeon - training that knows how you need to be coached",
  description:
    "Eight training personalities. A two minute assessment works out yours, then builds a plan from your own tested numbers in six week blocks.",
  openGraph: {
    title: "Vaeon",
    description: "Most plans tell you what to do. This one works out how you need to be told.",
    type: "website",
  },
};

// PARKED, NOT SCRAPPED.
//
// This was briefly the app's front door and was pulled back because it needs more work.
// It lives here so it can be looked at and iterated on without gating anyone: open
// /welcome to see it. Nothing links to it. When it is ready it moves back into
// app/page.js and that file goes back to deciding between dashboard and login.
//
// The signed-in redirect has been removed on purpose, or you could never preview it
// while logged in, which is the only state you are ever in.
//
// The public front door.
//
// WHY IT LIVES IN THE APP RATHER THAN AS A SEPARATE SITE.
//
// A second static site on the apex would mean two deploys, two places for the brand to
// drift, a cross-origin hop to reach signup, and a redirect dance for anyone already
// signed in. This route already existed and already redirected logged-in users to their
// dashboard. It only ever needed to be worth arriving at.
//
// EVERYTHING HERE IS BUILT FROM THE APP'S OWN PIECES.
//
// The eight types, their colours and their taglines come from lib/personality.js, so the
// page cannot describe a product different from the one that ships. The orbs are the same
// component the dashboard uses. Change a tagline in one place and this page changes with
// it, which is the only way a marketing page stays true after six months.

const STEPS = [
  {
    icon: "target",
    title: "Two minutes, once",
    body: "A short assessment works out how you like to be coached. Not what you want to train for, how you want to be spoken to while you do it.",
  },
  {
    icon: "level",
    title: "A plan off your own numbers",
    body: "Week one is a testing week. Everything after that is built from what you actually lifted, not a percentage of somebody else's average.",
  },
  {
    icon: "clock",
    title: "Six week blocks",
    body: "Long enough to change something, short enough to see the end from the start. Then it tests you again and rebuilds.",
  },
  {
    icon: "chart",
    title: "A report that says what moved",
    body: "At the end of every block you get the honest version. What went up, what did not, and what the next six weeks should do about it.",
  },
];

export default function Welcome() {
  const ids = Object.keys(TYPES);

  return (
    <main className="min-h-screen text-brand-text" style={{ background: "var(--brand-bg)" }}>
      <div className="max-w-2xl mx-auto px-6">

        {/* ---------- Hero ---------- */}
        <section className="pt-20 pb-16 text-center">
          <div className="flex justify-center mb-10">
            <BrandLockup size={30} stacked full />
          </div>

          <h1 className="font-display text-3xl sm:text-4xl font-normal leading-tight mb-5">
            Most training plans tell you what to do.
            <br />
            <span style={{ color: BRAND.accent }}>This one works out how you need to be told.</span>
          </h1>

          <p className="text-base leading-relaxed max-w-lg mx-auto mb-10" style={{ color: BRAND.muted }}>
            Two people can want the same result and need completely different coaching to get
            there. One wants the week planned to the hour. One wants a list and to be left
            alone. Vaeon works out which you are, and then behaves like it.
          </p>

          <div className="flex gap-3 justify-center flex-wrap">
            <a href="/signup" className="px-7 py-3.5 rounded-sm font-display text-sm"
              style={{ background: BRAND.accent, color: "var(--brand-bg)" }}>
              Find your type
            </a>
            <a href="/login" className="px-7 py-3.5 rounded-sm font-display text-sm border"
              style={{ borderColor: BRAND.lineStrong }}>
              Log in
            </a>
          </div>
        </section>

        {/* ---------- The eight ---------- */}
        <section className="pb-16">
          <p className="rule-label mb-2">Eight types</p>
          <p className="text-sm leading-relaxed mb-8" style={{ color: BRAND.muted }}>
            Three questions, really. Do you want the week planned or open. Are you chasing an
            outcome or an experience. Do you train better alone or with people watching. That
            makes eight, and yours changes the plan, the leaderboard and the way your coach
            talks to you.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-px rounded-md overflow-hidden border"
            style={{ borderColor: BRAND.line, background: BRAND.line }}>
            {ids.map(function (id) {
              const t = TYPES[id];
              return (
                <div key={id} className="p-5" style={{ background: "var(--brand-bg)" }}>
                  <div className="flex items-center gap-3 mb-2">
                    <TypeOrb typeId={id} size={40} />
                    <div className="min-w-0">
                      <p className="font-display text-sm leading-tight">{t.name}</p>
                      <p className="text-[0.625rem] uppercase leading-tight"
                        style={{ color: t.colors[0], letterSpacing: TRACK.label }}>
                        {t.code}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm leading-relaxed" style={{ color: BRAND.muted }}>{t.tagline}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* ---------- How it works ---------- */}
        <section className="pb-16">
          <p className="rule-label mb-6">How it works</p>
          <div className="space-y-px rounded-md overflow-hidden border"
            style={{ borderColor: BRAND.line, background: BRAND.line }}>
            {STEPS.map(function (s, i) {
              return (
                <div key={s.title} className="flex gap-4 p-5" style={{ background: "var(--brand-bg)" }}>
                  <div className="flex flex-col items-center gap-2 pt-0.5">
                    <span style={{ color: BRAND.accent }}><Icon name={s.icon} size={20} /></span>
                    <span className="font-display text-xs" style={{ color: BRAND.dim }}>{i + 1}</span>
                  </div>
                  <div>
                    <p className="font-display text-base font-normal mb-1">{s.title}</p>
                    <p className="text-sm leading-relaxed" style={{ color: BRAND.muted }}>{s.body}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ---------- Honest about what it is ---------- */}
        {/* Kept deliberately short and deliberately negative in places. An app whose whole
            argument is that it tells you the truth about your block cannot open with a
            page that oversells itself. */}
        <section className="pb-16">
          <div className="rounded-md border p-6" style={{ borderColor: BRAND.line, background: BRAND.surface }}>
            <p className="font-display text-base font-normal mb-4">What it is, plainly</p>
            <ul className="space-y-2.5 text-sm leading-relaxed" style={{ color: BRAND.muted }}>
              <li>A training plan, a way to log what you did, and progression that comes off your own logged sets.</li>
              <li>A leaderboard and kudos if your type is the sort that wants them, and neither if it is not.</li>
              <li>A version of every session for the days you cannot get to a gym.</li>
              <li>Your data, exportable, and an account you can delete in full whenever you like.</li>
            </ul>
            <p className="font-display text-base font-normal mt-6 mb-4">What it is not</p>
            <ul className="space-y-2.5 text-sm leading-relaxed" style={{ color: BRAND.muted }}>
              <li>A nutrition plan, a calorie counter, or a video library you will not watch.</li>
              <li>A substitute for a physio, a doctor, or a coach who can see you move.</li>
            </ul>
          </div>
        </section>

        {/* ---------- Close ---------- */}
        <section className="pb-20 text-center">
          <p className="font-display text-xl font-normal mb-6">
            Two minutes to find out which of the eight you are.
          </p>
          <a href="/signup" className="inline-block px-8 py-4 rounded-sm font-display text-sm"
            style={{ background: BRAND.accent, color: "var(--brand-bg)" }}>
            Start
          </a>
        </section>

        <footer className="pb-14 text-center">
          <p className="text-xs mb-3" style={{ color: BRAND.dim }}>
            Vaeon is built by Unify Partnership.
          </p>
          <a href="/disclaimer" className="text-xs underline" style={{ color: BRAND.dim }}>
            Training and AI disclaimer
          </a>
        </footer>

      </div>
    </main>
  );
}
