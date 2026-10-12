"use client";

import { ArrowLeft, Check, ChevronRight, Clock, Copy, Info, Lock, ShieldCheck, X } from "lucide-react";
import * as React from "react";
import {
  ASSETS,
  CUSTOMER_FAILURE_COPY,
  EXCHANGES,
  METHOD_ORDER,
  NETWORKS,
  WALLET_BALANCES,
  networksFor,
} from "@/lib/data/catalog";
import { ROUTE_OPTIONS, planRoute } from "@/lib/data/route-plan";
import type { AssetId, CheckoutConfig, ExchangeId, NetworkId, PaymentMethod, RouteOptionId } from "@/lib/data/types";
import { formatAssetAmount, formatDuration, formatUsd } from "@/lib/format";
import { useDemo } from "@/lib/store/demo-store";
import { startSimulation, type SimSpeed } from "@/lib/store/simulator";
import type { FailureKey } from "@/lib/data/catalog";
import { cn, readableOn } from "@/lib/utils";
import { AssetIcon, AssetOnNetwork, ExchangeIcon, METHOD_ICON, NetworkIcon } from "@/components/ui/domain";
import { RouteTrace } from "@/components/route/route-trace";

export interface SimControls {
  outcome: "success" | "failure";
  failureKey: FailureKey;
  speed: SimSpeed;
  customer: string;
}

type Stage = "start" | "source" | "review" | "progress";

const SOURCE_COPY: Record<PaymentMethod, { title: string; sub: string }> = {
  wallet: { title: "Connected wallet", sub: "0x8F2c…21A9 · simulated" },
  transfer: { title: "Transfer crypto", sub: "Send from any wallet or exchange" },
  card: { title: "Debit or credit card", sub: "Visa, Mastercard · ~2 min" },
  exchange: { title: "Exchange account", sub: "Coinbase, Kraken, Binance" },
};

const CONFIRM_LABEL: Record<PaymentMethod, string> = {
  wallet: "Confirm in wallet",
  transfer: "I've sent the funds",
  card: "Pay with card",
  exchange: "Withdraw from exchange",
};

/** Deterministic pseudo-QR so the deposit step looks complete without encoding anything real. */
function PseudoQr({ seed }: { seed: string }) {
  const n = 21;
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const cells: boolean[] = [];
  for (let i = 0; i < n * n; i++) {
    h = (h * 1103515245 + 12345) >>> 0;
    cells.push(((h >>> 16) & 1) === 1);
  }
  const finder = (x: number, y: number) => {
    const inBox = (ox: number, oy: number) => x >= ox && x < ox + 7 && y >= oy && y < oy + 7;
    for (const [ox, oy] of [[0, 0], [n - 7, 0], [0, n - 7]] as const) {
      if (inBox(ox, oy)) {
        const dx = x - ox;
        const dy = y - oy;
        return dx === 0 || dx === 6 || dy === 0 || dy === 6 || (dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4);
      }
    }
    return null;
  };
  return (
    <svg viewBox={`0 0 ${n} ${n}`} className="size-28" role="img" aria-label="Deposit address QR code (illustrative)">
      <rect width={n} height={n} fill="#fff" />
      {Array.from({ length: n * n }, (_, i) => {
        const x = i % n;
        const y = Math.floor(i / n);
        const f = finder(x, y);
        const on = f ?? cells[i];
        return on ? <rect key={i} x={x} y={y} width={1.02} height={1.02} fill="#171717" /> : null;
      })}
    </svg>
  );
}

function Header({ config, onBack, title }: { config: CheckoutConfig; onBack?: () => void; title: string }) {
  return (
    <div className="flex items-center gap-2 px-5 pt-4 pb-3">
      {onBack ? (
        <button type="button" onClick={onBack} aria-label="Back" className="-ml-1.5 grid size-7 place-items-center rounded-sm text-sub hover:bg-layer hover:text-strong">
          <ArrowLeft className="size-4" />
        </button>
      ) : (
        <span className="grid size-7 shrink-0 place-items-center overflow-hidden rounded-sm bg-weak text-xs font-semibold text-inverse">
          {config.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={config.logo} alt="" className="size-full object-cover" />
          ) : (
            config.brandName.charAt(0) || "N"
          )}
        </span>
      )}
      <p className="min-w-0 flex-1 truncate text-sm font-medium text-strong">{title}</p>
      <span className="rounded-full border border-stroke-mild px-1.5 py-0.5 text-[10px] font-medium text-sub">TEST</span>
    </div>
  );
}

