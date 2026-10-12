"use client";

import Link from "next/link";
import * as React from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "@/lib/utils";

/* Shared chart chrome: hairline solid grid, recessive axes, text in text tokens. */
const AXIS = { fontSize: 12, fill: "var(--text-sub)" };

export interface TipRow {
  label: string;
  value: string;
  color: string;
  line?: boolean;
}

export function ChartTooltipBox({ title, rows, footer }: { title: string; rows: TipRow[]; footer?: string }) {
  return (
    <div className="min-w-44 rounded-sm border border-stroke-soft bg-default px-3 py-2 shadow-md">
      <p className="text-xs text-sub">{title}</p>
      <ul className="mt-1 space-y-0.5">
        {rows.map((r) => (
          <li key={r.label} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-xs text-sub">
              <span aria-hidden className={cn("inline-block rounded-full", r.line ? "h-0.5 w-3" : "size-2")} style={{ background: r.color }} />
              {r.label}
            </span>
            <span className="tabular text-sm font-medium text-strong">{r.value}</span>
          </li>
        ))}
      </ul>
      {footer && <p className="mt-1.5 border-t border-stroke-soft pt-1.5 text-[11px] text-sub">{footer}</p>}
    </div>
  );
}

type Datum = { label: string };
type Row = Record<string, unknown>;
const num = (d: unknown, key: string) => Number((d as Row)[key] ?? 0);

