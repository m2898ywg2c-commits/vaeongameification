-- Streak freeze. APPLIED to the live database on 2026-07-30.
--
-- WHY
--
-- The streak counts consecutive weeks in which you hit the number of sessions you
-- pledged. Miss one week, by any margin, and it goes to zero. That is a rule written for
-- an imaginary person who never gets ill, never travels for work and never has a week
-- where everything falls over.
--
-- The habit design literature is consistent on this: a grace mechanism keeps people
-- going for longer than a strict streak does, because the fear of breaking a long run is
-- itself a reason to stop trying. Duolingo's streak freeze is the well-known version.
-- The numbers vendors publish for it are self-interested and should be taken with salt,
-- but the direction is not seriously disputed.
--
-- It also fits a rule already written into this codebase. The reminder copy in
-- lib/reminders.js does not scold, because shame after a lapse predicts deleting the app
-- and because there are under-18s here. Zeroing somebody's twelve-week streak for one
-- bad week is the same mistake in a different costume.
--
-- HOW IT WORKS
--
--   One credit per block, in profiles.freeze_credits, refreshed when a new block starts.
--   A credit is spent automatically on a completed week that fell short, and the week is
--   recorded in streak_freezes so the streak calculation can treat it as kept.
--
-- FOUR RULES, EACH THERE FOR A REASON
--
--   1. Completed weeks only. The current week is still winnable and spending a credit on
--      a week somebody might yet rescue would be taking something from them.
--
--   2. Only a week that is preceded by a kept week. A freeze protects a streak. Somebody
--      who has never strung two weeks together has no streak to protect, and burning
--      their one credit on week one of a block they had already drifted out of would give
--      them nothing and cost them the credit later when it mattered.
--
--   3. Only inside the current block. Credits are per block, so they cannot be spent on
--      history.
--
--   4. Idempotent, and safe to call on every dashboard load. Unique (user_id, week_start)
--      makes double-spending impossible even if two tabs race.
--
-- SECURITY INVOKER, deliberately, unlike get_leaderboard() and due_reminders(). This
-- function only ever touches the caller's own rows, so it has no business running with
-- elevated rights. RLS is doing the work and that is the correct place for it.

alter table profiles
  add column if not exists freeze_credits int not null default 1;

alter table profiles drop constraint if exists profiles_freeze_credits_check;
alter table profiles add constraint profiles_freeze_credits_check
  check (freeze_credits >= 0);

comment on column profiles.freeze_credits is
  'Grace weeks remaining in the current block. One per block, refreshed on block start.';

create table if not exists streak_freezes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  -- Monday of the protected week, matching weekStart() in lib/plan.js.
  week_start date not null,
  created_at timestamptz not null default now(),
  unique (user_id, week_start)
);

create index if not exists streak_freezes_user_idx on streak_freezes (user_id, week_start desc);

alter table streak_freezes enable row level security;

drop policy if exists "own streak_freezes select" on streak_freezes;
drop policy if exists "own streak_freezes insert" on streak_freezes;

create policy "own streak_freezes select" on streak_freezes
  for select using ((select auth.uid()) = user_id);
create policy "own streak_freezes insert" on streak_freezes
  for insert with check ((select auth.uid()) = user_id);

-- Returns the number of credits left after settling, so the caller can show it without a
-- second round trip.
create or replace function settle_streak_freezes()
returns int
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_pledged int;
  v_credits int;
  v_block_start date;
  v_this_week date := date_trunc('week', current_date)::date;
  r record;
  v_prev_kept boolean := false;
  v_first boolean := true;
begin
  if v_user is null then
    return 0;
  end if;

  select coalesce(sessions_per_week, 3), coalesce(freeze_credits, 0), block_start
    into v_pledged, v_credits, v_block_start
  from profiles where id = v_user;

  if v_block_start is null then
    return coalesce(v_credits, 0);
  end if;

  for r in
    with weeks as (
      select generate_series(
        date_trunc('week', v_block_start)::date,
        v_this_week - 7,
        interval '7 days'
      )::date as wk
    )
    select
      w.wk,
      (
        select count(*) from training_sessions t
        where t.user_id = v_user
          and t.logged_at >= w.wk
          and t.logged_at < w.wk + 7
      )::int as done,
      exists (
        select 1 from streak_freezes f
        where f.user_id = v_user and f.week_start = w.wk
      ) as frozen
    from weeks w
    order by w.wk
  loop
    -- A week is kept if the pledge was met or a credit already protects it.
    if r.done >= v_pledged or r.frozen then
      v_prev_kept := true;
    else
      -- Rule 2: only spend on a miss that actually interrupts something. The first week
      -- of a block has no predecessor inside the block, so it is never protected.
      if v_credits > 0 and v_prev_kept and not v_first then
        insert into streak_freezes (user_id, week_start)
        values (v_user, r.wk)
        on conflict (user_id, week_start) do nothing;

        if found then
          v_credits := v_credits - 1;
          update profiles set freeze_credits = v_credits where id = v_user;
          v_prev_kept := true;
        else
          v_prev_kept := false;
        end if;
      else
        v_prev_kept := false;
      end if;
    end if;
    v_first := false;
  end loop;

  return v_credits;
end;
$$;

revoke all on function settle_streak_freezes() from public, anon;
grant execute on function settle_streak_freezes() to authenticated;
