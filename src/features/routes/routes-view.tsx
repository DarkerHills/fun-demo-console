"use client";

import { ArrowRight, ChevronDown, ExternalLink, Search } from "lucide-react";
import * as React from "react";
import { ASSETS, CRYPTO_ASSETS, EXCHANGES, METHOD_ORDER, METHODS, NETWORKS, networksFor, NETWORK_ORDER } from "@/lib/data/catalog";
import { ROUTE_OPTIONS, planRoute, type QuoteInput, type RouteQuote } from "@/lib/data/route-plan";
import type { AssetId, NetworkId, PaymentMethod, RouteOptionId, RouteStep, Transaction } from "@/lib/data/types";
import { formatAssetAmount, formatDuration, formatRelative, formatUsd } from "@/lib/format";
import { useNow, useTransactions, useViewState } from "@/lib/hooks/use-data";
import { useUrlState } from "@/lib/hooks/use-url-state";
import { useDemo } from "@/lib/store/demo-store";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Segmented, Select } from "@/components/ui/controls";
import { PageHeader } from "@/components/ui/data";
import { AssetOnNetwork, DemoTag, NetworkIcon, StatusBadge } from "@/components/ui/domain";
import { EmptyState, ErrorState } from "@/components/ui/feedback";
import { Field, Input } from "@/components/ui/field";
import { PageSkeleton } from "@/components/shell/shell-skeleton";
import { RouteTrace } from "@/components/route/route-trace";

const OPTIONS = Object.keys(ROUTE_OPTIONS) as RouteOptionId[];

function quoteInputFor(t: Transaction): QuoteInput {
  return {
    method: t.method,
    sourceAsset: t.sourceAsset,
    sourceNetwork: t.sourceNetwork,
    exchange: t.exchange,
    destAsset: t.destAsset,
    destNetwork: t.destNetwork,
    amountUsd: t.amountUsd,
  };
}

function deltaText(q: RouteQuote, base: RouteQuote) {
  const dt = q.estimatedSec - base.estimatedSec;
  const df = q.totalFee - base.totalFee;
  const parts: string[] = [];
  if (Math.abs(dt) >= 1) parts.push(`${formatDuration(Math.abs(dt))} ${dt > 0 ? "slower" : "faster"}`);
  if (Math.abs(df) >= 0.01) parts.push(`${df > 0 ? "+" : "−"}${formatUsd(Math.abs(df))} fees`);
  return parts.length ? parts.join(" · ") : "Same as selected";
}

function StepDetails({ steps, openId, onToggle }: { steps: RouteStep[]; openId: string | null; onToggle: (id: string) => void }) {
  return (
    <ol className="divide-y divide-stroke-soft">
      {steps.map((s, i) => {
        const open = openId === s.id;
        return (
          <li key={s.id}>
            <button
              type="button"
              aria-expanded={open}
              onClick={() => onToggle(s.id)}
              className="flex w-full items-center gap-3 px-5 py-3 text-left hover:bg-surface"
            >
              <span className="grid size-6 shrink-0 place-items-center rounded-full bg-layer font-mono text-xs text-sub">{i + 1}</span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-strong">{s.label}</span>
                <span className="block truncate text-xs text-sub">{s.detail}</span>
              </span>
              {s.network && (
                <span className="hidden items-center gap-1 text-xs text-sub sm:flex">
                  <NetworkIcon network={s.network} size={14} /> {NETWORKS[s.network].label}
                </span>
              )}
              <span className="w-16 text-right font-mono text-[13px] text-strong">
                {s.status === "pending" || s.status === "skipped" || s.status === "active" ? "~" : ""}
                {formatDuration(s.durationSec)}
              </span>
              <span className="w-16 text-right font-mono text-[13px] text-sub">{s.feeUsd ? formatUsd(s.feeUsd) : "—"}</span>
              <ChevronDown className={cn("size-4 shrink-0 text-soft transition-transform", open && "rotate-180")} aria-hidden />
            </button>
            {open && (
              <dl className="mx-5 mb-3 ml-14 grid grid-cols-[auto_1fr] gap-x-6 gap-y-1.5 rounded-sm border border-stroke-soft bg-surface px-3 py-2.5 text-sm">
                <dt className="text-sub">Status</dt>
                <dd className="text-strong capitalize">{s.status === "pending" ? "Not started (estimate)" : s.status}</dd>
                {s.meta.map((m) => (
                  <React.Fragment key={m.label}>
                    <dt className="text-sub">{m.label}</dt>
                    <dd className="font-mono text-[13px] text-strong">{m.value}</dd>
                  </React.Fragment>
                ))}
                <dt className="text-sub">Step fee</dt>
                <dd className="font-mono text-[13px] text-strong">{formatUsd(s.feeUsd)}</dd>
              </dl>
            )}
          </li>
        );
      })}
    </ol>
  );
}

