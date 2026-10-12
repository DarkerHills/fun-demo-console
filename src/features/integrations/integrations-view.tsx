"use client";

import Link from "next/link";
import { AlertTriangle, ArrowRight, Check, CheckCircle2, ChevronDown, CircleDashed, KeyRound, Play, XCircle } from "lucide-react";
import * as React from "react";
import type { Env, IntegrationState } from "@/lib/data/types";
import { formatRelative } from "@/lib/format";
import { useEvents, useNow, useViewState } from "@/lib/hooks/use-data";
import { useDemo } from "@/lib/store/demo-store";
import { cn, maskSecret } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { CodeBlock, CopyButton } from "@/components/ui/code";
import { Segmented } from "@/components/ui/controls";
import { PageHeader } from "@/components/ui/data";
import { DemoTag } from "@/components/ui/domain";
import { Callout, ErrorState } from "@/components/ui/feedback";
import { PageSkeleton } from "@/components/shell/shell-skeleton";

type Lang = "ts" | "js";
type Pm = "npm" | "pnpm" | "yarn";

const APP_IDS: Record<Env, string> = { sandbox: "app_sbx_7Hq2Lx9d", production: "app_prd_3Vn8Qe2k" };

function snippets(env: Env, lang: Lang) {
  const ts = lang === "ts";
  const appId = APP_IDS[env];
  return {
    provider: `// app/providers.${ts ? "tsx" : "jsx"}
"use client";

import { FunkitProvider, createFunkitConfig } from "@funkit/connect";

const funkitConfig = createFunkitConfig({
  appName: "Nova Markets",
  appId: "${appId}", // ${env} app ID
  environment: "${env}",
});

export function Providers({ children }${ts ? ": { children: React.ReactNode }" : ""}) {
  return <FunkitProvider config={funkitConfig}>{children}</FunkitProvider>;
}`,
    checkout: `// components/deposit-button.${ts ? "tsx" : "jsx"}
import { useFunkitCheckout } from "@funkit/connect";

export function DepositButton({ userId }${ts ? ": { userId: string }" : ""}) {
  const { beginCheckout } = useFunkitCheckout({
    config: {
      checkoutItemTitle: "Deposit to Nova Markets",
      targetChain: "8453", // Base
      targetAssetTicker: "USDC",
      targetAssetAmount: 250,
      metadata: { userId, reference: "nova-deposit-v2" },
    },
    onSuccess: (payment${ts ? ": { id: string }" : ""}) => console.log("Deposit started", payment.id),
    onError: (error${ts ? ": Error" : ""}) => console.error(error.message),
  });

  return <button onClick={() => beginCheckout()}>Deposit</button>;
}`,
    webhook: `// server/webhooks.${ts ? "ts" : "js"}
import crypto from "node:crypto";
import express from "express";

const app = express();
const secret = process.env.FUN_WEBHOOK_SECRET${ts ? "!" : ""}; // ${env === "sandbox" ? "whsec_…" : "whsec_… (production)"}

app.post("/webhooks/fun", express.raw({ type: "application/json" }), (req, res) => {
  const signature = req.header("x-fun-signature") ?? "";
  const expected = crypto.createHmac("sha256", secret).update(req.body).digest("hex");
  if (signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    return res.status(400).send("Invalid signature");
  }

  const event = JSON.parse(req.body.toString());
  if (event.type === "payment.completed") {
    creditAccount(event.data.object.customer.id, event.data.object.amount);
  }
  res.json({ received: true });
});`,
  };
}

const INSTALL: Record<Pm, string> = {
  npm: "npm install @funkit/connect",
  pnpm: "pnpm add @funkit/connect",
  yarn: "yarn add @funkit/connect",
};

