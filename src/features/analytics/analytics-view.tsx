"use client";

import { useRouter } from "next/navigation";
import { CheckCircle2, CircleDollarSign, Gauge, Timer } from "lucide-react";
import * as React from "react";
import { FAILURE_BY_CODE, METHOD_ORDER, METHODS, NETWORKS, RANGES } from "@/lib/data/catalog";
import { transactionsHref, type TxnQuery } from "@/lib/data/filters";
import { buckets, byMethod, byNetwork, completionByMethod, delta, failureReasons, inWindow, periodSummaries, type Bucket } from "@/lib/data/metrics";
import type { PaymentMethod, RangeId } from "@/lib/data/types";
import { formatDuration, formatInt, formatPct, formatUsd, formatUsdCompact } from "@/lib/format";
import { useNow, useTransactions, useViewState } from "@/lib/hooks/use-data";
import { useUrlState } from "@/lib/hooks/use-url-state";
import { useDemo } from "@/lib/store/demo-store";
import { Card, CardHeader } from "@/components/ui/card";
import { Segmented } from "@/components/ui/controls";
import { FacetFilter, MetricCard, PageHeader } from "@/components/ui/data";
import { EnvBadge, METHOD_ICON, NetworkIcon } from "@/components/ui/domain";
import { ErrorState } from "@/components/ui/feedback";
import { AreaSeries, BarList, Columns, Legend, ProportionBar } from "@/components/charts/charts";
import { PageSkeleton } from "@/components/shell/shell-skeleton";

function ChartCard({
  title,
  description,
  children,
  table,
  className,
  legend,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  table?: React.ReactNode;
  className?: string;
  legend?: React.ReactNode;
}) {
  const [view, setView] = React.useState<"chart" | "table">("chart");
  return (
    <Card className={className}>
      <CardHeader
        title={title}
        description={description}
        actions={
          table ? (
            <Segmented
              size="sm"
              aria-label={`${title} view`}
              value={view}
              onValueChange={setView}
              options={[
                { value: "chart", label: "Chart" },
                { value: "table", label: "Table" },
              ]}
            />
          ) : undefined
        }
      />
      {legend && view === "chart" && <div className="-mt-1 px-5 pb-2">{legend}</div>}
      <div className="px-3 pb-4">{view === "chart" ? children : <div className="scrollbar-thin max-h-[260px] overflow-auto px-2">{table}</div>}</div>
    </Card>
  );
}

