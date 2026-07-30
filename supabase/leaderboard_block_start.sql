-- Leaderboard: stable fallback for a null block_start. APPLIED to the live database on 2026-07-30.
--
-- THE BUG
--
-- get_leaderboard() previously resolved a missing block start with
-- coalesce(p.block_start, current_date), which means "the block starts today".
-- Because `done` counts sessions with logged_at >= block_start, that window moved
-- forward every midnight. A user with a null block_start could therefore never
-- accumulate anything: whatever they logged counted that day and silently
-- dropped out overnight.
--
-- It surfaced when CatFisher logged a session at 17:56 on 29 July and appeared on
-- the progress calendar but scored zero on the leaderboard the next morning. The
-- calendar reads training_sessions directly with no block filter, so the two
-- disagreed. Seven of eleven profiles had a null block_start at the time; she was
-- simply the first of them to train.
--
-- block_start had no column default, so every signup started null. The dashboard
-- nagged people to set one, but the leaderboard punished them in the meantime
-- without saying so.
--
-- THE FIX
--
-- 1. Backfill the nulls to each user's earliest logged session, falling back to
--    their signup date. Run as a separate statement because a column default
--    does not touch existing rows.
-- 2. Rewrite the fallback chain so it cannot drift: earliest session, then
--    created_at, then today.
-- 3. Give the column a default so it is never null again.
--
-- A block_start in the FUTURE is deliberately left working as it did: done = 0
-- and weeks = 1, which is correct for a block that has not started. James runs
-- one on purpose while waiting for a gym to open.
--
-- The scoring expression is unchanged. The function is split into two CTEs only
-- so block_start is computed once rather than repeated inside the weeks maths.

-- 1. Backfill.
update profiles p
set block_start = coalesce(
  (select min(t.logged_at)::date from training_sessions t where t.user_id = p.id),
  p.created_at::date,
  current_date
)
where p.block_start is null;

-- 2. The function. Output columns are unchanged from the gymready.sql version, but
--    Postgres still requires a drop before recreating with a modified body when the
--    signature is redefined this way.
drop function if exists public.get_leaderboard();

CREATE FUNCTION public.get_leaderboard()
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

grant execute on function public.get_leaderboard() to authenticated, anon;

-- 3. Prevention.
alter table profiles alter column block_start set default current_date;

-- Verified after applying: eight nulls backfilled, CatFisher now reads 1 of 2 for
-- a score of 50.0, Test_account2 unchanged at 105.0 (the gymready.sql baseline),
-- and Hampo-1978's deliberate 4 August start still correctly reports 0 done.
