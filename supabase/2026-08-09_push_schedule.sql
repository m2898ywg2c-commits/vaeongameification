-- APPLIED 2026-08-09 to project wctsiafaiogyciqnmvad.
--
-- WEB PUSH, FINISHED. The last item from the reminders work that had been sitting written but
-- not deployed since 30 July.
--
-- Three things happened, in this order:
--   1. supabase/functions/send-reminders deployed, verify_jwt on, version 1, ACTIVE.
--   2. pg_cron and pg_net enabled.
--   3. The hourly job below scheduled.
--
-- WHY THE SERVICE ROLE KEY IS READ FROM VAULT RATHER THAN WRITTEN INTO THE SCHEDULE
--
-- The obvious version of this, and the one in the old instructions in the function header,
-- pastes the service role key straight into the cron command:
--
--   headers := '{"Authorization": "Bearer eyJhbGci..."}'::jsonb
--
-- That key is then sitting in cron.job in plain text, readable by anything that can read the
-- database, and it is the key that bypasses every RLS policy in the project. It is also then
-- somewhere nobody thinks to look when the time comes to rotate it.
--
-- The command below reads it out of Vault when the job fires instead. Vault stores it
-- encrypted, the schedule holds only the lookup, and rotating the key means updating one
-- secret rather than remembering that a cron job exists.
--
-- THE JOB WAS SCHEDULED BEFORE THE SECRET EXISTED, ON PURPOSE.
--
-- The command is SQL text evaluated at execution time, so until the Vault secret is created
-- the Authorization header resolves to 'Bearer ' and the function returns 401. The job fails
-- harmlessly every hour and starts working the moment the secret appears, with nothing else to
-- do. That is a better failure mode than a schedule that has to be remembered and added later,
-- which is exactly how this feature came to sit undeployed for ten days.
--
-- WHAT IS STILL MANUAL, AND WHY IT HAS TO BE
--
-- Three secrets and one environment variable. None of them can be set from here, and none of
-- them should be: they are the halves of this system that must never pass through a repository,
-- a chat transcript or a tool call.
--
--   Supabase dashboard, Edge Functions -> send-reminders -> Secrets:
--     VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT
--   Vercel, Project Settings -> Environment Variables:
--     NEXT_PUBLIC_VAPID_PUBLIC_KEY, then REDEPLOY. It is baked in at build time, so setting
--     it without a rebuild changes nothing.
--   SQL editor, once:
--     select vault.create_secret('<service role key>', 'service_role_key');
--
-- The VAPID pair was generated on 2026-08-09 into vapid-keys.local.txt, which is gitignored.
-- Delete that file once both halves are pasted.

-- ============================================================================
-- THE ROLLOUT GATE, ADDED THE SAME DAY AND BEFORE ANY SECRET EXISTED
-- ============================================================================
--
-- due_reminders() scans every profile with reminder_enabled set, and Netballsue already had
-- it on. She would have started receiving push the moment the VAPID secrets landed, without
-- ever having been told the feature existed. Caught before the secrets were set rather than
-- after, which is the only reason this is a note and not an apology.
--
-- push_enabled is an OPERATOR gate and is not the same thing as reminder_enabled, which is
-- the user's own stated preference. The tempting shortcut, switching her reminder_enabled to
-- false to keep her out of the pilot, silently overrides a choice she made herself and leaves
-- her with no way to understand why her reminders stopped. Two flags, two meanings.
--
-- The in-app reminder is untouched and still reaches everybody. It is client side and never
-- goes through due_reminders(). Only the push half is gated, which is the right split: push
-- is the part that needs someone's permission and arrives on their lock screen.
--
-- Verified after applying, inside a transaction that was rolled back so nothing changed:
-- opening the gate for Netballsue makes her a candidate, closing it removes her. The gate is
-- what excludes her, not some incidental condition that might quietly stop holding.

alter table profiles add column if not exists push_enabled boolean not null default false;

