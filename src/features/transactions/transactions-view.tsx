"use client";

import { CalendarDays, Download, Play, RotateCcw, Search, SearchX, X } from "lucide-react";
import * as React from "react";
import { ASSETS, CRYPTO_ASSETS, FAILURE_BY_CODE, METHOD_ORDER, METHODS, NETWORK_ORDER, NETWORKS, RANGES } from "@/lib/data/catalog";
import { transactionsToCsv, downloadFile } from "@/lib/data/csv";
import {
  activeFilterCount,
  applyQuery,
  parseQuery,
  STATUS_TABS,
  toSearch,
  type SortKey,
  type TxnQuery,
} from "@/lib/data/filters";
import type { AssetId, NetworkId, PaymentMethod, RangeId } from "@/lib/data/types";
import { dayKey, formatDate, parseDayKey } from "@/lib/format";
import { useNow, useTransactions, useViewState } from "@/lib/hooks/use-data";
import { useUrlState } from "@/lib/hooks/use-url-state";
import { useDemo } from "@/lib/store/demo-store";
import { toast } from "@/lib/store/toast-store";
import { cn } from "@/lib/utils";
import { Tag } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/controls";
import { FacetFilter, PageHeader, Pagination } from "@/components/ui/data";
import { AssetIcon, METHOD_ICON, NetworkIcon } from "@/components/ui/domain";
import { EmptyState, ErrorState } from "@/components/ui/feedback";
import { Input } from "@/components/ui/field";
import { PageSkeleton } from "@/components/shell/shell-skeleton";
import { TransactionsTable } from "./transactions-table";

