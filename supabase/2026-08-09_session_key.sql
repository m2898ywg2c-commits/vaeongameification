-- APPLIED 2026-08-09 to project wctsiafaiogyciqnmvad.
--
-- ONE DEFINITION OF WHAT COUNTS AS A SESSION.
--
-- Three places counted sessions and all three counted ROWS: get_leaderboard for the weekly
-- score, the weeks_kept tally inside it, and settle_streak_freezes. A row is written every
-- time a plan day is completed, so completing the same push session on four different days in
-- one week produced four sessions towards a pledge of four, and the progress chart showed a
-- bar of ten against a pledge line of four for a week containing five days of training.
--
-- The pledge is a number of SESSIONS FROM THE PLAN. The plan has four slots in it. Filling the
-- same slot four times is one slot filled four times, not four slots.
--
-- This is the same failure as the week boundary living in ten independent copies, and it gets
-- the same treatment: one definition, imported everywhere. session_key() below is the SQL side
-- and sessionKey() in lib/week.js is the app side. Change one, change both.
--
-- WHY THE COALESCE ONTO THE ROW ID.
--
-- day_key is null on quick logs and on every row written before day_key existed. Counting
-- distinct day_key alone would collapse all of somebody's quick logs into a single session,
-- and one tester's entire week is quick logs. A row with no day_key cannot be proved to be a
-- repeat of anything, so it counts as its own session. That errs towards crediting work rather
-- than towards withholding it, which is the right side to be wrong on in a retention app.

create or replace function public.session_key(p_day_key text, p_id uuid)
returns text
language sql
immutable
set search_path to 'public', 'pg_temp'
as $$
  select coalesce(nullif(trim(p_day_key), ''), 'adhoc:' || p_id::text);
$$;

comment on function public.session_key(text, uuid) is
  'What makes one session distinct within a week. Plan days collapse by day_key, quick logs stand alone. Mirrored by sessionKey() in lib/week.js.';

-- ---------------------------------------------------------------------------------------
-- get_leaderboard: raw_done and weeks_kept both move onto session_key.
-- Everything else about this function is unchanged, including capping `done` at the pledge
-- and returning the overshoot separately as `extra`.
-- ---------------------------------------------------------------------------------------
create or replace function public.get_leaderboard()
returns table(user_id uuid, screen_name text, type_id text, pledged integer, done bigint,
              extra bigint, score numeric, weeks_kept bigint, kudos_count bigint)
language sql
security definer
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

-- ---------------------------------------------------------------------------------------
-- settle_streak_freezes: the same count, or a week the leaderboard calls kept could still
-- burn a freeze credit. Only the `done` subquery changes.
-- ---------------------------------------------------------------------------------------
create or replace function public.settle_streak_freezes()
returns integer
language plpgsql
security definer
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

-- GRANTS. THERE ARE TWO SEPARATE TRAPS HERE AND THE SECOND ONE IS NOT IN rpc_permissions.sql.
--
-- The documented one: `revoke execute from anon` reports success and does nothing, because
-- EXECUTE is granted to PUBLIC by default and anon inherits it. PUBLIC has to lose it first.
--
-- The one found on 2026-08-09: revoking from PUBLIC is also not enough on Supabase. Its
-- ALTER DEFAULT PRIVILEGES grants EXECUTE on every new function in public to anon,
-- authenticated and service_role EXPLICITLY at creation time. So after revoking PUBLIC the
-- ACL still read `anon=X/postgres` and anon could still call it. Both revokes are needed.
--
-- Verified with has_function_privilege, never with the statement succeeding:
--   anon false, authenticated true.
revoke execute on function public.session_key(text, uuid) from public;
revoke execute on function public.session_key(text, uuid) from anon;
grant execute on function public.session_key(text, uuid) to authenticated;
