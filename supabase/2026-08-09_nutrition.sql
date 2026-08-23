-- APPLIED 2026-08-09 to project wctsiafaiogyciqnmvad.
--
-- NUTRITION. A weekly meal plan that learns what you actually eat.
--
-- GATED OFF BY DEFAULT, AND THAT IS THE POINT.
--
-- profiles.nutrition_enabled defaults to false and only James has it on. The six week test is
-- running right now and it exists to measure one thing: whether this app gets somebody to
-- session three. Drop a nutrition tab in front of twelve testers mid-block and the block end
-- report on 31 August stops being evidence about anything, because you can no longer say which
-- change moved the number. Turn it on for everyone after 10 September, when the test has
-- finished telling you what it was built to tell you.
--
-- FOUR TABLES, AND WHAT EACH IS FOR
--
--   meals        the shared library. Global, not per user. Readable by any signed-in user,
--                writable by nobody through the API.
--   meal_prefs   one like or dislike per person per meal. This is the whole learning signal.
--   meal_plans   which meals a person was given in a given week. Needed for the no-repeat
--                window, and needed so a plan does not silently reshuffle underneath somebody
--                who has already done the shopping.
--   plus four columns on profiles for the gate, the household size and the targets.
--
-- WHY THE PLAN IS STORED RATHER THAN COMPUTED ON EVERY LOAD
--
-- The picker is deterministic, seeded on user id and week start, so in principle it would
-- return the same week every time and could be pure. In practice it reads meal_prefs, and
-- meal_prefs changes the moment somebody presses dislike. A pure picker would therefore
-- rewrite Wednesday's dinner because you disliked Monday's, after you had already bought the
-- ingredients for it. The week is written once, on first view, and is then a fact.
--
-- WHY THE INGREDIENT LISTS ARE OURS AND NOT THE RECIPE SITE'S
--
-- Every meal links out to a real published recipe for the method, and those links are checked
-- rather than guessed. The ingredients stored here are written by us, deliberately, for two
-- reasons: they are scaled to the household rather than to whoever wrote the recipe, and they
-- carry an aisle so the shopping list can be sorted the way a supermarket is laid out. Treat
-- the link as the authority on how to cook it and this list as the authority on what to buy.
--
-- MACROS ARE ESTIMATES AND SAY SO.
--
-- kcal and protein_g are per serving and macros_estimated defaults to true. Nobody has put
-- these dishes through a lab. They are good enough to sort and to display with an "approx",
-- and they are NOT what controls intake. The weighed portion rule does that: 200g raw protein,
-- vegetables free, carbohydrate weighed. Do not let the number on the card start pretending to
-- a precision it has not got.

-- ============================================================================
-- Profile columns
-- ============================================================================

alter table profiles add column if not exists nutrition_enabled boolean not null default false;
-- How many people the dinner has to feed. Breakfast and lunch are always for one, because
-- nobody else in the house is on the plan.
alter table profiles add column if not exists household_size int not null default 1;
alter table profiles add column if not exists kcal_target int;
alter table profiles add column if not exists protein_target int;

alter table profiles add constraint profiles_household_size_check
  check (household_size between 1 and 12) not valid;
alter table profiles validate constraint profiles_household_size_check;

-- ============================================================================
-- meals
-- ============================================================================

create table if not exists meals (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  slot text not null,
  url text,
  serves int not null default 4,
  kcal int,
  protein_g int,
  macros_estimated boolean not null default true,
  -- Free-form and deliberately so. The picker scores on tag overlap, so adding a tag to a new
  -- meal immediately makes it comparable to everything already judged, with no migration.
  -- Keep them lowercase and singular. Primary protein first by convention.
  tags text[] not null default '{}',
  -- [{"item":"beef mince 5%","qty":500,"unit":"g","aisle":"meat"}]
  -- Quantities are per `serves`. The shopping list scales them to household_size.
  ingredients jsonb not null default '[]'::jsonb,
  effort text not null default 'medium',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint meals_slot_check check (slot in ('breakfast', 'lunch', 'dinner')),
  constraint meals_effort_check check (effort in ('quick', 'medium', 'slow')),
  constraint meals_serves_check check (serves between 1 and 12)
);

