"use client";

import { useState } from "react";
import { TickerInput } from "@/components/forms/ticker-input";
import { VerdictConfig } from "@/components/forms/verdict-config";
import { VerdictTable } from "@/components/tables/verdict-table";
import { VerdictRadarChart } from "@/components/charts/radar-chart";
import { MetricsGrid, MetricCard } from "@/components/common/metrics-cards";
import { RibbonVixBar } from "@/components/common/ribbon-vix-bar";
import { Spinner } from "@/components/common/spinner";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useVerdict } from "@/hooks/use-verdict";
import { DEFAULT_US_TICKERS, NASDAQ_50_TICKERS } from "@/lib/constants";
import { Scale } from "lucide-react";
import { cn } from "@/lib/utils";
import type { VerdictResult } from "@/lib/types";

function LayerDetailPanel({ r }: { r: VerdictResult }) {
  const ld = r.layer_details;
  const regime = ld?.regime;
  const strategy = ld?.strategy;
  const core = ld?.core;
  const robustness = strategy?.robustness;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
      <div>
        <h4 className="text-sm font-semibold mb-2">{r.ticker} — Layer Scores</h4>
        <VerdictRadarChart
          data={[
            { layer: "Core", score: r.core_score },
            { layer: "Strategy + Robustness", score: r.strategy_score },
            { layer: "ML", score: r.ml_score },
            { layer: "RL", score: r.rl_score },
          ]}
        />
      </div>
      <div className="space-y-3 text-xs">
        {regime && (
          <div className="rounded border p-3 space-y-1">
            <h5 className="font-semibold text-sm">Market Regime</h5>
            <div className="flex items-center gap-2">
              <span className={cn(
                "px-2 py-0.5 rounded font-bold",
                regime.regime === "TRENDING_BULL" ? "bg-green-600/20 text-green-500" :
                regime.regime === "TRENDING_BEAR" ? "bg-red-600/20 text-red-500" :
                regime.regime === "HIGH_VOLATILITY" ? "bg-orange-500/20 text-orange-400" :
                regime.regime === "CRISIS" ? "bg-red-800/20 text-red-400" : "bg-blue-600/20 text-blue-400"
              )}>
                {regime.regime.replace(/_/g, " ")}
              </span>
              <span className="text-muted-foreground">VIX: {regime.vix_level?.toFixed(1)}</span>
            </div>
            <p className="text-muted-foreground">
              Position Scale: <span className={cn(regime.position_scale < 0.5 ? "text-red-500" : "text-green-500", "font-semibold")}>{(regime.position_scale * 100).toFixed(0)}%</span>
            </p>
          </div>
        )}
        {core && (
          <div className="rounded border p-3 space-y-1">
            <h5 className="font-semibold text-sm">Core Layer</h5>
            <div className="grid grid-cols-3 gap-2">
              <div><span className="text-muted-foreground">Fundamental</span><br/><span className="font-semibold">{core.fundamental?.toFixed(2)}</span></div>
              <div><span className="text-muted-foreground">Technical</span><br/><span className="font-semibold">{core.technical?.toFixed(2)}</span></div>
              <div><span className="text-muted-foreground">Macro</span><br/><span className="font-semibold">{core.macro?.toFixed(2)}</span></div>
            </div>
          </div>
        )}
        {strategy && (
          <div className="rounded border p-3 space-y-1">
            <h5 className="font-semibold text-sm">Strategy Consensus</h5>
            <div className="flex gap-4">
              <span className="text-green-500 font-bold">{strategy.buy_votes} BUY</span>
              <span className="text-red-500 font-bold">{strategy.sell_votes} SELL</span>
              <span className="text-muted-foreground">/ {strategy.total_strategies} total</span>
            </div>
            <p className="text-muted-foreground">
              Median Sharpe: <span className="font-semibold">{strategy.median_sharpe?.toFixed(2)}</span>
              {" · "}Worst DD: <span className="font-semibold text-red-500">{strategy.worst_max_drawdown?.toFixed(1)}%</span>
            </p>
            {robustness && (
              <p className="text-muted-foreground">
                PBO: {robustness.cscv_pbo?.toFixed(2)} · Skill: {((robustness.skill_fraction ?? 0) * 100).toFixed(0)}%
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function USVerdictPage() {
  const [tickers, setTickers] = useState<string[]>(DEFAULT_US_TICKERS);
  const [verdictConfig, setVerdictConfig] = useState<Record<string, unknown>>({});
  const { run, isRunning, results, error } = useVerdict("US");

  const handleRun = () => {
    if (tickers.length === 0) return;
    run({
      tickers,
      market: "US",
      date_range: ["", ""],
      skip_layers: [],
      weights: { core: 0.40, strategy: 0.45, rl_bot: 0.15 },
    });
  };

  const avgScore = results.length > 0
    ? results.reduce((a, r) => a + r.weighted_score, 0) / results.length
    : 0;

  const firstRegime = results[0]?.layer_details?.regime?.regime;

  return (
    <div className="space-y-6">
      <RibbonVixBar symbols={NASDAQ_50_TICKERS} market="US" regime={firstRegime} />
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="content-panel p-4 space-y-4 min-w-0 overflow-hidden">
          <h3 className="text-sm font-semibold">Verdict Engine</h3>
          <TickerInput defaultTickers={DEFAULT_US_TICKERS} onTickersChange={setTickers} />
          <VerdictConfig onConfigChange={(c) => setVerdictConfig(c)} />
          <Button className="w-full" onClick={handleRun} disabled={isRunning}>
            {isRunning ? "Computing…" : <><Scale className="mr-1 h-4 w-4" /> Run Verdict</>}
          </Button>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <div className="md:col-span-3 space-y-4">
          {isRunning && <Spinner />}
          {results.length > 0 && (
            <>
              <MetricsGrid>
                <MetricCard label="Stocks Analyzed" value={results.length} />
                <MetricCard label="Avg Weighted Score" value={avgScore.toFixed(2)} />
                <MetricCard
                  label="Buy Signals"
                  value={results.filter((r) => r.verdict === "BUY" || r.verdict === "STRONG_BUY").length}
                  color="text-green-500"
                />
                <MetricCard
                  label="Sell Signals"
                  value={results.filter((r) => r.verdict === "SELL" || r.verdict === "STRONG_SELL").length}
                  color="text-red-500"
                />
              </MetricsGrid>

              {results.length > 0 && (
                <div className="content-panel p-4">
                  <Tabs defaultValue={results[0].ticker}>
                    <TabsList className="flex flex-wrap gap-1 h-auto">
                      {results.map((r) => (
                        <TabsTrigger key={r.ticker} value={r.ticker}>
                          {r.ticker}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                    {results.map((r) => (
                      <TabsContent key={r.ticker} value={r.ticker}>
                        <LayerDetailPanel r={r} />
                      </TabsContent>
                    ))}
                  </Tabs>
                </div>
              )}

              <div className="content-panel p-4">
                <VerdictTable data={results} />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
