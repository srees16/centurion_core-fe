"use client";

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { MetricsGrid, MetricCard } from "@/components/common/metrics-cards";
import { EquityCurveChart } from "@/components/charts/equity-curve-chart";
import { HarvestTimeline } from "@/components/charts/harvest-timeline";
import { DualEquityCurve } from "@/components/charts/dual-equity-curve";
import { BullAlertBanner } from "@/components/common/bull-alert-banner";
import { RibbonVixBar } from "@/components/common/ribbon-vix-bar";
import { Spinner } from "@/components/common/spinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePortfolio } from "@/hooks/use-portfolio";
import { useR22 } from "@/hooks/use-r22";
import { useToast } from "@/hooks/use-toast";
import { NIFTY_50_TICKERS } from "@/lib/constants";
import { formatCurrency, formatPct } from "@/lib/utils";
import {
  Play, TrendingUp, TrendingDown, BarChart3, Shield, Zap, ArrowUpRight
} from "lucide-react";
import type { HarvestParams, R22BacktestRequest, PortfolioEquityPoint } from "@/lib/types";

const PRESET_OPTIONS = ["conservative", "balanced", "aggressive"] as const;

export default function HarvestPage() {
  const { presets, presetsLoading, run, isRunning, result, error } = usePortfolio();
  const r22 = useR22();
  const { toast } = useToast();

  const [tab, setTab] = useState("profit-booking");

  // Profit Booking config
  const [capital, setCapital] = useState(1_000_000);
  const [selectedPreset, setSelectedPreset] = useState<string>("balanced");
  const [startDate, setStartDate] = useState("2012-01-01");
  const [endDate, setEndDate] = useState("2025-12-31");

  // Capital Infusion config (R22)
  const [infCapital, setInfCapital] = useState(500_000);
  const [infAmount, setInfAmount] = useState(50_000);
  const [infCooldown, setInfCooldown] = useState(200);
  const [infConfirmDays, setInfConfirmDays] = useState(5);

  const handleRunHarvest = () => {
    const hp: HarvestParams = presets[selectedPreset] ?? {
      inject_pct: 0.2,
      book_pct: 0.15,
      sustain_days: 30,
      min_gain_to_book: 0.1,
      inject_cooldown_days: 200,
    };
    run({
      total_capital: capital,
      compounder_pct: 0, // 100% to harvest
      harvest_params: { ...hp, preset: selectedPreset },
      start_date: startDate,
      end_date: endDate,
    });
  };

  const handleRunInfusion = async () => {
    try {
      const req: R22BacktestRequest = {
        capital: infCapital,
        infuse: true,
        infusion_amount: infAmount,
        cooldown_days: infCooldown,
        bull_confirm_days: infConfirmDays,
        start_date: startDate,
        end_date: endDate,
      };
      await r22.runBacktestAsync(req);
      toast({
        title: "Capital Infusion Backtest Complete",
        description: "Bull-run infusion analysis ready.",
        variant: "success",
      });
    } catch {
      toast({
        title: "Backtest Failed",
        description: "Check API logs for details.",
        variant: "destructive",
      });
    }
  };

  const ch = result?.harvest;
  const hs = result?.harvest_summary;
  const harvestEquity =
    result?.harvest_equity.map((pt) => ({
      date: String(pt.day),
      value: pt.equity,
      drawdown: 0,
    })) ?? [];

  // R22 infusion results
  const r22Result = r22.result;
  const r22Equity: PortfolioEquityPoint[] =
    r22Result?.daily_equity.map((eq, i) => ({ day: i, equity: eq })) ?? [];
  const r21aEquity: PortfolioEquityPoint[] =
    r22Result?.r21a_daily_equity.map((eq, i) => ({ day: i, equity: eq })) ?? [];

  return (
    <div className="space-y-6">
      <RibbonVixBar symbols={NIFTY_50_TICKERS} market="IND" />

      <div>
        <h2 className="text-lg font-semibold">Centurion Harvest</h2>
        <p className="text-xs text-muted-foreground mt-1">
          Active profit extraction — book gains in sustained bull runs, inject
          capital at regime transitions. Optimised for realised returns.
        </p>
      </div>

      {/* Bull Alert Banner (from R22) */}
      <BullAlertBanner
        hasAlert={r22.alert?.has_active_alert ?? false}
        message={r22.alert?.message ?? "Monitoring regime for bull-run transition..."}
        onInfuse={() =>
          toast({
            title: "Capital Infusion Requested",
            description: `₹${infAmount.toLocaleString("en-IN")} infusion will be processed on next trading day.`,
            variant: "success",
          })
        }
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="profit-booking">Profit Booking</TabsTrigger>
          <TabsTrigger value="capital-infusion">Capital Infusion</TabsTrigger>
        </TabsList>

        {/* ─── Tab 1: Profit Booking ─── */}
        <TabsContent value="profit-booking" className="mt-4">
          <div className="space-y-6">
            {/* Config */}
            <div className="content-panel p-4">
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 items-end">
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
                  <Label className="text-xs">Harvest Preset</Label>
                  <div className="flex gap-1">
                    {PRESET_OPTIONS.map((p) => (
                      <button
                        key={p}
                        onClick={() => setSelectedPreset(p)}
                        className={`flex-1 text-[10px] py-2 px-1 rounded border transition-colors ${
                          selectedPreset === p
                            ? "bg-primary text-primary-foreground border-primary"
                            : "border-muted hover:border-foreground/30"
                        }`}
                      >
                        {p[0].toUpperCase() + p.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Start Date</Label>
                  <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">End Date</Label>
                  <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </div>
                <Button onClick={handleRunHarvest} disabled={isRunning} className="w-full">
                  {isRunning ? "Running…" : <><Play className="mr-1 h-4 w-4" /> Run Harvest</>}
                </Button>
              </div>
              {presets[selectedPreset] && (
                <p className="text-[10px] text-muted-foreground mt-2">
                  Inject: {(presets[selectedPreset].inject_pct * 100).toFixed(0)}% |
                  Book: {(presets[selectedPreset].book_pct * 100).toFixed(0)}% |
                  Sustain: {presets[selectedPreset].sustain_days}d |
                  Cooldown: {presets[selectedPreset].inject_cooldown_days}d
                </p>
              )}
              {error && <p className="text-sm text-destructive mt-2">{error}</p>}
            </div>

            {isRunning && <Spinner />}

            {ch && !isRunning && (
              <>
                {/* KPI metrics */}
                <div>
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" /> Harvest Metrics
                  </h3>
                  <MetricsGrid>
                    <MetricCard label="Final Equity" value={formatCurrency(ch.final_equity, "INR")} color="text-green-500" />
                    <MetricCard label="Total Return" value={formatPct(ch.total_return_pct / 100)} color={ch.total_return_pct >= 0 ? "pnl-positive" : "pnl-negative"} />
                    <MetricCard label="CAGR" value={formatPct(ch.cagr_pct / 100)} color={ch.cagr_pct >= 0 ? "pnl-positive" : "pnl-negative"} />
                    <MetricCard label="Sharpe" value={ch.sharpe.toFixed(3)} color={ch.sharpe >= 1.0 ? "text-green-500" : ch.sharpe >= 0.5 ? "text-amber-500" : "text-red-500"} />
                    <MetricCard label="Max Drawdown" value={formatPct(ch.max_drawdown_pct / 100)} color={ch.max_drawdown_pct > 30 ? "text-red-500" : "text-amber-500"} />
                    {hs && <MetricCard label="Net Extracted" value={formatCurrency(hs.net_extracted, "INR")} color="text-green-500" />}
                    {hs && <MetricCard label="Total Booked" value={formatCurrency(hs.total_booked, "INR")} color="text-amber-500" />}
                    {hs && <MetricCard label="Total Injected" value={formatCurrency(hs.total_injected, "INR")} color="text-blue-500" />}
                  </MetricsGrid>
                </div>

                {/* Equity curve */}
                {harvestEquity.length > 0 && (
                  <div className="content-panel p-4">
                    <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" /> Harvest Equity Curve
                    </h3>
                    <EquityCurveChart data={harvestEquity} height={350} />
                  </div>
                )}

                {/* Harvest timeline (inject/book events) */}
                {hs && (
                  <div className="content-panel p-4">
                    <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                      <Zap className="h-4 w-4" /> Harvest Events Timeline
                    </h3>
                    <HarvestTimeline summary={hs} />
                  </div>
                )}

                {/* Summary */}
                <div className="content-panel p-4 border-l-4 border-l-amber-500 bg-amber-500/5">
                  <h3 className="text-sm font-semibold mb-1 flex items-center gap-2">
                    <Shield className="h-4 w-4" /> Profit Booking Summary
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    ₹{(capital / 100000).toFixed(1)}L invested |{" "}
                    {hs ? `${hs.book_events.length} bookings, ${hs.inject_events.length} injections` : "No events"} |{" "}
                    Net extracted: {hs ? formatCurrency(hs.net_extracted, "INR") : "₹0"} |{" "}
                    Final equity: {formatCurrency(ch.final_equity, "INR")}
                  </p>
                </div>

                <p className="text-xs text-muted-foreground text-right">
                  Executed in {result!.execution_time_sec.toFixed(1)}s
                </p>
              </>
            )}
          </div>
        </TabsContent>

        {/* ─── Tab 2: Capital Infusion (R22) ─── */}
        <TabsContent value="capital-infusion" className="mt-4">
          <div className="space-y-6">
            {/* Config */}
            <div className="content-panel p-4">
              <p className="text-xs text-muted-foreground mb-4">
                Bull-run capital infusion — inject fresh capital at confirmed bear→bull
                regime transitions. Compounding continues even without infusion.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 items-end">
                <div className="space-y-1">
                  <Label className="text-xs">Capital (₹)</Label>
                  <Input type="number" value={infCapital} onChange={(e) => setInfCapital(Number(e.target.value))} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Infusion Amount (₹)</Label>
                  <Input type="number" value={infAmount} onChange={(e) => setInfAmount(Number(e.target.value))} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Cooldown (days)</Label>
                  <Input type="number" value={infCooldown} onChange={(e) => setInfCooldown(Number(e.target.value))} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Bull Confirm (days)</Label>
                  <Input type="number" value={infConfirmDays} onChange={(e) => setInfConfirmDays(Number(e.target.value))} />
                </div>
                <Button onClick={handleRunInfusion} disabled={r22.isRunning} className="w-full">
                  {r22.isRunning ? "Running…" : <><ArrowUpRight className="mr-1 h-4 w-4" /> Run Infusion</>}
                </Button>
              </div>
            </div>

            {r22.isRunning && <Spinner label="Running capital infusion backtest..." />}

            {r22Result && !r22.isRunning && (
              <>
                {/* R22 vs R21A metrics */}
                <div>
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" /> Infusion vs Baseline
                  </h3>
                  <MetricsGrid>
                    <MetricCard label="R22 Sharpe" value={r22Result.metrics.sharpe.toFixed(3)} color={r22Result.metrics.sharpe >= 1.0 ? "text-green-500" : "text-amber-500"} />
                    <MetricCard label="Base Sharpe" value={r22Result.r21a_benchmark.sharpe.toFixed(3)} />
                    <MetricCard label="R22 CAGR" value={formatPct(r22Result.metrics.cagr_pct / 100)} color="pnl-positive" />
                    <MetricCard label="Base CAGR" value={formatPct(r22Result.r21a_benchmark.cagr_pct / 100)} />
                    <MetricCard label="R22 Max DD" value={formatPct(r22Result.metrics.max_drawdown_pct / 100)} color={r22Result.metrics.max_drawdown_pct > 30 ? "text-red-500" : "text-amber-500"} />
                    <MetricCard label="Infusions" value={r22Result.infusion_summary.n_infusions} color="text-blue-500" />
                    <MetricCard label="Total Infused" value={formatCurrency(r22Result.infusion_summary.total_infused, "INR")} />
                    <MetricCard label="Alerts" value={r22Result.infusion_summary.n_alerts} />
                  </MetricsGrid>
                </div>

                {/* Dual equity curve */}
                <div className="content-panel p-4">
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" /> Infusion vs Baseline Equity
                  </h3>
                  <DualEquityCurve compounder={r21aEquity} harvest={r22Equity} />
                </div>

                {/* Infusion events */}
                {r22Result.infusion_summary.alert_events.length > 0 && (
                  <div className="content-panel p-4">
                    <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                      <Zap className="h-4 w-4" /> Bull-Run Alert Timeline
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-left text-muted-foreground">
                            <th className="py-2 pr-3 font-medium">Day</th>
                            <th className="py-2 pr-3 font-medium">Date</th>
                            <th className="py-2 pr-3 font-medium text-right">Status</th>
                            <th className="py-2 pr-3 font-medium text-right">Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {r22Result.infusion_summary.alert_events.map((evt, i) => {
                            const infusion = r22Result.infusion_summary.infusion_events.find(
                              (ie) => ie.day === evt.day
                            );
                            return (
                              <tr key={i} className="border-b last:border-0 hover:bg-accent/50">
                                <td className="py-2 pr-3 tabular-nums">{evt.day}</td>
                                <td className="py-2 pr-3">{evt.date}</td>
                                <td className="py-2 pr-3 text-right">
                                  {infusion ? (
                                    <span className="inline-flex items-center rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-500">
                                      INFUSED
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-500">
                                      ALERT
                                    </span>
                                  )}
                                </td>
                                <td className="py-2 pr-3 text-right tabular-nums">
                                  {infusion ? `+₹${infusion.amount.toLocaleString("en-IN")}` : "—"}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
