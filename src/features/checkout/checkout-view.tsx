"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle, ImagePlus, Maximize2, RotateCcw, Trash2 } from "lucide-react";
import * as React from "react";
import { Controller, useForm, useWatch, type FieldErrors } from "react-hook-form";
import { z } from "zod";
import {
  ASSETS,
  CRYPTO_ASSETS,
  EXCHANGES,
  METHOD_ORDER,
  METHODS,
  NETWORK_ORDER,
  NETWORKS,
  WORKSPACE,
  networksFor,
} from "@/lib/data/catalog";
import { planRoute } from "@/lib/data/route-plan";
import type { AssetId, CheckoutConfig, NetworkId, PaymentMethod } from "@/lib/data/types";
import { formatDuration, formatRelative, formatUsd } from "@/lib/format";
import { useNow, useViewState } from "@/lib/hooks/use-data";
import { DEFAULT_CHECKOUT, useDemo } from "@/lib/store/demo-store";
import { toast } from "@/lib/store/toast-store";
import { cn, shortAddress } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { MonoValue } from "@/components/ui/code";
import { Segmented, Select, Switch } from "@/components/ui/controls";
import { PageHeader } from "@/components/ui/data";
import { AssetIcon, DemoTag, METHOD_ICON, NetworkIcon } from "@/components/ui/domain";
import { ErrorState } from "@/components/ui/feedback";
import { Field, Input } from "@/components/ui/field";
import { ConfirmDialog } from "@/components/ui/overlays";
import { PageSkeleton } from "@/components/shell/shell-skeleton";
import { CheckoutWidget, type SimControls } from "./checkout-widget";

const ACCENTS = [
  { value: "#7d52f4", label: "Purple" },
  { value: "#335cff", label: "Blue" },
  { value: "#1daf61", label: "Green" },
  { value: "#e16614", label: "Orange" },
  { value: "#e9358f", label: "Pink" },
  { value: "#171717", label: "Black" },
];

const amount = (label: string) =>
  z
    .number({ error: `Enter a ${label}` })
    .min(1, `${label.charAt(0).toUpperCase()}${label.slice(1)} must be at least $1`)
    .max(25000, "Keep amounts at or below $25,000");

const schema = z
  .object({
    name: z.string().trim().min(3, "Use at least 3 characters").max(48, "Keep it under 48 characters"),
    reference: z
      .string()
      .trim()
      .regex(/^[a-z0-9][a-z0-9-]{2,39}$/, "Use 3–40 lowercase letters, numbers, or hyphens"),
    sources: z
      .object({ wallet: z.boolean(), transfer: z.boolean(), card: z.boolean(), exchange: z.boolean() })
      .refine((s) => Object.values(s).some(Boolean), "Enable at least one payment source"),
    assets: z.array(z.enum(["USDC", "USDT", "ETH", "SOL", "WBTC"])).min(1, "Select at least one asset"),
    networks: z.array(z.enum(["ethereum", "base", "arbitrum", "optimism", "polygon", "solana"])).min(1, "Select at least one network"),
    destAsset: z.enum(["USDC", "USDT"]),
    destNetwork: z.enum(["ethereum", "base", "arbitrum", "optimism", "polygon", "solana"]),
    theme: z.enum(["light", "dark"]),
    accent: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Use a 6-digit hex color, like #7D52F4"),
    brandName: z.string().trim().min(2, "Use at least 2 characters").max(32, "Keep it under 32 characters"),
    logo: z.string().nullable(),
    defaultAmount: amount("default amount"),
    minAmount: amount("minimum amount"),
  })
  .superRefine((v, ctx) => {
    if (v.defaultAmount < v.minAmount) {
      ctx.addIssue({ code: "custom", path: ["defaultAmount"], message: "Default amount must be at least the minimum" });
    }
  });

type FormValues = z.infer<typeof schema>;

