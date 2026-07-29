import "./globals.css";
import BrandBar from "./Brand";
import Splash from "./Splash";

export const metadata = {
  title: "Vaeon Fitness",
  description: "Your bespoke personal trainer and accountability partner",
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
