-- APPLIED 2026-08-09 to project wctsiafaiogyciqnmvad.
--
-- Allergies, goal direction, cost bands, a second recipe source, and the registration flow's
-- storage. Follows 2026-08-09_nutrition.sql, which created the three tables.
--
-- A NOTE ON HOW PART OF THIS WAS APPLIED, BECAUSE IT IS A TRAP WORTH KNOWING ABOUT.
--
-- The schema changes below went through apply_migration and are in
-- supabase_migrations.schema_migrations. The backfill and the Joe Wicks seed did not: they
-- went through a plain SQL call, which changes the data and records nothing. The database was
-- therefore correct and the migration history was a fiction, and a rebuild from history would
-- have produced a library with no allergen tags on it, which for this particular feature is the
-- worst possible thing to silently lose.
--
-- Everything is in this file now, written so it can be re-run safely. The rule it cost me:
-- **a data change is a migration too.** If it would be wrong after a rebuild, it belongs in a
-- file, whether or not it contains the word "alter".

-- ============================================================================
-- Schema
-- ============================================================================

alter table meals add column if not exists allergens text[] not null default '{}';
alter table meals add column if not exists cost text not null default 'mid';
alter table meals add column if not exists source text;

do $$ begin
  alter table meals add constraint meals_cost_check check (cost in ('low','mid','high'));
exception when duplicate_object then null; end $$;

alter table profiles add column if not exists nutrition_goal text;
alter table profiles add column if not exists height_cm int;
alter table profiles add column if not exists sex text;
alter table profiles add column if not exists activity_level text;
alter table profiles add column if not exists allergens text[] not null default '{}';
alter table profiles add column if not exists budget_pref text not null default 'any';

