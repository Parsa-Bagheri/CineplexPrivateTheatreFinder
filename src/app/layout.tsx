import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Empty (Cineplex) Theatre Finder",
  description: "Find Cineplex showtimes that appear to have very low occupancy."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
