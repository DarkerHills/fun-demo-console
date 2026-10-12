const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const usdWhole = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const usdCompact = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
});

const intFmt = new Intl.NumberFormat("en-US");

export function formatUsd(n: number) {
  return usd.format(n);
}

/** $1,284 / $12.9K / $4.2M — for stat tiles and axis ticks. */
export function formatUsdCompact(n: number) {
  if (Math.abs(n) < 10_000) return usdWhole.format(n);
  return usdCompact.format(n);
}

export function formatInt(n: number) {
  return intFmt.format(n);
}

export function formatPct(n: number, digits = 1) {
  return `${(n * 100).toFixed(digits)}%`;
}

export function formatAssetAmount(n: number, asset: string) {
  const digits = asset === "USDC" || asset === "USDT" || asset === "USD" ? 2 : n < 1 ? 6 : 4;
  return `${n.toLocaleString("en-US", { minimumFractionDigits: Math.min(2, digits), maximumFractionDigits: digits })} ${asset}`;
}

export function formatDuration(totalSec: number | null | undefined) {
  if (totalSec == null) return "—";
  const s = Math.round(totalSec);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  if (m < 60) return rem ? `${m}m ${rem}s` : `${m}m`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

const dateFmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });
const dateTimeFmt = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});
const fullFmt = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  second: "2-digit",
});
const timeFmt = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit" });
const dayFmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });
const hourFmt = new Intl.DateTimeFormat("en-US", { hour: "numeric" });

export const formatDate = (t: number) => dateFmt.format(t);
export const formatDateTime = (t: number) => dateTimeFmt.format(t);
export const formatFull = (t: number) => fullFmt.format(t);
export const formatTime = (t: number) => timeFmt.format(t);
export const formatDay = (t: number) => dayFmt.format(t);
export const formatHour = (t: number) => hourFmt.format(t);

export function formatRelative(t: number, now = Date.now()) {
  const diff = Math.round((now - t) / 1000);
  if (diff < 45) return "just now";
  if (diff < 3600) return `${Math.round(diff / 60)} min ago`;
  if (diff < 86400) {
    const h = Math.round(diff / 3600);
    return `${h} hr${h === 1 ? "" : "s"} ago`;
  }
  const d = Math.round(diff / 86400);
  if (d < 7) return `${d} day${d === 1 ? "" : "s"} ago`;
  return formatDate(t);
}

/** Local YYYY-MM-DD key for grouping and URL params. */
export function dayKey(t: number) {
  const d = new Date(t);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export function parseDayKey(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  if (!y || !m || !d) return null;
  const start = new Date(y, m - 1, d).getTime();
  return { start, end: start + 86_400_000 };
}
