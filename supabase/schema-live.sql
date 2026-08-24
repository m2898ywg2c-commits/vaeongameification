-- ============================================================================
-- Vaeon Fitness: live database snapshot.
-- Project "Intent" (wctsiafaiogyciqnmvad), Postgres 17.6, eu-west-1.
-- Captured 2026-07-30. REGENERATED IN FULL 2026-08-09 from pg_catalog, then amended the same
-- day for push_enabled and the three nutrition tables. Column lists verified against
-- pg_catalog programmatically rather than by eye: profiles 40, meals 17, meal_prefs 7,
-- meal_plans 6, all matching.
-- ============================================================================
--
-- WHAT THIS IS
--
-- A reconstruction of the actual public schema, read out of pg_catalog. It exists because the
-- hand-written migrations in this folder had drifted: several tables and every RLS policy and
-- function had only ever been created in the Supabase dashboard, so the repo could not rebuild
-- the database. That became a real problem when a leaderboard bug turned out to hinge on
-- training_sessions, a table that appeared nowhere in version control.
--
-- WHAT CHANGED IN THE 2026-08-09 REGENERATION
--
-- The previous capture was 30 July and had gone eleven days stale, which is roughly the
-- fortnight the old header warned about. Missing from it entirely: exercise_prefs,
-- set_feedback, streak_freezes, challenges, push_subscriptions and body_metrics, the
-- distance_km / duration_min / side / log_date columns on exercise_logs, the tested_load /
-- tested_reps / tested_at columns on lift_maxes, eight columns on profiles, both unique
-- de-duplication indexes, the profiles trigger, and six functions.
--
-- Regenerating it was not bookkeeping. It surfaced three live defects nobody had reported:
-- due_reminders was still on ISO Mondays, due_reminders and current_challenge were still
-- counting rows rather than sessions, and session_key was executable by anon. All three are
-- fixed and all three are described where they occur below.
--
-- HOW TO USE IT
--
-- Read it as documentation and as a rebuild path for a fresh environment. Do NOT run it
-- against a database that already has data: it is written with `if not exists` guards, so it
-- is safe in the sense of not dropping anything, but it will not migrate an existing schema
-- either.
--
-- Ongoing changes still belong in their own dated migration file, the way gymready.sql and
-- 2026-08-09_session_key.sql do. When you add one, update this snapshot too or it drifts
-- again within a fortnight. It did.
--
-- **Regenerate this by querying pg_catalog, never by reading the migration files.** Two of the
-- three defects above were invisible to a repo-wide grep and obvious in one catalogue query.
--
-- NOT INCLUDED: the auth schema (Supabase manages it), storage, realtime publications, and
-- pgcrypto for gen_random_uuid, which is present on every Supabase project.

-- ============================================================================
-- TABLES
-- ============================================================================

-- The root record. One row per auth user, cascade-deleted with them, which is what makes
-- deleting a test account clean: everything below hangs off this.
create table if not exists profiles (
  id uuid primary key references auth.users on delete cascade,
  screen_name text not null unique,
  age_group text,
  created_at timestamptz default now(),
  goals jsonb not null default '[]'::jsonb,
  sessions_per_week int not null default 3,
  -- Defaulted to CURRENT_DATE as of leaderboard_block_start.sql. Before that it was nullable
  -- with no default, and get_leaderboard() treated a null as "the block starts today", which
  -- silently discarded everyone's history nightly.
  block_start date default current_date,
  block_number int not null default 1,
  baseline_bench numeric,
  baseline_squat numeric,
  equipment text not null default 'gym'::text,
  theme text not null default 'dark'::text,
  fixed_days boolean not null default true,
  train_days jsonb default '[]'::jsonb,
  birth_year int,
  framing text,
  framing_score int,
  chronotype text,
  kudos_cleared_at timestamptz,
  -- Per user rather than derived from the goal, so an individual's block length survives a
  -- change of goal. Eight weeks for Gym ready, six for everything else.
  block_weeks int not null default 6,
  disclaimer_accepted_at timestamptz,
  disclaimer_version text,
  reminder_enabled boolean not null default false,
  reminder_hour int,
  reminder_minute int not null default 0,
  reminder_tz text,
  last_reminded_at timestamptz,
  -- Nullable on purpose. Null means "never asked", which is not the same as "said no", and
  -- every reader coalesces it to true. See leaderboard_opt_in.sql.
  leaderboard_opt_in boolean,
  -- Streak insurance. Currency rather than a setting, which is why the trigger below refuses
  -- to let a client write it.
  freeze_credits int not null default 1,
  -- Push rollout gate, operator controlled. NOT the same thing as reminder_enabled, which is
  -- the user's own preference. Gating by flipping reminder_enabled would silently override a
  -- choice somebody made themselves. Only push is gated; the in-app reminder reaches everyone.
  push_enabled boolean not null default false,
  -- Nutrition. nutrition_enabled is the pilot gate; the 18+ check is separate and lives in
  -- lib/nutrition.js, because this flag is a rollout decision that could be opened to everybody
  -- without anybody stopping to think about who "everybody" includes.
  nutrition_enabled boolean not null default false,
  nutrition_goal text,
  -- How many the evening meal feeds. Breakfast and lunch are always for one.
  household_size int not null default 1,
  kcal_target int,
  protein_target int,
  height_cm int,
  -- Only read by the Mifflin-St Jeor calculation, which differs by sex. Nothing else uses it.
  sex text,
  activity_level text,
  -- Declared allergies. Hard exclusion in the picker, never relaxed by the fallback passes.
  allergens text[] not null default '{}',
  budget_pref text not null default 'any',
  constraint profiles_household_size_check check (household_size between 1 and 12),
  constraint profiles_nutrition_goal_check check (nutrition_goal is null or nutrition_goal in ('lose','maintain','gain')),
  constraint profiles_sex_check check (sex is null or sex in ('male','female')),
  constraint profiles_activity_check check (activity_level is null or activity_level in ('sedentary','light','moderate','very','extra')),
  constraint profiles_budget_check check (budget_pref in ('any','economical')),
  constraint profiles_height_check check (height_cm is null or height_cm between 100 and 250),
  constraint profiles_block_weeks_sane check (block_weeks is null or (block_weeks between 4 and 12)),
  constraint profiles_freeze_credits_check check (freeze_credits >= 0),
  constraint profiles_reminder_hour_check check (reminder_hour is null or (reminder_hour between 0 and 23)),
  constraint profiles_reminder_minute_check check (reminder_minute between 0 and 59)
);

