"use client";

import { useState } from "react";
import { BacktestConfig } from "@/components/forms/backtest-config";
import { EquityCurveChart } from "@/components/charts/equity-curve-chart";
import { MetricsGrid, MetricCard } from "@/components/common/metrics-cards";
import { RibbonVixBar } from "@/components/common/ribbon-vix-bar";
import { Spinner } from "@/components/common/spinner";
import { Button } from "@/components/ui/button";
import { useBacktest } from "@/hooks/use-backtest";
import { DEFAULT_US_TICKERS, NASDAQ_50_TICKERS } from "@/lib/constants";
import { formatCurrency, formatPct } from "@/lib/utils";
import { Play } from "lucide-react";

export default function USBacktestPage() {
  const { strategies, strategiesLoading, run, isRunning, result, error } = useBacktest("US");
  const [config, setConfig] = useState<Record<string, unknown>>({});
  const categories = [...new Set(strategies.map((s) => s.category))];

  const handleRun = () => {
    run({
      strategy_id: String(config.strategy_id ?? strategies[0]?.id ?? ""),
      tickers: String(config.tickers ?? DEFAULT_US_TICKERS.join(",")).split(",").map((t) => t.trim()).filter(Boolean),
      params: (config.params as Record<string, number | boolean>) ?? {},
      initial_capital: Number(config.initial_capital ?? 100000),
      period: String(config.period ?? "1y"),
      start_date: config.start_date as string | undefined,
      end_date: config.end_date as string | undefined,
      market: "US",
    });
  };

  const perTicker = result?.per_ticker ?? {};
  const tickerKeys = Object.keys(perTicker);

  return (
    <div className="space-y-6">
      <RibbonVixBar symbols={NASDAQ_50_TICKERS} market="US" />
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="content-panel p-4 space-y-4">
          <h3 className="text-sm font-semibold">Backtest Configuration</h3>
          {strategiesLoading ? (
            <Spinner />
          ) : (
            <BacktestConfig
              strategies={strategies}
              categories={categories}
              onConfigChange={(c) => setConfig(c as Record<string, unknown>)}
              defaultTickers={DEFAULT_US_TICKERS.join(", ")}
            />
          )}
          <Button className="w-full" onClick={handleRun} disabled={isRunning || strategies.length === 0}>
            {isRunning ? "Running…" : <><Play className="mr-1 h-4 w-4" /> Run Backtest</>}
          </Button>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <div className="md:col-span-3 space-y-4">
          {isRunning && <Spinner />}
          {result && (
            <>
              <MetricsGrid>
                <MetricCard label={tickerKeys.length > 1 ? "Avg Total Return" : "Total Return"} value={formatPct(result.total_return)} color={result.total_return >= 0 ? "text-green-500" : "text-red-500"} />
                <MetricCard label={tickerKeys.length > 1 ? "Avg Sharpe Ratio" : "Sharpe Ratio"} value={result.sharpe_ratio.toFixed(2)} />
                <MetricCard label={tickerKeys.length > 1 ? "Avg Sortino Ratio" : "Sortino Ratio"} value={result.sortino_ratio.toFixed(2)} />
                <MetricCard label="Max Drawdown" value={formatPct(result.max_drawdown)} color="text-red-500" />
                <MetricCard label="Win Rate" value={formatPct(result.win_rate)} />
                <MetricCard label="Total Trades" value={result.total_trades} />
                <MetricCard label="Final Value" value={formatCurrency(result.final_value)} />
              </MetricsGrid>

              {tickerKeys.length > 1 && (
                <div className="content-panel p-4">
                  <h4 className="text-sm font-semibold mb-3">Per-Ticker Breakdown</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left text-muted-foreground">
                          <th className="py-2 pr-4 font-medium">Ticker</th>
                          <th className="py-2 pr-4 font-medium text-right">Return</th>
                          <th className="py-2 pr-4 font-medium text-right">Sharpe</th>
                          <th className="py-2 pr-4 font-medium text-right">Sortino</th>
                          <th className="py-2 pr-4 font-medium text-right">Max DD</th>
                          <th className="py-2 pr-4 font-medium text-right">Win Rate</th>
                          <th className="py-2 pr-4 font-medium text-right">Trades</th>
                          <th className="py-2 font-medium text-right">Final Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tickerKeys.map((ticker) => {
                          const tm = perTicker[ticker];
                          return (
                            <tr key={ticker} className="border-b last:border-0">
                              <td className="py-2 pr-4 font-mono font-medium">{ticker}</td>
                              <td className={`py-2 pr-4 text-right ${tm.total_return >= 0 ? "text-green-500" : "text-red-500"}`}>{formatPct(tm.total_return)}</td>
                              <td className="py-2 pr-4 text-right">{tm.sharpe_ratio.toFixed(2)}</td>
                              <td className="py-2 pr-4 text-right">{tm.sortino_ratio.toFixed(2)}</td>
                              <td className="py-2 pr-4 text-right text-red-500">{formatPct(tm.max_drawdown)}</td>
                              <td className="py-2 pr-4 text-right">{formatPct(tm.win_rate)}</td>
                              <td className="py-2 pr-4 text-right">{tm.total_trades}</td>
                              <td className="py-2 text-right">{formatCurrency(tm.final_value)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {result.equity_curve.length > 0 && (
                <div className="content-panel p-4">
                  <h4 className="text-sm font-semibold mb-2">Equity Curve</h4>
                  <EquityCurveChart data={result.equity_curve} height={350} />
                </div>
              )}

              {result.charts.map((chart, i) => (
                <div key={i} className="content-panel p-4">
                  {chart.title && <h4 className="text-sm font-semibold mb-2">{chart.title}</h4>}
                  {chart.type === "matplotlib" ? (
                    <img src={`data:image/png;base64,${chart.data}`} alt={chart.title ?? "Chart"} className="w-full rounded" />
                  ) : (
                    <pre className="text-xs overflow-auto max-h-64">{chart.data}</pre>
                  )}
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
