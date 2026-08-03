-- Who is allowed to call the RPCs.
--
-- WHY THIS FILE EXISTS AT ALL.
--
-- get_recent_pbs() has no auth.uid() filter anywhere in it. It returned every user's raw
-- UUID, screen name, exercise and weight for the last seven days to anybody holding the
-- anon key, which is published in the client bundle by design and is not a secret. Nothing
-- in the codebase calls it: the only trace left is a comment in app/leaderboard/page.js.
--
-- THE TRAP, WRITTEN DOWN SO NOBODY REPEATS IT.
--
-- "revoke execute on function f() from anon" reports success and does nothing. Postgres
-- grants EXECUTE on functions to PUBLIC by default and anon inherits PUBLIC, so the
-- privilege survives a revoke aimed at the role. It has to come off PUBLIC first and then
-- be granted back only to the roles that need it. The first attempt at this looked like it
-- had worked and had not, which is exactly the failure the handover warned about in a
-- different guise.
--
-- Verify with has_function_privilege(), never with the fact that the statement succeeded.
--
-- Run once in the Supabase SQL editor. Idempotent.

-- Scoped to auth.uid() internally, so a signed-out caller already got nothing. Kept for
-- signed-in users: the dashboard and the data export both call it.
revoke execute on function public.get_my_kudos() from public;
revoke execute on function public.get_my_kudos() from anon;
grant  execute on function public.get_my_kudos() to authenticated;

-- Unreachable over the REST API by either role. Left in place rather than dropped so the
-- behaviour can be restored deliberately if a recent-PBs feed is ever wanted again.
revoke execute on function public.get_recent_pbs() from public;
revoke execute on function public.get_recent_pbs() from anon;
revoke execute on function public.get_recent_pbs() from authenticated;

-- The leaderboard is not public, and this was tested rather than assumed: before these
-- lines ran, a signed-out caller holding the published anon key got all sixteen rows back.
--
-- app/leaderboard/page.js now redirects signed-out visitors to /login as well. Closing the
-- database without closing the page leaves a screen that renders, calls an RPC it may not
-- call, and shows an empty board with no explanation.
revoke execute on function public.get_leaderboard() from public;
revoke execute on function public.get_leaderboard() from anon;
grant  execute on function public.get_leaderboard() to authenticated;
