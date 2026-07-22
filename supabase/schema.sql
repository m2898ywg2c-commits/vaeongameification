-- Run this once in Supabase's SQL Editor (Database, SQL Editor, New Query).
-- This sets up the two tables step 1 needs: a profile per user (with a screen name,
-- never their real name, for whenever comparison features go in later) and their
-- personality assessment result.

create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  screen_name text unique not null,
  age_group text,
  created_at timestamptz default now()
);

create table if not exists assessment_results (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  type_id text not null,
  goals jsonb not null default '[]',
  structure_score int not null default 0,
  orientation_score int not null default 0,
  social_score int not null default 0,
  completed_at timestamptz default now()
);

-- Row Level Security: switched on immediately, before any real user data exists.
-- For now everything's kept private to its own owner. When the leaderboard gets built
-- in step 3, that's the point to deliberately open up read access to screen names and
-- scores, not before, and not by accident.

alter table profiles enable row level security;
alter table assessment_results enable row level security;

create policy "Users can view their own profile"
  on profiles for select
  using (auth.uid() = id);

create policy "Users can insert their own profile"
  on profiles for insert
  with check (auth.uid() = id);

create policy "Users can update their own profile"
  on profiles for update
  using (auth.uid() = id);

create policy "Users can view their own assessment results"
  on assessment_results for select
  using (auth.uid() = user_id);

create policy "Users can insert their own assessment results"
  on assessment_results for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own assessment results"
  on assessment_results for update
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Later migrations. Added after step 1, all idempotent so this file can be
-- re-run safely. The live DB is the source of truth; this section keeps the
-- file honest about what has been added since.
-- ---------------------------------------------------------------------------

-- Onboarding and settings additions.
alter table profiles add column if not exists sessions_per_week int;
alter table profiles add column if not exists equipment text;
alter table profiles add column if not exists fixed_days boolean default true;
alter table profiles add column if not exists train_days jsonb default '[]';
alter table profiles add column if not exists birth_year int;
alter table profiles add column if not exists baseline_bench numeric;
alter table profiles add column if not exists baseline_squat numeric;
alter table profiles add column if not exists block_start date;
alter table profiles add column if not exists block_number int default 1;
alter table profiles add column if not exists theme text;
alter table profiles add column if not exists goals jsonb default '[]';

-- Neuroscience preference layers. Both sit alongside the eight personality types,
-- not inside them.
--  framing / framing_score: Reinforcement Sensitivity Theory (Gray's BAS/BIS).
--    Reward-sensitive vs loss-sensitive, drives coaching tone only.
--  chronotype: circadian preference (morning | evening | neutral) for training-time
--    guidance and future reminder timing.
alter table profiles add column if not exists framing text;
alter table profiles add column if not exists framing_score int;
alter table profiles add column if not exists chronotype text;
