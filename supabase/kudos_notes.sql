-- Kudos notes. Applied to the live database on 2026-07-26.
--
-- Adds an optional short line to a kudos, chosen from a fixed list. The list is mirrored
-- in lib/kudos.js as KUDOS_NOTES. The CHECK constraint is the important part: it makes the
-- bounded vocabulary a database guarantee rather than a UI convention, so kudos cannot be
-- turned into a free-text messaging channel by calling the API directly. That matters
-- because the signup flow accepts under-18 accounts, and open messaging between adults and
-- minors would bring safeguarding and moderation duties this app is not set up to carry.
--
-- To add or retire a line, update KUDOS_NOTES in lib/kudos.js AND re-run the constraint
-- block below with the new set of codes. lib/kudos.js noteText() returns null for unknown
-- codes, so a retired line degrades to just the emoji rather than breaking the page.

alter table kudos add column if not exists note_code text;

alter table kudos drop constraint if exists kudos_note_code_check;
alter table kudos add constraint kudos_note_code_check
  check (note_code is null or note_code in (
    'consistent','strong_week','inspiring','keep_going',
    'welcome','comeback','respect','big_lift'
  ));

-- RLS on kudos is outgoing-only: you may read and write the kudos you sent, not the ones
-- you received. This security definer function hands the caller just their own incoming
-- kudos, with the sender's screen name and type for the dashboard card.
create or replace function get_my_kudos()
returns table (
  from_screen_name text,
  from_type_id text,
  emoji text,
  note_code text,
  sent_at timestamptz
)
language sql
security definer
set search_path = public
as $fn$
  select p.screen_name,
         a.type_id,
         k.emoji,
         k.note_code,
         k.created_at
  from kudos k
  join profiles p on p.id = k.from_user
  left join lateral (
    select ar.type_id
    from assessment_results ar
    where ar.user_id = k.from_user
    order by ar.completed_at desc
    limit 1
  ) a on true
  where k.to_user = auth.uid()
  order by k.created_at desc
  limit 20;
$fn$;

grant execute on function get_my_kudos() to authenticated;
