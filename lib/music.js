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

export function sessionMusic(day, birthYear) {
  const mood = MOOD[day && day.focus] || MOOD.Strength;
  const era = eraFor(birthYear);
  if (era) {
    return {
      label: "Todays session would go well with some " + era.label + " classics",
      href: link(era.decade + "s " + mood.terms),
    };
  }
  return {
    label: "Todays session would go well with something " + mood.name,
    href: link(mood.terms),
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