export function TransactionsView() {
  const { searchParams, update, setParam } = useUrlState();
  const query = React.useMemo(() => parseQuery(new URLSearchParams(searchParams.toString())), [searchParams]);
  const txns = useTransactions();
  const env = useDemo((s) => s.env);
  const openPreview = useDemo((s) => s.openPreview);
  const now = useNow(15_000);
  const { state, retry } = useViewState();
  const selectedId = searchParams.get("txn");

  const { rows, counts } = React.useMemo(() => applyQuery(txns, query, now), [txns, query, now]);
  const pages = Math.max(1, Math.ceil(rows.length / query.pageSize));
  const page = Math.min(query.page, pages);
  const pageRows = rows.slice((page - 1) * query.pageSize, page * query.pageSize);

  /** Any filter change resets to page 1 and keeps the open drawer + other params. */
  const setQuery = React.useCallback(
    (patch: Partial<TxnQuery>, keepPage = false) => {
      update((sp) => {
        const next = toSearch({ ...patch, ...(keepPage ? {} : { page: 1 }) }, sp);
        [...sp.keys()].forEach((k) => sp.delete(k));
        next.forEach((v, k) => sp.set(k, v));
      });
    },
    [update],
  );

  // Debounced search box mirrored to the URL.
  const [search, setSearch] = React.useState(query.q);
  const [syncedQ, setSyncedQ] = React.useState(query.q);
  if (syncedQ !== query.q) {
    // The URL changed from elsewhere (e.g. global search) — adopt it.
    setSyncedQ(query.q);
    setSearch(query.q);
  }
  React.useEffect(() => {
    if (search === query.q) return;
    const t = setTimeout(() => setQuery({ q: search }), 250);
    return () => clearTimeout(t);
  }, [search, query.q, setQuery]);

  const filtersActive = activeFilterCount(query) > 0;
  const reset = () =>
    update((sp) => {
      const txn = sp.get("txn");
      [...sp.keys()].forEach((k) => sp.delete(k));
      if (txn) sp.set("txn", txn);
    });

  const onSort = (key: SortKey) =>
    setQuery({ sort: key, dir: query.sort === key && query.dir === "desc" ? "asc" : "desc" }, true);

  const exportCsv = () => {
    if (!rows.length) return;
    downloadFile(`nova-markets-${env}-payments-${dayKey(now)}.csv`, transactionsToCsv(rows));
    toast.success(`Exported ${rows.length} payment${rows.length === 1 ? "" : "s"}`, {
      description: "CSV includes every page of the current filters. Data is simulated.",
    });
  };

  const methodCounts = React.useMemo(() => {
    const m = new Map<string, number>();
    txns.forEach((t) => {
      m.set(`m:${t.method}`, (m.get(`m:${t.method}`) ?? 0) + 1);
      m.set(`a:${t.sourceAsset}`, (m.get(`a:${t.sourceAsset}`) ?? 0) + 1);
      if (t.sourceNetwork) m.set(`n:${t.sourceNetwork}`, (m.get(`n:${t.sourceNetwork}`) ?? 0) + 1);
    });
    return m;
  }, [txns]);

  const dayRange = query.day ? parseDayKey(query.day) : null;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Transactions"
        description="Every payment routed through Nova Markets' checkout. Open a row to see its route, fees, and webhook events."
        actions={
          <>
            <Button variant="secondary" onClick={exportCsv} disabled={!rows.length || state !== "ready"}>
              <Download /> Export CSV
            </Button>
            <Button variant="primary" onClick={() => openPreview("overview")}>
              <Play /> Test checkout
            </Button>
          </>
        }
      />

      {state === "loading" ? (
        <div className="-mx-4 sm:-mx-6 lg:-mx-8">
          <PageSkeleton variant="table" />
        </div>
      ) : state === "error" ? (
        <Card>
          <ErrorState onRetry={retry} />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="px-5">
            <div role="group" aria-label="Filter by status" className="scrollbar-thin -mb-px flex gap-5 overflow-x-auto overflow-y-hidden border-b border-stroke-soft">
              {STATUS_TABS.map((tab) => {
                const active = query.status === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setQuery({ status: tab.id })}
                    className={cn(
                      "-mb-px inline-flex h-11 shrink-0 items-center gap-1.5 border-b-2 text-sm font-medium transition-colors",
                      active ? "border-primary-base text-strong" : "border-transparent text-sub hover:text-strong",
                    )}
                  >
                    {tab.label}
                    <span
                      className={cn(
                        "tabular rounded-full px-1.5 text-xs",
                        active ? "bg-primary-mute text-primary-dark" : "bg-layer text-sub",
                        tab.id === "failed" && counts.failed > 0 && !active && "bg-error-mute text-error-dark",
                        tab.id === "delayed" && counts.delayed > 0 && !active && "bg-warning-mute text-warning-dark",
                      )}
                    >
                      {counts[tab.id]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 border-b border-stroke-soft px-5 py-3">
            <div className="w-full sm:w-64">
              <Input
                leading={<Search />}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search ID or customer email"
                aria-label="Search transactions by ID or customer"
                className="h-8"
                trailing={
                  search ? (
                    <Button variant="ghost" size="icon-sm" aria-label="Clear search" onClick={() => setSearch("")}>
                      <X />
                    </Button>
                  ) : null
                }
              />
            </div>
            <FacetFilter<PaymentMethod>
              label="Method"
              selected={query.methods}
              onChange={(methods) => setQuery({ methods })}
              options={METHOD_ORDER.map((m) => {
                const Icon = METHOD_ICON[m];
                return { value: m, label: METHODS[m].short, count: methodCounts.get(`m:${m}`) ?? 0, icon: <Icon className="size-4 text-sub" /> };
              })}
            />
            <FacetFilter<AssetId>
              label="Asset"
              selected={query.assets}
              onChange={(assets) => setQuery({ assets })}
              options={[...CRYPTO_ASSETS, "USD" as const].map((a) => ({
                value: a,
                label: a === "USD" ? "USD (card)" : ASSETS[a].label,
                count: methodCounts.get(`a:${a}`) ?? 0,
                icon: <AssetIcon asset={a} size={16} />,
              }))}
            />
            <FacetFilter<NetworkId>
              label="Network"
              selected={query.networks}
              onChange={(networks) => setQuery({ networks })}
              options={NETWORK_ORDER.map((n) => ({
                value: n,
                label: NETWORKS[n].label,
                count: methodCounts.get(`n:${n}`) ?? 0,
                icon: <NetworkIcon network={n} size={16} />,
              }))}
            />
            <Select
              size="sm"
              aria-label="Date range"
              className="w-[150px]"
              value={query.range}
              onValueChange={(v) => setQuery({ range: v as RangeId | "all", day: null })}
              options={[
                { value: "all", label: "All time" },
                ...(Object.keys(RANGES) as RangeId[]).map((r) => ({ value: r, label: RANGES[r].long })),
              ]}
            />
            {dayRange && (
              <Tag onRemove={() => setQuery({ day: null })} removeLabel="Remove date filter">
                <CalendarDays className="size-3.5" aria-hidden /> {formatDate(dayRange.start)}
              </Tag>
            )}
            {query.reason && (
              <Tag onRemove={() => setQuery({ reason: null })} removeLabel="Remove failure reason filter" className="max-w-[260px]">
                <span className="truncate">Reason: {FAILURE_BY_CODE[query.reason]?.reason ?? query.reason}</span>
              </Tag>
            )}
            {filtersActive && (
              <Button variant="ghost" size="sm" onClick={reset} className="ml-auto">
                <RotateCcw /> Reset filters
              </Button>
            )}
          </div>

          {pageRows.length ? (
            <>
              <TransactionsTable
                rows={pageRows}
                onOpen={(id) => setParam("txn", id)}
                selectedId={selectedId}
                sort={query.sort}
                dir={query.dir}
                onSort={onSort}
                now={now}
                caption={`Payments in ${env}`}
              />
              <Pagination
                page={page}
                pageSize={query.pageSize}
                total={rows.length}
                noun="payments"
                onPage={(p) => setQuery({ page: p }, true)}
                onPageSize={(s) => setQuery({ pageSize: s })}
              />
            </>
          ) : (
            <EmptyState
              icon={<SearchX />}
              title="No payments match these filters"
              description={
                filtersActive
                  ? "Try removing a filter or widening the date range."
                  : "Run a test checkout to create your first simulated payment."
              }
              action={
                filtersActive ? (
                  <Button onClick={reset}>
                    <RotateCcw /> Reset filters
                  </Button>
                ) : (
                  <Button variant="primary" onClick={() => openPreview("overview")}>
                    <Play /> Test checkout
                  </Button>
                )
              }
            />
          )}
        </Card>
      )}
      <p className="text-xs text-sub">
        Showing {env === "sandbox" ? "Sandbox" : "Production"} payments. All records are fictional and generated for this prototype.
      </p>
    </div>
  );
}