function StepItem({
  n,
  title,
  description,
  open,
  onToggle,
  done,
  children,
}: {
  n: number;
  title: string;
  description: string;
  open: boolean;
  onToggle: () => void;
  done?: boolean;
  children: React.ReactNode;
}) {
  const id = `step-${n}`;
  return (
    <li className="border-t border-stroke-soft first:border-t-0">
      <button type="button" aria-expanded={open} aria-controls={id} onClick={onToggle} className="flex w-full items-center gap-3 px-5 py-3.5 text-left hover:bg-surface">
        <span
          className={cn(
            "grid size-6 shrink-0 place-items-center rounded-full text-xs font-semibold",
            done ? "bg-primary-base text-white" : "border border-stroke-strong text-sub",
          )}
        >
          {done ? <Check className="size-3.5" strokeWidth={3} /> : n}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium text-strong">{title}</span>
          <span className="block text-xs text-sub">{description}</span>
        </span>
        <ChevronDown className={cn("size-4 text-soft transition-transform", open && "rotate-180")} aria-hidden />
      </button>
      {open && (
        <div id={id} className="space-y-3 px-5 pb-5 pl-14">
          {children}
        </div>
      )}
    </li>
  );
}

const STATE_COPY: Record<IntegrationState, { title: string; tone: "success" | "warning" | "error"; icon: React.ReactNode }> = {
  connected: { title: "Connected", tone: "success", icon: <CheckCircle2 className="size-5 text-success-base" /> },
  incomplete: { title: "Setup incomplete", tone: "warning", icon: <AlertTriangle className="size-5 text-warning-base" /> },
  error: { title: "Delivery errors", tone: "error", icon: <XCircle className="size-5 text-error-base" /> },
};

