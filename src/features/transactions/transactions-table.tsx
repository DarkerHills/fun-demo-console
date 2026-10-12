"use client";

import * as React from "react";
import type { SortKey } from "@/lib/data/filters";
import type { Transaction } from "@/lib/data/types";
import { formatDateTime, formatRelative, formatUsd } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Table, Td, Th, Tr } from "@/components/ui/data";
import { AssetLabel, MethodLabel, NetworkLabel, StatusBadge } from "@/components/ui/domain";

export function TransactionsTable({
  rows,
  onOpen,
  selectedId,
  sort,
  dir,
  onSort,
  compact,
  now,
  caption,
}: {
  rows: Transaction[];
  onOpen: (id: string) => void;
  selectedId?: string | null;
  sort?: SortKey;
  dir?: "asc" | "desc";
  onSort?: (key: SortKey) => void;
  compact?: boolean;
  now: number;
  caption: string;
}) {
  const sorted = (k: SortKey) => (sort === k ? dir ?? "desc" : false);
  const sortable = !!onSort;
  return (
    <Table aria-label={caption}>
      <caption className="sr-only">{caption}</caption>
      <thead>
        <tr>
          <Th className="border-l-0 first:border-l-0">Transaction ID</Th>
          <Th className="hidden sm:table-cell" sortable={sortable} sorted={sorted("customer")} onSort={() => onSort?.("customer")}>
            Customer
          </Th>
          <Th align="right" sortable={sortable} sorted={sorted("amount")} onSort={() => onSort?.("amount")}>
            Amount
          </Th>
          {!compact && <Th className="hidden md:table-cell">Method</Th>}
          <Th className={cn(compact ? "hidden lg:table-cell" : "hidden sm:table-cell")}>Asset</Th>
          {!compact && <Th className="hidden lg:table-cell">Network</Th>}
          <Th sortable={sortable} sorted={sorted("status")} onSort={() => onSort?.("status")}>
            Status
          </Th>
          <Th
            align="right"
            className="border-r-0 last:border-r-0"
            sortable={sortable}
            sorted={sorted("created")}
            onSort={() => onSort?.("created")}
          >
            Created
          </Th>
        </tr>
      </thead>
      <tbody>
        {rows.map((t) => (
          <Tr key={t.id} onOpen={() => onOpen(t.id)} selected={selectedId === t.id} aria-label={`Open payment ${t.id}`}>
            <Td>
              <span className="flex items-center gap-1.5 font-mono text-[13px]">
                {t.id}
                {t.origin === "demo" && (
                  <span className="rounded-xs bg-primary-mute px-1 font-sans text-[10px] font-medium text-primary-dark" title="Created from test checkout">
                    TEST
                  </span>
                )}
              </span>
              <span className="block max-w-[160px] truncate text-xs text-sub sm:hidden">{t.customer}</span>
            </Td>
            <Td className="hidden max-w-[220px] truncate text-sub sm:table-cell">{t.customer}</Td>
            <Td align="right" className="tabular font-medium">
              {formatUsd(t.amountUsd)}
            </Td>
            {!compact && (
              <Td className="hidden md:table-cell">
                <MethodLabel method={t.method} />
              </Td>
            )}
            <Td className={cn(compact ? "hidden lg:table-cell" : "hidden sm:table-cell")}>
              <AssetLabel asset={t.sourceAsset} />
            </Td>
            {!compact && (
              <Td className="hidden lg:table-cell">
                <NetworkLabel network={t.sourceNetwork} />
              </Td>
            )}
            <Td>
              <StatusBadge status={t.status} />
            </Td>
            <Td align="right" className="tabular text-sub" title={formatDateTime(t.createdAt)}>
              {now - t.createdAt < 86_400_000 ? formatRelative(t.createdAt, now) : formatDateTime(t.createdAt)}
            </Td>
          </Tr>
        ))}
      </tbody>
    </Table>
  );
}
