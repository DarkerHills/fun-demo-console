export type Env = "sandbox" | "production";

export type TxnStatus = "pending" | "processing" | "completed" | "delayed" | "failed" | "expired";

export type PaymentMethod = "wallet" | "transfer" | "card" | "exchange";

export type AssetId = "USDC" | "USDT" | "ETH" | "SOL" | "WBTC" | "USD";

export type NetworkId = "ethereum" | "base" | "arbitrum" | "optimism" | "polygon" | "solana";

export type ExchangeId = "coinbase" | "kraken" | "binance";

export type RouteOptionId = "recommended" | "fastest" | "cheapest";

export type StepKind =
  | "authorize"
  | "deposit"
  | "confirm"
  | "withdraw"
  | "onramp"
  | "swap"
  | "bridge"
  | "deliver";

export type StepStatus = "done" | "active" | "pending" | "failed" | "skipped";

export interface RouteStep {
  id: string;
  kind: StepKind;
  label: string;
  detail: string;
  network: NetworkId | null;
  /** Estimated duration (quote) or actual duration (completed) in seconds. */
  durationSec: number;
  feeUsd: number;
  status: StepStatus;
  /** When the step finished (done/failed) or started (active). */
  at: number | null;
  meta: { label: string; value: string }[];
}

export interface Fees {
  network: number;
  routing: number;
  provider: number;
}

export interface FailureInfo {
  code: string;
  reason: string;
  stepKind: StepKind;
  suggestion: string;
}

export interface Transaction {
  id: string;
  env: Env;
  createdAt: number;
  updatedAt: number;
  customer: string;
  customerId: string;
  amountUsd: number;
  method: PaymentMethod;
  exchange: ExchangeId | null;
  cardLast4: string | null;
  sourceAsset: AssetId;
  sourceNetwork: NetworkId | null;
  sourceAmount: number;
  destAsset: AssetId;
  destNetwork: NetworkId;
  destAmount: number;
  destAddress: string;
  status: TxnStatus;
  durationSec: number | null;
  estimatedSec: number;
  fees: Fees;
  slippageBps: number;
  routeOption: RouteOptionId;
  steps: RouteStep[];
  txHash: string | null;
  sourceHash: string | null;
  failure: FailureInfo | null;
  origin: "seed" | "demo";
  checkoutName: string;
}

export type WebhookEventType =
  | "payment.created"
  | "payment.processing"
  | "payment.completed"
  | "payment.failed";

export type DeliveryStatus = "delivered" | "failed" | "pending";

export interface DeliveryAttempt {
  at: number;
  statusCode: number | null;
  durationMs: number;
  responseBody: string;
}

export interface WebhookEvent {
  id: string;
  env: Env;
  type: WebhookEventType;
  createdAt: number;
  txnId: string;
  deliveryStatus: DeliveryStatus;
  attempts: DeliveryAttempt[];
  payload: Record<string, unknown>;
  origin: "seed" | "demo";
}

export interface CheckoutConfig {
  name: string;
  reference: string;
  sources: Record<PaymentMethod, boolean>;
  assets: AssetId[];
  networks: NetworkId[];
  destAsset: AssetId;
  destNetwork: NetworkId;
  theme: "light" | "dark";
  accent: string;
  brandName: string;
  logo: string | null;
  defaultAmount: number;
  minAmount: number;
}

export type ApiKeyType = "secret" | "publishable";

export interface ApiKey {
  id: string;
  name: string;
  type: ApiKeyType;
  env: Env;
  value: string;
  createdAt: number;
  lastUsedAt: number | null;
  revokedAt: number | null;
}

export type Role = "Owner" | "Admin" | "Developer" | "Analyst" | "Viewer";

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: "active" | "invited";
  lastActiveAt: number | null;
}

export interface WorkspaceSettings {
  name: string;
  legalName: string;
  supportEmail: string;
  website: string;
  timezone: string;
  currency: "USD" | "EUR" | "GBP";
}

export interface NotificationSettings {
  failedPayments: boolean;
  failedThreshold: number;
  delayedPayments: boolean;
  webhookFailures: boolean;
  dailySummary: boolean;
  summaryTime: string;
  weeklyReport: boolean;
  channel: "email" | "slack" | "both";
  recipients: string;
}

export interface SecuritySettings {
  require2fa: boolean;
  sessionTimeout: "15" | "30" | "60" | "240";
  ipAllowlist: string;
  prodKeyApproval: boolean;
}

export type IntegrationState = "connected" | "incomplete" | "error";

export type RangeId = "24h" | "7d" | "30d";
