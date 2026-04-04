"use client";

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { RibbonVixBar } from "@/components/common/ribbon-vix-bar";
import { MetricsGrid, MetricCard } from "@/components/common/metrics-cards";
import { Spinner } from "@/components/common/spinner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { EquityCurveChart } from "@/components/charts/equity-curve-chart";
import { NIFTY_50_TICKERS } from "@/lib/constants";
import { useSignalHistory, useBacktestHistory } from "@/hooks/use-history";
import { useBacktestCompare } from "@/hooks/use-backtest-compare";
import { formatPct, formatCurrency } from "@/lib/utils";
import { DecisionBadge } from "@/components/common/decision-badge";
import { GitCompare } from "lucide-react";

export default function INDHistoryPage() {
  const [tab, setTab] = useState("signals");
  const signalQ = useSignalHistory("IND");
  const backtestQ = useBacktestHistory("IND");

  // Comparison state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [compareMode, setCompareMode] = useState(false);
  const compareQ = useBacktestCompare(compareMode ? selectedIds : []);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length >= 5 ? prev : [...prev, id]
    );
  };

  return (
    <div className="space-y-6">
      <RibbonVixBar symbols={NIFTY_50_TICKERS} market="IND" />
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="signals">Signal History</TabsTrigger>
          <TabsTrigger value="backtests">Backtest History</TabsTrigger>
          {compareMode && selectedIds.length > 0 && (
            <TabsTrigger value="compare">
              Compare ({selectedIds.length})
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="signals" className="mt-4">
          {signalQ.isLoading && <Spinner />}
          {signalQ.data && (
            <div className="content-panel p-4">
              <p className="text-xs text-muted-foreground mb-2">{signalQ.data.total} total signals</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b text-muted-foreground text-left">
                    <th className="py-2 pr-3">Date</th><th className="py-2 pr-3">Ticker</th><th className="py-2 pr-3">Decision</th><th className="py-2 pr-3">Score</th><th className="py-2 pr-3">Sentiment</th><th className="py-2 pr-3">Price</th><th className="py-2">RSI</th>
                  </tr></thead>
                  <tbody>{signalQ.data.data.map((r) => (
                    <tr key={r.id} className="border-b">
                      <td className="py-2 pr-3 text-xs">{new Date(r.created_at).toLocaleString()}</td>
                      <td className="py-2 pr-3 font-mono font-medium">{r.ticker}</td>
                      <td className="py-2 pr-3"><DecisionBadge decision={r.decision} /></td>
                      <td className="py-2 pr-3">{r.decision_score.toFixed(2)}</td>
                      <td className="py-2 pr-3">{r.sentiment_label}</td>
                      <td className="py-2 pr-3">{formatCurrency(r.current_price)}</td>
                      <td className="py-2">{r.rsi.toFixed(1)}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="backtests" className="mt-4">
          {backtestQ.isLoading && <Spinner />}
          {backtestQ.data && (
            <div className="content-panel p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-muted-foreground">{backtestQ.data.total} total backtests</p>
                <div className="flex items-center gap-2">
                  <Button
                    variant={compareMode ? "default" : "outline"}
                    size="sm"
                    onClick={() => { setCompareMode(!compareMode); if (compareMode) setSelectedIds([]); }}
                  >
                    <GitCompare className="h-3.5 w-3.5 mr-1" />
                    {compareMode ? "Cancel Compare" : "Compare"}
                  </Button>
                  {compareMode && selectedIds.length >= 2 && (
                    <Button size="sm" onClick={() => setTab("compare")}>
                      Compare {selectedIds.length} Runs
                    </Button>
                  )}
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b text-muted-foreground text-left">
                    {compareMode && <th className="py-2 pr-2 w-8"></th>}
                    <th className="py-2 pr-3">Date</th><th className="py-2 pr-3">Strategy</th><th className="py-2 pr-3">Return</th><th className="py-2 pr-3">Sharpe</th><th className="py-2 pr-3">Max DD</th><th className="py-2">Trades</th>
                  </tr></thead>
                  <tbody>{backtestQ.data.data.map((r) => (
                    <tr key={r.id} className={`border-b ${selectedIds.includes(r.id) ? "bg-primary/5" : ""}`}>
                      {compareMode && (
                        <td className="py-2 pr-2">
                          <Checkbox
                            checked={selectedIds.includes(r.id)}
                            onCheckedChange={() => toggleSelect(r.id)}
                            disabled={!selectedIds.includes(r.id) && selectedIds.length >= 5}
                          />
                        </td>
                      )}
                      <td className="py-2 pr-3 text-xs">{new Date(r.created_at).toLocaleString()}</td>
                      <td className="py-2 pr-3">{r.strategy_name}</td>
                      <td className={`py-2 pr-3 ${r.total_return >= 0 ? "pnl-positive" : "pnl-negative"}`}>{formatPct(r.total_return)}</td>
                      <td className="py-2 pr-3">{r.sharpe_ratio.toFixed(2)}</td>
                      <td className="py-2 pr-3 text-red-500">{formatPct(r.max_drawdown)}</td>
                      <td className="py-2">{r.total_trades}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="compare" className="mt-4 space-y-4">
          {compareQ.isLoading && <Spinner />}
          {compareQ.data && compareQ.data.runs.length > 0 && (
            <>
              {/* Side-by-side metrics comparison */}
              <div className="content-panel p-4">
                <h3 className="text-sm font-semibold mb-3">Metrics Comparison</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-muted-foreground text-left">
                        <th className="py-2 pr-4 font-medium">Metric</th>
                        {compareQ.data.runs.map((r) => (
                          <th key={r.id} className="py-2 pr-4 font-medium text-right">{r.strategy_name}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { label: "Total Return", key: "total_return", fmt: formatPct },
                        { label: "Sharpe Ratio", key: "sharpe_ratio", fmt: (v: number) => v.toFixed(3) },
                        { label: "Sortino Ratio", key: "sortino_ratio", fmt: (v: number) => v.toFixed(3) },
                        { label: "Max Drawdown", key: "max_drawdown", fmt: formatPct, negative: true },
                        { label: "Calmar Ratio", key: "calmar", fmt: (v: number) => v.toFixed(3) },
                        { label: "Win Rate", key: "win_rate", fmt: formatPct },
                        { label: "Total Trades", key: "total_trades", fmt: (v: number) => String(v) },
                      ].map(({ label, key, fmt, negative }) => {
                        const values = compareQ.data!.runs.map((r) => (r as Record<string, unknown>)[key] as number);
                        const best = negative ? Math.min(...values) : Math.max(...values);
                        return (
                          <tr key={key} className="border-b last:border-0">
                            <td className="py-2 pr-4 text-muted-foreground">{label}</td>
                            {compareQ.data!.runs.map((r, i) => {
                              const val = values[i];
                              const isBest = val === best && compareQ.data!.runs.length > 1;
                              return (
                                <td key={r.id} className={`py-2 pr-4 text-right ${isBest ? "font-bold text-green-500" : ""}`}>
                                  {fmt(val)}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Equity curve overlay */}
              {compareQ.data.runs.some((r) => r.equity_curve?.length > 0) && (
                <div className="content-panel p-4">
                  <h3 className="text-sm font-semibold mb-3">Equity Curve Overlay</h3>
                  <div className="space-y-4">
                    {compareQ.data.runs.map((r) => (
                      r.equity_curve?.length > 0 && (
                        <div key={r.id}>
                          <p className="text-xs text-muted-foreground mb-1">{r.strategy_name}</p>
                          <EquityCurveChart data={r.equity_curve} height={200} />
                        </div>
                      )
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
          {compareQ.data && compareQ.data.runs.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              No matching backtest runs found. Select valid backtests to compare.
            </p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
