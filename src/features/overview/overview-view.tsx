"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  CircleDollarSign,
  Gauge,
  Play,
  Timer,
  TrendingUp,
  X,
  XCircle,
} from "lucide-react";
import * as React from "react";
import { FAILURE_BY_CODE, METHOD_ORDER, METHODS, RANGES } from "@/lib/data/catalog";
import { transactionsHref } from "@/lib/data/filters";
import { buckets, byMethod, delta, inWindow, periodSummaries } from "@/lib/data/metrics";
import type { RangeId, Transaction } from "@/lib/data/types";
import { formatDuration, formatInt, formatPct, formatRelative, formatUsd, formatUsdCompact } from "@/lib/format";
import { useNow, useTransactions, useViewState } from "@/lib/hooks/use-data";
import { useUrlState } from "@/lib/hooks/use-url-state";
import { useDemo } from "@/lib/store/demo-store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Segmented } from "@/components/ui/controls";
import { MetricCard, PageHeader } from "@/components/ui/data";
import { EnvBadge, METHOD_ICON } from "@/components/ui/domain";
import { ErrorState } from "@/components/ui/feedback";
import { AreaSeries, ProportionBar } from "@/components/charts/charts";
import { PageSkeleton } from "@/components/shell/shell-skeleton";
import { TransactionsTable } from "@/features/transactions/transactions-table";

function GuideCard() {
  const guide = useDemo((s) => s.guide);
  const savedAt = useDemo((s) => s.checkoutSavedAt);
  const created = useDemo((s) => s.createdTxns);
  const markGuide = useDemo((s) => s.markGuide);
  const openPreview = useDemo((s) => s.openPreview);
  const latest = created[0];
  if (guide.dismissed) return null;

  const steps = [
    { label: "Configure checkout", hint: "Choose sources, assets, and branding", done: !!savedAt, action: <Link href="/checkout">Open checkout</Link> },
    {
      label: "Run a test payment",
      hint: "Pay as a customer in the preview",
      done: created.length > 0,
      action: (
        <button type="button" onClick={() => openPreview("overview")}>
          Start test checkout
        </button>
      ),
    },
    {
      label: "Inspect the payment",
      hint: "Route, fees, and status timeline",
      done: guide.openedDemoTxn,
      action: <Link href={latest ? `/transactions?txn=${latest.id}` : "/transactions"}>Open in Transactions</Link>,
    },
    {
      label: "Check its webhook events",
      hint: "Payload, delivery, and retries",
      done: guide.viewedWebhook,
      action: <Link href={latest ? `/webhooks?payment=${latest.id}` : "/webhooks"}>Open Webhooks</Link>,
    },
  ];
  const doneCount = steps.filter((s) => s.done).length;
  const next = steps.findIndex((s) => !s.done);

  if (doneCount === steps.length) {
    return (
      <Card className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
        <p className="flex items-center gap-2 text-sm text-strong">
          <CheckCircle2 className="size-4 shrink-0 text-success-base" aria-hidden />
          You&apos;ve followed a payment from checkout to webhook. Run another test, or try the Fails outcome to investigate a failure.
        </p>
        <Button variant="ghost" size="sm" onClick={() => markGuide({ dismissed: true })}>
          <X /> Dismiss
        </Button>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-4">
        <div>
          <h2 className="text-sm font-medium text-strong">Walk through the demo story</h2>
          <p className="text-xs text-sub">
            Configure checkout, pay as a customer, then follow the payment through the console. {doneCount} of {steps.length} done.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => markGuide({ dismissed: true })}>
          <X /> Dismiss
        </Button>
      </div>
      <ol className="mt-3 grid grid-cols-1 border-t border-stroke-soft sm:grid-cols-2 xl:grid-cols-4">
        {steps.map((s, i) => (
          <li
            key={s.label}
            className={cn(
              "flex items-start gap-3 border-stroke-soft px-5 py-3.5 sm:[&:nth-child(odd)]:border-r xl:border-r xl:last:border-r-0 max-xl:[&:nth-child(-n+2)]:border-b",
              i === next && "bg-primary-mute/50",
            )}
          >
            <span
              className={cn(
                "mt-0.5 grid size-5 shrink-0 place-items-center rounded-full text-[11px] font-semibold",
                s.done ? "bg-primary-base text-white" : i === next ? "border-2 border-primary-base text-primary-base" : "border border-stroke-strong text-sub",
              )}
              aria-hidden
            >
              {s.done ? <Check className="size-3" strokeWidth={3} /> : i + 1}
            </span>
            <div className="min-w-0">
              <p className={cn("text-sm font-medium", s.done ? "text-sub line-through decoration-stroke-strong" : "text-strong")}>
                {s.label}
                <span className="sr-only">{s.done ? " (done)" : ""}</span>
              </p>
              <p className="text-xs text-sub">{s.hint}</p>
              {!s.done && <div className="mt-1 text-xs font-medium text-primary-base hover:[&_*]:underline">{s.action}</div>}
            </div>
          </li>
        ))}
      </ol>
    </Card>
  );
}

