import { ASSETS, EXCHANGES, METHODS, NETWORKS, WORKSPACE } from "./catalog";
import type {
  AssetId,
  ExchangeId,
  Fees,
  NetworkId,
  PaymentMethod,
  RouteOptionId,
  RouteStep,
  StepKind,
} from "./types";
import { shortAddress } from "../utils";

/**
 * Illustrative route planner. Pure function of its inputs so quotes, seeded
 * transactions, and the Payment routes page always agree. Not a real router.
 */

export interface QuoteInput {
  method: PaymentMethod;
  sourceAsset: AssetId;
  sourceNetwork: NetworkId | null;
  exchange?: ExchangeId | null;
  destAsset: AssetId;
  destNetwork: NetworkId;
  amountUsd: number;
}

export interface RouteQuote {
  option: RouteOptionId;
  steps: RouteStep[];
  fees: Fees;
  totalFee: number;
  estimatedSec: number;
  slippageBps: number;
  sourceAmount: number;
  destAmount: number;
}

export const ROUTE_OPTIONS: Record<
  RouteOptionId,
  { label: string; description: string; bridge: string; bridgeSec: number; bridgePct: number; bridgeFixed: number; swapPct: number; slippageBps: number; deliverSec: number }
> = {
  recommended: {
    label: "Recommended",
    description: "Balanced speed and cost",
    bridge: "Fast relay",
    bridgeSec: 22,
    bridgePct: 0.0005,
    bridgeFixed: 0.25,
    swapPct: 0.0005,
    slippageBps: 30,
    deliverSec: 4,
  },
  fastest: {
    label: "Fastest",
    description: "Intent-based fill, higher fee",
    bridge: "Instant fill",
    bridgeSec: 8,
    bridgePct: 0.001,
    bridgeFixed: 0.4,
    swapPct: 0.0008,
    slippageBps: 50,
    deliverSec: 2,
  },
  cheapest: {
    label: "Lowest fee",
    description: "Canonical bridge, batched delivery",
    bridge: "Canonical bridge",
    bridgeSec: 540,
    bridgePct: 0.0001,
    bridgeFixed: 0.05,
    swapPct: 0.0003,
    slippageBps: 20,
    deliverSec: 45,
  },
};

const BLOCK_SEC: Record<NetworkId, number> = {
  ethereum: 12,
  base: 2,
  arbitrum: 1,
  optimism: 2,
  polygon: 2,
  solana: 1,
};

const mid = ([a, b]: [number, number]) => (a + b) / 2;
const round2 = (n: number) => Math.round(n * 100) / 100;

function step(
  kind: StepKind,
  label: string,
  detail: string,
  network: NetworkId | null,
  durationSec: number,
  feeUsd: number,
  meta: RouteStep["meta"],
  index: number,
): RouteStep {
  return {
    id: `${kind}-${index}`,
    kind,
    label,
    detail,
    network,
    durationSec: Math.round(durationSec),
    feeUsd: round2(feeUsd),
    status: "pending",
    at: null,
    meta,
  };
}