function Section({
  title,
  description,
  aside,
  children,
  id,
}: {
  title: string;
  description: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
  id: string;
}) {
  return (
    <Card aria-labelledby={id}>
      <CardHeader id={id} title={title} description={description} actions={aside} />
      <CardBody>{children}</CardBody>
    </Card>
  );
}

function ToggleChip({ on, onClick, children, label }: { on: boolean; onClick: () => void; children: React.ReactNode; label: string }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={label}
      onClick={onClick}
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-sm border px-2.5 text-sm transition-colors",
        on
          ? "border-primary-base bg-primary-mute font-medium text-strong"
          : "border-stroke-mild bg-default text-sub hover:border-stroke-strong hover:text-strong",
      )}
    >
      {children}
    </button>
  );
}

function representative(method: PaymentMethod, cfg: FormValues): { asset: AssetId; network: NetworkId | null } | null {
  if (method === "card") return { asset: "USD", network: null };
  for (const a of cfg.assets) {
    const nets = networksFor(a, cfg.networks);
    if (nets.length) return { asset: a, network: nets[0] };
  }
  return null;
}

export function CheckoutView() {
  const saved = useDemo((s) => s.checkout);
  const savedAt = useDemo((s) => s.checkoutSavedAt);
  const saveCheckout = useDemo((s) => s.saveCheckout);
  const openPreview = useDemo((s) => s.openPreview);
  const now = useNow(30_000);
  const { state, retry } = useViewState();
  const [confirmReset, setConfirmReset] = React.useState(false);
  const [logoError, setLogoError] = React.useState<string | null>(null);
  const [previewOutcome, setPreviewOutcome] = React.useState<SimControls["outcome"]>("success");

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: saved as FormValues,
    mode: "onChange",
  });
  const { register, control, handleSubmit, reset, setValue, formState } = form;
  const { errors, isDirty } = formState;
  const values = useWatch({ control }) as FormValues;
  const draft = { ...saved, ...values } as CheckoutConfig;

  React.useEffect(() => {
    if (!isDirty) return;
    const onUnload = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", onUnload);
    return () => window.removeEventListener("beforeunload", onUnload);
  }, [isDirty]);

  const onValid = (v: FormValues) => {
    saveCheckout(v as CheckoutConfig);
    reset(v);
    toast.success("Checkout saved", {
      description: "Customers see these settings on their next checkout.",
      action: { label: "Run a test payment", onClick: () => openPreview("checkout") },
    });
  };
  const onInvalid = (errs: FieldErrors<FormValues>) => {
    const n = Object.keys(errs).length;
    toast.error(`Fix ${n} field${n === 1 ? "" : "s"} to save`, { description: "Errors are marked in red below." });
  };

  const incompatible = (values.assets ?? []).filter((a) => !networksFor(a as AssetId, values.networks ?? []).length);

  const onLogo = (file: File | undefined) => {
    setLogoError(null);
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/svg+xml", "image/webp"].includes(file.type)) {
      setLogoError("Use a PNG, JPG, SVG, or WebP image");
      return;
    }
    if (file.size > 150_000) {
      setLogoError("Use an image under 150 KB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setValue("logo", String(reader.result), { shouldDirty: true });
    reader.readAsDataURL(file);
  };

  if (state === "loading") return <div className="-mx-4 -mt-6 sm:-mx-6 lg:-mx-8"><PageSkeleton variant="form" /></div>;
  if (state === "error")
    return (
      <Card>
        <ErrorState title="Couldn't load checkout settings" onRetry={retry} />
      </Card>
    );

  return (
    <form onSubmit={handleSubmit(onValid, onInvalid)} noValidate className="space-y-5 pb-16">
      <PageHeader
        title="Checkout"
        description="Choose how customers fund their Nova Markets account, and preview exactly what they'll see."
        meta={
          isDirty ? (
            <Badge tone="warning" dot>
              Unsaved changes
            </Badge>
          ) : savedAt ? (
            <Badge tone="success" dot>
              Saved {formatRelative(savedAt, now)}
            </Badge>
          ) : (
            <Badge tone="neutral">Default configuration</Badge>
          )
        }
        actions={
          <>
            <Button type="button" variant="ghost" onClick={() => setConfirmReset(true)}>
              <RotateCcw /> Reset to default
            </Button>
            <Button type="button" variant="secondary" onClick={() => openPreview("checkout", isDirty ? draft : undefined)}>
              <Maximize2 /> Preview checkout
            </Button>
            <Button type="submit" variant="primary" disabled={!isDirty}>
              Save changes
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="space-y-5">
          <Section id="sec-details" title="Details" description="Internal name and reference for this checkout.">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Checkout name" htmlFor="name" error={errors.name?.message}>
                <Input id="name" aria-invalid={!!errors.name} {...register("name")} />
              </Field>
              <Field label="Internal reference" htmlFor="reference" error={errors.reference?.message} hint="Appears in webhook metadata">
                <Input id="reference" className="font-mono" aria-invalid={!!errors.reference} {...register("reference")} />
              </Field>
            </div>
          </Section>

          <Section
            id="sec-sources"
            title="Payment sources"
            description="Ways customers can fund a deposit. Turn off a source to hide it from checkout."
            aside={<DemoTag>Demo options</DemoTag>}
          >
            <Controller
              control={control}
              name="sources"
              render={({ field }) => (
                <div className="grid gap-2 sm:grid-cols-2">
                  {METHOD_ORDER.map((m) => {
                    const Icon = METHOD_ICON[m];
                    const on = field.value[m];
                    return (
                      <div
                        key={m}
                        className={cn(
                          "flex items-start gap-3 rounded-md border p-3 transition-colors",
                          on ? "border-primary-faint bg-primary-mute/40" : "border-stroke-mild hover:border-stroke-strong",
                        )}
                      >
                        <span className={cn("grid size-8 shrink-0 place-items-center rounded-sm", on ? "bg-default text-primary-base shadow-xs" : "bg-layer text-sub")}>
                          <Icon className="size-4" />
                        </span>
                        <label htmlFor={`src-${m}`} className="min-w-0 flex-1 cursor-pointer">
                          <span className="block text-sm font-medium text-strong">{METHODS[m].label}</span>
                          <span className="block text-xs text-sub">{METHODS[m].description}</span>
                        </label>
                        <Switch id={`src-${m}`} checked={on} onCheckedChange={(v) => field.onChange({ ...field.value, [m]: v })} />
                      </div>
                    );
                  })}
                </div>
              )}
            />
            {errors.sources && <p role="alert" className="mt-2 text-xs text-error-base">{errors.sources.message ?? errors.sources.root?.message}</p>}
          </Section>

          <Section
            id="sec-assets"
            title="Accepted assets and networks"
            description="What customers can pay with. Each asset is offered on the enabled networks that support it."
            aside={<DemoTag>Demo options</DemoTag>}
          >
            <div className="space-y-4">
              <Controller
                control={control}
                name="assets"
                render={({ field }) => (
                  <fieldset>
                    <legend className="mb-2 text-sm font-medium text-strong">Assets</legend>
                    <div className="flex flex-wrap gap-2">
                      {CRYPTO_ASSETS.map((a) => {
                        const on = field.value.includes(a as never);
                        return (
                          <ToggleChip
                            key={a}
                            on={on}
                            label={`${ASSETS[a].label} ${on ? "accepted" : "not accepted"}`}
                            onClick={() => field.onChange(on ? field.value.filter((x) => x !== a) : [...field.value, a])}
                          >
                            <AssetIcon asset={a} size={16} /> {ASSETS[a].label}
                          </ToggleChip>
                        );
                      })}
                    </div>
                    {errors.assets && <p role="alert" className="mt-2 text-xs text-error-base">{errors.assets.message}</p>}
                  </fieldset>
                )}
              />
              <Controller
                control={control}
                name="networks"
                render={({ field }) => (
                  <fieldset>
                    <legend className="mb-2 text-sm font-medium text-strong">Networks</legend>
                    <div className="flex flex-wrap gap-2">
                      {NETWORK_ORDER.map((n) => {
                        const on = field.value.includes(n);
                        return (
                          <ToggleChip
                            key={n}
                            on={on}
                            label={`${NETWORKS[n].label} ${on ? "enabled" : "disabled"}`}
                            onClick={() => field.onChange(on ? field.value.filter((x) => x !== n) : [...field.value, n])}
                          >
                            <NetworkIcon network={n} size={16} /> {NETWORKS[n].label}
                          </ToggleChip>
                        );
                      })}
                    </div>
                    {errors.networks && <p role="alert" className="mt-2 text-xs text-error-base">{errors.networks.message}</p>}
                  </fieldset>
                )}
              />
              {incompatible.length > 0 && (
                <p className="flex items-start gap-1.5 rounded-sm bg-warning-mute px-2.5 py-2 text-xs text-warning-dark">
                  <AlertTriangle className="mt-px size-3.5 shrink-0 text-warning-base" aria-hidden />
                  {incompatible.join(", ")} {incompatible.length === 1 ? "isn't" : "aren't"} offered on any enabled network, so{" "}
                  {incompatible.length === 1 ? "it" : "they"} won&apos;t appear in checkout.
                  {incompatible.includes("SOL") && " Enable Solana to accept SOL."}
                </p>
              )}
            </div>
          </Section>

          <Section id="sec-destination" title="Destination" description="Where Nova Markets receives funds after routing.">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Settlement asset" htmlFor="destAsset">
                <Controller
                  control={control}
                  name="destAsset"
                  render={({ field }) => (
                    <Select
                      id="destAsset"
                      value={field.value}
                      onValueChange={field.onChange}
                      options={(["USDC", "USDT"] as const).map((a) => ({
                        value: a,
                        label: (
                          <span className="inline-flex items-center gap-2">
                            <AssetIcon asset={a} size={16} /> {ASSETS[a].label}
                          </span>
                        ),
                      }))}
                    />
                  )}
                />
              </Field>
              <Field label="Destination network" htmlFor="destNetwork">
                <Controller
                  control={control}
                  name="destNetwork"
                  render={({ field }) => (
                    <Select
                      id="destNetwork"
                      value={field.value}
                      onValueChange={field.onChange}
                      options={NETWORK_ORDER.filter((n) => n !== "polygon").map((n) => ({
                        value: n,
                        label: (
                          <span className="inline-flex items-center gap-2">
                            <NetworkIcon network={n} size={16} /> {NETWORKS[n].label}
                          </span>
                        ),
                      }))}
                    />
                  )}
                />
              </Field>
              <div className="sm:col-span-2">
                <p className="text-sm font-medium text-strong">Treasury address</p>
                <div className="mt-1.5 flex items-center justify-between gap-2 rounded-sm border border-stroke-soft bg-surface px-3 py-1.5">
                  <MonoValue value={WORKSPACE.treasury} display={shortAddress(WORKSPACE.treasury, 10, 8)} copyLabel="Treasury address" />
                  <span className="text-xs text-sub">Managed in Settings</span>
                </div>
              </div>
            </div>
          </Section>

          <Section id="sec-appearance" title="Appearance" description="Match checkout to the Nova Markets brand.">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Brand name" htmlFor="brandName" error={errors.brandName?.message}>
                <Input id="brandName" aria-invalid={!!errors.brandName} {...register("brandName")} />
              </Field>
              <Field label="Theme" htmlFor="theme">
                <Controller
                  control={control}
                  name="theme"
                  render={({ field }) => (
                    <Segmented
                      aria-label="Checkout theme"
                    className="self-start"
                      value={field.value}
                      onValueChange={field.onChange}
                      options={[
                        { value: "light", label: "Light" },
                        { value: "dark", label: "Dark" },
                      ]}
                    />
                  )}
                />
              </Field>
              <Field label="Logo" htmlFor="logo" optional error={logoError ?? undefined} hint="PNG, JPG, SVG or WebP under 150 KB. Square works best.">
                <div className="flex items-center gap-3">
                  <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-sm border border-stroke-soft bg-weak text-sm font-semibold text-inverse">
                    {values.logo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={values.logo} alt="Uploaded logo preview" className="size-full object-cover" />
                    ) : (
                      (values.brandName || "N").charAt(0)
                    )}
                  </span>
                  <label className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-sm border border-stroke-mild bg-default px-2.5 text-sm font-medium text-strong shadow-xs hover:bg-layer focus-within:outline-2 focus-within:outline-primary-base">
                    <ImagePlus className="size-4" aria-hidden /> Upload
                    <input id="logo" type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" className="sr-only" onChange={(e) => onLogo(e.target.files?.[0])} />
                  </label>
                  {values.logo && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => setValue("logo", null, { shouldDirty: true })}>
                      <Trash2 /> Remove
                    </Button>
                  )}
                </div>
              </Field>
              <Field label="Accent color" htmlFor="accent" error={errors.accent?.message}>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex gap-1.5" role="radiogroup" aria-label="Accent presets">
                    {ACCENTS.map((a) => {
                      const on = values.accent?.toLowerCase() === a.value;
                      return (
                        <button
                          key={a.value}
                          type="button"
                          role="radio"
                          aria-checked={on}
                          aria-label={a.label}
                          onClick={() => setValue("accent", a.value, { shouldDirty: true, shouldValidate: true })}
                          className={cn("size-7 rounded-full ring-offset-2 ring-offset-[var(--bg-default)]", on && "ring-2 ring-strong")}
                          style={{ background: a.value }}
                        />
                      );
                    })}
                  </div>
                  <Input id="accent" className="h-8 w-28 font-mono uppercase" aria-invalid={!!errors.accent} {...register("accent")} />
                </div>
              </Field>
            </div>
          </Section>

          <Section id="sec-amounts" title="Amounts" description="Starting amount in the preview, and the smallest deposit you accept.">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Default amount" htmlFor="defaultAmount" error={errors.defaultAmount?.message}>
                <Input id="defaultAmount" type="number" step="1" leading={<span className="text-sm">$</span>} aria-invalid={!!errors.defaultAmount} {...register("defaultAmount", { valueAsNumber: true })} />
              </Field>
              <Field label="Minimum amount" htmlFor="minAmount" error={errors.minAmount?.message}>
                <Input id="minAmount" type="number" step="1" leading={<span className="text-sm">$</span>} aria-invalid={!!errors.minAmount} {...register("minAmount", { valueAsNumber: true })} />
              </Field>
            </div>
          </Section>

          <Card>
            <CardHeader
              title="Estimated route duration and fees"
              description={`For a ${formatUsd(Number(values.defaultAmount) || 0)} deposit delivered as ${values.destAsset} on ${NETWORKS[values.destNetwork as NetworkId]?.label}.`}
              actions={<DemoTag>Illustrative</DemoTag>}
            />
            <div className="scrollbar-thin overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-sub">
                    <th className="border-y border-stroke-soft bg-surface px-5 py-2 text-left font-medium">Source</th>
                    <th className="border-y border-stroke-soft bg-surface px-3 py-2 text-left font-medium">Example route</th>
                    <th className="border-y border-stroke-soft bg-surface px-3 py-2 text-right font-medium">Time</th>
                    <th className="border-y border-stroke-soft bg-surface px-5 py-2 text-right font-medium">Fees</th>
                  </tr>
                </thead>
                <tbody>
                  {METHOD_ORDER.filter((m) => values.sources?.[m]).map((m) => {
                    const rep = representative(m, values);
                    const q =
                      rep && Number(values.defaultAmount) > 0
                        ? planRoute({
                            method: m,
                            sourceAsset: rep.asset,
                            sourceNetwork: rep.network,
                            exchange: "coinbase",
                            destAsset: values.destAsset as AssetId,
                            destNetwork: values.destNetwork as NetworkId,
                            amountUsd: Number(values.defaultAmount),
                          })
                        : null;
                    return (
                      <tr key={m} className="border-b border-stroke-soft last:border-0">
                        <td className="border-b border-stroke-soft px-5 py-2.5 text-strong">{METHODS[m].label}</td>
                        <td className="border-b border-stroke-soft px-3 py-2.5 text-sub">
                          {q && rep ? (
                            <span>
                              {m === "card" ? "Card" : `${rep.asset} on ${NETWORKS[rep.network!].label}`}
                              {m === "exchange" && ` via ${EXCHANGES.coinbase.label}`} → {q.steps.map((s) => s.kind).filter((k) => k === "swap" || k === "bridge").join(" + ") || "direct"}
                            </span>
                          ) : (
                            "No compatible asset and network"
                          )}
                        </td>
                        <td className="border-b border-stroke-soft px-3 py-2.5 text-right font-mono text-[13px] text-strong">{q ? `~${formatDuration(q.estimatedSec)}` : "—"}</td>
                        <td className="border-b border-stroke-soft px-5 py-2.5 text-right font-mono text-[13px] text-strong">{q ? formatUsd(q.totalFee) : "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        <div className="xl:sticky xl:top-20">
          <Card className="overflow-hidden">
            <CardHeader
              title="Live preview"
              description="Updates as you edit. Try a payment right here."
              actions={
                <Button type="button" size="sm" variant="ghost" onClick={() => openPreview("checkout", isDirty ? draft : undefined)}>
                  <Maximize2 /> Full preview
                </Button>
              }
            />
            <div className="hatch-neutral flex justify-center border-y border-stroke-soft px-4 py-6">
              <CheckoutWidget
                config={draft}
                controls={{ outcome: previewOutcome, failureKey: "slippage", speed: "fast", customer: "preview@example.com" }}
              />
            </div>
            <div className="flex items-center justify-between gap-3 px-5 py-3">
              <span className="text-xs text-sub">Next test payment</span>
              <Segmented
                size="sm"
                aria-label="Next test payment outcome"
                value={previewOutcome}
                onValueChange={setPreviewOutcome}
                options={[
                  { value: "success", label: "Succeeds" },
                  { value: "failure", label: "Fails" },
                ]}
              />
            </div>
          </Card>
        </div>
      </div>

      {isDirty && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-stroke-soft bg-default/95 backdrop-blur lg:left-60">
          <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
            <p className="text-sm text-sub">
              <span className="font-medium text-strong">Unsaved changes.</span> The preview shows your draft.
            </p>
            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={() => reset(saved as FormValues)}>
                Discard
              </Button>
              <Button type="submit" variant="primary">
                Save changes
              </Button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmReset}
        onOpenChange={setConfirmReset}
        title="Reset checkout to default?"
        description="Sources, assets, networks, appearance, and amounts return to the default demo configuration. You can still discard before saving."
        confirmLabel="Reset to default"
        tone="primary"
        onConfirm={() => {
          reset(saved as FormValues);
          (Object.keys(DEFAULT_CHECKOUT) as (keyof FormValues)[]).forEach((k) =>
            setValue(k, DEFAULT_CHECKOUT[k] as never, { shouldDirty: true, shouldValidate: true }),
          );
          toast.info("Default configuration restored", { description: "Save changes to apply it." });
        }}
      />
    </form>
  );
}
