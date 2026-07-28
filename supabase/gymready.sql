-- Gym ready: per-user block length.
--
-- NOT YET APPLIED. The Supabase SQL editor was hanging when this was written, so the app
-- code was deliberately built to work with or without this migration:
--
--   * lib/gymready.js blockWeeksFor() falls back to deriving the length from the goal
--     (8 for Gym ready, 6 for everyone else) when profiles.block_weeks is absent.
--   * app/onboarding writes block_weeks in a separate, failure-tolerant update, so it
--     starts being stored the moment this migration runs, and is ignored until then.
--   * app/leaderboard reads r.block_weeks || 6.
--
-- Until this is run there is one real consequence, and it is the reason to run it soon:
-- get_leaderboard() computes weeks elapsed against a hardcoded six-week block, so a Gym
-- ready user in weeks seven and eight has a denominator that has stopped growing. Their
-- adherence score inflates, and their row reads "wk 6/8".

-- 1. The column. Existing users keep the six-week behaviour they already had.
alter table profiles add column if not exists block_weeks int not null default 6;

-- 2. Backfill anyone who has already chosen Gym ready.
update profiles
set block_weeks = 8
where goals ? 'gymready'
  and block_weeks <> 8;

-- 3. get_leaderboard() still needs rewriting, and the current definition must be read
--    first rather than guessed, because its scoring is load bearing:
--
--      select pg_get_functiondef(oid) from pg_proc where proname = 'get_leaderboard';
--
--    Two changes are needed once we have it:
--      a) replace the hardcoded 6 used for weeks elapsed with that user's block_weeks,
--         so the adherence denominator keeps growing through weeks seven and eight;
--      b) add block_weeks to the returned columns, because the leaderboard shows other
--         people's rows and each person's block length may differ.
