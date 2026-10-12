"use client";

import * as React from "react";
import { useDemo } from "@/lib/store/demo-store";
import { Toaster } from "@/components/ui/feedback";
import { Sheet, TooltipProvider } from "@/components/ui/overlays";
import { TransactionDrawer } from "@/features/transactions/transaction-drawer";
import { CheckoutPreviewDialog } from "@/features/checkout/checkout-preview-dialog";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

/** Persistent reminder that nothing here moves real money. Hatching = simulated. */
function EnvBand() {
  const env = useDemo((s) => s.env);
  return (
    <div
      role="note"
      className={
        env === "sandbox"
          ? "hatch-warning border-b border-warning-faint text-warning-dark"
          : "hatch-neutral border-b border-stroke-soft text-sub"
      }
    >
      <p className="mx-auto flex max-w-[1280px] items-center gap-2 px-4 py-1.5 text-xs sm:px-6 lg:px-8">
        <span className="font-semibold">{env === "sandbox" ? "Sandbox" : "Production view"}</span>
        <span aria-hidden>·</span>
        <span className="truncate">
          {env === "sandbox"
            ? "Test data only. Payments here are simulated and no real funds move."
            : "Simulated data for this demo. Nothing here is connected to real funds or wallets."}
        </span>
      </p>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [navOpen, setNavOpen] = React.useState(false);

  return (
    <TooltipProvider delayDuration={300}>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[80] focus:rounded-sm focus:bg-default focus:px-3 focus:py-2 focus:shadow-md"
      >
        Skip to content
      </a>
      <div className="min-h-dvh">
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 border-r border-stroke-soft bg-default lg:block">
          <Sidebar />
        </aside>
        <Sheet open={navOpen} onOpenChange={setNavOpen} side="left" title="Navigation">
          <Sidebar onNavigate={() => setNavOpen(false)} />
        </Sheet>
        <div className="flex min-h-dvh min-w-0 flex-col lg:pl-60">
          <Topbar onMenu={() => setNavOpen(true)} />
          <EnvBand />
          <main id="main" className="mx-auto w-full max-w-[1280px] flex-1 px-4 pt-6 pb-16 sm:px-6 lg:px-8">
            {children}
          </main>
        </div>
      </div>
      <React.Suspense>
        <TransactionDrawer />
      </React.Suspense>
      <CheckoutPreviewDialog />
      <Toaster />
    </TooltipProvider>
  );
}
