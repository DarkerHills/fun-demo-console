"use client";

import { useCallback, useSyncExternalStore } from "react";

export type ThemePref = "light" | "dark" | "system";
export const THEME_KEY = "fun-demo-theme";

/** Runs before paint (inlined in <head>) so the first frame has the right theme. */
export const THEME_SCRIPT = `(function(){try{var p=localStorage.getItem("${THEME_KEY}")||"light";var d=p==="dark"||(p==="system"&&matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.dataset.theme=d?"dark":"light"}catch(e){document.documentElement.dataset.theme="light"}})()`;

const listeners = new Set<() => void>();

function read(): ThemePref {
  try {
    return (localStorage.getItem(THEME_KEY) as ThemePref) || "light";
  } catch {
    return "light";
  }
}

function apply(pref: ThemePref) {
  const dark = pref === "dark" || (pref === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
}

export function useTheme() {
  const pref = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    read,
    () => "light" as ThemePref,
  );

  const setTheme = useCallback((next: ThemePref) => {
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {}
    apply(next);
    listeners.forEach((l) => l());
  }, []);

  return { theme: pref, setTheme };
}
