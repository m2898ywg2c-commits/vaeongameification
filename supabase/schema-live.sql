-- ============================================================================
-- Vaeon Fitness: live database snapshot.
-- Project "Intent" (wctsiafaiogyciqnmvad), Postgres 17.6, eu-west-1.
-- Captured 2026-07-30.
-- ============================================================================
--
-- WHAT THIS IS
--
-- A reconstruction of the actual public schema, read out of pg_catalog. It
-- exists because the hand-written migrations in this folder had drifted: several
-- tables and every RLS policy and function had only ever been created in the
-- Supabase dashboard, so the repo could not rebuild the database. That became a
-- real problem when a leaderboard bug turned out to hinge on training_sessions,
-- a table that appeared nowhere in version control.
--
-- HOW TO USE IT
--
-- Read it as documentation and as a rebuild path for a fresh environment. Do NOT
-- run it against a database that already has data: it is written with `if not
-- exists` guards, so it is safe in the sense of not dropping anything, but it
-- will not migrate an existing schema either.
--
-- Ongoing changes still belong in their own dated migration file, the way
-- gymready.sql, disclaimer.sql and leaderboard_block_start.sql do. When you add
-- one, update this snapshot too or it will drift again within a fortnight.
--
-- NOT INCLUDED: the auth schema (Supabase manages it), storage, realtime
-- publications, and the two Supabase extensions this relies on (pgcrypto for
-- gen_random_uuid, already present on every Supabase project).

-- ============================================================================
-- TABLES
-- ============================================================================

-- The root record. One row per auth user, cascade-deleted with them, which is
-- what makes deleting a test account clean: everything below hangs off this.
create table if not exists profiles (
  id uuid primary key references auth.users on delete cascade,
  screen_name text not null unique,
  age_group text,
  created_at timestamptz default now(),
  goals jsonb not null default '[]'::jsonb,
  sessions_per_week int not null default 3,
  -- Defaulted to CURRENT_DATE as of leaderboard_block_start.sql. Before that it
  -- was nullable with no default, and get_leaderboard() treated a null as "the
  -- block starts today", which silently discarded everyone's history nightly.
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
  -- Per user rather than derived from the goal, so an individual's block length
  -- can be changed without touching any logic. Gym ready runs 8, everyone 6.
  block_weeks int not null default 6,
  disclaimer_accepted_at timestamptz,
  disclaimer_version text
);

comment on column profiles.disclaimer_accepted_at is
  'When the user ticked to accept the training and AI disclaimer. Null means never asked or never accepted.';
comment on column profiles.disclaimer_version is
  'Value of DISCLAIMER_VERSION (app/Disclaimer.js) at the moment of acceptance.';

-- Personality assessment output. Multiple rows per user are expected and normal:
-- everything that reads a type takes the most recent by completed_at.
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

-- One row per completed session. This is the leaderboard's unit of account, and
-- the table the whole adherence score is built on.
create table if not exists training_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  session_type text not null,
  duration_min int not null default 30,
  effort int not null default 3 check (effort >= 1 and effort <= 5),
  note text,
  logged_at timestamptz default now()
);

-- Set-level detail. weight/reps for lifts, time_text for holds and runs.
-- time_text is free text ("45 sec", "20 min") rather than an interval, because
-- the unit is part of what the user was asked for.
create table if not exists exercise_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  day_key text not null,
  exercise text not null,
  set_index int not null default 1,
  weight numeric,
  reps int,
  time_text text,
  logged_at timestamptz default now()
);

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

-- One kudos per person per person, changeable. The unique constraint is what
-- makes the "change the emoji any time" behaviour an upsert rather than a pile-up.
create table if not exists kudos (
  id uuid primary key default gen_random_uuid(),
  from_user uuid not null references profiles(id) on delete cascade,
  to_user uuid not null references profiles(id) on delete cascade,
  emoji text not null default '👏'::text,
  created_at timestamptz default now(),
  note_code text check (
    note_code is null or note_code = any (array[
      'consistent'::text, 'strong_week'::text, 'inspiring'::text, 'keep_going'::text,
      'welcome'::text, 'comeback'::text, 'respect'::text, 'big_lift'::text
    ])
  ),
  unique (from_user, to_user)
);

create table if not exists type_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  type_id text not null,
  score int not null check (score >= 1 and score <= 5),
  created_at timestamptz default now(),
  unique (user_id, type_id)
);

-- Note the SET NULL rather than CASCADE: deleting a user anonymises their
-- feedback rather than destroying it, which is usually what you want.
create table if not exists feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete set null,
  message text not null,
  created_at timestamptz default now()
);

