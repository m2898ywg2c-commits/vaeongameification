import { Space_Grotesk, Inter } from "next/font/google";
import "./globals.css";
import BrandBar from "./Brand";
import Splash from "./Splash";

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
  themeColor: "#000000",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={"h-full antialiased " + display.variable + " " + body.variable}>
      <body className="min-h-full flex flex-col bg-brand-bg">
        <Splash />
        <BrandBar />
        {children}
      </body>
    </html>
  );
}