create index if not exists meals_slot_active_idx on meals (slot) where active;

-- ============================================================================
-- meal_prefs
-- ============================================================================
--
-- One row per person per meal, changed rather than appended, because "do you like this" has a
-- current answer rather than a history. week_start records when the judgement was made so a
-- verdict can be read against the week it came from later.
create table if not exists meal_prefs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  meal_id uuid not null references meals(id) on delete cascade,
  verdict text not null,
  week_start date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, meal_id),
  constraint meal_prefs_verdict_check check (verdict in ('like', 'dislike'))
);

create index if not exists meal_prefs_user_idx on meal_prefs (user_id);

-- ============================================================================
-- meal_plans
-- ============================================================================
--
-- week_start uses public.week_start(), so this rolls over on Sunday with the plan week, the
-- leaderboard and the streak. That is not a coincidence: the shopping list is meant to land on
-- the day the week turns, which is the day somebody is most likely to go to a supermarket.
create table if not exists meal_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  week_start date not null,
  -- {"dinners":["<meal_id>", ...7], "breakfasts":[...3], "lunches":[...3]}
  slots jsonb not null default '{}'::jsonb,
  shopped_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, week_start)
);

create index if not exists meal_plans_user_week_idx on meal_plans (user_id, week_start desc);

-- ============================================================================
-- Row level security
-- ============================================================================

alter table meals enable row level security;
alter table meal_prefs enable row level security;
alter table meal_plans enable row level security;

-- The library is shared and contains nothing personal, same argument as challenges. No insert,
-- update or delete policy exists, so it is read-only through the API and is maintained by
-- migration. A user-editable recipe library is a moderation problem nobody here has time for.
create policy "meals readable" on meals for select to authenticated using (true);

create policy "own meal_prefs select" on meal_prefs for select using ((select auth.uid()) = user_id);
create policy "own meal_prefs insert" on meal_prefs for insert with check ((select auth.uid()) = user_id);
create policy "own meal_prefs update" on meal_prefs for update using ((select auth.uid()) = user_id);
create policy "own meal_prefs delete" on meal_prefs for delete using ((select auth.uid()) = user_id);

create policy "own meal_plans select" on meal_plans for select using ((select auth.uid()) = user_id);
create policy "own meal_plans insert" on meal_plans for insert with check ((select auth.uid()) = user_id);
create policy "own meal_plans update" on meal_plans for update using ((select auth.uid()) = user_id);

-- ============================================================================
-- Seed: the library
-- ============================================================================
--
-- Fourteen dinners, six breakfasts, six lunches. Fourteen is the floor for a two week
-- no-repeat window on seven dinners a week, with nothing spare. The picker degrades rather
-- than deadlocks when exclusions leave it short, but the honest fix is more meals: this
-- library wants to be about thirty dinners before it stops feeling repetitive.
--
-- Every url was checked against the live site rather than assembled from a pattern.

insert into meals (slug, name, slot, url, serves, kcal, protein_g, tags, effort, ingredients) values

('chilli-con-carne', 'Chilli con carne', 'dinner',
 'https://www.jamieoliver.com/recipes/beef/good-old-chilli-con-carne/', 4, 520, 38,
 '{beef,mince,mexican,batch,freezable}', 'medium',
 '[{"item":"beef mince 5%","qty":600,"unit":"g","aisle":"meat"},
   {"item":"onions","qty":2,"unit":"","aisle":"produce"},
   {"item":"red peppers","qty":2,"unit":"","aisle":"produce"},
   {"item":"chopped tomatoes","qty":2,"unit":"tins","aisle":"cupboard"},
   {"item":"kidney beans","qty":1,"unit":"tin","aisle":"cupboard"},
   {"item":"basmati rice","qty":300,"unit":"g","aisle":"cupboard"},
   {"item":"cumin, chilli powder, cinnamon","qty":1,"unit":"","aisle":"cupboard"}]'::jsonb),

