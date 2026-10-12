import type {
  AssetId,
  ExchangeId,
  NetworkId,
  PaymentMethod,
  RangeId,
  StepKind,
  TxnStatus,
  WebhookEventType,
} from "./types";

export const WORKSPACE = {
  name: "Nova Markets",
  id: "ws_nova_8c41e2",
  treasury: "0x4f3A9c1E7b2D58a0C6e94F17bB20dE5a1c9a2C4d",
} as const;

export const METHODS: Record<
  PaymentMethod,
  { label: string; short: string; description: string; chart: string }
> = {
  wallet: {
    label: "Connected wallet",
    short: "Wallet",
    description: "Customer signs from a self-custody wallet",
    chart: "var(--chart-1)",
  },
  transfer: {
    label: "Transfer crypto",
    short: "Transfer",
    description: "Customer sends funds to a one-time deposit address",
    chart: "var(--chart-2)",
  },
  card: {
    label: "Card",
    short: "Card",
    description: "Debit or credit card, converted to stablecoins",
    chart: "var(--chart-3)",
  },
  exchange: {
    label: "Exchange account",
    short: "Exchange",
    description: "Withdraw directly from a centralized exchange",
    chart: "var(--chart-4)",
  },
};

export const METHOD_ORDER: PaymentMethod[] = ["wallet", "transfer", "card", "exchange"];

export const ASSETS: Record<
  AssetId,
  { label: string; name: string; glyph: string; color: string; priceUsd: number }
> = {
  USDC: { label: "USDC", name: "USD Coin", glyph: "$", color: "#335cff", priceUsd: 1 },
  USDT: { label: "USDT", name: "Tether USD", glyph: "₮", color: "#1daf9c", priceUsd: 1 },
  ETH: { label: "ETH", name: "Ether", glyph: "Ξ", color: "#4c25a7", priceUsd: 3200 },
  SOL: { label: "SOL", name: "Solana", glyph: "◎", color: "#7d52f4", priceUsd: 160 },
  WBTC: { label: "WBTC", name: "Wrapped Bitcoin", glyph: "₿", color: "#e16614", priceUsd: 64000 },
  USD: { label: "USD", name: "US Dollar (card)", glyph: "$", color: "#5c5c5c", priceUsd: 1 },
};

export const CRYPTO_ASSETS: AssetId[] = ["USDC", "USDT", "ETH", "SOL", "WBTC"];

export const NETWORKS: Record<
  NetworkId,
  {
    label: string;
    glyph: string;
    color: string;
    confirmSec: number;
    confirmations: number;
    gasUsd: [number, number];
    explorer: string;
  }
> = {
  ethereum: { label: "Ethereum", glyph: "E", color: "#4c25a7", confirmSec: 150, confirmations: 12, gasUsd: [1.4, 4.2], explorer: "etherscan" },
  base: { label: "Base", glyph: "B", color: "#335cff", confirmSec: 12, confirmations: 6, gasUsd: [0.01, 0.06], explorer: "basescan" },
  arbitrum: { label: "Arbitrum", glyph: "A", color: "#2597d0", confirmSec: 10, confirmations: 6, gasUsd: [0.03, 0.12], explorer: "arbiscan" },
  optimism: { label: "Optimism", glyph: "O", color: "#e93544", confirmSec: 14, confirmations: 6, gasUsd: [0.02, 0.1], explorer: "optimistic.etherscan" },
  polygon: { label: "Polygon", glyph: "P", color: "#693ee0", confirmSec: 20, confirmations: 32, gasUsd: [0.01, 0.04], explorer: "polygonscan" },
  solana: { label: "Solana", glyph: "S", color: "#178c7d", confirmSec: 6, confirmations: 32, gasUsd: [0.001, 0.008], explorer: "solscan" },
};

export const NETWORK_ORDER: NetworkId[] = ["ethereum", "base", "arbitrum", "optimism", "polygon", "solana"];

export const EXCHANGES: Record<ExchangeId, { label: string; glyph: string; withdrawFee: number; color: string }> = {
  coinbase: { label: "Coinbase", glyph: "C", withdrawFee: 0, color: "#335cff" },
  kraken: { label: "Kraken", glyph: "K", withdrawFee: 1.5, color: "#5b2cc9" },
  binance: { label: "Binance", glyph: "B", withdrawFee: 0.8, color: "#c99a2c" },
};

