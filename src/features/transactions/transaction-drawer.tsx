"use client";

import Link from "next/link";
import { ArrowRight, Braces, MoreHorizontal, Route as RouteIcon, SearchX, Webhook, X } from "lucide-react";
import * as React from "react";
import { EXCHANGES, METHODS, NETWORKS, STATUS_META } from "@/lib/data/catalog";
import { ROUTE_OPTIONS } from "@/lib/data/route-plan";
import type { Transaction } from "@/lib/data/types";
import { formatAssetAmount, formatDuration, formatFull, formatRelative, formatUsd } from "@/lib/format";
import { useEvents, useNow, useTransaction } from "@/lib/hooks/use-data";
import { useCopy } from "@/lib/hooks/use-copy";
import { useUrlState } from "@/lib/hooks/use-url-state";
import { useDemo } from "@/lib/store/demo-store";
import { shortAddress } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { MonoValue } from "@/components/ui/code";
import { Callout, EmptyState } from "@/components/ui/feedback";
import { AssetOnNetwork, DeliveryBadge, DemoTag, EnvBadge, MethodLabel, StatusBadge } from "@/components/ui/domain";
import { Menu, MenuContent, MenuItem, MenuTrigger, Sheet, SheetClose } from "@/components/ui/overlays";
import { RouteTimeline } from "@/components/route/route-trace";

function Section({ title, aside, children }: { title: string; aside?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="border-t border-stroke-soft px-5 py-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-xs font-medium tracking-[0.04em] text-sub uppercase">{title}</h3>
        {aside}
      </div>
      {children}
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-7 items-center justify-between gap-4 text-sm">
      <dt className="shrink-0 text-sub">{label}</dt>
      <dd className="min-w-0 text-right text-strong">{children}</dd>
    </div>
  );
}

function StatusCallout({ txn, now }: { txn: Transaction; now: number }) {
  if (txn.status === "failed" || txn.status === "expired") {
    return (
      <Callout tone="error" title={txn.failure?.reason ?? "Payment failed"}>
        <p>{txn.failure?.suggestion}</p>
        {txn.failure && (
          <p className="mt-1.5 font-mono text-xs opacity-80">
            code: {txn.failure.code} · step: {txn.failure.stepKind}
          </p>
        )}
      </Callout>
    );
  }
  if (txn.status === "delayed") {
    const active = txn.steps.find((s) => s.status === "active");
    const over = Math.max(0, (now - txn.createdAt) / 1000 - txn.estimatedSec);
    return (
      <Callout tone="warning" title={`Running ${formatDuration(over)} over the ${formatDuration(txn.estimatedSec)} estimate`}>
        {active ? `${active.label} is slower than usual.` : "A route step is slower than usual."} Funds are safe in transit — no
        action needed unless it passes 30 minutes.
      </Callout>
    );
  }
  if (txn.status === "pending") {
    return (
      <Callout tone="info" title="Waiting on the customer">
        {txn.method === "transfer" ? "No deposit detected yet. The deposit address stays open for 30 minutes." : "The customer hasn't confirmed the payment yet."}
      </Callout>
    );
  }
  if (txn.status === "processing") {
    const active = txn.steps.find((s) => s.status === "active");
    return (
      <Callout tone="info" title="Funds are moving">
        {active ? `Currently: ${active.label.toLowerCase()}.` : "In transit."} Estimated total {formatDuration(txn.estimatedSec)}.
      </Callout>
    );
  }
  return null;
}