-- Personality assessment output. Multiple rows per user are expected and normal: retaking the
-- assessment appends, and every reader takes the most recent by completed_at.
--
-- NOTE: `goals` is an empty array on every row and is written as '[]' by the assessment. It is
-- either populated or dropped, and it has been in that state since July.
create table if not exists assessment_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  type_id text not null,
  goals jsonb not null default '[]'::jsonb,
  structure_score int not null default 0,
  orientation_score int not null default 0,
  social_score int not null default 0,
  completed_at timestamptz default now()
);

-- One row per completed session. This is the leaderboard's unit of account, what the challenge
-- totals, and what the streak maths reads.
--
-- WHAT COUNTS AS ONE SESSION IS NOT count(*). See session_key() below. A row is written every
-- time a plan day is completed, so the same push day completed on four days in one week is
-- four rows and one session. Four functions used to disagree about this.
--
-- day_key is the plan day ("st-squat", "hyrox-push"). Null on quick logs from /log and on
-- everything written before the column existed.
--
-- session_date is the UTC date, and it is what the unique index and the delete guard both key
-- on. They have to agree: the guards originally used local midnight while the column defaulted
-- to the UTC date, so for anyone on BST a re-complete between midnight and 1am wrote into
-- yesterday, the delete missed the earlier rows and the insert then collided with the index.
create table if not exists training_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  session_type text not null,
  duration_min int not null default 30,
  effort int not null default 3,
  note text,
  logged_at timestamptz default now(),
  day_key text,
  session_date date not null default ((now() at time zone 'utc'::text))::date,
  constraint training_sessions_effort_check check (effort between 1 and 5)
);

-- Set-level detail. weight/reps for lifts, time_text for holds, distance_km and duration_min
-- for endurance, side for anything prescribed per side.
--
-- The three endurance columns were added and written on 4 August and the read path was not
-- updated the same day, so logged endurance work displayed nothing for a fortnight. time_text
-- survives as a fallback for rows written before they existed.
create table if not exists exercise_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  day_key text not null,
  exercise text not null,
  set_index int not null default 1,
  weight numeric,
  reps int,
  time_text text,
  logged_at timestamptz default now(),
  distance_km numeric,
  duration_min numeric,
  side text,
  log_date date not null default ((now() at time zone 'utc'::text))::date,
  constraint exercise_logs_side_check check (side is null or side in ('left', 'right'))
);

-- Body measurements. Every column except bodyweight is optional and mostly unused.
create table if not exists body_metrics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  bodyweight numeric,
  chest numeric,
  waist numeric,
  hips numeric,
  thigh numeric,
  arm numeric,
  logged_at timestamptz default now()
);

-- Unique on (user_id, code) so an achievement cannot be earned twice.
create table if not exists achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  code text not null,
  earned_at timestamptz default now(),
  unique (user_id, code)
);

-- One kudos per person per person, changeable. The unique constraint is what makes it a
-- gesture rather than a score: you cannot farm the same person for a hundred claps.
create table if not exists kudos (
  id uuid primary key default gen_random_uuid(),
  from_user uuid not null references profiles(id) on delete cascade,
  to_user uuid not null references profiles(id) on delete cascade,
  emoji text not null default '👏'::text,
  created_at timestamptz default now(),
  -- A fixed vocabulary rather than free text. Free text between strangers in a fitness app is
  -- a moderation problem nobody here has the time to run.
  note_code text,
  unique (from_user, to_user),
  constraint kudos_note_code_check check (
    note_code is null or note_code in
    ('consistent','strong_week','inspiring','keep_going','welcome','comeback','respect','big_lift')
  )
);

-- Note the SET NULL rather than CASCADE: deleting a user anonymises their feedback instead of
-- destroying it. The feedback is the most useful thing in this database and it should outlive
-- the account that gave it.
create table if not exists feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete set null,
  message text not null,
  created_at timestamptz default now()
);

-- Estimated one-rep maxes, learned from what was actually logged. Upserted by record_lift_max
-- and record_lift_test, both of which ratchet est_max upwards and never down.
--
-- tested_load / tested_reps / tested_at record the actual set behind the estimate, which is
-- what the progression engine wanted all along: a percentage of a derived one-rep max means
-- nothing until you know how many times it was lifted.
create table if not exists lift_maxes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  exercise text not null,
  est_max numeric not null,
  updated_at timestamptz default now(),
  tested_load numeric,
  tested_reps int,
  tested_at timestamptz,
  unique (user_id, exercise)
);

-- "Not for me". One row per exercise a person has asked to stop being given.
--
-- THE DELETE POLICY EXISTS AND NOTHING CALLS IT. A mis-tap permanently removes a lift from a
-- plan with no route back. A list in Settings is the outstanding job, and it should be done
-- before anybody leans on this feature.
create table if not exists exercise_prefs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  exercise text not null,
  reason text not null,
  created_at timestamptz default now(),
  unique (user_id, exercise),
  constraint exercise_prefs_reason_check check (reason in ('dislike', 'no_kit', 'hurts'))
);

