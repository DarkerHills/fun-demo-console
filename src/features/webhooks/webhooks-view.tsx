"use client";

import { ChevronDown, Eye, EyeOff, ExternalLink, Play, RotateCcw, Search, Webhook, X } from "lucide-react";
import * as React from "react";
import { EVENT_TYPES, WEBHOOK_ENDPOINT } from "@/lib/data/catalog";
import type { DeliveryStatus, WebhookEvent, WebhookEventType } from "@/lib/data/types";
import { failedAttempt, okAttempt } from "@/lib/data/webhooks";
import { formatFull, formatRelative, formatTime } from "@/lib/format";
import { useEvents, useNow, useTransactions, useViewState } from "@/lib/hooks/use-data";
import { useUrlState } from "@/lib/hooks/use-url-state";
import { useDemo } from "@/lib/store/demo-store";
import { toast } from "@/lib/store/toast-store";
import { cn, maskSecret } from "@/lib/utils";
import { Badge, Tag } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { CodeBlock, CopyButton, MonoValue } from "@/components/ui/code";
import { Segmented } from "@/components/ui/controls";
import { FacetFilter, PageHeader } from "@/components/ui/data";
import { DeliveryBadge, DemoTag } from "@/components/ui/domain";
import { EmptyState, ErrorState } from "@/components/ui/feedback";
import { Input } from "@/components/ui/field";
import { PageSkeleton } from "@/components/shell/shell-skeleton";

const SIGNING_SECRET = "whsec_demo_4Fq9xT2mLwP8vZcR1nYb7KdE";
const PAGE = 30;

function typeTone(t: WebhookEventType) {
  return t === "payment.completed" ? "bg-success-base" : t === "payment.failed" ? "bg-error-base" : t === "payment.processing" ? "bg-info-base" : "bg-muted";
}

function EndpointCard({ events, now }: { events: WebhookEvent[]; now: number }) {
  const [reveal, setReveal] = React.useState(false);
  const failing = useDemo((s) => s.integrationPreview === "error");
  const stats = React.useMemo(() => {
    const day = now - 86_400_000;
    const recent = events.filter((e) => e.createdAt >= day && e.deliveryStatus !== "pending");
    const ok = recent.filter((e) => e.deliveryStatus === "delivered").length;
    const lat = recent.flatMap((e) => e.attempts.filter((a) => a.statusCode === 200).map((a) => a.durationMs));
    return {
      rate: recent.length ? ok / recent.length : null,
      latency: lat.length ? Math.round(lat.reduce((a, b) => a + b, 0) / lat.length) : null,
      failed: events.filter((e) => e.deliveryStatus === "failed").length,
    };
  }, [events, now]);
  const healthy = !failing && (stats.rate == null || stats.rate > 0.9);

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-4 px-5 py-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Webhook className="size-4 text-sub" aria-hidden />
            <span className="truncate font-mono text-[13px] text-strong">{WEBHOOK_ENDPOINT}</span>
            <CopyButton value={WEBHOOK_ENDPOINT} label="Copy endpoint URL" toastLabel="Endpoint URL" />
            {healthy ? (
              <Badge tone="success" dot>
                Healthy
              </Badge>
            ) : (
              <Badge tone="error" dot>
                Failing
              </Badge>
            )}
            <DemoTag>Simulated endpoint</DemoTag>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {EVENT_TYPES.map((t) => (
              <Tag key={t} className="font-mono">
                {t}
              </Tag>
            ))}
          </div>
        </div>
        <dl className="flex gap-6 text-right">
          <div>
            <dt className="text-xs text-sub">Delivered, 24h</dt>
            <dd className="tabular text-sm font-medium text-strong">{stats.rate == null ? "—" : `${(stats.rate * 100).toFixed(1)}%`}</dd>
          </div>
          <div>
            <dt className="text-xs text-sub">Avg latency</dt>
            <dd className="tabular text-sm font-medium text-strong">{stats.latency == null ? "—" : `${stats.latency} ms`}</dd>
          </div>
          <div>
            <dt className="text-xs text-sub">Failing now</dt>
            <dd className={cn("tabular text-sm font-medium", stats.failed ? "text-error-dark" : "text-strong")}>{stats.failed}</dd>
          </div>
        </dl>
      </div>
      <div className="flex flex-wrap items-center gap-3 border-t border-stroke-soft px-5 py-2.5 text-sm">
        <span className="text-sub">Signing secret</span>
        <span className="font-mono text-[13px] text-strong">{reveal ? SIGNING_SECRET : maskSecret(SIGNING_SECRET)}</span>
        <Button variant="ghost" size="icon-sm" aria-label={reveal ? "Hide signing secret" : "Reveal signing secret"} onClick={() => setReveal((r) => !r)}>
          {reveal ? <EyeOff /> : <Eye />}
        </Button>
        <CopyButton value={SIGNING_SECRET} label="Copy signing secret" toastLabel="Signing secret" />
        <span className="text-xs text-sub">Placeholder — no webhook is actually sent.</span>
      </div>
    </Card>
  );
}

