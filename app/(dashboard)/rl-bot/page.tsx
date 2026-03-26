"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/common/spinner";
import {
  useRLTrain,
  useRLModels,
  useRLUpload,
  useRLUploads,
  usePortfolioAnalysis,
} from "@/hooks/use-rl-bot";
import type {
  RLAlgorithm,
  RLTrainConfig,
  RLTrainResponse,
  RLTickerResult,
  NiftyPrediction,
  PortfolioStock,
} from "@/lib/types";
import {
  Bot,
  Upload,
  Play,
  Tag,
  FileText,
  TrendingUp,
  BarChart3,
  Target,
  Brain,
  Zap,
  ChevronDown,
  ChevronUp,
  Lightbulb,
} from "lucide-react";
import { cn } from "@/lib/utils";

type TickerMode = "manual" | "csv";
type PageTab = "analysis" | "train";

const ALGORITHMS: RLAlgorithm[] = ["PPO", "DQN", "A2C"];
const REWARD_TYPES = ["pnl", "sharpe", "hybrid"] as const;

const SIGNAL_COLORS: Record<string, string> = {
  STRONG_BUY: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
  BUY: "bg-green-500/10 text-green-600 border-green-500/20",
  HOLD: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  SELL: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  STRONG_SELL: "bg-red-500/10 text-red-600 border-red-500/20",
};

const SIGNAL_LABELS: Record<string, string> = {
  STRONG_BUY: "Strong Buy",
  BUY: "Buy",
  HOLD: "Hold",
  SELL: "Sell",
  STRONG_SELL: "Strong Sell",
};

function ScoreBar({ value, color = "emerald", label }: { value: number; color?: string; label?: string }) {
  const colorMap: Record<string, string> = {
    emerald: "bg-emerald-500",
    blue: "bg-blue-500",
    amber: "bg-amber-500",
    purple: "bg-purple-500",
    cyan: "bg-cyan-500",
  };
  return (
    <div className="flex items-center gap-2">
      {label && <span className="text-xs text-muted-foreground w-24 shrink-0">{label}</span>}
      <div className="flex-1 bg-muted rounded-full h-1.5 overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all", colorMap[color] || "bg-emerald-500")}
          style={{ width: `${Math.min(value, 100)}%` }}
        />
      </div>
      <span className="text-xs font-medium w-8 text-right">{value.toFixed(0)}</span>
    </div>
  );
}

