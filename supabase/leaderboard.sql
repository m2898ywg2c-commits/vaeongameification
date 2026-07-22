-- Leaderboard rework. Run once in the Supabase SQL editor. Idempotent.
--
-- Reset model: per person's own 6-week block, not weekly. To keep it a fair
-- like-for-like table across people at different points in their block, we do NOT
-- rank raw session counts. We rank adherence: sessions logged this block divided by
-- sessions expected so far (pledge-per-week times weeks elapsed). Someone in week 1
-- at 100 percent sits fairly against someone in week 6 at 100 percent.

-- ---------------------------------------------------------------------------
-- Kudos: one reaction per sender per recipient. The emoji can be changed.
-- ---------------------------------------------------------------------------
create table if not exists kudos (
  id uuid default gen_random_uuid() primary key,
  from_user uuid references profiles(id) on delete cascade not null,
  to_user uuid references profiles(id) on delete cascade not null,
  emoji text not null default '👏',
  created_at timestamptz default now(),
  unique (from_user, to_user)
);

alter table kudos enable row level security;

drop policy if exists "own kudos select" on kudos;
drop policy if exists "own kudos insert" on kudos;
drop policy if exists "own kudos update" on kudos;
drop policy if exists "own kudos delete" on kudos;

-- You can only see and change the kudos you have given. Received totals for
-- everyone come back through the security-definer leaderboard function below.
create policy "own kudos select" on kudos for select using (auth.uid() = from_user);
create policy "own kudos insert" on kudos for insert with check (auth.uid() = from_user);
create policy "own kudos update" on kudos for update using (auth.uid() = from_user);
create policy "own kudos delete" on kudos for delete using (auth.uid() = from_user);

-- ---------------------------------------------------------------------------
-- Leaderboard: per-block adherence, plus each person's type and kudos count.
-- ---------------------------------------------------------------------------
drop function if exists public.get_leaderboard();

create or replace function public.get_leaderboard()
returns table (
  user_id uuid,
  screen_name text,
  type_id text,
  pledged integer,
  weeks integer,
  done bigint,
  score numeric,
  kudos_count bigint
)
language sql
security definer
set search_path to 'public'
as $function$
  with calc as (
    select
      p.id,
      p.screen_name,
      p.sessions_per_week as pledged,
      coalesce(p.block_start, current_date) as block_start,
      greatest(1, least(6,
        floor((current_date - coalesce(p.block_start, current_date))::numeric / 7.0)::int + 1
      )) as weeks
    from profiles p
  )
  select
    c.id as user_id,
    c.screen_name,
    (select ar.type_id from assessment_results ar
       where ar.user_id = c.id order by ar.completed_at desc limit 1) as type_id,
    c.pledged,
    c.weeks,
    (select count(*) from training_sessions t
       where t.user_id = c.id and t.logged_at >= c.block_start) as done,
    round(
      least(1.0,
        (select count(*) from training_sessions t
           where t.user_id = c.id and t.logged_at >= c.block_start)::numeric
        / greatest(coalesce(c.pledged, 3) * c.weeks, 1)
      ) * 100 * (1 + (greatest(coalesce(c.pledged, 3), 2) - 2) * 0.05)
    , 1) as score,
    (select count(*) from kudos k where k.to_user = c.id) as kudos_count
  from calc c
  order by score desc, done desc;
$function$;

-- ---------------------------------------------------------------------------
-- Recent PBs: exercise_logs in the last 7 days that beat the person's previous
-- best for that exercise. Computed live, so no logging code has to change.
-- ---------------------------------------------------------------------------
create or replace function public.get_recent_pbs()
returns table (
  user_id uuid,
  screen_name text,
  type_id text,
  exercise text,
  weight numeric,
  logged_at timestamptz
)
language sql
security definer
set search_path to 'public'
as $function$
  select
    e.user_id,
    p.screen_name,
    (select ar.type_id from assessment_results ar
       where ar.user_id = e.user_id order by ar.completed_at desc limit 1) as type_id,
    e.exercise,
    e.weight,
    e.logged_at
  from exercise_logs e
  join profiles p on p.id = e.user_id
  where e.weight is not null
    and e.logged_at >= now() - interval '7 days'
    and e.weight > coalesce((
      select max(e2.weight) from exercise_logs e2
      where e2.user_id = e.user_id
        and e2.exercise = e.exercise
        and e2.logged_at < e.logged_at
    ), 0)
  order by e.logged_at desc
  limit 20;
$function$;
