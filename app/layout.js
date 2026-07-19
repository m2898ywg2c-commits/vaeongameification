import "./globals.css";

export const metadata = {
  title: "Vaeon",
  description: "Your bespoke personal trainer and accountability partner",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
