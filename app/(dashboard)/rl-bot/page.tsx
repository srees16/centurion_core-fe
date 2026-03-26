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
} from "@/hooks/use-rl-bot";
import type {
  RLAlgorithm,
  RLTrainConfig,
  RLTrainResponse,
  RLTickerResult,
} from "@/lib/types";
import {
  Bot,
  Upload,
  Play,
  Tag,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";

type TickerMode = "manual" | "csv";

const ALGORITHMS: RLAlgorithm[] = ["PPO", "DQN", "A2C"];
const REWARD_TYPES = ["pnl", "sharpe", "hybrid"] as const;

export default function RLBotPage() {
  // Ticker state
  const [tickerMode, setTickerMode] = useState<TickerMode>("manual");
  const [manualTickers, setManualTickers] = useState("SBIN, LT, MARUTI, TITAN");
  const [csvTickers, setCsvTickers] = useState<string[]>([]);

  // Training params
  const [algorithm, setAlgorithm] = useState<RLAlgorithm>("PPO");
  const [rewardType, setRewardType] = useState<(typeof REWARD_TYPES)[number]>("sharpe");
  const [timesteps, setTimesteps] = useState(50000);
  const [lookback, setLookback] = useState(30);
  const [trainDays, setTrainDays] = useState(252);
  const [testDays, setTestDays] = useState(63);
  const [folds, setFolds] = useState(3);
  const [capital, setCapital] = useState(100000);

  // Results
  const [trainResult, setTrainResult] = useState<RLTrainResponse | null>(null);

  // File upload
  const fileRef = useRef<HTMLInputElement>(null);

  // Hooks
  const trainMut = useRLTrain();
  const modelsQ = useRLModels();
  const uploadMut = useRLUpload();
  const uploadsQ = useRLUploads();

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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Bot className="h-5 w-5 text-emerald-500" />
        <h2 className="text-lg font-semibold">RL Bot — Train &amp; Evaluate</h2>
        <span className="text-xs text-muted-foreground">
          Upload training data &amp; train RL agents
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* ─── Left panel: controls ─── */}
        <div className="content-panel p-4 space-y-5">
          {/* CSV Upload section — primary action */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <Upload className="h-3.5 w-3.5 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Upload Training Data</h3>
            </div>
            <p className="text-xs text-muted-foreground">
              CSV with OHLCV columns (Date, Open, High, Low, Close, Volume).
              Optionally include a Ticker column.
            </p>
            <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-lg px-4 py-6 cursor-pointer hover:bg-muted/50 transition-colors">
              <Upload className="h-6 w-6 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                {uploadMut.isPending ? "Uploading…" : "Click or drag CSV file here"}
              </span>
              <input
                ref={fileRef}
                type="file"
                accept=".csv"
                onChange={handleDataUpload}
                className="hidden"
              />
            </label>
            {uploadMut.error && (
              <p className="text-sm text-destructive">{uploadMut.error.message}</p>
            )}
            {uploadMut.data && (
              <div className="text-xs bg-green-500/10 text-green-600 rounded p-2 space-y-1">
                <p className="font-medium">Uploaded: {uploadMut.data.filename}</p>
                <p>
                  {uploadMut.data.rows} rows &middot;{" "}
                  {uploadMut.data.columns.join(", ")}
                </p>
                {uploadMut.data.tickers.length > 0 && (
                  <p>Tickers: {uploadMut.data.tickers.join(", ")}</p>
                )}
              </div>
            )}
          </div>

          {/* Train section */}
          <div className="space-y-2 border-t pt-3">
            <div className="flex items-center gap-1.5">
              <Tag className="h-3.5 w-3.5 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Train Agent</h3>
            </div>

            {/* Ticker input */}
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
                        : "border-border text-muted-foreground hover:bg-muted",
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
                    {csvTickers.length > 0
                      ? `${csvTickers.length} tickers loaded`
                      : "Upload ticker CSV"}
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleCsvTickerUpload}
                      className="hidden"
                    />
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

            {/* Algorithm & Reward */}
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
                          : "border-border text-muted-foreground hover:bg-muted",
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
                          : "border-border text-muted-foreground hover:bg-muted",
                      )}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Parameters */}
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
                <Label className="text-xs text-muted-foreground">Capital ($)</Label>
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
          {/* Uploaded files */}
          <div className="content-panel p-4 space-y-3">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <h4 className="text-sm font-semibold">Uploaded Data Files</h4>
            </div>
            {uploadsQ.isLoading ? (
              <Spinner />
            ) : uploads.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No data files uploaded yet. Upload a CSV with OHLCV data from the left panel.
              </p>
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

          {/* Trained models */}
          <div className="content-panel p-4 space-y-3">
            <h4 className="text-sm font-semibold">Trained Models</h4>
            {modelsQ.isLoading ? (
              <Spinner />
            ) : models.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No models trained yet. Configure parameters and train an agent.
              </p>
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

          {/* Training results */}
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
              ),
            )}

          {/* Empty state */}
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
    </div>
  );
}
