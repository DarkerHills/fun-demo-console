"use client";

import {
  AlertTriangle,
  ArrowLeftRight,
  Building2,
  CheckCircle2,
  Clock,
  CreditCard,
  Loader2,
  TimerOff,
  Wallet,
  XCircle,
} from "lucide-react";
import * as React from "react";
import { ASSETS, EXCHANGES, METHODS, NETWORKS, STATUS_META } from "@/lib/data/catalog";
import type { AssetId, DeliveryStatus, ExchangeId, NetworkId, PaymentMethod, TxnStatus } from "@/lib/data/types";
import { cn } from "@/lib/utils";
import { Badge } from "./badge";

/*
 * Assets are circles, networks are rounded squares — the shape tells you which
 * is which before the label does. Monograms only; no third-party logos.
 */

export function AssetIcon({ asset, size = 18, className }: { asset: AssetId; size?: number; className?: string }) {
  const a = ASSETS[asset];
  return (
    <span
      aria-hidden
      className={cn("inline-grid shrink-0 place-items-center rounded-full font-semibold text-white", className)}
      style={{ width: size, height: size, background: a.color, fontSize: Math.round(size * 0.55), lineHeight: 1 }}
    >
      {a.glyph}
    </span>
  );
}

export function NetworkIcon({ network, size = 16, className }: { network: NetworkId; size?: number; className?: string }) {
  const n = NETWORKS[network];
  return (
    <span
      aria-hidden
      className={cn("inline-grid shrink-0 place-items-center font-semibold text-white", className)}
      style={{
        width: size,
        height: size,
        background: n.color,
        borderRadius: Math.max(3, Math.round(size * 0.28)),
        fontSize: Math.round(size * 0.56),
        lineHeight: 1,
      }}
    >
      {n.glyph}
    </span>
  );
}

export function ExchangeIcon({ exchange, size = 16 }: { exchange: ExchangeId; size?: number }) {
  const e = EXCHANGES[exchange];
  return (
    <span
      aria-hidden
      className="inline-grid shrink-0 place-items-center rounded-xs font-semibold text-white"
      style={{ width: size, height: size, background: e.color, fontSize: Math.round(size * 0.56) }}
    >
      {e.glyph}
    </span>
  );
}

/** Asset with its network badge tucked in the corner. */
export function AssetOnNetwork({ asset, network, size = 28 }: { asset: AssetId; network: NetworkId | null; size?: number }) {
  return (
    <span className="relative inline-flex shrink-0" style={{ width: size, height: size }}>
      <AssetIcon asset={asset} size={size} />
      {network && (
        <span className="absolute -right-1 -bottom-1 rounded-[5px] ring-2 ring-[var(--bg-default)]">
          <NetworkIcon network={network} size={Math.round(size * 0.52)} />
        </span>
      )}
    </span>
  );
}

export function AssetLabel({ asset, className }: { asset: AssetId; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <AssetIcon asset={asset} size={16} />
      <span>{ASSETS[asset].label}</span>
    </span>
  );
}

export function NetworkLabel({ network, className }: { network: NetworkId | null; className?: string }) {
  if (!network) return <span className={cn("text-sub", className)}>—</span>;
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <NetworkIcon network={network} size={16} />
      <span>{NETWORKS[network].label}</span>
    </span>
  );
}

export const METHOD_ICON: Record<PaymentMethod, React.ComponentType<{ className?: string }>> = {
  wallet: Wallet,
  transfer: ArrowLeftRight,
  card: CreditCard,
  exchange: Building2,
};

export function MethodLabel({ method, className }: { method: PaymentMethod; className?: string }) {
  const Icon = METHOD_ICON[method];
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <Icon className="size-4 text-sub" aria-hidden />
      <span>{METHODS[method].short}</span>
    </span>
  );
}

const STATUS_ICON: Record<TxnStatus, React.ReactNode> = {
  completed: <CheckCircle2 aria-hidden />,
  processing: <Loader2 aria-hidden className="animate-[spin_1.6s_linear_infinite]" />,
  pending: <Clock aria-hidden />,
  delayed: <AlertTriangle aria-hidden />,
  failed: <XCircle aria-hidden />,
  expired: <TimerOff aria-hidden />,
};

export function StatusBadge({ status, className }: { status: TxnStatus; className?: string }) {
  const meta = STATUS_META[status];
  return (
    <Badge tone={meta.tone} className={className} title={meta.description}>
      {STATUS_ICON[status]}
      {meta.label}
    </Badge>
  );
}

export function DeliveryBadge({ status, attempts }: { status: DeliveryStatus; attempts?: number }) {
  if (status === "delivered")
    return (
      <Badge tone="success">
        <CheckCircle2 aria-hidden />
        Delivered
      </Badge>
    );
  if (status === "failed")
    return (
      <Badge tone="error">
        <XCircle aria-hidden />
        Failed{attempts && attempts > 1 ? ` · ${attempts} attempts` : ""}
      </Badge>
    );
  return (
    <Badge tone="info">
      <Loader2 aria-hidden className="animate-spin" />
      Sending
    </Badge>
  );
}

export function EnvBadge({ env, className }: { env: "sandbox" | "production"; className?: string }) {
  return env === "sandbox" ? (
    <Badge tone="warning" variant="soft" dot className={className}>
      Sandbox
    </Badge>
  ) : (
    <Badge tone="info" variant="soft" dot className={className}>
      Production
    </Badge>
  );
}

/** Small "Demo data" marker for configurable options and illustrative numbers. */
export function DemoTag({ children = "Demo data", className }: { children?: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "hatch-neutral inline-flex h-5 shrink-0 items-center rounded-xs border border-stroke-mild px-1.5 text-[11px] font-medium text-sub",
        className,
      )}
    >
      {children}
    </span>
  );
}
