import { CUSTOMERS, EXCHANGES, FAILURES, NETWORKS, WORKSPACE, type FailureKey } from "./catalog";
import { planRoute } from "./route-plan";
import { createRng, type Rng } from "../prng";
import type {
  AssetId,
  Env,
  ExchangeId,
  FailureInfo,
  NetworkId,
  PaymentMethod,
  RouteOptionId,
  RouteStep,
  Transaction,
  TxnStatus,
  WebhookEvent,
} from "./types";
import { buildPayload, eventsFor, failedAttempt, okAttempt } from "./webhooks";

/*
 * Deterministic seed data. Offsets (not absolute dates) are seeded, then laid
 * against an anchor time on load — so "last 24 hours" always has activity.
 * Sandbox: ~60 test payments, weighted toward recent days (integration ramp-up).
 * Production: a busier, steadier book of payments.
 */

const SIZES: Record<Env, number> = { sandbox: 60, production: 360 };
const SEEDS: Record<Env, number> = { sandbox: 0x5eed01, production: 0x9a11ce };
const RECENCY: Record<Env, number> = { sandbox: 2.2, production: 1.3 };
const MONTH_MIN = 30 * 24 * 60;

export function hashString(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function customerIdFor(email: string) {
  return `cus_${hashString(email).toString(36).padStart(7, "0").slice(0, 7)}`;
}

export function hashFor(network: NetworkId | null, rng: { hex: (n: number) => string; base58: (n: number) => string }) {
  if (network === "solana") return rng.base58(88);
  return `0x${rng.hex(64)}`;
}

function pickSource(rng: Rng, method: PaymentMethod): { asset: AssetId; network: NetworkId | null; exchange: ExchangeId | null } {
  if (method === "card") return { asset: "USD", network: null, exchange: null };
  const evm: (readonly [NetworkId, number])[] = [
    ["ethereum", 34],
    ["base", 26],
    ["arbitrum", 20],
    ["optimism", 10],
    ["polygon", 10],
  ];
  if (method === "exchange") {
    const exchange = rng.weighted<ExchangeId>([
      ["coinbase", 55],
      ["kraken", 25],
      ["binance", 20],
    ]);
    const asset = rng.weighted<AssetId>([
      ["USDC", 50],
      ["ETH", 30],
      ["USDT", 20],
    ]);
    const network = rng.weighted<NetworkId>([
      ["base", 40],
      ["ethereum", 25],
      ["arbitrum", 15],
      ["solana", 20],
    ]);
    return { asset: asset === "ETH" && network === "solana" ? "USDC" : asset, network, exchange };
  }
  const asset =
    method === "wallet"
      ? rng.weighted<AssetId>([
          ["ETH", 34],
          ["USDC", 34],
          ["USDT", 14],
          ["SOL", 12],
          ["WBTC", 6],
        ])
      : rng.weighted<AssetId>([
          ["USDC", 46],
          ["USDT", 28],
          ["ETH", 16],
          ["SOL", 10],
        ]);
  if (asset === "SOL") return { asset, network: "solana", exchange: null };
  if (asset === "WBTC") return { asset, network: rng.pick(["ethereum", "arbitrum"] as const), exchange: null };
  if (asset === "USDC" && rng.chance(0.14)) return { asset, network: "solana", exchange: null };
  return { asset, network: rng.weighted(evm), exchange: null };
}

function pickAmount(rng: Rng, env: Env, method: PaymentMethod) {
  const median = env === "production" ? 320 : 180;
  let amt = Math.exp(rng.normal(Math.log(median), 1.05));
  amt = Math.min(method === "card" ? 2500 : 25000, Math.max(15, amt));
  if (rng.chance(0.3)) amt = amt > 400 ? Math.round(amt / 50) * 50 : Math.round(amt / 10) * 10;
  else amt = Math.round(amt * 100) / 100;
  return Math.max(15, amt);
}

function failureFor(rng: Rng, method: PaymentMethod, steps: RouteStep[]): FailureKey {
  const has = (k: RouteStep["kind"]) => steps.some((s) => s.kind === k);
  const options: FailureKey[] =
    method === "wallet"
      ? ["rejected", "gas", ...(has("swap") ? (["slippage", "slippage"] as const) : []), ...(has("bridge") ? (["bridgeTimeout"] as const) : [])]
      : method === "transfer"
        ? ["belowMin", "wrongToken", ...(has("swap") ? (["slippage"] as const) : []), ...(has("bridge") ? (["bridgeTimeout"] as const) : [])]
        : method === "card"
          ? ["cardDeclined", "cardDeclined", "threeDs"]
          : ["exchange2fa", "exchangeLimit", ...(has("bridge") ? (["bridgeTimeout"] as const) : [])];
  return rng.pick(options);
}

export interface MaterializeArgs {
  steps: RouteStep[];
  status: TxnStatus;
  createdAt: number;
  now: number;
  jitter: () => number;
  failureKey?: FailureKey;
  scaleTo?: number;
}

/** Turn quoted steps into a lifecycle snapshot for a given status. */
export function materializeSteps({ steps, status, createdAt, now, jitter, failureKey, scaleTo }: MaterializeArgs) {
  const actual = steps.map((s) => Math.max(1, Math.round(s.durationSec * jitter())));
  if (scaleTo) {
    const total = actual.reduce((a, b) => a + b, 0);
    for (let i = 0; i < actual.length; i++) actual[i] = Math.max(1, Math.round((actual[i] * scaleTo) / total));
    const diff = scaleTo - actual.reduce((a, b) => a + b, 0);
    actual[actual.length - 1] += diff;
  }

  let failureIndex = -1;
  if (status === "failed" && failureKey) {
    failureIndex = steps.findIndex((s) => s.kind === FAILURES[failureKey].stepKind);
    if (failureIndex < 0) failureIndex = 0;
  }
  if (status === "expired") failureIndex = 0;

  const elapsedSec = Math.max(1, (now - createdAt) / 1000);
  let activeIndex = -1;
  if (status === "pending") activeIndex = 0;
  if (status === "processing" || status === "delayed") {
    let cum = 0;
    activeIndex = steps.length - 1;
    for (let i = 0; i < steps.length; i++) {
      if (cum + actual[i] > elapsedSec * (status === "delayed" ? 0.4 : 1)) {
        activeIndex = i;
        break;
      }
      cum += actual[i];
    }
    if (status === "processing") activeIndex = Math.max(activeIndex, 1);
    activeIndex = Math.min(activeIndex, steps.length - 1);
  }

  let cursor = createdAt;
  const out: RouteStep[] = steps.map((s, i) => {
    if (status === "completed") {
      cursor += actual[i] * 1000;
      return { ...s, durationSec: actual[i], status: "done", at: cursor };
    }
    if (failureIndex >= 0) {
      if (i < failureIndex) {
        cursor += actual[i] * 1000;
        return { ...s, durationSec: actual[i], status: "done", at: cursor };
      }
      if (i === failureIndex) {
        const spent = status === "expired" ? 1800 : Math.round(actual[i] * (failureKey === "bridgeTimeout" ? 1 : 0.6) + (failureKey === "bridgeTimeout" ? 900 : 0));
        cursor += spent * 1000;
        return { ...s, durationSec: spent, status: "failed", at: cursor };
      }
      return { ...s, status: "skipped", at: null };
    }
    // in flight
    if (i < activeIndex) {
      cursor += actual[i] * 1000;
      return { ...s, durationSec: actual[i], status: "done", at: cursor };
    }
    if (i === activeIndex) return { ...s, status: "active", at: cursor };
    return { ...s, status: "pending", at: null };
  });

  const finished = status === "completed" || failureIndex >= 0;
  return {
    steps: out,
    updatedAt: finished ? cursor : Math.min(now, cursor),
    durationSec: status === "completed" ? Math.round((cursor - createdAt) / 1000) : null,
  };
}

function statusFor(rng: Rng, env: Env, ageMin: number, method: PaymentMethod): TxnStatus {
  const failW = env === "sandbox" ? 10 : 6;
  if (ageMin < 4) return rng.weighted<TxnStatus>([["processing", 50], ["pending", 25], ["completed", 25]]);
  if (ageMin < 30)
    return rng.weighted<TxnStatus>([["completed", 74], ["processing", 9], ["delayed", 9], ["failed", 8]]);
  const s = rng.weighted<TxnStatus>([["completed", 100 - failW - 4], ["failed", failW], ["expired", 4]]);
  if (s === "expired" && method !== "transfer") return "failed";
  return s;
}

interface Forced {
  id?: string;
  ageMin: number;
  status: TxnStatus;
  customer?: string;
  amount?: number;
  method?: PaymentMethod;
  source?: { asset: AssetId; network: NetworkId | null; exchange: ExchangeId | null };
  failure?: FailureKey;
  durationSec?: number;
}

/** Guarantees every state is present in recent data for both environments. */
const FORCED: Record<Env, Forced[]> = {
  sandbox: [
    {
      id: "txn_8F21A9",
      ageMin: 128,
      status: "completed",
      customer: "alex@example.com",
      amount: 250,
      method: "wallet",
      source: { asset: "USDC", network: "ethereum", exchange: null },
      durationSec: 42,
    },
    { ageMin: 2, status: "processing", method: "transfer", source: { asset: "USDT", network: "arbitrum", exchange: null } },
    { ageMin: 1, status: "pending", method: "wallet", source: { asset: "ETH", network: "ethereum", exchange: null } },
    { ageMin: 38, status: "delayed", method: "wallet", source: { asset: "ETH", network: "arbitrum", exchange: null } },
    { ageMin: 64, status: "failed", method: "wallet", source: { asset: "ETH", network: "ethereum", exchange: null }, failure: "slippage" },
    { ageMin: 210, status: "failed", method: "card", failure: "cardDeclined" },
    { ageMin: 300, status: "expired", method: "transfer", source: { asset: "USDC", network: "polygon", exchange: null } },
  ],
  production: [
    { ageMin: 1, status: "processing", method: "exchange", source: { asset: "USDC", network: "base", exchange: "coinbase" } },
    { ageMin: 0.5, status: "pending", method: "transfer", source: { asset: "USDC", network: "solana", exchange: null } },
    { ageMin: 3, status: "processing", method: "wallet", source: { asset: "SOL", network: "solana", exchange: null } },
    { ageMin: 26, status: "delayed", method: "transfer", source: { asset: "ETH", network: "ethereum", exchange: null } },
    { ageMin: 47, status: "delayed", method: "wallet", source: { asset: "USDT", network: "optimism", exchange: null } },
    { ageMin: 52, status: "failed", method: "wallet", source: { asset: "ETH", network: "arbitrum", exchange: null }, failure: "slippage" },
    { ageMin: 95, status: "failed", method: "exchange", source: { asset: "USDC", network: "ethereum", exchange: "kraken" }, failure: "exchange2fa" },
    { ageMin: 180, status: "expired", method: "transfer", source: { asset: "USDT", network: "ethereum", exchange: null } },
  ],
};

export interface SeedData {
  transactions: Transaction[];
  events: WebhookEvent[];
}

const cache = new Map<string, SeedData>();

export function getSeed(env: Env, anchor: number): SeedData {
  const key = `${env}:${anchor}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const data = generate(env, anchor);
  cache.clear();
  cache.set(key, data);
  return data;
}

function generate(env: Env, anchor: number): SeedData {
  const rng = createRng(SEEDS[env]);
  const used = new Set<string>();
  const transactions: Transaction[] = [];
  const forced = FORCED[env];
  const total = SIZES[env];

  for (let i = 0; i < total; i++) {
    const f = forced[i];
    const ageMin = f ? f.ageMin : MONTH_MIN * Math.pow(rng.next(), RECENCY[env]) + 0.5;
    const createdAt = Math.round(anchor - ageMin * 60_000);
    const method: PaymentMethod =
      f?.method ??
      rng.weighted<PaymentMethod>([
        ["wallet", 38],
        ["transfer", 27],
        ["card", 20],
        ["exchange", 15],
      ]);
    const source = f?.source ?? pickSource(rng, method);
    const destNetwork: NetworkId = env === "production" && rng.chance(0.12) ? "arbitrum" : "base";
    const amountUsd = f?.amount ?? pickAmount(rng, env, method);
    const option: RouteOptionId = rng.weighted<RouteOptionId>([
      ["recommended", 80],
      ["fastest", 14],
      ["cheapest", 6],
    ]);
    const quote = planRoute(
      {
        method,
        sourceAsset: source.asset,
        sourceNetwork: source.network,
        exchange: source.exchange,
        destAsset: "USDC",
        destNetwork: f?.id ? "base" : destNetwork,
        amountUsd,
      },
      f ? "recommended" : option,
    );

    let status = f?.status ?? statusFor(rng, env, ageMin, method);
    if (status === "expired" && method !== "transfer") status = "failed";
    const failureKey: FailureKey | undefined =
      status === "failed" ? f?.failure ?? failureFor(rng, method, quote.steps) : status === "expired" ? "quoteExpired" : undefined;

    const lifecycle = materializeSteps({
      steps: quote.steps,
      status,
      createdAt,
      now: anchor,
      jitter: () => rng.range(0.78, 1.32),
      failureKey,
      scaleTo: f?.durationSec,
    });

    let id = f?.id ?? `txn_${rng.hex(6).toUpperCase()}`;
    while (used.has(id)) id = `txn_${rng.hex(6).toUpperCase()}`;
    used.add(id);

    const customer = f?.customer ?? rng.pick(CUSTOMERS);
    const failure: FailureInfo | null = failureKey
      ? {
          code: FAILURES[failureKey].code,
          reason: FAILURES[failureKey].reason,
          stepKind: lifecycle.steps.find((s) => s.status === "failed")?.kind ?? FAILURES[failureKey].stepKind,
          suggestion: FAILURES[failureKey].suggestion,
        }
      : null;

    const sourceMoved = lifecycle.steps.some((s) => s.status === "done" && s.kind !== "authorize");
    transactions.push({
      id,
      env,
      createdAt,
      updatedAt: lifecycle.updatedAt,
      customer,
      customerId: customerIdFor(customer),
      amountUsd,
      method,
      exchange: source.exchange,
      cardLast4: method === "card" ? rng.pick(["4242", "1881", "0005", "4444"]) : null,
      sourceAsset: source.asset,
      sourceNetwork: source.network,
      sourceAmount: quote.sourceAmount,
      destAsset: "USDC",
      destNetwork: quote.steps[quote.steps.length - 1].network ?? "base",
      destAmount: quote.destAmount,
      destAddress: WORKSPACE.treasury,
      status,
      durationSec: lifecycle.durationSec,
      estimatedSec: quote.estimatedSec,
      fees: quote.fees,
      slippageBps: quote.slippageBps,
      routeOption: f ? "recommended" : option,
      steps: lifecycle.steps,
      txHash: status === "completed" ? hashFor(quote.steps[quote.steps.length - 1].network, rng) : null,
      sourceHash: source.network && (sourceMoved || status === "completed") ? hashFor(source.network, rng) : null,
      failure,
      origin: "seed",
      checkoutName: "Nova Markets deposit",
    });
  }

  transactions.sort((a, b) => b.createdAt - a.createdAt);
  return { transactions, events: generateEvents(env, anchor, transactions, rng) };
}

function generateEvents(env: Env, anchor: number, txns: Transaction[], rng: Rng): WebhookEvent[] {
  const windowMs = env === "production" ? 3 * 86_400_000 : 30 * 86_400_000;
  const events: WebhookEvent[] = [];
  const recent = txns.filter((t) => anchor - t.createdAt < windowMs);

  for (const txn of recent) {
    const types = eventsFor(txn);
    types.forEach((type, idx) => {
      const createdAt =
        type === "payment.created"
          ? txn.createdAt + 400
          : type === "payment.processing"
            ? (txn.steps.find((s) => s.at)?.at ?? txn.createdAt + 5000)
            : txn.updatedAt + 600;
      const id = `evt_${rng.base58(16)}`;
      const roll = rng.next();
      let deliveryStatus: WebhookEvent["deliveryStatus"] = "delivered";
      let attempts = [okAttempt(createdAt + 300, rng.int(80, 420))];
      if (roll > 0.94) {
        deliveryStatus = "failed";
        const kind = rng.pick(["500", "timeout", "502"] as const);
        attempts = [0, 60_000, 360_000]
          .filter((d) => createdAt + d < anchor)
          .map((d) => failedAttempt(createdAt + 300 + d, kind));
        if (!attempts.length) attempts = [failedAttempt(createdAt + 300, kind)];
      } else if (roll > 0.89) {
        attempts = [failedAttempt(createdAt + 300, rng.pick(["500", "timeout"] as const)), okAttempt(createdAt + 60_300, rng.int(90, 380))];
      }
      events.push({
        id,
        env,
        type,
        createdAt: Math.min(createdAt, anchor - (types.length - idx) * 1000),
        txnId: txn.id,
        deliveryStatus,
        attempts,
        payload: buildPayload(txn, type, id, createdAt),
        origin: "seed",
      });
    });
  }

  events.sort((a, b) => b.createdAt - a.createdAt);
  return events;
}

export function networkLabel(n: NetworkId | null) {
  return n ? NETWORKS[n].label : "—";
}

export function exchangeLabel(e: ExchangeId | null) {
  return e ? EXCHANGES[e].label : null;
}