function BucketTable({ rows, cols }: { rows: Bucket[]; cols: { label: string; value: (b: Bucket) => string }[] }) {
  return (
    <table className="w-full text-sm">
      <thead className="sticky top-0 bg-default">
        <tr className="text-xs text-sub">
          <th className="py-1.5 text-left font-medium">Period</th>
          {cols.map((c) => (
            <th key={c.label} className="py-1.5 text-right font-medium">
              {c.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((b) => (
          <tr key={b.key} className="border-t border-stroke-soft">
            <td className="py-1.5 text-strong">{b.label}</td>
            {cols.map((c) => (
              <td key={c.label} className="tabular py-1.5 text-right text-strong">
                {c.value(b)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function AnalyticsView() {
  const router = useRouter();
  const { searchParams, update, setParam } = useUrlState();
  const rangeParam = searchParams.get("range");
  const range: RangeId = rangeParam && rangeParam in RANGES ? (rangeParam as RangeId) : "7d";
  const methodParam = searchParams.get("method");
  const methods = React.useMemo(() => (methodParam?.split(",").filter((m) => m in METHODS) ?? []) as PaymentMethod[], [methodParam]);
  const allTxns = useTransactions();
  const env = useDemo((s) => s.env);
  const now = useNow(30_000);
  const { state, retry } = useViewState();

  const txns = React.useMemo(() => (methods.length ? allTxns.filter((t) => methods.includes(t.method)) : allTxns), [allTxns, methods]);
  const data = React.useMemo(() => {
    const { current, previous } = periodSummaries(txns, range, now);
    const inRange = inWindow(txns, now - RANGES[range].ms, now + 1);
    const series = buckets(txns, range, now);
    return {
      current,
      previous,
      series,
      // Share of settled payments per bucket, so stacked bars always total 100%.
      shares: series.map((b) => {
        const settled = b.completed + b.failed + b.expired;
        const pct = (n: number) => (settled ? (n / settled) * 100 : 0);
        return { ...b, pCompleted: pct(b.completed), pFailed: pct(b.failed), pExpired: pct(b.expired) };
      }),
      methods: byMethod(inWindow(allTxns, now - RANGES[range].ms, now + 1)),
      networks: byNetwork(inRange),
      failures: failureReasons(inRange),
      completion: completionByMethod(inRange),
    };
  }, [txns, allTxns, range, now]);

  const scope: Partial<TxnQuery> = { range, methods };
  const hourly = RANGES[range].bucket === "hour";
  const go = (q: Partial<TxnQuery>) => router.push(transactionsHref({ ...scope, ...q }));
  const bucketScope = (b: Bucket): Partial<TxnQuery> => (hourly ? { range: "24h" } : { range: "all", day: b.key });
  const label = RANGES[range].long.toLowerCase();

  return (
    <div className="space-y-5">
      <PageHeader
        title="Analytics"
        meta={<EnvBadge env={env} />}
        description="Payment conversion and operational performance. Select any bar or row to open those payments."
      />

      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Analytics filters">
        <Segmented
          aria-label="Date range"
          value={range}
          onValueChange={(v) => setParam("range", v === "7d" ? null : v)}
          options={(Object.keys(RANGES) as RangeId[]).map((r) => ({ value: r, label: RANGES[r].long }))}
        />
        <FacetFilter<PaymentMethod>
          label="Method"
          selected={methods}
          onChange={(next) => update((sp) => (next.length ? sp.set("method", next.join(",")) : sp.delete("method")))}
          options={METHOD_ORDER.map((m) => {
            const Icon = METHOD_ICON[m];
            return { value: m, label: METHODS[m].short, icon: <Icon className="size-4 text-sub" /> };
          })}
        />
        {methods.length > 0 && <span className="text-xs text-sub">Every chart below is filtered to {methods.map((m) => METHODS[m].short.toLowerCase()).join(" + ")} payments.</span>}
      </div>

      {state === "loading" ? (
        <div className="-mx-4 -mt-6 sm:-mx-6 lg:-mx-8">
          <PageSkeleton />
        </div>
      ) : state === "error" ? (
        <Card>
          <ErrorState onRetry={retry} />
        </Card>
      ) : (
        <>
          <section aria-label="Summary" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Processed volume"
              icon={<CircleDollarSign />}
              value={formatUsdCompact(data.current.volume)}
              delta={delta(data.current.volume, data.previous.volume)}
              href={transactionsHref({ ...scope, status: "completed", sort: "amount" })}
              hrefLabel="View completed payments"
            />
            <MetricCard
              label="Payments started"
              icon={<CheckCircle2 />}
              value={formatInt(data.current.count)}
              delta={delta(data.current.count, data.previous.count)}
              href={transactionsHref(scope)}
              hrefLabel="View all payments in range"
            />
            <MetricCard
              label="Success rate"
              icon={<Gauge />}
              value={data.current.successRate == null ? "—" : formatPct(data.current.successRate)}
              delta={delta(data.current.successRate, data.previous.successRate)}
              href={transactionsHref({ ...scope, status: "failed" })}
              hrefLabel="View failed payments"
            />
            <MetricCard
              label="Avg. completion"
              icon={<Timer />}
              value={formatDuration(data.current.avgCompletionSec)}
              delta={delta(data.current.avgCompletionSec, data.previous.avgCompletionSec)}
              goodWhenUp={false}
              href={transactionsHref({ ...scope, status: "completed" })}
              hrefLabel="View completed payments"
            />
          </section>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <ChartCard
              className="xl:col-span-2"
              title="Volume over time"
              description={`Completed volume ${hourly ? "by hour" : "by day"}, ${label}`}
              table={<BucketTable rows={data.series} cols={[{ label: "Volume", value: (b) => formatUsd(b.volume) }, { label: "Completed", value: (b) => String(b.completed) }]} />}
            >
              <AreaSeries
                data={data.series}
                dataKey="volume"
                ariaLabel={`Completed volume ${label}`}
                format={formatUsd}
                tickFormat={formatUsdCompact}
                height={260}
                tooltipRows={(d) => [
                  { label: "Volume", value: formatUsd(d.volume), color: "var(--chart-1)", line: true },
                  { label: "Completed payments", value: String(d.completed), color: "var(--success-base)" },
                ]}
              />
            </ChartCard>

            <Card>
              <CardHeader title="Payment source breakdown" description={`Share of payments started, ${label}`} />
              <div className="space-y-4 px-5 pb-5">
                <ProportionBar
                  label="Payment source share"
                  segments={data.methods.map((m) => ({ key: m.key, label: METHODS[m.key].short, value: m.count, color: METHODS[m.key].chart }))}
                />
                <BarList
                  format={(v) => `${Math.round(v * 100)}%`}
                  rows={data.methods.map((m) => {
                    const Icon = METHOD_ICON[m.key];
                    return {
                      key: m.key,
                      label: METHODS[m.key].label,
                      value: m.share,
                      sub: `${m.count} · ${formatUsdCompact(m.volume)}`,
                      href: transactionsHref({ range, methods: [m.key] }),
                      icon: (
                        <span className="flex items-center gap-1.5">
                          <span aria-hidden className="size-2.5 rounded-[3px]" style={{ background: METHODS[m.key].chart }} />
                          <Icon className="size-4 text-sub" />
                        </span>
                      ),
                    };
                  })}
                  color="var(--chart-1)"
                />
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ChartCard
              title="Success and failure rate"
              description={`Share of settled payments ${hourly ? "per hour" : "per day"}. Select a bar for its failures.`}
              legend={
                <Legend
                  items={[
                    { label: "Completed", color: "var(--success-base)" },
                    { label: "Failed", color: "var(--error-base)" },
                    { label: "Expired", color: "var(--bg-muted)" },
                  ]}
                />
              }
              table={
                <BucketTable
                  rows={data.series}
                  cols={[
                    { label: "Success", value: (b) => (b.successRate == null ? "—" : formatPct(b.successRate, 0)) },
                    { label: "Failed", value: (b) => String(b.failed) },
                    { label: "Expired", value: (b) => String(b.expired) },
                  ]}
                />
              }
            >
              <Columns
                data={data.shares}
                percent
                ariaLabel={`Success and failure share ${label}`}
                format={(v) => `${Math.round(v)}%`}
                onSelect={(b) => go({ ...bucketScope(b), status: "failed" })}
                tooltipRows={(d) => [
                  { label: "Completed", value: `${d.completed} · ${Math.round(d.pCompleted)}%`, color: "var(--success-base)" },
                  { label: "Failed", value: `${d.failed} · ${Math.round(d.pFailed)}%`, color: "var(--error-base)" },
                  { label: "Expired", value: `${d.expired} · ${Math.round(d.pExpired)}%`, color: "var(--bg-muted)" },
                ]}
                series={[
                  { key: "pCompleted", label: "Completed", color: "var(--success-base)" },
                  { key: "pFailed", label: "Failed", color: "var(--error-base)" },
                  { key: "pExpired", label: "Expired", color: "var(--bg-muted)" },
                ]}
              />
            </ChartCard>

            <ChartCard
              title={`Payments by ${hourly ? "hour" : "day"}`}
              description="All statuses. Select a bar to open that day's payments."
              table={<BucketTable rows={data.series} cols={[{ label: "Payments", value: (b) => String(b.count) }]} />}
            >
              <Columns
                data={data.series}
                ariaLabel={`Payments started ${label}`}
                format={(v) => formatInt(v)}
                onSelect={(b) => go(bucketScope(b))}
                series={[{ key: "count", label: "Payments", color: "var(--chart-1)" }]}
              />
            </ChartCard>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Card>
              <CardHeader title="Network usage" description="Source network of payments started" />
              <div className="px-5 pb-5">
                <BarList
                  format={formatInt}
                  rows={data.networks
                    .filter((n) => n.count > 0)
                    .map((n) => ({
                      key: n.key,
                      label: NETWORKS[n.key].label,
                      value: n.count,
                      sub: `${Math.round(n.share * 100)}%`,
                      href: transactionsHref({ ...scope, networks: [n.key] }),
                      icon: <NetworkIcon network={n.key} size={16} />,
                    }))}
                />
              </div>
            </Card>
            <Card>
              <CardHeader title="Average completion time" description="Completed payments, by source · p90 in grey" />
              <div className="px-5 pb-5">
                <BarList
                  format={(v) => formatDuration(v)}
                  rows={data.completion
                    .filter((c) => c.avg != null)
                    .map((c) => {
                      const Icon = METHOD_ICON[c.method];
                      return {
                        key: c.method,
                        label: METHODS[c.method].label,
                        value: c.avg!,
                        sub: `p90 ${formatDuration(c.p90)}`,
                        href: transactionsHref({ range, methods: [c.method], status: "completed" }),
                        icon: <Icon className="size-4 text-sub" />,
                      };
                    })}
                />
              </div>
            </Card>
            <Card>
              <CardHeader title="Failure reasons" description={`Failed and expired payments, ${label}`} />
              <div className="px-5 pb-5">
                <BarList
                  format={formatInt}
                  color="var(--error-base)"
                  emptyLabel="No failures in this range"
                  rows={data.failures.map((f) => ({
                    key: f.code,
                    label: FAILURE_BY_CODE[f.code]?.reason ?? f.reason,
                    value: f.count,
                    sub: formatUsdCompact(f.volume),
                    href: transactionsHref({ ...scope, status: f.code === "quote_expired" ? "expired" : "failed", reason: f.code }),
                  }))}
                />
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
