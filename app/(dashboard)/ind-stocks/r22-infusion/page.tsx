"use client";

import { useState } from "react";
import { useR22 } from "@/hooks/use-r22";
import { useToast } from "@/hooks/use-toast";
import { BullAlertBanner } from "@/components/common/bull-alert-banner";
import { R22ComparisonTable } from "@/components/tables/r22-comparison";
import { DualEquityCurve } from "@/components/charts/dual-equity-curve";
import { Spinner } from "@/components/common/spinner";
import type { R22BacktestRequest, PortfolioEquityPoint } from "@/lib/types";

export default function R22InfusionPage() {
  const { alert, runBacktestAsync, isRunning, result } = useR22();
  const { toast } = useToast();

  // Form state
  const [capital, setCapital] = useState(500_000);
  const [infuse, setInfuse] = useState(true);
  const [amount, setAmount] = useState(50_000);
  const [cooldown, setCooldown] = useState(200);
  const [confirmDays, setConfirmDays] = useState(5);

  async function handleRun() {
    try {
      const req: R22BacktestRequest = {
        capital,
        infuse,
        infusion_amount: amount,
        cooldown_days: cooldown,
        bull_confirm_days: confirmDays,
        start_date: "2012-01-01",
        end_date: "2025-12-31",
      };
      await runBacktestAsync(req);
      toast({
        title: "R22 Backtest Complete",
        description: "Capital infusion analysis ready.",
        variant: "success",
      });
    } catch {
      toast({
        title: "Backtest Failed",
        description: "Check API logs for details.",
        variant: "destructive",
      });
    }
  }

  // Build equity curve data for the chart
  const r22Equity: PortfolioEquityPoint[] =
    result?.daily_equity.map((eq, i) => ({ day: i, equity: eq })) ?? [];
  const r21aEquity: PortfolioEquityPoint[] =
    result?.r21a_daily_equity.map((eq, i) => ({ day: i, equity: eq })) ?? [];

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">
          R22 — Bull-Run Capital Infusion
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Centurion Compounder enhancement: inject fresh capital at confirmed
          bear→bull transitions. Compounding continues even without infusion.
        </p>
      </div>

      {/* Live Alert Banner */}
      <BullAlertBanner
        hasAlert={alert?.has_active_alert ?? false}
        message={
          alert?.message ??
          "Monitoring regime for bull-run transition..."
        }
        onInfuse={() =>
          toast({
            title: "Capital Infusion Requested",
            description: `₹${amount.toLocaleString("en-IN")} infusion will be processed on next trading day.`,
            variant: "success",
          })
        }
      />

      {/* Configuration Panel */}
      <div className="grid gap-4 rounded-lg border border-border bg-card p-4 md:grid-cols-5">
        <div>
          <label className="text-xs text-muted-foreground">Capital (₹)</label>
          <input
            type="number"
            value={capital}
            onChange={(e) => setCapital(Number(e.target.value))}
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Infusion Amount (₹)</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Cooldown (days)</label>
          <input
            type="number"
            value={cooldown}
            onChange={(e) => setCooldown(Number(e.target.value))}
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Bull Confirm (days)</label>
          <input
            type="number"
            value={confirmDays}
            onChange={(e) => setConfirmDays(Number(e.target.value))}
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </div>
        <div className="flex flex-col justify-between">
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={infuse}
              onChange={(e) => setInfuse(e.target.checked)}
              className="rounded"
            />
            Infuse Capital
          </label>
          <button
            onClick={handleRun}
            disabled={isRunning}
            className="mt-1 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {isRunning ? "Running..." : "Run R22 Backtest"}
          </button>
        </div>
      </div>

      {/* Loading */}
      {isRunning && (
        <div className="flex items-center justify-center gap-3 py-12">
          <Spinner label="Running R22 + R21A comparison backtest..." />
        </div>
      )}

      {/* Results */}
      {result && !isRunning && (
        <div className="space-y-6">
          {/* R22 vs R21A Comparison Table */}
          <div>
            <h2 className="mb-3 text-lg font-semibold">R22 vs R21A Comparison</h2>
            <R22ComparisonTable data={result} />
          </div>

          {/* Dual Equity Curve */}
          <div>
            <h2 className="mb-3 text-lg font-semibold">Equity Curves</h2>
            <DualEquityCurve
              compounder={r21aEquity}
              harvest={r22Equity}
            />
          </div>

          {/* Infusion Events Timeline */}
          {result.infusion_summary.alert_events.length > 0 && (
            <div>
              <h2 className="mb-3 text-lg font-semibold">Bull-Run Alert Timeline</h2>
              <div className="overflow-hidden rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">Day</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">Date</th>
                      <th className="px-3 py-2 text-right font-medium text-muted-foreground">Status</th>
                      <th className="px-3 py-2 text-right font-medium text-muted-foreground">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.infusion_summary.alert_events.map((evt, i) => {
                      const infusion = result.infusion_summary.infusion_events.find(
                        (ie) => ie.day === evt.day
                      );
                      return (
                        <tr key={i} className="border-b border-border/50 hover:bg-muted/30">
                          <td className="px-3 py-2 tabular-nums">{evt.day}</td>
                          <td className="px-3 py-2">{evt.date}</td>
                          <td className="px-3 py-2 text-right">
                            {infusion ? (
                              <span className="inline-flex items-center rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-medium text-emerald-400">
                                INFUSED
                              </span>
                            ) : (
                              <span className="inline-flex items-center rounded-full bg-yellow-500/20 px-2 py-0.5 text-xs font-medium text-yellow-400">
                                ALERT
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums">
                            {infusion
                              ? `+₹${infusion.amount.toLocaleString("en-IN")}`
                              : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
