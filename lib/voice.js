// Every type speaks in its own register. The Monk does not shout. The Captain does.

const QUOTES = {
  architect: [
    "The plan is not a suggestion. It is the whole point.",
    "Small increments, repeated, become numbers nobody believes.",
    "You do not need motivation today. You need the next line on the sheet.",
    "Precision beats intensity. Every single time.",
    "Build it properly now and it holds for years.",
    "Boring, done exactly, is the fastest route there is.",
  ],
  captain: [
    "Right. Front of the queue. Let us go.",
    "Somebody is watching how you show up today. Give them something.",
    "You do not lead from the back of the room.",
    "Set the standard in the first ten minutes and everyone follows.",
    "Nobody remembers the easy sessions. Make this one count.",
    "You have got this. Now go and prove it to yourself.",
  ],
  monk: [
    "Begin. That is all today asks of you.",
    "The body follows a quiet mind. Breathe first, lift second.",
    "Nothing rushed. Nothing forced. Simply the next repetition.",
    "Discipline is not effort. It is returning, again and again.",
    "You are not chasing today. You are keeping the rhythm.",
    "Stillness between sets is part of the work, not a pause in it.",
  ],
  anchor: [
    "You turned up. That is genuinely the hardest part done.",
    "Same time, same place, same faces. That is how this works.",
    "Steady beats spectacular over a year.",
    "The room is better when you are in it.",
    "No heroics needed. Just the session in front of you.",
    "Consistency is not glamorous. It is simply undefeated.",
  ],
  hunter: [
    "Pick the target. Take it. Go home.",
    "There is a number on the board. Beat it.",
    "No warm-up chat. Just the hunt.",
    "You already know what today needs. Do it.",
    "Second place is just the first loser with better excuses.",
    "Find it, chase it, log it.",
  ],
  gladiator: [
    "The gate is open. Walk out swinging.",
    "Somebody out there is training to beat you. Not today.",
    "Make this session the one they hear about.",
    "Pressure is a privilege. Use it.",
    "Win the first set and the rest falls in line.",
    "You did not come here to take part.",
  ],
  wanderer: [
    "No map today. Just movement.",
    "Go somewhere your legs have not been.",
    "The best session is the one you actually fancy doing.",
    "Curiosity gets you further than discipline some weeks.",
    "Follow whatever feels good and count it anyway.",
    "There is no wrong direction if you are moving.",
  ],
  spark: [
    "If it is fun, it gets done. Make it fun.",
    "Grab someone. Everything is better with company.",
    "Put a good song on and start. That is the whole plan.",
    "You are allowed to enjoy this, you know.",
    "Energy in, energy out. Bring some.",
    "Make some noise and get it done.",
  ],
};

const INTROS = {
  architect: {
    Technique: "Baseline week. Land the weights, log everything.",
    Build: "Increment week. Small, deliberate, exact.",
    Load: "Heaviest of the first half. Hold your form.",
    Deload: "Planned back-off. Do not improvise.",
    Peak: "Peak week. This is what the block was for.",
    Test: "Test day. Find the new numbers.",
    Base: "Establish the pattern. Note the times.",
    Recovery: "Reduced load. Stick to it.",
    "Taper and test": "Taper, then test properly.",
  },
  captain: {
    Technique: "Week one. Set the tone for everyone.",
    Build: "Time to add. Lead from the front.",
    Load: "Big week. Show them how it is done.",
    Deload: "Even captains rest. Take it properly.",
    Peak: "This is your week. Go and take it.",
    Test: "Test day. Put a number on the board.",
    Base: "Build the engine. Everyone starts here.",
    Recovery: "Back off, come back stronger.",
    "Taper and test": "Sharpen up, then race it.",
  },
  monk: {
    Technique: "Learn the shapes. Nothing more.",
    Build: "A little more, gently.",
    Load: "Heavier now. Stay calm inside it.",
    Deload: "Rest week. Receive it without guilt.",
    Peak: "The hardest week. Breathe through it.",
    Test: "See where the practice has taken you.",
    Base: "Find the rhythm. Hold it lightly.",
    Recovery: "Ease off. The work is still happening.",
    "Taper and test": "Quieten down, then see.",
  },
  anchor: {
    Technique: "Nice and easy first week. Get familiar.",
    Build: "A bit more this week. You are ready.",
    Load: "Busiest week. Just keep turning up.",
    Deload: "Easier week. Enjoy it.",
    Peak: "Big one. You have earned the fitness for it.",
    Test: "See how far you have come.",
    Base: "Settle into the routine.",
    Recovery: "Lighter week. Same faces, less effort.",
    "Taper and test": "Wind down, then have a go.",
  },
  hunter: {
    Technique: "Set the baseline. Then we hunt.",
    Build: "Add load. Beat last week.",
    Load: "Hard week. Get after it.",
    Deload: "Back off. You will be faster for it.",
    Peak: "Biggest numbers of the block.",
    Test: "Test day. New personal bests or nothing.",
    Base: "Set the pace. Log the time.",
    Recovery: "Ease up. Sharpening, not stopping.",
    "Taper and test": "Rest, then go all out.",
  },
  gladiator: {
    Technique: "Training camp. Learn the moves.",
    Build: "Step it up. Fight week is coming.",
    Load: "Brutal week. Good.",
    Deload: "Recovery week. Even champions taper.",
    Peak: "Peak week. Absolute war.",
    Test: "Fight day. Empty the tank.",
    Base: "Build the base. Earn the right.",
    Recovery: "Back off, stay sharp.",
    "Taper and test": "Taper, then race it flat out.",
  },
  wanderer: {
    Technique: "Explore the movements. No pressure.",
    Build: "A bit more this week if it feels right.",
    Load: "Bigger week. Enjoy the challenge.",
    Deload: "Easy week. Wander, do not push.",
    Peak: "Your biggest week. See what happens.",
    Test: "Have a proper go and see.",
    Base: "Just move. Anywhere, any way.",
    Recovery: "Gentle week. Keep it interesting.",
    "Taper and test": "Ease off, then test yourself.",
  },
  spark: {
    Technique: "Week one. Keep it light and fun.",
    Build: "Turning it up a notch. Bring a mate.",
    Load: "Big week. Good playlist required.",
    Deload: "Easy week. Enjoy yourself.",
    Peak: "The fun one. Go big.",
    Test: "Test day. Make it an event.",
    Base: "Get moving. Make it enjoyable.",
    Recovery: "Chilled week. Still show up.",
    "Taper and test": "Wind down, then go for it.",
  },
};

export function quoteFor(typeId, seed) {
  const list = QUOTES[typeId] || QUOTES.architect;
  const day = new Date().getDate();
  const i = (day + (seed || 0)) % list.length;
  return list[i];
}

export function sessionIntro(typeId, weekLabel) {
  const set = INTROS[typeId] || INTROS.architect;
  return set[weekLabel] || "Get it done.";
}

export function allQuotes(typeId) {
  return QUOTES[typeId] || QUOTES.architect;
}

