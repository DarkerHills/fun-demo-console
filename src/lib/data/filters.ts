import { ASSETS, METHODS, NETWORKS, RANGES } from "./catalog";
import type { AssetId, NetworkId, PaymentMethod, RangeId, Transaction, TxnStatus } from "./types";
import { parseDayKey } from "../format";

export type StatusTab = "all" | "completed" | "in_progress" | "delayed" | "failed" | "expired";
export type SortKey = "created" | "amount" | "customer" | "status";

export const STATUS_TABS: { id: StatusTab; label: string; match: (s: TxnStatus) => boolean }[] = [
  { id: "all", label: "All", match: () => true },
  { id: "completed", label: "Completed", match: (s) => s === "completed" },
  { id: "in_progress", label: "In progress", match: (s) => s === "pending" || s === "processing" },
  { id: "delayed", label: "Delayed", match: (s) => s === "delayed" },
  { id: "failed", label: "Failed", match: (s) => s === "failed" },
  { id: "expired", label: "Expired", match: (s) => s === "expired" },
];

export interface TxnQuery {
  q: string;
  status: StatusTab;
  assets: AssetId[];
  networks: NetworkId[];
  methods: PaymentMethod[];
  range: RangeId | "all";
  day: string | null;
  reason: string | null;
  sort: SortKey;
  dir: "asc" | "desc";
  page: number;
  pageSize: number;
}

export const DEFAULT_QUERY: TxnQuery = {
  q: "",
  status: "all",
  assets: [],
  networks: [],
  methods: [],
  range: "all",
  day: null,
  reason: null,
  sort: "created",
  dir: "desc",
  page: 1,
  pageSize: 15,
};

const list = <T extends string>(raw: string | null, valid: Record<string, unknown>) =>
  (raw ? raw.split(",").filter((v) => v in valid) : []) as T[];

export function parseQuery(sp: URLSearchParams): TxnQuery {
  const status = sp.get("status") as StatusTab | null;
  const range = sp.get("range");
  const sort = sp.get("sort") as SortKey | null;
  return {
    q: sp.get("q") ?? "",
    status: status && STATUS_TABS.some((t) => t.id === status) ? status : "all",
    assets: list<AssetId>(sp.get("asset"), ASSETS),
    networks: list<NetworkId>(sp.get("network"), NETWORKS),
    methods: list<PaymentMethod>(sp.get("method"), METHODS),
    range: range && range in RANGES ? (range as RangeId) : "all",
    day: sp.get("day") && parseDayKey(sp.get("day")!) ? sp.get("day") : null,
    reason: sp.get("reason"),
    sort: sort && ["created", "amount", "customer", "status"].includes(sort) ? sort : "created",
    dir: sp.get("dir") === "asc" ? "asc" : "desc",
    page: Math.max(1, Number(sp.get("page")) || 1),
    pageSize: [15, 25, 50].includes(Number(sp.get("size"))) ? Number(sp.get("size")) : 15,
  };
}

/** Serialise only non-default values so URLs stay short and shareable. */
export function toSearch(q: Partial<TxnQuery>, base?: URLSearchParams) {
  const sp = new URLSearchParams(base);
  const set = (k: string, v: string | null | undefined, def?: string) => {
    if (v == null || v === "" || v === def) sp.delete(k);
    else sp.set(k, v);
  };
  if ("q" in q) set("q", q.q);
  if ("status" in q) set("status", q.status, "all");
  if ("assets" in q) set("asset", q.assets?.join(","));
  if ("networks" in q) set("network", q.networks?.join(","));
  if ("methods" in q) set("method", q.methods?.join(","));
  if ("range" in q) set("range", q.range, "all");
  if ("day" in q) set("day", q.day);
  if ("reason" in q) set("reason", q.reason);
  if ("sort" in q) set("sort", q.sort, "created");
  if ("dir" in q) set("dir", q.dir, "desc");
  if ("page" in q) set("page", String(q.page), "1");
  if ("pageSize" in q) set("size", String(q.pageSize), "15");
  return sp;
}

export function transactionsHref(q: Partial<TxnQuery>) {
  const s = toSearch(q).toString();
  return `/transactions${s ? `?${s}` : ""}`;
}

const STATUS_RANK: Record<TxnStatus, number> = { failed: 0, delayed: 1, expired: 2, pending: 3, processing: 4, completed: 5 };

/** Everything except the status tab — so tab counts reflect the other filters. */
export function applyBaseFilters(txns: Transaction[], q: TxnQuery, now: number) {
  const needle = q.q.trim().toLowerCase();
  const dayRange = q.day ? parseDayKey(q.day) : null;
  const rangeStart = q.range !== "all" ? now - RANGES[q.range].ms : null;
  return txns.filter((t) => {
    if (needle && !t.id.toLowerCase().includes(needle) && !t.customer.toLowerCase().includes(needle)) return false;
    if (q.assets.length && !q.assets.includes(t.sourceAsset)) return false;
    if (q.networks.length && !(t.sourceNetwork && q.networks.includes(t.sourceNetwork))) return false;
    if (q.methods.length && !q.methods.includes(t.method)) return false;
    if (rangeStart != null && t.createdAt < rangeStart) return false;
    if (dayRange && (t.createdAt < dayRange.start || t.createdAt >= dayRange.end)) return false;
    if (q.reason && t.failure?.code !== q.reason) return false;
    return true;
  });
}

export function applyQuery(txns: Transaction[], q: TxnQuery, now: number) {
  const base = applyBaseFilters(txns, q, now);
  const counts = Object.fromEntries(STATUS_TABS.map((tab) => [tab.id, base.filter((t) => tab.match(t.status)).length])) as Record<StatusTab, number>;
  const tab = STATUS_TABS.find((t) => t.id === q.status)!;
  const rows = base.filter((t) => tab.match(t.status));
  const mult = q.dir === "asc" ? 1 : -1;
  rows.sort((a, b) => {
    switch (q.sort) {
      case "amount":
        return (a.amountUsd - b.amountUsd) * mult;
      case "customer":
        return a.customer.localeCompare(b.customer) * mult;
      case "status":
        return (STATUS_RANK[a.status] - STATUS_RANK[b.status]) * mult || b.createdAt - a.createdAt;
      default:
        return (a.createdAt - b.createdAt) * mult;
    }
  });
  return { rows, counts };
}

export function activeFilterCount(q: TxnQuery) {
  return (
    (q.q ? 1 : 0) +
    (q.status !== "all" ? 1 : 0) +
    q.assets.length +
    q.networks.length +
    q.methods.length +
    (q.range !== "all" ? 1 : 0) +
    (q.day ? 1 : 0) +
    (q.reason ? 1 : 0)
  );
}