-- Was the prescribed load right? Three answers, one per exercise per plan day.
--
-- OUTSTANDING: this needs a test_week flag. In the testing week there is no prescription, so
-- "too heavy" means "I chose badly", which is a fact about the user rather than about the
-- programme. Both currently land in the same column and will poison the signal this table
-- exists to collect.
create table if not exists set_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  day_key text not null,
  exercise text not null,
  verdict text not null,
  logged_at timestamptz default now(),
  unique (user_id, day_key, exercise),
  constraint set_feedback_verdict_check check (verdict in ('easy', 'right', 'hard'))
);

-- Does this type still sound like you? Two rows so far. Ask everyone at block end: if types do
-- not separate on adherence, the model is decoration, and that is worth knowing before more is
-- built on top of it.
create table if not exists type_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  type_id text not null,
  score int not null,
  created_at timestamptz default now(),
  unique (user_id, type_id),
  constraint type_feedback_score_check check (score between 1 and 5)
);

-- A week the pledge was missed but the streak survives. See streak_freeze.sql: a streak that
-- resets to zero for one bad week punishes illness, travel and ordinary life, and the fear of
-- losing a long run is itself a reason to stop trying.
--
-- Written only by settle_streak_freezes, which is why profiles.freeze_credits is trigger
-- protected: without that, a client could grant itself unlimited insurance.
create table if not exists streak_freezes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  week_start date not null,
  created_at timestamptz not null default now(),
  unique (user_id, week_start)
);

-- Group challenges. No user_id: a challenge is global and participation is inferred from
-- sessions logged inside the window, so there is nothing to join and nothing to opt into.
create table if not exists challenges (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  blurb text,
  kind text not null default 'collective'::text,
  target int not null,
  starts_on date not null,
  ends_on date not null,
  created_at timestamptz not null default now(),
  constraint challenges_kind_check check (kind in ('collective', 'personal')),
  constraint challenges_target_check check (target > 0),
  constraint challenges_check check (ends_on >= starts_on)
);

-- Web push endpoints. One per device, hence the unique on (user_id, endpoint).
--
-- The sender is written but NOT DEPLOYED. It needs a VAPID key pair as edge function secrets,
-- NEXT_PUBLIC_VAPID_PUBLIC_KEY in Vercel and a pg_cron schedule. Instructions are in the
-- header of supabase/functions/send-reminders/index.ts. The in-app reminder works for
-- everyone regardless, so this is not blocking.
create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  last_ok_at timestamptz,
  last_error text,
  unique (user_id, endpoint)
);

-- Product analytics. SET NULL rather than CASCADE, same argument as feedback: a deleted
-- account should not silently rewrite the funnel it was part of.
--
-- This table exists to answer five questions about the six-week test: where the funnel leaks,
-- whether people come back, whether type predicts adherence or is decoration, whether reminders
-- work, and whether freestyle types behave differently now the plan stops pretending.
create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete set null,
  name text not null,
  type_id text,
  framing text,
  session_id text,
  local_hour int,
  props jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint events_local_hour_check check (local_hour is null or (local_hour between 0 and 23))
);

-- ---------------------------------------------------------------------------
-- NUTRITION. Three tables, added 2026-08-09.
-- ---------------------------------------------------------------------------

-- The shared recipe library. Global rather than per user, and READ ONLY through the API:
-- there is no insert, update or delete policy on it at all. A user-editable recipe library is
-- a moderation problem nobody here has time to run. It is maintained by migration.
--
-- allergens is over-tagged where uncertain, on purpose. Removing a meal somebody could have
-- eaten is an annoyance; serving one they cannot is not. That asymmetry decides every default.
--
-- kcal and protein_g are ESTIMATES and macros_estimated says so. Nobody has put these dishes
-- through a lab. They are good enough to sort and display with an "approx", and they are not
-- what controls intake: the weighed portion rule on the nutrition page does that.
--
-- ingredients are OURS rather than the linked recipe's, deliberately, so they scale to a
-- household and carry an aisle. Treat the link as the authority on how to cook it and this list
-- as the authority on what to buy.
create table if not exists meals (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  slot text not null,
  url text,
  source text,
  serves int not null default 4,
  kcal int,
  protein_g int,
  macros_estimated boolean not null default true,
  tags text[] not null default '{}',
  allergens text[] not null default '{}',
  cost text not null default 'mid',
  ingredients jsonb not null default '[]'::jsonb,
  effort text not null default 'medium',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint meals_slot_check check (slot in ('breakfast', 'lunch', 'dinner')),
  constraint meals_effort_check check (effort in ('quick', 'medium', 'slow')),
  constraint meals_cost_check check (cost in ('low', 'mid', 'high')),
  constraint meals_serves_check check (serves between 1 and 12)
);

-- One verdict per person per meal, changed rather than appended: "do you like this" has a
-- current answer rather than a history. This is the entire learning signal.
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

-- The week that was actually issued. Stored rather than recomputed because the picker reads
-- preferences, and preferences change the moment somebody presses dislike: a recomputing plan
-- would rewrite Thursday's dinner because you disliked Monday's, after you had already bought
-- Thursday's ingredients. Verdicts land the following Sunday, which is when you next shop.
create table if not exists meal_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  week_start date not null,
  slots jsonb not null default '{}'::jsonb,
  shopped_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, week_start)
);

-- ============================================================================
-- INDEXES
-- ============================================================================
--
-- The two unique indexes are de-duplication guards, not performance. Both exist because a bare
-- insert plus an impatient thumb produced real corruption in live data: 37 of 151 exercise_logs
-- rows were surplus, and one Tuesday held twelve "Chest & Push" session rows written across
-- forty eight minutes.

