"use client";

import { cn } from "@/lib/utils";
import type { R22BacktestResponse } from "@/lib/types";
import { ArrowUp, ArrowDown, Minus } from "lucide-react";

interface R22ComparisonProps {
  data: R22BacktestResponse;
  className?: string;
}

function DeltaCell({ r22, r21a, inverse }: { r22: number; r21a: number; inverse?: boolean }) {
  const delta = r22 - r21a;
  const improved = inverse ? delta < 0 : delta > 0;
  const degraded = inverse ? delta > 0 : delta < 0;

  return (
    <td className="px-3 py-2 text-right tabular-nums">
      <span
        className={cn(
          "inline-flex items-center gap-1 text-sm",
          improved && "text-emerald-400",
          degraded && "text-red-400",
          !improved && !degraded && "text-muted-foreground"
        )}
      >
        {improved && <ArrowUp className="h-3 w-3" />}
        {degraded && <ArrowDown className="h-3 w-3" />}
        {!improved && !degraded && <Minus className="h-3 w-3" />}
        {delta >= 0 ? "+" : ""}
        {delta.toFixed(3)}
      </span>
    </td>
  );
}

export function R22ComparisonTable({ data, className }: R22ComparisonProps) {
  const { metrics: r22, r21a_benchmark: r21a } = data;

  const rows: { label: string; r22: number; r21a: number; fmt: string; inverse?: boolean }[] = [
    { label: "Sharpe", r22: r22.sharpe, r21a: r21a.sharpe, fmt: ".3f" },
    { label: "Sortino", r22: r22.sortino, r21a: r21a.sortino, fmt: ".3f" },
    { label: "Calmar", r22: r22.calmar, r21a: r21a.calmar, fmt: ".3f" },
    { label: "CAGR (%)", r22: r22.cagr_pct, r21a: r21a.cagr_pct, fmt: ".1f" },
    { label: "Max DD (%)", r22: r22.max_drawdown_pct, r21a: r21a.max_drawdown_pct, fmt: ".1f", inverse: true },
    { label: "Total Return (%)", r22: r22.total_return_pct, r21a: r21a.total_return_pct, fmt: ".1f" },
    { label: "Win Rate (%)", r22: r22.win_rate, r21a: r21a.win_rate, fmt: ".1f" },
    { label: "Profit Factor", r22: r22.profit_factor, r21a: r21a.profit_factor, fmt: ".2f" },
  ];

  const fmtNum = (val: number, fmt: string) => {
    const decimals = parseInt(fmt.replace(".", "").replace("f", ""));
    return val.toFixed(decimals);
  };

  return (
    <div className={cn("overflow-hidden rounded-lg border border-border", className)}>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/50">
            <th className="px-3 py-2 text-left font-medium text-muted-foreground">Metric</th>
            <th className="px-3 py-2 text-right font-medium text-muted-foreground">R21A</th>
            <th className="px-3 py-2 text-right font-medium text-emerald-400">R22</th>
            <th className="px-3 py-2 text-right font-medium text-muted-foreground">Delta</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className="border-b border-border/50 hover:bg-muted/30">
              <td className="px-3 py-2 text-sm font-medium">{row.label}</td>
              <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                {fmtNum(row.r21a, row.fmt)}
              </td>
              <td className="px-3 py-2 text-right tabular-nums font-medium">
                {fmtNum(row.r22, row.fmt)}
              </td>
              <DeltaCell r22={row.r22} r21a={row.r21a} inverse={row.inverse} />
            </tr>
          ))}
        </tbody>
      </table>
      {/* Infusion summary row */}
      <div className="border-t border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">
          {data.infusion_summary.n_alerts} bull alerts
        </span>
        {" · "}
        {data.infusion_summary.enabled ? (
          <span>
            {data.infusion_summary.n_infusions} infusions · Total infused: ₹
            {data.infusion_summary.total_infused.toLocaleString("en-IN")}
          </span>
        ) : (
          <span>Alerts only (no capital infused)</span>
        )}
      </div>
    </div>
  );
}