function RouteExplorer({
  input,
  usedOption,
  actualSteps,
  header,
}: {
  input: QuoteInput;
  usedOption: RouteOptionId | null;
  actualSteps: RouteStep[] | null;
  header?: React.ReactNode;
}) {
  const { searchParams, setParam } = useUrlState();
  const optParam = searchParams.get("option") as RouteOptionId | null;
  const option: RouteOptionId = optParam && optParam in ROUTE_OPTIONS ? optParam : usedOption ?? "recommended";
  const quotes = React.useMemo(() => OPTIONS.map((o) => planRoute(input, o)), [input]);
  const base = quotes.find((q) => q.option === (usedOption ?? "recommended"))!;
  const shown = quotes.find((q) => q.option === option)!;
  const isActual = !!actualSteps && option === usedOption;
  const steps = isActual ? actualSteps! : shown.steps;
  const [openStep, setOpenStep] = React.useState<string | null>(null);

  return (
    <div className="space-y-4">
      {header}

      <div role="radiogroup" aria-label="Route options" className="grid gap-3 md:grid-cols-3">
        {quotes.map((q) => {
          const on = q.option === option;
          const used = q.option === usedOption;
          const cheapest = q.totalFee === Math.min(...quotes.map((x) => x.totalFee));
          const fastest = q.estimatedSec === Math.min(...quotes.map((x) => x.estimatedSec));
          return (
            <button
              key={q.option}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => setParam("option", q.option === (usedOption ?? "recommended") ? null : q.option)}
              className={cn(
                "rounded-md border bg-default p-4 text-left shadow-xs transition-[border-color,box-shadow]",
                on ? "border-primary-base shadow-[0_0_0_1px_var(--primary-base)]" : "border-stroke-soft hover:border-stroke-mild",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-strong">{ROUTE_OPTIONS[q.option].label}</span>
                {used ? (
                  <Badge tone="feature">Used by this payment</Badge>
                ) : fastest ? (
                  <Badge tone="neutral">Fastest</Badge>
                ) : cheapest ? (
                  <Badge tone="neutral">Lowest fee</Badge>
                ) : null}
              </div>
              <p className="mt-0.5 text-xs text-sub">{ROUTE_OPTIONS[q.option].description}</p>
              <dl className="mt-3 grid grid-cols-3 gap-2">
                <div>
                  <dt className="text-[11px] text-sub">Time</dt>
                  <dd className="font-mono text-[13px] text-strong">~{formatDuration(q.estimatedSec)}</dd>
                </div>
                <div>
                  <dt className="text-[11px] text-sub">Fees</dt>
                  <dd className="font-mono text-[13px] text-strong">{formatUsd(q.totalFee)}</dd>
                </div>
                <div>
                  <dt className="text-[11px] text-sub">Slippage</dt>
                  <dd className="font-mono text-[13px] text-strong">{q.slippageBps ? `${(q.slippageBps / 100).toFixed(2)}%` : "—"}</dd>
                </div>
              </dl>
              {q.option !== base.option && (
                <p className={cn("mt-2 text-xs", q.totalFee > base.totalFee || q.estimatedSec > base.estimatedSec ? "text-warning-dark" : "text-success-dark")}>
                  {deltaText(q, base)} vs {usedOption ? "used route" : "recommended"}
                </p>
              )}
            </button>
          );
        })}
      </div>

      <Card>
        <CardHeader
          title={isActual ? "Route taken" : `${ROUTE_OPTIONS[option].label} route${usedOption ? " — alternative" : ""}`}
          description={isActual ? "Live step status for this payment. Select a step for details." : "Estimated steps if this route were used. Select a step for details."}
          actions={<DemoTag>Illustrative</DemoTag>}
        />
        <div className="px-5 pb-4">
          <RouteTrace
            steps={steps}
            selectedId={openStep}
            onSelect={(id) => setOpenStep(openStep === id ? null : id)}
            source={{ asset: input.sourceAsset, network: input.method === "card" ? null : input.sourceNetwork, amount: shown.sourceAmount, caption: "Customer pays" }}
            destination={{ asset: input.destAsset, network: input.destNetwork, amount: shown.destAmount, caption: "Treasury receives" }}
          />
        </div>
        <div className="border-t border-stroke-soft">
          <div className="flex items-center gap-3 bg-surface px-5 py-2 text-xs font-medium text-sub">
            <span className="w-6" />
            <span className="flex-1">Step</span>
            <span className="hidden sm:block">Network</span>
            <span className="w-16 text-right">Time</span>
            <span className="w-16 text-right">Fee</span>
            <span className="w-4" />
          </div>
          <StepDetails steps={steps} openId={openStep} onToggle={(id) => setOpenStep(openStep === id ? null : id)} />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-stroke-soft px-5 py-3 text-sm">
          <span className="text-sub">
            Total <span className="font-mono text-[13px] text-strong">{formatUsd(shown.totalFee)}</span> fees ·{" "}
            <span className="font-mono text-[13px] text-strong">~{formatDuration(shown.estimatedSec)}</span>
            {shown.slippageBps > 0 && (
              <>
                {" "}· max slippage <span className="font-mono text-[13px] text-strong">{(shown.slippageBps / 100).toFixed(2)}%</span>
              </>
            )}
          </span>
          <span className="text-xs text-sub">Network {formatUsd(shown.fees.network)} · Swap &amp; bridge {formatUsd(shown.fees.routing)} · Provider {formatUsd(shown.fees.provider)}</span>
        </div>
      </Card>
    </div>
  );
}

function CustomQuote() {
  const [method, setMethod] = React.useState<PaymentMethod>("wallet");
  const [asset, setAsset] = React.useState<AssetId>("ETH");
  const [network, setNetwork] = React.useState<NetworkId>("ethereum");
  const [amountText, setAmountText] = React.useState("500");
  const destAsset = useDemo((s) => s.checkout.destAsset);
  const destNetwork = useDemo((s) => s.checkout.destNetwork);
  const amount = Number(amountText);
  const valid = isFinite(amount) && amount >= 1 && amount <= 25000;
  const nets = networksFor(asset, NETWORK_ORDER);
  const net = nets.includes(network) ? network : nets[0];

  const input: QuoteInput | null = valid
    ? { method, sourceAsset: method === "card" ? "USD" : asset, sourceNetwork: method === "card" ? null : net, exchange: "coinbase", destAsset, destNetwork, amountUsd: amount }
    : null;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader title="Quote a route" description={`Delivered as ${destAsset} on ${NETWORKS[destNetwork].label}, per your checkout settings.`} actions={<DemoTag>Illustrative</DemoTag>} />
        <div className="grid grid-cols-1 gap-4 px-5 pb-5 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Source" htmlFor="q-method">
            <Select id="q-method" value={method} onValueChange={(v) => setMethod(v as PaymentMethod)} options={METHOD_ORDER.map((m) => ({ value: m, label: METHODS[m].label }))} />
          </Field>
          <Field label="Asset" htmlFor="q-asset">
            <Select
              id="q-asset"
              disabled={method === "card"}
              value={method === "card" ? "USD" : asset}
              onValueChange={(v) => setAsset(v as AssetId)}
              options={(method === "card" ? (["USD"] as AssetId[]) : CRYPTO_ASSETS).map((a) => ({ value: a, label: a === "USD" ? "USD (card)" : ASSETS[a].label }))}
            />
          </Field>
          <Field label="Network" htmlFor="q-network">
            <Select
              id="q-network"
              disabled={method === "card"}
              value={method === "card" ? "none" : net}
              onValueChange={(v) => setNetwork(v as NetworkId)}
              options={method === "card" ? [{ value: "none", label: "Not applicable" }] : nets.map((n) => ({ value: n, label: NETWORKS[n].label }))}
            />
          </Field>
          <Field label="Amount (USD)" htmlFor="q-amount" error={valid ? undefined : "Enter $1 – $25,000"}>
            <Input id="q-amount" inputMode="decimal" leading={<span className="text-sm">$</span>} value={amountText} aria-invalid={!valid} onChange={(e) => setAmountText(e.target.value.replace(/[^0-9.]/g, ""))} />
          </Field>
        </div>
        {method === "exchange" && <p className="-mt-2 px-5 pb-4 text-xs text-sub">Quoted from {EXCHANGES.coinbase.label}.</p>}
      </Card>
      {input ? <RouteExplorer input={input} usedOption={null} actualSteps={null} /> : <Card><EmptyState title="Enter a valid amount to see routes" /></Card>}
    </div>
  );
}

