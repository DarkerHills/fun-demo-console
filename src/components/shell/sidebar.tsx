"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Check, ChevronsUpDown, RotateCcw } from "lucide-react";
import * as React from "react";
import { useEvents, useNow, useTransactions } from "@/lib/hooks/use-data";
import { useDemo } from "@/lib/store/demo-store";
import { toast } from "@/lib/store/toast-store";
import { cn } from "@/lib/utils";
import { Tooltip } from "@/components/ui/overlays";
import { ConfirmDialog, Menu, MenuContent, MenuItem, MenuLabel, MenuTrigger } from "@/components/ui/overlays";
import { NAV, SETTINGS_NAV, type NavItem } from "./nav";

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-baseline gap-0.5 font-semibold tracking-[-0.04em] text-strong", className)}>
      <span className="text-[22px] leading-none">fun</span>
      <span className="size-1.5 translate-y-[-1px] rounded-full bg-primary-base" aria-hidden />
    </span>
  );
}

function useBadges() {
  const txns = useTransactions();
  const events = useEvents();
  const now = useNow(60_000);
  return React.useMemo(() => {
    const day = now - 86_400_000;
    const attention = txns.filter((t) => t.createdAt >= day && (t.status === "failed" || t.status === "delayed")).length;
    const webhooks = events.filter((e) => e.deliveryStatus === "failed").length;
    return { attention, webhooks };
  }, [txns, events, now]);
}

function NavLink({ item, onNavigate, count }: { item: NavItem; onNavigate?: () => void; count?: number }) {
  const pathname = usePathname();
  const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "group flex h-8 items-center gap-2.5 rounded-sm px-2 text-sm font-medium transition-colors",
        active ? "bg-layer text-strong" : "text-sub hover:bg-surface hover:text-strong",
      )}
    >
      <Icon className={cn("size-[18px] shrink-0", active ? "text-primary-base" : "text-soft group-hover:text-sub")} aria-hidden />
      <span className="flex-1 truncate">{item.label}</span>
      {count != null && count > 0 && (
        <span
          className={cn(
            "tabular grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-[11px] font-medium",
            item.badge === "webhooks" ? "bg-error-mute text-error-dark" : "bg-warning-mute text-warning-dark",
          )}
          aria-label={item.badge === "webhooks" ? `${count} failed deliveries` : `${count} payments need attention`}
        >
          {count}
        </span>
      )}
    </Link>
  );
}

function WorkspaceSwitcher() {
  const name = useDemo((s) => s.workspace.name);
  return (
    <Menu>
      <MenuTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center gap-2.5 rounded-sm border border-stroke-soft bg-default p-1.5 pr-2 text-left shadow-xs hover:border-stroke-mild"
        >
          <span className="grid size-7 shrink-0 place-items-center rounded-xs bg-weak text-xs font-semibold text-inverse">
            {name.charAt(0)}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-strong">{name}</span>
            <span className="block truncate text-xs text-sub">Crypto trading app</span>
          </span>
          <ChevronsUpDown className="size-4 shrink-0 text-soft" aria-hidden />
        </button>
      </MenuTrigger>
      <MenuContent align="start" className="w-[var(--radix-dropdown-menu-trigger-width)]">
        <MenuLabel>Workspaces</MenuLabel>
        <MenuItem>
          <span className="grid size-5 place-items-center rounded-xs bg-weak text-[10px] font-semibold text-inverse">{name.charAt(0)}</span>
          <span className="flex-1">{name}</span>
          <Check className="text-primary-base!" />
        </MenuItem>
        <MenuItem disabled>
          <span className="grid size-5 place-items-center rounded-xs bg-subtle text-[10px] font-semibold text-sub">+</span>
          Create workspace
          <span className="ml-auto text-xs text-sub">Demo</span>
        </MenuItem>
      </MenuContent>
    </Menu>
  );
}

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const badges = useBadges();
  const resetDemo = useDemo((s) => s.resetDemo);
  const [confirm, setConfirm] = React.useState(false);

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center gap-2 px-4">
        <Link href="/overview" onClick={onNavigate} className="flex items-center gap-2 rounded-xs" aria-label="Fun demo console home">
          <Wordmark />
        </Link>
        <span className="rounded-xs border border-stroke-mild px-1.5 py-0.5 text-[10px] font-medium tracking-[0.08em] text-sub uppercase">
          Demo console
        </span>
      </div>
      <div className="px-3 pb-3">
        <WorkspaceSwitcher />
      </div>
      <nav aria-label="Primary" className="scrollbar-thin flex-1 overflow-y-auto px-3 pb-3">
        {NAV.map((g) => (
          <div key={g.group} className="mt-3 first:mt-1">
            <p className="px-2 pb-1.5 text-[11px] font-medium tracking-[0.06em] text-soft uppercase">{g.group}</p>
            <ul className="flex flex-col gap-0.5">
              {g.items.map((item) => (
                <li key={item.href}>
                  <NavLink item={item} onNavigate={onNavigate} count={item.badge ? badges[item.badge] : undefined} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
      <div className="border-t border-stroke-soft p-3">
        <NavLink item={SETTINGS_NAV} onNavigate={onNavigate} />
        <div className="mt-3 rounded-sm border border-stroke-soft hatch-neutral px-3 py-2.5">
          <p className="text-xs font-medium text-strong">Prototype · simulated data</p>
          <p className="mt-0.5 text-xs text-sub">No real payments, wallets, or funds are connected.</p>
          <Tooltip content="Clears demo payments, keys and settings stored in this browser">
            <button
              type="button"
              onClick={() => setConfirm(true)}
              className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-sub hover:text-strong"
            >
              <RotateCcw className="size-3" aria-hidden /> Reset demo data
            </button>
          </Tooltip>
        </div>
      </div>
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title="Reset demo data?"
        description="This clears simulated payments, webhook retries, API keys, and settings saved in this browser, then restores the seeded Nova Markets data."
        confirmLabel="Reset demo data"
        onConfirm={() => {
          resetDemo();
          toast.success("Demo data reset", { description: "Seeded data restored." });
        }}
      />
    </div>
  );
}