-- Estimated one-rep maxes, learned from what was actually logged. Upserted by
-- record_lift_max() and only ever ratcheted upwards.
create table if not exists lift_maxes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  exercise text not null,
  est_max numeric not null,
  updated_at timestamptz default now(),
  unique (user_id, exercise)
);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
--
-- Every table has RLS on, and every policy is "you can only see your own rows".
-- Cross-user reads happen exclusively through the SECURITY DEFINER functions
-- below, which is what lets the leaderboard show other people's scores without
-- exposing their raw logs.

alter table profiles           enable row level security;
alter table assessment_results enable row level security;
alter table training_sessions   enable row level security;
alter table exercise_logs       enable row level security;
alter table body_metrics        enable row level security;
alter table achievements        enable row level security;
alter table kudos               enable row level security;
alter table type_feedback       enable row level security;
alter table feedback            enable row level security;
alter table lift_maxes          enable row level security;

create policy "Users can view their own profile"   on profiles for select using (auth.uid() = id);
create policy "Users can insert their own profile" on profiles for insert with check (auth.uid() = id);
create policy "Users can update their own profile" on profiles for update using (auth.uid() = id);

create policy "Users can view their own assessment results"   on assessment_results for select using (auth.uid() = user_id);
create policy "Users can insert their own assessment results" on assessment_results for insert with check (auth.uid() = user_id);
create policy "Users can update their own assessment results" on assessment_results for update using (auth.uid() = user_id);

create policy "Users can view their own sessions"   on training_sessions for select using (auth.uid() = user_id);
create policy "Users can insert their own sessions" on training_sessions for insert with check (auth.uid() = user_id);
create policy "Users can delete their own sessions" on training_sessions for delete using (auth.uid() = user_id);

create policy "own exercise logs select" on exercise_logs for select using (auth.uid() = user_id);
create policy "own exercise logs insert" on exercise_logs for insert with check (auth.uid() = user_id);
create policy "own exercise logs delete" on exercise_logs for delete using (auth.uid() = user_id);

create policy "own body metrics select" on body_metrics for select using (auth.uid() = user_id);
create policy "own body metrics insert" on body_metrics for insert with check (auth.uid() = user_id);
create policy "own body metrics delete" on body_metrics for delete using (auth.uid() = user_id);

create policy "own achievements select" on achievements for select using (auth.uid() = user_id);
create policy "own achievements insert" on achievements for insert with check (auth.uid() = user_id);

-- Kudos are keyed on from_user, so you can see and change what you sent, never
-- what you received. Incoming kudos come back through get_my_kudos() instead.
create policy "own kudos select" on kudos for select using (auth.uid() = from_user);
create policy "own kudos insert" on kudos for insert with check (auth.uid() = from_user);
create policy "own kudos update" on kudos for update using (auth.uid() = from_user);
create policy "own kudos delete" on kudos for delete using (auth.uid() = from_user);

create policy "own type_feedback select" on type_feedback for select using (auth.uid() = user_id);
create policy "own type_feedback insert" on type_feedback for insert with check (auth.uid() = user_id);
create policy "own type_feedback update" on type_feedback for update using (auth.uid() = user_id);

-- Insert only. Nobody reads their own feedback back, including the sender.
create policy "own feedback insert" on feedback for insert with check (auth.uid() = user_id);

create policy "own lift_maxes select" on lift_maxes for select using (auth.uid() = user_id);
create policy "own lift_maxes insert" on lift_maxes for insert with check (auth.uid() = user_id);
create policy "own lift_maxes update" on lift_maxes for update using (auth.uid() = user_id);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================
--
-- Three are SECURITY DEFINER because they deliberately cross the RLS boundary.
-- record_lift_max is not: it only ever touches auth.uid()'s own row.

-- Adherence leaderboard. Current version as of leaderboard_block_start.sql; see
-- that file for why the block_start fallback chain looks like this.
CREATE OR REPLACE FUNCTION public.get_leaderboard()
 RETURNS TABLE(user_id uuid, screen_name text, type_id text, pledged integer, weeks integer, block_weeks integer, done bigint, score numeric, kudos_count bigint)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  with base as (
    select p.id, p.screen_name, p.sessions_per_week as pledged,
      coalesce(
        p.block_start,
        (select min(t.logged_at)::date from training_sessions t where t.user_id = p.id),
        p.created_at::date,
        current_date
      ) as block_start,
      coalesce(p.block_weeks, 6) as block_weeks
    from profiles p
  ),
  calc as (
    select b.id, b.screen_name, b.pledged, b.block_start, b.block_weeks,
      greatest(1, least(b.block_weeks, floor((current_date - b.block_start)::numeric / 7.0)::int + 1)) as weeks
    from base b
  )
  select c.id as user_id, c.screen_name as screen_name,
    (select ar.type_id from assessment_results ar where ar.user_id = c.id order by ar.completed_at desc limit 1) as type_id,
    c.pledged as pledged, c.weeks as weeks, c.block_weeks as block_weeks,
    (select count(*) from training_sessions t where t.user_id = c.id and t.logged_at >= c.block_start) as done,
    round(least(1.0, (select count(*) from training_sessions t where t.user_id = c.id and t.logged_at >= c.block_start)::numeric / greatest(coalesce(c.pledged,3) * c.weeks, 1)) * 100 * (1 + (greatest(coalesce(c.pledged,3),2) - 2) * 0.05), 1) as score
    ,(select count(*) from kudos k where k.to_user = c.id) as kudos_count
  from calc c
  order by score desc, done desc;
