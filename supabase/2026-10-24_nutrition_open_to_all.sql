-- APPLIED to project wctsiafaiogyciqnmvad on 2026-10-24.
--
-- Meal planning opens to every account, and becomes a question rather than a flag.
--
-- nutrition_enabled was a ROLLOUT decision: true for one account while the six week test
-- ran, so a new tab appearing mid-block could not make the block end report unreadable.
-- That test is long over. The column is kept rather than dropped, because dropping it
-- would break any client still deployed against it, but NOTHING GATES ON IT ANY MORE.
--
-- What replaces it is a user answer, not an operator switch:
--
--   null   never asked. The dashboard tile shows, and tapping it asks the question.
--   true   yes, plan my food. The setup form and the weekly plan are available.
--   false  no thanks. The tile stops showing. Reversible from settings.
--
-- THE AGE CHECK IS UNTOUCHED AND IS NOT THIS. oldEnoughForNutrition() still gates the
-- whole feature at NUTRITION_MIN_AGE, independently, and fails closed on a missing date of
-- birth. Calorie targets aimed at adolescents are a recognised risk factor for disordered
-- eating, so that check answers to nobody's rollout plan and nobody's opt-in.

alter table profiles add column if not exists nutrition_opt_in boolean;

comment on column profiles.nutrition_opt_in is
  'Did this person ask for meal planning? null = not asked yet, true = yes, false = declined.
   Replaces nutrition_enabled as the gate, which was a rollout flag rather than a user
   choice. Independent of the age check in lib/nutrition.js, which still applies regardless.';

comment on column profiles.nutrition_enabled is
  'RETIRED as a gate on 2026-10-24. Was the rollout flag for the nutrition tab during the
   six week test. Kept so older deployed clients do not break, but no code should read it:
   use nutrition_opt_in, which records what the user actually answered.';

-- Anyone already set up keeps their setup. Having allergens recorded means they completed
-- the form, which is a yes in everything but name.
update profiles
set nutrition_opt_in = true
where nutrition_opt_in is null
  and nutrition_enabled = true
  and allergens is not null;
