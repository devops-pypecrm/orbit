import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Orbit", description: "Simple project management for our team" };

const themeScript = `try{var t=localStorage.getItem('orbit-theme')||'dark';document.documentElement.classList.toggle('dark',t==='dark')}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{ __html: themeScript }} /></head>
      <body>{children}</body>
    </html>
  );
}
