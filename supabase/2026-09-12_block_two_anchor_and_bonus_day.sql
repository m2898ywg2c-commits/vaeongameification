-- APPLIED to project wctsiafaiogyciqnmvad on 2026-09-12.
--
-- Block two groundwork, off the first six weeks of real data anybody has completed.
-- Three separate things, all downstream of the same finding.
--
-- ----------------------------------------------------------------------------------------
-- 1. THE PRESCRIPTION ANCHOR IS NO LONGER est_max, AND THERE IS NO SCHEMA CHANGE FOR IT.
-- ----------------------------------------------------------------------------------------
--
-- record_lift_max() does greatest(existing, new), so est_max only ever climbs. That is right
-- for a personal best and wrong for the input to a prescription, because the prescription is
-- what produced the set that raised it. Measured across James's block:
--
--   Back Squat        estimated max 120 -> 168    +40%
--   Romanian Deadlift               120 -> 187    +56%
--   Hip Thrust                      140 -> 207    +48%
--   Leg Press                       150 -> 409   +173%
--
-- Bench, the one lift whose testing week was a genuine effort, moved 2.5 percent. Every lift
-- that "gained" forty percent is a lift whose week one was entered light, and the loop booked
-- the correction as progress.
--
-- The fix lives in the client, in anchorFrom() in lib/progression.js: the anchor is the best
-- effort across the last three SESSIONS, capped just above the most recent one, read off
-- exercise_logs. So record_lift_max and this table are UNCHANGED and est_max keeps doing the
-- job it is good at. It is only the meaning that has narrowed, which is what the comment
-- below records, because the next person to read this table will otherwise assume est_max is
-- still what builds the plan.

comment on column lift_maxes.est_max is
  'Best estimated one-rep max ever recorded for this lift, via record_lift_max and greatest().
   NOT the prescription anchor since 2026-09-12: because it only ever climbs and the plan is
   derived from it, the two formed a feedback loop that added 40 to 173 percent to James''s
   lifts across one six week block. The plan now anchors on anchorFrom() in
   lib/progression.js, computed from the last three sessions in exercise_logs. This column
   remains the personal-best record and the fallback for a movement with no logged sessions.';

-- ----------------------------------------------------------------------------------------
-- 2. THE BONUS DAY. A DAY IN THE PLAN THAT IS NOT A DAY IN THE PLEDGE.
-- ----------------------------------------------------------------------------------------
--
-- sessions_per_week was doing two jobs that have come apart. It decides how many days the
-- week contains, and it is the denominator get_leaderboard, settle_streak_freezes and
-- weeks_kept all score adherence against.
--
-- James pledged four sessions last block and trained twice in four of the six weeks, with one
-- week at zero: thirteen sessions against twenty four pledged. The pledge was fiction and he
-- was scored against it every week. He is moving to three mornings with an optional fourth,
-- and raising sessions_per_week to four so the fourth day appears would rebuild the exact
-- problem he is leaving.
--
-- So this adds a day to the PLAN without touching the PLEDGE. No scoring change is needed:
-- get_leaderboard already caps done at the pledge and returns the overshoot as extra, so a
-- logged fourth session reads "3 of 3 +1". Credit for turning up, no penalty for not.

alter table profiles add column if not exists bonus_day boolean not null default false;

comment on column profiles.bonus_day is
  'Adds one extra day to the built week without changing sessions_per_week, which is the
   adherence denominator. For "three mornings, maybe four". The extra day is whatever sits
   next in the goal''s authored day list, which is why a goal that wants a bonus day puts it
   last: see hyroxlean in lib/training.js.';

-- ----------------------------------------------------------------------------------------
-- 3. TWO POISONED MAXES, CORRECTED BY HAND.
-- ----------------------------------------------------------------------------------------
--
-- greatest() means a bad row is permanent. Two of James's are bad, and because these are the
-- fallback for any movement without recent sessions they would still have surfaced.
--
--   Overhead Press          est_max 60, from a single 50kg x 6 in week one.
--                           He pressed 30kg x 6 six weeks later. Corrected to 36, which is
--                           that set, so the anchor and the PB agree.
--
--   Incline Dumbbell Press  est_max 114, from a week one entry of 90kg x 8. He has logged 44
--                           to 64 in every session since, and the card asks for the weight of
--                           ONE dumbbell. 90 is either the pair or a slip. Corrected to 78.9,
--                           his best since, which is 64kg x 7.
--
-- Leg Press is deliberately LEFT at 408.8 even though it grew 173 percent. 272.5kg x 15 on a
-- plate-loaded press is entirely plausible for a man squatting 140, and he logged it nine
-- days ago. Week one at 100kg was the under-entry, not week six. The cap in blockGainCap now
-- stops the climb; there is nothing here to correct.

update lift_maxes set est_max = 36, updated_at = now()
where user_id = 'cd0f49a2-472a-432f-92a4-fb7d73230136'
  and exercise = 'Overhead Press' and est_max > 36;

update lift_maxes set est_max = 78.9, updated_at = now()
where user_id = 'cd0f49a2-472a-432f-92a4-fb7d73230136'
  and exercise = 'Incline Dumbbell Press' and est_max > 78.9;

-- The manual baselines are the ratio-table fallback for a movement with no history of its
-- own, and both still held the 100kg he typed in during onboarding in July. Block two
-- introduces a conventional Deadlift, which he has never logged, and at a squat baseline of
-- 100 the table would have suggested 120 as his deadlift max against a Romanian Deadlift he
-- takes to 140 x 10. Set to his measured anchors so the fallback is at least in the right
-- decade.

update profiles set baseline_squat = 167.8, baseline_bench = 133
where id = 'cd0f49a2-472a-432f-92a4-fb7d73230136';
