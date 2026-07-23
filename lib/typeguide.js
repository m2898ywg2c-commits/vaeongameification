// The researched backbone of the eight types. Each of the three dimensions maps to a
// well-studied strand of motivation science, and each pole carries the model it draws on,
// a plain-English explanation, and a source. Used by the /type/[id] pages.

export const DIMENSIONS = {
  structure: {
    label: "How you like it structured",
    plus: {
      pole: "Planned",
      model: "self-regulation and conscientiousness",
      body:
        "You train best when the week is decided before it starts. That instinct lines up with conscientiousness and self-regulation, the trait cluster that most reliably predicts who keeps training over months rather than weeks. Deciding in advance turns exercise from a daily choice into a standing arrangement, which is why simple if-then plans (if it is Tuesday at seven, then I train) beat raw willpower. Vaeon gives you that structure on purpose.",
      source: { title: "Conscientiousness and exercise adherence (NIH)", url: "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC11693223/" },
    },
    minus: {
      pole: "Freestyle",
      model: "autonomy, from Self-Determination Theory",
      body:
        "You do your best work deciding in the moment, not to a fixed script. Self-Determination Theory calls this autonomy, one of three basic psychological needs, and it matters because motivation that feels chosen lasts longer than motivation that feels imposed. A rigid plan can quietly undermine that. Vaeon gives you a flexible menu and rolling challenges so the choice stays yours.",
      source: { title: "Self-Determination Theory (APA)", url: "https://www.apa.org/research-practice/conduct-research/self-determination-theory" },
    },
  },
  orientation: {
    label: "What drives the effort",
    plus: {
      pole: "Outcome",
      model: "performance goals, from Achievement Goal Theory",
      body:
        "Numbers move you: times, weights, streaks and personal bests. Achievement Goal Theory calls this a performance, or ego, orientation, where you judge competence against a visible standard. It is a strong engine when the target is clear, though it can carry more pressure with it. Vaeon keeps the number in front of you and the target concrete.",
      source: { title: "Achievement Goal Theory in sport (iResearchNet)", url: "https://psychology.iresearchnet.com/sports-psychology/sport-motivation/achievement-goal-theory/" },
    },
    minus: {
      pole: "Experience",
      model: "mastery goals, from Achievement Goal Theory",
      body:
        "How a session feels matters to you more than what it measures. Achievement Goal Theory calls this a mastery, or task, orientation, and it is the one most consistently tied to enjoyment, persistence and intrinsic motivation in sport and exercise. You would keep training even if nothing was ever scored. Vaeon measures your consistency and how sessions feel, not just the load.",
      source: { title: "Achievement Goal Theory overview (ScienceDirect)", url: "https://www.sciencedirect.com/topics/psychology/achievement-goal-theory" },
    },
  },
  social: {
    label: "Who you train with",
    plus: {
      pole: "Together",
      model: "the Köhler effect and social facilitation",
      body:
        "Other people lift your effort. That is not just a preference, it is the Köhler effect and social facilitation: people reliably work harder alongside others than alone, often by 15 to 20 percent, driven by social comparison and not wanting to let the group down. It also feeds relatedness, one of the three needs in Self-Determination Theory. Vaeon puts you in shared goals, leaderboards and company.",
      source: { title: "The Köhler group motivation gain (Kerr, Wiley)", url: "https://compass.onlinelibrary.wiley.com/doi/abs/10.1111/j.1751-9004.2010.00333.x" },
    },
    minus: {
      pole: "Solo",
      model: "self-paced autonomy",
      body:
        "Your best sessions are just you and your headphones. You self-pace and self-regulate without needing an audience, and for you the presence of others is more distraction than fuel. Vaeon keeps your check-ins sharp and private, and scores you against your own promise rather than the room.",
      source: { title: "Self-Determination Theory (APA)", url: "https://www.apa.org/research-practice/conduct-research/self-determination-theory" },
    },
  },
};

// Which pole each type sits on. Matches pickType() in lib/personality.js.
export const TYPE_POLES = {
  architect: { structure: "plus", orientation: "plus", social: "minus" },
  captain: { structure: "plus", orientation: "plus", social: "plus" },
  monk: { structure: "plus", orientation: "minus", social: "minus" },
  anchor: { structure: "plus", orientation: "minus", social: "plus" },
  hunter: { structure: "minus", orientation: "plus", social: "minus" },
  gladiator: { structure: "minus", orientation: "plus", social: "plus" },
  wanderer: { structure: "minus", orientation: "minus", social: "minus" },
  spark: { structure: "minus", orientation: "minus", social: "plus" },
};

// The two questions that sit on top of your type, layered rather than folded in.
export const LAYERS = [
  {
    name: "Motivation framing",
    model: "Reinforcement Sensitivity Theory (Gray's BAS and BIS)",
    body:
      "A short set of questions reads whether you are fired up more by chasing a gain or protecting what you have built. That is Reinforcement Sensitivity Theory, Gray's model of two brain systems: a reward-sensitive approach system and a punishment-sensitive inhibition system. Your coach frames the same nudge differently depending on which speaks louder to you.",
    source: { title: "Reinforcement Sensitivity Theory (ScienceDirect)", url: "https://www.sciencedirect.com/topics/psychology/reinforcement-sensitivity-theory" },
  },
  {
    name: "Chronotype",
    model: "circadian physiology",
    body:
      "One more question reads when your body is at its best. Chronotype is a real circadian trait, tracked by markers like core temperature and melatonin timing, and it shifts both when you perform and how hard a session costs you. Training against your clock has a measurable price, so Vaeon nudges you to put your hardest work in your strong window.",
    source: { title: "Chronotype and athletic performance (Dovepress)", url: "https://www.dovepress.com/impact-of-chronotype-on-athletic-performance-current-perspectives-peer-reviewed-fulltext-article-CPT" },
  },
];

// Ordered list of the three dimension keys, for consistent rendering.
export const DIM_ORDER = ["structure", "orientation", "social"];

// The three models a given type draws on, for the opening sentence.
export function modelsFor(typeId) {
  const poles = TYPE_POLES[typeId];
  if (!poles) return [];
  return DIM_ORDER.map(function (dim) {
    return DIMENSIONS[dim][poles[dim]].model;
  });
}

// Every unique source behind a type page, for the references list.
export function sourcesFor(typeId) {
  const poles = TYPE_POLES[typeId];
  const out = [];
  const seen = {};
  const add = function (s) {
    if (s && !seen[s.url]) { seen[s.url] = true; out.push(s); }
  };
  if (poles) {
    DIM_ORDER.forEach(function (dim) { add(DIMENSIONS[dim][poles[dim]].source); });
  }
  LAYERS.forEach(function (l) { add(l.source); });
  return out;
}
