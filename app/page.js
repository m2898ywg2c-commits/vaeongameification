import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// The root route decides, it does not render.
//
// Signed in goes to the dashboard, signed out goes to login. There was briefly a landing
// page here; it needs more work and has been parked at app/welcome/page.js rather than
// deleted. When it is ready it comes back and this file keeps only the signed-in branch.
//
// start_url in app/manifest.js is still "/" and should stay that way. It resolves
// correctly for both states, so an installed app opens on the right screen whoever taps
// it, which is not true of pointing it at either /dashboard or /login directly.
export default async function Root() {
  const supabase = await createClient();
  const res = await supabase.auth.getUser();
  if (res && res.data && res.data.user) redirect("/dashboard");
  redirect("/login");
}
