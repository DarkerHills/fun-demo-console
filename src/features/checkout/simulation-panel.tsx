"use client";

import { FlaskConical } from "lucide-react";
import * as React from "react";
import { CUSTOMERS, FAILURES, FAILURES_BY_METHOD, METHOD_ORDER, type FailureKey } from "@/lib/data/catalog";
import type { CheckoutConfig } from "@/lib/data/types";
import { cn } from "@/lib/utils";
import { Segmented, Select } from "@/components/ui/controls";
import { Input } from "@/components/ui/field";
import type { SimControls } from "./checkout-widget";

export function useSimControls(): [SimControls, React.Dispatch<React.SetStateAction<SimControls>>] {
  return React.useState<SimControls>(() => ({
    outcome: "success",
    failureKey: "slippage",
    speed: "fast",
    customer: CUSTOMERS[Math.floor(Math.random() * CUSTOMERS.length)],
  }));
}

/** Presenter-only controls that decide how the simulated payment ends. Never shown to customers. */
export function SimulationPanel({
  config,
  value,
  onChange,
  className,
  compact,
}: {
  config: CheckoutConfig;
  value: SimControls;
  onChange: (v: SimControls) => void;
  className?: string;
  compact?: boolean;
}) {
  const reasons = React.useMemo(() => {
    const keys = new Set<FailureKey>();
    METHOD_ORDER.filter((m) => config.sources[m]).forEach((m) => FAILURES_BY_METHOD[m].forEach((k) => keys.add(k)));
    return [...keys];
  }, [config.sources]);
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.customer);

  return (
    <div className={cn("hatch-neutral rounded-md border border-stroke-mild p-4", className)}>
      <div className="flex items-center gap-2">
        <FlaskConical className="size-4 text-sub" aria-hidden />
        <p className="text-sm font-medium text-strong">Simulation controls</p>
      </div>
      <p className="mt-0.5 text-xs text-sub">Presenter-only. Decides how the next test payment ends.</p>
      <div className={cn("mt-3 grid gap-3", compact ? "sm:grid-cols-2" : "")}>
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-sub" id="sim-outcome">
            Outcome
          </p>
          <Segmented
            aria-label="Payment outcome"
            value={value.outcome}
            onValueChange={(outcome) => onChange({ ...value, outcome })}
            options={[
              { value: "success", label: "Succeeds" },
              { value: "failure", label: "Fails" },
            ]}
          />
        </div>
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-sub">Speed</p>
          <Segmented
            aria-label="Simulation speed"
            value={value.speed}
            onValueChange={(speed) => onChange({ ...value, speed })}
            options={[
              { value: "fast", label: "Fast (~5s)", title: "Compress the route into about five seconds" },
              { value: "realtime", label: "Route time", title: "Use the route's estimated step times (capped at 60s)" },
            ]}
          />
        </div>
        {value.outcome === "failure" && (
          <div className={cn("space-y-1.5", compact && "sm:col-span-2")}>
            <label htmlFor="sim-reason" className="text-xs font-medium text-sub">
              Failure reason
            </label>
            <Select
              id="sim-reason"
              size="sm"
              value={value.failureKey}
              onValueChange={(v) => onChange({ ...value, failureKey: v as FailureKey })}
              options={reasons.map((k) => ({ value: k, label: FAILURES[k].reason }))}
            />
            <p className="text-xs text-sub">If the reason doesn&apos;t apply to the chosen route, it fails at the first step instead.</p>
          </div>
        )}
        <div className={cn("space-y-1.5", compact && "sm:col-span-2")}>
          <label htmlFor="sim-customer" className="text-xs font-medium text-sub">
            Customer email
          </label>
          <Input
            id="sim-customer"
            className="h-8"
            value={value.customer}
            aria-invalid={!emailValid || undefined}
            onChange={(e) => onChange({ ...value, customer: e.target.value })}
          />
          {!emailValid && <p className="text-xs text-error-base">Enter a valid email so the payment can be attributed.</p>}
        </div>
      </div>
    </div>
  );
}
