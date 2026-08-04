-- Which side a set was done on.
--
-- Raised by a tester after a yoga session: "make sure both sides of a move are logged, ie
-- warrior 2 on right and left side". The plan was already correct, it prescribes "30 sec
-- per side" on twenty four exercises. The logging was what lost the second half: three set
-- rows with one box each, for something performed six times.
--
-- SCOPED TO TIMED HOLDS ON PURPOSE.
--
-- "12 per leg" on a walking lunge is one continuous set, and splitting it would double the
-- taps for no information anybody wants. A hold is different: one hip is always tighter
-- than the other, and that asymmetry is exactly what a yoga user is watching.
--
-- Null for everything symmetrical, which is nearly everything.
--
-- Run once in the Supabase SQL editor. Idempotent. ALREADY APPLIED to the live project.

alter table exercise_logs add column if not exists side text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'exercise_logs_side_check') then
    alter table exercise_logs add constraint exercise_logs_side_check
      check (side is null or side in ('left', 'right'));
  end if;
end $$;

comment on column exercise_logs.side is 'left or right for unilateral work, null when the movement is symmetrical.';
