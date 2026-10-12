"use client";

import { FAILURES, METHODS, WORKSPACE, type FailureKey } from "../data/catalog";
import { planRoute } from "../data/route-plan";
import { customerIdFor } from "../data/seed";
import type {
  AssetId,
  CheckoutConfig,
  Env,
  ExchangeId,
  NetworkId,
  PaymentMethod,
  RouteOptionId,
  RouteStep,
  Transaction,
  TxnStatus,
  WebhookEvent,
  WebhookEventType,
} from "../data/types";
import { buildPayload, failedAttempt, okAttempt } from "../data/webhooks";
import { formatUsd } from "../format";
import { randomHex, randomId } from "../utils";
import { useDemo } from "./demo-store";
import { toast } from "./toast-store";

export type SimSpeed = "fast" | "realtime";

export interface SimulationInput {
  config: CheckoutConfig;
  env: Env;
  method: PaymentMethod;
  sourceAsset: AssetId;
  sourceNetwork: NetworkId | null;
  exchange: ExchangeId | null;
  amountUsd: number;
  option: RouteOptionId;
  outcome: "success" | "failure";
  failureKey: FailureKey;
  speed: SimSpeed;
  customer: string;
  notify?: boolean;
}

const store = () => useDemo.getState();

function emit(txn: Transaction, type: WebhookEventType) {
  const id = randomId("evt_", 16);
  const createdAt = Date.now();
  const event: WebhookEvent = {
    id,
    env: txn.env,
    type,
    createdAt,
    txnId: txn.id,
    deliveryStatus: "pending",
    attempts: [],
    payload: buildPayload(txn, type, id, createdAt),
    origin: "demo",
  };
  store().addEvent(event);
  const failing = store().integrationPreview === "error";
  setTimeout(
    () => {
      const at = Date.now();
      store().updateEvent(id, failing
        ? { deliveryStatus: "failed", attempts: [failedAttempt(at, "500")] }
        : { deliveryStatus: "delivered", attempts: [okAttempt(at, 120 + Math.round(Math.random() * 240))] });
    },
    500 + Math.random() * 500,
  );
}

function current(id: string) {
  return store().createdTxns.find((t) => t.id === id);
}

/** Validates that a failure reason applies to the route; falls back to one that does. */
export function failureStepIndex(steps: RouteStep[], key: FailureKey) {
  const idx = steps.findIndex((s) => s.kind === FAILURES[key].stepKind);
  return idx >= 0 ? idx : 0;
}

export function startSimulation(input: SimulationInput): string {
  const quote = planRoute(
    {
      method: input.method,
      sourceAsset: input.sourceAsset,
      sourceNetwork: input.sourceNetwork,
      exchange: input.exchange,
      destAsset: input.config.destAsset,
      destNetwork: input.config.destNetwork,
      amountUsd: input.amountUsd,
    },
    input.option,
  );

  const now = Date.now();
  const id = `txn_${randomHex(6).toUpperCase()}`;
  const steps = quote.steps.map((s, i) => ({ ...s, status: i === 0 ? ("active" as const) : ("pending" as const), at: i === 0 ? now : null }));
  const txn: Transaction = {
    id,
    env: input.env,
    createdAt: now,
    updatedAt: now,
    customer: input.customer,
    customerId: customerIdFor(input.customer),
    amountUsd: input.amountUsd,
    method: input.method,
    exchange: input.exchange,
    cardLast4: input.method === "card" ? "4242" : null,
    sourceAsset: input.sourceAsset,
    sourceNetwork: input.method === "card" ? null : input.sourceNetwork,
    sourceAmount: quote.sourceAmount,
    destAsset: input.config.destAsset,
    destNetwork: input.config.destNetwork,
    destAmount: quote.destAmount,
    destAddress: WORKSPACE.treasury,
    status: "pending",
    durationSec: null,
    estimatedSec: quote.estimatedSec,
    fees: quote.fees,
    slippageBps: quote.slippageBps,
    routeOption: input.option,
    steps,
    txHash: null,
    sourceHash: null,
    failure: null,
    origin: "demo",
    checkoutName: input.config.name,
  };
  store().addTxn(txn);
  emit(txn, "payment.created");
  const pub = store().apiKeys.find((k) => k.env === input.env && k.type === "publishable" && !k.revokedAt);
  if (pub) store().touchKey(pub.id);

  const failAt = input.outcome === "failure" ? failureStepIndex(quote.steps, input.failureKey) : -1;
  const est = quote.steps.map((s) => s.durationSec);
  const estTotal = est.reduce((a, b) => a + b, 0);
  const stepMs = est.map((d) =>
    input.speed === "fast"
      ? Math.max(650, (d / estTotal) * 5200)
      : Math.max(1000, d * 1000 * Math.min(1, 60 / estTotal)),
  );

  let i = 0;
  const tick = () => {
    const t = current(id);
    if (!t) return; // demo was reset
    const at = Date.now();
    const nextSteps = t.steps.map((s) => ({ ...s }));
    const startedAt = nextSteps[i].at ?? at;

    if (i === failAt) {
      nextSteps[i] = { ...nextSteps[i], status: "failed", at, durationSec: Math.max(1, Math.round((at - startedAt) / 1000)) };
      for (let j = i + 1; j < nextSteps.length; j++) nextSteps[j] = { ...nextSteps[j], status: "skipped", at: null };
      const f = FAILURES[input.failureKey];
      const failed: Partial<Transaction> = {
        steps: nextSteps,
        status: "failed" as TxnStatus,
        updatedAt: at,
        failure: { code: f.code, reason: f.reason, stepKind: nextSteps[i].kind, suggestion: f.suggestion },
      };
      store().updateTxn(id, failed);
      emit({ ...t, ...failed } as Transaction, "payment.failed");
      if (input.notify !== false) {
        toast.error(`Test payment failed · ${id}`, {
          description: f.reason,
          action: { label: "Investigate", href: `/transactions?status=failed&txn=${id}` },
          duration: 7000,
        });
      }
      return;
    }

    nextSteps[i] = { ...nextSteps[i], status: "done", at, durationSec: Math.max(1, Math.round((at - startedAt) / 1000)) };
    const done = i === nextSteps.length - 1;
    if (!done) nextSteps[i + 1] = { ...nextSteps[i + 1], status: "active", at };

    const patch: Partial<Transaction> = {
      steps: nextSteps,
      updatedAt: at,
      status: done ? "completed" : "processing",
      sourceHash: t.sourceHash ?? (t.sourceNetwork && t.method !== "card" ? `0x${randomHex(64)}` : null),
    };
    if (done) {
      patch.durationSec = Math.max(1, Math.round((at - t.createdAt) / 1000));
      patch.txHash = t.destNetwork === "solana" ? randomId("", 88) : `0x${randomHex(64)}`;
    }
    store().updateTxn(id, patch);
    const updated = { ...t, ...patch } as Transaction;
    if (i === 0) emit(updated, "payment.processing");
    if (done) {
      emit(updated, "payment.completed");
      if (input.notify !== false) {
        toast.success(`Test payment completed · ${id}`, {
          description: `${formatUsd(input.amountUsd)} via ${METHODS[input.method].short.toLowerCase()} — simulated, no funds moved.`,
          action: { label: "View transaction", href: `/transactions?txn=${id}` },
          duration: 7000,
        });
      }
      return;
    }
    i++;
    setTimeout(tick, stepMs[i]);
  };

  setTimeout(tick, stepMs[0]);
  return id;
}
