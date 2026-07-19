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