export function IntegrationsView() {
  const env = useDemo((s) => s.env);
  const openPreview = useDemo((s) => s.openPreview);
  const savedAt = useDemo((s) => s.checkoutSavedAt);
  const created = useDemo((s) => s.createdTxns);
  const keys = useDemo((s) => s.apiKeys);
  const preview = useDemo((s) => s.integrationPreview);
  const setPreview = useDemo((s) => s.setIntegrationPreview);
  const events = useEvents();
  const now = useNow(15_000);
  const { state, retry } = useViewState();
  // Follows the console environment until someone picks one for the snippets.
  const [snippetEnvChoice, setSnippetEnv] = React.useState<Env | null>(null);
  const snippetEnv = snippetEnvChoice ?? env;
  const [lang, setLang] = React.useState<Lang>("ts");
  const [pm, setPm] = React.useState<Pm>("npm");
  const [open, setOpen] = React.useState<number | null>(1);

  const pub = keys.find((k) => k.env === snippetEnv && k.type === "publishable" && !k.revokedAt);
  const code = snippets(snippetEnv, lang);
  const checklist = [
    { label: "Install the SDK", done: true },
    { label: "Add your app ID", done: true },
    { label: "Configure checkout", done: !!savedAt, href: "/checkout" },
    { label: "Add a webhook endpoint", done: true, href: "/webhooks" },
    { label: "Complete a test payment", done: created.length > 0, action: () => openPreview("integrations") },
    { label: "Create production keys", done: keys.some((k) => k.env === "production" && !k.revokedAt), href: "/api-keys" },
  ];
  const doneCount = checklist.filter((c) => c.done).length;
  const derived: IntegrationState = doneCount === checklist.length ? "connected" : "incomplete";
  const status: IntegrationState = preview === "auto" ? derived : preview;
  const lastEvent = events[0];
  const failedRecent = events.filter((e) => e.deliveryStatus === "failed").slice(0, 3);
  const copy = STATE_COPY[status];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Integrations"
        description="Add Fun Checkout to the Nova Markets app. Copy the snippets, then launch a test checkout to see events arrive."
        actions={
          <Button variant="primary" onClick={() => openPreview("integrations")}>
            <Play /> Launch test checkout
          </Button>
        }
      />

      {state === "loading" ? (
        <div className="-mx-4 -mt-6 sm:-mx-6 lg:-mx-8">
          <PageSkeleton variant="form" />
        </div>
      ) : state === "error" ? (
        <Card>
          <ErrorState onRetry={retry} />
        </Card>
      ) : (
        <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-5">
            <Card>
              <div className="flex flex-wrap items-start justify-between gap-4 px-5 py-4">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5">{copy.icon}</span>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-medium text-strong">Checkout SDK</h2>
                      <Badge tone={copy.tone} dot>
                        {copy.title}
                      </Badge>
                    </div>
                    <p className="mt-0.5 text-sm text-sub">
                      {status === "connected" &&
                        `Receiving events from the Nova Markets app${lastEvent ? ` · last event ${formatRelative(lastEvent.createdAt, now)}` : ""}.`}
                      {status === "incomplete" && `${checklist.length - doneCount || 2} setup step${checklist.length - doneCount === 1 ? "" : "s"} left before you can go live. Sandbox payments still work.`}
                      {status === "error" && "Your webhook endpoint is rejecting events. Payments still complete, but Nova Markets isn't being notified."}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <DemoTag>Preview state</DemoTag>
                  <Segmented
                    size="sm"
                    aria-label="Preview integration state"
                    value={preview === "auto" ? "auto" : preview}
                    onValueChange={(v) => setPreview(v as IntegrationState | "auto")}
                    options={[
                      { value: "auto", label: "Live", title: "Derived from your actual setup" },
                      { value: "connected", label: "Connected" },
                      { value: "incomplete", label: "Incomplete" },
                      { value: "error", label: "Error" },
                    ]}
                  />
                </div>
              </div>
              {status === "error" && (
                <div className="border-t border-stroke-soft px-5 py-3">
                  <Callout
                    tone="error"
                    title="Last deliveries returned HTTP 500"
                    action={
                      <Button asChild size="sm" variant="secondary">
                        <Link href="/webhooks?delivery=failed">
                          Review failures <ArrowRight />
                        </Link>
                      </Button>
                    }
                  >
                    {failedRecent.length
                      ? failedRecent.map((e) => e.type).join(", ")
                      : "New events will fail until the endpoint recovers."}{" "}
                    — fix the endpoint, then retry from Webhooks.
                  </Callout>
                </div>
              )}
              {status === "incomplete" && (
                <div className="border-t border-stroke-soft px-5 py-3">
                  <Callout tone="warning" title="Finish the checklist to go live">
                    Complete the remaining items on the right. Each one links to where you do it.
                  </Callout>
                </div>
              )}
            </Card>

            <Card>
              <CardHeader
                title="Setup"
                description="Four steps from install to verified webhooks."
                actions={
                  <>
                    <Segmented
                      size="sm"
                      aria-label="Example environment"
                      value={snippetEnv}
                      onValueChange={setSnippetEnv}
                      options={[
                        { value: "sandbox", label: "Sandbox" },
                        { value: "production", label: "Production" },
                      ]}
                    />
                    <Segmented
                      size="sm"
                      aria-label="Code language"
                      value={lang}
                      onValueChange={setLang}
                      options={[
                        { value: "ts", label: "TypeScript" },
                        { value: "js", label: "JavaScript" },
                      ]}
                    />
                  </>
                }
              />
              <ol className="border-t border-stroke-soft">
                <StepItem n={1} done title="Install the SDK" description="Add the checkout package to your web app." open={open === 1} onToggle={() => setOpen(open === 1 ? null : 1)}>
                  <CodeBlock
                    lang="bash"
                    code={INSTALL[pm]}
                    copyLabel="Install command"
                    title={
                      <Segmented
                        size="sm"
                        aria-label="Package manager"
                        value={pm}
                        onValueChange={setPm}
                        options={[
                          { value: "npm", label: "npm" },
                          { value: "pnpm", label: "pnpm" },
                          { value: "yarn", label: "yarn" },
                        ]}
                      />
                    }
                  />
                </StepItem>
                <StepItem n={2} done title="Add the provider with your app ID" description={`Uses the ${snippetEnv} app ID ${APP_IDS[snippetEnv]}.`} open={open === 2} onToggle={() => setOpen(open === 2 ? null : 2)}>
                  <CodeBlock lang={lang} code={code.provider} copyLabel="Provider snippet" title={<span className="font-mono">providers.{lang === "ts" ? "tsx" : "jsx"}</span>} />
                </StepItem>
                <StepItem n={3} done={created.length > 0} title="Open checkout for a deposit" description="Settles to USDC on Base, matching your checkout settings." open={open === 3} onToggle={() => setOpen(open === 3 ? null : 3)}>
                  <CodeBlock lang={lang} code={code.checkout} copyLabel="Checkout snippet" title={<span className="font-mono">deposit-button.{lang === "ts" ? "tsx" : "jsx"}</span>} />
                  <div className="flex flex-wrap items-center gap-3">
                    <Button variant="primary" size="sm" onClick={() => openPreview("integrations")}>
                      <Play /> Try it in a test checkout
                    </Button>
                    <span className="text-xs text-sub">Creates a simulated payment and its webhook events.</span>
                  </div>
                </StepItem>
                <StepItem n={4} done title="Verify webhooks on your server" description="Check the signature, then credit the customer on payment.completed." open={open === 4} onToggle={() => setOpen(open === 4 ? null : 4)}>
                  <CodeBlock lang={lang} code={code.webhook} copyLabel="Webhook handler" title={<span className="font-mono">webhooks.{lang}</span>} />
                </StepItem>
              </ol>
              <p className="border-t border-stroke-soft px-5 py-3 text-xs text-sub">
                Illustrative snippets for this prototype — confirm package names, options, and signature headers against Fun&apos;s current documentation.
              </p>
            </Card>
          </div>

          <div className="space-y-5 xl:sticky xl:top-20">
            <Card>
              <CardHeader title="Credentials" description={`${snippetEnv === "sandbox" ? "Sandbox" : "Production"} values used in the snippets`} actions={<DemoTag>Placeholders</DemoTag>} />
              <dl className="space-y-3 px-5 pb-5 text-sm">
                <div>
                  <dt className="text-xs text-sub">App ID</dt>
                  <dd className="mt-1 flex items-center justify-between rounded-sm border border-stroke-soft bg-surface px-2.5 py-1.5">
                    <span className="font-mono text-[13px] text-strong">{APP_IDS[snippetEnv]}</span>
                    <CopyButton value={APP_IDS[snippetEnv]} label="Copy app ID" toastLabel="App ID" />
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-sub">Publishable key</dt>
                  <dd className="mt-1 flex items-center justify-between gap-2 rounded-sm border border-stroke-soft bg-surface px-2.5 py-1.5">
                    {pub ? (
                      <>
                        <span className="truncate font-mono text-[13px] text-strong">{maskSecret(pub.value)}</span>
                        <CopyButton value={pub.value} label="Copy publishable key" toastLabel="Publishable key" />
                      </>
                    ) : (
                      <span className="text-sub">No active key</span>
                    )}
                  </dd>
                </div>
                <Link href="/api-keys" className="inline-flex items-center gap-1 text-xs font-medium text-primary-base hover:underline">
                  <KeyRound className="size-3.5" aria-hidden /> Manage API keys
                </Link>
              </dl>
            </Card>

            <Card>
              <CardHeader title="Go-live checklist" description={`${doneCount} of ${checklist.length} complete`} />
              <div className="px-5">
                <div className="h-1.5 w-full rounded-full bg-layer" role="progressbar" aria-valuemin={0} aria-valuemax={checklist.length} aria-valuenow={doneCount} aria-label="Checklist progress">
                  <div className="h-full rounded-full bg-primary-base transition-[width]" style={{ width: `${(doneCount / checklist.length) * 100}%` }} />
                </div>
              </div>
              <ul className="mt-3 pb-2">
                {checklist.map((c) => (
                  <li key={c.label} className="flex items-center gap-3 px-5 py-2">
                    {c.done ? (
                      <CheckCircle2 className="size-4 shrink-0 text-success-base" aria-label="Done" />
                    ) : (
                      <CircleDashed className="size-4 shrink-0 text-soft" aria-label="Not done" />
                    )}
                    <span className={cn("flex-1 text-sm", c.done ? "text-sub" : "text-strong")}>{c.label}</span>
                    {!c.done &&
                      (c.href ? (
                        <Link href={c.href} className="text-xs font-medium text-primary-base hover:underline">
                          Do it
                        </Link>
                      ) : c.action ? (
                        <button type="button" onClick={c.action} className="text-xs font-medium text-primary-base hover:underline">
                          Do it
                        </button>
                      ) : null)}
                  </li>
                ))}
                <li className="flex items-center gap-3 px-5 py-2 opacity-60">
                  <CircleDashed className="size-4 shrink-0 text-soft" aria-hidden />
                  <span className="flex-1 text-sm text-sub">Request go-live review</span>
                  <span className="text-xs text-sub">Not in demo</span>
                </li>
              </ul>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
