-- Group challenges. APPLIED to the live database on 2026-07-30.
--
-- WHY
--
-- The strongest engagement number in anything published about this category is Strava's
-- challenges. The widely quoted figure is 90-day retention moving from 18% to 32%. That
-- comes from a vendor case study rather than from Strava, so treat the number as
-- directional rather than as fact, but the direction is consistent across every source:
-- a shared goal outperforms a ranked board.
--
-- It also suits this app's actual users better than the leaderboard does. Twelve people,
-- most of them one family. A ranking says "you are seventh". A challenge says "we are
-- four sessions off, somebody do one". The second is the one that gets a text message
-- sent on a Thursday night, and a text message from your sister is worth more than any
-- notification this app will ever send.
--
-- DESIGN
--
-- Everybody is in. There is no join, no invite, no membership table. At this size a
-- challenge somebody has to opt into is a challenge with three people in it, and the
-- whole value is the shared total. When Vaeon has enough users that one global challenge
-- stops making sense, this needs a groups table, and that is a good problem.
--
-- A challenge is a window and a target. Progress is counted from training_sessions, the
-- same source as the leaderboard and the streak, so the three can never disagree.
--
-- TARGET TYPES
--
--   collective  one number the whole group adds up to. "Forty sessions between us."
--               Nobody can lose it for anybody else, which is the point: this is the
--               version that works for a family with one very fit member and one who has
--               not started yet.
--   personal    everybody chases the same individual number. "Three sessions each."
--               Comparable without being a ranking.
--
-- Collective is the default and the one to reach for. Personal exists because "everyone
-- log three" is a genuinely different and sometimes better ask.

create table if not exists challenges (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  blurb text,
  -- 'collective' or 'personal'. Deliberately a check rather than an enum: adding a type
  -- to an enum in Postgres is a migration with more ceremony than this deserves.
  kind text not null default 'collective' check (kind in ('collective', 'personal')),
  target int not null check (target > 0),
  starts_on date not null,
  ends_on date not null,
  created_at timestamptz not null default now(),
  check (ends_on >= starts_on)
);

alter table challenges enable row level security;

-- Readable by anyone signed in, writable by nobody through the API. Challenges are set by
-- James in the SQL editor for now. A create-a-challenge UI is a reasonable next step, and
-- it is not needed to find out whether challenges work.
drop policy if exists "challenges readable" on challenges;
create policy "challenges readable" on challenges
  for select to authenticated using (true);

-- ============================================================================
-- current_challenge()
-- ============================================================================
--
-- The live challenge plus everybody's progress in one call, so the dashboard card costs
-- one round trip.
--
-- SECURITY DEFINER for the same reason as get_leaderboard(): it reads session counts
-- across users, which RLS correctly forbids. It returns counts and screen names only, and
-- it honours leaderboard_opt_in, because somebody who asked not to be ranked in public
-- has not agreed to appear in a different public list instead. Their sessions still count
-- toward the collective total, they simply are not named. That is the honest reading of
-- what they asked for.
create or replace function current_challenge()
returns table (
  id uuid,
  title text,
  blurb text,
  kind text,
  target int,
  starts_on date,
  ends_on date,
  days_left int,
  total_done bigint,
  my_done bigint,
  participants jsonb
)
language sql
security definer
set search_path = public
as $$
  with c as (
    select * from challenges
    where current_date between starts_on and ends_on
    order by starts_on desc
    limit 1
  ),
  counts as (
    select
      p.id,
      p.screen_name,
      coalesce(p.leaderboard_opt_in, true) as named,
      (
        select count(*) from training_sessions t
        where t.user_id = p.id
          and t.logged_at >= (select starts_on from c)
          and t.logged_at < (select ends_on from c) + 1
      ) as done
    from profiles p
    where exists (select 1 from c)
  )
  select
    c.id, c.title, c.blurb, c.kind, c.target, c.starts_on, c.ends_on,
    (c.ends_on - current_date)::int as days_left,
    (select coalesce(sum(done), 0) from counts) as total_done,
    (select coalesce(sum(done), 0) from counts where id = auth.uid()) as my_done,
    (
      select coalesce(jsonb_agg(jsonb_build_object('name', screen_name, 'done', done)
                                order by done desc, screen_name), '[]'::jsonb)
      from counts where named and done > 0
    ) as participants
  from c;
$$;

revoke all on function current_challenge() from public, anon;
grant execute on function current_challenge() to authenticated;

-- A first challenge to test the mechanism with. One week, collective, and the target is
-- set deliberately low: eight sessions across twelve people is a bar this group has never
-- cleared, and a challenge nobody reaches teaches nothing except that challenges do not
-- work here. Raise it when there is evidence to raise it against.
insert into challenges (title, blurb, kind, target, starts_on, ends_on)
select
  'First week together',
  'Eight sessions between all of us. Any session counts, from anyone.',
  'collective',
  8,
  current_date,
  current_date + 6
where not exists (select 1 from challenges where current_date between starts_on and ends_on);