('salmon-veg-traybake', 'Roasted salmon and veg traybake', 'dinner',
 'https://www.jamieoliver.com/recipes/fish/roasted-salmon-summer-veg-traybake/', 4, 480, 42,
 '{salmon,fish,traybake,quick}', 'quick',
 '[{"item":"salmon fillets","qty":4,"unit":"","aisle":"fish"},
   {"item":"baby potatoes","qty":400,"unit":"g","aisle":"produce"},
   {"item":"green beans","qty":200,"unit":"g","aisle":"produce"},
   {"item":"cherry tomatoes","qty":200,"unit":"g","aisle":"produce"},
   {"item":"black olives","qty":10,"unit":"","aisle":"cupboard"},
   {"item":"fresh basil","qty":1,"unit":"bunch","aisle":"produce"},
   {"item":"Greek yoghurt","qty":4,"unit":"tbsp","aisle":"dairy"},
   {"item":"lemons","qty":2,"unit":"","aisle":"produce"}]'::jsonb),

('hit-n-run-chicken', 'Traybaked chicken with tomatoes and peppers', 'dinner',
 'https://www.jamieoliver.com/recipes/chicken/hit-n-run-traybaked-chicken/', 4, 540, 45,
 '{chicken,traybake,mediterranean}', 'medium',
 '[{"item":"chicken thighs, bone in","qty":8,"unit":"","aisle":"meat"},
   {"item":"cherry tomatoes","qty":400,"unit":"g","aisle":"produce"},
   {"item":"red peppers","qty":2,"unit":"","aisle":"produce"},
   {"item":"red onions","qty":2,"unit":"","aisle":"produce"},
   {"item":"garlic","qty":1,"unit":"bulb","aisle":"produce"},
   {"item":"new potatoes","qty":600,"unit":"g","aisle":"produce"}]'::jsonb),

('easy-prawn-curry', 'Easy prawn curry', 'dinner',
 'https://www.jamieoliver.com/recipes/curry/easy-prawn-curry/', 4, 460, 36,
 '{prawn,seafood,curry,indian,quick}', 'quick',
 '[{"item":"raw king prawns","qty":500,"unit":"g","aisle":"fish"},
   {"item":"curry paste","qty":3,"unit":"tbsp","aisle":"cupboard"},
   {"item":"coconut milk","qty":1,"unit":"tin","aisle":"cupboard"},
   {"item":"chopped tomatoes","qty":1,"unit":"tin","aisle":"cupboard"},
   {"item":"spinach","qty":200,"unit":"g","aisle":"produce"},
   {"item":"basmati rice","qty":300,"unit":"g","aisle":"cupboard"},
   {"item":"fresh coriander","qty":1,"unit":"bunch","aisle":"produce"}]'::jsonb),

('gochujang-chicken-noodles', 'Gochujang chicken noodle traybake', 'dinner',
 'https://www.jamieoliver.com/recipes/chicken/gochujang-chicken-noodle-traybake', 4, 610, 44,
 '{chicken,korean,noodle,traybake,spicy}', 'medium',
 '[{"item":"chicken thighs, boneless","qty":700,"unit":"g","aisle":"meat"},
   {"item":"gochujang paste","qty":3,"unit":"tbsp","aisle":"cupboard"},
   {"item":"egg noodles","qty":300,"unit":"g","aisle":"cupboard"},
   {"item":"spring onions","qty":1,"unit":"bunch","aisle":"produce"},
   {"item":"pak choi","qty":300,"unit":"g","aisle":"produce"},
   {"item":"sesame seeds","qty":1,"unit":"tbsp","aisle":"cupboard"}]'::jsonb),

