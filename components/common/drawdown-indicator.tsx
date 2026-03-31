"use client";

import { cn } from "@/lib/utils";
import { usePortfolioRisk } from "@/hooks/use-macro";
import type { RiskLevel } from "@/lib/types";
import { AlertTriangle, ShieldAlert, ShieldOff, Shield } from "lucide-react";

const RISK_CONFIG: Record<RiskLevel, { icon: typeof Shield; color: string; bg: string; label: string }> = {
  NORMAL: { icon: Shield, color: "text-green-500", bg: "bg-green-600/10 border-green-600/30", label: "Normal" },
  WARNING: { icon: AlertTriangle, color: "text-yellow-500", bg: "bg-yellow-600/10 border-yellow-600/30", label: "Warning" },
  CRITICAL: { icon: ShieldAlert, color: "text-red-500", bg: "bg-red-600/10 border-red-600/30", label: "Critical" },
  HALTED: { icon: ShieldOff, color: "text-red-400", bg: "bg-red-900/20 border-red-800/40 animate-pulse", label: "HALTED" },
};

interface DrawdownIndicatorProps {
  market: string;
  compact?: boolean;
}

export function DrawdownIndicator({ market, compact = false }: DrawdownIndicatorProps) {
  const { data: risk, isLoading } = usePortfolioRisk(market);

  if (isLoading || !risk) return null;

  const cfg = RISK_CONFIG[risk.risk_level as RiskLevel] ?? RISK_CONFIG.NORMAL;
  const Icon = cfg.icon;

  if (compact) {
    if (risk.risk_level === "NORMAL") return null;
    return (
      <div className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold", cfg.bg, cfg.color)}>
        <Icon className="h-3.5 w-3.5" />
        <span>{cfg.label}</span>
        <span className="text-muted-foreground">DD {risk.drawdown_pct.toFixed(1)}%</span>
      </div>
    );
  }

  return (
    <div className={cn("rounded-lg border p-4 space-y-3", cfg.bg)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className={cn("h-5 w-5", cfg.color)} />
          <h3 className="text-sm font-bold">Portfolio Risk: {cfg.label}</h3>
        </div>
        <span className={cn("text-lg font-bold", cfg.color)}>
          {risk.scale_factor < 1 ? `${(risk.scale_factor * 100).toFixed(0)}% Size` : "Full Size"}
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
        <div>
          <span className="text-muted-foreground">Drawdown</span>
          <p className={cn("font-bold text-sm", risk.drawdown_pct > 10 ? "text-red-500" : risk.drawdown_pct > 5 ? "text-yellow-500" : "")}>
            {risk.drawdown_pct.toFixed(1)}%
          </p>
          <div className="flex gap-1 mt-1">
            <span className={cn("px-1 rounded text-[0.6rem] font-semibold border", risk.drawdown_pct >= 15 ? "bg-yellow-600/20 border-yellow-600/40 text-yellow-500" : "border-muted-foreground/20 text-muted-foreground/50")}>15%</span>
            <span className={cn("px-1 rounded text-[0.6rem] font-semibold border", risk.drawdown_pct >= 25 ? "bg-red-600/20 border-red-600/40 text-red-500" : "border-muted-foreground/20 text-muted-foreground/50")}>25%</span>
            <span className={cn("px-1 rounded text-[0.6rem] font-semibold border", risk.drawdown_pct >= 30 ? "bg-red-900/30 border-red-800/50 text-red-400 animate-pulse" : "border-muted-foreground/20 text-muted-foreground/50")}>30%</span>
          </div>
        </div>
        <div>
          <span className="text-muted-foreground">Annual Vol</span>
          <p className="font-bold text-sm">{(risk.portfolio_annual_vol_pct * 100).toFixed(1)}%</p>
        </div>
        <div>
          <span className="text-muted-foreground">Vol Ratio</span>
          <p className={cn("font-bold text-sm", risk.vol_ratio > 1.2 ? "text-yellow-500" : "")}>
            {risk.vol_ratio.toFixed(2)}×
          </p>
        </div>
        <div>
          <span className="text-muted-foreground">Concentration</span>
          <p className={cn("font-bold text-sm", risk.hhi > 0.25 ? "text-yellow-500" : "")}>
            HHI {risk.hhi.toFixed(2)}
          </p>
        </div>
      </div>

      {risk.alerts.length > 0 && (
        <div className="space-y-1">
          {risk.alerts.map((alert, i) => (
            <p key={i} className={cn("text-xs", cfg.color)}>{alert}</p>
          ))}
        </div>
      )}

      {risk.emergency_liquidate && (
        <div className="rounded bg-red-900 text-white text-sm font-bold p-2 text-center animate-pulse">
          ⛔ EMERGENCY LIQUIDATION TRIGGERED
        </div>
      )}
    </div>
  );
}
