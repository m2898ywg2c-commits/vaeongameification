-- Type-fit feedback. A 1-5 resonance rating per user per type, so we can see whether the
-- eight types actually land. Run once in the Supabase SQL editor. Idempotent.

create table if not exists type_feedback (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  type_id text not null,
  score int not null check (score between 1 and 5),
  created_at timestamptz default now(),
  unique (user_id, type_id)
);

alter table type_feedback enable row level security;

drop policy if exists "own type_feedback select" on type_feedback;
drop policy if exists "own type_feedback insert" on type_feedback;
drop policy if exists "own type_feedback update" on type_feedback;

create policy "own type_feedback select" on type_feedback for select using (auth.uid() = user_id);
create policy "own type_feedback insert" on type_feedback for insert with check (auth.uid() = user_id);
create policy "own type_feedback update" on type_feedback for update using (auth.uid() = user_id);
