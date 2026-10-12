import { METHODS, NETWORKS, STATUS_META } from "./catalog";
import type { Transaction } from "./types";

const esc = (v: string | number | null | undefined) => {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function transactionsToCsv(rows: Transaction[]) {
  const header = [
    "transaction_id",
    "created_at",
    "customer",
    "amount_usd",
    "payment_method",
    "source_asset",
    "source_network",
    "source_amount",
    "destination_asset",
    "destination_network",
    "status",
    "duration_seconds",
    "fees_usd",
    "failure_reason",
    "environment",
    "simulated",
  ];
  const lines = rows.map((t) =>
    [
      t.id,
      new Date(t.createdAt).toISOString(),
      t.customer,
      t.amountUsd.toFixed(2),
      METHODS[t.method].short,
      t.sourceAsset,
      t.sourceNetwork ? NETWORKS[t.sourceNetwork].label : "",
      t.sourceAmount.toFixed(6),
      t.destAsset,
      NETWORKS[t.destNetwork].label,
      STATUS_META[t.status].label,
      t.durationSec ?? "",
      (t.fees.network + t.fees.routing + t.fees.provider).toFixed(2),
      t.failure?.reason ?? "",
      t.env,
      "true",
    ]
      .map(esc)
      .join(","),
  );
  return [header.join(","), ...lines].join("\n");
}

export function downloadFile(filename: string, content: string, type = "text/csv;charset=utf-8") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
