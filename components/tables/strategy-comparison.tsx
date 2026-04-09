"use client";

import type { StrategyMetrics } from "@/lib/types";
import { formatNumber, formatPct } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface StrategyComparisonProps {
  compounder: StrategyMetrics;
  harvest: StrategyMetrics;
  combinedWealth: number;
  combinedReturnPct: number;
}

const rows: { label: string; key: keyof StrategyMetrics; fmt: "num" | "pct" | "int" }[] = [
  { label: "Capital Allocated", key: "capital_allocated", fmt: "num" },
  { label: "Final Equity", key: "final_equity", fmt: "num" },
  { label: "CAGR", key: "cagr_pct", fmt: "pct" },
  { label: "Sharpe", key: "sharpe", fmt: "num" },
  { label: "Sortino", key: "sortino", fmt: "num" },
  { label: "Max Drawdown", key: "max_drawdown_pct", fmt: "pct" },
  { label: "Calmar", key: "calmar", fmt: "num" },
  { label: "Total Return", key: "total_return_pct", fmt: "pct" },
  { label: "Total Trades", key: "total_trades", fmt: "int" },
  { label: "Win Rate", key: "win_rate", fmt: "pct" },
  { label: "Profit Factor", key: "profit_factor", fmt: "num" },
];

function fmtVal(v: number, fmt: "num" | "pct" | "int") {
  if (fmt === "pct") return formatPct(v / 100);
  if (fmt === "int") return String(v);
  return formatNumber(v);
}

export function StrategyComparison({ compounder, harvest, combinedWealth, combinedReturnPct }: StrategyComparisonProps) {
  return (
    <div className="content-panel p-4 space-y-2">
      <h3 className="text-sm font-semibold">Strategy Comparison</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b text-muted-foreground">
              <th className="text-left py-1 pr-3">Metric</th>
              <th className="text-right py-1 px-3 text-blue-600">Compounder</th>
              <th className="text-right py-1 px-3 text-amber-600">Harvest</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key} className="border-b border-muted/50">
                <td className="py-1.5 pr-3 text-muted-foreground">{r.label}</td>
                <td className="py-1.5 px-3 text-right font-mono">{fmtVal(compounder[r.key] as number, r.fmt)}</td>
                <td className="py-1.5 px-3 text-right font-mono">{fmtVal(harvest[r.key] as number, r.fmt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between pt-2 border-t text-sm">
        <span className="font-semibold">Combined Wealth</span>
        <span className={cn("font-bold", combinedReturnPct >= 0 ? "text-green-600" : "text-red-600")}>
          ₹{formatNumber(combinedWealth)} ({formatPct(combinedReturnPct / 100)})
        </span>
      </div>
    </div>
  );
}
