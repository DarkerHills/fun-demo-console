"use client";

import { useRouter } from "next/navigation";
import { ArrowRight, Webhook } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import type { CheckoutConfig } from "@/lib/data/types";
import { useDemo } from "@/lib/store/demo-store";
import { Dialog, DialogContent } from "@/components/ui/overlays";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/domain";
import { CheckoutWidget } from "./checkout-widget";
import { SimulationPanel, useSimControls } from "./simulation-panel";
import type { SimControls } from "./checkout-widget";

/** Global "test checkout" modal — customer view on the left, merchant/presenter context on the right. */
export function CheckoutPreviewDialog() {
  const preview = useDemo((s) => s.preview);
  const saved = useDemo((s) => s.checkout);
  const closePreview = useDemo((s) => s.closePreview);
  const config = preview.config ?? saved;
  // Kept outside the content so presenter choices survive between runs.
  const [controls, setControls] = useSimControls();

  return (
    <Dialog open={preview.open} onOpenChange={(o) => !o && closePreview()}>
      <DialogContent
        size="xl"
        title="Test checkout"
        description={`${preview.config ? "Previewing your unsaved configuration." : `Uses the saved “${config.name}” configuration.`} Test payments are simulated and recorded in Sandbox — no funds move.`}
      >
        <PreviewBody config={config} controls={controls} setControls={setControls} />
      </DialogContent>
    </Dialog>
  );
}

/** Mounted only while the dialog is open, so each opening starts a fresh checkout. */
function PreviewBody({
  config,
  controls,
  setControls,
}: {
  config: CheckoutConfig;
  controls: SimControls;
  setControls: (c: SimControls) => void;
}) {
  const closePreview = useDemo((s) => s.closePreview);
  const env = useDemo((s) => s.env);
  const setEnv = useDemo((s) => s.setEnv);
  const router = useRouter();
  const [runId, setRunId] = React.useState<string | null>(null);
  const run = useDemo((s) => (runId ? s.createdTxns.find((t) => t.id === runId) ?? null : null));

  const toSandbox = () => {
    if (env !== "sandbox") setEnv("sandbox");
    closePreview();
  };

  const openTxn = (id: string) => {
    toSandbox();
    router.push(`/transactions?txn=${id}`);
  };

  return (
    <div className="grid gap-0 md:grid-cols-[1fr_340px]">
      <div className="hatch-neutral flex min-h-[560px] items-start justify-center px-4 py-8 sm:px-8">
        <CheckoutWidget config={config} controls={controls} onResult={setRunId} onViewTransaction={openTxn} />
      </div>
      <div className="space-y-4 border-t border-stroke-soft p-5 md:border-t-0 md:border-l">
        <SimulationPanel config={config} value={controls} onChange={setControls} />
        <div className="rounded-md border border-stroke-soft p-4">
          <p className="text-sm font-medium text-strong">What happens in the console</p>
          {run ? (
            <div className="mt-3 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-[13px] text-strong">{run.id}</span>
                <StatusBadge status={run.status} />
              </div>
              <p className="text-xs text-sub">
                The payment is live in Transactions and its events are flowing to Webhooks — open either now or after it finishes.
              </p>
              <div className="flex flex-col gap-2">
                <Button variant="secondary" size="sm" onClick={() => openTxn(run.id)} className="justify-between">
                  Open in Transactions <ArrowRight />
                </Button>
                <Button variant="secondary" size="sm" asChild className="justify-between">
                  <Link href={`/webhooks?payment=${run.id}`} onClick={toSandbox}>
                    <span className="inline-flex items-center gap-1.5">
                      <Webhook /> View webhook events
                    </span>
                    <ArrowRight />
                  </Link>
                </Button>
              </div>
            </div>
          ) : (
            <ol className="mt-2 list-decimal space-y-1 pl-4 text-xs text-sub">
              <li>A payment record appears in Transactions as soon as you confirm.</li>
              <li>Its route updates step by step, live.</li>
              <li>payment.created → processing → completed/failed events are sent to Webhooks.</li>
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}