-- One row per set, per exercise, per day. COALESCE on side because a per-side exercise
-- legitimately writes two rows for the same set index and NULLs do not collide in a unique
-- index, which would have left the guard silently off for exactly those rows.
create unique index if not exists exercise_logs_one_per_set
  on exercise_logs (user_id, log_date, day_key, exercise, set_index, coalesce(side, ''));

-- One session per plan day per day. Partial, because a null day_key is a quick log and two
-- quick logs on one day are two genuine entries rather than a duplicate.
create unique index if not exists training_sessions_one_plan_session_per_day
  on training_sessions (user_id, session_date, day_key) where day_key is not null;

create index if not exists exercise_logs_user_logged_idx on exercise_logs (user_id, logged_at desc);
create index if not exists training_sessions_user_logged_idx on training_sessions (user_id, logged_at desc);
create index if not exists assessment_results_user_idx on assessment_results (user_id);
create index if not exists body_metrics_user_idx on body_metrics (user_id);
create index if not exists exercise_prefs_user on exercise_prefs (user_id);
create index if not exists feedback_user_idx on feedback (user_id);
create index if not exists kudos_to_user_idx on kudos (to_user);
create index if not exists push_subscriptions_user_idx on push_subscriptions (user_id);
create index if not exists set_feedback_user_exercise on set_feedback (user_id, exercise);
create index if not exists streak_freezes_user_idx on streak_freezes (user_id, week_start desc);
create index if not exists events_user_created_idx on events (user_id, created_at desc);
create index if not exists events_name_created_idx on events (name, created_at desc);
create index if not exists events_type_name_idx on events (type_id, name) where type_id is not null;
create index if not exists meals_slot_active_idx on meals (slot) where active;
create index if not exists meal_prefs_user_idx on meal_prefs (user_id);
create index if not exists meal_plans_user_week_idx on meal_plans (user_id, week_start desc);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
--
-- Every table has RLS on, and every policy is "you can only see your own rows". Cross-user
-- reads happen exclusively through the SECURITY DEFINER functions further down, which is what
-- keeps the leaderboard possible without opening profiles to everybody.
--
-- Three tables break the "own rows" shape and each has a reason:
--   kudos      keyed on from_user, so you see and change what you SENT, never what you were
--              given. Incoming kudos come back through get_my_kudos().
--   feedback   insert only. Nobody reads their own feedback back, including the sender.
--   challenges readable by every authenticated user. A challenge is public by nature and
--              contains nothing personal.

alter table profiles            enable row level security;
alter table assessment_results  enable row level security;
alter table training_sessions   enable row level security;
alter table exercise_logs       enable row level security;
alter table body_metrics        enable row level security;
alter table achievements        enable row level security;
alter table kudos               enable row level security;
alter table feedback            enable row level security;
alter table lift_maxes          enable row level security;
alter table exercise_prefs      enable row level security;
alter table set_feedback        enable row level security;
alter table type_feedback       enable row level security;
alter table streak_freezes      enable row level security;
alter table challenges          enable row level security;
alter table push_subscriptions  enable row level security;
alter table events              enable row level security;
alter table meals               enable row level security;
alter table meal_prefs          enable row level security;
alter table meal_plans          enable row level security;

-- Note the `(select auth.uid())` wrapping throughout rather than a bare auth.uid(). It lets
-- the planner evaluate the call once per query instead of once per row.

create policy "Users can view their own profile"   on profiles for select using ((select auth.uid()) = id);
create policy "Users can insert their own profile" on profiles for insert with check ((select auth.uid()) = id);
create policy "Users can update their own profile" on profiles for update using ((select auth.uid()) = id);

create policy "Users can view their own assessment results"   on assessment_results for select using ((select auth.uid()) = user_id);
create policy "Users can insert their own assessment results" on assessment_results for insert with check ((select auth.uid()) = user_id);
create policy "Users can update their own assessment results" on assessment_results for update using ((select auth.uid()) = user_id);

create policy "Users can view their own sessions"   on training_sessions for select using ((select auth.uid()) = user_id);
create policy "Users can insert their own sessions" on training_sessions for insert with check ((select auth.uid()) = user_id);
create policy "Users can delete their own sessions" on training_sessions for delete using ((select auth.uid()) = user_id);

create policy "own exercise logs select" on exercise_logs for select using ((select auth.uid()) = user_id);
create policy "own exercise logs insert" on exercise_logs for insert with check ((select auth.uid()) = user_id);
create policy "own exercise logs delete" on exercise_logs for delete using ((select auth.uid()) = user_id);

create policy "own body metrics select" on body_metrics for select using ((select auth.uid()) = user_id);
create policy "own body metrics insert" on body_metrics for insert with check ((select auth.uid()) = user_id);
create policy "own body metrics delete" on body_metrics for delete using ((select auth.uid()) = user_id);

create policy "own achievements select" on achievements for select using ((select auth.uid()) = user_id);
create policy "own achievements insert" on achievements for insert with check ((select auth.uid()) = user_id);

create policy "own lift_maxes select" on lift_maxes for select using ((select auth.uid()) = user_id);
create policy "own lift_maxes insert" on lift_maxes for insert with check ((select auth.uid()) = user_id);
create policy "own lift_maxes update" on lift_maxes for update using ((select auth.uid()) = user_id);

create policy "own exercise_prefs select" on exercise_prefs for select using ((select auth.uid()) = user_id);
create policy "own exercise_prefs insert" on exercise_prefs for insert with check ((select auth.uid()) = user_id);
create policy "own exercise_prefs update" on exercise_prefs for update using ((select auth.uid()) = user_id);
create policy "own exercise_prefs delete" on exercise_prefs for delete using ((select auth.uid()) = user_id);

create policy "own set_feedback select" on set_feedback for select using ((select auth.uid()) = user_id);
create policy "own set_feedback insert" on set_feedback for insert with check ((select auth.uid()) = user_id);
create policy "own set_feedback update" on set_feedback for update using ((select auth.uid()) = user_id);
create policy "own set_feedback delete" on set_feedback for delete using ((select auth.uid()) = user_id);

