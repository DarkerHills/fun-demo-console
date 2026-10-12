"use client";

import { ArrowDown, ArrowUp, Check, ChevronLeft, ChevronRight, ChevronsUpDown, PlusCircle } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import { Checkbox, Select } from "./controls";
import { Popover, PopoverContent, PopoverTrigger } from "./overlays";

export function PageHeader({
  title,
  description,
  actions,
  meta,
}: {
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  meta?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between lg:gap-6">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl text-strong">{title}</h1>
          {meta}
        </div>
        {description && <p className="mt-1 max-w-2xl text-sm text-sub">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/* ───────────────────────── Stat tile ───────────────────────── */

export function Delta({ value, goodWhenUp = true, suffix }: { value: number | null; goodWhenUp?: boolean; suffix?: string }) {
  if (value == null || !isFinite(value)) return <span className="text-xs text-sub">No prior data</span>;
  const up = value >= 0;
  const good = up === goodWhenUp;
  const flat = Math.abs(value) < 0.005;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-xs font-medium",
        flat ? "text-sub" : good ? "text-success-dark" : "text-error-dark",
      )}
    >
      {!flat && (up ? <ArrowUp className="size-3" aria-hidden /> : <ArrowDown className="size-3" aria-hidden />)}
      {flat ? "No change" : `${Math.abs(value * 100).toFixed(1)}%`}
      {suffix && <span className="font-normal text-sub">&nbsp;{suffix}</span>}
    </span>
  );
}

export function Sparkline({ values, className }: { values: number[]; className?: string }) {
  if (values.length < 2) return null;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const w = 96;
  const h = 28;
  const pts = values.map((v, i) => [(i / (values.length - 1)) * w, h - 2 - ((v - min) / (max - min || 1)) * (h - 4)]);
  const d = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const last = pts[pts.length - 1];
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={cn("h-7 w-24 overflow-visible", className)} aria-hidden>
      <path d={d} fill="none" stroke="var(--stroke-strong)" strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={last[0]} cy={last[1]} r={3} fill="var(--primary-base)" stroke="var(--bg-default)" strokeWidth={2} />
    </svg>
  );
}

export function MetricCard({
  label,
  value,
  delta,
  footnote,
  href,
  hrefLabel,
  trend,
  goodWhenUp,
  icon,
}: {
  label: string;
  value: string;
  delta: number | null;
  footnote?: React.ReactNode;
  href: string;
  hrefLabel: string;
  trend?: number[];
  goodWhenUp?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-label={`${label}: ${value}. ${hrefLabel}`}
      className="group relative flex flex-col rounded-md border border-stroke-soft bg-default p-4 shadow-xs transition-[border-color,box-shadow] hover:border-stroke-mild hover:shadow-md"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-sm text-sub [&_svg]:size-4">
          {icon}
          {label}
        </span>
        <ChevronRight className="size-4 text-soft transition-transform group-hover:translate-x-0.5 group-hover:text-sub" aria-hidden />
      </div>
      <div className="mt-2 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[28px] leading-9 font-medium tracking-[-0.01em] text-strong">{value}</p>
          <div className="mt-1">
            <Delta value={delta} goodWhenUp={goodWhenUp} suffix="vs prior" />
          </div>
        </div>
        {trend && <Sparkline values={trend} className="mb-1 shrink-0" />}
      </div>
      {footnote && (
        <div className="mt-3 border-t border-stroke-soft pt-3 text-xs text-sub group-hover:text-strong">{footnote}</div>
      )}
    </Link>
  );
}

/* ───────────────────────── Table primitives ───────────────────────── */

export function Table({ className, ...props }: React.TableHTMLAttributes<HTMLTableElement>) {
  return (
    // `relative` keeps absolutely positioned descendants (e.g. sr-only labels) inside the scroller.
    <div className="scrollbar-thin relative w-full overflow-x-auto">
      <table className={cn("w-full border-separate border-spacing-0 text-sm", className)} {...props} />
    </div>
  );
}

export function Th({
  className,
  sortable,
  sorted,
  onSort,
  children,
  align = "left",
  ...props
}: React.ThHTMLAttributes<HTMLTableCellElement> & {
  sortable?: boolean;
  sorted?: "asc" | "desc" | false;
  onSort?: () => void;
  align?: "left" | "right";
}) {
  return (
    <th
      scope="col"
      aria-sort={sorted ? (sorted === "asc" ? "ascending" : "descending") : undefined}
      className={cn(
        "h-9 border-y border-stroke-soft bg-surface px-3 text-xs font-medium whitespace-nowrap text-sub first:border-l first:pl-5 last:border-r last:pr-5",
        align === "right" ? "text-right" : "text-left",
        className,
      )}
      {...props}
    >
      {sortable ? (
        <button
          type="button"
          onClick={onSort}
          className={cn(
            "-mx-1 inline-flex items-center gap-1 rounded-xs px-1 py-0.5 hover:text-strong",
            sorted && "text-strong",
            align === "right" && "flex-row-reverse",
          )}
        >
          {children}
          {sorted === "asc" ? (
            <ArrowUp className="size-3" aria-hidden />
          ) : sorted === "desc" ? (
            <ArrowDown className="size-3" aria-hidden />
          ) : (
            <ChevronsUpDown className="size-3 text-soft" aria-hidden />
          )}
        </button>
      ) : (
        children
      )}
    </th>
  );
}

