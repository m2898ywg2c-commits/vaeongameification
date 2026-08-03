-- Exercises a person has said are not for them.
--
-- WHY THIS IS A SEPARATE TABLE FROM set_feedback.
--
-- set_feedback answers "was that the right load", gets tapped several times a session and
-- is cheap to be wrong about. This answers "stop giving me this movement", should be tapped
-- rarely, and changes the plan. Putting a third button on the same row would have made the
-- casual answer and the consequential one look identical, and both signals would be worse
-- for it.
--
-- WHY reason IS NOT FREE TEXT.
--
-- Three fixed answers can be counted. "My shoulder has been playing up since squash" cannot,
-- and inviting it would mean holding health information volunteered in a text box, which is
-- a different category of data with different obligations. Three buttons collect what the
-- plan needs and nothing it does not.
--
-- WHAT THIS DELIBERATELY DOES NOT DO.
--
-- Nothing here suggests a replacement movement. The app cannot tell a niggle from a torn
-- labrum, and prescribing a different shoulder exercise to somebody whose shoulder hurts is
-- a clinical judgement it is not qualified to make. The slot is dropped. That is all.
--
-- Run once in the Supabase SQL editor. Idempotent.

create table if not exists exercise_prefs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  exercise text not null,
  reason text not null check (reason in ('dislike', 'no_kit', 'hurts')),
  created_at timestamptz default now(),
  -- One standing decision per exercise. Changing your mind replaces it.
  unique (user_id, exercise)
);

create index if not exists exercise_prefs_user on exercise_prefs (user_id);

alter table exercise_prefs enable row level security;

drop policy if exists "own exercise_prefs select" on exercise_prefs;
drop policy if exists "own exercise_prefs insert" on exercise_prefs;
drop policy if exists "own exercise_prefs update" on exercise_prefs;
drop policy if exists "own exercise_prefs delete" on exercise_prefs;

create policy "own exercise_prefs select" on exercise_prefs for select using (auth.uid() = user_id);
create policy "own exercise_prefs insert" on exercise_prefs for insert with check (auth.uid() = user_id);
create policy "own exercise_prefs update" on exercise_prefs for update using (auth.uid() = user_id);
-- Delete matters: this has to be undoable, or one bad day permanently removes a lift.
create policy "own exercise_prefs delete" on exercise_prefs for delete using (auth.uid() = user_id);