comment on column profiles.push_enabled is
  'Push notification rollout gate, operator controlled. Separate from reminder_enabled, which is the user''s own preference. Only gates push; the in-app reminder is unaffected.';

-- due_reminders() gains `and p.push_enabled`. Reproduced in full rather than described, because
-- "it is the same as the other one plus a line" is how the two copies drift apart.

create or replace function public.due_reminders()
returns table(user_id uuid, screen_name text, type_id text, framing text, occasion text,
              days_since_log integer, sessions_this_week integer, pledged integer)
language sql
security definer
set search_path to 'public', 'pg_temp'
as $function$
  with base as (
    select p.id, p.screen_name, p.framing,
      coalesce(p.sessions_per_week, 3) as pledged,
      (select a.type_id from assessment_results a
        where a.user_id = p.id order by a.completed_at desc limit 1) as type_id,
      greatest(
        (select max(e.logged_at) from exercise_logs e where e.user_id = p.id),
        (select max(s.logged_at) from training_sessions s where s.user_id = p.id)
      ) as last_activity,
      (select count(distinct session_key(s.day_key, s.id)) from training_sessions s
        where s.user_id = p.id
          and s.logged_at >= week_start((now() at time zone coalesce(p.reminder_tz, 'Europe/London'))::date)
      )::int as done_this_week,
      (now() at time zone coalesce(p.reminder_tz, 'Europe/London')) as local_now
    from profiles p
    where p.reminder_enabled
      and p.push_enabled
      and p.reminder_hour is not null
      and (p.last_reminded_at is null
        or (p.last_reminded_at at time zone coalesce(p.reminder_tz, 'Europe/London'))::date
           < (now() at time zone coalesce(p.reminder_tz, 'Europe/London'))::date)
      and extract(hour from (now() at time zone coalesce(p.reminder_tz, 'Europe/London'))) >= p.reminder_hour
  ),
  scored as (
    select b.*,
      case when b.last_activity is null then 999
           else extract(day from (b.local_now - (b.last_activity at time zone 'UTC')))::int
      end as days_since
    from base b
  )
  select s.id, s.screen_name, s.type_id, s.framing,
    case
      when s.done_this_week >= s.pledged then 'due'
      when s.days_since >= 7 then 'lapsed'
      when s.days_since >= 3 then 'drifting'
      when s.days_since >= 1 then 'missed'
      when extract(dow from s.local_now) in (5, 6, 0) then 'short'
      else 'due'
    end as occasion,
    s.days_since, s.done_this_week, s.pledged
  from scored s
  where s.done_this_week < s.pledged;
$function$;

update profiles set push_enabled = true where screen_name = 'Hampo-1978';

-- ============================================================================
-- THE SCHEDULE
-- ============================================================================

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'vaeon-reminders',
  -- Hourly, not by-the-minute. due_reminders() compares on the hour rather than the exact
  -- minute precisely so that an hourly schedule cannot miss anybody, and it deduplicates on
  -- last_reminded_at, so running twice in one hour is harmless.
  '0 * * * *',
  $job$
  select net.http_post(
    url := 'https://wctsiafaiogyciqnmvad.supabase.co/functions/v1/send-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (
        select decrypted_secret from vault.decrypted_secrets where name = 'service_role_key'
      )
    ),
    timeout_milliseconds := 30000
  );
  $job$
);

-- Checking on it later:
--
--   select jobid, jobname, schedule, active from cron.job;
--   select status, return_message, start_time
--     from cron.job_run_details where jobname = 'vaeon-reminders'
--     order by start_time desc limit 10;
--
-- The function's own response is the useful one and it is in the edge function logs rather
-- than here: {"candidates":N,"sent":N,"failed":N}. candidates greater than zero with sent at
-- zero means people are due but have no push subscription rows, which is the expected state
-- until somebody enables reminders on a device.
--
-- To stop it:  select cron.unschedule('vaeon-reminders');
