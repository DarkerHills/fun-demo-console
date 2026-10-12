"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "../store/toast-store";

export function useCopy(timeout = 1600) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const copy = useCallback(
    async (text: string, label?: string) => {
      try {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        if (label) toast.success(`${label} copied`, { duration: 2200 });
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => setCopied(false), timeout);
      } catch {
        toast.error("Couldn't copy to clipboard", { description: "Your browser blocked clipboard access. Select the text and copy it manually." });
      }
    },
    [timeout],
  );

  return { copied, copy };
}
