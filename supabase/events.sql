-- Product events. APPLIED to the live database on 2026-07-30.
--
-- WHY THIS EXISTS
--
-- Vaeon's entire product argument is that it tells you whether your training is working.
-- Until now the app could not answer that question about itself. Working out how many
-- people had ever logged an exercise took a hand-written SQL join across four tables,
-- and the answer (four of twelve, none of the four earliest signups) was a surprise.
-- That is not a reporting inconvenience, it is flying blind on the only number that
-- decides whether there is a business here.
--
-- This table is an append-only log of things people actually did, designed to answer a
-- specific short list of questions over the six-week test starting 2026-07-30:
--
--   1. Where does the funnel leak? signup -> assessment -> onboarding -> first log.
--   2. Do people come back? Day 2, day 7, day 14 return rates.
--   3. Does personality type predict adherence, or is the typing decoration?
--   4. Does the reminder work? reminder_sent -> reminder_opened -> a log within the day.
--   5. Do freestyle types behave differently once the plan stops pretending they are not?
--
-- DESIGN NOTES
--
-- on delete SET NULL, not cascade. Every other table in this database cascades off
-- profiles, which is right for personal data: delete the account, delete the training
-- history. Events are the exception for the same reason `feedback` is. The whole point
-- of the table is to explain why people leave, and cascading would delete exactly the
-- rows that answer that question at exactly the moment they became interesting.
-- Orphaning the row anonymises it: no user_id, no RLS visibility to anyone, but the
-- shape of the funnel survives. That is the erasure-friendly version of analytics.
--
-- type_id and framing are DENORMALISED onto the event on purpose. A user can retake the
-- assessment and change type (one already has, six days in). Joining to the current type
-- at analysis time would silently rewrite history and quietly ruin question 3. What
-- matters is the type they held when they did the thing.
--
-- local_hour is the user's own clock hour, not UTC. It is here to test the chronotype
-- hypothesis directly: do people who self-report as morning types actually train in the
-- morning, and does nudging them in their window change anything?
--
-- NO CHECK CONSTRAINT on name, deliberately, and unlike kudos.note_code. The kudos
-- vocabulary is constrained because an open text channel between adults and minors is a
-- safeguarding problem the app cannot carry. Nothing equivalent is at stake here, and a
-- six-week test is exactly when you most want to add an event without a migration. The
-- vocabulary lives in EVENTS in lib/events.js instead, and the helper refuses to send a
-- name that is not in it. Discipline in the code, flexibility in the table.
--
-- Append only. There are insert and select policies and deliberately no update or delete
-- policy, so a client holding an anon key cannot rewrite or quietly prune its own trail.
--
-- The policies use (select auth.uid()) rather than a bare auth.uid(). The bare form is
-- re-evaluated once per row, which the Supabase performance advisor flags on every other
-- table in this database. It does not matter at twelve users. It will matter here first,
-- because this table will outgrow every other table by an order of magnitude.
--
-- The app tolerates this migration being absent. lib/events.js swallows every error, so
-- a missing table costs a failed insert per event and nothing else. Instrumentation must
-- never be able to break the thing it is measuring.

create table if not exists events (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete set null,
  name text not null,
  type_id text,
  framing text,
  session_id text,
  local_hour int check (local_hour is null or (local_hour between 0 and 23)),
  props jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- (user_id, created_at) is every per-person question: did this user come back, what did
-- they do first, how long between signup and first log.
create index if not exists events_user_created_idx on events (user_id, created_at desc);

-- (name, created_at) is every funnel question: how many signups this week, how many
-- first logs, how many reminders opened.
create index if not exists events_name_created_idx on events (name, created_at desc);

-- (type_id, name) is question 3 and nothing else, but question 3 is the one that decides
-- whether the personality model is a product or a paint job.
create index if not exists events_type_name_idx on events (type_id, name) where type_id is not null;

alter table events enable row level security;

drop policy if exists "own events insert" on events;
drop policy if exists "own events select" on events;

create policy "own events insert" on events
  for insert with check ((select auth.uid()) = user_id);

create policy "own events select" on events
  for select using ((select auth.uid()) = user_id);
