-- Disclaimer acceptance. APPLIED to the live database on 2026-07-29.
--
-- Records that a user actively agreed to the training and AI disclaimer, when they did it,
-- and which wording they saw. The version matters more than the flag: copy changes over
-- time, and "this user accepted the 2026-07-29 wording on this date" is the only form of
-- the record that is any use if it is ever questioned. A bare boolean tells you nothing
-- about what was actually agreed to.
--
-- The version string is DISCLAIMER_VERSION in app/Disclaimer.js. Bump both together when
-- the wording changes materially, and existing users will be asked again on next sign-in
-- if you choose to gate on it.
--
-- The app tolerates this migration being absent: signup writes acceptance in a separate
-- failure-tolerant update, exactly as onboarding does for block_weeks. The tick box still
-- blocks the form either way, so nobody gets through without agreeing. What is lost
-- without the migration is the evidence, which is the entire point.
--
-- Verified after applying: both columns present, all existing rows null (no backfill, by
-- design), and zero acceptances recorded at the time of the migration since no signups had
-- yet run through the new flow.

-- 1. The columns. Nullable on purpose: existing users signed up before the disclaimer
--    existed and back-dating a consent they never gave would be worse than having no
--    record at all.
alter table profiles add column if not exists disclaimer_accepted_at timestamptz;
alter table profiles add column if not exists disclaimer_version text;

-- 2. Anyone who predates the disclaimer stays null and can be prompted on next sign-in.
--    Deliberately no backfill. If you want to find them:
--      select count(*) from profiles where disclaimer_accepted_at is null;

comment on column profiles.disclaimer_accepted_at is
  'When the user ticked to accept the training and AI disclaimer. Null means never asked or never accepted.';
comment on column profiles.disclaimer_version is
  'Value of DISCLAIMER_VERSION (app/Disclaimer.js) at the moment of acceptance.';
