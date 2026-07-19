# Coach — Next.js + Supabase, Step 1: Accounts

Real sign-up, real login, a real database, row-level security switched on from the start. This is the foundation everything else gets built on.

## What's new since the last version

- `supabase/schema.sql` — run this once in Supabase to create the two tables this needs
- `/signup` — create an account with a screen name (never your real name), age group, email and password
- `/login` — log back in
- `/dashboard` — a protected page, redirects you to `/login` if you're not signed in, shows your profile and whether you've completed the personality assessment yet (not ported over yet, that's step 2)

## Setting this up

**1. Run the database schema first, before deploying anything.**

Go to your Supabase project, click "SQL Editor" in the left sidebar, "New Query", paste in the entire contents of `supabase/schema.sql`, and run it. This creates two tables, `profiles` and `assessment_results`, both with row-level security switched on so nobody can see anyone else's data.

**2. Deploy the same way as before.**

New empty GitHub repo, unzip this, drag everything inside the folder in one go (not the folder itself), import into Vercel, add your two environment variables in Vercel's Settings before deploying (`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`), then deploy.

**3. Test the whole loop once it's live.**

Go to your URL, click "Create account", fill in a screen name and your details, submit. You should land on `/dashboard` showing your screen name and email. Log out, log back in with `/login`, you should land back on the same dashboard. That confirms accounts genuinely work.

## What's next (step 2)

Porting the actual personality assessment onto this, saving your type to the `assessment_results` table instead of asking you to retake it. After that, step 3 is the training log itself, and the fair, effort-based comparison scoring across different training styles.
