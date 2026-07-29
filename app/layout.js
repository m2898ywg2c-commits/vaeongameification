import "./globals.css";
import BrandBar from "./Brand";
import Splash from "./Splash";

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
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-brand-bg">
        <Splash />
        <BrandBar />
        {children}
      </body>
    </html>
  );
}
