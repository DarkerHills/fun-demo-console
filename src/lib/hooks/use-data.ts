"use client";

import { useEffect, useMemo, useState } from "react";
import { getSeed } from "../data/seed";
import type { Transaction, WebhookEvent } from "../data/types";
import { useDemo } from "../store/demo-store";

/** Seeded data is laid against the moment the console loaded. */
const ANCHOR = typeof window === "undefined" ? 0 : Math.floor(Date.now() / 60_000) * 60_000;

export function useTransactions(): Transaction[] {
  const env = useDemo((s) => s.env);
  const created = useDemo((s) => s.createdTxns);
  return useMemo(() => {
    const seed = getSeed(env, ANCHOR).transactions;
    const mine = created.filter((t) => t.env === env);
    if (!mine.length) return seed;
    return [...mine, ...seed].sort((a, b) => b.createdAt - a.createdAt);
  }, [env, created]);
}

export function useTransaction(id: string | null) {
  const txns = useTransactions();
  return useMemo(() => (id ? txns.find((t) => t.id === id) ?? null : null), [txns, id]);
}

export function useEvents(): WebhookEvent[] {
  const env = useDemo((s) => s.env);
  const created = useDemo((s) => s.createdEvents);
  const overrides = useDemo((s) => s.deliveryOverrides);
  return useMemo(() => {
    const seed = getSeed(env, ANCHOR).events;
    const mine = created.filter((e) => e.env === env);
    const all = mine.length ? [...mine, ...seed].sort((a, b) => b.createdAt - a.createdAt) : seed;
    if (!Object.keys(overrides).length) return all;
    return all.map((e) => (overrides[e.id] ? { ...e, ...overrides[e.id] } : e));
  }, [env, created, overrides]);
}

/** A clock that re-renders on an interval, for relative timestamps and range windows. */
export function useNow(intervalMs = 30_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

/**
 * Loading / error simulation driven by the Demo controls menu, so presenters
 * can show skeleton and failure states on demand.
 */
export function useViewState() {
  const slow = useDemo((s) => s.demo.slow);
  const error = useDemo((s) => s.demo.error);
  const setDemo = useDemo((s) => s.setDemo);
  const [loading, setLoading] = useState(slow);

  useEffect(() => {
    if (!slow || !loading) return;
    const t = setTimeout(() => setLoading(false), 1100);
    return () => clearTimeout(t);
  }, [slow, loading]);

  return {
    state: (error ? "error" : slow && loading ? "loading" : "ready") as "loading" | "error" | "ready",
    retry: () => {
      setDemo({ error: false });
      if (slow) setLoading(true);
    },
  };
}
