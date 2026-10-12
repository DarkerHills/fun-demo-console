"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ExternalLink, MoreHorizontal, Plus, ShieldCheck, Trash2, UserPlus } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { Controller, useForm, type DefaultValues, type FieldValues, type UseFormReturn } from "react-hook-form";
import { z } from "zod";
import { WORKSPACE } from "@/lib/data/catalog";
import type { Role, TeamMember } from "@/lib/data/types";
import { formatRelative } from "@/lib/format";
import { useNow, useViewState } from "@/lib/hooks/use-data";
import { useUrlState } from "@/lib/hooks/use-url-state";
import { useDemo } from "@/lib/store/demo-store";
import { toast } from "@/lib/store/toast-store";
import { cn, readableOn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { MonoValue } from "@/components/ui/code";
import { Segmented, Select, Switch, Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/controls";
import { PageHeader } from "@/components/ui/data";
import { DemoTag } from "@/components/ui/domain";
import { ErrorState } from "@/components/ui/feedback";
import { Field, Input, Textarea } from "@/components/ui/field";
import { ConfirmDialog, Dialog, DialogContent, DialogFooter, Menu, MenuContent, MenuItem, MenuTrigger, Tooltip } from "@/components/ui/overlays";
import { PageSkeleton } from "@/components/shell/shell-skeleton";

const TABS = ["workspace", "team", "notifications", "branding", "security"] as const;
type Tab = (typeof TABS)[number];

/** Shared save/cancel footer: enabled only when there's something to save. */
function FormFooter<T extends FieldValues>({ form, note }: { form: UseFormReturn<T>; note?: string }) {
  const { isDirty, isSubmitting } = form.formState;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-stroke-soft px-5 py-3">
      <p className="text-xs text-sub">{isDirty ? "You have unsaved changes." : note ?? "All changes saved."}</p>
      <div className="flex gap-2">
        <Button type="button" variant="secondary" disabled={!isDirty} onClick={() => form.reset()}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" disabled={!isDirty} loading={isSubmitting}>
          Save changes
        </Button>
      </div>
    </div>
  );
}

function useSettingsForm<S extends z.ZodType<FieldValues, FieldValues>>(schema: S, values: z.infer<S>) {
  return useForm<z.infer<S>>({
    resolver: zodResolver(schema as never),
    defaultValues: values as DefaultValues<z.infer<S>>,
    mode: "onBlur",
  });
}

const fakeSave = () => new Promise((r) => setTimeout(r, 450));

/* ───────────────────────── Workspace ───────────────────────── */

const workspaceSchema = z.object({
  name: z.string().trim().min(2, "Use at least 2 characters").max(40, "Keep it under 40 characters"),
  legalName: z.string().trim().min(2, "Enter the legal entity name"),
  supportEmail: z.email("Enter a valid email, like support@novamarkets.example"),
  website: z.url({ protocol: /^https$/, error: "Enter a full https:// URL" }),
  timezone: z.string(),
  currency: z.enum(["USD", "EUR", "GBP"]),
});

function WorkspaceTab() {
  const workspace = useDemo((s) => s.workspace);
  const save = useDemo((s) => s.saveWorkspace);
  const form = useSettingsForm(workspaceSchema, workspace);
  const { register, control, handleSubmit, formState } = form;
  const e = formState.errors;
  return (
    <Card>
      <CardHeader title="Workspace details" description="How Nova Markets appears to your team and on receipts." />
      <form
        noValidate
        onSubmit={handleSubmit(async (v) => {
          await fakeSave();
          save(v);
          form.reset(v);
          toast.success("Workspace settings saved");
        })}
      >
        <div className="grid grid-cols-1 gap-4 px-5 pb-5 sm:grid-cols-2">
          <Field label="Workspace name" htmlFor="ws-name" error={e.name?.message}>
            <Input id="ws-name" aria-invalid={!!e.name} {...register("name")} />
          </Field>
          <Field label="Legal entity" htmlFor="ws-legal" error={e.legalName?.message}>
            <Input id="ws-legal" aria-invalid={!!e.legalName} {...register("legalName")} />
          </Field>
          <Field label="Support email" htmlFor="ws-email" error={e.supportEmail?.message} hint="Shown to customers on failed payments">
            <Input id="ws-email" type="email" aria-invalid={!!e.supportEmail} {...register("supportEmail")} />
          </Field>
          <Field label="Website" htmlFor="ws-web" error={e.website?.message}>
            <Input id="ws-web" type="url" aria-invalid={!!e.website} {...register("website")} />
          </Field>
          <Field label="Reporting time zone" htmlFor="ws-tz">
            <Controller
              control={control}
              name="timezone"
              render={({ field }) => (
                <Select
                  id="ws-tz"
                  value={field.value}
                  onValueChange={(v) => field.onChange(v)}
                  options={["America/New_York", "America/Los_Angeles", "Europe/London", "Europe/Berlin", "Asia/Singapore", "UTC"].map((t) => ({ value: t, label: t.replace("_", " ") }))}
                />
              )}
            />
          </Field>
          <Field label="Reporting currency" htmlFor="ws-cur">
            <Controller
              control={control}
              name="currency"
              render={({ field }) => (
                <Select
                  id="ws-cur"
                  value={field.value}
                  onValueChange={(v) => field.onChange(v)}
                  options={[
                    { value: "USD", label: "USD — US dollar" },
                    { value: "EUR", label: "EUR — Euro" },
                    { value: "GBP", label: "GBP — British pound" },
                  ]}
                />
              )}
            />
          </Field>
          <div className="sm:col-span-2">
            <p className="text-sm font-medium text-strong">Workspace ID</p>
            <MonoValue value={WORKSPACE.id} copyLabel="Workspace ID" className="mt-1" />
          </div>
        </div>
        <FormFooter form={form} />
      </form>
    </Card>
  );
}

/* ───────────────────────── Team ───────────────────────── */

const ROLES: { value: Role; description: string }[] = [
  { value: "Admin", description: "Everything except billing and ownership" },
  { value: "Developer", description: "API keys, webhooks, integrations" },
  { value: "Analyst", description: "Read-only payments and analytics" },
  { value: "Viewer", description: "Read-only overview" },
];

function InviteDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const team = useDemo((s) => s.team);
  const invite = useDemo((s) => s.inviteMember);
  const schema = React.useMemo(
    () =>
      z.object({
        email: z
          .email("Enter a valid email address")
          .refine((v) => !team.some((m) => m.email.toLowerCase() === v.toLowerCase()), "This person is already on the team"),
        role: z.enum(["Admin", "Developer", "Analyst", "Viewer"]),
      }),
    [team],
  );
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { email: "", role: "Developer" } });
  React.useEffect(() => {
    if (open) form.reset({ email: "", role: "Developer" });
  }, [open, form]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Invite a teammate" description="They'll get an email invite. In this demo, no email is sent.">
        <form
          noValidate
          onSubmit={form.handleSubmit((v) => {
            invite(v.email, v.role);
            toast.success("Invite sent", { description: `${v.email} · ${v.role}. Simulated — no email was sent.` });
            onOpenChange(false);
          })}
        >
          <div className="space-y-4 px-5 py-4">
            <Field label="Email" htmlFor="inv-email" error={form.formState.errors.email?.message}>
              <Input id="inv-email" type="email" autoFocus placeholder="name@novamarkets.example" aria-invalid={!!form.formState.errors.email} {...form.register("email")} />
            </Field>
            <Field label="Role" htmlFor="inv-role">
              <Controller
                control={form.control}
                name="role"
                render={({ field }) => (
                  <Select id="inv-role" value={field.value} onValueChange={field.onChange} options={ROLES.map((r) => ({ value: r.value, label: r.value, description: r.description }))} />
                )}
              />
            </Field>
          </div>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              <UserPlus /> Send invite
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function TeamTab() {
  const team = useDemo((s) => s.team);
  const updateRole = useDemo((s) => s.updateRole);
  const removeMember = useDemo((s) => s.removeMember);
  const now = useNow(60_000);
  const [inviteOpen, setInviteOpen] = React.useState(false);
  const [removing, setRemoving] = React.useState<TeamMember | null>(null);
  return (
    <Card className="overflow-hidden">
      <CardHeader
        title="Team members"
        description={`${team.filter((m) => m.status === "active").length} active · ${team.filter((m) => m.status === "invited").length} invited`}
        actions={
          <Button variant="primary" size="sm" onClick={() => setInviteOpen(true)}>
            <Plus /> Invite
          </Button>
        }
      />
      <ul className="divide-y divide-stroke-soft border-t border-stroke-soft">
        {team.map((m) => {
          const owner = m.role === "Owner";
          return (
            <li key={m.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-layer text-xs font-semibold text-sub">
                {(m.name || m.email).split(/[\s@.]/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("")}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-strong">
                  {m.name || m.email}
                  {m.status === "invited" && (
                    <Badge tone="warning" className="ml-2 align-middle">
                      Invited
                    </Badge>
                  )}
                </p>
                <p className="truncate text-xs text-sub">
                  {m.name ? `${m.email} · ` : ""}
                  {m.lastActiveAt ? `Active ${formatRelative(m.lastActiveAt, now)}` : "Hasn't joined yet"}
                </p>
              </div>
              {owner ? (
                <Tooltip content="Transfer ownership from billing settings (not in demo)">
                  <span className="w-[140px]">
                    <Badge tone="feature">Owner</Badge>
                  </span>
                </Tooltip>
              ) : (
                <Select
                  size="sm"
                  aria-label={`Role for ${m.email}`}
                  className="w-[140px]"
                  value={m.role}
                  onValueChange={(v) => {
                    updateRole(m.id, v as Role);
                    toast.success("Role updated", { description: `${m.name || m.email} is now ${v}.` });
                  }}
                  options={ROLES.map((r) => ({ value: r.value, label: r.value, description: r.description }))}
                />
              )}
              <Menu>
                <MenuTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label={`Actions for ${m.email}`} disabled={owner}>
                    <MoreHorizontal />
                  </Button>
                </MenuTrigger>
                <MenuContent>
                  <MenuItem tone="danger" onSelect={() => setRemoving(m)}>
                    <Trash2 /> {m.status === "invited" ? "Cancel invite" : "Remove from team"}
                  </MenuItem>
                </MenuContent>
              </Menu>
            </li>
          );
        })}
      </ul>
      <InviteDialog open={inviteOpen} onOpenChange={setInviteOpen} />
      <ConfirmDialog
        open={!!removing}
        onOpenChange={(o) => !o && setRemoving(null)}
        title={removing?.status === "invited" ? "Cancel this invite?" : `Remove ${removing?.name || removing?.email}?`}
        description="They lose access to the Nova Markets console immediately."
        confirmLabel={removing?.status === "invited" ? "Cancel invite" : "Remove"}
        onConfirm={() => {
          if (!removing) return;
          removeMember(removing.id);
          toast.success(removing.status === "invited" ? "Invite cancelled" : "Member removed");
        }}
      />
    </Card>
  );
}

/* ───────────────────────── Notifications ───────────────────────── */

const emailList = z
  .string()
  .trim()
  .min(1, "Add at least one recipient")
  .refine((v) => v.split(",").map((s) => s.trim()).filter(Boolean).every((e) => z.email().safeParse(e).success), "Separate valid emails with commas");

const notificationsSchema = z.object({
  failedPayments: z.boolean(),
  failedThreshold: z.number({ error: "Enter a number" }).int("Use a whole number").min(1, "Use 1 or more").max(100, "Use 100 or fewer"),
  delayedPayments: z.boolean(),
  webhookFailures: z.boolean(),
  dailySummary: z.boolean(),
  summaryTime: z.string(),
  weeklyReport: z.boolean(),
  channel: z.enum(["email", "slack", "both"]),
  recipients: emailList,
});

function ToggleRow({
  title,
  description,
  checked,
  onChange,
  children,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  children?: React.ReactNode;
}) {
  const id = React.useId();
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 px-5 py-4">
      <div className="min-w-0 flex-1">
        <label htmlFor={id} className="text-sm font-medium text-strong">
          {title}
        </label>
        <p className="text-xs text-sub">{description}</p>
        {checked && children && <div className="mt-3">{children}</div>}
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function NotificationsTab() {
  const notifications = useDemo((s) => s.notifications);
  const save = useDemo((s) => s.saveNotifications);
  const form = useSettingsForm(notificationsSchema, notifications);
  const { control, register, handleSubmit, formState, watch } = form;
  const v = watch();
  const e = formState.errors;
  const sw = (name: "failedPayments" | "delayedPayments" | "webhookFailures" | "dailySummary" | "weeklyReport") => ({
    checked: v[name],
    onChange: (val: boolean) => form.setValue(name, val, { shouldDirty: true }),
  });
  return (
    <Card>
      <CardHeader title="Notifications" description="Who hears about payment problems, and how." />
      <form
        noValidate
        onSubmit={handleSubmit(async (val) => {
          await fakeSave();
          save(val);
          form.reset(val);
          toast.success("Notification preferences saved");
        })}
      >
        <div className="divide-y divide-stroke-soft border-t border-stroke-soft">
          <ToggleRow title="Failed payment alerts" description="Alert when failures cross a threshold within an hour." {...sw("failedPayments")}>
            <Field label="Alert after" htmlFor="n-threshold" error={e.failedThreshold?.message} className="max-w-[200px]">
              <Input id="n-threshold" type="number" aria-invalid={!!e.failedThreshold} trailing={<span className="pr-2 text-xs text-sub">failures</span>} {...register("failedThreshold", { valueAsNumber: true })} />
            </Field>
          </ToggleRow>
          <ToggleRow title="Delayed payment alerts" description="When a payment runs 10 minutes past its route estimate." {...sw("delayedPayments")} />
          <ToggleRow title="Webhook delivery failures" description="When an event fails all retry attempts." {...sw("webhookFailures")} />
          <ToggleRow title="Daily summary" description="Volume, success rate, and top failure reasons." {...sw("dailySummary")}>
            <Field label="Send at" htmlFor="n-time" className="max-w-[200px]">
              <Controller
                control={control}
                name="summaryTime"
                render={({ field }) => (
                  <Select id="n-time" value={field.value} onValueChange={field.onChange} options={["07:00", "08:00", "09:00", "12:00", "17:00"].map((t) => ({ value: t, label: t }))} />
                )}
              />
            </Field>
          </ToggleRow>
          <ToggleRow title="Weekly report" description="A PDF snapshot every Monday morning." {...sw("weeklyReport")} />
          <div className="grid grid-cols-1 gap-4 px-5 py-4 sm:grid-cols-2">
            <Field label="Channel" htmlFor="n-channel">
              <Controller
                control={control}
                name="channel"
                render={({ field }) => (
                  <Segmented
                    aria-label="Notification channel"
                    className="self-start"
                    value={field.value}
                    onValueChange={field.onChange}
                    options={[
                      { value: "email", label: "Email" },
                      { value: "slack", label: "Slack" },
                      { value: "both", label: "Both" },
                    ]}
                  />
                )}
              />
            </Field>
            <Field label="Email recipients" htmlFor="n-recipients" error={e.recipients?.message} hint="Comma-separated">
              <Input id="n-recipients" aria-invalid={!!e.recipients} {...register("recipients")} />
            </Field>
          </div>
        </div>
        <FormFooter form={form} note="Alerts are simulated — nothing is sent." />
      </form>
    </Card>
  );
}

/* ───────────────────────── Branding ───────────────────────── */

const brandingSchema = z.object({
  brandName: z.string().trim().min(2, "Use at least 2 characters").max(32, "Keep it under 32 characters"),
  accent: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Use a 6-digit hex color, like #7D52F4"),
  theme: z.enum(["light", "dark"]),
});

function BrandingTab() {
  const checkout = useDemo((s) => s.checkout);
  const saveCheckout = useDemo((s) => s.saveCheckout);
  const form = useSettingsForm(brandingSchema, { brandName: checkout.brandName, accent: checkout.accent, theme: checkout.theme });
  const { register, control, handleSubmit, formState, watch } = form;
  const v = watch();
  const valid = /^#[0-9a-fA-F]{6}$/.test(v.accent);
  return (
    <Card>
      <CardHeader
        title="Checkout branding"
        description="Shared with the Checkout page — changes here update the customer checkout."
        actions={
          <Button asChild variant="ghost" size="sm">
            <Link href="/checkout">
              <ExternalLink /> All checkout settings
            </Link>
          </Button>
        }
      />
      <form
        noValidate
        onSubmit={handleSubmit(async (val) => {
          await fakeSave();
          saveCheckout({ ...checkout, ...val });
          form.reset(val);
          toast.success("Branding saved", { description: "Checkout uses the new brand on the next session." });
        })}
      >
        <div className="grid grid-cols-1 gap-5 px-5 pb-5 md:grid-cols-[1fr_260px]">
          <div className="space-y-4">
            <Field label="Brand name" htmlFor="b-name" error={formState.errors.brandName?.message}>
              <Input id="b-name" aria-invalid={!!formState.errors.brandName} {...register("brandName")} />
            </Field>
            <Field label="Accent color" htmlFor="b-accent" error={formState.errors.accent?.message}>
              <div className="flex items-center gap-2">
                <span className="size-8 shrink-0 rounded-sm border border-stroke-mild" style={{ background: valid ? v.accent : "transparent" }} aria-hidden />
                <Input id="b-accent" className="font-mono uppercase" aria-invalid={!!formState.errors.accent} {...register("accent")} />
              </div>
            </Field>
            <Field label="Checkout theme" htmlFor="b-theme">
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
          </div>
          <div data-theme={v.theme} className="rounded-md border border-stroke-soft bg-default p-4 shadow-xs" aria-label="Branding preview">
            <div className="flex items-center gap-2">
              <span className="grid size-7 place-items-center rounded-sm bg-weak text-xs font-semibold text-inverse">{(v.brandName || "N").charAt(0)}</span>
              <span className="text-sm font-medium text-strong">Deposit to {v.brandName || "…"}</span>
            </div>
            <p className="mt-4 text-[28px] leading-9 font-medium text-strong">$250.00</p>
            <button
              type="button"
              tabIndex={-1}
              className="mt-4 h-10 w-full rounded-sm text-sm font-medium"
              style={{ background: valid ? v.accent : "var(--bg-muted)", color: valid ? readableOn(v.accent) : "var(--text-sub)" }}
            >
              Continue
            </button>
          </div>
        </div>
        <FormFooter form={form} />
      </form>
    </Card>
  );
}

/* ───────────────────────── Security ───────────────────────── */

const ipLine = /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}(\/([0-9]|[12]\d|3[0-2]))?$/;

const securitySchema = z.object({
  require2fa: z.boolean(),
  sessionTimeout: z.enum(["15", "30", "60", "240"]),
  ipAllowlist: z.string().refine(
    (v) => v.split("\n").map((l) => l.trim()).filter(Boolean).every((l) => ipLine.test(l)),
    "Each line must be an IPv4 address or CIDR range, like 203.0.113.0/24",
  ),
  prodKeyApproval: z.boolean(),
});

function SecurityTab() {
  const security = useDemo((s) => s.security);
  const save = useDemo((s) => s.saveSecurity);
  const form = useSettingsForm(securitySchema, security);
  const { control, register, handleSubmit, formState, watch } = form;
  const v = watch();
  return (
    <Card>
      <CardHeader title="Security" description="Access controls for the Nova Markets console." actions={<DemoTag>Simulated controls</DemoTag>} />
      <form
        noValidate
        onSubmit={handleSubmit(async (val) => {
          await fakeSave();
          save(val);
          form.reset(val);
          toast.success("Security settings saved");
        })}
      >
        <div className="divide-y divide-stroke-soft border-t border-stroke-soft">
          <ToggleRow
            title="Require two-factor authentication"
            description="Everyone on the team must use 2FA to sign in."
            checked={v.require2fa}
            onChange={(val) => form.setValue("require2fa", val, { shouldDirty: true })}
          />
          <ToggleRow
            title="Approve production keys"
            description="An owner must approve new production API keys."
            checked={v.prodKeyApproval}
            onChange={(val) => form.setValue("prodKeyApproval", val, { shouldDirty: true })}
          />
          <div className="grid grid-cols-1 gap-4 px-5 py-4 sm:grid-cols-2">
            <Field label="Sign out after inactivity" htmlFor="s-timeout">
              <Controller
                control={control}
                name="sessionTimeout"
                render={({ field }) => (
                  <Select
                    id="s-timeout"
                    value={field.value}
                    onValueChange={field.onChange}
                    options={[
                      { value: "15", label: "15 minutes" },
                      { value: "30", label: "30 minutes" },
                      { value: "60", label: "1 hour" },
                      { value: "240", label: "4 hours" },
                    ]}
                  />
                )}
              />
            </Field>
            <Field
              label="IP allowlist for API keys"
              htmlFor="s-ips"
              optional
              error={formState.errors.ipAllowlist?.message}
              hint="One IPv4 address or CIDR range per line. Leave empty to allow any IP."
              className="sm:col-span-2"
            >
              <Textarea id="s-ips" rows={4} className="font-mono text-[13px]" placeholder={"203.0.113.10\n198.51.100.0/24"} aria-invalid={!!formState.errors.ipAllowlist} {...register("ipAllowlist")} />
            </Field>
          </div>
          <div className="flex items-center gap-2 px-5 py-3 text-xs text-sub">
            <ShieldCheck className="size-4 text-success-base" aria-hidden />
            Last security review: 2FA enabled for 4 of 4 active members.
          </div>
        </div>
        <FormFooter form={form} />
      </form>
    </Card>
  );
}

export function SettingsView() {
  const { searchParams, setParam } = useUrlState();
  const raw = searchParams.get("tab") as Tab | null;
  const tab: Tab = raw && TABS.includes(raw) ? raw : "workspace";
  const { state, retry } = useViewState();

  return (
    <div className="space-y-5">
      <PageHeader title="Settings" description="Workspace details, team access, alerts, branding, and security for Nova Markets." />
      {state === "loading" ? (
        <div className="-mx-4 -mt-6 sm:-mx-6 lg:-mx-8">
          <PageSkeleton variant="form" />
        </div>
      ) : state === "error" ? (
        <Card>
          <ErrorState onRetry={retry} />
        </Card>
      ) : (
        <Tabs value={tab} onValueChange={(v) => setParam("tab", v === "workspace" ? null : v)}>
          <TabsList>
            <TabsTrigger value="workspace">Workspace</TabsTrigger>
            <TabsTrigger value="team">Team</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="branding">Branding</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
          </TabsList>
          <div className={cn("mt-5 max-w-3xl")}>
            <TabsContent value="workspace">
              <WorkspaceTab />
            </TabsContent>
            <TabsContent value="team">
              <TeamTab />
            </TabsContent>
            <TabsContent value="notifications">
              <NotificationsTab />
            </TabsContent>
            <TabsContent value="branding">
              <BrandingTab />
            </TabsContent>
            <TabsContent value="security">
              <SecurityTab />
            </TabsContent>
          </div>
        </Tabs>
      )}
    </div>
  );
}
