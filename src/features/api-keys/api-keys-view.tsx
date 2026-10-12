"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle, Ban, Check, Copy, Eye, EyeOff, KeyRound, MoreHorizontal, Plus } from "lucide-react";
import * as React from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import type { ApiKey, ApiKeyType, Env } from "@/lib/data/types";
import { formatDate, formatRelative } from "@/lib/format";
import { useCopy } from "@/lib/hooks/use-copy";
import { useNow, useViewState } from "@/lib/hooks/use-data";
import { useDemo } from "@/lib/store/demo-store";
import { toast } from "@/lib/store/toast-store";
import { cn, maskSecret } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox, Segmented, Select } from "@/components/ui/controls";
import { PageHeader, Table, Td, Th } from "@/components/ui/data";
import { EnvBadge } from "@/components/ui/domain";
import { Callout, EmptyState, ErrorState } from "@/components/ui/feedback";
import { Field, Input } from "@/components/ui/field";
import { ConfirmDialog, Dialog, DialogContent, DialogFooter, Menu, MenuContent, MenuItem, MenuTrigger } from "@/components/ui/overlays";
import { PageSkeleton } from "@/components/shell/shell-skeleton";

const createSchema = z.object({
  name: z.string().trim().min(3, "Use at least 3 characters").max(40, "Keep it under 40 characters"),
  env: z.enum(["sandbox", "production"]),
  type: z.enum(["secret", "publishable"]),
});
type CreateValues = z.infer<typeof createSchema>;

function KeyValue({ k }: { k: ApiKey }) {
  const [shown, setShown] = React.useState(false);
  const { copied, copy } = useCopy();
  const revoked = !!k.revokedAt;
  return (
    <span className="flex items-center gap-0.5">
      <span className={cn("max-w-[240px] truncate font-mono text-[13px]", revoked ? "text-sub line-through" : "text-strong")}>
        {shown ? k.value : maskSecret(k.value)}
      </span>
      {!revoked && (
        <>
          <Button variant="ghost" size="icon-sm" aria-label={shown ? `Hide ${k.name} key` : `Reveal ${k.name} key`} onClick={() => setShown((s) => !s)}>
            {shown ? <EyeOff /> : <Eye />}
          </Button>
          <Button variant="ghost" size="icon-sm" aria-label={`Copy ${k.name} key`} onClick={() => copy(k.value, "Key")}>
            {copied ? <Check className="text-success-base" /> : <Copy />}
          </Button>
        </>
      )}
    </span>
  );
}

function CreateKeyDialog({ open, onOpenChange, defaultEnv }: { open: boolean; onOpenChange: (o: boolean) => void; defaultEnv: Env }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Mounted per opening so the form always starts fresh. */}
      {open && <CreateKeyBody onOpenChange={onOpenChange} defaultEnv={defaultEnv} />}
    </Dialog>
  );
}