export default function RLBotPage() {
  const [activeTab, setActiveTab] = useState<PageTab>("analysis");

  // ── Training state ──
  const [tickerMode, setTickerMode] = useState<TickerMode>("manual");
  const [manualTickers, setManualTickers] = useState("SBIN, LT, MARUTI, TITAN");
  const [csvTickers, setCsvTickers] = useState<string[]>([]);
  const [algorithm, setAlgorithm] = useState<RLAlgorithm>("PPO");
  const [rewardType, setRewardType] = useState<(typeof REWARD_TYPES)[number]>("sharpe");
  const [timesteps, setTimesteps] = useState(50000);
  const [lookback, setLookback] = useState(30);
  const [trainDays, setTrainDays] = useState(252);
  const [testDays, setTestDays] = useState(63);
  const [folds, setFolds] = useState(3);
  const [capital, setCapital] = useState(100000);

  const [trainResult, setTrainResult] = useState<RLTrainResponse | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // ── Analysis state ──
  const [showAllStocks, setShowAllStocks] = useState(false);
  const [predictionFilter, setPredictionFilter] = useState<string>("ALL");

  // ── Hooks ──
  const trainMut = useRLTrain();
  const modelsQ = useRLModels();
  const uploadMut = useRLUpload();
  const uploadsQ = useRLUploads();
  const analysisQ = usePortfolioAnalysis();

  const getActiveTickers = (): string[] => {
    if (tickerMode === "csv") return csvTickers;
    return manualTickers
      .split(",")
      .map((t) => t.trim().toUpperCase())
      .filter(Boolean);
  };

  const handleCsvTickerUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
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

  const handleTrain = () => {
    const tickers = getActiveTickers();
    if (tickers.length === 0) return;
    const config: RLTrainConfig = {
      tickers,
      algorithm,
      reward_type: rewardType,
      total_timesteps: timesteps,
      lookback,
      train_days: trainDays,
      test_days: testDays,
      folds,
      initial_capital: capital,
    };
    trainMut.mutate(config, {
      onSuccess: (data) => setTrainResult(data),
    });
  };

  const handleDataUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    uploadMut.mutate(file);
  };

  const models = modelsQ.data ?? [];
  const uploads = uploadsQ.data ?? [];
  const analysis = analysisQ.data;

  const filteredPredictions = analysis?.predictions.filter(
    (p) => predictionFilter === "ALL" || p.signal === predictionFilter
  ) ?? [];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-emerald-500" />
          <h2 className="text-lg font-semibold">RL Bot — Train &amp; Evaluate</h2>
        </div>
        <div className="flex gap-1 border rounded-lg p-0.5">
          {(["analysis", "train"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-3 py-1.5 text-xs rounded-md transition-colors font-medium",
                activeTab === tab
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted"
              )}
            >
              {tab === "analysis" ? "Portfolio Analysis & Predictions" : "Train Agent"}
            </button>
          ))}
        </div>
      </div>

      {/* ═══════════════════ ANALYSIS TAB ═══════════════════ */}
      {activeTab === "analysis" && (
        <div className="space-y-4">
          {analysisQ.isLoading && (
            <div className="content-panel p-8 flex items-center justify-center gap-3">
              <Spinner />
              <p className="text-sm">Loading portfolio analysis…</p>
            </div>
          )}

          {analysisQ.error && (
            <div className="content-panel p-4 text-sm text-destructive">
              Failed to load analysis: {analysisQ.error.message}
            </div>
          )}

          {analysis && (
            <>
              {/* ── Performance Summary Cards ── */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="content-panel p-3 space-y-1">
                  <p className="text-xs text-muted-foreground">Green Energy Return</p>
                  <p className="text-xl font-bold text-emerald-500">
                    +{analysis.performance.green_energy.total_return_pct}%
                  </p>
                  <p className="text-xs text-muted-foreground">
                    CAGR {analysis.performance.green_energy.cagr_pct}% &middot; Sharpe {analysis.performance.green_energy.sharpe_ratio}
                  </p>
                </div>
                <div className="content-panel p-3 space-y-1">
                  <p className="text-xs text-muted-foreground">NIFTY SC100 Return</p>
                  <p className="text-xl font-bold text-blue-500">
                    +{analysis.performance.benchmark.total_return_pct}%
                  </p>
                  <p className="text-xs text-muted-foreground">
                    CAGR {analysis.performance.benchmark.cagr_pct}% &middot; Sharpe {analysis.performance.benchmark.sharpe_ratio}
                  </p>
                </div>
                <div className="content-panel p-3 space-y-1">
                  <p className="text-xs text-muted-foreground">Alpha Generated</p>
                  <p className="text-xl font-bold text-purple-500">
                    +{analysis.performance.alpha_pct}%
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Annualized &middot; {analysis.performance.total_rebalances} rebalances
                  </p>
                </div>
                <div className="content-panel p-3 space-y-1">
                  <p className="text-xs text-muted-foreground">Portfolio Metrics</p>
                  <p className="text-xl font-bold">
                    {analysis.constituent_analysis.total_unique_stocks}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    stocks &middot; {analysis.constituent_analysis.total_periods} periods &middot; {analysis.performance.period.years}y
                  </p>
                </div>
              </div>

              {/* ── Index Performance Chart ── */}
              <div className="content-panel p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-emerald-500" />
                  <h3 className="text-sm font-semibold">Index Performance (Base 100)</h3>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {analysis.performance.period.start} → {analysis.performance.period.end}
                  </span>
                </div>
                <div className="relative h-48 w-full">
                  <IndexChart data={analysis.chart_data} />
                </div>
                <div className="flex gap-4 justify-center text-xs">
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-0.5 bg-emerald-500 rounded" /> Green Energy Theme
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-0.5 bg-blue-500 rounded" /> NIFTY Smallcap 100
                  </span>
                </div>
              </div>

              {/* ── Learned Factors ── */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="content-panel p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Brain className="h-4 w-4 text-purple-500" />
                    <h3 className="text-sm font-semibold">Learned Factor Categories</h3>
                  </div>
                  {analysis.learned_factors.top_factor_categories.map((f) => (
                    <ScoreBar
                      key={f.name}
                      label={f.name}
                      value={(f.weight / analysis.learned_factors.top_factor_categories[0].weight) * 100}
                      color="purple"
                    />
                  ))}
                </div>
                <div className="content-panel p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-amber-500" />
                    <h3 className="text-sm font-semibold">Top Portfolio Themes</h3>
                  </div>
                  {analysis.learned_factors.top_portfolio_themes.slice(0, 8).map((t) => (
                    <ScoreBar
                      key={t.theme}
                      label={t.theme}
                      value={(t.weight / analysis.learned_factors.top_portfolio_themes[0].weight) * 100}
                      color="amber"
                    />
                  ))}
                </div>
                <div className="content-panel p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-cyan-500" />
                    <h3 className="text-sm font-semibold">Selection Characteristics</h3>
                  </div>
                  <div className="space-y-1.5">
                    {analysis.learned_factors.selection_characteristics.map((c, i) => (
                      <p key={i} className="text-xs text-muted-foreground flex gap-1.5">
                        <span className="text-cyan-500 shrink-0">&bull;</span>
                        {c}
                      </p>
                    ))}
                  </div>
                </div>
              </div>

              {/* ── Top Constituent Stocks ── */}
              <div className="content-panel p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-blue-500" />
                    <h3 className="text-sm font-semibold">Top Constituent Stocks</h3>
                    <span className="text-xs text-muted-foreground">
                      ({analysis.constituent_analysis.total_unique_stocks} stocks across {analysis.constituent_analysis.total_periods} periods)
                    </span>
                  </div>
                  <button
                    onClick={() => setShowAllStocks(!showAllStocks)}
                    className="text-xs text-primary flex items-center gap-1 hover:underline"
                  >
                    {showAllStocks ? "Show Less" : "Show All"}
                    {showAllStocks ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  </button>
                </div>
                <div className="overflow-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b text-muted-foreground">
                        <th className="text-left py-1.5 pr-3">Stock</th>
                        <th className="text-left py-1.5 pr-3">Themes</th>
                        <th className="text-right py-1.5 pr-3">Periods</th>
                        <th className="text-right py-1.5 pr-3">Persistence</th>
                        <th className="text-right py-1.5 pr-3">Avg Wt</th>
                        <th className="text-right py-1.5 pr-3">Max Wt</th>
                        <th className="text-center py-1.5">Current</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(showAllStocks
                        ? analysis.constituent_analysis.top_stocks
                        : analysis.constituent_analysis.top_stocks.slice(0, 10)
                      ).map((s: PortfolioStock) => (
                        <tr key={s.stock} className="border-b border-border/50 hover:bg-muted/30">
                          <td className="py-1.5 pr-3 font-medium">{s.stock}</td>
                          <td className="py-1.5 pr-3">
                            <div className="flex flex-wrap gap-1">
                              {s.themes.slice(0, 2).map((t) => (
                                <span key={t} className="px-1.5 py-0.5 bg-muted rounded text-[10px]">{t}</span>
                              ))}
                            </div>
                          </td>
                          <td className="py-1.5 pr-3 text-right">{s.periods}/{s.total_periods}</td>
                          <td className="py-1.5 pr-3 text-right">
                            <span className={cn(
                              "font-medium",
                              s.persistence_pct >= 70 ? "text-emerald-500" : s.persistence_pct >= 40 ? "text-amber-500" : "text-muted-foreground"
                            )}>
                              {s.persistence_pct}%
                            </span>
                          </td>
                          <td className="py-1.5 pr-3 text-right">{s.avg_weight_pct}%</td>
                          <td className="py-1.5 pr-3 text-right">{s.max_weight_pct}%</td>
                          <td className="py-1.5 text-center">
                            {s.currently_held ? (
                              <span className="text-emerald-500 font-medium">{s.current_weight_pct}%</span>
                            ) : (
                              <span className="text-muted-foreground">&mdash;</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* ═══════════════════ NIFTY BUY PREDICTIONS ═══════════════════ */}
              <div className="content-panel p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-emerald-500" />
                    <h3 className="text-sm font-semibold">Nifty Universe — Buy Predictions</h3>
                    <span className="text-xs text-muted-foreground">
                      Based on learned portfolio factor model
                    </span>
                  </div>
                  <div className="flex gap-1">
                    {["ALL", "STRONG_BUY", "BUY", "HOLD"].map((f) => (
                      <button
                        key={f}
                        onClick={() => setPredictionFilter(f)}
                        className={cn(
                          "px-2 py-1 text-xs rounded border transition-colors",
                          predictionFilter === f
                            ? "bg-primary/10 border-primary text-primary font-medium"
                            : "border-border text-muted-foreground hover:bg-muted"
                        )}
                      >
                        {f === "ALL" ? "All" : SIGNAL_LABELS[f]}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  {filteredPredictions.map((p: NiftyPrediction) => (
                    <div key={p.ticker} className="border rounded-lg p-3 hover:bg-muted/30 transition-colors">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-sm">{p.ticker}</span>
                            <span className={cn(
                              "px-2 py-0.5 text-xs font-medium rounded border",
                              SIGNAL_COLORS[p.signal]
                            )}>
                              {SIGNAL_LABELS[p.signal]}
                            </span>
                            <span className="text-xs text-muted-foreground">{p.sector}</span>
                            {p.indices?.map((idx) => (
                              <span key={idx} className="px-1.5 py-0.5 bg-blue-500/10 text-blue-600 rounded text-[10px] border border-blue-500/20">
                                {idx}
                              </span>
                            ))}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">{p.name}</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {p.matched_themes.slice(0, 3).map((t) => (
                              <span key={t} className="px-1.5 py-0.5 bg-primary/5 text-primary rounded text-[10px]">
                                {t}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="text-lg font-bold">
                            {p.composite_score.toFixed(1)}
                          </div>
                          <p className="text-[10px] text-muted-foreground">composite</p>
                        </div>
                      </div>

                      <div className="mt-2 grid grid-cols-5 gap-2">
                        <ScoreBar value={p.factor_scores.theme_alignment} color="purple" label="Theme" />
                        <ScoreBar value={p.factor_scores.portfolio_proven} color="emerald" label="Proven" />
                        <ScoreBar value={p.factor_scores.sector_momentum} color="blue" label="Sector" />
                        <ScoreBar value={p.factor_scores.conviction} color="amber" label="Conviction" />
                        <ScoreBar value={p.factor_scores.recency} color="cyan" label="Recency" />
                      </div>

                      <p className="text-[11px] text-muted-foreground mt-2">{p.reasoning}</p>
                    </div>
                  ))}
                </div>

                {filteredPredictions.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No predictions match the selected filter.
                  </p>
                )}
              </div>

              {/* ── Period-by-Period Alpha ── */}
              <div className="content-panel p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-purple-500" />
                  <h3 className="text-sm font-semibold">Period-by-Period Alpha</h3>
                </div>
                <div className="overflow-auto max-h-64">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-background">
                      <tr className="border-b text-muted-foreground">
                        <th className="text-left py-1.5 pr-3">Period</th>
                        <th className="text-right py-1.5 pr-3">Days</th>
                        <th className="text-right py-1.5 pr-3">Green Energy</th>
                        <th className="text-right py-1.5 pr-3">Benchmark</th>
                        <th className="text-right py-1.5">Alpha</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analysis.period_performance.map((pp, i) => (
                        <tr key={i} className="border-b border-border/50">
                          <td className="py-1 pr-3 text-muted-foreground">
                            {pp.start_date} → {pp.end_date}
                          </td>
                          <td className="py-1 pr-3 text-right">{pp.days}</td>
                          <td className={cn("py-1 pr-3 text-right font-medium",
                            pp.ge_return_pct >= 0 ? "text-green-500" : "text-red-500"
                          )}>
                            {pp.ge_return_pct >= 0 ? "+" : ""}{pp.ge_return_pct}%
                          </td>
                          <td className={cn("py-1 pr-3 text-right",
                            pp.benchmark_return_pct >= 0 ? "text-green-500" : "text-red-500"
                          )}>
                            {pp.benchmark_return_pct >= 0 ? "+" : ""}{pp.benchmark_return_pct}%
                          </td>
                          <td className={cn("py-1 text-right font-medium",
                            pp.alpha_pct >= 0 ? "text-purple-500" : "text-red-400"
                          )}>
                            {pp.alpha_pct >= 0 ? "+" : ""}{pp.alpha_pct}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {!analysisQ.isLoading && !analysis && !analysisQ.error && (
            <div className="content-panel p-8 flex flex-col items-center justify-center text-center">
              <Brain className="h-12 w-12 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">
                Portfolio analysis data not available. Ensure the backend has the portfolio dataset loaded.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════ TRAIN TAB ═══════════════════ */}
      {activeTab === "train" && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* ─── Left panel: controls ─── */}
          <div className="content-panel p-4 space-y-5">
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <Upload className="h-3.5 w-3.5 text-muted-foreground" />
                <h3 className="text-sm font-semibold">Upload Training Data</h3>
              </div>
              <p className="text-xs text-muted-foreground">
                CSV with OHLCV columns (Date, Open, High, Low, Close, Volume).
              </p>
              <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-lg px-4 py-6 cursor-pointer hover:bg-muted/50 transition-colors">
                <Upload className="h-6 w-6 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  {uploadMut.isPending ? "Uploading…" : "Click or drag CSV file here"}
                </span>
                <input ref={fileRef} type="file" accept=".csv" onChange={handleDataUpload} className="hidden" />
              </label>
              {uploadMut.error && (
                <p className="text-sm text-destructive">{uploadMut.error.message}</p>
              )}
              {uploadMut.data && (
                <div className="text-xs bg-green-500/10 text-green-600 rounded p-2 space-y-1">
                  <p className="font-medium">Uploaded: {uploadMut.data.filename}</p>
                  <p>{uploadMut.data.rows} rows &middot; {uploadMut.data.columns.join(", ")}</p>
                  {uploadMut.data.tickers.length > 0 && (
                    <p>Tickers: {uploadMut.data.tickers.join(", ")}</p>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-2 border-t pt-3">
              <div className="flex items-center gap-1.5">
                <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                <h3 className="text-sm font-semibold">Train Agent</h3>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Tickers</Label>
                <div className="flex gap-1">
                  {(["manual", "csv"] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setTickerMode(mode)}
                      className={cn(
                        "flex-1 px-2 py-1 text-xs rounded border transition-colors",
                        tickerMode === mode
                          ? "bg-primary/10 border-primary text-primary font-medium"
                          : "border-border text-muted-foreground hover:bg-muted"
                      )}
                    >
                      {mode === "manual" ? "Manual" : "CSV"}
                    </button>
                  ))}
                </div>
                {tickerMode === "manual" && (
                  <Input
                    placeholder="SBIN, LT, MARUTI, TITAN"
                    value={manualTickers}
                    onChange={(e) => setManualTickers(e.target.value)}
                    className="text-xs"
                  />
                )}
                {tickerMode === "csv" && (
                  <div className="space-y-1">
                    <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer border border-dashed rounded px-2 py-1.5 hover:bg-muted/50">
                      <Upload className="h-3.5 w-3.5" />
                      {csvTickers.length > 0 ? `${csvTickers.length} tickers loaded` : "Upload ticker CSV"}
                      <input type="file" accept=".csv" onChange={handleCsvTickerUpload} className="hidden" />
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

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Algorithm</Label>
                  <div className="flex gap-0.5">
                    {ALGORITHMS.map((a) => (
                      <button
                        key={a}
                        onClick={() => setAlgorithm(a)}
                        className={cn(
                          "flex-1 px-1.5 py-1 text-xs rounded border transition-colors",
                          algorithm === a
                            ? "bg-primary/10 border-primary text-primary font-medium"
                            : "border-border text-muted-foreground hover:bg-muted"
                        )}
                      >
                        {a}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Reward</Label>
                  <div className="flex gap-0.5">
                    {REWARD_TYPES.map((r) => (
                      <button
                        key={r}
                        onClick={() => setRewardType(r)}
                        className={cn(
                          "flex-1 px-1.5 py-1 text-xs rounded border transition-colors capitalize",
                          rewardType === r
                            ? "bg-primary/10 border-primary text-primary font-medium"
                            : "border-border text-muted-foreground hover:bg-muted"
                        )}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs text-muted-foreground">Timesteps</Label>
                  <Input type="number" value={timesteps} onChange={(e) => setTimesteps(Number(e.target.value))} className="text-xs" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Lookback</Label>
                  <Input type="number" value={lookback} onChange={(e) => setLookback(Number(e.target.value))} className="text-xs" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Train Days</Label>
                  <Input type="number" value={trainDays} onChange={(e) => setTrainDays(Number(e.target.value))} className="text-xs" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Test Days</Label>
                  <Input type="number" value={testDays} onChange={(e) => setTestDays(Number(e.target.value))} className="text-xs" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Folds</Label>
                  <Input type="number" value={folds} onChange={(e) => setFolds(Number(e.target.value))} className="text-xs" />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Capital (₹)</Label>
                  <Input type="number" value={capital} onChange={(e) => setCapital(Number(e.target.value))} className="text-xs" />
                </div>
              </div>

              <Button
                className="w-full"
                onClick={handleTrain}
                disabled={trainMut.isPending || getActiveTickers().length === 0}
              >
                {trainMut.isPending ? (
                  <><Spinner /> Training…</>
                ) : (
                  <><Play className="mr-1 h-4 w-4" /> Train Agent</>
                )}
              </Button>
              {trainMut.error && (
                <p className="text-sm text-destructive">{trainMut.error.message}</p>
              )}
            </div>
          </div>

          {/* ─── Right panel: results ─── */}
          <div className="md:col-span-3 space-y-4">
            <div className="content-panel p-4 space-y-3">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <h4 className="text-sm font-semibold">Uploaded Data Files</h4>
              </div>
              {uploadsQ.isLoading ? (
                <Spinner />
              ) : uploads.length === 0 ? (
                <p className="text-xs text-muted-foreground">No data files uploaded yet.</p>
              ) : (
                <div className="space-y-1">
                  {uploads.map((f) => (
                    <div key={f.filename} className="flex items-center justify-between text-xs bg-muted/50 rounded px-3 py-2">
                      <span className="font-medium">{f.filename}</span>
                      <span className="text-muted-foreground">{f.size_kb} KB</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="content-panel p-4 space-y-3">
              <h4 className="text-sm font-semibold">Trained Models</h4>
              {modelsQ.isLoading ? (
                <Spinner />
              ) : models.length === 0 ? (
                <p className="text-xs text-muted-foreground">No models trained yet.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {models.map((m) => (
                    <div key={m.filename} className="flex items-center justify-between text-xs bg-muted/50 rounded px-3 py-2">
                      <span className="font-medium">
                        {m.ticker} <span className="text-muted-foreground">({m.algorithm})</span>
                      </span>
                      <span className="text-muted-foreground">{m.size_kb} KB</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {trainMut.isPending && (
              <div className="content-panel p-4 flex items-center gap-3">
                <Spinner />
                <p className="text-sm">Training RL agent — this may take a few minutes…</p>
              </div>
            )}

            {trainResult &&
              Object.entries(trainResult.results).map(
                ([ticker, res]: [string, RLTickerResult]) => (
                  <div key={ticker} className="content-panel p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-semibold">{ticker}</h4>
                      <span className="text-xs bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded">
                        {res.algorithm}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Avg Return: {res.avg_test_return?.toFixed(2)}% &middot;
                        Sharpe: {res.avg_test_sharpe?.toFixed(2)} &middot;
                        Max DD: {res.avg_test_drawdown?.toFixed(2)}%
                      </span>
                    </div>
                    {res.folds && res.folds.length > 0 && (
                      <div className="overflow-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b text-muted-foreground">
                              <th className="text-left py-1 pr-3">Fold</th>
                              <th className="text-left py-1 pr-3">Train</th>
                              <th className="text-left py-1 pr-3">Test</th>
                              <th className="text-right py-1 pr-3">Return %</th>
                              <th className="text-right py-1 pr-3">Sharpe</th>
                              <th className="text-right py-1 pr-3">Max DD %</th>
                              <th className="text-right py-1 pr-3">Trades</th>
                              <th className="text-right py-1">Win %</th>
                            </tr>
                          </thead>
                          <tbody>
                            {res.folds.map((f) => (
                              <tr key={f.fold} className="border-b border-border/50">
                                <td className="py-1 pr-3 font-medium">{f.fold}</td>
                                <td className="py-1 pr-3 text-muted-foreground">{f.train_period}</td>
                                <td className="py-1 pr-3 text-muted-foreground">{f.test_period}</td>
                                <td className={cn("py-1 pr-3 text-right", f.return_pct >= 0 ? "text-green-500" : "text-red-500")}>
                                  {f.return_pct?.toFixed(2)}
                                </td>
                                <td className="py-1 pr-3 text-right">{f.sharpe?.toFixed(2)}</td>
                                <td className="py-1 pr-3 text-right text-red-400">{f.max_dd_pct?.toFixed(2)}</td>
                                <td className="py-1 pr-3 text-right">{f.trades}</td>
                                <td className="py-1 text-right">{f.win_rate?.toFixed(1)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )
              )}

            {!trainResult && !trainMut.isPending && uploads.length === 0 && models.length === 0 && (
              <div className="content-panel p-8 flex flex-col items-center justify-center text-center">
                <Bot className="h-12 w-12 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">
                  Upload CSV data files for RL training, then configure and train agents
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════ INDEX CHART (SVG) ═══════════════════ */
function IndexChart({ data }: { data: { date: string; ge: number; benchmark: number; rebalance: boolean }[] }) {
  if (data.length < 2) return null;

  const W = 800;
  const H = 180;
  const PAD = { top: 10, right: 10, bottom: 24, left: 44 };
  const cW = W - PAD.left - PAD.right;
  const cH = H - PAD.top - PAD.bottom;

  const allVals = data.flatMap((d) => [d.ge, d.benchmark]);
  const minV = Math.min(...allVals) * 0.95;
  const maxV = Math.max(...allVals) * 1.02;

  const xScale = (i: number) => PAD.left + (i / (data.length - 1)) * cW;
  const yScale = (v: number) => PAD.top + cH - ((v - minV) / (maxV - minV)) * cH;

  const gePath = data.map((d, i) => `${i === 0 ? "M" : "L"}${xScale(i).toFixed(1)},${yScale(d.ge).toFixed(1)}`).join(" ");
  const bmPath = data.map((d, i) => `${i === 0 ? "M" : "L"}${xScale(i).toFixed(1)},${yScale(d.benchmark).toFixed(1)}`).join(" ");

  const yTicks = 5;
  const yLabels = Array.from({ length: yTicks + 1 }, (_, i) => minV + (i * (maxV - minV)) / yTicks);

  const xStep = Math.max(1, Math.floor(data.length / 5));
  const xLabels = data.filter((_, i) => i % xStep === 0 || i === data.length - 1);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" preserveAspectRatio="xMidYMid meet">
      {yLabels.map((v, i) => (
        <g key={i}>
          <line
            x1={PAD.left} y1={yScale(v)} x2={W - PAD.right} y2={yScale(v)}
            stroke="currentColor" strokeOpacity={0.08} strokeDasharray="4,4"
          />
          <text x={PAD.left - 4} y={yScale(v) + 3} textAnchor="end"
            className="fill-muted-foreground" fontSize={9}>
            {v.toFixed(0)}
          </text>
        </g>
      ))}

      {data.map((d, i) =>
        d.rebalance ? (
          <line key={`rb-${i}`}
            x1={xScale(i)} y1={PAD.top} x2={xScale(i)} y2={H - PAD.bottom}
            stroke="#a855f7" strokeOpacity={0.2} strokeWidth={1}
          />
        ) : null
      )}

      <path d={gePath} fill="none" stroke="#10b981" strokeWidth={1.5} />
      <path d={bmPath} fill="none" stroke="#3b82f6" strokeWidth={1.5} strokeOpacity={0.7} />

      {xLabels.map((d) => {
        const idx = data.indexOf(d);
        return (
          <text key={d.date} x={xScale(idx)} y={H - 4} textAnchor="middle"
            className="fill-muted-foreground" fontSize={8}>
            {d.date.slice(0, 7)}
          </text>
        );
      })}
    </svg>
  );
}