export const STATUS_META: Record<
  TxnStatus,
  { label: string; tone: "success" | "info" | "neutral" | "warning" | "error" | "muted"; description: string }
> = {
  pending: { label: "Pending", tone: "neutral", description: "Waiting for the customer to sign or send funds" },
  processing: { label: "Processing", tone: "info", description: "Funds are moving along the route" },
  completed: { label: "Completed", tone: "success", description: "Funds delivered to the destination" },
  delayed: { label: "Delayed", tone: "warning", description: "Taking longer than the route estimate" },
  failed: { label: "Failed", tone: "error", description: "The payment stopped before delivery" },
  expired: { label: "Expired", tone: "muted", description: "The quote or deposit window closed" },
};

export const STATUS_ORDER: TxnStatus[] = ["completed", "processing", "pending", "delayed", "failed", "expired"];

export const STEP_LABELS: Record<StepKind, string> = {
  authorize: "Authorize",
  deposit: "Deposit",
  confirm: "Confirmations",
  withdraw: "Exchange withdrawal",
  onramp: "Card purchase",
  swap: "Swap",
  bridge: "Bridge",
  deliver: "Deliver",
};

export const FAILURES = {
  slippage: {
    code: "slippage_exceeded",
    reason: "Price moved beyond the 0.5% slippage tolerance",
    stepKind: "swap",
    suggestion: "Ask the customer to retry — a fresh quote usually clears. Consider raising tolerance for volatile assets.",
  },
  rejected: {
    code: "signature_rejected",
    reason: "Customer rejected the signature request in their wallet",
    stepKind: "authorize",
    suggestion: "No funds moved. The customer can start a new deposit at any time.",
  },
  gas: {
    code: "insufficient_gas",
    reason: "Not enough native token to pay network fees on the source chain",
    stepKind: "authorize",
    suggestion: "Suggest a gas-free source such as card or exchange, or a lower-fee network.",
  },
  belowMin: {
    code: "deposit_below_minimum",
    reason: "Amount received was below the checkout minimum",
    stepKind: "deposit",
    suggestion: "Funds are held for refund. Contact the customer to top up or refund.",
  },
  wrongToken: {
    code: "unsupported_token",
    reason: "An unsupported token was sent to the deposit address",
    stepKind: "deposit",
    suggestion: "Funds are held for manual recovery. Open a support case with the transaction hash.",
  },
  cardDeclined: {
    code: "card_declined",
    reason: "Card declined by the issuer (do_not_honor)",
    stepKind: "onramp",
    suggestion: "Customer should contact their bank or try another card.",
  },
  threeDs: {
    code: "authentication_failed",
    reason: "3-D Secure authentication was not completed",
    stepKind: "authorize",
    suggestion: "Customer can retry and complete verification with their bank.",
  },
  exchange2fa: {
    code: "exchange_withdrawal_rejected",
    reason: "Exchange rejected the withdrawal — 2FA not completed",
    stepKind: "withdraw",
    suggestion: "Customer must approve the withdrawal in their exchange account.",
  },
  exchangeLimit: {
    code: "exchange_limit_reached",
    reason: "Exchange daily withdrawal limit reached",
    stepKind: "withdraw",
    suggestion: "Customer can retry tomorrow or split the deposit.",
  },
  bridgeTimeout: {
    code: "bridge_timeout",
    reason: "Bridge relay did not confirm within 15 minutes",
    stepKind: "bridge",
    suggestion: "Funds are safe on the source chain and will be refunded automatically.",
  },
  quoteExpired: {
    code: "quote_expired",
    reason: "Deposit window closed before funds arrived",
    stepKind: "deposit",
    suggestion: "No funds were received. The customer can generate a new deposit address.",
  },
} as const satisfies Record<string, { code: string; reason: string; stepKind: StepKind; suggestion: string }>;

export type FailureKey = keyof typeof FAILURES;

export const FAILURE_BY_CODE: Record<string, (typeof FAILURES)[FailureKey]> = Object.fromEntries(
  Object.values(FAILURES).map((f) => [f.code, f]),
);

