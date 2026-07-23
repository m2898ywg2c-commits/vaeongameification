-- Feedback collection. Users submit, you read it in the SQL editor or table view.
-- Run once in the Supabase SQL editor. Idempotent.

create table if not exists feedback (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete set null,
  message text not null,
  created_at timestamptz default now()
);

alter table feedback enable row level security;

-- Users can submit their own feedback. No select policy, so nobody reads anyone else's
-- through the app; you read it as owner in the dashboard.
drop policy if exists "own feedback insert" on feedback;
create policy "own feedback insert" on feedback for insert with check (auth.uid() = user_id);
