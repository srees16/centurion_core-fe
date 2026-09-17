"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

/* Click-to-sort for hand-written tables that don't need DataTable's search and
 * pagination. Clicking a header cycles ascending → descending → original order. */

export type SortValue = string | number | boolean | null | undefined;
export type SortAccessors<T, K extends string> = Record<K, (row: T) => SortValue>;

export interface SortState<K extends string> {
  key: K | null;
  dir: "asc" | "desc";
  toggle: (key: K) => void;
}

function compare(a: SortValue, b: SortValue): number {
  if (typeof a === "number" && typeof b === "number") return a - b;
  if (typeof a === "boolean" && typeof b === "boolean") return Number(a) - Number(b);
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: "base" });
}

function isMissing(v: SortValue): boolean {
  return v == null || v === "" || (typeof v === "number" && Number.isNaN(v));
}

export function useSortableRows<T, K extends string>(
  rows: T[],
  accessors: SortAccessors<T, K>,
): { rows: T[]; sort: SortState<K> } {
  const [key, setKey] = useState<K | null>(null);
  const [dir, setDir] = useState<"asc" | "desc">("asc");

  const toggle = (next: K) => {
    if (key !== next) {
      setKey(next);
      setDir("asc");
    } else if (dir === "asc") {
      setDir("desc");
    } else {
      setKey(null);
      setDir("asc");
    }
  };

  const sorted = useMemo(() => {
    if (key === null) return rows;
    const get = accessors[key];
    const sign = dir === "asc" ? 1 : -1;
    // Stable sort; rows with no value stay at the bottom in both directions.
    return rows
      .map((row, i) => ({ row, i, v: get(row) }))
      .sort((x, y) => {
        const mx = isMissing(x.v), my = isMissing(y.v);
        if (mx || my) return mx === my ? x.i - y.i : mx ? 1 : -1;
        return sign * compare(x.v, y.v) || x.i - y.i;
      })
      .map((x) => x.row);
    // accessors is a fresh object each render; the key picks the function.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, key, dir]);

  return { rows: sorted, sort: { key, dir, toggle } };
}

/** Timestamp for sorting date strings; unparseable dates sort as missing. */
export function timeValue(value: unknown): number | null {
  if (value == null || value === "") return null;
  const t = Date.parse(String(value));
  return Number.isNaN(t) ? null : t;
}

interface SortableThProps<K extends string> {
  label: React.ReactNode;
  sortKey: K;
  sort: SortState<K>;
  align?: "left" | "right";
  className?: string;
}

export function SortableTh<K extends string>({ label, sortKey, sort, align = "left", className }: SortableThProps<K>) {
  const active = sort.key === sortKey;
  const Icon = !active ? ArrowUpDown : sort.dir === "asc" ? ArrowUp : ArrowDown;
  return (
    <th
      className={cn(align === "right" && "text-right", className)}
      aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : "none"}
    >
      <button
        type="button"
        onClick={() => sort.toggle(sortKey)}
        className={cn(
          "inline-flex items-center gap-1 select-none hover:text-foreground transition-colors",
          align === "right" && "flex-row-reverse",
          active && "text-foreground",
        )}
      >
        {label}
        <Icon className={cn("h-3 w-3 shrink-0", !active && "opacity-40")} />
      </button>
    </th>
  );
}
