-- THE ENGINE ROOM.
--
-- A conditioning session beside the plan rather than inside it: open it when you like, it
-- does not appear in the week, it does not count toward the pledge, and skipping it costs
-- nothing. Two things to store: where somebody is in the rotation, and what they scored.
--
-- Run this in the Supabase SQL editor. It is idempotent, so running it twice is harmless.

-- POSITION IN THE ROTATION, NOT A SESSION ID.
--
-- An integer that only moves forward. currentSession() in lib/engine.js takes it modulo the
-- library length, so adding a session later EXTENDS the rotation instead of resetting
-- anybody, and the order stays stable. Storing the session key instead would break the
-- moment the library is reordered.
alter table profiles add column if not exists engine_index integer not null default 0;

comment on column profiles.engine_index is
  'Position in the Engine Room rotation. Only ever increments; lib/engine.js wraps it modulo
   the library length. One session is unlocked at a time and finishing it advances this by
   one, which is what makes "the next one" meaningful without making the user pick from a
   list while standing in a gym.';

create table if not exists engine_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_key text not null,
  -- Rounds and the stations into the next one, stored separately because that is how the
  -- score is said out loud: "three rounds plus two".
  rounds integer not null default 0,
  extra_stations integer not null default 0,
  -- Total stations completed. Derived, and stored anyway: it is the only figure comparable
  -- across sessions with different station counts, and recomputing it later would need the
  -- library as it was on the day rather than as it is now.
  stations_total integer not null default 0,
  -- easy | right | brutal. The progression input: three at "easy" is what says lengthen the
  -- cap or add a station. Nullable because somebody can finish and not answer.
  effort text,
  logged_at timestamptz not null default now(),
  log_date date not null default (now() at time zone 'utc')::date
);

comment on table engine_logs is
  'One row per completed Engine Room session. Scored in rounds and stations rather than load,
   which is the only honest score for an AMRAP and compares cleanly to the same session a
   rotation later.';

create index if not exists engine_logs_user_date on engine_logs (user_id, log_date desc);
create index if not exists engine_logs_user_session on engine_logs (user_id, session_key, logged_at desc);

alter table engine_logs enable row level security;

drop policy if exists "engine_logs_select_own" on engine_logs;
create policy "engine_logs_select_own" on engine_logs
  for select using (auth.uid() = user_id);

drop policy if exists "engine_logs_insert_own" on engine_logs;
create policy "engine_logs_insert_own" on engine_logs
  for insert with check (auth.uid() = user_id);

drop policy if exists "engine_logs_update_own" on engine_logs;
create policy "engine_logs_update_own" on engine_logs
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "engine_logs_delete_own" on engine_logs;
create policy "engine_logs_delete_own" on engine_logs
  for delete using (auth.uid() = user_id);