function AttentionRow({ t, now, onOpen }: { t: Transaction; now: number; onOpen: () => void }) {
  const failed = t.status === "failed" || t.status === "expired";
  return (
    <li>
      <button type="button" onClick={onOpen} className="flex w-full items-start gap-3 px-5 py-3 text-left hover:bg-surface focus-visible:bg-primary-mute">
        <span className={cn("mt-0.5 shrink-0", failed ? "text-error-base" : "text-warning-base")}>
          {failed ? <XCircle className="size-4" aria-hidden /> : <AlertTriangle className="size-4" aria-hidden />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline justify-between gap-2">
            <span className="truncate text-sm font-medium text-strong">{formatUsd(t.amountUsd)}</span>
            <span className="shrink-0 text-xs text-sub">{formatRelative(t.createdAt, now)}</span>
          </span>
          <span className="block truncate text-xs text-sub">{t.customer}</span>
          <span className={cn("mt-0.5 block truncate text-xs", failed ? "text-error-dark" : "text-warning-dark")}>
            {failed ? (FAILURE_BY_CODE[t.failure?.code ?? ""]?.reason ?? "Failed") : `Delayed — ${t.steps.find((s) => s.status === "active")?.label.toLowerCase() ?? "in transit"}`}
          </span>
        </span>
      </button>
    </li>
  );
}

export function OverviewView() {
  const { searchParams, setParam } = useUrlState();
  const rangeParam = searchParams.get("range");
  const range: RangeId = rangeParam && rangeParam in RANGES ? (rangeParam as RangeId) : "7d";
  const txns = useTransactions();
  const env = useDemo((s) => s.env);
  const openPreview = useDemo((s) => s.openPreview);
  const now = useNow(15_000);
  const { state, retry } = useViewState();

  const data = React.useMemo(() => {
    const { current, previous } = periodSummaries(txns, range, now);
    const series = buckets(txns, range, now);
    const inRange = inWindow(txns, now - RANGES[range].ms, now + 1);
    const methods = byMethod(inRange);
    const attention = inRange
      .filter((t) => t.status === "failed" || t.status === "delayed" || t.status === "expired")
      .slice(0, 6);
    const attentionTotal = inRange.filter((t) => t.status === "failed" || t.status === "expired").length;
    const delayedNow = txns.filter((t) => t.status === "delayed").length;
    return { current, previous, series, methods, attention, attentionTotal, delayedNow, recent: txns.slice(0, 7) };
  }, [txns, range, now]);

  const { current, previous, series } = data;
  const rangeLabel = RANGES[range].long.toLowerCase();

  return (
    <div className="space-y-5">
      <PageHeader
        title="Overview"
        meta={<EnvBadge env={env} />}
        description={`How much is moving, how much is succeeding, and where it's breaking — ${rangeLabel}.`}
        actions={
          <>
            <Segmented
              aria-label="Date range"
              value={range}
              onValueChange={(v) => setParam("range", v === "7d" ? null : v)}
              options={(Object.keys(RANGES) as RangeId[]).map((r) => ({ value: r, label: RANGES[r].label, title: RANGES[r].long }))}
            />
            <Button variant="primary" onClick={() => openPreview("overview")}>
              <Play /> Test checkout
            </Button>
          </>
        }
      />

      <GuideCard />

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
          <section aria-label="Key metrics" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Processed volume"
              icon={<CircleDollarSign />}
              value={formatUsdCompact(current.volume)}
              delta={delta(current.volume, previous.volume)}
              trend={series.map((b) => b.volume)}
              href={transactionsHref({ status: "completed", range, sort: "amount" })}
              hrefLabel="View completed payments, largest first"
              footnote={
                <span className="flex items-center justify-between">
                  <span>Delivered to treasury</span>
                  <span className="inline-flex items-center gap-1">
                    Largest first <ArrowRight className="size-3" />
                  </span>
                </span>
              }
            />
            <MetricCard
              label="Successful payments"
              icon={<CheckCircle2 />}
              value={formatInt(current.completed)}
              delta={delta(current.completed, previous.completed)}
              trend={series.map((b) => b.completed)}
              href={transactionsHref({ status: "completed", range })}
              hrefLabel="View completed payments"
              footnote={
                <span className="flex items-center justify-between">
                  <span>{formatInt(current.count)} payments started</span>
                  <span className="inline-flex items-center gap-1">
                    View <ArrowRight className="size-3" />
                  </span>
                </span>
              }
            />
            <MetricCard
              label="Success rate"
              icon={<Gauge />}
              value={current.successRate == null ? "—" : formatPct(current.successRate)}
              delta={delta(current.successRate, previous.successRate)}
              href={transactionsHref({ status: "failed", range })}
              hrefLabel="Investigate failed payments"
              footnote={
                <span className="flex items-center justify-between">
                  <span>
                    <span className={cn(current.failed > 0 && "font-medium text-error-dark")}>{current.failed} failed</span> · {current.expired} expired
                  </span>
                  <span className="inline-flex items-center gap-1">
                    Investigate <ArrowRight className="size-3" />
                  </span>
                </span>
              }
            />
            <MetricCard
              label="Avg. completion time"
              icon={<Timer />}
              value={formatDuration(current.avgCompletionSec)}
              delta={delta(current.avgCompletionSec, previous.avgCompletionSec)}
              goodWhenUp={false}
              href={transactionsHref({ status: "delayed" })}
              hrefLabel="View delayed payments"
              footnote={
                <span className="flex items-center justify-between">
                  <span>
                    <span className={cn(data.delayedNow > 0 && "font-medium text-warning-dark")}>{data.delayedNow} delayed now</span> · p90{" "}
                    {formatDuration(current.p90CompletionSec)}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    View <ArrowRight className="size-3" />
                  </span>
                </span>
              }
            />
          </section>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <Card className="xl:col-span-2">
              <CardHeader
                title="Volume over time"
                description={`Completed payments, ${RANGES[range].bucket === "hour" ? "by hour" : "by day"}`}
                actions={
                  <dl className="flex gap-5 text-right">
                    <div>
                      <dt className="text-xs text-sub">Delivered</dt>
                      <dd className="tabular text-sm font-medium text-strong">{formatUsd(current.volume)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-sub">In flight</dt>
                      <dd className="tabular text-sm font-medium text-strong">
                        {formatUsd(current.inFlightVolume)} <span className="font-normal text-sub">({current.inFlight})</span>
                      </dd>
                    </div>
                  </dl>
                }
              />
              <div className="px-3 pb-3">
                <AreaSeries
                  data={series}
                  dataKey="volume"
                  ariaLabel={`Completed volume ${rangeLabel}. Total ${formatUsd(current.volume)}.`}
                  format={formatUsd}
                  tickFormat={formatUsdCompact}
                  tooltipRows={(d) => [
                    { label: "Volume", value: formatUsd(d.volume), color: "var(--chart-1)", line: true },
                    { label: "Completed", value: String(d.completed), color: "var(--success-base)" },
                    { label: "Failed", value: String(d.failed + d.expired), color: "var(--error-base)" },
                  ]}
                />
              </div>
              <div className="flex justify-end border-t border-stroke-soft px-5 py-2.5">
                <Link href={`/analytics${range !== "7d" ? `?range=${range}` : ""}`} className="inline-flex items-center gap-1 text-xs font-medium text-primary-base hover:underline">
                  Open analytics <ArrowRight className="size-3" />
                </Link>
              </div>
            </Card>

            <Card>
              <CardHeader title="Payment methods" description={`Share of payments started, ${rangeLabel}`} />
              <div className="px-5 pb-2">
                <ProportionBar
                  label="Payment method share"
                  segments={data.methods.map((m) => ({ key: m.key, label: METHODS[m.key].short, value: m.count, color: METHODS[m.key].chart }))}
                />
              </div>
              <ul className="px-3 pb-3">
                {data.methods.map((m) => {
                  const Icon = METHOD_ICON[m.key];
                  return (
                    <li key={m.key}>
                      <Link
                        href={transactionsHref({ methods: [m.key], range })}
                        className="flex items-center gap-3 rounded-sm px-2 py-2.5 hover:bg-surface"
                      >
                        <span aria-hidden className="size-2.5 shrink-0 rounded-[3px]" style={{ background: METHODS[m.key].chart }} />
                        <Icon className="size-4 shrink-0 text-sub" aria-hidden />
                        <span className="min-w-0 flex-1 truncate text-sm text-strong">{METHODS[m.key].label}</span>
                        <span className="tabular text-xs text-sub">{formatUsdCompact(m.volume)}</span>
                        <span className="tabular w-11 text-right text-sm font-medium text-strong">{Math.round(m.share * 100)}%</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
              <p className="border-t border-stroke-soft px-5 py-2.5 text-xs text-sub">
                {METHOD_ORDER.length} sources · select one to filter payments
              </p>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <Card className="overflow-hidden xl:col-span-2">
              <CardHeader
                title="Recent payments"
                description="Latest activity across all statuses"
                actions={
                  <Button asChild variant="ghost" size="sm">
                    <Link href="/transactions">
                      View all <ArrowRight />
                    </Link>
                  </Button>
                }
              />
              <TransactionsTable compact rows={data.recent} onOpen={(id) => setParam("txn", id)} now={now} caption="Recent payments" />
            </Card>

            <Card className="flex flex-col">
              <CardHeader
                title="Needs attention"
                description={`Failed, expired, and delayed — ${rangeLabel}`}
                actions={
                  data.attentionTotal > 0 ? (
                    <span className="tabular rounded-full bg-error-mute px-2 py-0.5 text-xs font-medium text-error-dark">{data.attentionTotal} failed</span>
                  ) : undefined
                }
              />
              {data.attention.length ? (
                <ul className="flex-1 divide-y divide-stroke-soft border-t border-stroke-soft">
                  {data.attention.map((t) => (
                    <AttentionRow key={t.id} t={t} now={now} onOpen={() => setParam("txn", t.id)} />
                  ))}
                </ul>
              ) : (
                <div className="flex flex-1 flex-col items-center justify-center gap-2 border-t border-stroke-soft px-5 py-10 text-center">
                  <span className="grid size-9 place-items-center rounded-full bg-success-mute text-success-base">
                    <TrendingUp className="size-4" aria-hidden />
                  </span>
                  <p className="text-sm font-medium text-strong">Nothing failing {rangeLabel}</p>
                  <p className="text-xs text-sub">Every settled payment in this range completed.</p>
                </div>
              )}
              <div className="border-t border-stroke-soft px-5 py-2.5">
                <Link href={transactionsHref({ status: "failed", range })} className="inline-flex items-center gap-1 text-xs font-medium text-primary-base hover:underline">
                  Investigate failed payments <ArrowRight className="size-3" />
                </Link>
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
