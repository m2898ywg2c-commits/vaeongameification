-- Gym ready: per-user block length. APPLIED to the live database on 2026-07-26.
--
-- Gym ready users follow a coach's programme and run eight-week blocks; everyone else
-- stays on six. Block length is stored per user rather than derived from the goal, so an
-- individual's block can be changed later without touching any logic.
--
-- The app also works without this migration: lib/gymready.js blockWeeksFor() falls back to
-- deriving the length from the goal, and app/onboarding writes block_weeks in a separate
-- failure-tolerant update. This migration is what makes the LEADERBOARD correct, because
-- get_leaderboard() previously capped weeks elapsed at a hardcoded 6. Without it, a Gym
-- ready user in weeks seven and eight had a denominator that had stopped growing, so their
-- adherence score inflated and their row read "wk 6/8".

-- 1. The column. Existing users keep the six-week behaviour they already had.
alter table profiles add column if not exists block_weeks int not null default 6;

-- 2. Backfill anyone who has already chosen Gym ready.
update profiles set block_weeks = 8
where goals @> '["gymready"]'::jsonb and block_weeks <> 8;

-- 3. get_leaderboard(). Two changes from the previous version, everything else is
--    byte-for-byte the original, including the scoring expression:
--      a) the hardcoded 6 in the weeks cap becomes that user's block_weeks;
--      b) block_weeks is returned, because the leaderboard renders other people's rows
--         and each person's block length may differ.
--    The output column list changes, so a plain CREATE OR REPLACE is rejected by Postgres
--    and the function has to be dropped first.
drop function if exists public.get_leaderboard();

CREATE FUNCTION public.get_leaderboard()
 RETURNS TABLE(user_id uuid, screen_name text, type_id text, pledged integer, weeks integer, block_weeks integer, done bigint, score numeric, kudos_count bigint)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  with calc as (
    select p.id, p.screen_name, p.sessions_per_week as pledged,
      coalesce(p.block_start, current_date) as block_start,
      coalesce(p.block_weeks, 6) as block_weeks,
      greatest(1, least(coalesce(p.block_weeks, 6), floor((current_date - coalesce(p.block_start, current_date))::numeric / 7.0)::int + 1)) as weeks
    from profiles p
  )
  select c.id as user_id, c.screen_name as screen_name,
    (select ar.type_id from assessment_results ar where ar.user_id = c.id order by ar.completed_at desc limit 1) as type_id,
    c.pledged as pledged, c.weeks as weeks, c.block_weeks as block_weeks,
    (select count(*) from training_sessions t where t.user_id = c.id and t.logged_at >= c.block_start) as done,
    round(least(1.0, (select count(*) from training_sessions t where t.user_id = c.id and t.logged_at >= c.block_start)::numeric / greatest(coalesce(c.pledged,3) * c.weeks, 1)) * 100 * (1 + (greatest(coalesce(c.pledged,3),2) - 2) * 0.05), 1) as score,
    (select count(*) from kudos k where k.to_user = c.id) as kudos_count
  from calc c
  order by score desc, done desc;
$function$;

grant execute on function public.get_leaderboard() to authenticated, anon;

-- Verified after applying: existing scores unchanged (Test_account2 still 105.0), the new
-- block_weeks column is returned, and a 50-day-old block now reports week 8 rather than 6.
