// Spotify without the integration. Deep links open the app with the right
// results already loaded: no OAuth, no Premium requirement, no app review.
// Spotify killed the recommendations endpoint for new apps in Nov 2024, so
// this is the approach that actually works.

function link(query) {
  return "https://open.spotify.com/search/" + encodeURIComponent(query);
}

// Musical taste tends to set around the teenage years, so we aim at the
// decade someone was roughly 14 to 18, not the decade they were born.
export function eraFor(birthYear) {
  const y = Number(birthYear);
  if (!y || y < 1930 || y > 2020) return null;
  const teen = y + 16;
  const decade = Math.floor(teen / 10) * 10;
  if (decade < 1960) return { decade: 1960, label: "the sixties" };
  if (decade > 2020) return { decade: 2020, label: "the twenties" };
  const labels = {
    1960: "the sixties", 1970: "the seventies", 1980: "the eighties",
    1990: "the nineties", 2000: "the noughties", 2010: "the tens", 2020: "the twenties",
  };
  return { decade: decade, label: labels[decade] };
}

// Match the music to what the session actually asks of you.
const MOOD = {
  Strength: { name: "heavy lifting", terms: "heavy gym workout" },
  Hypertrophy: { name: "steady pump", terms: "gym pump workout" },
  Conditioning: { name: "high energy", terms: "high energy hiit workout" },
  Speed: { name: "fast tempo", terms: "running tempo fast" },
  Power: { name: "high energy", terms: "high energy workout" },
  Base: { name: "steady running", terms: "long run steady" },
  Threshold: { name: "steady running", terms: "running tempo" },
  Endurance: { name: "steady running", terms: "endurance training" },
  Specific: { name: "race pace", terms: "race day running" },
  Technique: { name: "focused", terms: "focus workout" },
  Skill: { name: "focused", terms: "focus workout" },
  Recovery: { name: "easy going", terms: "chilled recovery" },
  Mobility: { name: "calm", terms: "calm stretching yoga" },
  Cardio: { name: "steady cardio", terms: "cardio workout" },
};

// How hard the session is going to be, which decides which flavours are on the menu.
// Suggesting dance floor fillers for a mobility day is worse than suggesting nothing.
const TIER = {
  Strength: "hard", Hypertrophy: "hard", Conditioning: "hard", Power: "hard", Speed: "hard",
  Base: "steady", Threshold: "steady", Endurance: "steady", Specific: "steady", Cardio: "steady",
  Technique: "steady", Skill: "steady",
  Recovery: "calm", Mobility: "calm",
};

// The same suggestion every single day reads like a broken feature within a week, which
// is what "some nineties classics" had become. Same era, same appropriateness to the
// session, different flavour each time.
//
// These are written to work with or without a decade in front of them: "nineties rock
// anthems" and "rock anthems" are both sensible Spotify searches, which is what keeps
// this one list rather than two.
const FLAVOURS = {
  hard: [
    { word: "classics", terms: "classics" },
    { word: "rock anthems", terms: "rock anthems" },
    { word: "upbeat hits", terms: "upbeat hits" },
    { word: "motivational anthems", terms: "motivational workout" },
    { word: "hip hop", terms: "hip hop workout" },
    { word: "dance floor fillers", terms: "dance hits" },
    { word: "guitar heavy", terms: "rock workout" },
  ],
  steady: [
    { word: "classics", terms: "classics" },
    { word: "singalong hits", terms: "singalong hits" },
    { word: "feel good songs", terms: "feel good" },
    { word: "road trip hits", terms: "road trip" },
    { word: "indie favourites", terms: "indie" },
    { word: "pop anthems", terms: "pop hits" },
  ],
  calm: [
    { word: "acoustic", terms: "acoustic" },
    { word: "mellow classics", terms: "mellow" },
    { word: "chilled favourites", terms: "chilled" },
    { word: "slow burners", terms: "slow songs" },
  ],
};

// Rotates on the day of the year plus the session's position in the week, so two sessions
// on the same day get different suggestions and the whole thing moves on tomorrow. A
// deterministic pick rather than Math.random, because a suggestion that changes every
// time you scroll past it is unsettling rather than varied.
function flavourFor(tier, seed) {
  const list = FLAVOURS[tier] || FLAVOURS.hard;
  const now = new Date();
  const dayOfYear = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000);
  return list[(dayOfYear + (seed || 0)) % list.length];
}

// seed is optional and is normally the index of the session in the week.
export function sessionMusic(day, birthYear, seed) {
  const focus = day && day.focus;
  const mood = MOOD[focus] || MOOD.Strength;
  const tier = TIER[focus] || "hard";
  const flavour = flavourFor(tier, seed);
  const era = eraFor(birthYear);

  if (era) {
    return {
      label: "Today's session would go well with some " + era.label + " " + flavour.word,
      href: link(era.decade + "s " + flavour.terms),
    };
  }
  return {
    label: "Today's session would go well with some " + flavour.word,
    // No decade to anchor the search, so the mood terms do that work instead and keep
    // the result relevant to the session rather than to a genre alone.
    href: link(flavour.terms + " " + mood.terms),
  };
}

// Stations are the sharp end. Always high tempo, regardless of the day.
export function stationMusic(birthYear) {
  const era = eraFor(birthYear);
  if (era) {
    return { label: "Stations need something loud", href: link(era.decade + "s high energy anthems") };
  }
  return { label: "Stations need something loud", href: link("high energy workout anthems") };
}
