"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/common/spinner";
import { useVerdict } from "@/hooks/use-verdict";
import { useRLModels } from "@/hooks/use-rl-bot";
import type { Market, VerdictResult, DecisionTag } from "@/lib/types";
import {
  Bot,
  Tag,
  Upload,
  Play,
  Layers,
  TrendingUp,
  TrendingDown,
  Minus,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";

type TickerMode = "manual" | "csv";

const VERDICT_COLORS: Record<DecisionTag, string> = {
  STRONG_BUY: "bg-green-500/15 text-green-500 border-green-500/30",
  BUY: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
  HOLD: "bg-yellow-500/15 text-yellow-500 border-yellow-500/30",
  SELL: "bg-orange-500/15 text-orange-500 border-orange-500/30",
  STRONG_SELL: "bg-red-500/15 text-red-500 border-red-500/30",
};

const VERDICT_ICONS: Record<DecisionTag, React.ReactNode> = {
  STRONG_BUY: <TrendingUp className="h-4 w-4 text-green-500" />,
  BUY: <TrendingUp className="h-4 w-4 text-emerald-500" />,
  HOLD: <Minus className="h-4 w-4 text-yellow-500" />,
  SELL: <TrendingDown className="h-4 w-4 text-orange-500" />,
  STRONG_SELL: <TrendingDown className="h-4 w-4 text-red-500" />,
};

export default function IntegratedRLPage() {
  const [market, setMarket] = useState<Market>("US");
  const [tickerMode, setTickerMode] = useState<TickerMode>("manual");
  const [manualTickers, setManualTickers] = useState("SBIN, LT, MARUTI, TITAN");
  const [csvTickers, setCsvTickers] = useState<string[]>([]);

  // Layer weights
  const [coreWeight, setCoreWeight] = useState(0.40);
  const [strategyWeight, setStrategyWeight] = useState(0.45);
  const [rlWeight, setRlWeight] = useState(0.15);

  const { run, isRunning, results, error } = useVerdict(market);
  const modelsQ = useRLModels();
  const models = modelsQ.data ?? [];

  const getActiveTickers = (): string[] => {
    if (tickerMode === "csv") return csvTickers;
    return manualTickers
      .split(",")
      .map((t) => t.trim().toUpperCase())
      .filter(Boolean);
  };

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const parsed = text
        .split(/[\n,]/)
        .map((t) => t.trim().toUpperCase())
        .filter((t) => t && t !== "TICKER" && /^[A-Z]{1,10}$/.test(t));
      setCsvTickers(parsed);
    };
    reader.readAsText(file);
  };

  const handleRun = () => {
    const tickers = getActiveTickers();
    if (tickers.length === 0) return;
    run({
      tickers,
      market,
      date_range: ["", ""],
      skip_layers: [],  // include all layers, including rl_bot
      weights: {
        core: coreWeight,
        strategy: strategyWeight,
        rl_bot: rlWeight,
      },
    });
  };

  // Tickers with trained models
  const trainedTickers = new Set(models.map((m) => m.ticker.toUpperCase()));

  // Summary stats
  const buyCount = results.filter((r) => r.verdict === "STRONG_BUY" || r.verdict === "BUY").length;
  const sellCount = results.filter((r) => r.verdict === "STRONG_SELL" || r.verdict === "SELL").length;
  const holdCount = results.filter((r) => r.verdict === "HOLD").length;
  const avgScore = results.length > 0
    ? results.reduce((sum, r) => sum + r.weighted_score, 0) / results.length
    : 0;

  const scoreBar = (score: number, label: string, color: string) => {
    const pct = Math.abs(score) * 100;
    return (
      <div className="space-y-0.5">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">{label}</span>
          <span className={cn("font-medium", score >= 0 ? "text-green-500" : "text-red-400")}>
            {score.toFixed(3)}
          </span>
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className={cn("h-full rounded-full transition-all", color)}
            style={{ width: `${Math.min(pct, 100)}%` }}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Layers className="h-5 w-5 text-blue-500" />
        <h2 className="text-lg font-semibold">Integrated RL Scoring</h2>
        <span className="text-xs text-muted-foreground">
          Multi-layer verdict with RL Bot signals for US &amp; Ind stocks
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* ─── Left panel: controls ─── */}
        <div className="content-panel p-4 space-y-5">
          {/* Market selector */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Market</h3>
            <div className="flex gap-1">
              {(["US", "IND"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMarket(m)}
                  className={cn(
                    "flex-1 px-2 py-1.5 text-xs rounded border transition-colors",
                    market === m
                      ? "bg-primary/10 border-primary text-primary font-medium"
                      : "border-border text-muted-foreground hover:bg-muted",
                  )}
                >
                  {m === "US" ? "US Stocks" : "Indian Stocks"}
                </button>
              ))}
            </div>
          </div>

          {/* Ticker input */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Tag className="h-3.5 w-3.5 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Tickers</h3>
            </div>
            <div className="flex gap-1">
              {(["manual", "csv"] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setTickerMode(mode)}
                  className={cn(
                    "flex-1 px-2 py-1 text-xs rounded border transition-colors",
                    tickerMode === mode
                      ? "bg-primary/10 border-primary text-primary font-medium"
                      : "border-border text-muted-foreground hover:bg-muted",
                  )}
                >
                  {mode === "manual" ? "Manual" : "CSV"}
                </button>
              ))}
            </div>
            {tickerMode === "manual" && (
              <Input
                placeholder={market === "US" ? "AAPL, MSFT, GOOG" : "SBIN, LT, MARUTI, TITAN"}
                value={manualTickers}
                onChange={(e) => setManualTickers(e.target.value)}
                className="text-xs"
              />
            )}
            {tickerMode === "csv" && (
              <div className="space-y-1">
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer border border-dashed rounded px-2 py-1.5 hover:bg-muted/50">
                  <Upload className="h-3.5 w-3.5" />
                  {csvTickers.length > 0
                    ? `${csvTickers.length} tickers loaded`
                    : "Upload ticker CSV"}
                  <input type="file" accept=".csv" onChange={handleCsvUpload} className="hidden" />
                </label>
                {csvTickers.length > 0 && (
                  <div className="text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1">
                    {csvTickers.slice(0, 8).join(", ")}
                    {csvTickers.length > 8 && ` +${csvTickers.length - 8} more`}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Layer weights */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Layer Weights</h3>
            <div className="space-y-2">
              <div>
                <div className="flex justify-between text-xs">
                  <Label className="text-muted-foreground">Core (Fundamentals + Technicals)</Label>
                  <span className="font-medium">{(coreWeight * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min="0" max="1" step="0.05"
                  value={coreWeight}
                  onChange={(e) => setCoreWeight(Number(e.target.value))}
                  className="w-full h-1.5 accent-primary"
                />
              </div>
              <div>
                <div className="flex justify-between text-xs">
                  <Label className="text-muted-foreground">Strategy (Consensus + Robustness)</Label>
                  <span className="font-medium">{(strategyWeight * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min="0" max="1" step="0.05"
                  value={strategyWeight}
                  onChange={(e) => setStrategyWeight(Number(e.target.value))}
                  className="w-full h-1.5 accent-primary"
                />
              </div>
              <div>
                <div className="flex justify-between text-xs">
                  <Label className="text-muted-foreground">RL Bot</Label>
                  <span className="font-medium">{(rlWeight * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min="0" max="0.5" step="0.05"
                  value={rlWeight}
                  onChange={(e) => setRlWeight(Number(e.target.value))}
                  className="w-full h-1.5 accent-emerald-500"
                />
              </div>
              <p className="text-[0.65rem] text-muted-foreground">
                Total: {((coreWeight + strategyWeight + rlWeight) * 100).toFixed(0)}%
                {Math.abs(coreWeight + strategyWeight + rlWeight - 1) > 0.01 && (
                  <span className="text-yellow-500 ml-1">(weights will be normalised)</span>
                )}
              </p>
            </div>
          </div>

          <Button
            className="w-full"
            onClick={handleRun}
            disabled={isRunning || getActiveTickers().length === 0}
          >
            {isRunning ? (
              <><Spinner /> Running…</>
            ) : (
              <><Play className="mr-1 h-4 w-4" /> Run Integrated Scoring</>
            )}
          </Button>
          {error && <p className="text-sm text-destructive">{error}</p>}

          {/* RL model availability */}
          <div className="space-y-2 border-t pt-3">
            <div className="flex items-center gap-1.5">
              <Bot className="h-3.5 w-3.5 text-emerald-500" />
              <h3 className="text-sm font-semibold">RL Models Available</h3>
            </div>
            {modelsQ.isLoading ? (
              <Spinner />
            ) : models.length === 0 ? (
              <div className="text-xs text-muted-foreground bg-yellow-500/10 rounded p-2">
                <Info className="h-3 w-3 inline mr-1" />
                No RL models trained yet. Train models in the &quot;Train &amp; Evaluate&quot; page first.
                Tickers without models will still get Core + Strategy scores.
              </div>
            ) : (
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {models.map((m) => (
                  <div key={m.filename} className="text-xs bg-muted/50 rounded px-2 py-1 flex items-center justify-between">
                    <span className="font-medium">{m.ticker} <span className="text-muted-foreground">({m.algorithm})</span></span>
                    <span className="text-muted-foreground">{m.size_kb} KB</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ─── Right panel: results ─── */}
        <div className="md:col-span-3 space-y-4">
          {/* Summary bar */}
          {results.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="content-panel p-3 text-center">
                <p className="text-xs text-muted-foreground">Stocks Analyzed</p>
                <p className="text-xl font-bold">{results.length}</p>
              </div>
              <div className="content-panel p-3 text-center">
                <p className="text-xs text-muted-foreground">Avg Score</p>
                <p className={cn("text-xl font-bold", avgScore >= 0 ? "text-green-500" : "text-red-400")}>
                  {avgScore.toFixed(3)}
                </p>
              </div>
              <div className="content-panel p-3 text-center">
                <p className="text-xs text-green-500">Buy / Strong Buy</p>
                <p className="text-xl font-bold text-green-500">{buyCount}</p>
              </div>
              <div className="content-panel p-3 text-center">
                <p className="text-xs text-red-400">Sell / Strong Sell</p>
                <p className="text-xl font-bold text-red-400">{sellCount}</p>
              </div>
            </div>
          )}

          {/* Per-ticker cards */}
          {results.map((r: VerdictResult) => {
            const hasRL = r.rl_score !== 0;
            return (
              <div key={r.ticker} className="content-panel p-4 space-y-3">
                <div className="flex items-center gap-3">
                  {VERDICT_ICONS[r.verdict]}
                  <h4 className="text-sm font-semibold">{r.ticker}</h4>
                  <span className={cn(
                    "text-xs px-2 py-0.5 rounded border font-medium",
                    VERDICT_COLORS[r.verdict],
                  )}>
                    {r.verdict.replace("_", " ")}
                  </span>
                  <span className={cn(
                    "text-sm font-bold ml-auto",
                    r.weighted_score >= 0 ? "text-green-500" : "text-red-400",
                  )}>
                    {r.weighted_score.toFixed(3)}
                  </span>
                  {hasRL && (
                    <span className="text-xs bg-emerald-500/10 text-emerald-500 px-1.5 py-0.5 rounded">
                      RL Active
                    </span>
                  )}
                  {!hasRL && trainedTickers.size > 0 && (
                    <span className="text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
                      No RL model
                    </span>
                  )}
                </div>

                {/* Layer score bars */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="space-y-2">
                    {scoreBar(r.core_score, "Core", "bg-blue-500")}
                    {scoreBar(r.strategy_score, "Strategy", "bg-purple-500")}
                  </div>
                  <div className="space-y-2">
                    {scoreBar(r.rl_score, "RL Bot", "bg-emerald-500")}
                    {r.ml_score !== 0 && scoreBar(r.ml_score, "ML Features", "bg-amber-500")}
                  </div>
                  <div className="space-y-2">
                    {scoreBar(r.weighted_score, "Final (Weighted)", r.weighted_score >= 0 ? "bg-green-500" : "bg-red-500")}
                  </div>
                </div>

                {/* Layer details (collapsed) */}
                {r.layer_details && Object.keys(r.layer_details).length > 0 && (
                  <details className="text-xs">
                    <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                      Layer breakdown details
                    </summary>
                    <pre className="mt-2 bg-muted/50 rounded p-3 overflow-auto max-h-60 whitespace-pre-wrap">
                      {JSON.stringify(r.layer_details, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            );
          })}

          {/* Loading */}
          {isRunning && (
            <div className="content-panel p-4 flex items-center gap-3">
              <Spinner />
              <div>
                <p className="text-sm font-medium">Running integrated scoring pipeline…</p>
                <p className="text-xs text-muted-foreground">
                  Core + Strategy + RL Bot layers evaluated per ticker
                </p>
              </div>
            </div>
          )}

          {/* Empty state */}
          {results.length === 0 && !isRunning && (
            <div className="content-panel p-8 flex flex-col items-center justify-center text-center">
              <Layers className="h-12 w-12 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">
                Enter tickers, set layer weights, and click &quot;Run Integrated Scoring&quot;
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                The pipeline runs Core (fundamentals + technicals), Strategy (consensus + robustness),
                and RL Bot layers in parallel, then produces a weighted verdict.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
