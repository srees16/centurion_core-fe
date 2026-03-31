"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { DataTable } from "./data-table";
import { DecisionBadge } from "@/components/common/decision-badge";
import { formatNumber } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { VerdictResult, RegimeLabel } from "@/lib/types";

function RegimeBadge({ regime }: { regime?: RegimeLabel }) {
  if (!regime) return <span className="text-muted-foreground text-xs">—</span>;
  const color =
    regime === "TRENDING_BULL" ? "bg-green-600/20 text-green-500" :
    regime === "TRENDING_BEAR" ? "bg-red-600/20 text-red-500" :
    regime === "HIGH_VOLATILITY" ? "bg-orange-500/20 text-orange-400" :
    regime === "CRISIS" ? "bg-red-800/20 text-red-400" : "bg-blue-600/20 text-blue-400";
  return (
    <span className={cn("px-1.5 py-0.5 rounded text-[0.65rem] font-bold whitespace-nowrap", color)}>
      {regime.replace(/_/g, " ")}
    </span>
  );
}

const columns: ColumnDef<VerdictResult, unknown>[] = [
  { accessorKey: "ticker", header: "Ticker", cell: ({ row }) => <span className="font-mono">{row.original.ticker}</span> },
  { accessorKey: "core_score", header: "Core", cell: ({ row }) => formatNumber(row.original.core_score, 1) },
  { accessorKey: "strategy_score", header: "Strategy", cell: ({ row }) => formatNumber(row.original.strategy_score, 1) },
  {
    id: "regime",
    header: "Regime",
    cell: ({ row }) => <RegimeBadge regime={row.original.layer_details?.regime?.regime} />,
  },
  {
    id: "position_scale",
    header: "Scale",
    cell: ({ row }) => {
      const scale = row.original.layer_details?.regime?.position_scale;
      if (scale == null) return "—";
      return <span className={cn(scale < 0.5 ? "text-red-500" : scale < 0.8 ? "text-yellow-500" : "text-green-500")}>{(scale * 100).toFixed(0)}%</span>;
    },
  },
  {
    id: "consensus",
    header: "Buy/Sell",
    cell: ({ row }) => {
      const s = row.original.layer_details?.strategy;
      if (!s) return "—";
      return <span className="text-xs">{s.buy_votes}B / {s.sell_votes}S</span>;
    },
  },
  { accessorKey: "ml_score", header: "ML", cell: ({ row }) => formatNumber(row.original.ml_score, 1) },
  { accessorKey: "weighted_score", header: "Weighted", cell: ({ row }) => formatNumber(row.original.weighted_score, 1) },
  {
    accessorKey: "verdict",
    header: "Verdict",
    cell: ({ row }) => <DecisionBadge decision={row.original.verdict} />,
  },
];

interface VerdictTableProps {
  data: VerdictResult[];
}

export function VerdictTable({ data }: VerdictTableProps) {
  return <DataTable data={data} columns={columns} searchPlaceholder="Search tickers…" compact />;
}
