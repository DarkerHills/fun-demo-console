"use client";

import { Checkbox as CB, Select as S, Switch as SW, Tabs as TB, ToggleGroup as TG } from "radix-ui";
import { Check, ChevronDown } from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/utils";
import { inputBase } from "./field";

/* ───────────────────────── Select ───────────────────────── */

export function Select({
  value,
  onValueChange,
  options,
  placeholder,
  id,
  className,
  disabled,
  invalid,
  "aria-label": ariaLabel,
  size = "md",
}: {
  value: string;
  onValueChange: (v: string) => void;
  options: { value: string; label: React.ReactNode; description?: string; disabled?: boolean }[];
  placeholder?: string;
  id?: string;
  className?: string;
  disabled?: boolean;
  invalid?: boolean;
  "aria-label"?: string;
  size?: "sm" | "md";
}) {
  return (
    <S.Root value={value} onValueChange={onValueChange} disabled={disabled}>
      <S.Trigger
        id={id}
        aria-label={ariaLabel}
        aria-invalid={invalid || undefined}
        className={cn(
          inputBase,
          "flex items-center justify-between gap-2 text-left data-[placeholder]:text-soft",
          size === "sm" ? "h-8 px-2.5" : "h-9 px-3",
          className,
        )}
      >
        <S.Value placeholder={placeholder} />
        <S.Icon>
          <ChevronDown className="size-4 text-sub" aria-hidden />
        </S.Icon>
      </S.Trigger>
      <S.Portal>
        <S.Content
          position="popper"
          sideOffset={6}
          className="z-[60] max-h-[min(360px,var(--radix-select-content-available-height))] min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-md border border-stroke-soft bg-default p-1 shadow-md data-[state=open]:animate-fade-in"
        >
          <S.Viewport>
            {options.map((o) => (
              <S.Item
                key={o.value}
                value={o.value}
                disabled={o.disabled}
                className="relative flex min-h-8 cursor-pointer items-center rounded-sm py-1.5 pr-8 pl-2 text-sm text-strong outline-none select-none data-[disabled]:opacity-50 data-[highlighted]:bg-layer"
              >
                <div className="flex flex-col">
                  <S.ItemText>{o.label}</S.ItemText>
                  {o.description && <span className="text-xs text-sub">{o.description}</span>}
                </div>
                <S.ItemIndicator className="absolute right-2">
                  <Check className="size-4 text-primary-base" aria-hidden />
                </S.ItemIndicator>
              </S.Item>
            ))}
          </S.Viewport>
        </S.Content>
      </S.Portal>
    </S.Root>
  );
}

/* ───────────────────────── Switch ───────────────────────── */

export function Switch({ className, ...props }: React.ComponentProps<typeof SW.Root>) {
  return (
    <SW.Root
      className={cn(
        "relative inline-flex h-5 w-8 shrink-0 items-center rounded-full bg-muted p-0.5 transition-colors data-[state=checked]:bg-primary-base disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <SW.Thumb className="block size-4 rounded-full bg-white shadow-[0_1px_2px_rgb(0_0_0/0.2)] transition-transform data-[state=checked]:translate-x-3" />
    </SW.Root>
  );
}

/* ───────────────────────── Checkbox ───────────────────────── */

export function Checkbox({ className, ...props }: React.ComponentProps<typeof CB.Root>) {
  return (
    <CB.Root
      className={cn(
        "grid size-4 shrink-0 place-items-center rounded-[4px] border border-stroke-strong bg-default shadow-xs transition-colors data-[state=checked]:border-primary-base data-[state=checked]:bg-primary-base",
        className,
      )}
      {...props}
    >
      <CB.Indicator>
        <Check className="size-3 text-white" strokeWidth={3} aria-hidden />
      </CB.Indicator>
    </CB.Root>
  );
}

/* ───────────────────────── Segmented control ───────────────────────── */

export function Segmented<T extends string>({
  value,
  onValueChange,
  options,
  className,
  size = "md",
  "aria-label": ariaLabel,
}: {
  value: T;
  onValueChange: (v: T) => void;
  options: { value: T; label: React.ReactNode; title?: string }[];
  className?: string;
  size?: "sm" | "md";
  "aria-label": string;
}) {
  return (
    <TG.Root
      type="single"
      value={value}
      onValueChange={(v) => v && onValueChange(v as T)}
      aria-label={ariaLabel}
      className={cn("inline-flex shrink-0 items-center gap-0.5 rounded-sm bg-layer p-0.5", className)}
    >
      {options.map((o) => (
        <TG.Item
          key={o.value}
          value={o.value}
          title={o.title}
          className={cn(
            "inline-flex items-center justify-center gap-1.5 rounded-[6px] px-2.5 font-medium text-sub transition-colors hover:text-strong data-[state=on]:bg-default data-[state=on]:text-strong data-[state=on]:shadow-[0_1px_2px_rgb(0_0_0/0.08),0_0_0_1px_var(--stroke-soft)] [&_svg]:size-3.5",
            size === "sm" ? "h-6 text-xs" : "h-7 text-sm",
          )}
        >
          {o.label}
        </TG.Item>
      ))}
    </TG.Root>
  );
}

/* ───────────────────────── Tabs (underline) ───────────────────────── */

export const Tabs = TB.Root;
export const TabsContent = TB.Content;

export function TabsList({ className, ...props }: React.ComponentProps<typeof TB.List>) {
  return (
    <TB.List
      className={cn("scrollbar-thin flex items-center gap-5 overflow-x-auto overflow-y-hidden border-b border-stroke-soft", className)}
      {...props}
    />
  );
}

export function TabsTrigger({ className, ...props }: React.ComponentProps<typeof TB.Trigger>) {
  return (
    <TB.Trigger
      className={cn(
        "relative -mb-px inline-flex h-10 shrink-0 items-center gap-1.5 border-b-2 border-transparent text-sm font-medium text-sub transition-colors hover:text-strong data-[state=active]:border-primary-base data-[state=active]:text-strong [&_svg]:size-4",
        className,
      )}
      {...props}
    />
  );
}
