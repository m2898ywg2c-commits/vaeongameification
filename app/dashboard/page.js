import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TYPES } from "@/lib/personality";
import { computeStats, coachMessage } from "@/lib/plan";
import { goalNames, primaryCategory } from "@/lib/training";
import { weeksFor } from "@/lib/progression";
import { isGymReady, blockWeeksFor, currentWeekIn, blockCompleteIn } from "@/lib/gymready";
import SignOutButton from "./SignOutButton";
import AchievementWatcher from "./AchievementWatcher";
import KudosCard from "./KudosCard";
import TypeOrb from "../TypeOrb";
import TypeCharacter from "../TypeCharacter";
import ShareButton from "../ShareButton";
import Track from "../Track";
import ChallengeCard from "./ChallengeCard";
import ToDo from "./ToDo";
import Icon from "../Icon";
import { BRAND, TRACK } from "@/lib/brand";
import { EVENTS } from "@/lib/events";
import { occasionFor } from "@/lib/reminders";
import { cookies } from "next/headers";
import { THEME_COOKIE, SCHEME_COOKIE, resolveScheme, accentFor, deepFor } from "@/lib/theme";
import { startOfWeek as weekStart } from "@/lib/week";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// One definition, in lib/week.js. See the note there for why this is not open-coded.
function startOfWeek() {
return weekStart(new Date()).toISOString();
}