function DrawerBody({ txn, onClose }: { txn: Transaction; onClose: () => void }) {
  const now = useNow(5_000);
  const events = useEvents();
  const txnEvents = React.useMemo(() => events.filter((e) => e.txnId === txn.id).sort((a, b) => a.createdAt - b.createdAt), [events, txn.id]);
  const { copy } = useCopy();
  const totalFee = txn.fees.network + txn.fees.routing + txn.fees.provider;
  const inFlight = txn.status === "pending" || txn.status === "processing" || txn.status === "delayed";

  return (
    <>
      <div className="border-b border-stroke-soft px-5 pt-4 pb-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <StatusBadge status={txn.status} />
            <EnvBadge env={txn.env} />
            {txn.origin === "demo" && <DemoTag>Created from test checkout</DemoTag>}
          </div>
          <div className="flex items-center gap-0.5">
            <Menu>
              <MenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="More actions">
                  <MoreHorizontal />
                </Button>
              </MenuTrigger>
              <MenuContent>
                <MenuItem onSelect={() => copy(txn.id, "Transaction ID")}>Copy transaction ID</MenuItem>
                <MenuItem onSelect={() => copy(JSON.stringify(txn, null, 2), "Transaction JSON")}>
                  <Braces /> Copy as JSON
                </MenuItem>
                <MenuItem asChild>
                  <Link href={`/routes?payment=${txn.id}`}>
                    <RouteIcon /> Inspect route
                  </Link>
                </MenuItem>
                <MenuItem asChild>
                  <Link href={`/webhooks?payment=${txn.id}`}>
                    <Webhook /> View webhook events
                  </Link>
                </MenuItem>
              </MenuContent>
            </Menu>
            <SheetClose asChild>
              <Button variant="ghost" size="icon" aria-label="Close details" onClick={onClose}>
                <X />
              </Button>
            </SheetClose>
          </div>
        </div>
        <p className="mt-4 text-[32px] leading-10 font-medium tracking-[-0.01em] text-strong">
          {formatUsd(txn.amountUsd)}
          <span className="ml-1.5 text-base font-normal text-sub">USD</span>
        </p>
        <p className="mt-1 text-sm text-sub">
          {txn.customer} · {formatFull(txn.createdAt)}
        </p>
        <div className="mt-2 -ml-0.5">
          <MonoValue value={txn.id} copyLabel="Transaction ID" />
        </div>
      </div>

      <div className="scrollbar-thin flex-1 overflow-y-auto">
        {(txn.status !== "completed") && (
          <div className="px-5 pt-4 pb-1">
            <StatusCallout txn={txn} now={now} />
          </div>
        )}

        <Section title="Money flow">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-md border border-stroke-soft bg-surface p-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <AssetOnNetwork asset={txn.sourceAsset} network={txn.sourceNetwork} size={28} />
              <div className="min-w-0">
                <p className="text-xs text-sub">Customer paid</p>
                <p className="truncate font-mono text-[13px] text-strong">{formatAssetAmount(txn.sourceAmount, txn.sourceAsset)}</p>
                <p className="text-xs text-sub">{txn.sourceNetwork ? NETWORKS[txn.sourceNetwork].label : `Card •••• ${txn.cardLast4}`}</p>
              </div>
            </div>
            <ArrowRight className="size-4 text-soft" aria-hidden />
            <div className="flex min-w-0 items-center gap-2.5">
              <AssetOnNetwork asset={txn.destAsset} network={txn.destNetwork} size={28} />
              <div className="min-w-0">
                <p className="text-xs text-sub">{txn.status === "completed" ? "Delivered" : "To deliver"}</p>
                <p className="truncate font-mono text-[13px] text-strong">{formatAssetAmount(txn.destAmount, txn.destAsset)}</p>
                <p className="text-xs text-sub">{NETWORKS[txn.destNetwork].label}</p>
              </div>
            </div>
          </div>
          <dl className="mt-3">
            <Row label="Payment method">
              <span className="inline-flex items-center gap-1.5">
                <MethodLabel method={txn.method} />
                {txn.exchange && <span className="text-sub">· {EXCHANGES[txn.exchange].label}</span>}
              </span>
            </Row>
            <Row label="Route">{ROUTE_OPTIONS[txn.routeOption].label}</Row>
            <Row label={txn.status === "completed" ? "Completed in" : "Estimated time"}>
              <span className="font-mono text-[13px]">
                {txn.status === "completed" ? formatDuration(txn.durationSec) : `~${formatDuration(txn.estimatedSec)}`}
              </span>
              {txn.status === "completed" && txn.durationSec != null && (
                <span className="ml-1.5 text-xs text-sub">est. {formatDuration(txn.estimatedSec)}</span>
              )}
            </Row>
          </dl>
        </Section>

        <Section title="Status timeline" aside={<span className="text-xs text-sub">{STATUS_META[txn.status].description}</span>}>
          <RouteTimeline steps={txn.steps} createdAt={txn.createdAt} failureReason={txn.failure?.reason} />
        </Section>

        <Section title={inFlight ? "Estimated fees" : "Fees"} aside={<DemoTag>Illustrative</DemoTag>}>
          <dl>
            <Row label="Network (gas)">
              <span className="font-mono text-[13px]">{formatUsd(txn.fees.network)}</span>
            </Row>
            <Row label="Swap & bridge">
              <span className="font-mono text-[13px]">{formatUsd(txn.fees.routing)}</span>
            </Row>
            <Row label={txn.method === "card" ? "Card provider" : txn.method === "exchange" ? "Exchange withdrawal" : "Provider"}>
              <span className="font-mono text-[13px]">{formatUsd(txn.fees.provider)}</span>
            </Row>
            <div className="my-1.5 border-t border-stroke-soft" />
            <Row label="Total paid by customer">
              <span className="font-mono text-[13px] font-medium">{formatUsd(totalFee)}</span>
            </Row>
            {txn.slippageBps > 0 && (
              <Row label="Max slippage">
                <span className="font-mono text-[13px]">{(txn.slippageBps / 100).toFixed(2)}%</span>
              </Row>
            )}
          </dl>
        </Section>

        <Section title="Details">
          <dl>
            <Row label="Customer ID">
              <MonoValue value={txn.customerId} copyLabel="Customer ID" />
            </Row>
            <Row label="Source tx hash">
              {txn.sourceHash ? (
                <MonoValue value={txn.sourceHash} display={shortAddress(txn.sourceHash, 8, 6)} copyLabel="Source hash" />
              ) : (
                <span className="text-sub">{txn.method === "card" ? "Card payment" : "Not broadcast"}</span>
              )}
            </Row>
            <Row label="Delivery tx hash">
              {txn.txHash ? (
                <MonoValue value={txn.txHash} display={shortAddress(txn.txHash, 8, 6)} copyLabel="Delivery hash" />
              ) : (
                <span className="text-sub">{inFlight ? "Pending" : "—"}</span>
              )}
            </Row>
            <Row label="Destination">
              <MonoValue value={txn.destAddress} display={shortAddress(txn.destAddress)} copyLabel="Address" />
            </Row>
            <Row label="Checkout">{txn.checkoutName}</Row>
            <Row label="Last updated">
              <span title={formatFull(txn.updatedAt)}>{formatRelative(txn.updatedAt, now)}</span>
            </Row>
          </dl>
          <p className="mt-2 text-xs text-sub">Hashes are randomly generated for the demo and don&apos;t exist on any chain.</p>
        </Section>

        <Section
          title="Webhook events"
          aside={
            <Link href={`/webhooks?payment=${txn.id}`} className="text-xs font-medium text-primary-base hover:underline">
              Open in Webhooks
            </Link>
          }
        >
          {txnEvents.length ? (
            <ul className="divide-y divide-stroke-soft rounded-md border border-stroke-soft">
              {txnEvents.map((e) => (
                <li key={e.id}>
                  <Link
                    href={`/webhooks?event=${e.id}`}
                    className="flex items-center justify-between gap-3 px-3 py-2 text-sm hover:bg-surface"
                  >
                    <span className="font-mono text-[13px] text-strong">{e.type}</span>
                    <span className="flex items-center gap-2">
                      <span className="hidden text-xs text-sub sm:inline">{formatRelative(e.createdAt, now)}</span>
                      <DeliveryBadge status={e.deliveryStatus} attempts={e.attempts.length} />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-sub">No events in the retention window for this payment.</p>
          )}
        </Section>
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-stroke-soft px-5 py-3">
        <p className="text-xs text-sub">{METHODS[txn.method].description}</p>
        <Button asChild size="sm" variant="secondary">
          <Link href={`/routes?payment=${txn.id}`}>
            <RouteIcon /> Inspect route
          </Link>
        </Button>
      </div>
    </>
  );
}

/** Global drawer: any page can open it by setting ?txn=<id>; closing keeps every other URL param. */
export function TransactionDrawer() {
  const { searchParams, setParam } = useUrlState();
  const id = searchParams.get("txn");
  const txn = useTransaction(id);
  const env = useDemo((s) => s.env);
  const markGuide = useDemo((s) => s.markGuide);
  const close = React.useCallback(() => setParam("txn", null), [setParam]);

  React.useEffect(() => {
    if (txn?.origin === "demo") markGuide({ openedDemoTxn: true });
  }, [txn?.origin, markGuide]);

  return (
    <Sheet open={!!id} onOpenChange={(o) => !o && close()} title={txn ? `Payment ${txn.id}` : "Payment details"}>
      {txn ? (
        <DrawerBody txn={txn} onClose={close} />
      ) : (
        <div className="flex flex-1 flex-col">
          <div className="flex justify-end p-3">
            <Button variant="ghost" size="icon" aria-label="Close details" onClick={close}>
              <X />
            </Button>
          </div>
          <EmptyState
            icon={<SearchX />}
            title={`No payment ${id ?? ""} in ${env === "sandbox" ? "Sandbox" : "Production"}`}
            description="It may belong to the other environment, or the demo data was reset."
            action={<Button onClick={close}>Close</Button>}
          />
        </div>
      )}
    </Sheet>
  );
}
