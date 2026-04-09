"use client";

import { useState } from "react";
import { MetricsGrid, MetricCard } from "@/components/common/metrics-cards";
import { DualEquityCurve } from "@/components/charts/dual-equity-curve";
import { HarvestTimeline } from "@/components/charts/harvest-timeline";
import { StrategyComparison } from "@/components/tables/strategy-comparison";
import { RibbonVixBar } from "@/components/common/ribbon-vix-bar";
import { Spinner } from "@/components/common/spinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePortfolio } from "@/hooks/use-portfolio";
import { NIFTY_50_TICKERS } from "@/lib/constants";
import { formatCurrency, formatPct } from "@/lib/utils";
import { Play } from "lucide-react";
import type { HarvestParams } from "@/lib/types";

const PRESET_OPTIONS = ["conservative", "balanced", "aggressive"] as const;

export default function PortfolioPage() {
  const { presets, presetsLoading, run, isRunning, result, error } = usePortfolio();

  const [totalCapital, setTotalCapital] = useState(1_000_000);
  const [compounderPct, setCompounderPct] = useState(50);
  const [selectedPreset, setSelectedPreset] = useState<string>("balanced");
  const [startDate, setStartDate] = useState("2012-01-01");
  const [endDate, setEndDate] = useState("2025-12-31");

  const harvestPct = 100 - compounderPct;

  const handleRun = () => {
    const hp: HarvestParams = presets[selectedPreset] ?? {
      inject_pct: 0.2,
      book_pct: 0.15,
      sustain_days: 30,
      min_gain_to_book: 0.1,
      inject_cooldown_days: 200,
    };
    run({
      total_capital: totalCapital,
      compounder_pct: compounderPct,
      harvest_params: { ...hp, preset: selectedPreset },
      start_date: startDate,
      end_date: endDate,
    });
  };

  return (
    <div className="space-y-6">
      <RibbonVixBar symbols={NIFTY_50_TICKERS} market="IND" />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* ─── Config Panel ─── */}
        <div className="content-panel p-4 space-y-4">
          <h3 className="text-sm font-semibold">Portfolio Allocator</h3>

          <div className="space-y-1">
            <Label className="text-xs">Total Capital (₹)</Label>
            <Input
              type="number"
              min={100000}
              step={100000}
              value={totalCapital}
              onChange={(e) => setTotalCapital(Number(e.target.value))}
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs">
              Compounder: {compounderPct}% — Harvest: {harvestPct}%
            </Label>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={compounderPct}
              onChange={(e) => setCompounderPct(Number(e.target.value))}
              className="w-full accent-blue-500"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>₹{((totalCapital * compounderPct) / 100).toLocaleString()}</span>
              <span>₹{((totalCapital * harvestPct) / 100).toLocaleString()}</span>
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Harvest Preset</Label>
            <div className="flex gap-1">
              {PRESET_OPTIONS.map((p) => (
                <button
                  key={p}
                  onClick={() => setSelectedPreset(p)}
                  className={`flex-1 text-[10px] py-1 px-1 rounded border transition-colors ${
                    selectedPreset === p
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-muted hover:border-foreground/30"
                  }`}
                >
                  {p[0].toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>
            {presets[selectedPreset] && (
              <div className="text-[10px] text-muted-foreground mt-1 space-y-0.5">
                <p>Inject: {(presets[selectedPreset].inject_pct * 100).toFixed(0)}% | Book: {(presets[selectedPreset].book_pct * 100).toFixed(0)}%</p>
                <p>Sustain: {presets[selectedPreset].sustain_days}d | Cooldown: {presets[selectedPreset].inject_cooldown_days}d</p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Start</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">End</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>

          <Button className="w-full" onClick={handleRun} disabled={isRunning}>
            {isRunning ? "Running…" : <><Play className="mr-1 h-4 w-4" /> Run Dual Backtest</>}
          </Button>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        {/* ─── Results Panel ─── */}
        <div className="md:col-span-3 space-y-4">
          {isRunning && <Spinner />}
          {result && (
            <>
              <MetricsGrid>
                <MetricCard
                  label="Combined Wealth"
                  value={formatCurrency(result.combined_wealth, "INR")}
                  color={result.combined_return_pct >= 0 ? "text-green-500" : "text-red-500"}
                />
                <MetricCard label="Combined Return" value={formatPct(result.combined_return_pct / 100)} />
                <MetricCard label="CC Sharpe" value={result.compounder.sharpe.toFixed(2)} />
                <MetricCard label="CH Sharpe" value={result.harvest.sharpe.toFixed(2)} />
                <MetricCard label="CC CAGR" value={formatPct(result.compounder.cagr_pct / 100)} />
                <MetricCard label="CH Net Extracted" value={formatCurrency(result.harvest_summary?.net_extracted ?? 0, "INR")} color="text-green-500" />
              </MetricsGrid>

              <DualEquityCurve
                compounder={result.compounder_equity}
                harvest={result.harvest_equity}
              />

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <StrategyComparison
                  compounder={result.compounder}
                  harvest={result.harvest}
                  combinedWealth={result.combined_wealth}
                  combinedReturnPct={result.combined_return_pct}
                />
                {result.harvest_summary && (
                  <HarvestTimeline summary={result.harvest_summary} />
                )}
              </div>

              <p className="text-xs text-muted-foreground text-right">
                Executed in {result.execution_time_sec.toFixed(1)}s
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