export default async function DashboardPage({ searchParams }) {
// searchParams is a promise in this version of Next. The service worker sends people
// here with ?r=1 so that a push that gets tapped can be told apart from a normal open,
// which is the only way to know whether reminders do anything.
const sp = await searchParams;
const fromReminder = Boolean(sp && sp.r === "1");

// Which half of each type's colour pair to use. Every colors[0] fails contrast on a light
// background, between 1.8:1 and 3.6:1, and every colors[1] passes. Resolved here rather
// than in the browser because this component picks the colour during render.
const jar = await cookies();
// MUST match the default in app/layout.js. It did not, and the symptom was a Hunter
// whose dashboard rendered in dark brown while every other screen showed bright orange:
// the server resolved "light" from a stale device cookie and handed this page colors[1],
// the half of the pair meant for a white background, while the inline script painted the
// page dark. The CSS variables below make that disagreement impossible from now on.
const scheme = resolveScheme(jar.get(THEME_COOKIE)?.value || "dark", jar.get(SCHEME_COOKIE)?.value || "dark");

const supabase = await createClient();
const { data: { user } } = await supabase.auth.getUser();
if (!user) redirect("/login");

const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
if (!profile || !profile.goals || profile.goals.length === 0) redirect("/onboarding");

const { data: assessment } = await supabase.from("assessment_results").select("*")
.eq("user_id", user.id).order("completed_at", { ascending: false }).limit(1).maybeSingle();

const { data: sessions } = await supabase.from("training_sessions").select("*")
.eq("user_id", user.id).order("logged_at", { ascending: false }).limit(300);

// Spend a grace week if a completed week fell short, before the streak is calculated.
// Idempotent and safe to call on every load, and it only ever touches the caller's own
// rows. See supabase/streak_freeze.sql. Allowed to fail: if the migration is not applied
// the streak simply behaves as it always has.
let freezeCredits = 0;
let frozenWeeks = [];
try {
const settled = await supabase.rpc("settle_streak_freezes");
freezeCredits = typeof settled.data === "number" ? settled.data : 0;
const { data: fz } = await supabase.from("streak_freezes").select("week_start").eq("user_id", user.id);
frozenWeeks = (fz || []).map(function (r) { return r.week_start; });
} catch (ignored) {}

// Most recent exercise log, for the reminder. Sessions alone are not enough to judge
// staleness: someone who logs every exercise in the plan but never taps Finish has no
// training_sessions row at all, and would be told they had lapsed while training. The
// mirror of this decision lives in due_reminders() in supabase/reminders.sql.
const { data: lastLog } = await supabase.from("exercise_logs").select("logged_at")
.eq("user_id", user.id).order("logged_at", { ascending: false }).limit(1).maybeSingle();

// Have they logged body stats this week?
const { data: thisWeekMetrics } = await supabase.from("body_metrics").select("id")
.eq("user_id", user.id).gte("logged_at", startOfWeek()).limit(1).maybeSingle();

// Kudos sent TO me. RLS on the kudos table is outgoing-only, so this comes from a
// security definer function rather than a direct select. Anything cleared is already
// filtered out inside the function.
const { data: kudosIn } = await supabase.rpc("get_my_kudos");
const myKudos = kudosIn || [];

// The live group challenge, if there is one. Returns no rows when nothing is running,
// and the card renders nothing, so a quiet week costs an empty query and no layout.
let challenge = null;
try {
const { data: ch } = await supabase.rpc("current_challenge");
challenge = ch && ch.length ? ch[0] : null;
} catch (ignored) {}

const pledged = profile.sessions_per_week || 3;
const typeId = assessment ? assessment.type_id : null;
const type = typeId ? TYPES[typeId] : null;
const stats = computeStats(sessions || [], pledged, frozenWeeks);
const nudge = type ? coachMessage(typeId, stats, profile.framing) : null;
const gym = isGymReady(profile.goals);
const names = goalNames(profile.goals);
const category = primaryCategory(profile.goals);
const blockWeeks = blockWeeksFor(profile);
const weekNo = currentWeekIn(profile.block_start, blockWeeks);
const rule = weeksFor(category)[weekNo - 1] || weeksFor(category)[0];
const finished = blockCompleteIn(profile.block_start, blockWeeks);
const today = DAYS[new Date().getDay()];
// THE ACCENT, EMITTED AS LITERAL HEX IN A SCOPED STYLE TAG.
//
// This is the third attempt and the first one that cannot fail, so it is worth saying why
// the other two did.
//
// One: the server resolved the scheme from a cookie and picked the colour itself. The
// cookie went stale, the server chose the light-mode colour, and the inline script painted
// the page dark. Dark brown on black.
//
// Two: the pair went into CSS variables and a :root rule picked between them with var().
// That fails because var() is substituted where a property is DECLARED. --accent resolved
// against a :root that had no --type-dark, fell through to the Vaeon cyan fallback, and the
// computed cyan then inherited down past the element that had the real values.
//
// Three, this one: no indirection at all. The server writes the user's actual hex codes
// into a style block scoped to this page, and the theme picks between two literal values.
// There is no var() to substitute, no inheritance order to get wrong, and no cookie to be
// stale about, because both colours are present and CSS chooses on data-theme, which the
// inline script sets before first paint and is always right.
const typeDark = accentFor(type, "dark");
const typeLight = accentFor(type, "light");
const deepDark = deepFor(type, "dark");
const deepLight = deepFor(type, "light");
const accent = "var(--accent)";
const deep = "var(--accent-deep)";
const accentCss =
"[data-accent]{--accent:" + typeDark + ";--accent-deep:" + deepDark + "}" +
"[data-theme=\"light\"] [data-accent]{--accent:" + typeLight + ";--accent-deep:" + deepLight + "}";
// Gym ready users get their loads from their coach, so nagging them for baselines is
// both useless and a bit insulting.
const noBaselines = !gym && !profile.baseline_bench && !profile.baseline_squat;
const plain = { sessions_per_week: pledged, block_start: profile.block_start || null };

// Latest sign of life from either source, matching greatest() in due_reminders().
const lastSession = sessions && sessions.length ? sessions[0].logged_at : null;
const lastExercise = lastLog ? lastLog.logged_at : null;
const lastActivity = [lastSession, lastExercise].filter(Boolean).sort().pop() || null;
const occasion = occasionFor(lastActivity, stats.thisWeekCount, pledged);
// Nobody has trained yet. Used to decide whether first-run explanation is still earning
// its space, rather than storing a flag and having to keep it honest.
const brandNew = !sessions || sessions.length === 0;

// Shared card. One radius, one border, one surface, all from the token layer rather than
// a bg-brand-surface written out by hand on twenty elements.
const card = "rounded-md border p-4 mb-3";
const cardStyle = { borderColor: BRAND.line, background: BRAND.surface };

return (
<main data-accent className="min-h-screen text-brand-text px-5 py-8" style={{ background: "var(--brand-bg)" }}>
{/* Scoped to this page and generated from the user's own colour pair. See the note by
accentCss above for why this is a style tag rather than inline custom properties. */}
<style dangerouslySetInnerHTML={{ __html: accentCss }} />
<div className="max-w-md mx-auto">

<div className="flex items-center justify-between mb-5">
{/* THE HEADER IS THE WAY IN TO THE TYPE PAGE.

    Face, not orb: the leaderboard shows this person as a character, so a ball here made
    the same user two different things on two screens. The type is named in text right
    beside it, so nothing rests on colour alone.

    And it links. /type had no route into it from anywhere in the app, despite the note at
    the top of that page claiming it opens from the dashboard. An app whose entire argument
    is that your type changes how you are coached had no way to read about your type.

    Same tab, not a new one. This is installed to a home screen and runs standalone, and
    target=_blank drops people out of the app into a browser chrome they did not ask for. */}
{type ? (
<a href={"/type?id=" + typeId} className="flex items-center gap-3 min-w-0"
   aria-label={"Read about " + type.name}>
<TypeCharacter typeId={typeId} size={46} variant="face" />
<div className="min-w-0">
<p className="font-display text-lg font-normal leading-tight truncate">{profile.screen_name}</p>
<p className="text-[0.6875rem] leading-tight uppercase flex items-center gap-1" style={{ color: accent, letterSpacing: TRACK.label }}>
{type.name}
{/* The only thing telling anyone this header is tappable. Without it the route into
    the type page is a hidden feature that most people never find. */}
<span style={{ color: accent, display: "inline-flex" }}><Icon name="arrow" size={11} /></span>
</p>
</div>
</a>
) : (
<div className="flex items-center gap-3 min-w-0">
<div className="min-w-0">
<p className="font-display text-lg font-normal leading-tight truncate">{profile.screen_name}</p>
<p className="text-[0.6875rem] leading-tight uppercase" style={{ color: accent, letterSpacing: TRACK.label }}>
{gym ? "Gym ready" : names.join(" + ")}
</p>
</div>
</div>
)}
<SignOutButton />
</div>

<Track name={EVENTS.APP_OPENED} once userId={user.id} typeId={typeId} framing={profile.framing} props={{ block: profile.block_number || 1, week: weekNo, occasion: occasion }} />

{fromReminder ? (
<Track name={EVENTS.REMINDER_OPENED} once userId={user.id} typeId={typeId} framing={profile.framing} props={{ occasion: occasion }} />
) : null}

{/* SETUP TASKS FIRST, BECAUSE THEY END.
Starting weights, this week's measurements and the install offer are jobs with a
finish line, and each one disappears the moment it is done. Grouped, counted and
placed above the workout button they read as a short list to clear. Left loose below
it, as they were, an amber card about starting weights read as permanent furniture. */}
<ToDo accent={accent} needsBaselines={noBaselines} needsMetrics={!thisWeekMetrics} />

{/* ONE CARD FOR TODAY, NOT THREE.
The date label, the workout button and the block context used to be three separate
blocks stacked on top of each other, all saying something about the same session.
They are one thing: what you are doing today and why it looks like that. The block
line is the answer to "why is today heavy", so it belongs on the same card as today
rather than in a card of its own underneath.

When the block is finished this becomes the block end link instead. There is no
sense offering week seven of a six week block, and there used to be two separate
"block complete" prompts on this screen fighting each other. */}
{finished ? (
<a href="/blockend" className="flex items-center gap-3 rounded-md p-5 mb-3"
style={{ background: "#3DDC97", color: "#000000" }}>
<div className="flex-1">
<p className="font-display text-2xl font-normal leading-none">Block {profile.block_number || 1} done</p>
<p className="text-xs mt-1.5" style={{ color: "var(--on-accent-dim)" }}>
See your {blockWeeks}-week summary and start the next one
</p>
</div>
<Icon name="arrow" size={22} />
</a>
) : (
<a href="/plan" className="rounded-md p-5 mb-3 block"
style={{ background: accent, color: "var(--on-accent)" }}>
<div className="flex items-center gap-3">
<div className="flex-1">
<p className="text-[0.6875rem] uppercase" style={{ color: "var(--on-accent-dim)", letterSpacing: TRACK.label }}>
{profile.fixed_days === false ? "Next up" : today}
</p>
<p className="font-display text-2xl font-normal leading-none mt-1">Today&rsquo;s workout</p>
</div>
<Icon name="arrow" size={22} />
</div>
<p className="text-xs mt-3 pt-3" style={{ color: "var(--on-accent-dim)", borderTop: "1px solid var(--on-accent-line)" }}>
Block {profile.block_number || 1} &middot; Week {weekNo} of {blockWeeks}
{!gym ? " \u00b7 " + rule.label : ""}
</p>
</a>
)}

{/* The week's coaching, as one line rather than a bordered card. It is a sentence,
not an object. */}
<p className="text-xs leading-relaxed mb-4 px-1" style={{ color: BRAND.muted }}>
{gym
? "Your coach sets the training. Vaeon counts the sessions and reports back at the end of the block."
: rule.increase}
</p>

{!profile.block_start ? (
<a href="/settings" className="block text-xs underline mb-4 px-1" style={{ color: "#FFB020" }}>Set your block start date</a>
) : null}

<ChallengeCard challenge={challenge} accent={accent} />

{/* ONE INSTRUMENT PANEL. The number is the largest thing, the label is a tracked
micro-caption above it, and the borders are drawn by the gaps rather than by three
sets of corners. Tabular figures come from globals.css, so nothing shuffles when a
digit changes. */}
<div className="grid grid-cols-3 gap-px mb-2 rounded-md overflow-hidden border"
style={{ borderColor: BRAND.line, background: BRAND.line }}>
{[
{ label: "Level", value: String(stats.level), on: false },
{ label: "This week", value: stats.thisWeekCount + "/" + pledged, on: stats.thisWeekCount >= pledged },
{ label: "Streak", value: String(stats.weekStreak), on: stats.weekStreak > 0 },
].map(function (t) {
return (
<div key={t.label} className="px-3 py-3" style={{ background: BRAND.bg }}>
<p className="text-[0.6875rem] uppercase" style={{ color: BRAND.dim, letterSpacing: TRACK.label }}>{t.label}</p>
<p className="font-display text-2xl font-normal leading-none mt-1.5"
style={{ color: t.on ? accent : BRAND.text }}>{t.value}</p>
</div>
);
})}
</div>

{/* Grace weeks, as a footnote to the streak rather than a card of its own. It is a
fact about the number directly above it, and it was taking up a whole bordered box
to say one sentence. Still shown when unused, because half the value of a safety net
is knowing it is there. */}
{profile.block_start ? (
<p className="text-[0.75rem] leading-snug mb-5 px-1" style={{ color: BRAND.dim }}>
{stats.frozenInStreak > 0
? "A missed week is being held for you, so the streak stands. " + (freezeCredits > 0 ? "You have another grace week in reserve." : "That was your one for this block.")
: (freezeCredits > 0
? "One grace week in hand. Miss a week and the streak survives it."
: "No grace week left. Your next missed week resets the streak.")}
</p>
) : <div className="mb-5" />}

{/* Same tab, matching the header link above. This opened with target="_blank", which
    on a home-screen install throws people out of the standalone app and into browser
    chrome they did not ask for, with no way back but the back gesture. */}
{/* ONE TIME, NOT FOREVER.
    Once somebody has logged a session they know what their style is, and a permanent
    card explaining it becomes furniture. It shows while they have logged nothing, which
    self-clears the moment they train and needs no column to track it. After that the
    arrow in the header above is the way through. */}
{type && brandNew ? (
<a href={"/type?id=" + typeId}
className="rounded-md p-4 mb-3 border block" style={{ borderColor: "color-mix(in srgb, var(--accent) 27%, transparent)", background: BRAND.surface }}>
<div className="flex items-center gap-2 mb-2">
<TypeOrb typeId={typeId} size={24} />
<p className="text-[0.6875rem] uppercase flex-1" style={{ color: accent, letterSpacing: TRACK.label }}>The {type.name.replace("The ", "")} style</p>
<span style={{ color: accent }}><Icon name="arrow" size={14} /></span>
</div>
<p className="text-sm leading-relaxed" style={{ color: "var(--brand-muted)" }}>{nudge}</p>
</a>
) : !type ? (
<a href="/assessment" className="block rounded-md border p-4 mb-3" style={{ borderColor: BRAND.line, background: BRAND.surface }}>
<p className="font-display text-sm mb-1">Find your training personality</p>
<p className="text-xs text-brand-muted">Two minutes. It decides how you get coached.</p>
</a>
) : null}

{/* ---------- Kudos received ---------- */}
<KudosCard kudos={myKudos} accent={accent} />

<AchievementWatcher profile={plain} />

<p className="rule-label mb-3">Elsewhere</p>

{/* A hairline grid rather than four rounded cards, matching the stat panel above. The
icons are outlines in currentColor, so they take the accent and sit with the mark
instead of importing four more palettes from the emoji font. */}
<div className="grid grid-cols-2 gap-px mb-5 rounded-md overflow-hidden border"
style={{ borderColor: BRAND.line, background: BRAND.line }}>
{[
{ href: "/log", icon: "pencil", label: "Quick log" },
{ href: "/leaderboard", icon: "board", label: "Leaderboard" },
{ href: "/progress", icon: "chart", label: "Progress" },
{ href: "/settings", icon: "sliders", label: "Stats and settings" },
{ href: "/feedback", icon: "kudos", label: "Send feedback" },
]
// Was a permanent amber banner asking "can't get to the gym today?", which most days
// is a question whose answer is obviously no. It is a destination, so it belongs with
// the other destinations.
//
// GYM READY USERS GET IT GREYED RATHER THAN MISSING.
//
// They bring their own plan, so there is no fallback week to send them to and the tile
// cannot be a link. Omitting it left an odd number of cells in a two column grid, and the
// hole showed the grid's own border colour through the gap, which read as a rendering
// fault rather than a gap. Present but plainly inert says "not for you" and keeps the
// block square.
.concat([{ href: "/fallback", icon: "home", label: "Train without a gym", off: gym }])
.map(function (t) {
if (t.off) {
return (
<div key={t.href} aria-hidden="true" className="flex items-center gap-2.5 px-3 py-4"
style={{ background: BRAND.bg, opacity: 0.32 }}>
<span style={{ color: BRAND.dim }}><Icon name={t.icon} size={18} /></span>
<span className="text-sm" style={{ color: BRAND.dim }}>{t.label}</span>
</div>
);
}
return (
<a key={t.href} href={t.href} className="flex items-center gap-2.5 px-3 py-4" style={{ background: BRAND.bg }}>
<span style={{ color: accent }}><Icon name={t.icon} size={18} /></span>
<span className="text-sm">{t.label}</span>
</a>
);
})}
</div>

<div className="mb-4"><ShareButton accent={accent} /></div>

<a href="/onboarding" className="block text-center text-xs text-brand-dim underline">Change goals, days or sessions a week</a>
</div>
</main>
);
}
