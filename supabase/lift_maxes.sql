-- Per-lift measured maxes, learned from what you actually log. The testing week
-- (block week one) and every logged set feed this, so plans build off real data
-- rather than the bench/squat ratio guess. Manual baselines still work as a shortcut.
-- Run once in the Supabase SQL editor. Idempotent.

create table if not exists lift_maxes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  exercise text not null,
  est_max numeric not null,
  updated_at timestamptz default now(),
  unique (user_id, exercise)
);

alter table lift_maxes enable row level security;

drop policy if exists "own lift_maxes select" on lift_maxes;
drop policy if exists "own lift_maxes insert" on lift_maxes;
drop policy if exists "own lift_maxes update" on lift_maxes;

create policy "own lift_maxes select" on lift_maxes for select using (auth.uid() = user_id);
create policy "own lift_maxes insert" on lift_maxes for insert with check (auth.uid() = user_id);
create policy "own lift_maxes update" on lift_maxes for update using (auth.uid() = user_id);

-- Upserts the running best estimated max for a lift. Only ever moves up, which is
-- what makes the next block replan itself off your real numbers.
create or replace function record_lift_max(p_exercise text, p_est numeric)
returns void
language sql
security invoker
set search_path to 'public'
as $function$
  insert into lift_maxes (user_id, exercise, est_max, updated_at)
  values (auth.uid(), p_exercise, p_est, now())
  on conflict (user_id, exercise)
  do update set est_max = greatest(lift_maxes.est_max, excluded.est_max), updated_at = now();
$function$;
