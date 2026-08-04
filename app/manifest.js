// Web app manifest. Next serves this at /manifest.webmanifest.
//
// This is what turns "Add to Home Screen" from a browser bookmark with a
// screenshot for an icon into something that looks and launches like an app:
// proper icon, no browser chrome, own entry in the app switcher.
//
// start_url is "/" rather than "/dashboard" on purpose. app/page.js sends a signed-in
// user to the dashboard and everyone else to login, so "/" resolves correctly for
// both. Pointing it at either destination directly would strand one of the two.

export default function manifest() {
  return {
    name: "Vaeon Fitness",
    short_name: "Vaeon",
    description: "Your bespoke personal trainer and accountability partner",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    // Android paints this behind the icon while the app boots. Matching the
    // Splash component's background means no flash of a different colour
    // between the system splash and ours.
    background_color: "#000000",
    theme_color: "#000000",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      // Android crops maskable icons to whatever shape the launcher uses, so
      // this one carries a smaller mark inside the 80% safe zone.
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