create policy "own type_feedback select" on type_feedback for select using ((select auth.uid()) = user_id);
create policy "own type_feedback insert" on type_feedback for insert with check ((select auth.uid()) = user_id);
create policy "own type_feedback update" on type_feedback for update using ((select auth.uid()) = user_id);

create policy "own streak_freezes select" on streak_freezes for select using ((select auth.uid()) = user_id);
create policy "own streak_freezes insert" on streak_freezes for insert with check ((select auth.uid()) = user_id);

create policy "own push_subscriptions select" on push_subscriptions for select using ((select auth.uid()) = user_id);
create policy "own push_subscriptions insert" on push_subscriptions for insert with check ((select auth.uid()) = user_id);
create policy "own push_subscriptions delete" on push_subscriptions for delete using ((select auth.uid()) = user_id);

create policy "own events select" on events for select using ((select auth.uid()) = user_id);
create policy "own events insert" on events for insert with check ((select auth.uid()) = user_id);

-- Kudos are keyed on from_user, so you can see and change what you sent, never what you were
-- given. Incoming kudos arrive through get_my_kudos().
create policy "own kudos select" on kudos for select using ((select auth.uid()) = from_user);
create policy "own kudos insert" on kudos for insert with check ((select auth.uid()) = from_user);
create policy "own kudos update" on kudos for update using ((select auth.uid()) = from_user);
create policy "own kudos delete" on kudos for delete using ((select auth.uid()) = from_user);

-- Insert only. Nobody reads their own feedback back, including the sender.
create policy "own feedback insert" on feedback for insert with check ((select auth.uid()) = user_id);

-- Public by nature and contains nothing personal.
create policy "challenges readable" on challenges for select to authenticated using (true);

-- Same argument as challenges. Note there is no insert, update or delete policy: the library
-- is read only through the API and is maintained by migration.
create policy "meals readable" on meals for select to authenticated using (true);

create policy "own meal_prefs select" on meal_prefs for select using ((select auth.uid()) = user_id);
create policy "own meal_prefs insert" on meal_prefs for insert with check ((select auth.uid()) = user_id);
create policy "own meal_prefs update" on meal_prefs for update using ((select auth.uid()) = user_id);
create policy "own meal_prefs delete" on meal_prefs for delete using ((select auth.uid()) = user_id);

create policy "own meal_plans select" on meal_plans for select using ((select auth.uid()) = user_id);
create policy "own meal_plans insert" on meal_plans for insert with check ((select auth.uid()) = user_id);
create policy "own meal_plans update" on meal_plans for update using ((select auth.uid()) = user_id);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================
--
-- Seven are SECURITY DEFINER because they deliberately cross the RLS boundary. Every one sets
-- search_path explicitly: a definer function without a pinned search_path can be hijacked by a
-- caller who creates a same-named object in a schema earlier on the path.

-- THE WEEK BOUNDARY. Sunday, at James's request.
--
-- date_trunc('week', ...) is ISO and always returns Monday, with no setting to change it, so
-- the SQL side needs its own helper: shift forward a day, truncate, shift back. This and
-- WEEK_STARTS_ON in lib/week.js are the only two definitions. To move the week, change both.
--
-- This is the ONLY function in this schema whose body may contain date_trunc('week'). If a
-- catalogue query finds a second, that second one is a bug: on a Sunday, ISO returns the
-- Monday six days ago, so any "this week" built on it counts the week that has just ended.
-- due_reminders did exactly that until 2026-08-09.
create or replace function public.week_start(d date)
returns date language sql immutable
set search_path to 'public', 'pg_temp'
as $$
  select (date_trunc('week', d + interval '1 day') - interval '1 day')::date;
$$;

-- WHAT COUNTS AS ONE SESSION IN A WEEK. Added 2026-08-09.
--
-- Four functions counted rows, and a row is written every time a plan day is completed. The
-- same push session completed on four different days filled a four-session pledge on its own,
-- and the progress chart drew a bar of ten against a pledge line of four for a week containing
-- five days of training. A pledge is a number of sessions FROM THE PLAN, and the plan has four
-- slots in it.
--
-- A null day_key is a quick log and cannot be proved a repeat of anything, so it stands alone.
-- That errs towards crediting work rather than withholding it, which is the right direction in
-- an app whose entire problem is people not coming back.
--
-- Mirrored by sessionKey() and sessionsByWeek() in lib/week.js. Change one, change both.
create or replace function public.session_key(p_day_key text, p_id uuid)
returns text language sql immutable
set search_path to 'public', 'pg_temp'
as $$
  select coalesce(nullif(trim(p_day_key), ''), 'adhoc:' || p_id::text);
$$;

-- Adherence leaderboard. Scores how much of your OWN pledge you hit, not raw counts, so
-- somebody training twice is compared fairly with somebody training five times.
--
-- `done` is capped at the pledge and the overshoot returned separately as `extra`, because a
-- raw count next to a capped score produced "8 of 4 this week" on the card. weeks_kept counts
-- finished weeks in the block where the pledge was met, so consistency shows without a bad
-- fortnight following somebody forever.
create or replace function public.get_leaderboard()
returns table(user_id uuid, screen_name text, type_id text, pledged integer, done bigint,
              extra bigint, score numeric, weeks_kept bigint, kudos_count bigint)
