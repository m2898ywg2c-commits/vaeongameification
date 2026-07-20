// Cannot get to the gym? Location-based fallbacks, matched to what you are training for.

export const LOCATIONS = [
  { id: "desk", name: "At my desk", blurb: "Ten minutes, no kit, no sweat, nobody notices." },
  { id: "hotel", name: "Hotel room", blurb: "Small space, no equipment, twenty minutes." },
  { id: "home", name: "At home", blurb: "Thirty minutes, maybe a pair of dumbbells." },
];

function w(title, minutes, items, note) {
  return { title: title, minutes: minutes, items: items, note: note };
}

export const FALLBACKS = {
  endurance: {
    desk: w("Desk Reset for Runners", 10, [
      "Calf raises at the desk, 3 sets of 20",
      "Standing hip flexor stretch, 45 seconds each side",
      "Seated figure-four glute stretch, 45 seconds each side",
      "Ankle circles, 15 each direction",
      "Standing hamstring stretch, 45 seconds each leg",
    ], "Runners stiffen up sitting down. This keeps the hips honest until your next run."),
    hotel: w("Hotel Room Run Substitute", 20, [
      "High knees, 4 rounds of 45 seconds",
      "Jumping jacks, 4 rounds of 45 seconds",
      "Bodyweight squats, 3 sets of 20",
      "Walking lunges on the spot, 3 sets of 12 per leg",
      "Mountain climbers, 4 rounds of 30 seconds",
      "Plank, 3 sets of 45 seconds",
    ], "Not a run, but it keeps the engine ticking and the streak alive."),
    home: w("Home Cardio and Strength", 30, [
      "Skipping or high knees, 5 minutes",
      "Bodyweight squats, 4 sets of 20",
      "Single leg calf raises, 3 sets of 15 per side",
      "Glute bridges, 3 sets of 20",
      "Push ups, 3 sets of 12",
      "Plank, 3 sets of 60 seconds",
      "Stair intervals if you have stairs, 8 rounds",
    ], "Legs and lungs both get something. Log it as cardio."),
  },
  strength: {
    desk: w("Desk Isometrics", 10, [
      "Chair squats, 3 sets of 15",
      "Desk push ups, 3 sets of 15",
      "Isometric wall sit, 3 sets of 45 seconds",
      "Glute squeezes seated, 3 sets of 20",
      "Grip squeezes, 3 sets of 30 seconds each hand",
    ], "Keeps blood in the muscle and the habit intact on a written-off day."),
    hotel: w("Hotel Room Strength", 20, [
      "Push ups, 4 sets to two reps short of failure",
      "Bulgarian split squats using the bed, 4 sets of 12 per leg",
      "Pike push ups, 3 sets of 10",
      "Single leg glute bridge, 3 sets of 15 per side",
      "Towel rows on a door handle, 3 sets of 15",
      "Plank, 3 sets of 60 seconds",
    ], "Higher reps make up for the lack of load. Take short rests."),
    home: w("Home Strength Session", 30, [
      "Goblet squats with any weight you have, 4 sets of 15",
      "Push ups, 4 sets of 15",
      "Single leg Romanian deadlift, 3 sets of 12 per leg",
      "Backpack rows, 4 sets of 15",
      "Pike push ups, 3 sets of 10",
      "Ab wheel or plank, 3 sets",
      "Calf raises off a step, 4 sets of 20",
    ], "A loaded backpack works fine. Log it as strength."),
  },
  physique: {
    desk: w("Desk Activation", 10, [
      "Seated glute squeezes, 3 sets of 20 with a 3 second hold",
      "Chair squats, 3 sets of 15",
      "Standing calf raises, 3 sets of 20",
      "Desk push ups, 3 sets of 15",
      "Standing side leg raises, 3 sets of 15 per side",
    ], "Small, but it keeps the glutes switched on through a long sitting day."),
    hotel: w("Hotel Room Sculpt", 20, [
      "Glute bridges, 4 sets of 20",
      "Bulgarian split squats using the bed, 4 sets of 12 per leg",
      "Frog pumps, 3 sets of 25",
      "Push ups, 3 sets of 12",
      "Side lying leg raises, 3 sets of 20 per side",
      "Plank, 3 sets of 45 seconds",
    ], "High reps, short rests. You will feel this one."),
    home: w("Home Full Body Burn", 30, [
      "Goblet squats, 4 sets of 15",
      "Hip thrusts off the sofa, 4 sets of 20",
      "Push ups, 3 sets of 15",
      "Walking lunges, 3 sets of 14 per leg",
      "Backpack rows, 3 sets of 15",
      "Russian twists, 3 sets of 24",
      "Glute bridge hold, 3 sets of 45 seconds",
    ], "Circuit it if you are short on time. Two rounds, minimal rest."),
  },
  hybrid: {
    desk: w("Desk Reset", 10, [
      "Chair squats, 3 sets of 20",
      "Desk push ups, 3 sets of 15",
      "Standing calf raises, 3 sets of 25",
      "Hip flexor stretch, 45 seconds each side",
      "Grip squeezes, 3 sets of 30 seconds",
    ], "Ten minutes to stop the day being a total write-off."),
    hotel: w("Hotel HYROX Substitute", 20, [
      "Burpees, 5 rounds of 10",
      "Bodyweight lunges, 4 sets of 20 per leg",
      "Push ups, 4 sets of 15",
      "Mountain climbers, 4 rounds of 40",
      "Wall sit, 3 sets of 60 seconds",
      "Plank to shoulder tap, 3 sets of 20",
    ], "Compromised running legs without the running. Keep rest short."),
    home: w("Home Hybrid Circuit", 30, [
      "Burpee broad jumps, 4 rounds of 10",
      "Backpack thrusters, 4 sets of 15",
      "Walking lunges with load, 4 sets of 20 per leg",
      "Push ups, 4 sets of 15",
      "Backpack rows, 4 sets of 15",
      "Farmers carry with anything heavy, 4 rounds of 40m",
      "Plank, 3 sets of 60 seconds",
    ], "Three rounds, 90 seconds rest between rounds. Log it as conditioning."),
  },
  general: {
    desk: w("Desk Movement Break", 10, [
      "Chair squats, 3 sets of 15",
      "Desk push ups, 3 sets of 12",
      "Standing calf raises, 3 sets of 20",
      "Seated spinal twist, 45 seconds each side",
      "Neck and shoulder rolls, 1 minute",
    ], "Better than nothing, and nothing is the usual alternative."),
    hotel: w("Hotel Room Full Body", 20, [
      "Jumping jacks, 3 rounds of 45 seconds",
      "Bodyweight squats, 3 sets of 20",
      "Push ups, 3 sets of 12",
      "Glute bridges, 3 sets of 20",
      "Plank, 3 sets of 45 seconds",
      "Standing stretch sequence, 3 minutes",
    ], "Everything gets a little something. Twenty minutes, done."),
    home: w("Home Full Body", 30, [
      "Brisk walk or skipping, 8 minutes",
      "Bodyweight squats, 3 sets of 20",
      "Push ups, 3 sets of 15",
      "Backpack rows, 3 sets of 15",
      "Glute bridges, 3 sets of 20",
      "Plank, 3 sets of 45 seconds",
      "Full body stretch, 5 minutes",
    ], "A proper session without leaving the house."),
  },
};

export function fallbackFor(category, locationId) {
  const group = FALLBACKS[category] || FALLBACKS.general;
  return group[locationId] || group.home;
}

