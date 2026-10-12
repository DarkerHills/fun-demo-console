import { Suspense } from "react";
import { AppShell } from "@/components/shell/app-shell";
import { BrowserOnly } from "@/components/shell/browser-only";
import { ShellSkeleton } from "@/components/shell/shell-skeleton";

/**
 * The console renders in the browser only (state lives in localStorage), so a
 * first page load shows the skeleton shell by design. Navigations between
 * console pages happen below this layout and stay instant.
 */
export const instant = false;

export default function ConsoleLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<ShellSkeleton />}>
      <BrowserOnly>
        <AppShell>{children}</AppShell>
      </BrowserOnly>
    </Suspense>
  );
}