language sql security definer
set search_path to 'public', 'pg_temp'
as $function$
  with wk as (select week_start(current_date) as week_start),
  base as (
    select p.id, p.screen_name,
      greatest(coalesce(p.sessions_per_week, 3), 2) as pledged,
      coalesce(p.block_start,
        (select min(t.logged_at)::date from training_sessions t where t.user_id = p.id),
        p.created_at::date, current_date) as block_start,
      (select ar.type_id from assessment_results ar
        where ar.user_id = p.id order by ar.completed_at desc limit 1) as type_id
    from profiles p
    where coalesce(p.leaderboard_opt_in, true)
  ),
  tally as (
    select b.*,
      (select count(distinct session_key(t.day_key, t.id)) from training_sessions t, wk
        where t.user_id = b.id and t.logged_at >= wk.week_start
          and t.logged_at < wk.week_start + 7) as raw_done,
      (select count(*) from (
         select week_start(t.logged_at::date) as w,
                count(distinct session_key(t.day_key, t.id)) as c
         from training_sessions t, wk
         where t.user_id = b.id
           and t.logged_at >= week_start(b.block_start)
           and t.logged_at < wk.week_start
         group by 1
       ) weeks where weeks.c >= b.pledged) as weeks_kept
    from base b
  )
  select t.id, t.screen_name, t.type_id, t.pledged::integer,
    least(t.raw_done, t.pledged) as done,
    greatest(t.raw_done - t.pledged, 0) as extra,
    round(least(1.0, t.raw_done::numeric / t.pledged) * 100, 1) as score,
    t.weeks_kept,
    (select count(*) from kudos k where k.to_user = t.id) as kudos_count
  from tally t
  order by score desc, t.weeks_kept desc, t.raw_done desc, t.pledged desc, t.screen_name;
$function$;

-- Incoming kudos. Needs SECURITY DEFINER because the kudos RLS policy is keyed on from_user,
-- so a recipient cannot see their own row. kudos_cleared_at is the read marker.
create or replace function public.get_my_kudos()
returns table(from_screen_name text, from_type_id text, emoji text, note_code text,
              sent_at timestamptz)
language sql security definer
set search_path to 'public', 'pg_temp'
as $function$
  select p.screen_name, a.type_id, k.emoji, k.note_code, k.created_at
  from kudos k
  join profiles p on p.id = k.from_user
  join profiles me on me.id = auth.uid()
  left join lateral (
    select ar.type_id from assessment_results ar
    where ar.user_id = k.from_user order by ar.completed_at desc limit 1
  ) a on true
  where k.to_user = auth.uid()
    and (me.kudos_cleared_at is null or k.created_at > me.kudos_cleared_at)
  order by k.created_at desc
  limit 20;
$function$;

-- Streak insurance. A frozen week counts as kept without being counted as trained.
--
-- Counts sessions rather than rows as of 2026-08-09, or a week the leaderboard calls kept could
-- still burn a credit. The first week of a block is never frozen: v_first guards it, because
-- insuring a week nobody has trained yet is just giving the credit away.
create or replace function public.settle_streak_freezes()
returns integer language plpgsql security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_user uuid := auth.uid();
  v_pledged int; v_credits int; v_block_start date;
  v_this_week date := week_start(current_date);
  r record; v_prev_kept boolean := false; v_first boolean := true;
begin
  if v_user is null then return 0; end if;
  perform set_config('vaeon.system_write', 'on', true);

  select coalesce(sessions_per_week, 3), coalesce(freeze_credits, 0), block_start
    into v_pledged, v_credits, v_block_start
  from profiles where id = v_user;

  if v_block_start is null then
    perform set_config('vaeon.system_write', 'off', true);
    return coalesce(v_credits, 0);
  end if;

  for r in
    with weeks as (
      select generate_series(week_start(v_block_start), v_this_week - 7, interval '7 days')::date as wk
    )
    select w.wk,
      (select count(distinct session_key(t.day_key, t.id)) from training_sessions t
        where t.user_id = v_user and t.logged_at >= w.wk and t.logged_at < w.wk + 7)::int as done,
      exists (select 1 from streak_freezes f where f.user_id = v_user and f.week_start = w.wk) as frozen
    from weeks w order by w.wk
  loop
    if r.done >= v_pledged or r.frozen then
      v_prev_kept := true;
    else
      if v_credits > 0 and v_prev_kept and not v_first then
        insert into streak_freezes (user_id, week_start) values (v_user, r.wk)
          on conflict (user_id, week_start) do nothing;
        if found then
          v_credits := v_credits - 1;
          update profiles set freeze_credits = v_credits where id = v_user;
          v_prev_kept := true;
        else
          v_prev_kept := false;
        end if;
      else
        v_prev_kept := false;
      end if;
    end if;
    v_first := false;
  end loop;

  perform set_config('vaeon.system_write', 'off', true);
  return v_credits;
end;
$function$;

-- The current group challenge, with a named participant list.
--
-- Everyone counts towards the collective total; only opted-in users are named. Opting out of
-- the leaderboard is not opting out of the group effort. Session counting moved onto
-- session_key on 2026-08-09.
create or replace function public.current_challenge()
returns table(id uuid, title text, blurb text, kind text, target integer, starts_on date,
              ends_on date, days_left integer, total_done bigint, my_done bigint, participants jsonb)
language sql security definer
set search_path to 'public', 'pg_temp'
as $function$
  with c as (
    select * from challenges
    where current_date between starts_on and ends_on
    order by starts_on desc limit 1
  ),
  counts as (
    select p.id, p.screen_name,
      coalesce(p.leaderboard_opt_in, true) as named,
      (select count(distinct session_key(t.day_key, t.id)) from training_sessions t
        where t.user_id = p.id
          and t.logged_at >= (select starts_on from c)
          and t.logged_at < (select ends_on from c) + 1) as done
    from profiles p
    where exists (select 1 from c)
  )
  select c.id, c.title, c.blurb, c.kind, c.target, c.starts_on, c.ends_on,
    (c.ends_on - current_date)::int as days_left,
    (select coalesce(sum(done), 0) from counts) as total_done,
    (select coalesce(sum(done), 0) from counts where id = auth.uid()) as my_done,
    (select coalesce(jsonb_agg(jsonb_build_object('name', screen_name, 'done', done)
                               order by done desc, screen_name), '[]'::jsonb)
     from counts where named and done > 0) as participants
  from c;