function OptionRow({
  selected,
  onSelect,
  disabled,
  children,
  name,
  value,
  accent,
}: {
  selected: boolean;
  onSelect: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  name: string;
  value: string;
  accent: string;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2.5 transition-colors",
        selected ? "bg-default" : "border-stroke-mild bg-default hover:border-stroke-strong",
        disabled && "cursor-not-allowed opacity-50",
      )}
      style={selected ? { borderColor: accent, boxShadow: `0 0 0 1px ${accent}` } : undefined}
    >
      <input type="radio" name={name} value={value} checked={selected} onChange={onSelect} disabled={disabled} className="sr-only" />
      {children}
      <span
        aria-hidden
        className={cn("grid size-4 shrink-0 place-items-center rounded-full border-2", !selected && "border-stroke-strong")}
        style={selected ? { borderColor: accent } : undefined}
      >
        {selected && <span className="size-1.5 rounded-full" style={{ background: accent }} />}
      </span>
    </label>
  );
}

function Chip({ active, onClick, children, accent, disabled }: { active: boolean; onClick: () => void; children: React.ReactNode; accent: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-sm transition-colors disabled:opacity-40",
        active ? "font-medium text-strong" : "border-stroke-mild text-sub hover:border-stroke-strong hover:text-strong",
      )}
      style={active ? { borderColor: accent, background: `color-mix(in srgb, ${accent} 10%, transparent)` } : undefined}
    >
      {children}
    </button>
  );
}

/**
 * Customer-facing checkout, rendered with the merchant's configuration.
 * Scoped theme via data-theme so a dark checkout can sit inside a light console.
 */