export const RANGES: Record<RangeId, { label: string; long: string; ms: number; bucket: "hour" | "day" }> = {
  "24h": { label: "24h", long: "Last 24 hours", ms: 86_400_000, bucket: "hour" },
  "7d": { label: "7d", long: "Last 7 days", ms: 7 * 86_400_000, bucket: "day" },
  "30d": { label: "30d", long: "Last 30 days", ms: 30 * 86_400_000, bucket: "day" },
};

export const EVENT_TYPES: WebhookEventType[] = [
  "payment.created",
  "payment.processing",
  "payment.completed",
  "payment.failed",
];

export const WEBHOOK_ENDPOINT = "https://api.novamarkets.example/webhooks/fun";

export const CUSTOMERS = [
  "alex@example.com",
  "priya.natarajan@example.com",
  "marco.rossi@example.com",
  "chen.wei@example.com",
  "sofia.alvarez@example.com",
  "jordan.lee@example.com",
  "amara.okafor@example.com",
  "lukas.meyer@example.com",
  "hana.sato@example.com",
  "diego.fernandez@example.com",
  "noah.becker@example.com",
  "fatima.zahra@example.com",
  "ethan.walker@example.com",
  "isla.morgan@example.com",
  "ravi.krishnan@example.com",
  "elena.petrova@example.com",
  "sam.taylor@example.com",
  "yuki.tanaka@example.com",
  "omar.haddad@example.com",
  "grace.kim@example.com",
  "leo.martin@example.com",
  "zoe.clarke@example.com",
  "mateo.garcia@example.com",
  "ines.duarte@example.com",
  "kofi.mensah@example.com",
  "mia.schmidt@example.com",
  "arjun.mehta@example.com",
  "lina.nguyen@example.com",
  "tomas.novak@example.com",
  "ava.thompson@example.com",
  "felix.wagner@example.com",
  "nadia.rahman@example.com",
];

/** Which networks each asset can be paid on in this demo. */
export const ASSET_NETWORKS: Record<AssetId, NetworkId[]> = {
  USDC: ["ethereum", "base", "arbitrum", "optimism", "polygon", "solana"],
  USDT: ["ethereum", "arbitrum", "optimism", "polygon", "solana"],
  ETH: ["ethereum", "base", "arbitrum", "optimism"],
  SOL: ["solana"],
  WBTC: ["ethereum", "arbitrum"],
  USD: [],
};

export function networksFor(asset: AssetId, enabled: NetworkId[]) {
  return ASSET_NETWORKS[asset].filter((n) => enabled.includes(n));
}

/** Simulated balances in the customer's connected wallet. */
export const WALLET_BALANCES: Record<AssetId, number> = {
  USDC: 1240.5,
  USDT: 600,
  ETH: 0.8421,
  SOL: 14.2,
  WBTC: 0.031,
  USD: 0,
};

export const FAILURES_BY_METHOD: Record<PaymentMethod, FailureKey[]> = {
  wallet: ["rejected", "slippage", "gas", "bridgeTimeout"],
  transfer: ["belowMin", "wrongToken", "slippage", "bridgeTimeout"],
  card: ["cardDeclined", "threeDs"],
  exchange: ["exchange2fa", "exchangeLimit", "bridgeTimeout"],
};

/** What the customer sees — plain language, no internal codes. */
export const CUSTOMER_FAILURE_COPY: Record<string, string> = {
  slippage_exceeded: "The price moved while your deposit was processing. Nothing was charged — try again for a fresh quote.",
  signature_rejected: "You declined the request in your wallet. Nothing was charged.",
  insufficient_gas: "Your wallet doesn't have enough to cover network fees. Add funds or choose another method.",
  deposit_below_minimum: "The amount received was below the minimum. Support will help you top up or refund.",
  unsupported_token: "That token isn't supported at this address. Contact support with your transaction hash.",
  card_declined: "Your card was declined. Try another card or payment method.",
  authentication_failed: "Card verification wasn't completed. Try again and approve the request from your bank.",
  exchange_withdrawal_rejected: "Your exchange didn't approve the withdrawal. Approve it in your exchange account and retry.",
  exchange_limit_reached: "You've reached your exchange's daily withdrawal limit. Try a smaller amount or another method.",
  bridge_timeout: "The transfer took too long and was cancelled. Your funds will be returned automatically.",
  quote_expired: "The deposit window closed before funds arrived. Start a new deposit to get a fresh address.",
};
