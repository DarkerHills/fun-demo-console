"use client";

import Link from "next/link";
import { AlertTriangle, CheckCircle2, Info, RotateCcw, X, XCircle } from "lucide-react";
import * as React from "react";
import { useToasts, type ToastTone } from "@/lib/store/toast-store";
import { cn } from "@/lib/utils";
import { Button } from "./button";

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("animate-shimmer rounded-sm bg-layer", className)} />;
}

/** Empty states direct the next action instead of describing absence. */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center px-6 py-14 text-center", className)}>
      {icon && (
        <div className="mb-3 grid size-10 place-items-center rounded-md border border-stroke-soft bg-default text-sub shadow-xs [&_svg]:size-5">
          {icon}
        </div>
      )}
      <p className="text-sm font-medium text-strong">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-sub">{description}</p>}
      {action && <div className="mt-4 flex gap-2">{action}</div>}
    </div>
  );
}

export function ErrorState({
  title = "Couldn't load this data",
  description = "The demo data service returned an error. Your filters and settings are unchanged.",
  onRetry,
  className,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div role="alert" className={cn("flex flex-col items-center justify-center px-6 py-14 text-center", className)}>
      <div className="mb-3 grid size-10 place-items-center rounded-md bg-error-mute text-error-base">
        <XCircle className="size-5" aria-hidden />
      </div>
      <p className="text-sm font-medium text-strong">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-sub">{description}</p>
      {onRetry && (
        <Button className="mt-4" onClick={onRetry}>
          <RotateCcw /> Try again
        </Button>
      )}
    </div>
  );
}

const CALLOUT: Record<ToastTone, { box: string; icon: React.ReactNode }> = {
  info: { box: "border-info-faint bg-info-mute text-info-dark", icon: <Info className="text-info-base" /> },
  success: { box: "border-success-faint bg-success-mute text-success-dark", icon: <CheckCircle2 className="text-success-base" /> },
  warning: { box: "border-warning-faint bg-warning-mute text-warning-dark", icon: <AlertTriangle className="text-warning-base" /> },
  error: { box: "border-error-faint bg-error-mute text-error-dark", icon: <XCircle className="text-error-base" /> },
};

export function Callout({
  tone = "info",
  title,
  children,
  action,
  className,
  icon,
}: {
  tone?: ToastTone;
  title?: React.ReactNode;
  children?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className={cn("flex gap-2.5 rounded-sm border px-3 py-2.5 text-sm", CALLOUT[tone].box, className)}>
      <span className="mt-0.5 shrink-0 [&_svg]:size-4">{icon ?? CALLOUT[tone].icon}</span>
      <div className="min-w-0 flex-1">
        {title && <p className="font-medium">{title}</p>}
        {children && <div className={cn(title && "mt-0.5", "opacity-90")}>{children}</div>}
      </div>
      {action && <div className="shrink-0 self-center">{action}</div>}
    </div>
  );
}

const TOAST_ICON: Record<ToastTone, React.ReactNode> = {
  success: <CheckCircle2 className="text-success-base" />,
  error: <XCircle className="text-error-base" />,
  info: <Info className="text-info-base" />,
  warning: <AlertTriangle className="text-warning-base" />,
};

function ToastItem({ id, title, description, tone, action, duration }: ReturnType<typeof useToasts.getState>["toasts"][number]) {
  const dismiss = useToasts((s) => s.dismiss);
  const [paused, setPaused] = React.useState(false);

  React.useEffect(() => {
    if (paused) return;
    const t = setTimeout(() => dismiss(id), duration);
    return () => clearTimeout(t);
  }, [paused, duration, id, dismiss]);

  return (
    <li
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className="pointer-events-auto flex w-full items-start gap-2.5 rounded-md border border-stroke-soft bg-default p-3 pr-2 shadow-lg animate-toast-in sm:w-[380px]"
    >
      <span className="mt-0.5 shrink-0 [&_svg]:size-[18px]">{TOAST_ICON[tone]}</span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-strong">{title}</p>
        {description && <p className="mt-0.5 text-sm text-sub">{description}</p>}
        {action && (
          <div className="mt-2">
            {action.href ? (
              <Link
                href={action.href}
                onClick={() => dismiss(id)}
                className="text-sm font-medium text-primary-base hover:underline"
              >
                {action.label} →
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => {
                  action.onClick?.();
                  dismiss(id);
                }}
                className="text-sm font-medium text-primary-base hover:underline"
              >
                {action.label}
              </button>
            )}
          </div>
        )}
      </div>
      <Button variant="ghost" size="icon-sm" aria-label="Dismiss notification" onClick={() => dismiss(id)}>
        <X />
      </Button>
    </li>
  );
}

export function Toaster() {
  const toasts = useToasts((s) => s.toasts);
  return (
    <ol
      aria-live="polite"
      aria-label="Notifications"
      className="pointer-events-none fixed right-4 bottom-4 left-4 z-[70] flex flex-col items-end gap-2 sm:left-auto"
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} {...t} />
      ))}
    </ol>
  );
}
