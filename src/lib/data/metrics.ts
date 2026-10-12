import { FAILURE_BY_CODE, METHOD_ORDER, NETWORK_ORDER, RANGES } from "./catalog";
import type { NetworkId, PaymentMethod, RangeId, Transaction } from "./types";
import { dayKey, formatDay, formatHour } from "../format";

export function rangeStart(range: RangeId, now: number) {
  return now - RANGES[range].ms;
}

export function inWindow(txns: Transaction[], start: number, end: number) {
  return txns.filter((t) => t.createdAt >= start && t.createdAt < end);
}

const isInFlight = (t: Transaction) => t.status === "pending" || t.status === "processing" || t.status === "delayed";

export interface Summary {
  volume: number;
  count: number;
  completed: number;
  failed: number;
  expired: number;
  delayed: number;
  inFlight: number;
  inFlightVolume: number;
  successRate: number | null;
  avgCompletionSec: number | null;
  p90CompletionSec: number | null;
}

export function summarize(txns: Transaction[]): Summary {
  let volume = 0;
  let completed = 0;
  let failed = 0;
  let expired = 0;
  let delayed = 0;
  let inFlight = 0;
  let inFlightVolume = 0;
  const durations: number[] = [];
  for (const t of txns) {
    if (t.status === "completed") {
      completed++;
      volume += t.amountUsd;
      if (t.durationSec != null) durations.push(t.durationSec);
    } else if (t.status === "failed") failed++;
    else if (t.status === "expired") expired++;
    if (t.status === "delayed") delayed++;
    if (isInFlight(t)) {
      inFlight++;
      inFlightVolume += t.amountUsd;
    }
  }
  const settled = completed + failed + expired;
  durations.sort((a, b) => a - b);
  return {
    volume,
    count: txns.length,
    completed,
    failed,
    expired,
    delayed,
    inFlight,
    inFlightVolume,
    successRate: settled ? completed / settled : null,
    avgCompletionSec: durations.length ? durations.reduce((a, b) => a + b, 0) / durations.length : null,
    p90CompletionSec: durations.length ? durations[Math.min(durations.length - 1, Math.floor(durations.length * 0.9))] : null,
  };
}

export function periodSummaries(txns: Transaction[], range: RangeId, now: number) {
  const ms = RANGES[range].ms;
  return {
    current: summarize(inWindow(txns, now - ms, now + 1)),
    previous: summarize(inWindow(txns, now - 2 * ms, now - ms)),
  };
}

export function delta(current: number | null, previous: number | null) {
  if (current == null || previous == null || previous === 0) return null;
  return (current - previous) / previous;
}

export interface Bucket {
  key: string;
  start: number;
  end: number;
  label: string;
  volume: number;
  count: number;
  completed: number;
  failed: number;
  expired: number;
  inFlight: number;
  successRate: number | null;
  failureRate: number | null;
}

export function buckets(txns: Transaction[], range: RangeId, now: number): Bucket[] {
  const out: Bucket[] = [];
  if (RANGES[range].bucket === "hour") {
    const end = new Date(now);
    end.setMinutes(0, 0, 0);
    const lastStart = end.getTime();
    for (let i = 23; i >= 0; i--) {
      const start = lastStart - i * 3_600_000;
      out.push(emptyBucket(String(start), start, start + 3_600_000, formatHour(start)));
    }
  } else {
    const days = range === "7d" ? 7 : 30;
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const start = d.getTime();
      const next = new Date(d);
      next.setDate(next.getDate() + 1);
      out.push(emptyBucket(dayKey(start), start, next.getTime(), formatDay(start)));
    }
  }
  for (const t of txns) {
    const b = out.find((x) => t.createdAt >= x.start && t.createdAt < x.end);
    if (!b) continue;
    b.count++;
    if (t.status === "completed") {
      b.completed++;
      b.volume += t.amountUsd;
    } else if (t.status === "failed") b.failed++;
    else if (t.status === "expired") b.expired++;
    else b.inFlight++;
  }
  for (const b of out) {
    const settled = b.completed + b.failed + b.expired;
    b.successRate = settled ? b.completed / settled : null;
    b.failureRate = settled ? (b.failed + b.expired) / settled : null;
    b.volume = Math.round(b.volume * 100) / 100;
  }
  return out;
}

function emptyBucket(key: string, start: number, end: number, label: string): Bucket {
  return { key, start, end, label, volume: 0, count: 0, completed: 0, failed: 0, expired: 0, inFlight: 0, successRate: null, failureRate: null };
}

export interface Share<K extends string> {
  key: K;
  count: number;
  volume: number;
  share: number;
}

export function byMethod(txns: Transaction[]): Share<PaymentMethod>[] {
  const rows = METHOD_ORDER.map((key) => ({ key, count: 0, volume: 0, share: 0 }));
  for (const t of txns) {
    const r = rows.find((x) => x.key === t.method)!;
    r.count++;
    if (t.status === "completed") r.volume += t.amountUsd;
  }
  const total = rows.reduce((s, r) => s + r.count, 0) || 1;
  rows.forEach((r) => (r.share = r.count / total));
  return rows;
}

export function byNetwork(txns: Transaction[]): Share<NetworkId>[] {
  const rows = NETWORK_ORDER.map((key) => ({ key, count: 0, volume: 0, share: 0 }));
  for (const t of txns) {
    if (!t.sourceNetwork) continue;
    const r = rows.find((x) => x.key === t.sourceNetwork)!;
    r.count++;
    if (t.status === "completed") r.volume += t.amountUsd;
  }
  const total = rows.reduce((s, r) => s + r.count, 0) || 1;
  rows.forEach((r) => (r.share = r.count / total));
  return rows.sort((a, b) => b.count - a.count);
}

export function failureReasons(txns: Transaction[]) {
  const map = new Map<string, { code: string; reason: string; count: number; volume: number }>();
  for (const t of txns) {
    if (!t.failure) continue;
    const r = map.get(t.failure.code) ?? { code: t.failure.code, reason: FAILURE_BY_CODE[t.failure.code]?.reason ?? t.failure.reason, count: 0, volume: 0 };
    r.count++;
    r.volume += t.amountUsd;
    map.set(t.failure.code, r);
  }
  return [...map.values()].sort((a, b) => b.count - a.count);
}

export function completionByMethod(txns: Transaction[]) {
  return METHOD_ORDER.map((method) => {
    const d = txns
      .filter((t) => t.method === method && t.status === "completed" && t.durationSec != null)
      .map((t) => t.durationSec!)
      .sort((a, b) => a - b);
    return {
      method,
      count: d.length,
      avg: d.length ? d.reduce((a, b) => a + b, 0) / d.length : null,
      p90: d.length ? d[Math.min(d.length - 1, Math.floor(d.length * 0.9))] : null,
    };
  });
}
