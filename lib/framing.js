// Reinforcement Sensitivity Theory, applied to coaching tone.
// Reward-sensitive people (Gray's BAS) respond to the gain ahead. Loss-sensitive people
// (BIS) respond to protecting what they have already built. Same event, same badge,
// different framing of why it matters. This layer sits across all eight types.
//
// Kept deliberately constructive: loss framing points at what is worth keeping, never
// guilt or fear. "Balanced" gets no tag, so the base coach line stands on its own.

const FRAMING = {
  reward: {
    fresh: "There is a first best waiting to be set. Go and take it.",
    active: "You are building something real. One more push and that is a new best.",
    lapsed: "There is a best still on the table. Go and take it back.",
  },
  loss: {
    fresh: "Get going today and you will have something worth keeping.",
    active: "You have built real momentum. Hold onto it.",
    lapsed: "You have put in real work already. One session stops it slipping.",
  },
};

// state is one of fresh | active | lapsed, matching coachMessage.
export function framingLine(framing, state) {
  if (!framing || framing === "balanced") return null;
  const set = FRAMING[framing];
  if (!set) return null;
  return set[state] || null;
}

export const FRAMING_LABEL = {
  reward: "reward-driven",
  loss: "loss-averse",
  balanced: "evenly balanced",
};

// What the framing changes about coaching, in one plain line for the result screen.
export const FRAMING_EXPLAINER = {
  reward: "so your coach frames the nudge around the gain ahead.",
  loss: "so your coach frames the nudge around protecting what you have built.",
  balanced: "so your coach keeps an even hand either way.",
};

export const CHRONOTYPE_LABEL = {
  morning: "in the morning",
  evening: "in the evening",
  neutral: "at any time of day",
};

// Actionable now, independent of any reminder system: train your hardest sessions in your window.
export const CHRONOTYPE_TIP = {
  morning: "Put your hardest sessions early when you can. Training against your clock costs you.",
  evening: "Save your hardest sessions for later in the day when you can. Early high-intensity work hits evening types harder.",
  neutral: "No strong window, so train whenever fits your week.",
};
