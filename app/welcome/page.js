import { permanentRedirect } from "next/navigation";

// MOVED TO THE ROOT.
//
// This was the parked landing page. It now renders at "/" from app/Welcome.js, so this
// route exists only to keep older links working and to stop the same copy being indexed
// at two addresses.
//
// permanentRedirect rather than redirect: 308 tells a search engine to fold this URL into
// the root rather than keep crawling both. The usual caution about permanent redirects
// being cached hard does not bite here, because the destination is the site's own home
// page and is not going to move again.

export const dynamic = "force-static";

export default function WelcomeMoved() {
  permanentRedirect("/");
}