$function$;

-- Who is due a reminder, and what kind. Read by the send-reminders edge function under the
-- service role, which is why neither anon nor authenticated can execute it.
--
-- Staleness is measured against exercise_logs AND training_sessions: somebody who logs every
-- exercise but never taps Finish has no session row, and would be told they had lapsed while
-- training. The mirror of that decision is in app/dashboard/page.js.
--
-- Moved onto week_start and session_key on 2026-08-09. It had been on ISO Mondays, so on a
-- Sunday "this week" meant the week that had just ended and anybody who met their pledge last
-- week never got a Sunday nudge.
create or replace function public.due_reminders()
returns table(user_id uuid, screen_name text, type_id text, framing text, occasion text,
              days_since_log integer, sessions_this_week integer, pledged integer)
language sql security definer
set search_path to 'public', 'pg_temp'
as $function$
  with base as (
    select p.id, p.screen_name, p.framing,
      coalesce(p.sessions_per_week, 3) as pledged,
      (select a.type_id from assessment_results a
        where a.user_id = p.id order by a.completed_at desc limit 1) as type_id,
      greatest(
        (select max(e.logged_at) from exercise_logs e where e.user_id = p.id),
        (select max(s.logged_at) from training_sessions s where s.user_id = p.id)
      ) as last_activity,
      (select count(distinct session_key(s.day_key, s.id)) from training_sessions s
        where s.user_id = p.id
          and s.logged_at >= week_start((now() at time zone coalesce(p.reminder_tz, 'Europe/London'))::date)
      )::int as done_this_week,
      (now() at time zone coalesce(p.reminder_tz, 'Europe/London')) as local_now
    from profiles p
    where p.reminder_enabled
      -- The rollout gate, added 2026-08-09. Netballsue already had reminder_enabled set and
      -- would have started receiving push the moment the VAPID secrets landed, for a feature
      -- she had never been told about. Two flags, two meanings: reminder_enabled is what she
      -- asked for, push_enabled is whether the account is in the pilot.
      and p.push_enabled
      and p.reminder_hour is not null
      and (p.last_reminded_at is null
        or (p.last_reminded_at at time zone coalesce(p.reminder_tz, 'Europe/London'))::date
           < (now() at time zone coalesce(p.reminder_tz, 'Europe/London'))::date)
      and extract(hour from (now() at time zone coalesce(p.reminder_tz, 'Europe/London'))) >= p.reminder_hour
  ),
  scored as (
    select b.*,
      case when b.last_activity is null then 999
           else extract(day from (b.local_now - (b.last_activity at time zone 'UTC')))::int
      end as days_since
    from base b
  )
  select s.id, s.screen_name, s.type_id, s.framing,
    case
      when s.done_this_week >= s.pledged then 'due'
      when s.days_since >= 7 then 'lapsed'
      when s.days_since >= 3 then 'drifting'
      when s.days_since >= 1 then 'missed'
      when extract(dow from s.local_now) in (5, 6, 0) then 'short'
      else 'due'
    end as occasion,
    s.days_since, s.done_this_week, s.pledged
  from scored s
  where s.done_this_week < s.pledged;
$function$;

create or replace function public.mark_reminded(p_user uuid)
returns void language sql security definer
set search_path to 'public', 'pg_temp'
as $function$
  update profiles set last_reminded_at = now() where id = p_user;
$function$;

-- Ratchet a lift's estimated max upwards. NOT security definer: it writes only the caller's
-- own row and RLS is sufficient.
--
-- greatest() means a max only ever climbs, so ONE INFLATED TEST IS PERMANENT until the row is
-- edited by hand. That is the reason testQuality() warns at the point of testing rather than
-- letting a bad number quietly set six weeks of prescriptions.
create or replace function public.record_lift_max(p_exercise text, p_est numeric)
returns void language sql
set search_path to 'public'
as $function$
  insert into lift_maxes (user_id, exercise, est_max, updated_at)
  values (auth.uid(), p_exercise, p_est, now())
  on conflict (user_id, exercise)
  do update set est_max = greatest(lift_maxes.est_max, excluded.est_max), updated_at = now();
$function$;

-- The same, plus the actual set behind the estimate. est_max still ratchets, but tested_load,
-- tested_reps and tested_at are overwritten, because the most recent honest test is more useful
-- than the best one ever recorded.
create or replace function public.record_lift_test(p_exercise text, p_est numeric,
                                                   p_load numeric, p_reps integer)
returns void language sql
set search_path to 'public', 'pg_temp'
as $function$
  insert into lift_maxes (user_id, exercise, est_max, tested_load, tested_reps, tested_at, updated_at)
  values (auth.uid(), p_exercise, p_est, p_load, p_reps, now(), now())
  on conflict (user_id, exercise)
  do update set
    est_max = greatest(lift_maxes.est_max, excluded.est_max),
    tested_load = excluded.tested_load,
    tested_reps = excluded.tested_reps,
    tested_at = excluded.tested_at,
    updated_at = now();
$function$;

-- Recent personal bests across all users. NOTE: ORPHANED. Nothing calls it. Either find it a
-- home or drop it, but it should not sit here indefinitely looking like a feature.
create or replace function public.get_recent_pbs()
returns table(user_id uuid, screen_name text, type_id text, exercise text, weight numeric,
              logged_at timestamptz)
