-- Distance and duration as numbers, so a run can be tracked rather than merely recorded.
--
-- WHAT WAS WRONG.
--
-- A run was logged into time_text, a free text column, from a box whose placeholder read
-- "time or distance". So the app asked for one of the two facts that define a run, kept it
-- as a string, and had no way to compare Tuesday's to last Tuesday's. Pace, the number
-- every runner actually cares about, was not derivable at all.
--
-- time_text is left alone and still written, because older rows are in it and nothing
-- should have to migrate to keep working.
--
-- Run once in the Supabase SQL editor. Idempotent.

alter table exercise_logs add column if not exists distance_km numeric;
alter table exercise_logs add column if not exists duration_min numeric;

comment on column exercise_logs.distance_km is 'Kilometres covered. Null for anything that is not endurance work.';
comment on column exercise_logs.duration_min is 'Minutes, decimal. 23.11 is twenty three point one one minutes, not 23m11s.';
