"use client";

import { useState } from "react";
import { MetricsGrid, MetricCard } from "@/components/common/metrics-cards";
import { EquityCurveChart } from "@/components/charts/equity-curve-chart";
import { RibbonVixBar } from "@/components/common/ribbon-vix-bar";
import { Spinner } from "@/components/common/spinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePortfolio } from "@/hooks/use-portfolio";
import { NIFTY_50_TICKERS } from "@/lib/constants";
import { formatCurrency, formatPct } from "@/lib/utils";
import { Play, TrendingUp, BarChart3, Shield } from "lucide-react";

export default function CompounderPage() {
  const { run, isRunning, result, error } = usePortfolio();

  const [capital, setCapital] = useState(1_000_000);
  const [startDate, setStartDate] = useState("2012-01-01");
  const [endDate, setEndDate] = useState("2025-12-31");

  const handleRun = () => {
    run({
      total_capital: capital,
      compounder_pct: 100, // 100% to compounder — no harvest split
      start_date: startDate,
      end_date: endDate,
    });
  };

  const cc = result?.compounder;
  const equityData =
    result?.compounder_equity.map((pt) => ({
      date: String(pt.day),
      value: pt.equity,
      drawdown: 0,
    })) ?? [];

  return (
    <div className="space-y-6">
      <RibbonVixBar symbols={NIFTY_50_TICKERS} market="IND" />

      <div>
        <h2 className="text-lg font-semibold">Centurion Compounder</h2>
        <p className="text-xs text-muted-foreground mt-1">
          Pure compounding strategy — R21A optimized weights with regime-adaptive
          vol target. No profit booking, no capital injection. Let it compound.
        </p>
      </div>

      {/* Config */}
      <div className="content-panel p-4">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end">
          <div className="space-y-1">
            <Label className="text-xs">Capital (₹)</Label>
            <Input
              type="number"
              min={100000}
              step={100000}
              value={capital}
              onChange={(e) => setCapital(Number(e.target.value))}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Start Date</Label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">End Date</Label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <Button onClick={handleRun} disabled={isRunning} className="w-full">
            {isRunning ? (
              "Running…"
            ) : (
              <>
                <Play className="mr-1 h-4 w-4" /> Run Compounder
              </>
            )}
          </Button>
        </div>
        {error && (
          <p className="text-sm text-destructive mt-2">{error}</p>
        )}
      </div>

      {isRunning && <Spinner />}

      {cc && !isRunning && (
        <>
          {/* KPI metrics */}
          <div>
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <BarChart3 className="h-4 w-4" /> Compounder Metrics
            </h3>
            <MetricsGrid>
              <MetricCard
                label="Final Equity"
                value={formatCurrency(cc.final_equity, "INR")}
                color="text-green-500"
              />
              <MetricCard
                label="Total Return"
                value={formatPct(cc.total_return_pct / 100)}
                color={cc.total_return_pct >= 0 ? "pnl-positive" : "pnl-negative"}
              />
              <MetricCard
                label="CAGR"
                value={formatPct(cc.cagr_pct / 100)}
                color={cc.cagr_pct >= 0 ? "pnl-positive" : "pnl-negative"}
              />
              <MetricCard
                label="Sharpe Ratio"
                value={cc.sharpe.toFixed(3)}
                color={
                  cc.sharpe >= 1.0
                    ? "text-green-500"
                    : cc.sharpe >= 0.5
                      ? "text-amber-500"
                      : "text-red-500"
                }
              />
              <MetricCard label="Sortino" value={cc.sortino.toFixed(3)} />
              <MetricCard label="Calmar" value={cc.calmar.toFixed(3)} />
              <MetricCard
                label="Max Drawdown"
                value={formatPct(cc.max_drawdown_pct / 100)}
                color={
                  cc.max_drawdown_pct > 30
                    ? "text-red-500"
                    : "text-amber-500"
                }
              />
              <MetricCard label="Win Rate" value={formatPct(cc.win_rate)} />
              <MetricCard
                label="Profit Factor"
                value={cc.profit_factor.toFixed(2)}
              />
              <MetricCard label="Total Trades" value={cc.total_trades} />
            </MetricsGrid>
          </div>

          {/* Equity curve */}
          {equityData.length > 0 && (
            <div className="content-panel p-4">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" /> Compounding Equity Curve
              </h3>
              <EquityCurveChart data={equityData} height={350} />
            </div>
          )}

          {/* Compounding insight */}
          <div className="content-panel p-4 border-l-4 border-l-blue-500 bg-blue-500/5">
            <h3 className="text-sm font-semibold mb-1 flex items-center gap-2">
              <Shield className="h-4 w-4" /> Compounding Summary
            </h3>
            <p className="text-xs text-muted-foreground">
              ₹{(capital / 100000).toFixed(1)}L invested →{" "}
              ₹{(cc.final_equity / 100000).toFixed(1)}L final equity |{" "}
              {cc.cagr_pct.toFixed(1)}% CAGR over{" "}
              {((equityData.length) / 252).toFixed(1)} years |{" "}
              Max drawdown {cc.max_drawdown_pct.toFixed(1)}%
            </p>
          </div>

          <p className="text-xs text-muted-foreground text-right">
            Executed in {result.execution_time_sec.toFixed(1)}s
          </p>
        </>
      )}
    </div>
  );
}