$function$;

-- Incoming kudos. Needs SECURITY DEFINER because the kudos RLS policy is keyed
-- on from_user, so a recipient cannot select their own received rows.
-- kudos_cleared_at acts as a read marker.
CREATE OR REPLACE FUNCTION public.get_my_kudos()
 RETURNS TABLE(from_screen_name text, from_type_id text, emoji text, note_code text, sent_at timestamp with time zone)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select p.screen_name,
         a.type_id,
         k.emoji,
         k.note_code,
         k.created_at
  from kudos k
  join profiles p on p.id = k.from_user
  join profiles me on me.id = auth.uid()
  left join lateral (
    select ar.type_id
    from assessment_results ar
    where ar.user_id = k.from_user
    order by ar.completed_at desc
    limit 1
  ) a on true
  where k.to_user = auth.uid()
    and (me.kudos_cleared_at is null or k.created_at > me.kudos_cleared_at)
  order by k.created_at desc
  limit 20;
$function$;

-- Recent personal bests across all users. NOTE: currently orphaned. The
-- leaderboard page used to render this feed and no longer does, because in a
-- testing week every logged set is a new max, so the feed buried the board.
-- Kept in case it finds a home somewhere it can breathe.
CREATE OR REPLACE FUNCTION public.get_recent_pbs()
 RETURNS TABLE(user_id uuid, screen_name text, type_id text, exercise text, weight numeric, logged_at timestamp with time zone)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select e.user_id as user_id, p.screen_name as screen_name,
    (select ar.type_id from assessment_results ar where ar.user_id = e.user_id order by ar.completed_at desc limit 1) as type_id,
    e.exercise as exercise, e.weight as weight, e.logged_at as logged_at
  from exercise_logs e
  join profiles p on p.id = e.user_id
  where e.weight is not null
    and e.logged_at >= now() - interval '7 days'
    and e.weight > coalesce((select max(e2.weight) from exercise_logs e2 where e2.user_id = e.user_id and e2.exercise = e.exercise and e2.logged_at < e.logged_at), 0)
  order by e.logged_at desc
  limit 20;
$function$;

-- Ratchet a lift's estimated max upwards. Not SECURITY DEFINER: it writes only
-- to the caller's own row and the RLS policy permits that.
CREATE OR REPLACE FUNCTION public.record_lift_max(p_exercise text, p_est numeric)
 RETURNS void
 LANGUAGE sql
 SET search_path TO 'public'
AS $function$
  insert into lift_maxes (user_id, exercise, est_max, updated_at)
  values (auth.uid(), p_exercise, p_est, now())
  on conflict (user_id, exercise)
  do update set est_max = greatest(lift_maxes.est_max, excluded.est_max), updated_at = now();
$function$;

grant execute on function public.get_leaderboard() to anon, authenticated, service_role;
grant execute on function public.get_my_kudos()    to anon, authenticated, service_role;
grant execute on function public.get_recent_pbs()  to anon, authenticated, service_role;
grant execute on function public.record_lift_max(text, numeric) to anon, authenticated, service_role;

-- ============================================================================
-- KNOWN GAPS
-- ============================================================================
--
-- 1. NO SECONDARY INDEXES. Every index in this database is a primary key or a
--    unique constraint. Nothing covers the access patterns the app actually
--    uses, all of which are (user_id, timestamp):
--
--      create index on exercise_logs    (user_id, logged_at desc);
--      create index on training_sessions (user_id, logged_at desc);
--      create index on body_metrics     (user_id, logged_at desc);
--      create index on assessment_results (user_id, completed_at desc);
--      create index on kudos (to_user);
--
--    At current volumes (85 exercise logs, 6 sessions) this is irrelevant and
--    sequential scans are genuinely faster. It stops being irrelevant when
--    get_leaderboard() starts running two correlated subqueries per user over a
--    six-figure exercise_logs, and get_recent_pbs() is worse: a correlated max()
--    per candidate row. Add them before a launch, not after.
--
-- 2. NO TRIGGERS. profiles rows are created by the client on signup rather than
--    by a trigger on auth.users. That is why an interrupted signup can leave an
--    auth user with no profile, which happened once and had to be cleaned up by
--    hand. A trigger on auth.users insert would close that hole.
--
-- 3. get_recent_pbs() is dead code. Drop it or find it a home.
