"use client";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [dark, setDark] = useState(true);
  useEffect(() => setDark(document.documentElement.classList.contains("dark")), []);
  return (
    <button
      title={dark ? "Switch to light theme" : "Switch to dark theme"}
      className="rounded-md p-1.5 text-sm text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
      onClick={() => {
        const next = !dark;
        setDark(next);
        document.documentElement.classList.toggle("dark", next);
        try { localStorage.setItem("orbit-theme", next ? "dark" : "light"); } catch {}
      }}
    >
      {dark ? "☀" : "☾"}
    </button>
  );
}
