-- APPLIED 2026-11-01 on wctsiafaiogyciqnmvad via execute_sql (non-destructive).
--
-- The voice the user picked for their coach. Null means "the type's own default", which the
-- coach-voice Edge Function decides. Only the timbre is the user's choice: the delivery (the
-- Monk slow and soft, the Gladiator loud) still comes from the type, so a Monk who picks a deep
-- voice gets a deep voice speaking calmly rather than a different character.
--
-- The check list must match VOICE_CHOICES in lib/coachtalk.js and ALLOWED in
-- supabase/functions/coach-voice/index.ts. Change all three together.
alter table public.profiles add column if not exists coach_voice text
  check (coach_voice is null or coach_voice in ('alloy','ash','ballad','coral','echo','fable','nova','onyx','sage','shimmer','verse','marin','cedar'));
comment on column public.profiles.coach_voice is 'Spoken voice the user picked for their coach (OpenAI TTS voice id). Null means the type default in coach-voice. Delivery style still comes from the type.';
