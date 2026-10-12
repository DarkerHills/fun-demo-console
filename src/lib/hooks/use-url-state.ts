"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useCallback } from "react";

/**
 * Shallow URL updates (no server round-trip) via the History API, which Next's
 * router keeps in sync with useSearchParams. Keeps filters, drawers and
 * selections deep-linkable and preserved across in-page interactions.
 */
export function useUrlState() {
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const update = useCallback(
    (mutate: (sp: URLSearchParams) => void, mode: "replace" | "push" = "replace") => {
      const sp = new URLSearchParams(window.location.search);
      mutate(sp);
      const qs = sp.toString();
      const url = `${pathname}${qs ? `?${qs}` : ""}`;
      if (mode === "push") window.history.pushState(null, "", url);
      else window.history.replaceState(null, "", url);
    },
    [pathname],
  );

  const setParam = useCallback(
    (key: string, value: string | null, mode: "replace" | "push" = "replace") =>
      update((sp) => {
        if (value == null || value === "") sp.delete(key);
        else sp.set(key, value);
      }, mode),
    [update],
  );

  return { searchParams, pathname, update, setParam };
}

/** Opens the global transaction drawer on top of whatever page is showing. */
export function useOpenTransaction() {
  const { setParam } = useUrlState();
  return useCallback((id: string) => setParam("txn", id), [setParam]);
}