/** Single-series area (volume over time) with crosshair tooltip. */
export function AreaSeries<T extends Datum>({
  data,
  dataKey,
  height = 240,
  format,
  tickFormat,
  tooltipRows,
  color = "var(--chart-1)",
  ariaLabel,
}: {
  data: T[];
  dataKey: string;
  height?: number;
  format: (v: number) => string;
  tickFormat?: (v: number) => string;
  tooltipRows?: (d: T) => TipRow[];
  color?: string;
  ariaLabel: string;
}) {
  const id = React.useId().replace(/:/g, "");
  const tickEvery = Math.max(1, Math.ceil(data.length / 7));
  return (
    <div role="img" aria-label={ariaLabel} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data as unknown as Row[]} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`fill-${id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.14} />
              <stop offset="100%" stopColor={color} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
          <XAxis
            dataKey="label"
            tick={AXIS}
            tickLine={false}
            axisLine={{ stroke: "var(--chart-grid)" }}
            interval={tickEvery - 1}
            tickMargin={8}
          />
          <YAxis tick={AXIS} tickLine={false} axisLine={false} width={56} tickFormatter={tickFormat ?? format} tickCount={5} />
          <Tooltip
            cursor={{ stroke: "var(--stroke-strong)", strokeWidth: 1 }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload as T;
              return (
                <ChartTooltipBox
                  title={d.label}
                  rows={tooltipRows ? tooltipRows(d) : [{ label: "Value", value: format(num(d, dataKey)), color, line: true }]}
                />
              );
            }}
          />
          <Area
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            strokeWidth={2}
            fill={`url(#fill-${id})`}
            activeDot={{ r: 4, stroke: "var(--bg-default)", strokeWidth: 2, fill: color }}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Columns (single series or stacked) with per-bar hover and optional click-through. */
export function Columns<T extends Datum>({
  data,
  series,
  height = 240,
  format,
  onSelect,
  ariaLabel,
  percent,
  tooltipRows,
}: {
  data: T[];
  series: { key: string; label: string; color: string }[];
  height?: number;
  format: (v: number) => string;
  onSelect?: (d: T) => void;
  ariaLabel: string;
  /** Series values are already percentages (0–100) that stack to 100. */
  percent?: boolean;
  tooltipRows?: (d: T) => TipRow[];
}) {
  const tickEvery = Math.max(1, Math.ceil(data.length / 7));
  return (
    <div role="img" aria-label={ariaLabel} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data as unknown as Row[]}
          margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
          barCategoryGap="22%"
        >
          <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
          <XAxis dataKey="label" tick={AXIS} tickLine={false} axisLine={{ stroke: "var(--chart-grid)" }} interval={tickEvery - 1} tickMargin={8} />
          <YAxis
            tick={AXIS}
            tickLine={false}
            axisLine={false}
            width={48}
            tickCount={5}
            allowDecimals={false}
            domain={percent ? [0, 100] : undefined}
            ticks={percent ? [0, 25, 50, 75, 100] : undefined}
            tickFormatter={(v: number) => (percent ? `${v}%` : format(v))}
          />
          <Tooltip
            cursor={{ fill: "var(--bg-layer)", opacity: 0.6 }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload as T;
              return (
                <ChartTooltipBox
                  title={d.label}
                  rows={
                    tooltipRows
                      ? tooltipRows(d)
                      : [...series].reverse().map((s) => ({ label: s.label, value: format(num(d, s.key)), color: s.color }))
                  }
                  footer={onSelect ? "Click to view these payments" : undefined}
                />
              );
            }}
          />
          {series.map((s, i) => (
            <Bar
              key={s.key}
              dataKey={s.key}
              stackId={series.length > 1 ? "a" : undefined}
              fill={s.color}
              maxBarSize={24}
              radius={i === series.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
              stroke="var(--bg-default)"
              strokeWidth={series.length > 1 ? 1 : 0}
              cursor={onSelect ? "pointer" : undefined}
              isAnimationActive={false}
              onClick={onSelect ? (bar) => onSelect((bar as unknown as { payload: T }).payload) : undefined}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Horizontal bar list — HTML, so every row is a real link with keyboard focus. */
export function BarList({
  rows,
  format,
  color = "var(--chart-1)",
  emptyLabel = "No data in this range",
}: {
  rows: { key: string; label: React.ReactNode; value: number; display?: string; href?: string; icon?: React.ReactNode; sub?: string }[];
  format: (v: number) => string;
  color?: string;
  emptyLabel?: string;
}) {
  const max = Math.max(...rows.map((r) => r.value), 0);
  if (!max) return <p className="py-8 text-center text-sm text-sub">{emptyLabel}</p>;
  return (
    <ul className="space-y-1">
      {rows.map((r) => {
        const inner = (
          <>
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="flex min-w-0 items-center gap-2 text-strong">
                {r.icon}
                <span className="truncate" title={typeof r.label === "string" ? r.label : undefined}>
                  {r.label}
                </span>
              </span>
              <span className="flex shrink-0 items-baseline gap-2">
                {r.sub && <span className="text-xs text-sub">{r.sub}</span>}
                <span className="tabular font-medium text-strong">{r.display ?? format(r.value)}</span>
              </span>
            </div>
            <div className="mt-1.5 h-1.5 w-full rounded-full bg-layer">
              <div className="h-full rounded-full" style={{ width: `${Math.max(2, (r.value / max) * 100)}%`, background: color }} />
            </div>
          </>
        );
        return (
          <li key={r.key}>
            {r.href ? (
              <Link href={r.href} className="-mx-2 block rounded-sm px-2 py-1.5 transition-colors hover:bg-surface">
                {inner}
              </Link>
            ) : (
              <div className="py-1.5">{inner}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/** Part-to-whole in one bar: categorical segments separated by a 2px surface gap. */
export function ProportionBar({ segments, label }: { segments: { key: string; label: string; value: number; color: string }[]; label: string }) {
  const total = segments.reduce((s, x) => s + x.value, 0);
  if (!total) return <div className="h-2.5 w-full rounded-full bg-layer" aria-label={`${label}: no data`} />;
  return (
    <div className="flex h-2.5 w-full gap-[2px] overflow-hidden rounded-full" role="img" aria-label={`${label}: ${segments.map((s) => `${s.label} ${Math.round((s.value / total) * 100)}%`).join(", ")}`}>
      {segments
        .filter((s) => s.value > 0)
        .map((s) => (
          <div key={s.key} title={`${s.label}: ${Math.round((s.value / total) * 100)}%`} style={{ width: `${(s.value / total) * 100}%`, background: s.color }} />
        ))}
    </div>
  );
}

export function Legend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1">
      {items.map((i) => (
        <li key={i.label} className="flex items-center gap-1.5 text-xs text-sub">
          <span aria-hidden className="size-2 rounded-[2px]" style={{ background: i.color }} />
          {i.label}
        </li>
      ))}
    </ul>
  );
}