function EventDetail({ event, onClose }: { event: WebhookEvent; onClose: () => void }) {
  const setOverride = useDemo((s) => s.setDeliveryOverride);
  const updateEvent = useDemo((s) => s.updateEvent);
  const failing = useDemo((s) => s.integrationPreview === "error");
  const { update } = useUrlState();
  const txns = useTransactions();
  const now = useNow(10_000);
  const [retrying, setRetrying] = React.useState(false);
  const [showResponse, setShowResponse] = React.useState(true);
  const last = event.attempts[event.attempts.length - 1];
  const txnExists = txns.some((t) => t.id === event.txnId);

  const retry = () => {
    setRetrying(true);
    setTimeout(() => {
      const at = Date.now();
      const attempt = failing ? failedAttempt(at, "500") : okAttempt(at, 140 + Math.round(Math.random() * 200));
      const patch = { deliveryStatus: (failing ? "failed" : "delivered") as DeliveryStatus, attempts: [...event.attempts, attempt] };
      if (event.origin === "demo") updateEvent(event.id, patch);
      else setOverride(event.id, patch);
      setRetrying(false);
      if (failing) toast.error("Retry failed · HTTP 500", { description: "The endpoint is still returning errors. Turn off “Failing webhook endpoint” in Demo controls to recover." });
      else toast.success("Event redelivered", { description: `${event.type} · HTTP 200 in ${attempt.durationMs} ms. Simulated — nothing was sent.` });
    }, 1100);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-stroke-soft px-5 py-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm font-medium text-strong">{event.type}</span>
            <DeliveryBadge status={event.deliveryStatus} attempts={event.attempts.length} />
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 text-xs text-sub">
            <MonoValue value={event.id} copyLabel="Event ID" className="-ml-0.5" />
            <span title={formatFull(event.createdAt)}>{formatFull(event.createdAt)}</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <Button size="sm" variant="secondary" disabled={!txnExists} onClick={() => update((sp) => sp.set("txn", event.txnId))}>
            <ExternalLink /> Open payment
          </Button>
          <Button size="sm" variant="primary" loading={retrying} disabled={event.deliveryStatus === "pending"} onClick={retry}>
            {!retrying && <RotateCcw />} {retrying ? "Retrying…" : "Retry delivery"}
          </Button>
          <Button size="icon" variant="ghost" aria-label="Close event" onClick={onClose} className="lg:hidden">
            <X />
          </Button>
        </div>
      </div>

      <div className="scrollbar-thin flex-1 space-y-4 overflow-y-auto p-5">
        <section aria-label="Response">
          <button
            type="button"
            aria-expanded={showResponse}
            onClick={() => setShowResponse((s) => !s)}
            className="flex w-full items-center justify-between text-left"
          >
            <span className="text-xs font-medium tracking-[0.04em] text-sub uppercase">Latest response</span>
            <ChevronDown className={cn("size-4 text-soft transition-transform", showResponse && "rotate-180")} aria-hidden />
          </button>
          {showResponse &&
            (last ? (
              <div className="mt-2 overflow-hidden rounded-md border border-stroke-soft">
                <dl className="grid grid-cols-3 divide-x divide-stroke-soft border-b border-stroke-soft text-sm">
                  <div className="px-3 py-2">
                    <dt className="text-xs text-sub">Status</dt>
                    <dd className={cn("font-mono text-[13px] font-medium", last.statusCode === 200 ? "text-success-dark" : "text-error-dark")}>
                      {last.statusCode ?? "Timeout"}
                    </dd>
                  </div>
                  <div className="px-3 py-2">
                    <dt className="text-xs text-sub">Duration</dt>
                    <dd className="font-mono text-[13px] text-strong">{last.durationMs} ms</dd>
                  </div>
                  <div className="px-3 py-2">
                    <dt className="text-xs text-sub">Attempted</dt>
                    <dd className="text-[13px] text-strong">{formatRelative(last.at, now)}</dd>
                  </div>
                </dl>
                <pre className="scrollbar-thin overflow-x-auto bg-surface px-3 py-2 font-mono text-[12.5px] text-strong">{last.responseBody}</pre>
              </div>
            ) : (
              <p className="mt-2 rounded-md border border-dashed border-stroke-strong px-3 py-3 text-sm text-sub">Delivery in progress — waiting for the endpoint to respond.</p>
            ))}
        </section>

        <section aria-label="Delivery attempts">
          <p className="text-xs font-medium tracking-[0.04em] text-sub uppercase">Attempts</p>
          <ol className="mt-2 space-y-1.5">
            {event.attempts.map((a, i) => (
              <li key={i} className="flex items-center justify-between gap-3 rounded-sm border border-stroke-soft px-3 py-2 text-sm">
                <span className="flex items-center gap-2">
                  <span className={cn("size-2 rounded-full", a.statusCode === 200 ? "bg-success-base" : "bg-error-base")} aria-hidden />
                  Attempt {i + 1}
                  <span className="font-mono text-[13px] text-sub">{a.statusCode ?? "timeout"}</span>
                </span>
                <span className="font-mono text-xs text-sub">
                  {formatTime(a.at)} · {a.durationMs} ms
                </span>
              </li>
            ))}
            {!event.attempts.length && <li className="text-sm text-sub">No attempts yet.</li>}
          </ol>
        </section>

        <section aria-label="Payload">
          <p className="mb-2 text-xs font-medium tracking-[0.04em] text-sub uppercase">Payload</p>
          <CodeBlock
            lang="json"
            code={JSON.stringify(event.payload, null, 2)}
            title={<span className="font-mono">POST {new URL(WEBHOOK_ENDPOINT).pathname}</span>}
            copyLabel="Payload"
            maxHeight={420}
          />
          <p className="mt-2 text-xs text-sub">Illustrative payload shape for this prototype — not Fun&apos;s documented event schema.</p>
        </section>
      </div>
    </div>
  );
}