('salmon-sweet-potato', 'Salmon and sweet potato traybake', 'dinner',
 'https://www.jamieoliver.com/recipes/fish/asian-salmon-sweet-potato-traybake/', 4, 550, 40,
 '{salmon,fish,traybake,asian}', 'medium',
 '[{"item":"salmon fillets","qty":4,"unit":"","aisle":"fish"},
   {"item":"sweet potatoes","qty":800,"unit":"g","aisle":"produce"},
   {"item":"coconut milk","qty":1,"unit":"tin","aisle":"cupboard"},
   {"item":"fresh ginger","qty":1,"unit":"thumb","aisle":"produce"},
   {"item":"limes","qty":2,"unit":"","aisle":"produce"},
   {"item":"tenderstem broccoli","qty":300,"unit":"g","aisle":"produce"}]'::jsonb),

('bbq-chicken', 'Barbecue chicken', 'dinner',
 'https://www.jamieoliver.com/recipes/chicken/the-best-bbq-chicken/', 4, 580, 48,
 '{chicken,roast,sunday,barbecue}', 'slow',
 '[{"item":"whole chicken","qty":1.6,"unit":"kg","aisle":"meat"},
   {"item":"smoked paprika","qty":1,"unit":"","aisle":"cupboard"},
   {"item":"new potatoes","qty":800,"unit":"g","aisle":"produce"},
   {"item":"corn on the cob","qty":4,"unit":"","aisle":"produce"},
   {"item":"salad leaves","qty":1,"unit":"bag","aisle":"produce"}]'::jsonb),

('chilli-meatballs', 'Chilli con carne meatballs', 'dinner',
 'https://www.jamieoliver.com/recipes/beef/chilli-con-carne-meatballs-with-sweet-peppers-black-beans/', 4, 540, 40,
 '{beef,mince,mexican,meatball}', 'medium',
 '[{"item":"beef mince 5%","qty":600,"unit":"g","aisle":"meat"},
   {"item":"black beans","qty":1,"unit":"tin","aisle":"cupboard"},
   {"item":"sweet peppers","qty":3,"unit":"","aisle":"produce"},
   {"item":"chopped tomatoes","qty":2,"unit":"tins","aisle":"cupboard"},
   {"item":"smoked paprika, chilli powder","qty":1,"unit":"","aisle":"cupboard"},
   {"item":"basmati rice","qty":300,"unit":"g","aisle":"cupboard"}]'::jsonb),

('slow-cooker-chilli', 'Slow cooker chilli con carne', 'dinner',
 'https://www.jamieoliver.com/recipes/beef/slow-cooker-chilli-con-carne/', 6, 500, 42,
 '{beef,brisket,mexican,slow-cooker,batch,freezable}', 'slow',
 '[{"item":"beef brisket","qty":1,"unit":"kg","aisle":"meat"},
   {"item":"black beans","qty":2,"unit":"tins","aisle":"cupboard"},
   {"item":"chopped tomatoes","qty":2,"unit":"tins","aisle":"cupboard"},
   {"item":"frozen mixed veg","qty":500,"unit":"g","aisle":"frozen"},
   {"item":"onions","qty":2,"unit":"","aisle":"produce"},
   {"item":"basmati rice","qty":300,"unit":"g","aisle":"cupboard"}]'::jsonb),

('spring-chicken-traybake', 'Spring chicken traybake', 'dinner',
 'https://www.jamieoliver.com/recipes/chicken/spring-chicken-traybake', 4, 500, 44,
 '{chicken,traybake,batch,light}', 'medium',
 '[{"item":"chicken thighs, boneless","qty":700,"unit":"g","aisle":"meat"},
   {"item":"new potatoes","qty":600,"unit":"g","aisle":"produce"},
   {"item":"asparagus","qty":250,"unit":"g","aisle":"produce"},
   {"item":"peas, frozen","qty":200,"unit":"g","aisle":"frozen"},
   {"item":"lemons","qty":2,"unit":"","aisle":"produce"},
   {"item":"fresh mint","qty":1,"unit":"bunch","aisle":"produce"}]'::jsonb),

