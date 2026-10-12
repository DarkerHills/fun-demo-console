"use client";

import { use } from "react";
import { browser } from "react-dom";

/**
 * The console is driven by browser state (localStorage + a time-anchored seed),
 * so it renders only in the browser. During prerender this suspends to the
 * nearest Suspense boundary, whose skeleton becomes the initial HTML.
 */
export function BrowserOnly({ children }: { children: React.ReactNode }) {
  use(browser("Demo console state lives in this browser's localStorage."));
  return children;
}