export function Td({ className, align = "left", ...props }: React.TdHTMLAttributes<HTMLTableCellElement> & { align?: "left" | "right" }) {
  return (
    <td
      className={cn(
        "h-12 border-b border-stroke-soft px-3 whitespace-nowrap text-strong first:pl-5 last:pr-5",
        align === "right" && "text-right",
        className,
      )}
      {...props}
    />
  );
}

/** Interactive row: click or Enter/Space to open. */
export function Tr({
  onOpen,
  selected,
  className,
  ...props
}: React.HTMLAttributes<HTMLTableRowElement> & { onOpen?: () => void; selected?: boolean }) {
  return (
    <tr
      tabIndex={onOpen ? 0 : undefined}
      onClick={onOpen}
      onKeyDown={
        onOpen
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onOpen();
              }
            }
          : undefined
      }
      aria-selected={selected || undefined}
      className={cn(
        onOpen && "cursor-pointer outline-none hover:bg-surface focus-visible:bg-primary-mute",
        selected && "bg-primary-mute hover:bg-primary-mute",
        className,
      )}
      {...props}
    />
  );
}

/* ───────────────────────── Pagination ───────────────────────── */

export function Pagination({
  page,
  pageSize,
  total,
  onPage,
  onPageSize,
  noun = "results",
}: {
  page: number;
  pageSize: number;
  total: number;
  onPage: (p: number) => void;
  onPageSize?: (s: number) => void;
  noun?: string;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = total ? (page - 1) * pageSize + 1 : 0;
  const to = Math.min(total, page * pageSize);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-sm text-sub">
      <p aria-live="polite" className="tabular">
        {from}–{to} of {total} {noun}
      </p>
      <div className="flex items-center gap-3">
        {onPageSize && (
          <div className="hidden items-center gap-2 sm:flex">
            <span className="text-xs">Rows</span>
            <Select
              size="sm"
              aria-label="Rows per page"
              value={String(pageSize)}
              onValueChange={(v) => onPageSize(Number(v))}
              options={[15, 25, 50].map((n) => ({ value: String(n), label: String(n) }))}
              className="w-[68px]"
            />
          </div>
        )}
        <div className="flex items-center gap-1">
          <Button size="icon" variant="secondary" aria-label="Previous page" disabled={page <= 1} onClick={() => onPage(page - 1)}>
            <ChevronLeft />
          </Button>
          <span className="tabular min-w-16 text-center text-xs">
            Page {page} of {pages}
          </span>
          <Button size="icon" variant="secondary" aria-label="Next page" disabled={page >= pages} onClick={() => onPage(page + 1)}>
            <ChevronRight />
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── Faceted multi-select filter ───────────────────────── */

export function FacetFilter<T extends string>({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: { value: T; label: React.ReactNode; count?: number; icon?: React.ReactNode }[];
  selected: T[];
  onChange: (next: T[]) => void;
}) {
  const toggle = (v: T) => onChange(selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v]);
  const selectedLabels = options.filter((o) => selected.includes(o.value));
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="secondary"
          size="sm"
          className={cn("border-dashed", selected.length && "border-solid border-primary-faint bg-primary-mute/40")}
        >
          <PlusCircle className={cn(selected.length ? "text-primary-base" : "text-sub")} />
          {label}
          {selected.length > 0 && (
            <>
              <span className="mx-0.5 h-4 w-px bg-stroke-mild" aria-hidden />
              <span className="rounded-xs bg-primary-mute px-1 text-xs text-primary-dark">
                {selected.length > 2 ? `${selected.length} selected` : selectedLabels.map((o) => (typeof o.label === "string" ? o.label : o.value)).join(", ")}
              </span>
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-60">
        <p className="px-2 pt-1 pb-1.5 text-xs font-medium text-sub">Filter by {label.toLowerCase()}</p>
        <ul role="listbox" aria-multiselectable aria-label={label}>
          {options.map((o) => {
            const on = selected.includes(o.value);
            return (
              <li key={o.value}>
                <label className="flex h-8 cursor-pointer items-center gap-2 rounded-sm px-2 text-sm text-strong hover:bg-layer">
                  <Checkbox checked={on} onCheckedChange={() => toggle(o.value)} />
                  {o.icon}
                  <span className="flex-1 truncate">{o.label}</span>
                  {o.count != null && <span className="tabular text-xs text-sub">{o.count}</span>}
                </label>
              </li>
            );
          })}
        </ul>
        {selected.length > 0 && (
          <>
            <div className="my-1 h-px bg-stroke-soft" />
            <button
              type="button"
              onClick={() => onChange([])}
              className="flex h-8 w-full items-center justify-center rounded-sm text-sm text-sub hover:bg-layer hover:text-strong"
            >
              Clear {label.toLowerCase()}
            </button>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}

/* ───────────────────────── Selectable list row ───────────────────────── */

export function CheckRow({ checked, children }: { checked: boolean; children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-2">
      <span className={cn("grid size-4 place-items-center", !checked && "invisible")}>
        <Check className="size-4 text-primary-base" aria-hidden />
      </span>
      {children}
    </span>
  );
}