export function RoutesView() {
  const { searchParams, update } = useUrlState();
  const txns = useTransactions();
  const now = useNow(15_000);
  const { state, retry } = useViewState();
  const mode = searchParams.get("mode") === "quote" ? "quote" : "payment";
  const paymentId = searchParams.get("payment");
  const [query, setQuery] = React.useState("");

  const list = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return txns.filter((t) => !q || t.id.toLowerCase().includes(q) || t.customer.includes(q)).slice(0, 40);
  }, [txns, query]);
  const selected = React.useMemo(() => txns.find((t) => t.id === paymentId) ?? txns[0] ?? null, [txns, paymentId]);
  const input = React.useMemo(() => (selected ? quoteInputFor(selected) : null), [selected]);

  const select = (id: string) =>
    update((sp) => {
      sp.set("payment", id);
      sp.delete("option");
    });

  return (
    <div className="space-y-5">
      <PageHeader
        title="Payment routes"
        description="How money travels from a customer's source to your treasury — and what the alternatives would have cost."
        meta={<DemoTag>Illustrative routing</DemoTag>}
        actions={
          <Segmented
            aria-label="Route view"
            value={mode}
            onValueChange={(v) =>
              update((sp) => {
                if (v === "quote") sp.set("mode", "quote");
                else sp.delete("mode");
                sp.delete("option");
              })
            }
            options={[
              { value: "payment", label: "From a payment" },
              { value: "quote", label: "Quote a route" },
            ]}
          />
        }
      />

      {state === "loading" ? (
        <div className="-mx-4 -mt-6 sm:-mx-6 lg:-mx-8">
          <PageSkeleton variant="form" />
        </div>
      ) : state === "error" ? (
        <Card>
          <ErrorState onRetry={retry} />
        </Card>
      ) : mode === "quote" ? (
        <CustomQuote />
      ) : (
        <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
          <Card className="overflow-hidden lg:sticky lg:top-20">
            <div className="border-b border-stroke-soft p-3">
              <Input leading={<Search />} className="h-8" placeholder="Find a payment" aria-label="Find a payment" value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>
            <ul aria-label="Payments" className="scrollbar-thin max-h-[calc(100dvh-260px)] overflow-y-auto">
              {list.map((t) => {
                const on = selected?.id === t.id;
                return (
                  <li key={t.id}>
                    <button
                      type="button"
                      aria-current={on || undefined}
                      onClick={() => select(t.id)}
                      className={cn(
                        "flex w-full items-center gap-3 border-l-2 px-3 py-2.5 text-left",
                        on ? "border-primary-base bg-primary-mute" : "border-transparent hover:bg-surface",
                      )}
                    >
                      <AssetOnNetwork asset={t.sourceAsset} network={t.sourceNetwork} size={24} />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline justify-between gap-2">
                          <span className="tabular text-sm font-medium text-strong">{formatUsd(t.amountUsd)}</span>
                          <span className="text-[11px] text-sub">{formatRelative(t.createdAt, now)}</span>
                        </span>
                        <span className="flex items-center gap-1 truncate text-xs text-sub">
                          {t.sourceAsset}
                          {t.sourceNetwork ? ` · ${NETWORKS[t.sourceNetwork].label}` : " · Card"}
                          <ArrowRight className="size-3 shrink-0" aria-hidden />
                          {t.destAsset} · {NETWORKS[t.destNetwork].label}
                        </span>
                      </span>
                      <span
                        aria-label={t.status}
                        className={cn(
                          "size-2 shrink-0 rounded-full",
                          t.status === "completed" ? "bg-success-base" : t.status === "failed" ? "bg-error-base" : t.status === "delayed" ? "bg-warning-base" : t.status === "expired" ? "bg-muted" : "bg-info-base",
                        )}
                      />
                    </button>
                  </li>
                );
              })}
              {!list.length && <li className="px-3 py-8 text-center text-sm text-sub">No payments match “{query}”.</li>}
            </ul>
          </Card>

          {selected && input ? (
            <RouteExplorer
              key={selected.id}
              input={input}
              usedOption={selected.routeOption}
              actualSteps={selected.steps}
              header={
                <Card className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <AssetOnNetwork asset={selected.sourceAsset} network={selected.sourceNetwork} size={32} />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-[13px] text-strong">{selected.id}</span>
                        <StatusBadge status={selected.status} />
                      </div>
                      <p className="truncate text-sm text-sub">
                        {formatUsd(selected.amountUsd)} from {selected.customer} · {formatAssetAmount(selected.sourceAmount, selected.sourceAsset)} →{" "}
                        {formatAssetAmount(selected.destAmount, selected.destAsset)}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() =>
                      update((sp) => {
                        sp.set("txn", selected.id);
                      })
                    }
                  >
                    <ExternalLink /> Payment details
                  </Button>
                </Card>
              }
            />
          ) : (
            <Card>
              <EmptyState title="No payments yet" description="Run a test checkout to create a payment, or quote a route instead." />
            </Card>
          )}
        </div>
      )}
      <p className="text-xs text-sub">
        Routes, fees, slippage, and timings are illustrative and computed locally. No live routing engine, bridge, or exchange is connected.
      </p>
    </div>
  );
}
