"use client";

import { Dialog as D, DropdownMenu as DM, Popover as P, Tooltip as T } from "radix-ui";
import { X } from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

/* ───────────────────────── Dialog (modal) ───────────────────────── */

export const Dialog = D.Root;
export const DialogTrigger = D.Trigger;
export const DialogClose = D.Close;

export function DialogContent({
  title,
  description,
  children,
  className,
  size = "md",
  hideClose,
  onOpenAutoFocus,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  hideClose?: boolean;
  onOpenAutoFocus?: (e: Event) => void;
}) {
  return (
    <D.Portal>
      <D.Overlay className="fixed inset-0 z-50 bg-overlay backdrop-blur-[2px] data-[state=open]:animate-fade-in" />
      <D.Content
        onOpenAutoFocus={onOpenAutoFocus}
        className={cn(
          "fixed top-1/2 left-1/2 z-50 flex max-h-[calc(100dvh-32px)] w-[calc(100vw-32px)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-lg border border-stroke-soft bg-default shadow-lg data-[state=open]:animate-pop-in",
          size === "sm" && "max-w-[400px]",
          size === "md" && "max-w-[480px]",
          size === "lg" && "max-w-[640px]",
          size === "xl" && "max-w-[1040px]",
          className,
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-stroke-soft px-5 py-4">
          <div className="min-w-0">
            <D.Title className="text-base font-medium text-strong">{title}</D.Title>
            {description ? (
              <D.Description className="mt-0.5 text-sm text-sub">{description}</D.Description>
            ) : (
              <D.Description className="sr-only">{typeof title === "string" ? title : "Dialog"}</D.Description>
            )}
          </div>
          {!hideClose && (
            <D.Close asChild>
              <Button variant="ghost" size="icon-sm" aria-label="Close" className="-mr-1.5 -mt-0.5">
                <X />
              </Button>
            </D.Close>
          )}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </D.Content>
    </D.Portal>
  );
}

export function DialogFooter({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-center justify-end gap-2 border-t border-stroke-soft bg-surface/60 px-5 py-3", className)}>
      {children}
    </div>
  );
}

/** Confirmation modal for destructive or irreversible demo actions. */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  tone = "danger",
  onConfirm,
  children,
  confirmDisabled,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  description: React.ReactNode;
  confirmLabel: string;
  tone?: "danger" | "primary";
  onConfirm: () => void;
  children?: React.ReactNode;
  confirmDisabled?: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={title} size="sm">
        <div className="space-y-4 px-5 py-4 text-sm text-sub">
          <div>{description}</div>
          {children}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary">Cancel</Button>
          </DialogClose>
          <Button
            variant={tone === "danger" ? "danger" : "primary"}
            disabled={confirmDisabled}
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ───────────────────────── Sheet (side drawer) ───────────────────────── */

export function Sheet({
  open,
  onOpenChange,
  side = "right",
  title,
  description,
  children,
  className,
  header,
  modal = true,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  side?: "right" | "left";
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  header?: React.ReactNode;
  modal?: boolean;
}) {
  return (
    <D.Root open={open} onOpenChange={onOpenChange} modal={modal}>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-40 bg-overlay/60 data-[state=open]:animate-fade-in" />
        <D.Content
          className={cn(
            "fixed inset-y-0 z-40 flex flex-col bg-default shadow-lg outline-none",
            side === "right" ? "w-full" : "w-[280px]",
            side === "right"
              ? "right-0 border-l border-stroke-soft data-[state=open]:animate-slide-in-right sm:max-w-[520px]"
              : "left-0 max-w-[85vw] border-r border-stroke-soft data-[state=open]:animate-slide-in-left sm:max-w-[280px]",
            className,
          )}
        >
          <D.Title className="sr-only">{title}</D.Title>
          <D.Description className="sr-only">{description ?? title}</D.Description>
          {header}
          {children}
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}

export const SheetClose = D.Close;

/* ───────────────────────── Popover ───────────────────────── */

export const Popover = P.Root;
export const PopoverTrigger = P.Trigger;
export const PopoverClose = P.Close;

export function PopoverContent({
  className,
  align = "start",
  sideOffset = 6,
  ...props
}: React.ComponentProps<typeof P.Content>) {
  return (
    <P.Portal>
      <P.Content
        align={align}
        sideOffset={sideOffset}
        className={cn(
          "z-50 min-w-48 rounded-md border border-stroke-soft bg-default p-1 shadow-md outline-none data-[state=open]:animate-fade-in",
          className,
        )}
        {...props}
      />
    </P.Portal>
  );
}

/* ───────────────────────── Dropdown menu ───────────────────────── */

export const Menu = DM.Root;
export const MenuTrigger = DM.Trigger;

export function MenuContent({ className, align = "end", sideOffset = 6, ...props }: React.ComponentProps<typeof DM.Content>) {
  return (
    <DM.Portal>
      <DM.Content
        align={align}
        sideOffset={sideOffset}
        className={cn(
          "z-50 min-w-48 rounded-md border border-stroke-soft bg-default p-1 shadow-md outline-none data-[state=open]:animate-fade-in",
          className,
        )}
        {...props}
      />
    </DM.Portal>
  );
}

export function MenuItem({
  className,
  tone,
  ...props
}: React.ComponentProps<typeof DM.Item> & { tone?: "danger" }) {
  return (
    <DM.Item
      className={cn(
        "flex h-8 cursor-pointer items-center gap-2 rounded-sm px-2 text-sm text-strong outline-none select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 data-[highlighted]:bg-layer [&_svg]:size-4 [&_svg]:text-sub",
        tone === "danger" && "text-error-base data-[highlighted]:bg-error-mute [&_svg]:text-error-base",
        className,
      )}
      {...props}
    />
  );
}

export function MenuLabel({ className, ...props }: React.ComponentProps<typeof DM.Label>) {
  return <DM.Label className={cn("px-2 pt-1.5 pb-1 text-xs font-medium text-sub", className)} {...props} />;
}

export function MenuSeparator() {
  return <DM.Separator className="my-1 h-px bg-stroke-soft" />;
}

export const MenuRadioGroup = DM.RadioGroup;

export function MenuRadioItem({ className, children, ...props }: React.ComponentProps<typeof DM.RadioItem>) {
  return (
    <DM.RadioItem
      className={cn(
        "flex h-8 cursor-pointer items-center gap-2 rounded-sm pr-2 pl-7 text-sm text-strong outline-none select-none data-[highlighted]:bg-layer relative",
        className,
      )}
      {...props}
    >
      <DM.ItemIndicator className="absolute left-2 flex size-4 items-center justify-center">
        <svg viewBox="0 0 16 16" className="size-4 text-primary-base" aria-hidden>
          <path d="M3.5 8.5l3 3 6-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </DM.ItemIndicator>
      {children}
    </DM.RadioItem>
  );
}

/* ───────────────────────── Tooltip ───────────────────────── */

export const TooltipProvider = T.Provider;

export function Tooltip({
  content,
  children,
  side = "top",
}: {
  content: React.ReactNode;
  children: React.ReactNode;
  side?: "top" | "bottom" | "left" | "right";
}) {
  return (
    <T.Root>
      <T.Trigger asChild>{children}</T.Trigger>
      <T.Portal>
        <T.Content
          side={side}
          sideOffset={6}
          className="z-[60] max-w-64 rounded-sm bg-weak px-2 py-1 text-xs text-inverse shadow-md data-[state=delayed-open]:animate-fade-in"
        >
          {content}
        </T.Content>
      </T.Portal>
    </T.Root>
  );
}