('salmon-nicoise', 'Salmon nicoise', 'dinner',
 'https://www.jamieoliver.com/recipes/fish/salmon-nicoise/', 4, 470, 40,
 '{salmon,fish,salad,french,quick}', 'quick',
 '[{"item":"salmon fillets","qty":4,"unit":"","aisle":"fish"},
   {"item":"eggs","qty":4,"unit":"","aisle":"dairy"},
   {"item":"baby potatoes","qty":500,"unit":"g","aisle":"produce"},
   {"item":"green beans","qty":250,"unit":"g","aisle":"produce"},
   {"item":"black olives","qty":100,"unit":"g","aisle":"cupboard"},
   {"item":"salad leaves","qty":1,"unit":"bag","aisle":"produce"}]'::jsonb),

('keralan-fish-curry', 'Traybaked Keralan fish curry', 'dinner',
 'https://www.jamieoliver.com/recipes/fish/traybaked-keralan-fish-curry', 4, 490, 38,
 '{fish,white-fish,curry,indian,traybake}', 'medium',
 '[{"item":"white fish fillets","qty":600,"unit":"g","aisle":"fish"},
   {"item":"coconut milk","qty":1,"unit":"tin","aisle":"cupboard"},
   {"item":"curry leaves and mustard seeds","qty":1,"unit":"","aisle":"cupboard"},
   {"item":"fresh ginger","qty":1,"unit":"thumb","aisle":"produce"},
   {"item":"basmati rice","qty":300,"unit":"g","aisle":"cupboard"},
   {"item":"spinach","qty":200,"unit":"g","aisle":"produce"}]'::jsonb),

('sesame-salmon', 'Sesame seared salmon', 'dinner',
 'https://www.jamieoliver.com/recipes/fish/sesame-salmon/', 4, 460, 41,
 '{salmon,fish,asian,quick}', 'quick',
 '[{"item":"salmon fillets","qty":4,"unit":"","aisle":"fish"},
   {"item":"sesame seeds","qty":3,"unit":"tbsp","aisle":"cupboard"},
   {"item":"soy sauce","qty":1,"unit":"","aisle":"cupboard"},
   {"item":"tenderstem broccoli","qty":300,"unit":"g","aisle":"produce"},
   {"item":"basmati rice","qty":300,"unit":"g","aisle":"cupboard"},
   {"item":"limes","qty":2,"unit":"","aisle":"produce"}]'::jsonb),

('sticky-orange-chicken', 'Sticky orange chicken', 'dinner',
 'https://www.jamieoliver.com/recipes/chicken/sticky-orange-chicken/', 4, 520, 45,
 '{chicken,asian,quick,sticky}', 'quick',
 '[{"item":"chicken breast","qty":700,"unit":"g","aisle":"meat"},
   {"item":"oranges","qty":2,"unit":"","aisle":"produce"},
   {"item":"soy sauce","qty":1,"unit":"","aisle":"cupboard"},
   {"item":"tenderstem broccoli","qty":300,"unit":"g","aisle":"produce"},
   {"item":"basmati rice","qty":300,"unit":"g","aisle":"cupboard"},
   {"item":"spring onions","qty":1,"unit":"bunch","aisle":"produce"}]'::jsonb),

-- Breakfasts and lunches are assembly rather than cooking, so they carry no link. A recipe
-- card for "three eggs and some smoked salmon" is the sort of thing that makes an app feel
-- like it is padding. serves is 1 throughout: nobody else in the house is on the plan.

('eggs-smoked-salmon', 'Three eggs, smoked salmon, spinach', 'breakfast', null, 1, 430, 39,
 '{egg,salmon,fish,quick,no-cook}', 'quick',
 '[{"item":"eggs","qty":3,"unit":"","aisle":"dairy"},
   {"item":"smoked salmon","qty":100,"unit":"g","aisle":"fish"},
   {"item":"spinach","qty":80,"unit":"g","aisle":"produce"},
   {"item":"cherry tomatoes","qty":100,"unit":"g","aisle":"produce"}]'::jsonb),

