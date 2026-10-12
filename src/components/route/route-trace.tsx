"use client";

import { Check, ChevronDown, X } from "lucide-react";
import * as React from "react";
import { ASSETS, NETWORKS } from "@/lib/data/catalog";
import type { AssetId, NetworkId, RouteStep } from "@/lib/data/types";
import { formatAssetAmount, formatDuration, formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { AssetOnNetwork, NetworkIcon } from "@/components/ui/domain";

/*
 * The route trace: money drawn as a line travelling from the customer's
 * source to Nova's treasury. Traveled segments are solid primary; an active
 * segment carries a moving packet; untraveled segments stay hairline grey.
 */

export interface Endpoint {
  asset: AssetId;
  network: NetworkId | null;
  amount: number;
  caption: string;
}

type SegState = "traveled" | "active" | "idle" | "failed";

function segmentState(steps: RouteStep[], i: number): SegState {
  const s = steps[i];
  if (s.status === "done") return "traveled";
  if (s.status === "active") return "active";
  if (s.status === "failed") return "failed";
  return "idle";
}

function Segment({ state, vertical }: { state: SegState; vertical?: boolean }) {
  return (
    <span
      aria-hidden
      className={cn("relative block", vertical ? "w-0.5 flex-1" : "h-0.5 w-full min-w-6 flex-1 rounded-full")}
      style={{
        background:
          state === "traveled"
            ? "var(--primary-base)"
            : state === "failed"
              ? "var(--error-base)"
              : state === "active"
                ? "linear-gradient(90deg, var(--primary-base), var(--primary-faint))"
                : "var(--stroke-mild)",
      }}
    >
      {state === "active" && (
        <span
          className={cn(
            "absolute size-2 rounded-full bg-primary-base shadow-[0_0_0_3px_var(--primary-mute)]",
            vertical ? "left-1/2 -translate-x-1/2 animate-[packet-y_1.4s_cubic-bezier(0.45,0,0.55,1)_infinite]" : "top-1/2 -translate-y-1/2 animate-packet",
          )}
        />
      )}
    </span>
  );
}

function Node({ step, size = 20 }: { step: RouteStep; size?: number }) {
  const base = "relative z-[1] grid shrink-0 place-items-center rounded-full";
  const style = { width: size, height: size };
  if (step.status === "done")
    return (
      <span className={cn(base, "bg-primary-base text-white")} style={style}>
        <Check className="size-3" strokeWidth={3} aria-hidden />
      </span>
    );
  if (step.status === "failed")
    return (
      <span className={cn(base, "bg-error-base text-white")} style={style}>
        <X className="size-3" strokeWidth={3} aria-hidden />
      </span>
    );
  if (step.status === "active")
    return (
      <span className={cn(base, "animate-pulse-ring border-2 border-primary-base bg-default")} style={style}>
        <span className="size-1.5 rounded-full bg-primary-base" />
      </span>
    );
  return (
    <span
      className={cn(base, "border-2 bg-default", step.status === "skipped" ? "border-dashed border-stroke-mild" : "border-stroke-strong")}
      style={style}
    />
  );
}

function EndpointCard({ end, align, state }: { end: Endpoint; align: "start" | "end"; state?: "done" | "failed" | "idle" }) {
  return (
    <div className={cn("flex shrink-0 flex-col gap-2", align === "end" ? "items-end text-right" : "items-start")}>
      <span
        className={cn(
          "grid size-12 place-items-center rounded-md border bg-default shadow-xs",
          state === "done" ? "border-primary-faint" : state === "failed" ? "border-error-faint" : "border-stroke-mild",
        )}
      >
        <AssetOnNetwork asset={end.asset} network={end.network} size={26} />
      </span>
      <div>
        <p className="text-xs text-sub">{end.caption}</p>
        <p className="font-mono text-[13px] text-strong">{formatAssetAmount(end.amount, ASSETS[end.asset].label)}</p>
        <p className="text-xs text-sub">{end.network ? NETWORKS[end.network].label : "Card"}</p>
      </div>
    </div>
  );
}

/** Horizontal trace for the Payment routes page and checkout. */
export function RouteTrace({
  steps,
  source,
  destination,
  selectedId,
  onSelect,
  compact,
  className,
}: {
  steps: RouteStep[];
  source: Endpoint;
  destination: Endpoint;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  compact?: boolean;
  className?: string;
}) {
  const finished = steps.every((s) => s.status === "done");
  const failed = steps.some((s) => s.status === "failed");
  const lastState: SegState = finished ? "traveled" : failed ? "idle" : "idle";

  if (compact) {
    return (
      <div className={cn("flex items-center gap-1.5", className)} aria-label="Route progress">
        <AssetOnNetwork asset={source.asset} network={source.network} size={22} />
        {steps.map((s, i) => (
          <React.Fragment key={s.id}>
            <Segment state={segmentState(steps, i)} />
            <span title={s.label}>
              <Node step={s} size={16} />
            </span>
          </React.Fragment>
        ))}
        <Segment state={lastState} />
        <AssetOnNetwork asset={destination.asset} network={destination.network} size={22} />
      </div>
    );
  }

  return (
    <div className={cn("scrollbar-thin overflow-x-auto", className)}>
      <div className="flex min-w-[560px] items-start gap-0 px-1 pt-1 pb-2">
        <EndpointCard end={source} align="start" state={steps[0]?.status === "failed" ? "failed" : steps[0]?.status === "done" ? "done" : "idle"} />
        {steps.map((s, i) => {
          const selected = selectedId === s.id;
          return (
            <React.Fragment key={s.id}>
              <div className="flex min-w-6 flex-1 pt-[23px]">
                <Segment state={segmentState(steps, i)} />
              </div>
              <button
                type="button"
                onClick={onSelect ? () => onSelect(s.id) : undefined}
                disabled={!onSelect}
                aria-pressed={onSelect ? selected : undefined}
                className={cn(
                  "group flex w-[104px] shrink-0 flex-col items-center gap-2 rounded-sm px-1 pt-3.5 pb-1 text-center disabled:cursor-default",
                  onSelect && "hover:bg-surface",
                  selected && "bg-primary-mute hover:bg-primary-mute",
                )}
              >
                <Node step={s} />
                <span className="text-xs leading-4 font-medium text-strong">{s.label}</span>
                <span className="flex items-center gap-1 text-[11px] text-sub">
                  {s.network && <NetworkIcon network={s.network} size={12} />}
                  <span className="font-mono">
                    {s.status === "pending" || s.status === "skipped" ? "~" : ""}
                    {formatDuration(s.durationSec)}
                  </span>
                </span>
              </button>
            </React.Fragment>
          );
        })}
        <div className="flex min-w-6 flex-1 pt-[23px]">
          <Segment state={lastState} />
        </div>
        <EndpointCard end={destination} align="end" state={finished ? "done" : "idle"} />
      </div>
    </div>
  );
}

/** Vertical lifecycle timeline for the transaction drawer. */
export function RouteTimeline({
  steps,
  createdAt,
  failureReason,
}: {
  steps: RouteStep[];
  createdAt: number;
  failureReason?: string | null;
}) {
  const [open, setOpen] = React.useState<string | null>(null);
  const created: RouteStep = {
    id: "created",
    kind: "authorize",
    label: "Payment created",
    detail: "Checkout session opened and quote accepted",
    network: null,
    durationSec: 0,
    feeUsd: 0,
    status: "done",
    at: createdAt,
    meta: [],
  };
  const items = [created, ...steps];

  return (
    <ol className="relative">
      {items.map((s, i) => {
        const last = i === items.length - 1;
        const next = items[i + 1];
        const expanded = open === s.id;
        const hasMeta = s.meta.length > 0;
        return (
          <li key={s.id} className="relative flex gap-3">
            <div className="flex w-5 shrink-0 flex-col items-center">
              <Node step={s} />
              {!last && <Segment vertical state={next ? segmentState([next], 0) : "idle"} />}
            </div>
            <div className={cn("min-w-0 flex-1", !last && "pb-4")}>
              <div className="flex items-start justify-between gap-3">
                <button
                  type="button"
                  disabled={!hasMeta}
                  onClick={() => setOpen(expanded ? null : s.id)}
                  aria-expanded={hasMeta ? expanded : undefined}
                  className="group -mx-1 flex min-w-0 items-center gap-1 rounded-xs px-1 text-left disabled:cursor-default"
                >
                  <span
                    className={cn(
                      "text-sm font-medium",
                      s.status === "pending" || s.status === "skipped" ? "text-sub" : s.status === "failed" ? "text-error-dark" : "text-strong",
                    )}
                  >
                    {s.label}
                  </span>
                  {hasMeta && (
                    <ChevronDown className={cn("size-3.5 text-soft transition-transform group-hover:text-sub", expanded && "rotate-180")} aria-hidden />
                  )}
                </button>
                <span className="shrink-0 font-mono text-xs text-sub">
                  {s.at && s.status !== "pending" && s.status !== "skipped" ? formatTime(s.at) : s.status === "skipped" ? "Skipped" : `~${formatDuration(s.durationSec)}`}
                  {s.status === "done" && i > 0 && <span className="text-soft"> · {formatDuration(s.durationSec)}</span>}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-sub">{s.status === "active" ? `In progress — ${s.detail.charAt(0).toLowerCase()}${s.detail.slice(1)}` : s.detail}</p>
              {s.status === "failed" && failureReason && (
                <p className="mt-1.5 rounded-xs bg-error-mute px-2 py-1 text-xs text-error-dark">{failureReason}</p>
              )}
              {expanded && hasMeta && (
                <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 rounded-sm border border-stroke-soft bg-surface px-3 py-2 text-xs">
                  {s.meta.map((m) => (
                    <React.Fragment key={m.label}>
                      <dt className="text-sub">{m.label}</dt>
                      <dd className="font-mono text-strong">{m.value}</dd>
                    </React.Fragment>
                  ))}
                  {s.feeUsd > 0 && (
                    <>
                      <dt className="text-sub">Step fee</dt>
                      <dd className="font-mono text-strong">${s.feeUsd.toFixed(2)}</dd>
                    </>
                  )}
                </dl>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
