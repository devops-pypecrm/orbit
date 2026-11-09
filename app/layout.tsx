import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Orbit", description: "Simple project management for our team" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
