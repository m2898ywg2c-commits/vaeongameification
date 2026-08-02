-- How a logged exercise actually felt, captured at the moment it was finished.
--
-- WHY THIS IS NOT GOOD/BAD.
--
-- The point of collecting it is to build a better programme. "Good" and "bad" record a
-- mood and leave you guessing what to change; too easy and too hard name the adjustment
-- directly, which is the only reason to store the row at all.
--
-- WHY THERE IS NO CHAT SURFACE.
--
-- A conversational widget needs somewhere to live, and on a phone the only free corner is
-- sitting on top of the Finish button. One tap on the card you have just closed costs the
-- user nothing and collects the same signal.
--
-- Grain is one row per exercise per day, not per set, matching the decision already made
-- for EXERCISE_LOGGED in app/plan/page.js: sets are a property of the exercise here, and
-- five rows for a five-set squat would drown a one-set deadlift in any comparison.
--
-- Run once in the Supabase SQL editor. Idempotent.

create table if not exists set_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  day_key text not null,
  exercise text not null,
  verdict text not null check (verdict in ('easy', 'right', 'hard')),
  logged_at timestamptz default now(),
  -- One verdict per exercise per day. Changing your mind overwrites rather than
  -- appending, so the table stays a record of opinion and not of tapping.
  unique (user_id, day_key, exercise)
);

create index if not exists set_feedback_user_exercise on set_feedback (user_id, exercise);

alter table set_feedback enable row level security;

drop policy if exists "own set_feedback select" on set_feedback;
drop policy if exists "own set_feedback insert" on set_feedback;
drop policy if exists "own set_feedback update" on set_feedback;
drop policy if exists "own set_feedback delete" on set_feedback;

create policy "own set_feedback select" on set_feedback for select using (auth.uid() = user_id);
create policy "own set_feedback insert" on set_feedback for insert with check (auth.uid() = user_id);
create policy "own set_feedback update" on set_feedback for update using (auth.uid() = user_id);
create policy "own set_feedback delete" on set_feedback for delete using (auth.uid() = user_id);
