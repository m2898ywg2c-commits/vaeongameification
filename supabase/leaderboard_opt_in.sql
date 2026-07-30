-- Leaderboard opt-in, defaulted from the social dimension. APPLIED on 2026-07-30.
--
-- WHY
--
-- Four of the eight types are Solo. The twelve statements they answered included "My best
-- sessions happen when it is just me and my headphones" and "I find group workouts more
-- distracting than motivating", they agreed, the app recorded it, and then it put them on
-- a public chart ranked against strangers and called that the community feature. The most
-- extreme social score in the live data is a Hunter at -5, which is as solo as the
-- instrument can measure, and he is on the board like everyone else.
--
-- Being ranked is not a neutral default. For somebody who trains alone by preference it is
-- at best noise and at worst the reason they stop opening the app.
--
-- HOW
--
-- leaderboard_opt_in is NULLABLE and that is the whole design.
--
--   null   no decision made. Fall back to the type default: Together types appear,
--          Solo types do not, and somebody with no type yet appears, which preserves
--          exactly the behaviour they have today.
--   true   they asked to be on it. Always wins, whatever their type says.
--   false  they asked to be off it. Always wins.
--
-- A non-null default would have meant backfilling twelve existing users with a guess, and
-- a guess written into a column is indistinguishable from a choice a week later. Null
-- means "we have not asked", which is the truth.
--
-- WHAT OPTING OUT DOES NOT DO
--
-- It hides you FROM the board. It does not hide the board from you, and it does not stop
-- you sending kudos. That distinction is deliberate. A solo preference is about not being
-- ranked, not about being cut off from everyone else, and the crude version of this change
-- would have quietly removed four people from the only social surface in the app while
-- also making it impossible for anyone to send them a kudos.

alter table profiles
  add column if not exists leaderboard_opt_in boolean;

comment on column profiles.leaderboard_opt_in is
  'Null means undecided, in which case the social pole of the personality type decides. True or false is an explicit user choice and always wins.';

-- Mirrors POLES in lib/personality.js. If a type is ever added or its social pole changed,
-- change it in both places.
create or replace function type_is_together(p_type text)
returns boolean
language sql
immutable
set search_path = public
as $$
  select case p_type
    when 'captain' then true
    when 'anchor' then true
    when 'gladiator' then true
    when 'spark' then true
    when 'architect' then false
    when 'monk' then false
    when 'hunter' then false
    when 'wanderer' then false
    -- No type yet. Appearing is the current behaviour and there is no evidence either
    -- way, so nothing changes for them until they take the assessment.
    else true
  end;
$$;

create or replace function get_leaderboard()
returns table (
  user_id uuid,
  screen_name text,
  type_id text,
  pledged integer,
  weeks integer,
  block_weeks integer,
  done bigint,
  score numeric,
  kudos_count bigint
)
language sql
security definer
set search_path to 'public'
as $$
  with base as (
    select p.id, p.screen_name, p.sessions_per_week as pledged,
      coalesce(
        p.block_start,
        (select min(t.logged_at)::date from training_sessions t where t.user_id = p.id),
        p.created_at::date,
        current_date
      ) as block_start,
      coalesce(p.block_weeks, 6) as block_weeks,
      p.leaderboard_opt_in,
      (select ar.type_id from assessment_results ar where ar.user_id = p.id order by ar.completed_at desc limit 1) as type_id
    from profiles p
  ),
  visible as (
    select b.*
    from base b
    -- Explicit choice first, type default second.
    where coalesce(b.leaderboard_opt_in, type_is_together(b.type_id))
  ),
  calc as (
    select v.id, v.screen_name, v.pledged, v.block_start, v.block_weeks, v.type_id,
      greatest(1, least(v.block_weeks, floor((current_date - v.block_start)::numeric / 7.0)::int + 1)) as weeks
    from visible v
  )
  select c.id as user_id, c.screen_name as screen_name,
    c.type_id as type_id,
    c.pledged as pledged, c.weeks as weeks, c.block_weeks as block_weeks,
    (select count(*) from training_sessions t where t.user_id = c.id and t.logged_at >= c.block_start) as done,
    round(least(1.0, (select count(*) from training_sessions t where t.user_id = c.id and t.logged_at >= c.block_start)::numeric / greatest(coalesce(c.pledged,3) * c.weeks, 1)) * 100 * (1 + (greatest(coalesce(c.pledged,3),2) - 2) * 0.05), 1) as score
    ,(select count(*) from kudos k where k.to_user = c.id) as kudos_count
  from calc c
  order by score desc, done desc;
$$;