do $$ begin
  alter table profiles add constraint profiles_nutrition_goal_check
    check (nutrition_goal is null or nutrition_goal in ('lose','maintain','gain'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table profiles add constraint profiles_sex_check
    check (sex is null or sex in ('male','female'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table profiles add constraint profiles_activity_check
    check (activity_level is null or activity_level in ('sedentary','light','moderate','very','extra'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table profiles add constraint profiles_budget_check
    check (budget_pref in ('any','economical'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table profiles add constraint profiles_height_check
    check (height_cm is null or height_cm between 100 and 250);
exception when duplicate_object then null; end $$;

comment on column meals.allergens is
  'UK 14 allergen keys present in this dish. OVER-TAGGED WHERE UNCERTAIN ON PURPOSE: removing a meal somebody could have eaten is an annoyance, serving one they cannot is not. Best effort on our own ingredient list; the linked recipe is third party and cross-contamination is not modelled.';
comment on column profiles.allergens is
  'Declared allergies and intolerances. Hard exclusion in the picker, never relaxed by the fallback passes.';
comment on column profiles.nutrition_goal is
  'lose, maintain or gain. Drives the direction and size of the calorie offset in lib/nutrition.js.';

-- ============================================================================
-- Allergen and cost backfill
-- ============================================================================
--
-- Over-tagged where uncertain. Meatballs carry gluten and eggs because breadcrumbs and egg are
-- the usual binder even where a recipe does not say so. Soy sauce carries gluten because most
-- of it is brewed with wheat. Oats carry gluten because UK labelling treats them as a cereal
-- containing gluten unless certified otherwise. Mixed seeds carry sesame. Mayonnaise carries
-- mustard. None of these are certainties and all of them are the safe direction to guess in.

update meals set source = 'Jamie Oliver' where url like '%jamieoliver%' and source is null;

update meals set allergens = v.a, cost = v.c from (values
  ('chilli-con-carne',          '{}'::text[],                        'low'),
  ('salmon-veg-traybake',       '{fish,milk}'::text[],               'high'),
  ('hit-n-run-chicken',         '{}'::text[],                        'low'),
  ('easy-prawn-curry',          '{crustaceans}'::text[],             'high'),
  ('gochujang-chicken-noodles', '{gluten,soya,eggs,sesame}'::text[], 'mid'),
  ('salmon-sweet-potato',       '{fish}'::text[],                    'high'),
  ('bbq-chicken',               '{}'::text[],                        'mid'),
  ('chilli-meatballs',          '{gluten,eggs}'::text[],             'low'),
  ('slow-cooker-chilli',        '{}'::text[],                        'mid'),
  ('spring-chicken-traybake',   '{}'::text[],                        'mid'),
  ('salmon-nicoise',            '{fish,eggs}'::text[],               'high'),
  ('keralan-fish-curry',        '{fish,mustard}'::text[],            'high'),
  ('sesame-salmon',             '{fish,sesame,soya,gluten}'::text[], 'high'),
  ('sticky-orange-chicken',     '{soya,gluten}'::text[],             'mid'),
  ('eggs-smoked-salmon',        '{eggs,fish}'::text[],               'high'),
  ('yoghurt-whey-berries',      '{milk,nuts}'::text[],               'mid'),
  ('eggs-bacon-mushrooms',      '{eggs,gluten}'::text[],             'low'),
  ('omelette-feta-spinach',     '{eggs,milk}'::text[],               'low'),
  ('cottage-cheese-bowl',       '{milk,gluten,sesame}'::text[],      'low'),
  ('kipper-poached-egg',        '{fish,eggs}'::text[],               'mid'),
  ('whey-oats-banana',          '{milk,gluten}'::text[],             'low'),
  ('whey-yoghurt-quick',        '{milk}'::text[],                    'mid'),
  ('chicken-lentil-salad',      '{}'::text[],                        'mid'),
  ('tuna-egg-salad',            '{fish,eggs,mustard}'::text[],       'low'),
  ('leftovers',                 '{}'::text[],                        'low'),
  ('chicken-soup-flask',        '{celery}'::text[],                  'low'),
  ('prawn-avocado',             '{crustaceans}'::text[],             'high'),
  ('steak-salad',               '{milk}'::text[],                    'high')
) as v(slug, a, c) where meals.slug = v.slug;

-- ============================================================================
-- Joe Wicks, ten dinners
-- ============================================================================
--
-- A second source, requested. Weighted towards the cheap end because one of the three people
-- now on this feature is a student. Urls checked against the live site rather than assembled
-- from a pattern; the ingredient lists are ours, as with the Jamie Oliver set, so they scale to
-- a household and carry an aisle.
--
-- This takes dinners from 14 to 24. Against the preference-lift measurement in HANDOVER.md
-- that moves the learner from about 26 percent to somewhere near 45.

insert into meals (slug, name, slot, url, source, serves, kcal, protein_g, tags, effort, cost, allergens, ingredients) values
('jw-budget-chilli-beef','Budget crispy chilli beef','dinner','https://www.thebodycoach.com/blog/budget-crispy-chilli-beef/','Joe Wicks',4,540,38,'{beef,mince,chinese,budget,quick}','quick','low','{soya,gluten,sesame}',
 '[{"item":"beef mince 5%","qty":500,"unit":"g","aisle":"meat"},{"item":"soy sauce","qty":1,"unit":"","aisle":"cupboard"},{"item":"peppers","qty":2,"unit":"","aisle":"produce"},{"item":"spring onions","qty":1,"unit":"bunch","aisle":"produce"},{"item":"basmati rice","qty":300,"unit":"g","aisle":"cupboard"},{"item":"cornflour","qty":2,"unit":"tbsp","aisle":"cupboard"}]'::jsonb),
('jw-salt-pepper-chicken','Salt and pepper chicken stir fry','dinner','https://www.thebodycoach.com/blog/salt-and-pepper-chicken-stir-fry/','Joe Wicks',4,510,44,'{chicken,chinese,stir-fry,budget,quick}','quick','low','{soya,gluten}',
 '[{"item":"chicken thighs, boneless","qty":700,"unit":"g","aisle":"meat"},{"item":"peppers","qty":2,"unit":"","aisle":"produce"},{"item":"onions","qty":1,"unit":"","aisle":"produce"},{"item":"five spice and white pepper","qty":1,"unit":"","aisle":"cupboard"},{"item":"egg noodles","qty":300,"unit":"g","aisle":"cupboard"}]'::jsonb),
('jw-cauliflower-curry-traybake','One pan chicken and cauliflower curry traybake','dinner','https://www.thebodycoach.com/blog/one-pan-cauliflower-curry-traybake/','Joe Wicks',4,480,42,'{chicken,curry,traybake,batch,budget}','medium','low','{milk}',
 '[{"item":"chicken thighs, boneless","qty":700,"unit":"g","aisle":"meat"},{"item":"cauliflower","qty":1,"unit":"","aisle":"produce"},{"item":"curry powder","qty":2,"unit":"tbsp","aisle":"cupboard"},{"item":"natural yoghurt","qty":200,"unit":"g","aisle":"dairy"},{"item":"onions","qty":2,"unit":"","aisle":"produce"},{"item":"basmati rice","qty":300,"unit":"g","aisle":"cupboard"}]'::jsonb),
('jw-chicken-arrabbiata','Chicken arrabbiata with penne','dinner','https://www.thebodycoach.com/blog/chicken-arrabbiata-with-penne/','Joe Wicks',4,560,45,'{chicken,pasta,italian,budget,quick}','quick','low','{gluten}',
 '[{"item":"chicken breast","qty":700,"unit":"g","aisle":"meat"},{"item":"penne","qty":350,"unit":"g","aisle":"cupboard"},{"item":"chopped tomatoes","qty":2,"unit":"tins","aisle":"cupboard"},{"item":"peppers","qty":2,"unit":"","aisle":"produce"},{"item":"black olives","qty":80,"unit":"g","aisle":"cupboard"},{"item":"red chilli","qty":1,"unit":"","aisle":"produce"}]'::jsonb),
('jw-curry-meatball-pasta','Creamy curry meatball pasta','dinner','https://www.thebodycoach.com/blog/creamy-curry-meatball-pasta/','Joe Wicks',4,620,42,'{beef,meatball,pasta,budget}','medium','low','{gluten,eggs,milk}',
 '[{"item":"beef mince 5%","qty":500,"unit":"g","aisle":"meat"},{"item":"pasta","qty":350,"unit":"g","aisle":"cupboard"},{"item":"curry powder","qty":2,"unit":"tbsp","aisle":"cupboard"},{"item":"single cream","qty":150,"unit":"ml","aisle":"dairy"},{"item":"chopped tomatoes","qty":1,"unit":"tin","aisle":"cupboard"},{"item":"onions","qty":1,"unit":"","aisle":"produce"}]'::jsonb),
('jw-red-thai-turkey-meatballs','Red Thai turkey meatballs with rice','dinner','https://www.thebodycoach.com/blog/red-thai-turkey-meatballs-with-rice/','Joe Wicks',4,530,46,'{turkey,meatball,thai,batch}','medium','mid','{gluten,eggs,crustaceans}',
 '[{"item":"turkey mince","qty":600,"unit":"g","aisle":"meat"},{"item":"red Thai curry paste","qty":3,"unit":"tbsp","aisle":"cupboard"},{"item":"coconut milk","qty":1,"unit":"tin","aisle":"cupboard"},{"item":"basmati rice","qty":300,"unit":"g","aisle":"cupboard"},{"item":"fresh coriander","qty":1,"unit":"bunch","aisle":"produce"},{"item":"limes","qty":2,"unit":"","aisle":"produce"}]'::jsonb),
('jw-turkey-laksa','Turkey laksa','dinner','https://www.thebodycoach.com/blog/turkey-laksa/','Joe Wicks',4,540,44,'{turkey,noodle,malaysian,spicy}','medium','mid','{gluten,fish,crustaceans}',
 '[{"item":"turkey mince","qty":600,"unit":"g","aisle":"meat"},{"item":"laksa or Thai curry paste","qty":3,"unit":"tbsp","aisle":"cupboard"},{"item":"coconut milk","qty":1,"unit":"tin","aisle":"cupboard"},{"item":"fish sauce","qty":1,"unit":"","aisle":"cupboard"},{"item":"egg noodles","qty":300,"unit":"g","aisle":"cupboard"},{"item":"limes","qty":2,"unit":"","aisle":"produce"}]'::jsonb),
('jw-thai-turkey-burger','Thai turkey burger with slaw','dinner','https://www.thebodycoach.com/blog/thai-turkey-burger-with-slaw/','Joe Wicks',4,520,44,'{turkey,burger,thai,quick}','quick','mid','{gluten,eggs,mustard}',
 '[{"item":"turkey mince","qty":600,"unit":"g","aisle":"meat"},{"item":"burger buns","qty":4,"unit":"","aisle":"bakery"},{"item":"white cabbage","qty":1,"unit":"","aisle":"produce"},{"item":"carrots","qty":2,"unit":"","aisle":"produce"},{"item":"mango","qty":1,"unit":"","aisle":"produce"},{"item":"light mayonnaise","qty":2,"unit":"tbsp","aisle":"cupboard"}]'::jsonb),
('jw-salmon-creamy-lentils','Roasted salmon with creamy lentils','dinner','https://www.thebodycoach.com/blog/roasted-salmon-with-creamy-lentils/','Joe Wicks',4,560,44,'{salmon,fish,lentil,quick}','quick','high','{fish,milk}',
 '[{"item":"salmon fillets","qty":4,"unit":"","aisle":"fish"},{"item":"cooked lentils","qty":2,"unit":"pouches","aisle":"cupboard"},{"item":"spinach","qty":200,"unit":"g","aisle":"produce"},{"item":"creme fraiche","qty":150,"unit":"g","aisle":"dairy"},{"item":"lemons","qty":1,"unit":"","aisle":"produce"}]'::jsonb),
('jw-thai-green-prawns','Thai green curry bowl with prawns','dinner','https://www.thebodycoach.com/blog/thai-green-curry-bowl-with-prawns/','Joe Wicks',4,470,36,'{prawn,seafood,thai,curry,quick}','quick','high','{crustaceans,fish}',
 '[{"item":"raw king prawns","qty":500,"unit":"g","aisle":"fish"},{"item":"green Thai curry paste","qty":3,"unit":"tbsp","aisle":"cupboard"},{"item":"coconut milk","qty":1,"unit":"tin","aisle":"cupboard"},{"item":"tenderstem broccoli","qty":250,"unit":"g","aisle":"produce"},{"item":"basmati rice","qty":300,"unit":"g","aisle":"cupboard"},{"item":"limes","qty":2,"unit":"","aisle":"produce"}]'::jsonb)
on conflict (slug) do nothing;

-- ============================================================================
-- Who is on it
-- ============================================================================
--
-- Targets are left null for the two new accounts on purpose. The setup screen collects height,
-- weight, sex and activity and computes them. Guessing somebody's maintenance calories from
-- their screen name is not a thing this app is going to do, and the plan page sends an
-- unconfigured account to the form rather than showing a plan built on a default.
--
-- CEO-jamie is prefilled as gain and economical, which is what James said: he wants to build,
-- and he is at university. Everything else is his to enter.
--
-- The 18+ check is in lib/nutrition.js rather than here. It reads birth_year, fails closed on a
-- null, and is enforced on both nutrition screens. CEO-jamie is 19.

update profiles set nutrition_enabled = true where screen_name in ('CEO-jamie','Hampo8');
update profiles set nutrition_goal = 'gain', budget_pref = 'economical' where screen_name = 'CEO-jamie';

-- James's stats, so the calculator is the single source of truth rather than a hand-set number
-- sitting next to a formula that disagrees with it. targetsFor() computes 2050 against the 2000
-- written by hand earlier the same day, which is one rounding step and not worth two answers.
update profiles set
  nutrition_goal = 'lose', sex = 'male', height_cm = 175, activity_level = 'very',
  kcal_target = 2050, protein_target = 175
where screen_name = 'Hampo-1978';
