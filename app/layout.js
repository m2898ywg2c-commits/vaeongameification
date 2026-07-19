import "./globals.css";

export const metadata = {
  title: "Coach",
  description: "Personality-led training coach",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