export function planRoute(input: QuoteInput, option: RouteOptionId = "recommended"): RouteQuote {
  const opt = ROUTE_OPTIONS[option];
  const { method, sourceAsset, destAsset, destNetwork, amountUsd } = input;
  const sourceNetwork = method === "card" ? null : input.sourceNetwork ?? destNetwork;
  const steps: RouteStep[] = [];
  let networkFee = 0;
  let routingFee = 0;
  let providerFee = 0;
  let i = 0;

  // Where funds sit after the entry step.
  let atNetwork: NetworkId = sourceNetwork ?? destNetwork;
  let atAsset: AssetId = sourceAsset;

  if (method === "wallet" && sourceNetwork) {
    const gas = mid(NETWORKS[sourceNetwork].gasUsd) * (option === "fastest" ? 1.3 : 1);
    networkFee += gas;
    steps.push(
      step(
        "authorize",
        "Wallet signature",
        `Signed in the customer's wallet and confirmed on ${NETWORKS[sourceNetwork].label}`,
        sourceNetwork,
        6 + BLOCK_SEC[sourceNetwork],
        gas,
        [
          { label: "Wallet", value: "0x8F2c…21A9 (simulated)" },
          { label: "Network fee", value: `$${gas.toFixed(2)}` },
        ],
        i++,
      ),
    );
  }

  if (method === "transfer" && sourceNetwork) {
    const net = NETWORKS[sourceNetwork];
    steps.push(
      step(
        "deposit",
        "Deposit received",
        `${sourceAsset} sent to a one-time deposit address on ${net.label}`,
        sourceNetwork,
        18,
        0,
        [
          { label: "Deposit address", value: "0x91bE…7C03 (one-time)" },
          { label: "Window", value: "30 minutes" },
        ],
        i++,
      ),
    );
    const confirmSec = option === "fastest" ? Math.max(4, net.confirmSec * 0.5) : net.confirmSec;
    steps.push(
      step(
        "confirm",
        "Confirmations",
        `Waiting for ${net.confirmations} confirmations on ${net.label}`,
        sourceNetwork,
        confirmSec,
        0,
        [{ label: "Required", value: `${net.confirmations} blocks` }],
        i++,
      ),
    );
  }

  if (method === "card") {
    const fee = amountUsd * 0.029 + 0.3;
    providerFee += fee;
    steps.push(
      step(
        "authorize",
        "Card authorization",
        "Charge authorized with 3-D Secure",
        null,
        5,
        0,
        [{ label: "Card", value: "Visa •••• 4242 (test)" }],
        i++,
      ),
    );
    steps.push(
      step(
        "onramp",
        "Buy USDC with card",
        `Card charge converted to USDC on ${NETWORKS[destNetwork].label}`,
        destNetwork,
        option === "fastest" ? 40 : option === "cheapest" ? 150 : 70,
        fee,
        [
          { label: "Provider fee", value: "2.9% + $0.30" },
          { label: "Settles on", value: NETWORKS[destNetwork].label },
        ],
        i++,
      ),
    );
    atNetwork = destNetwork;
    atAsset = "USDC";
  }

  if (method === "exchange" && sourceNetwork) {
    const ex = EXCHANGES[input.exchange ?? "coinbase"];
    providerFee += ex.withdrawFee;
    steps.push(
      step(
        "withdraw",
        `Withdraw from ${ex.label}`,
        `${sourceAsset} withdrawn from the customer's ${ex.label} account to ${NETWORKS[sourceNetwork].label}`,
        sourceNetwork,
        option === "cheapest" ? 420 : 180,
        ex.withdrawFee,
        [
          { label: "Exchange", value: ex.label },
          { label: "Withdrawal fee", value: ex.withdrawFee ? `$${ex.withdrawFee.toFixed(2)}` : "Free" },
        ],
        i++,
      ),
    );
  }

  if (atAsset !== destAsset) {
    const fee = amountUsd * opt.swapPct;
    routingFee += fee;
    const rate = ASSETS[atAsset].priceUsd / ASSETS[destAsset].priceUsd;
    steps.push(
      step(
        "swap",
        `Swap ${atAsset} → ${destAsset}`,
        `${atAsset} → ${destAsset} on ${NETWORKS[atNetwork].label} via aggregated DEX liquidity`,
        atNetwork,
        option === "fastest" ? 4 : 8 + BLOCK_SEC[atNetwork],
        fee,
        [
          { label: "Rate", value: `1 ${atAsset} = ${rate.toLocaleString("en-US", { maximumFractionDigits: rate < 1 ? 6 : 2 })} ${destAsset}` },
          { label: "Max slippage", value: `${(opt.slippageBps / 100).toFixed(2)}%` },
        ],
        i++,
      ),
    );
    atAsset = destAsset;
  }

  if (atNetwork !== destNetwork) {
    const fee = amountUsd * opt.bridgePct + opt.bridgeFixed;
    routingFee += fee;
    const slowL1 = atNetwork === "ethereum" && option === "cheapest" ? 1.6 : 1;
    steps.push(
      step(
        "bridge",
        `Bridge to ${NETWORKS[destNetwork].label}`,
        `${NETWORKS[atNetwork].label} → ${NETWORKS[destNetwork].label} via ${opt.bridge.toLowerCase()}`,
        destNetwork,
        opt.bridgeSec * slowL1,
        fee,
        [
          { label: "Bridge", value: opt.bridge },
          { label: "Path", value: `${NETWORKS[atNetwork].label} → ${NETWORKS[destNetwork].label}` },
        ],
        i++,
      ),
    );
    atNetwork = destNetwork;
  }

  const deliverGas = mid(NETWORKS[destNetwork].gasUsd);
  networkFee += deliverGas;
  steps.push(
    step(
      "deliver",
      "Deliver to treasury",
      `${destAsset} sent to ${WORKSPACE.name} on ${NETWORKS[destNetwork].label}`,
      destNetwork,
      opt.deliverSec + BLOCK_SEC[destNetwork],
      deliverGas,
      [{ label: "Recipient", value: shortAddress(WORKSPACE.treasury) }],
      i++,
    ),
  );

  const fees = { network: round2(networkFee), routing: round2(routingFee), provider: round2(providerFee) };
  const totalFee = round2(fees.network + fees.routing + fees.provider);
  const slippageBps = steps.some((s) => s.kind === "swap") ? opt.slippageBps : 0;
  const sourcePrice = ASSETS[sourceAsset].priceUsd;
  const destPrice = ASSETS[destAsset].priceUsd;

  return {
    option,
    steps,
    fees,
    totalFee,
    estimatedSec: steps.reduce((s, x) => s + x.durationSec, 0),
    slippageBps,
    sourceAmount: (amountUsd + totalFee) / sourcePrice,
    destAmount: amountUsd / destPrice,
  };
}

export function planAllRoutes(input: QuoteInput) {
  return (Object.keys(ROUTE_OPTIONS) as RouteOptionId[]).map((o) => planRoute(input, o));
}

export function methodSummary(method: PaymentMethod) {
  return METHODS[method].label;
}
