"use client";

import { useEffect, useState } from "react";

export type ThemeMode = "light" | "dark" | "system";

function systemDark() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function useTheme() {
  const [dark, setDark] = useState(false);
  const [mode, setModeState] = useState<ThemeMode>("system");

  // O estado inicial vem do <html>, já definido pelo script inline do layout raiz
  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
    try {
      const t = localStorage.getItem("theme");
      setModeState(t === "dark" || t === "light" ? t : "system");
    } catch {}
  }, []);

  function setMode(next: ThemeMode) {
    const isDark = next === "system" ? systemDark() : next === "dark";
    setModeState(next);
    setDark(isDark);
    document.documentElement.classList.toggle("dark", isDark);
    try {
      if (next === "system") localStorage.removeItem("theme");
      else localStorage.setItem("theme", next);
    } catch {}
  }

  function toggle() {
    setMode(dark ? "light" : "dark");
  }

  return { dark, mode, setMode, toggle };
}
