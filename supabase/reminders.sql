-- Reminders. APPLIED to the live database on 2026-07-30.
--
-- WHY
--
-- Vaeon scores adherence, and until now it had no way of asking anyone to adhere. The
-- four earliest users logged nothing at all in their first ten days and the app said
-- nothing to any of them, because there was nothing in it that could. That is the gap
-- this closes.
--
-- Chronotype has been collected since the assessment shipped and never used for anything
-- except a tip on the results screen. The comment in lib/personality.js says it is
-- "stored for training-time guidance and future reminder timing". This is that.
--
-- WHAT IS AND IS NOT HERE
--
-- Two delivery routes share one decision:
--
--   In-app. Reaches everyone, works today, needs no permission and no third party. It is
--   what the dashboard says when you open it having missed a session, which is the moment
--   people actually churn.
--
--   Web push. Reaches only people who grant permission, and on iOS only people who have
--   installed the PWA first, so it will always be the smaller number. Needs VAPID keys
--   set as edge function secrets before it can send anything.
--
-- The in-app route is deliberately the one that does not depend on anything external. If
-- push never gets switched on, the reminder still works for every user.
--
-- TIMING
--
-- reminder_hour is a LOCAL hour, and reminder_tz is the IANA zone it is local to. Storing
-- UTC would be wrong the moment the clocks change: someone who chose 07:00 in July wants
-- 07:00 in December, not 06:00. Everyone is in the UK today, which is exactly the sort of
-- assumption that quietly breaks the first time someone signs up abroad, so the zone is
-- captured from the browser rather than assumed.
--
-- The default hour comes from chronotype and is then the user's to change. A default that
-- cannot be overridden is a worse product than no default, because the one thing worse
-- than no reminder is a reminder at the wrong time every day.
--
-- last_reminded_at is the deduplication key. The sender is expected to run on a schedule
-- and must be safe to run more than once in an hour, retry after a failure, and never
-- send the same person two nudges in a day.

alter table profiles
  add column if not exists reminder_enabled boolean not null default false,
  add column if not exists reminder_hour int,
  add column if not exists reminder_minute int not null default 0,
  add column if not exists reminder_tz text,
  add column if not exists last_reminded_at timestamptz;

alter table profiles drop constraint if exists profiles_reminder_hour_check;
alter table profiles add constraint profiles_reminder_hour_check
  check (reminder_hour is null or (reminder_hour between 0 and 23));

alter table profiles drop constraint if exists profiles_reminder_minute_check;
alter table profiles add constraint profiles_reminder_minute_check
  check (reminder_minute between 0 and 59);

-- Push subscriptions. One row per device, because the same person on a phone and a laptop
-- is two endpoints and silencing one should not silence the other.
--
-- Cascades off profiles, unlike events. A push endpoint is device-identifying data with no
-- analytical value once the account is gone, so there is nothing here worth keeping and a
-- good reason not to keep it.
create table if not exists push_subscriptions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  last_ok_at timestamptz,
  last_error text,
  unique (user_id, endpoint)
);

create index if not exists push_subscriptions_user_idx on push_subscriptions (user_id);

alter table push_subscriptions enable row level security;

drop policy if exists "own push_subscriptions select" on push_subscriptions;
drop policy if exists "own push_subscriptions insert" on push_subscriptions;
drop policy if exists "own push_subscriptions delete" on push_subscriptions;

create policy "own push_subscriptions select" on push_subscriptions
  for select using ((select auth.uid()) = user_id);
create policy "own push_subscriptions insert" on push_subscriptions
  for insert with check ((select auth.uid()) = user_id);
create policy "own push_subscriptions delete" on push_subscriptions
  for delete using ((select auth.uid()) = user_id);

