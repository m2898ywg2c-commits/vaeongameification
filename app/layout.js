import { cookies } from "next/headers";
import { Space_Grotesk, Inter } from "next/font/google";
import { THEME_COOKIE, SCHEME_COOKIE, TEXT_COOKIE, resolveScheme, resolveTextSize } from "@/lib/theme";
import "./globals.css";
import BrandBar from "./Brand";
import Splash from "./Splash";
import FeedbackButton from "./FeedbackButton";

// TWO FACES, AND THE REASON MATTERS.
//
// The body font was Arial. Not "a fallback that occasionally showed", Arial, set in
// globals.css, on every screen. The wordmark in Brand.js is live text rather than a
// traced path, so the logo itself was rendering in Arial too, which is most of why the
// app never looked like its own logo.
//
// Space Grotesk for display and the wordmark. It is a geometric grotesque with slightly
// odd, engineered letterforms and angular joins that sit naturally next to a mark built
// from mitred bands. Weight 300 and 400 only: the mark is a thin outline and a bold
// wordmark next to it looks like two different companies.
//
// Inter for body copy and, more importantly, for numbers. This app is mostly numbers on
// a phone at arm's length in bad gym lighting, which is exactly what Inter was drawn for,
// and its tabular figures stop the rest timer and the stat tiles jittering as they count.
const display = Space_Grotesk({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--font-display",
  display: "swap",
});

const body = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

export const metadata = {
  title: "Vaeon Fitness",
  description: "Your bespoke personal trainer and accountability partner",
  manifest: "/manifest.webmanifest",
  // iOS ignores the manifest almost entirely and reads these instead.
  appleWebApp: {
    capable: true,
    title: "Vaeon",
    // "black" rather than "black-translucent": translucent puts page content
    // underneath the status bar, which would push the brand bar under the clock.
    statusBarStyle: "black",
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

// themeColor belongs on the viewport export, not metadata. It colours the
// status bar on Android and the tab strip on desktop Chrome.
export const viewport = {
  // Two entries, not one. This paints the status bar on Android and the tab strip on
  // desktop, and a fixed black one on a light-themed phone leaves a black band above a
  // near-white app.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafafa" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

// THEME RESOLVED ON THE SERVER, CORRECTED ON THE CLIENT.
//
// The dashboard picks a user's accent colour during render, and in light mode that is a
// different colour, so the server has to know the scheme before it draws anything. A
// cookie is the only preference store the server can see, which is why this is not in
// localStorage like the rest of the app's small state.
//
// The cookie can be stale or absent on a first visit, so the inline script below has the
// final word and runs before first paint.
export default async function RootLayout({ children }) {
  const jar = await cookies();
  const choice = jar.get(THEME_COOKIE)?.value || "dark";
  const lastKnownDevice = jar.get(SCHEME_COOKIE)?.value || "dark";
  const scheme = resolveScheme(choice, lastKnownDevice);
  const textSize = resolveTextSize(jar.get(TEXT_COOKIE)?.value);

  return (
    <html lang="en" data-theme={scheme} data-text={textSize} className={"h-full antialiased " + display.variable + " " + body.variable}>
      <head>
        {/* CATCH beforeinstallprompt BEFORE REACT EXISTS.
            Chrome fires this event early in page load, frequently before the bundle has
            parsed and InstallPrompt has attached its listener. Every navigation in this
            app is a full page load, so that race runs on every single screen, and the
            symptom is an install offer that appears sometimes and not others.

            An inline script in the head runs during HTML parse, which is comfortably
            before anything React does. It stashes the event and announces it, so the
            component can pick it up whenever it happens to mount. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "window.__vaeonInstall=null;window.addEventListener('beforeinstallprompt',function(e){e.preventDefault();window.__vaeonInstall=e;window.dispatchEvent(new Event('vaeon:installable'));});",
          }}
        />

        {/* THEME, BEFORE FIRST PAINT.
            The server has already guessed from the cookie. This corrects it against what
            the device actually reports, which matters on a first visit when there is no
            cookie yet and on any device whose system setting has changed since.

            It runs synchronously in the head, so the correction happens before anything is
            drawn and nobody sees a white flash on a dark phone or the reverse. It also
            writes the resolved scheme back to the cookie so the next server render starts
            from the right answer. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{var m=document.cookie.match(/(?:^|; )vaeon_theme=([^;]*)/);var c=m?decodeURIComponent(m[1]):'dark';var d=window.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';var s=c==='light'?'light':(c==='system'?d:'dark');document.documentElement.setAttribute('data-theme',s);document.cookie='vaeon_scheme='+d+';path=/;max-age=31536000;SameSite=Lax';var tm=document.cookie.match(/(?:^|; )vaeon_text=([^;]*)/);var t=tm?decodeURIComponent(tm[1]):'normal';if(t!=='large'&&t!=='larger')t='normal';document.documentElement.setAttribute('data-text',t);}catch(e){}})();",
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-brand-bg">
        <Splash />
        <BrandBar />
        {children}
        {/* Every page except the plan screen and the signed-out ones. See the note in
            the component for why those two exclusions are not arbitrary. */}
        <FeedbackButton />
      </body>
    </html>
  );
}