function CreateKeyBody({ onOpenChange, defaultEnv }: { onOpenChange: (o: boolean) => void; defaultEnv: Env }) {
  const createKey = useDemo((s) => s.createKey);
  const approval = useDemo((s) => s.security.prodKeyApproval);
  const [created, setCreated] = React.useState<ApiKey | null>(null);
  const [ack, setAck] = React.useState(false);
  const { copied, copy } = useCopy();
  const form = useForm<CreateValues>({
    resolver: zodResolver(createSchema),
    defaultValues: { name: "", env: defaultEnv, type: "secret" },
  });
  const { register, handleSubmit, control, formState } = form;
  const envValue = useWatch({ control, name: "env" });

  const submit = (v: CreateValues) => {
    const key = createKey({ name: v.name, env: v.env, type: v.type as ApiKeyType });
    setCreated(key);
    toast.success("API key created", { description: `${v.name} · ${v.env}. Simulated placeholder — it can't authenticate.` });
  };

  return (
    <>
      <DialogContent title={created ? "Copy your new key" : "Create API key"} description={created ? "Store it somewhere safe. In a real console it would only be shown once." : "Keys are placeholders generated in your browser."}>
        {created ? (
          <>
            <div className="space-y-4 px-5 py-4">
              <div className="flex items-center gap-2 rounded-sm border border-stroke-soft bg-surface px-3 py-2">
                <span className="min-w-0 flex-1 truncate font-mono text-[13px] text-strong">{created.value}</span>
                <Button size="sm" variant="secondary" onClick={() => copy(created.value, "Key")}>
                  {copied ? <Check className="text-success-base" /> : <Copy />} {copied ? "Copied" : "Copy"}
                </Button>
              </div>
              <label className="flex items-center gap-2 text-sm text-strong">
                <Checkbox checked={ack} onCheckedChange={(v) => setAck(v === true)} />
                I&apos;ve copied this key
              </label>
            </div>
            <DialogFooter>
              <Button variant="primary" disabled={!ack} onClick={() => onOpenChange(false)}>
                Done
              </Button>
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={handleSubmit(submit)} noValidate>
            <div className="space-y-4 px-5 py-4">
              <Field label="Name" htmlFor="key-name" error={formState.errors.name?.message} hint="Describe where it's used, like “Checkout backend”">
                <Input id="key-name" autoFocus aria-invalid={!!formState.errors.name} {...register("name")} />
              </Field>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Environment" htmlFor="key-env">
                  <Controller
                    control={control}
                    name="env"
                    render={({ field }) => (
                      <Select
                        id="key-env"
                        value={field.value}
                        onValueChange={field.onChange}
                        options={[
                          { value: "sandbox", label: "Sandbox" },
                          { value: "production", label: "Production" },
                        ]}
                      />
                    )}
                  />
                </Field>
                <Field label="Type" htmlFor="key-type">
                  <Controller
                    control={control}
                    name="type"
                    render={({ field }) => (
                      <Select
                        id="key-type"
                        value={field.value}
                        onValueChange={field.onChange}
                        options={[
                          { value: "secret", label: "Secret", description: "Server-side only" },
                          { value: "publishable", label: "Publishable", description: "Safe for browsers" },
                        ]}
                      />
                    )}
                  />
                </Field>
              </div>
              {envValue === "production" && approval && (
                <Callout tone="info">Your security settings require owner approval for production keys. In this demo, approval is granted automatically.</Callout>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary">
                Create key
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </>
  );
}

export function ApiKeysView() {
  const keys = useDemo((s) => s.apiKeys);
  const env = useDemo((s) => s.env);
  const revokeKey = useDemo((s) => s.revokeKey);
  const now = useNow(30_000);
  const { state, retry } = useViewState();
  const [filter, setFilter] = React.useState<"all" | Env>("all");
  const [createOpen, setCreateOpen] = React.useState(false);
  const [revoking, setRevoking] = React.useState<ApiKey | null>(null);
  const [confirmText, setConfirmText] = React.useState("");

  const rows = keys
    .filter((k) => filter === "all" || k.env === filter)
    .sort((a, b) => Number(!!a.revokedAt) - Number(!!b.revokedAt) || b.createdAt - a.createdAt);

  return (
    <div className="space-y-5">
      <PageHeader
        title="API keys"
        description="Credentials your servers and web app use to talk to Fun."
        actions={
          <Button variant="primary" onClick={() => setCreateOpen(true)}>
            <Plus /> Create key
          </Button>
        }
      />

      <Callout tone="warning" title="Demo credentials only" icon={<AlertTriangle className="text-warning-base" />}>
        Every key on this page is a placeholder generated in your browser. None of them can authenticate with Fun or any other service, and
        nothing here is a live credential.
      </Callout>

      {state === "loading" ? (
        <div className="-mx-4 -mt-6 sm:-mx-6 lg:-mx-8">
          <PageSkeleton variant="table" />
        </div>
      ) : state === "error" ? (
        <Card>
          <ErrorState onRetry={retry} />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-3">
            <Segmented
              size="sm"
              aria-label="Filter keys by environment"
              value={filter}
              onValueChange={setFilter}
              options={[
                { value: "all", label: `All (${keys.length})` },
                { value: "sandbox", label: "Sandbox" },
                { value: "production", label: "Production" },
              ]}
            />
            <span className="text-xs text-sub">Revoked keys stay listed for audit.</span>
          </div>
          {rows.length ? (
            <Table aria-label="API keys">
              <thead>
                <tr>
                  <Th className="border-l-0">Name</Th>
                  <Th>Key</Th>
                  <Th>Environment</Th>
                  <Th className="hidden xl:table-cell">Created</Th>
                  <Th>Last used</Th>
                  <Th className="border-r-0">
                    <span className="sr-only">Actions</span>
                  </Th>
                </tr>
              </thead>
              <tbody>
                {rows.map((k) => (
                  <tr key={k.id} className={cn(k.revokedAt && "bg-surface/60")}>
                    <Td>
                      <div className="flex items-center gap-2">
                        <KeyRound className={cn("size-4", k.revokedAt ? "text-soft" : "text-sub")} aria-hidden />
                        <span className={cn("font-medium", k.revokedAt ? "text-sub" : "text-strong")}>{k.name}</span>
                        <Badge tone="neutral" variant="stroke">
                          {k.type === "secret" ? "Secret" : "Publishable"}
                        </Badge>
                        {k.revokedAt && <Badge tone="error">Revoked {formatRelative(k.revokedAt, now)}</Badge>}
                      </div>
                    </Td>
                    <Td>
                      <KeyValue k={k} />
                    </Td>
                    <Td>
                      <EnvBadge env={k.env} />
                    </Td>
                    <Td className="hidden text-sub xl:table-cell">{formatDate(k.createdAt)}</Td>
                    <Td className="text-sub">{k.lastUsedAt ? formatRelative(k.lastUsedAt, now) : "Never"}</Td>
                    <Td align="right">
                      {!k.revokedAt && (
                        <Menu>
                          <MenuTrigger asChild>
                            <Button variant="ghost" size="icon" aria-label={`Actions for ${k.name}`}>
                              <MoreHorizontal />
                            </Button>
                          </MenuTrigger>
                          <MenuContent>
                            <MenuItem
                              onSelect={() => {
                                navigator.clipboard?.writeText(k.value).then(() => toast.success("Key copied", { duration: 2200 }));
                              }}
                            >
                              <Copy /> Copy key
                            </MenuItem>
                            <MenuItem
                              tone="danger"
                              onSelect={() => {
                                setConfirmText("");
                                setRevoking(k);
                              }}
                            >
                              <Ban /> Revoke key
                            </MenuItem>
                          </MenuContent>
                        </Menu>
                      )}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <EmptyState
              icon={<KeyRound />}
              title={`No ${filter} keys yet`}
              description="Create a key to connect a server or web app."
              action={
                <Button variant="primary" onClick={() => setCreateOpen(true)}>
                  <Plus /> Create key
                </Button>
              }
            />
          )}
        </Card>
      )}

      <CreateKeyDialog open={createOpen} onOpenChange={setCreateOpen} defaultEnv={env} />

      <ConfirmDialog
        open={!!revoking}
        onOpenChange={(o) => !o && setRevoking(null)}
        title={`Revoke “${revoking?.name}”?`}
        description={
          <>
            Anything using this {revoking?.env} {revoking?.type} key stops working immediately. This can&apos;t be undone — you&apos;d create a new key
            instead.
          </>
        }
        confirmLabel="Revoke key"
        confirmDisabled={revoking?.env === "production" && confirmText !== "revoke"}
        onConfirm={() => {
          if (!revoking) return;
          revokeKey(revoking.id);
          toast.success("Key revoked", { description: `${revoking.name} can no longer be used.` });
          setRevoking(null);
        }}
      >
        {revoking?.env === "production" && (
          <Field label={<>Type <span className="font-mono">revoke</span> to confirm</>} htmlFor="revoke-confirm">
            <Input id="revoke-confirm" value={confirmText} onChange={(e) => setConfirmText(e.target.value)} autoComplete="off" />
          </Field>
        )}
      </ConfirmDialog>
    </div>
  );
}