('yoghurt-whey-berries', 'Greek yoghurt, whey, blueberries, almonds', 'breakfast', null, 1, 395, 50,
 '{dairy,quick,no-cook,sweet}', 'quick',
 '[{"item":"0% Greek yoghurt","qty":250,"unit":"g","aisle":"dairy"},
   {"item":"whey protein, plain","qty":30,"unit":"g","aisle":"cupboard"},
   {"item":"blueberries","qty":100,"unit":"g","aisle":"produce"},
   {"item":"flaked almonds","qty":15,"unit":"g","aisle":"cupboard"}]'::jsonb),

('eggs-bacon-mushrooms', 'Two eggs, grilled bacon, mushrooms, toast', 'breakfast', null, 1, 450, 38,
 '{egg,pork,quick}', 'quick',
 '[{"item":"eggs","qty":2,"unit":"","aisle":"dairy"},
   {"item":"smoked back bacon","qty":3,"unit":"rashers","aisle":"meat"},
   {"item":"mushrooms","qty":100,"unit":"g","aisle":"produce"},
   {"item":"wholemeal bread","qty":1,"unit":"slice","aisle":"bakery"}]'::jsonb),

('omelette-feta-spinach', 'Four egg omelette, feta and spinach', 'breakfast', null, 1, 440, 36,
 '{egg,dairy,vegetarian,quick}', 'quick',
 '[{"item":"eggs","qty":4,"unit":"","aisle":"dairy"},
   {"item":"feta","qty":40,"unit":"g","aisle":"dairy"},
   {"item":"spinach","qty":80,"unit":"g","aisle":"produce"}]'::jsonb),

('cottage-cheese-bowl', 'Cottage cheese, tomato, seeds, rye', 'breakfast', null, 1, 400, 38,
 '{dairy,vegetarian,no-cook,quick}', 'quick',
 '[{"item":"cottage cheese","qty":300,"unit":"g","aisle":"dairy"},
   {"item":"cherry tomatoes","qty":100,"unit":"g","aisle":"produce"},
   {"item":"mixed seeds","qty":15,"unit":"g","aisle":"cupboard"},
   {"item":"rye bread","qty":1,"unit":"slice","aisle":"bakery"}]'::jsonb),

('kipper-poached-egg', 'Kippers with a poached egg', 'breakfast', null, 1, 460, 42,
 '{fish,egg,quick}', 'quick',
 '[{"item":"kipper fillets","qty":150,"unit":"g","aisle":"fish"},
   {"item":"eggs","qty":1,"unit":"","aisle":"dairy"},
   {"item":"watercress","qty":50,"unit":"g","aisle":"produce"}]'::jsonb),

('chicken-lentil-salad', 'Chicken, lentil and big salad bowl', 'lunch', null, 1, 550, 52,
 '{chicken,salad,no-cook,batch}', 'quick',
 '[{"item":"chicken breast, cooked","qty":180,"unit":"g","aisle":"meat"},
   {"item":"cooked lentils","qty":1,"unit":"pouch","aisle":"cupboard"},
   {"item":"salad leaves","qty":1,"unit":"bag","aisle":"produce"},
   {"item":"cucumber","qty":1,"unit":"","aisle":"produce"},
   {"item":"olive oil and red wine vinegar","qty":1,"unit":"","aisle":"cupboard"}]'::jsonb),

('tuna-egg-salad', 'Tuna, two eggs and salad', 'lunch', null, 1, 520, 55,
 '{fish,tuna,egg,salad,no-cook,cheap}', 'quick',
 '[{"item":"tuna in spring water","qty":2,"unit":"tins","aisle":"cupboard"},
   {"item":"eggs","qty":2,"unit":"","aisle":"dairy"},
   {"item":"salad leaves","qty":1,"unit":"bag","aisle":"produce"},
   {"item":"light mayonnaise","qty":1,"unit":"tbsp","aisle":"cupboard"}]'::jsonb),