export function CheckoutWidget({
  config,
  controls,
  onResult,
  onViewTransaction,
  className,
}: {
  config: CheckoutConfig;
  controls: SimControls;
  onResult?: (txnId: string) => void;
  onViewTransaction?: (txnId: string) => void;
  className?: string;
}) {
  const enabledSources = React.useMemo(() => METHOD_ORDER.filter((m) => config.sources[m]), [config.sources]);
  const [stage, setStage] = React.useState<Stage>("start");
  const [amountText, setAmountText] = React.useState(String(config.defaultAmount));
  const [methodChoice, setMethod] = React.useState<PaymentMethod | null>(enabledSources[0] ?? null);
  const [assetChoice, setAsset] = React.useState<AssetId>(config.assets[0] ?? "USDC");
  // Selections stay valid while the merchant edits the configuration live.
  const method = methodChoice && config.sources[methodChoice] ? methodChoice : enabledSources[0] ?? null;
  const asset = config.assets.includes(assetChoice) ? assetChoice : config.assets[0] ?? "USDC";
  const [network, setNetwork] = React.useState<NetworkId | null>(null);
  const [exchange, setExchange] = React.useState<ExchangeId>("coinbase");
  const [option, setOption] = React.useState<RouteOptionId>("recommended");
  const [txnId, setTxnId] = React.useState<string | null>(null);
  const [touched, setTouched] = React.useState(false);
  const [quoteTtl, setQuoteTtl] = React.useState(30);
  const txn = useDemo((s) => (txnId ? s.createdTxns.find((t) => t.id === txnId) ?? null : null));
  const accent = config.accent;
  const onAccent = readableOn(accent);

  const [defaultSeen, setDefaultSeen] = React.useState(config.defaultAmount);
  if (defaultSeen !== config.defaultAmount) {
    setDefaultSeen(config.defaultAmount);
    setAmountText(String(config.defaultAmount));
  }

  const amount = Number(amountText.replace(/[^0-9.]/g, ""));
  const amountError = !amountText
    ? "Enter an amount"
    : !isFinite(amount) || amount <= 0
      ? "Enter a valid amount"
      : amount < config.minAmount
        ? `Minimum deposit is ${formatUsd(config.minAmount)}`
        : amount > 25000
          ? "Maximum deposit is $25,000.00"
          : null;

  const assetNetworks = method === "card" ? [] : networksFor(asset, config.networks);
  const effectiveNetwork = method === "card" ? null : network && assetNetworks.includes(network) ? network : assetNetworks[0] ?? null;
  const sourceAsset: AssetId = method === "card" ? "USD" : asset;

  const quote =
    !method || (method !== "card" && !effectiveNetwork) || amountError
      ? null
      : planRoute(
          { method, sourceAsset, sourceNetwork: effectiveNetwork, exchange, destAsset: config.destAsset, destNetwork: config.destNetwork, amountUsd: amount },
          option,
        );

  const toReview = () => {
    setQuoteTtl(30);
    setStage("review");
  };

  // Quote countdown on the review step — refreshes like a real quote would.
  React.useEffect(() => {
    if (stage !== "review") return;
    const t = setInterval(() => setQuoteTtl((s) => (s <= 1 ? 30 : s - 1)), 1000);
    return () => clearInterval(t);
  }, [stage]);

  const balanceOk = method !== "wallet" || !quote || WALLET_BALANCES[asset] >= quote.sourceAmount;

  const pay = () => {
    if (!method || !quote) return;
    const id = startSimulation({
      config,
      // Test checkouts always record in Sandbox, whichever environment the console shows.
      env: "sandbox",
      method,
      sourceAsset,
      sourceNetwork: effectiveNetwork,
      exchange: method === "exchange" ? exchange : null,
      amountUsd: amount,
      option,
      outcome: controls.outcome,
      failureKey: controls.failureKey,
      speed: controls.speed,
      customer: controls.customer,
    });
    setTxnId(id);
    setStage("progress");
    onResult?.(id);
  };

  const restart = (to: Stage) => {
    setTxnId(null);
    if (to === "review") toReview();
    else setStage(to);
  };

  const done = txn?.status === "completed";
  const failed = txn?.status === "failed";
  const activeStep = txn?.steps.find((s) => s.status === "active");

  const primaryBtn = "flex h-11 w-full items-center justify-center gap-2 rounded-sm text-sm font-medium transition-[filter] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <div
      data-theme={config.theme}
      className={cn("flex w-full max-w-[400px] flex-col overflow-hidden rounded-lg border border-stroke-soft bg-default text-strong shadow-lg", className)}
      role="region"
      aria-label={`${config.brandName} checkout preview`}
    >
      {stage === "start" && (
        <>
          <Header config={config} title={`Deposit to ${config.brandName}`} />
          <div className="space-y-4 px-5 pb-5">
            <div>
              <label htmlFor="co-amount" className="text-xs font-medium text-sub">
                Amount
              </label>
              <div
                className={cn("mt-1.5 flex items-baseline gap-1 rounded-md border px-3 py-2.5", touched && amountError ? "border-error-base" : "border-stroke-mild")}
              >
                <span className="text-2xl text-sub">$</span>
                <input
                  id="co-amount"
                  inputMode="decimal"
                  value={amountText}
                  onChange={(e) => setAmountText(e.target.value.replace(/[^0-9.]/g, ""))}
                  onBlur={() => setTouched(true)}
                  aria-invalid={!!(touched && amountError)}
                  aria-describedby="co-amount-msg"
                  className="tabular w-full bg-transparent text-[28px] leading-9 font-medium tracking-[-0.01em] outline-none"
                />
                <span className="text-sm text-sub">USD</span>
              </div>
              <p id="co-amount-msg" className={cn("mt-1.5 text-xs", touched && amountError ? "text-error-base" : "text-sub")}>
                {touched && amountError ? amountError : `Minimum ${formatUsd(config.minAmount)} · arrives as ${config.destAsset} on ${NETWORKS[config.destNetwork].label}`}
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {[100, 250, 500, 1000].map((v) => (
                  <Chip key={v} accent={accent} active={amount === v} onClick={() => setAmountText(String(v))}>
                    ${v.toLocaleString()}
                  </Chip>
                ))}
              </div>
            </div>

            <fieldset>
              <legend className="text-xs font-medium text-sub">Pay with</legend>
              {enabledSources.length ? (
                <div className="mt-1.5 space-y-1.5">
                  {enabledSources.map((m) => {
                    const Icon = METHOD_ICON[m];
                    return (
                      <OptionRow key={m} name="co-source" value={m} selected={method === m} onSelect={() => setMethod(m)} accent={accent}>
                        <span className="grid size-8 shrink-0 place-items-center rounded-sm bg-layer text-sub">
                          <Icon className="size-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-medium">{SOURCE_COPY[m].title}</span>
                          <span className="block truncate text-xs text-sub">{SOURCE_COPY[m].sub}</span>
                        </span>
                      </OptionRow>
                    );
                  })}
                </div>
              ) : (
                <p className="mt-1.5 rounded-md border border-dashed border-stroke-strong px-3 py-4 text-center text-sm text-sub">
                  No payment sources are enabled for this checkout.
                </p>
              )}
            </fieldset>

            <button
              type="button"
              className={primaryBtn}
              style={{ background: accent, color: onAccent }}
              disabled={!method}
              onClick={() => {
                setTouched(true);
                if (amountError || !method) return;
                if (method === "card") toReview();
                else setStage("source");
              }}
            >
              Continue <ChevronRight className="size-4" />
            </button>
          </div>
        </>
      )}

      {stage === "source" && method && method !== "card" && (
        <>
          <Header config={config} title={method === "exchange" ? "Choose exchange and asset" : "Choose asset and network"} onBack={() => setStage("start")} />
          <div className="space-y-4 px-5 pb-5">
            {method === "exchange" && (
              <fieldset>
                <legend className="text-xs font-medium text-sub">Exchange</legend>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {(Object.keys(EXCHANGES) as ExchangeId[]).map((e) => (
                    <Chip key={e} accent={accent} active={exchange === e} onClick={() => setExchange(e)}>
                      <ExchangeIcon exchange={e} size={16} /> {EXCHANGES[e].label}
                    </Chip>
                  ))}
                </div>
              </fieldset>
            )}
            <fieldset>
              <legend className="text-xs font-medium text-sub">Asset</legend>
              <div className="mt-1.5 space-y-1.5">
                {config.assets.map((a) => {
                  const nets = networksFor(a, config.networks);
                  const usd = WALLET_BALANCES[a] * ASSETS[a].priceUsd;
                  return (
                    <OptionRow key={a} name="co-asset" value={a} selected={asset === a} onSelect={() => setAsset(a)} disabled={!nets.length} accent={accent}>
                      <AssetIcon asset={a} size={28} />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium">{ASSETS[a].label}</span>
                        <span className="block text-xs text-sub">
                          {!nets.length ? "No enabled network" : method === "wallet" ? `Balance ${formatAssetAmount(WALLET_BALANCES[a], a)}` : ASSETS[a].name}
                        </span>
                      </span>
                      {method === "wallet" && nets.length > 0 && <span className="tabular text-xs text-sub">{formatUsd(usd)}</span>}
                    </OptionRow>
                  );
                })}
              </div>
            </fieldset>
            {assetNetworks.length > 0 && (
              <fieldset>
                <legend className="text-xs font-medium text-sub">Network</legend>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {assetNetworks.map((n) => (
                    <Chip key={n} accent={accent} active={effectiveNetwork === n} onClick={() => setNetwork(n)}>
                      <NetworkIcon network={n} size={14} /> {NETWORKS[n].label}
                    </Chip>
                  ))}
                </div>
              </fieldset>
            )}
            <button type="button" className={primaryBtn} style={{ background: accent, color: onAccent }} disabled={!effectiveNetwork} onClick={toReview}>
              Review deposit <ChevronRight className="size-4" />
            </button>
          </div>
        </>
      )}

      {stage === "review" && method && quote && (
        <>
          <Header config={config} title="Review deposit" onBack={() => setStage(method === "card" ? "start" : "source")} />
          <div className="space-y-4 px-5 pb-5">
            <div className="rounded-md border border-stroke-soft bg-surface p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs text-sub">You pay</p>
                  <p className="truncate font-mono text-[15px] font-medium">{formatAssetAmount(quote.sourceAmount, sourceAsset)}</p>
                  <p className="text-xs text-sub">
                    {method === "card" ? "Visa •••• 4242 (test card)" : `${NETWORKS[effectiveNetwork!].label}${method === "exchange" ? ` · from ${EXCHANGES[exchange].label}` : ""}`}
                  </p>
                </div>
                <AssetOnNetwork asset={sourceAsset} network={effectiveNetwork} size={30} />
              </div>
              <div className="my-3">
                <RouteTrace
                  compact
                  steps={quote.steps}
                  source={{ asset: sourceAsset, network: effectiveNetwork, amount: quote.sourceAmount, caption: "" }}
                  destination={{ asset: config.destAsset, network: config.destNetwork, amount: quote.destAmount, caption: "" }}
                />
              </div>
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs text-sub">{config.brandName} receives</p>
                  <p className="truncate font-mono text-[15px] font-medium">{formatAssetAmount(quote.destAmount, config.destAsset)}</p>
                  <p className="text-xs text-sub">{NETWORKS[config.destNetwork].label}</p>
                </div>
                <AssetOnNetwork asset={config.destAsset} network={config.destNetwork} size={30} />
              </div>
            </div>

            <div role="radiogroup" aria-label="Route" className="grid grid-cols-3 gap-1.5">
              {(Object.keys(ROUTE_OPTIONS) as RouteOptionId[]).map((o) => {
                const q = planRoute(
                  { method, sourceAsset, sourceNetwork: effectiveNetwork, exchange, destAsset: config.destAsset, destNetwork: config.destNetwork, amountUsd: amount },
                  o,
                );
                const on = option === o;
                return (
                  <button
                    key={o}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => {
                      setOption(o);
                      setQuoteTtl(30);
                    }}
                    className={cn("rounded-sm border px-2 py-1.5 text-left", !on && "border-stroke-mild hover:border-stroke-strong")}
                    style={on ? { borderColor: accent, boxShadow: `0 0 0 1px ${accent}` } : undefined}
                  >
                    <span className="block text-xs font-medium">{ROUTE_OPTIONS[o].label}</span>
                    <span className="block font-mono text-[11px] text-sub">
                      ~{formatDuration(q.estimatedSec)} · ${q.totalFee.toFixed(2)}
                    </span>
                  </button>
                );
              })}
            </div>

            <dl className="space-y-1 text-sm">
              <div className="flex justify-between">
                <dt className="text-sub">Network fees</dt>
                <dd className="font-mono text-[13px]">{formatUsd(quote.fees.network)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sub">Swap &amp; bridge</dt>
                <dd className="font-mono text-[13px]">{formatUsd(quote.fees.routing)}</dd>
              </div>
              {quote.fees.provider > 0 && (
                <div className="flex justify-between">
                  <dt className="text-sub">{method === "card" ? "Card fee" : "Exchange fee"}</dt>
                  <dd className="font-mono text-[13px]">{formatUsd(quote.fees.provider)}</dd>
                </div>
              )}
              <div className="flex justify-between border-t border-stroke-soft pt-1.5">
                <dt className="flex items-center gap-1 text-sub">
                  <Clock className="size-3.5" aria-hidden /> Estimated time
                </dt>
                <dd className="font-mono text-[13px]">~{formatDuration(quote.estimatedSec)}</dd>
              </div>
            </dl>

            {method === "transfer" && (
              <div className="flex gap-3 rounded-md border border-stroke-soft p-3">
                <div className="shrink-0 overflow-hidden rounded-xs border border-stroke-soft">
                  <PseudoQr seed={`${asset}${effectiveNetwork}${amount}`} />
                </div>
                <div className="min-w-0 text-xs">
                  <p className="text-sub">Send exactly</p>
                  <p className="font-mono text-[13px] font-medium">{formatAssetAmount(quote.sourceAmount, asset)}</p>
                  <p className="mt-1.5 text-sub">to this one-time address on {NETWORKS[effectiveNetwork!].label}</p>
                  <p className="mt-0.5 flex items-center gap-1 font-mono text-[12px] break-all">
                    0x91bE4c0aD27f3E6b58C1a9e04F7d2B6c3A1e7C03
                    <Copy className="size-3 shrink-0 text-sub" aria-hidden />
                  </p>
                  <p className="mt-1.5 text-sub">Demo address — don&apos;t send real funds.</p>
                </div>
              </div>
            )}

            {!balanceOk && (
              <p className="flex items-center gap-1.5 rounded-sm bg-error-mute px-2.5 py-2 text-xs text-error-dark">
                <Info className="size-3.5 shrink-0" /> Not enough {asset} in this wallet. Choose a smaller amount or another asset.
              </p>
            )}

            <button type="button" className={primaryBtn} style={{ background: accent, color: onAccent }} disabled={!balanceOk} onClick={pay}>
              <Lock className="size-4" /> {CONFIRM_LABEL[method]}
            </button>
            <p className="flex items-center justify-center gap-1.5 text-xs text-sub">
              <Clock className="size-3" aria-hidden /> Quote refreshes in 0:{String(quoteTtl).padStart(2, "0")} · Simulated — no funds move
            </p>
          </div>
        </>
      )}

      {stage === "progress" && txn && (
        <div className="px-5 pt-6 pb-5" aria-live="polite">
          {!done && !failed && (
            <>
              <p className="text-center text-base font-medium">{txn.status === "pending" ? (method === "wallet" ? "Waiting for wallet confirmation" : "Waiting for your payment") : "Processing your deposit"}</p>
              <p className="mt-1 text-center text-sm text-sub">{activeStep ? activeStep.label : "Starting"}…</p>
              <div className="my-6">
                <RouteTrace
                  compact
                  steps={txn.steps}
                  source={{ asset: txn.sourceAsset, network: txn.sourceNetwork, amount: txn.sourceAmount, caption: "" }}
                  destination={{ asset: txn.destAsset, network: txn.destNetwork, amount: txn.destAmount, caption: "" }}
                />
              </div>
              <ol className="space-y-1.5 text-sm">
                {txn.steps.map((s) => (
                  <li key={s.id} className="flex items-center gap-2">
                    <span
                      className={cn(
                        "grid size-4 shrink-0 place-items-center rounded-full",
                        s.status === "done" ? "text-white" : s.status === "active" ? "border-2" : "border border-stroke-strong",
                      )}
                      style={s.status === "done" ? { background: accent } : s.status === "active" ? { borderColor: accent } : undefined}
                    >
                      {s.status === "done" && <Check className="size-2.5" strokeWidth={4} />}
                    </span>
                    <span className={cn(s.status === "pending" ? "text-sub" : "text-strong")}>{s.label}</span>
                  </li>
                ))}
              </ol>
              <p className="mt-5 text-center text-xs text-sub">You can close this window. We&apos;ll email {controls.customer} when it&apos;s done.</p>
            </>
          )}
          {done && (
            <div className="text-center">
              <span className="mx-auto grid size-12 place-items-center rounded-full bg-success-mute text-success-base">
                <Check className="size-6" strokeWidth={3} />
              </span>
              <p className="mt-3 text-lg font-medium">Deposit complete</p>
              <p className="mt-1 text-sm text-sub">
                {formatAssetAmount(txn.destAmount, txn.destAsset)} is now in your {config.brandName} account.
              </p>
              <dl className="mt-4 space-y-1 rounded-md border border-stroke-soft bg-surface px-3 py-2 text-left text-sm">
                <div className="flex justify-between">
                  <dt className="text-sub">Reference</dt>
                  <dd className="font-mono text-[13px]">{txn.id}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sub">Time taken</dt>
                  <dd className="font-mono text-[13px]">{formatDuration(txn.durationSec)}</dd>
                </div>
              </dl>
              <button type="button" className={cn(primaryBtn, "mt-4")} style={{ background: accent, color: onAccent }} onClick={() => restart("start")}>
                Make another deposit
              </button>
            </div>
          )}
          {failed && (
            <div className="text-center">
              <span className="mx-auto grid size-12 place-items-center rounded-full bg-error-mute text-error-base">
                <X className="size-6" strokeWidth={3} />
              </span>
              <p className="mt-3 text-lg font-medium">Deposit didn&apos;t go through</p>
              <p className="mt-1 text-sm text-sub">{CUSTOMER_FAILURE_COPY[txn.failure?.code ?? ""] ?? "Something went wrong. Nothing was charged."}</p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button type="button" className="h-11 rounded-sm border border-stroke-mild text-sm font-medium hover:bg-layer" onClick={() => restart("start")}>
                  Change method
                </button>
                <button type="button" className={primaryBtn} style={{ background: accent, color: onAccent }} onClick={() => restart("review")}>
                  Try again
                </button>
              </div>
            </div>
          )}
          {(done || failed) && onViewTransaction && (
            <button
              type="button"
              onClick={() => onViewTransaction(txn.id)}
              className="mt-4 w-full rounded-sm border border-dashed border-stroke-strong py-2 text-xs font-medium text-sub hover:text-strong"
            >
              Merchant view: open {txn.id} in Transactions →
            </button>
          )}
        </div>
      )}

      <div className="flex items-center justify-center gap-1.5 border-t border-stroke-soft bg-surface py-2 text-[11px] text-sub">
        <ShieldCheck className="size-3.5" aria-hidden /> Powered by fun · demo checkout
      </div>
    </div>
  );
}