language sql security definer
set search_path to 'public', 'pg_temp'
as $function$
  select e.user_id, p.screen_name,
    (select ar.type_id from assessment_results ar where ar.user_id = e.user_id
      order by ar.completed_at desc limit 1) as type_id,
    e.exercise, e.weight, e.logged_at
  from exercise_logs e
  join profiles p on p.id = e.user_id
  where e.weight is not null
    and e.logged_at >= now() - interval '7 days'
    and e.weight > coalesce((select max(e2.weight) from exercise_logs e2
      where e2.user_id = e.user_id and e2.exercise = e.exercise
        and e2.logged_at < e.logged_at), 0)
  order by e.logged_at desc
  limit 20;
$function$;

-- ============================================================================
-- TRIGGERS
-- ============================================================================
--
-- profiles has an UPDATE policy scoped to "your own row", which is correct and is not enough:
-- your own row contains columns that are currency rather than settings. RLS says who may write
-- the row; this says which columns are theirs to write.
--
-- settle_streak_freezes sets vaeon.system_write to bypass it, which is why that function is
-- SECURITY DEFINER and this one checks a session setting rather than a role.
create or replace function public.protect_profile_system_columns()
returns trigger language plpgsql security definer
set search_path to 'public', 'pg_temp'
as $function$
begin
  if coalesce(current_setting('vaeon.system_write', true), 'off') = 'on' then
    return new;
  end if;
  -- freeze_credits is currency, not a setting. Nothing in the UI writes it and a client that
  -- does is helping itself to unlimited streak insurance.
  new.freeze_credits := old.freeze_credits;
  -- A block cannot start in the future. That would pin the leaderboard's weeks divisor at one
  -- indefinitely, which is the cheapest way to sit at the top of the board.
  if new.block_start is not null and new.block_start > current_date then
    new.block_start := current_date;
  end if;
  return new;
end;
$function$;

drop trigger if exists profiles_protect_system_columns on profiles;
create trigger profiles_protect_system_columns
  before update on profiles
  for each row execute function protect_profile_system_columns();

-- ============================================================================
-- FUNCTION GRANTS
-- ============================================================================
--
-- READ rpc_permissions.sql BEFORE CHANGING ANY OF THESE. There are two separate traps and the
-- second was only found on 2026-08-09.
--
-- 1. `revoke execute from anon` reports success and does nothing, because EXECUTE is granted to
--    PUBLIC by default and anon inherits it. PUBLIC has to lose it first.
-- 2. Revoking from PUBLIC is also not enough on Supabase. Its ALTER DEFAULT PRIVILEGES grants
--    EXECUTE on every new function in public to anon, authenticated and service_role
--    EXPLICITLY at creation time. After revoking PUBLIC, session_key's ACL still read
--    `anon=X/postgres` and anon could still call it. Both revokes are needed.
--
-- Verify with has_function_privilege(), NEVER with the statement succeeding:
--
--   select p.proname,
--          has_function_privilege('anon', p.oid, 'EXECUTE') as anon,
--          has_function_privilege('authenticated', p.oid, 'EXECUTE') as auth
--   from pg_proc p join pg_namespace n on n.oid = p.pronamespace
--   where n.nspname = 'public' and p.prokind = 'f' order by 1;
--
-- Live state as at 2026-08-09:
--
--   current_challenge                anon false   authenticated true
--   due_reminders                    anon false   authenticated false   (service role only)
--   get_leaderboard                  anon false   authenticated true
--   get_my_kudos                     anon false   authenticated true
--   get_recent_pbs                   anon false   authenticated false   (orphaned)
--   mark_reminded                    anon false   authenticated false   (service role only)
--   protect_profile_system_columns   anon false   authenticated false   (trigger)
--   record_lift_max                  anon false   authenticated true
--   record_lift_test                 anon false   authenticated true
--   session_key                      anon false   authenticated true
--   settle_streak_freezes            anon false   authenticated true
--   week_start                       anon TRUE    authenticated true    <- see gaps below

revoke execute on function public.session_key(text, uuid) from public;
revoke execute on function public.session_key(text, uuid) from anon;
grant  execute on function public.session_key(text, uuid) to authenticated;

-- ============================================================================
-- GAPS, IN THE ORDER I WOULD CLOSE THEM
-- ============================================================================
--
-- 1. PROFILES ARE CREATED CLIENT-SIDE ON SIGNUP, so an interrupted signup orphans an auth user
--    with no profile row. A trigger on auth.users would close it. This is the oldest item here.
--
-- 2. NO BACKUPS. The project is on the Supabase free plan, which means no daily backups, and a
--    day of data surgery on somebody's real training history has already been done without a
--    safety net. This is the cheapest risk on the whole project to retire.
--
-- 3. week_start IS EXECUTABLE BY anon, and it still carries the default PUBLIC grant that the
--    others have had revoked. It is an immutable pure function over a date and touches no data,
--    so the exposure is nil, but it is the one inconsistency left in the grant table and it
--    will be read as an oversight by whoever audits this next. It is. Left alone deliberately
--    rather than changed in a snapshot regeneration, which is not where behaviour should change.
--
-- 4. assessment_results.goals IS '[]' ON EVERY ROW and is written as '[]' by the assessment.
--    Populate it or drop it.
--
-- 5. get_recent_pbs() IS ORPHANED. Nothing calls it.
--
-- 6. exercise_prefs HAS A DELETE POLICY THAT NOTHING CALLS. "Not for me" is one-way from the
--    user's point of view. Needs a list in Settings.
--
-- 7. set_feedback NEEDS A test_week FLAG. In the testing week there is no prescription, so
--    "too heavy" means "I chose badly", which is a fact about the user rather than about the
--    programme. Both land in the same column today.
--
-- 8. AN AGE GATE AT SIGNUP. There are under-18s on the platform, supervised family members for
--    now. This needs deciding before the first stranger signs up: the Children's Code applies,
--    and a minor cannot be bound by the disclaimer.
