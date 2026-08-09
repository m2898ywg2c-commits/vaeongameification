-- APPLIED 2026-08-09 to project wctsiafaiogyciqnmvad.
--
-- Two functions the 2026-08-09 sweeps missed, both found while regenerating schema-live.sql.
-- Neither was reported by a user, which is the point: nothing on screen looked wrong.
--
-- 1. due_reminders() WAS STILL ON ISO MONDAYS.
--
-- The Sunday change earlier today claimed "no date_trunc('week'" left anywhere, and that was
-- true of app/ and lib/ and of the three call sites in Postgres that were known about. This is
-- a fourth, inside the reminder query, missed because the sweep was run against the repo
-- rather than against pg_catalog. Grep the database, not the checkout.
--
-- The consequence was worst on the day the week changes. On a Sunday, date_trunc('week')
-- returns the MONDAY SIX DAYS AGO, so done_this_week counted the whole of the week that had
-- just ended. Anybody who met their pledge last week was counted as having already met it on
-- the first day of the new one, and their Sunday reminder never fired. The one day the nudge
-- matters most is the one day it was guaranteed not to arrive.
--
-- 2. BOTH FUNCTIONS STILL COUNTED ROWS RATHER THAN SESSIONS.
--
-- Same fix as 2026-08-09_session_key.sql, which moved get_leaderboard, weeks_kept and
-- settle_streak_freezes onto session_key(). These two were not in that pass.
--
-- due_reminders compares done_this_week against the pledge, so it had to move or somebody who
-- completed one plan day four times would be told they had finished their week.
--
-- current_challenge is a judgement call rather than an obvious defect: a challenge counts
-- sessions towards a target and raw rows are arguably defensible. It moves anyway, because a
-- challenge total that disagrees with the leaderboard about the same fortnight is a support
-- question nobody can answer, and because "a session" should mean one thing in this app.
--
-- Verified after applying: week_start is now the ONLY function in the public schema whose body
-- contains date_trunc('week'), which is correct, because it is the definition.

create or replace function public.due_reminders()
returns table(user_id uuid, screen_name text, type_id text, framing text, occasion text,
              days_since_log integer, sessions_this_week integer, pledged integer)
language sql
security definer
set search_path to 'public', 'pg_temp'
as $function$
  with base as (
    select
      p.id,
      p.screen_name,
      p.framing,
      coalesce(p.sessions_per_week, 3) as pledged,
      (
        select a.type_id from assessment_results a
        where a.user_id = p.id
        order by a.completed_at desc
        limit 1
      ) as type_id,
      -- Staleness is measured against exercise_logs AND training_sessions. Somebody who logs
      -- every exercise but never taps Finish has no session row at all, and would be told
      -- they had lapsed while training. The mirror of this lives in app/dashboard/page.js.
      greatest(
        (select max(e.logged_at) from exercise_logs e where e.user_id = p.id),
        (select max(s.logged_at) from training_sessions s where s.user_id = p.id)
      ) as last_activity,
      (
        select count(distinct session_key(s.day_key, s.id)) from training_sessions s
        where s.user_id = p.id
          and s.logged_at >= week_start((now() at time zone coalesce(p.reminder_tz, 'Europe/London'))::date)
      )::int as done_this_week,
      (now() at time zone coalesce(p.reminder_tz, 'Europe/London')) as local_now
    from profiles p
    where p.reminder_enabled
      and p.reminder_hour is not null
      and (
        p.last_reminded_at is null
        or (p.last_reminded_at at time zone coalesce(p.reminder_tz, 'Europe/London'))::date
           < (now() at time zone coalesce(p.reminder_tz, 'Europe/London'))::date
      )
      and extract(hour from (now() at time zone coalesce(p.reminder_tz, 'Europe/London'))) >= p.reminder_hour
  ),
  scored as (
    select
      b.*,
      case
        when b.last_activity is null then 999
        else extract(day from (b.local_now - (b.last_activity at time zone 'UTC')))::int
      end as days_since
    from base b
  )
  select
    s.id,
    s.screen_name,
    s.type_id,
    s.framing,
    case
      when s.done_this_week >= s.pledged then 'due'
      when s.days_since >= 7 then 'lapsed'
      when s.days_since >= 3 then 'drifting'
      when s.days_since >= 1 then 'missed'
      when extract(dow from s.local_now) in (5, 6, 0) then 'short'
      else 'due'
    end as occasion,
    s.days_since,
    s.done_this_week,
    s.pledged
  from scored s
  where s.done_this_week < s.pledged;
$function$;

create or replace function public.current_challenge()
returns table(id uuid, title text, blurb text, kind text, target integer, starts_on date,
              ends_on date, days_left integer, total_done bigint, my_done bigint, participants jsonb)
language sql
security definer
set search_path to 'public', 'pg_temp'
as $function$
  with c as (
    select * from challenges
    where current_date between starts_on and ends_on
    order by starts_on desc
    limit 1
  ),
  counts as (
    select
      p.id,
      p.screen_name,
      coalesce(p.leaderboard_opt_in, true) as named,
      (
        select count(distinct session_key(t.day_key, t.id)) from training_sessions t
        where t.user_id = p.id
          and t.logged_at >= (select starts_on from c)
          and t.logged_at < (select ends_on from c) + 1
      ) as done
    from profiles p
    where exists (select 1 from c)
  )
  select
    c.id, c.title, c.blurb, c.kind, c.target, c.starts_on, c.ends_on,
    (c.ends_on - current_date)::int as days_left,
    (select coalesce(sum(done), 0) from counts) as total_done,
    (select coalesce(sum(done), 0) from counts where id = auth.uid()) as my_done,
    -- Only opted-in users are named. Everyone still counts towards the collective total,
    -- because opting out of the leaderboard is not opting out of the group effort.
    (
      select coalesce(jsonb_agg(jsonb_build_object('name', screen_name, 'done', done)
                                order by done desc, screen_name), '[]'::jsonb)
      from counts where named and done > 0
    ) as participants
  from c;
$function$;

-- No signature, security setting or grant changed on either function, so nothing to re-apply
-- from rpc_permissions.sql. Confirmed after applying:
--   due_reminders      anon false, authenticated false  (edge function only, via service role)
--   current_challenge  anon false, authenticated true
