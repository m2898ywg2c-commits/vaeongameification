-- Leaderboard visibility. Opt-out for everyone. APPLIED on 2026-07-30.
--
-- WHY THE COLUMN EXISTS
--
-- Four of the eight types are Solo. The twelve statements they answered included "My best
-- sessions happen when it is just me and my headphones" and "I find group workouts more
-- distracting than motivating", they agreed, the app recorded it, and then it put them on
-- a public chart ranked against strangers and called that the community feature. The most
-- extreme social score in the live data is a Hunter at -5, which is as solo as the
-- instrument can measure.
--
-- WHY IT IS AN OPT-OUT AND NOT AN OPT-IN
--
-- The first version of this used the social pole to decide the default, so Solo types were
-- off the board unless they said otherwise. That was wrong for this product at this size,
-- for two reasons.
--
-- A leaderboard with five of twelve people on it is not a leaderboard, it is a list. The
-- board is the only social surface Vaeon has, and thinning it to defend a preference
-- nobody had actually complained about would have damaged the feature for everyone,
-- including the Together types whose whole type is built around it.
--
-- More importantly, a personality type is a description, not a permission slip. Reading
-- "trains best alone" and concluding "so remove them from the community" is the app making
-- a decision that belongs to the person. Preference is not consent, in either direction.
-- The honest version puts everybody on, tells Solo types plainly that they can step off,
-- and lets them choose. The type gets to inform the offer, not make it.
--
-- HOW
--
-- leaderboard_opt_in is NULLABLE.
--
--   null   never asked. Appears on the board, like everybody else.
--   true   explicitly asked to be on it. Appears.
--   false  explicitly asked to be off it. Hidden.
--
-- The column keeps its name. "opt_in = false" reads slightly oddly for an opt-out model,
-- and renaming a live column to fix a shade of wording is churn with no user benefit.
--
-- WHAT OPTING OUT DOES NOT DO
--
-- It hides you FROM the board. It does not hide the board from you, and it does not stop
-- you sending or receiving kudos. A solo preference is about not being ranked, not about
-- being cut off, and the crude version of this would have quietly made four people
-- unreachable on the only social surface in the app.

alter table profiles
  add column if not exists leaderboard_opt_in boolean;

comment on column profiles.leaderboard_opt_in is
  'Null means never asked and the user appears on the board. False hides them. True is an explicit choice to appear. Opt-out, not opt-in.';

-- type_is_together() lived here in the first version and drove the default. It is dropped:
-- nothing calls it now, and this codebase already carries one dead function
-- (get_recent_pbs) which is one more than it needs.
drop function if exists type_is_together(text);

create or replace function get_leaderboard()
returns table (
  user_id uuid,
  screen_name text,
  type_id text,
  pledged integer,
  weeks integer,
  block_weeks integer,
  done bigint,
  score numeric,
  kudos_count bigint
)
language sql
security definer
set search_path to 'public'
as $$
  with base as (
    select p.id, p.screen_name, p.sessions_per_week as pledged,
      coalesce(
        p.block_start,
        (select min(t.logged_at)::date from training_sessions t where t.user_id = p.id),
        p.created_at::date,
        current_date
      ) as block_start,
      coalesce(p.block_weeks, 6) as block_weeks,
      p.leaderboard_opt_in,
      (select ar.type_id from assessment_results ar where ar.user_id = p.id order by ar.completed_at desc limit 1) as type_id
    from profiles p
  ),
  visible as (
    select b.*
    from base b
    -- Everybody, unless they have explicitly said no.
    where coalesce(b.leaderboard_opt_in, true)
  ),
  calc as (
    select v.id, v.screen_name, v.pledged, v.block_start, v.block_weeks, v.type_id,
      greatest(1, least(v.block_weeks, floor((current_date - v.block_start)::numeric / 7.0)::int + 1)) as weeks
    from visible v
  )
  select c.id as user_id, c.screen_name as screen_name,
    c.type_id as type_id,
    c.pledged as pledged, c.weeks as weeks, c.block_weeks as block_weeks,
    (select count(*) from training_sessions t where t.user_id = c.id and t.logged_at >= c.block_start) as done,
    round(least(1.0, (select count(*) from training_sessions t where t.user_id = c.id and t.logged_at >= c.block_start)::numeric / greatest(coalesce(c.pledged,3) * c.weeks, 1)) * 100 * (1 + (greatest(coalesce(c.pledged,3),2) - 2) * 0.05), 1) as score
    ,(select count(*) from kudos k where k.to_user = c.id) as kudos_count
  from calc c
  order by score desc, done desc;
$$;