export function WebhooksView() {
  const { searchParams, update, setParam } = useUrlState();
  const events = useEvents();
  const openPreview = useDemo((s) => s.openPreview);
  const markGuide = useDemo((s) => s.markGuide);
  const created = useDemo((s) => s.createdTxns);
  const now = useNow(15_000);
  const { state, retry } = useViewState();
  const [limit, setLimit] = React.useState(PAGE);
  const [search, setSearch] = React.useState("");

  const typeParam = searchParams.get("type");
  const types = React.useMemo(
    () => (typeParam?.split(",").filter((t) => EVENT_TYPES.includes(t as WebhookEventType)) ?? []) as WebhookEventType[],
    [typeParam],
  );
  const delivery = (searchParams.get("delivery") ?? "all") as "all" | DeliveryStatus;
  const payment = searchParams.get("payment");
  const eventId = searchParams.get("event");

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return events.filter(
      (e) =>
        (!types.length || types.includes(e.type)) &&
        (delivery === "all" || e.deliveryStatus === delivery) &&
        (!payment || e.txnId === payment) &&
        (!q || e.id.toLowerCase().includes(q) || e.txnId.toLowerCase().includes(q)),
    );
  }, [events, types, delivery, payment, search]);

  const selected = React.useMemo(
    () => (eventId ? events.find((e) => e.id === eventId) : null) ?? filtered[0] ?? null,
    [eventId, events, filtered],
  );

  React.useEffect(() => {
    if (selected && created.some((t) => t.id === selected.txnId)) markGuide({ viewedWebhook: true });
  }, [selected, created, markGuide]);

  const counts = React.useMemo(() => {
    const m = new Map<string, number>();
    events.forEach((e) => m.set(e.type, (m.get(e.type) ?? 0) + 1));
    return m;
  }, [events]);
  const failedCount = events.filter((e) => e.deliveryStatus === "failed").length;

  const [mobileOpen, setMobileOpen] = React.useState(false);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Webhooks"
        description="Events sent to Nova Markets' server as payments move. Inspect payloads, check responses, and retry failed deliveries."
        actions={
          <Button variant="secondary" onClick={() => openPreview("integrations")}>
            <Play /> Trigger with a test payment
          </Button>
        }
      />

      {state === "loading" ? (
        <div className="-mx-4 -mt-6 sm:-mx-6 lg:-mx-8">
          <PageSkeleton variant="table" />
        </div>
      ) : state === "error" ? (
        <Card>
          <ErrorState onRetry={retry} />
        </Card>
      ) : (
        <>
          <EndpointCard events={events} now={now} />

          <Card className="overflow-hidden">
            <CardHeader title="Event log" description={`${events.length} events retained · ${failedCount} failing delivery`} />
            <div className="flex flex-wrap items-center gap-2 border-y border-stroke-soft px-5 py-3">
              <div className="w-full sm:w-60">
                <Input leading={<Search />} className="h-8" placeholder="Event or payment ID" aria-label="Search events by event or payment ID" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <FacetFilter<WebhookEventType>
                label="Event type"
                selected={types}
                onChange={(next) => update((sp) => (next.length ? sp.set("type", next.join(",")) : sp.delete("type")))}
                options={EVENT_TYPES.map((t) => ({
                  value: t,
                  label: <span className="font-mono text-[13px]">{t}</span>,
                  count: counts.get(t) ?? 0,
                  icon: <span className={cn("size-2 rounded-full", typeTone(t))} aria-hidden />,
                }))}
              />
              <Segmented
                size="sm"
                aria-label="Delivery status"
                value={delivery}
                onValueChange={(v) => setParam("delivery", v === "all" ? null : v)}
                options={[
                  { value: "all", label: "All" },
                  { value: "delivered", label: "Delivered" },
                  { value: "failed", label: `Failed${failedCount ? ` (${failedCount})` : ""}` },
                  { value: "pending", label: "Sending" },
                ]}
              />
              {payment && (
                <Tag onRemove={() => setParam("payment", null)} removeLabel="Clear payment filter" className="font-mono">
                  {payment}
                </Tag>
              )}
            </div>

            {filtered.length ? (
              <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
                <div className="border-stroke-soft lg:border-r">
                  <ul aria-label="Events" className="scrollbar-thin divide-y divide-stroke-soft lg:max-h-[720px] lg:overflow-y-auto">
                    {filtered.slice(0, limit).map((e) => {
                      const on = selected?.id === e.id;
                      return (
                        <li key={e.id}>
                          <button
                            type="button"
                            aria-current={on || undefined}
                            onClick={() => {
                              setParam("event", e.id);
                              setMobileOpen(true);
                            }}
                            className={cn(
                              "flex w-full items-center gap-3 border-l-2 px-5 py-3 text-left",
                              on ? "border-primary-base bg-primary-mute" : "border-transparent hover:bg-surface",
                            )}
                          >
                            <span className={cn("size-2 shrink-0 rounded-full", typeTone(e.type))} aria-hidden />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate font-mono text-[13px] text-strong">{e.type}</span>
                              <span className="block truncate font-mono text-xs text-sub">
                                {e.id} · {e.txnId}
                              </span>
                            </span>
                            <span className="flex shrink-0 flex-col items-end gap-1">
                              <DeliveryBadge status={e.deliveryStatus} attempts={e.attempts.length} />
                              <span className="text-[11px] text-sub">{formatRelative(e.createdAt, now)}</span>
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                  {filtered.length > limit && (
                    <div className="border-t border-stroke-soft p-3 text-center">
                      <Button variant="ghost" size="sm" onClick={() => setLimit((l) => l + PAGE)}>
                        Show {Math.min(PAGE, filtered.length - limit)} more of {filtered.length - limit}
                      </Button>
                    </div>
                  )}
                </div>
                <div className={cn("min-w-0", mobileOpen ? "block border-t border-stroke-soft lg:border-t-0" : "hidden lg:block")}>
                  {selected && <EventDetail event={selected} onClose={() => setMobileOpen(false)} />}
                </div>
              </div>
            ) : (
              <EmptyState
                icon={<Webhook />}
                title="No events match these filters"
                description={payment ? "This payment has no events in the retention window yet." : "Try another event type or delivery status."}
                action={
                  <Button
                    onClick={() =>
                      update((sp) => {
                        ["type", "delivery", "payment", "event"].forEach((k) => sp.delete(k));
                        setSearch("");
                      })
                    }
                  >
                    <RotateCcw /> Clear filters
                  </Button>
                }
              />
            )}
          </Card>
        </>
      )}
    </div>
  );
}