('leftovers', 'Last night''s dinner, boxed', 'lunch', null, 1, 550, 50,
 '{leftovers,no-cook,cheap,quick}', 'quick', '[]'::jsonb),

('chicken-soup-flask', 'Chicken and vegetable soup, flask', 'lunch', null, 1, 480, 45,
 '{chicken,soup,batch,warm}', 'medium',
 '[{"item":"chicken breast","qty":180,"unit":"g","aisle":"meat"},
   {"item":"chicken stock","qty":500,"unit":"ml","aisle":"cupboard"},
   {"item":"carrots, celery, leek","qty":1,"unit":"","aisle":"produce"},
   {"item":"cooked lentils","qty":1,"unit":"pouch","aisle":"cupboard"}]'::jsonb),

('prawn-avocado', 'Prawn and avocado plate', 'lunch', null, 1, 520, 44,
 '{prawn,seafood,no-cook,quick}', 'quick',
 '[{"item":"cooked king prawns","qty":200,"unit":"g","aisle":"fish"},
   {"item":"avocado","qty":1,"unit":"","aisle":"produce"},
   {"item":"salad leaves","qty":1,"unit":"bag","aisle":"produce"},
   {"item":"lemons","qty":1,"unit":"","aisle":"produce"}]'::jsonb),

('steak-salad', 'Cold steak and rocket salad', 'lunch', null, 1, 560, 52,
 '{beef,steak,salad,no-cook}', 'quick',
 '[{"item":"sirloin steak","qty":200,"unit":"g","aisle":"meat"},
   {"item":"rocket","qty":1,"unit":"bag","aisle":"produce"},
   {"item":"cherry tomatoes","qty":100,"unit":"g","aisle":"produce"},
   {"item":"parmesan","qty":15,"unit":"g","aisle":"dairy"}]'::jsonb),

-- Whey, added the same day on request. PLAIN whey only, and that is a Crohn's decision rather
-- than a taste one: flavoured powders and every protein bar on the shelf are sweetened with
-- sugar alcohols, which are a reliable way to produce gut symptoms that then get misread as
-- something far more worrying. The post-training shake is not in here at all. It is a standing
-- line on the nutrition page instead, because it is not a choice between options, it is the
-- same thing after every session.

('whey-oats-banana', 'Whey, oats and banana', 'breakfast', null, 1, 470, 45,
 '{whey,oats,quick,training-day,sweet}', 'quick',
 '[{"item":"whey protein, plain","qty":40,"unit":"g","aisle":"cupboard"},
   {"item":"porridge oats","qty":50,"unit":"g","aisle":"cupboard"},
   {"item":"banana","qty":1,"unit":"","aisle":"produce"},
   {"item":"semi-skimmed milk","qty":200,"unit":"ml","aisle":"dairy"}]'::jsonb),

('whey-yoghurt-quick', 'Whey and yoghurt, out the door', 'breakfast', null, 1, 380, 52,
 '{whey,dairy,no-cook,quick}', 'quick',
 '[{"item":"whey protein, plain","qty":40,"unit":"g","aisle":"cupboard"},
   {"item":"0% Greek yoghurt","qty":200,"unit":"g","aisle":"dairy"},
   {"item":"blueberries","qty":80,"unit":"g","aisle":"produce"}]'::jsonb)

on conflict (slug) do nothing;

-- ============================================================================
-- Turn it on for James only
-- ============================================================================
--
-- Targets from the Mifflin-St Jeor calculation on 2026-08-09: 101kg, 175cm, 48, male, BMR
-- 1,869, maintenance about 2,900 at six-plus sessions a week. 2,000 rather than the 1,800 a
-- literal 1kg a week implies, because 1,800 is below his own BMR and the first thing to break
-- would be the training block this app exists to run.
update profiles
set nutrition_enabled = true,
    household_size = 5,
    kcal_target = 2000,
    protein_target = 175
where screen_name = 'Hampo-1978';
