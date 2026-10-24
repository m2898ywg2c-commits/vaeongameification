import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Welcome from "./Welcome";

export const dynamic = "force-dynamic";

// THE ROOT ROUTE DECIDES, AND NOW IT ALSO RENDERS.
//
// Signed in still goes straight to the dashboard. Signed out used to go to /login, which
// meant the only thing a stranger typing vaeonfitness.com ever saw was a password box:
// no explanation of what the product is, nothing for a search engine to index, and no way
// in for anyone who had not already been told about it by James.
//
// The landing page that was parked at app/welcome/page.js now renders HERE, as a
// component, rather than being redirected to. Two reasons. A redirect puts a hop between
// arriving and reading, and more importantly two URLs carrying the same copy is duplicate
// content: the page a stranger types has to be the canonical one. /welcome is now a
// permanent redirect to this route so older links still land somewhere sensible.
//
// start_url in app/manifest.js is still "/" and should stay that way. It resolves
// correctly for both states, so an installed app opens on the right screen whoever taps
// it, which is not true of pointing it at either /dashboard or /login directly. An
// installed user is signed in, so they get the redirect, not the landing page.

export const metadata = {
  title: "Vaeon - training that knows how you need to be coached",
  description:
    "Eight training personalities. A two minute assessment works out yours, then builds a plan from your own tested numbers in six week blocks.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Vaeon",
    description: "Most plans tell you what to do. This one works out how you need to be told.",
    url: "/",
    siteName: "Vaeon",
    images: [{ url: "/icon-512.png", width: 512, height: 512, alt: "Vaeon" }],
    locale: "en_GB",
    type: "website",
  },
};

export default async function Root() {
  const supabase = await createClient();
  const res = await supabase.auth.getUser();
  if (res && res.data && res.data.user) redirect("/dashboard");
  return <Welcome />;
}
