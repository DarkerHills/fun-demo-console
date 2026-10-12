import type { DeliveryAttempt, Transaction, WebhookEvent, WebhookEventType } from "./types";

/** Illustrative event payload — shape is a prototype assumption, not Fun's documented schema. */
export function buildPayload(
  txn: Transaction,
  type: WebhookEventType,
  eventId: string,
  createdAt: number,
): Record<string, unknown> {
  const status =
    type === "payment.created"
      ? "pending"
      : type === "payment.processing"
        ? "processing"
        : type === "payment.completed"
          ? "completed"
          : txn.status === "expired"
            ? "expired"
            : "failed";

  return {
    id: eventId,
    object: "event",
    type,
    created: Math.floor(createdAt / 1000),
    livemode: txn.env === "production",
    data: {
      object: {
        id: txn.id,
        object: "payment",
        status,
        amount: txn.amountUsd.toFixed(2),
        currency: "usd",
        customer: { id: txn.customerId, email: txn.customer },
        source: {
          method: txn.method,
          asset: txn.sourceAsset,
          network: txn.sourceNetwork,
          amount: txn.sourceAmount.toFixed(txn.sourceAsset === "ETH" || txn.sourceAsset === "WBTC" || txn.sourceAsset === "SOL" ? 6 : 2),
          ...(txn.exchange ? { exchange: txn.exchange } : {}),
        },
        destination: {
          asset: txn.destAsset,
          network: txn.destNetwork,
          amount: txn.destAmount.toFixed(2),
          address: txn.destAddress,
        },
        fees: {
          network: txn.fees.network.toFixed(2),
          routing: txn.fees.routing.toFixed(2),
          provider: txn.fees.provider.toFixed(2),
        },
        route: txn.steps.map((s) => s.kind),
        tx_hash: type === "payment.completed" ? txn.txHash : null,
        ...(type === "payment.failed" && txn.failure
          ? { failure: { code: txn.failure.code, message: txn.failure.reason } }
          : {}),
        metadata: { checkout: txn.checkoutName, simulated: true },
      },
    },
  };
}

export function okAttempt(at: number, durationMs: number): DeliveryAttempt {
  return { at, statusCode: 200, durationMs, responseBody: '{"received": true}' };
}

export function failedAttempt(at: number, kind: "500" | "timeout" | "502"): DeliveryAttempt {
  if (kind === "timeout") {
    return { at, statusCode: null, durationMs: 10_000, responseBody: "Request timed out after 10s" };
  }
  if (kind === "502") {
    return { at, statusCode: 502, durationMs: 1840, responseBody: "<html><body><h1>502 Bad Gateway</h1></body></html>" };
  }
  return {
    at,
    statusCode: 500,
    durationMs: 612,
    responseBody: '{"error": "internal_error", "message": "ledger write failed"}',
  };
}

export function eventsFor(txn: Transaction): WebhookEventType[] {
  const types: WebhookEventType[] = ["payment.created"];
  const startedMoving = txn.steps.some((s) => s.status === "done" || s.status === "active") && txn.status !== "pending";
  const failedAtEntry = txn.status === "failed" && txn.steps[0]?.status === "failed";
  if (startedMoving && !failedAtEntry && txn.status !== "expired") types.push("payment.processing");
  if (txn.status === "completed") types.push("payment.completed");
  if (txn.status === "failed" || txn.status === "expired") types.push("payment.failed");
  return types;
}

export function isRetryable(e: WebhookEvent) {
  return e.deliveryStatus !== "pending";
}