-- ============================================================================
-- due_reminders()
-- ============================================================================
--
-- Returns everyone who should be nudged right now, with the facts needed to choose the
-- words. SECURITY DEFINER because it reads across users, in the same way and for the same
-- reason as get_leaderboard().
--
-- It returns an OCCASION, not a sentence. The wording lives in lib/reminders.js and, for
-- push, in a mirrored copy inside the edge function. That mirroring is a real cost and is
-- accepted for the same reason KUDOS_NOTES is mirrored between lib/kudos.js and a CHECK
-- constraint: the alternative is the database importing application copy, which is worse.
-- If you change an occasion here, change REMINDERS in lib/reminders.js too.
--
-- The occasions, in priority order, most urgent first:
--
--   lapsed    seven days or more since the last exercise log. The person has effectively
--             gone. This is the last honest attempt, not a nag.
--   drifting  three to six days. Recoverable, and the window where a nudge is worth most.
--   missed    logged something recently but nothing yesterday or today, and they are
--             behind their weekly pledge.
--   short     it is the back end of the week and they are below pledge with time left.
--   due       nothing else applies, they are on track, and a gentle prompt keeps the
--             habit warm.
--
-- "Behind pledge" is measured against sessions_per_week, the number they set themselves.
-- That matters: the reminder is holding people to their own commitment, not to a target
-- the app invented, which is the difference between a coach and a nag.
create or replace function due_reminders()
returns table (
  user_id uuid,
  screen_name text,
  type_id text,
  framing text,
  occasion text,
  days_since_log int,
  sessions_this_week int,
  pledged int
)
language sql
security definer
set search_path = public
as $$
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
      -- The most recent sign of life from EITHER source. exercise_logs alone is not
      -- enough: someone who only ever uses Quick log has training_sessions and no
      -- exercise_logs at all, and measuring staleness from exercise_logs would have
      -- told them they had lapsed while they were training four times a week. One of
      -- the twelve live users is in exactly that state.
      greatest(
        (select max(e.logged_at) from exercise_logs e where e.user_id = p.id),
        (select max(s.logged_at) from training_sessions s where s.user_id = p.id)
      ) as last_activity,
      (
        select count(*) from training_sessions s
        where s.user_id = p.id
          and s.logged_at >= date_trunc('week', now() at time zone coalesce(p.reminder_tz, 'Europe/London'))
      )::int as done_this_week,
      -- The user's own clock, not the server's.
      (now() at time zone coalesce(p.reminder_tz, 'Europe/London')) as local_now
    from profiles p
    where p.reminder_enabled
      and p.reminder_hour is not null
      -- One a day, maximum. A reminder that arrives twice is not twice as motivating.
      and (
        p.last_reminded_at is null
        or (p.last_reminded_at at time zone coalesce(p.reminder_tz, 'Europe/London'))::date
           < (now() at time zone coalesce(p.reminder_tz, 'Europe/London'))::date
      )
      -- Due when the local clock has reached their chosen time. Comparing on the hour
      -- rather than the exact minute means an hourly scheduler cannot miss anyone by
      -- running a few minutes late.
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
    -- Pledge is checked FIRST, ahead of staleness. Someone who has kept their weekly
    -- promise is not drifting even if the sessions were front-loaded and the last one
    -- was four days ago, and telling them otherwise would be the app failing to
    -- understand its own scoring.
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
  -- Somebody who has already hit their pledge for the week does not need chasing at all.
  -- The product scores adherence to a promise, and they have kept it.
  where s.done_this_week < s.pledged;
$$;

-- revoke ... from public is NOT enough on Supabase. anon and authenticated are granted
-- execute explicitly when a function is created, so revoking from public leaves them
-- holding it. Without naming them here, any signed-in user could call this over
-- /rest/v1/rpc and read every other user's screen name, type, framing and exactly how
-- long they have been lapsed. The Supabase security advisor catches this; it is worth
-- running after adding any SECURITY DEFINER function.
revoke all on function due_reminders() from public, anon, authenticated;
grant execute on function due_reminders() to service_role;

-- Marks a nudge as sent. Separate from the select so a sender that crashes halfway
-- through a batch does not silence everyone it had not reached yet.
create or replace function mark_reminded(p_user uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update profiles set last_reminded_at = now() where id = p_user;
$$;

revoke all on function mark_reminded(uuid) from public, anon, authenticated;
grant execute on function mark_reminded(uuid) to service_role;
