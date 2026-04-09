"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { MetricsGrid, MetricCard } from "@/components/common/metrics-cards";
import { RibbonVixBar } from "@/components/common/ribbon-vix-bar";
import { Spinner } from "@/components/common/spinner";
import { EquityCurveChart } from "@/components/charts/equity-curve-chart";
import { NIFTY_50_TICKERS } from "@/lib/constants";
import {
  useTradeMonitorSummary,
  useTradeMonitorTrades,
  usePaperDashboard,
  useDailySnapshots,
  useSignalLog,
  useWeeklyCheckpoints,
  useDailyDetail,
} from "@/hooks/use-trade-monitor";
import { formatCurrency, formatPct, formatNumber } from "@/lib/utils";
import {
  Activity, CheckCircle, XCircle, AlertTriangle,
  ArrowUpRight, ArrowDownRight, TrendingUp, TrendingDown,
  BarChart3, Target, Shield, Zap, Calendar, Search,
  Play, Square, Clock, RefreshCw,
} from "lucide-react";
import type { MonitoredTradeDetail } from "@/lib/types";
import { usePaperTradingState, usePaperTradingToggle } from "@/hooks/use-paper-trading-state";

function TradeBadge({ direction }: { direction: string }) {
  return direction === "LONG" ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-600 dark:text-green-400">
      <ArrowUpRight className="h-3 w-3" /> LONG
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-xs font-medium text-red-600 dark:text-red-400">
      <ArrowDownRight className="h-3 w-3" /> SHORT
    </span>
  );
}

function StatusBadge({ trade }: { trade: MonitoredTradeDetail }) {
  if (!trade.entry_filled) {
    return <span className="inline-flex items-center gap-1 text-xs text-amber-500"><AlertTriangle className="h-3 w-3" /> Pending</span>;
  }
  if (trade.sl_triggered) {
    return <span className="inline-flex items-center gap-1 text-xs text-red-500"><XCircle className="h-3 w-3" /> SL Hit</span>;
  }
  if (trade.tp_triggered) {
    return <span className="inline-flex items-center gap-1 text-xs text-green-500"><CheckCircle className="h-3 w-3" /> TP Hit</span>;
  }
  if (trade.closed) {
    return <span className="inline-flex items-center gap-1 text-xs text-muted-foreground"><CheckCircle className="h-3 w-3" /> Closed</span>;
  }
  return <span className="inline-flex items-center gap-1 text-xs text-blue-500"><Activity className="h-3 w-3" /> Active</span>;
}

function TradeTable({ trades, showPnl }: { trades: MonitoredTradeDetail[]; showPnl?: boolean }) {
  if (trades.length === 0) {
    return <p className="text-sm text-muted-foreground py-4 text-center">No trades found</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            <th className="py-2 pr-3 font-medium">Symbol</th>
            <th className="py-2 pr-3 font-medium">Side</th>
            <th className="py-2 pr-3 font-medium">Status</th>
            <th className="py-2 pr-3 font-medium text-right">Qty</th>
            <th className="py-2 pr-3 font-medium text-right">Entry</th>
            <th className="py-2 pr-3 font-medium text-right">Stop Loss</th>
            <th className="py-2 pr-3 font-medium text-right">Target</th>
            <th className="py-2 pr-3 font-medium text-right">R:R</th>
            {showPnl && <th className="py-2 pr-3 font-medium text-right">P&L %</th>}
            <th className="py-2 pr-3 font-medium">Product</th>
            <th className="py-2 font-medium">Opened</th>
          </tr>
        </thead>
        <tbody>
          {trades.map((t) => {
            const risk = Math.abs(t.entry_price - t.stop_loss);
            const reward = Math.abs(t.target_price - t.entry_price);
            const rr = risk > 0 ? (reward / risk).toFixed(1) : "—";
            return (
              <tr key={t.entry_order_id} className="border-b last:border-0 hover:bg-accent/50 transition-colors">
                <td className="py-2 pr-3 font-mono font-medium">{t.symbol}</td>
                <td className="py-2 pr-3"><TradeBadge direction={t.direction} /></td>
                <td className="py-2 pr-3"><StatusBadge trade={t} /></td>
                <td className="py-2 pr-3 text-right">{t.quantity}</td>
                <td className="py-2 pr-3 text-right">{formatCurrency(t.entry_price, "INR")}</td>
                <td className="py-2 pr-3 text-right text-red-500">{formatCurrency(t.stop_loss, "INR")}</td>
                <td className="py-2 pr-3 text-right text-green-500">{formatCurrency(t.target_price, "INR")}</td>
                <td className="py-2 pr-3 text-right">{rr}×</td>
                {showPnl && (
                  <td className={`py-2 pr-3 text-right font-medium ${t.unrealised_pnl_pct >= 0 ? "text-green-500" : "text-red-500"}`}>
                    {t.unrealised_pnl_pct > 0 ? "+" : ""}{t.unrealised_pnl_pct.toFixed(1)}%
                  </td>
                )}
                <td className="py-2 pr-3 text-xs">{t.product}</td>
                <td className="py-2 text-xs text-muted-foreground">{new Date(t.opened_at).toLocaleString()}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ── Paper Trading Control ──────────────────────────────────────────────── */

function PaperTradingControl() {
  const stateQ = usePaperTradingState();
  const toggle = usePaperTradingToggle();
  const state = stateQ.data;

  const handleStart = () => {
    if (confirm("Start automated paper trading for 4 weeks?\n\nThe pipeline will run automatically at IST market hours (9:20, 10:30, 12:30, 14:30, 15:35) Mon-Fri via GitHub Actions.\n\nNo local processes needed.")) {
      toggle.mutate({ action: "start", weeks: 4 });
    }
  };

  const handleStop = () => {
    if (confirm("Stop automated paper trading?\n\nAll existing positions will remain but no new trades will be placed.")) {
      toggle.mutate({ action: "stop" });
    }
  };

  if (stateQ.isLoading) return null;

  const isActive = state?.active ?? false;
  const expiresAt = state?.expires_at ? new Date(state.expires_at) : null;
  const startedAt = state?.started_at ? new Date(state.started_at) : null;
  const lastRunAt = state?.last_run_at ? new Date(state.last_run_at) : null;
  const daysLeft = expiresAt ? Math.max(0, Math.ceil((expiresAt.getTime() - Date.now()) / 86400000)) : 0;

  return (
    <div className={`content-panel p-4 border-l-4 ${isActive ? "border-l-green-500 bg-green-500/5" : "border-l-muted bg-muted/5"}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`h-3 w-3 rounded-full ${isActive ? "bg-green-500 animate-pulse" : "bg-muted-foreground/30"}`} />
          <div>
            <h3 className="text-sm font-semibold">
              {isActive ? "Paper Trading Active" : "Paper Trading Inactive"}
            </h3>
            <p className="text-xs text-muted-foreground">
              {isActive && startedAt
                ? `Started ${startedAt.toLocaleDateString()} · ${daysLeft} days remaining · ${state?.total_runs ?? 0} runs completed`
                : "Fully automated via GitHub Actions — no local processes needed"}
            </p>
          </div>
        </div>

        <button
          onClick={isActive ? handleStop : handleStart}
          disabled={toggle.isPending}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
            isActive
              ? "bg-red-500/10 text-red-600 hover:bg-red-500/20 border border-red-500/30"
              : "bg-green-500/10 text-green-600 hover:bg-green-500/20 border border-green-500/30"
          } disabled:opacity-50`}
        >
          {toggle.isPending ? (
            <RefreshCw className="h-3 w-3 animate-spin" />
          ) : isActive ? (
            <Square className="h-3 w-3" />
          ) : (
            <Play className="h-3 w-3" />
          )}
          {isActive ? "Stop Paper Trading" : "Start Paper Trading"}
        </button>
      </div>

      {/* Last run status */}
      {isActive && lastRunAt && (
        <div className="mt-3 pt-3 border-t border-border/50 flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Last run: {lastRunAt.toLocaleString()}
          </span>
          <span className={`flex items-center gap-1 ${
            state?.last_run_status === "success" ? "text-green-500"
              : state?.last_run_status === "error" ? "text-red-500"
                : ""
          }`}>
            {state?.last_run_status === "success" ? <CheckCircle className="h-3 w-3" /> : null}
            {state?.last_run_status === "error" ? <XCircle className="h-3 w-3" /> : null}
            {state?.last_run_status ?? "none"}
          </span>
          {state?.last_run_message && (
            <span className="truncate max-w-[300px]" title={state.last_run_message}>
              {state.last_run_message}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Paper Validation Section ──────────────────────────────────────────── */

function PaperValidationPanel() {
  const dashQ = usePaperDashboard();
  const snapQ = useDailySnapshots();
  const sigQ = useSignalLog();
  const weekQ = useWeeklyCheckpoints();

  const dash = dashQ.data;
  const snapshots = snapQ.data?.snapshots ?? [];
  const signals = sigQ.data;
  const weeks = weekQ.data?.checkpoints ?? [];

  const equityData = snapshots.map((s) => ({
    date: s.date,
    value: s.equity,
    drawdown: s.max_drawdown_pct,
  }));

  const isLoading = dashQ.isLoading || snapQ.isLoading;

  if (isLoading) return <Spinner />;
  if (!dash) return (
    <div className="space-y-6">
      <PaperTradingControl />
      <p className="text-sm text-muted-foreground py-4 text-center">No paper trading data yet. Click &quot;Start Paper Trading&quot; above to begin.</p>
    </div>
  );

  return (
    <div className="space-y-6">
      <PaperTradingControl />
      {/* Performance metrics */}
      <div>
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <BarChart3 className="h-4 w-4" /> Performance Metrics
        </h3>
        <MetricsGrid>
          <MetricCard
            label="Current Capital"
            value={formatCurrency(dash.current_capital, "INR")}
            delta={dash.total_pnl_pct}
            deltaLabel="total"
            formatAsPct
            color={dash.total_pnl_pct >= 0 ? "pnl-positive" : "pnl-negative"}
          />
          <MetricCard label="Total P&L" value={formatCurrency(dash.total_pnl, "INR")} color={dash.total_pnl >= 0 ? "pnl-positive" : "pnl-negative"} />
          <MetricCard label="Sharpe Ratio" value={dash.sharpe_ratio.toFixed(3)} color={dash.sharpe_ratio >= 0.5 ? "text-green-500" : dash.sharpe_ratio >= 0 ? "text-amber-500" : "text-red-500"} />
          <MetricCard label="Sortino" value={dash.sortino_ratio.toFixed(3)} />
          <MetricCard label="Calmar" value={dash.calmar_ratio.toFixed(3)} />
          <MetricCard label="Omega" value={dash.omega_ratio.toFixed(3)} />
          <MetricCard label="Max Drawdown" value={formatPct(dash.max_drawdown_pct)} color={dash.max_drawdown_pct > 20 ? "text-red-500" : "text-amber-500"} />
          <MetricCard label="Win Rate" value={formatPct(dash.win_rate * 100, 0)} color={dash.win_rate >= 0.5 ? "text-green-500" : "text-red-500"} />
          <MetricCard label="Profit Factor" value={dash.profit_factor.toFixed(2)} />
          <MetricCard label="CVaR 95" value={formatPct(dash.cvar_95 * 100)} />
          <MetricCard label="Avg Win" value={formatPct(dash.avg_win_pct)} color="pnl-positive" />
          <MetricCard label="Avg Loss" value={formatPct(dash.avg_loss_pct)} color="pnl-negative" />
          <MetricCard label="Open Positions" value={dash.open_positions} color="text-blue-500" />
          <MetricCard label="Closed Trades" value={dash.closed_trades} />
        </MetricsGrid>
      </div>

      {/* Equity curve */}
      {equityData.length > 0 && (
        <div className="content-panel p-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <TrendingUp className="h-4 w-4" /> Equity Curve
          </h3>
          <EquityCurveChart data={equityData} height={300} />
        </div>
      )}

      {/* Daily drawdown bar */}
      {snapshots.length > 0 && (
        <div className="content-panel p-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <TrendingDown className="h-4 w-4" /> Daily P&L
          </h3>
          <div className="flex items-end gap-[2px] h-24">
            {snapshots.slice(-30).map((s) => {
              const maxAbs = Math.max(...snapshots.slice(-30).map((x) => Math.abs(x.day_pnl)), 1);
              const h = Math.abs(s.day_pnl) / maxAbs * 80;
              return (
                <div
                  key={s.date}
                  title={`${s.date}: ${formatCurrency(s.day_pnl, "INR")}`}
                  className={`flex-1 min-w-[3px] rounded-t ${s.day_pnl >= 0 ? "bg-green-500" : "bg-red-500"}`}
                  style={{ height: `${Math.max(h, 2)}px`, alignSelf: "flex-end" }}
                />
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground mt-1">Last 30 trading days — hover for details</p>
        </div>
      )}

      {/* Weekly checkpoints */}
      {weeks.length > 0 && (
        <div className="content-panel p-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Shield className="h-4 w-4" /> Weekly Checkpoints
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">Week</th>
                  <th className="py-2 pr-3 font-medium">Period</th>
                  <th className="py-2 pr-3 font-medium text-right">Return</th>
                  <th className="py-2 pr-3 font-medium text-right">Sharpe</th>
                  <th className="py-2 pr-3 font-medium text-right">Max DD</th>
                  <th className="py-2 pr-3 font-medium text-right">Trades</th>
                  <th className="py-2 pr-3 font-medium text-right">Win Rate</th>
                  <th className="py-2 pr-3 font-medium text-right">Avg Hold</th>
                </tr>
              </thead>
              <tbody>
                {weeks.map((w) => (
                  <tr key={w.week_number} className="border-b last:border-0 hover:bg-accent/50">
                    <td className="py-2 pr-3 font-medium">W{w.week_number}</td>
                    <td className="py-2 pr-3 text-xs">{w.week_start} → {w.week_end}</td>
                    <td className={`py-2 pr-3 text-right font-medium ${w.week_return_pct >= 0 ? "text-green-500" : "text-red-500"}`}>
                      {formatPct(w.week_return_pct)}
                    </td>
                    <td className="py-2 pr-3 text-right">{w.sharpe_ratio.toFixed(2)}</td>
                    <td className="py-2 pr-3 text-right text-red-500">{formatPct(w.max_dd_pct)}</td>
                    <td className="py-2 pr-3 text-right">{w.trades_closed}/{w.trades_opened}</td>
                    <td className="py-2 pr-3 text-right">{(w.win_rate * 100).toFixed(0)}%</td>
                    <td className="py-2 pr-3 text-right">{w.avg_holding_days.toFixed(1)}d</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Signal audit */}
      {signals && signals.summary.total_signals > 0 && (
        <div className="content-panel p-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Zap className="h-4 w-4" /> Signal Audit
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <div className="text-center">
              <p className="text-2xl font-bold">{signals.summary.total_signals}</p>
              <p className="text-xs text-muted-foreground">Signals Generated</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-500">{signals.summary.traded_signals}</p>
              <p className="text-xs text-muted-foreground">Signals Traded</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{(signals.summary.hit_rate * 100).toFixed(0)}%</p>
              <p className="text-xs text-muted-foreground">Trade Rate</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{signals.daily_stats.length}</p>
              <p className="text-xs text-muted-foreground">Trading Days</p>
            </div>
          </div>
          {/* Recent signals table */}
          {signals.signals.length > 0 && (
            <details className="mt-2">
              <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                Show recent signals ({signals.count})
              </summary>
              <div className="overflow-x-auto mt-2">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="py-1 pr-2">Date</th>
                      <th className="py-1 pr-2">Symbol</th>
                      <th className="py-1 pr-2 text-right">Forecast</th>
                      <th className="py-1 pr-2">Action</th>
                      <th className="py-1 pr-2 text-right">Entry</th>
                      <th className="py-1 pr-2 text-right">SL</th>
                      <th className="py-1 pr-2 text-right">TP</th>
                      <th className="py-1 pr-2 text-right">Qty</th>
                      <th className="py-1 pr-2">Traded</th>
                    </tr>
                  </thead>
                  <tbody>
                    {signals.signals.slice(0, 50).map((s) => (
                      <tr key={s.id} className="border-b last:border-0">
                        <td className="py-1 pr-2">{s.date}</td>
                        <td className="py-1 pr-2 font-mono">{s.symbol}</td>
                        <td className="py-1 pr-2 text-right">{s.combined_forecast.toFixed(1)}</td>
                        <td className="py-1 pr-2">{s.action}</td>
                        <td className="py-1 pr-2 text-right">{formatNumber(s.entry_price)}</td>
                        <td className="py-1 pr-2 text-right text-red-500">{formatNumber(s.stop_loss)}</td>
                        <td className="py-1 pr-2 text-right text-green-500">{formatNumber(s.target_price)}</td>
                        <td className="py-1 pr-2 text-right">{s.quantity}</td>
                        <td className="py-1 pr-2">
                          {s.was_traded ? (
                            <CheckCircle className="h-3 w-3 text-green-500" />
                          ) : (
                            <XCircle className="h-3 w-3 text-muted-foreground" />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          )}
        </div>
      )}

      {/* Verdict */}
      {snapshots.length >= 15 && dash && (
        <div className={`content-panel p-4 border-l-4 ${
          dash.sharpe_ratio >= 0.5 && dash.max_drawdown_pct < 30
            ? "border-l-green-500 bg-green-500/5"
            : dash.sharpe_ratio >= 0.2
              ? "border-l-amber-500 bg-amber-500/5"
              : "border-l-red-500 bg-red-500/5"
        }`}>
          <h3 className="text-sm font-semibold mb-1 flex items-center gap-2">
            <Target className="h-4 w-4" />
            {dash.sharpe_ratio >= 0.5 && dash.max_drawdown_pct < 30
              ? "VERDICT: PASS — Ready for live trading"
              : dash.sharpe_ratio >= 0.2
                ? "VERDICT: MARGINAL — Consider extending paper period"
                : "VERDICT: FAIL — Do not go live, needs investigation"}
          </h3>
          <p className="text-xs text-muted-foreground">
            Based on {snapshots.length} trading days | Sharpe {dash.sharpe_ratio.toFixed(3)} | Max DD {formatPct(dash.max_drawdown_pct)}
          </p>
        </div>
      )}
    </div>
  );
}

/* ── Main Page ─────────────────────────────────────────────────────────── */

function DailyDetailPanel() {
  const snapQ = useDailySnapshots();
  const dates = (snapQ.data?.snapshots ?? []).map((s) => s.date).sort().reverse();
  const [selectedDate, setSelectedDate] = useState<string | null>(dates[0] ?? null);
  const detailQ = useDailyDetail(selectedDate);
  const d = detailQ.data;

  // Update selected date when snapshots load
  if (!selectedDate && dates.length > 0) {
    setSelectedDate(dates[0]);
  }

  return (
    <div className="space-y-6">
      {/* Date selector */}
      <div className="content-panel p-4">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Calendar className="h-4 w-4" /> Select Trading Day
        </h3>
        {dates.length === 0 ? (
          <p className="text-sm text-muted-foreground">No snapshots recorded yet.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {dates.slice(0, 28).map((dt) => (
              <button
                key={dt}
                onClick={() => setSelectedDate(dt)}
                className={`px-3 py-1.5 text-xs font-mono rounded-md border transition-colors ${
                  dt === selectedDate
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background hover:bg-accent border-border"
                }`}
              >
                {dt}
              </button>
            ))}
          </div>
        )}
      </div>

      {detailQ.isLoading && <Spinner />}

      {d && (
        <>
          {/* Day KPIs */}
          {d.snapshot && (
            <div>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <BarChart3 className="h-4 w-4" /> Day Snapshot — {d.date}
              </h3>
              <MetricsGrid>
                <MetricCard label="Equity" value={formatCurrency(d.snapshot.equity, "INR")} />
                <MetricCard label="Cash" value={formatCurrency(d.snapshot.cash, "INR")} />
                <MetricCard
                  label="Day P&L"
                  value={formatCurrency(d.snapshot.day_pnl, "INR")}
                  color={d.snapshot.day_pnl >= 0 ? "pnl-positive" : "pnl-negative"}
                />
                <MetricCard
                  label="Cumulative P&L"
                  value={formatPct(d.snapshot.cumulative_pnl_pct)}
                  color={d.snapshot.cumulative_pnl_pct >= 0 ? "pnl-positive" : "pnl-negative"}
                />
                <MetricCard label="Signals Generated" value={d.total_signals} />
                <MetricCard label="Signals Traded" value={d.traded_signals} color="text-blue-500" />
                <MetricCard label="Open Positions" value={d.snapshot.open_positions} />
                <MetricCard label="Closed Today" value={d.snapshot.closed_today} />
              </MetricsGrid>
            </div>
          )}

          {/* Advanced metrics from snapshot_detail */}
          {d.snapshot_detail && Object.keys(d.snapshot_detail).length > 0 && (
            <div className="content-panel p-4">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Target className="h-4 w-4" /> Advanced Metrics
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                {[
                  { key: "sharpe_ratio", label: "Sharpe" },
                  { key: "sortino_ratio", label: "Sortino" },
                  { key: "calmar_ratio", label: "Calmar" },
                  { key: "omega_ratio", label: "Omega" },
                  { key: "profit_factor", label: "Profit Factor" },
                  { key: "win_rate", label: "Win Rate" },
                  { key: "max_drawdown_pct", label: "Max DD %" },
                  { key: "cvar_95", label: "CVaR 95" },
                ].map(({ key, label }) => {
                  const val = d.snapshot_detail[key];
                  if (val == null) return null;
                  const num = typeof val === "number" ? val : parseFloat(String(val));
                  return (
                    <div key={key} className="text-center p-2 rounded bg-accent/30">
                      <p className="text-lg font-bold font-mono">
                        {key.includes("rate") || key.includes("pct") || key.includes("drawdown")
                          ? `${(num * (key === "win_rate" ? 100 : 1)).toFixed(1)}%`
                          : num.toFixed(3)}
                      </p>
                      <p className="text-xs text-muted-foreground">{label}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Signals table */}
          {d.signals.length > 0 && (
            <div className="content-panel p-4">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Zap className="h-4 w-4" /> Signals — {d.total_signals} generated, {d.traded_signals} traded, {d.skipped_signals} skipped
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="py-1 pr-2">Symbol</th>
                      <th className="py-1 pr-2 text-right">Forecast</th>
                      <th className="py-1 pr-2">Action</th>
                      <th className="py-1 pr-2 text-right">Entry</th>
                      <th className="py-1 pr-2 text-right">SL</th>
                      <th className="py-1 pr-2 text-right">TP</th>
                      <th className="py-1 pr-2 text-right">Qty</th>
                      <th className="py-1 pr-2">Sources</th>
                      <th className="py-1 pr-2">Traded</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.signals.map((s, i) => (
                      <tr key={i} className="border-b last:border-0">
                        <td className="py-1 pr-2 font-mono font-medium">{s.symbol}</td>
                        <td className="py-1 pr-2 text-right">{s.combined_forecast.toFixed(1)}</td>
                        <td className="py-1 pr-2">{s.action}</td>
                        <td className="py-1 pr-2 text-right">{formatNumber(s.entry_price)}</td>
                        <td className="py-1 pr-2 text-right text-red-500">{formatNumber(s.stop_loss)}</td>
                        <td className="py-1 pr-2 text-right text-green-500">{formatNumber(s.target_price)}</td>
                        <td className="py-1 pr-2 text-right">{s.quantity}</td>
                        <td className="py-1 pr-2">
                          <div className="flex flex-wrap gap-0.5">
                            {s.pipeline_sources.split(",").map((src, j) => (
                              <span key={j} className="inline-block rounded bg-accent px-1 py-0.5 text-[10px] font-medium text-muted-foreground">
                                {src.trim()}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-1 pr-2">
                          {s.was_traded ? (
                            <CheckCircle className="h-3 w-3 text-green-500" />
                          ) : (
                            <XCircle className="h-3 w-3 text-muted-foreground" />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Trades opened */}
          {d.trades_opened_count > 0 && (
            <div className="content-panel p-4">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <ArrowUpRight className="h-4 w-4 text-green-500" /> Trades Opened ({d.trades_opened_count})
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="py-1 pr-2">Symbol</th>
                      <th className="py-1 pr-2">Side</th>
                      <th className="py-1 pr-2 text-right">Qty</th>
                      <th className="py-1 pr-2 text-right">Entry</th>
                      <th className="py-1 pr-2 text-right">SL</th>
                      <th className="py-1 pr-2 text-right">TP</th>
                      <th className="py-1 pr-2">Opened At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.trades_opened.map((t, i) => (
                      <tr key={i} className="border-b last:border-0">
                        <td className="py-1 pr-2 font-mono font-medium">{String(t.symbol ?? "")}</td>
                        <td className="py-1 pr-2">{String(t.side ?? "LONG")}</td>
                        <td className="py-1 pr-2 text-right">{String(t.quantity ?? "")}</td>
                        <td className="py-1 pr-2 text-right">{formatNumber(Number(t.entry_price ?? 0))}</td>
                        <td className="py-1 pr-2 text-right text-red-500">{formatNumber(Number(t.stop_loss ?? 0))}</td>
                        <td className="py-1 pr-2 text-right text-green-500">{formatNumber(Number(t.target_price ?? 0))}</td>
                        <td className="py-1 pr-2 text-xs text-muted-foreground">{String(t.opened_at ?? "")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Trades closed / SL-TP events */}
          {d.trades_closed_count > 0 && (
            <div className="content-panel p-4">
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-500" /> Trades Closed / SL-TP Events ({d.trades_closed_count})
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="py-1 pr-2">Symbol</th>
                      <th className="py-1 pr-2">Exit Reason</th>
                      <th className="py-1 pr-2 text-right">Entry</th>
                      <th className="py-1 pr-2 text-right">Exit</th>
                      <th className="py-1 pr-2 text-right">P&L</th>
                      <th className="py-1 pr-2 text-right">P&L %</th>
                      <th className="py-1 pr-2">Closed At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {d.trades_closed.map((t, i) => {
                      const pnl = Number(t.pnl ?? 0);
                      const pnlPct = Number(t.pnl_pct ?? 0);
                      return (
                        <tr key={i} className="border-b last:border-0">
                          <td className="py-1 pr-2 font-mono font-medium">{String(t.symbol ?? "")}</td>
                          <td className="py-1 pr-2">
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${
                              String(t.exit_reason ?? "").includes("SL") ? "bg-red-500/10 text-red-500"
                                : String(t.exit_reason ?? "").includes("TP") ? "bg-green-500/10 text-green-500"
                                  : "bg-muted text-muted-foreground"
                            }`}>
                              {String(t.exit_reason ?? "—")}
                            </span>
                          </td>
                          <td className="py-1 pr-2 text-right">{formatNumber(Number(t.entry_price ?? 0))}</td>
                          <td className="py-1 pr-2 text-right">{formatNumber(Number(t.exit_price ?? 0))}</td>
                          <td className={`py-1 pr-2 text-right font-medium ${pnl >= 0 ? "text-green-500" : "text-red-500"}`}>
                            {formatCurrency(pnl, "INR")}
                          </td>
                          <td className={`py-1 pr-2 text-right ${pnlPct >= 0 ? "text-green-500" : "text-red-500"}`}>
                            {pnlPct > 0 ? "+" : ""}{pnlPct.toFixed(1)}%
                          </td>
                          <td className="py-1 pr-2 text-xs text-muted-foreground">{String(t.closed_at ?? "")}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Empty state */}
          {!d.snapshot && d.signals.length === 0 && d.trades_opened_count === 0 && d.trades_closed_count === 0 && (
            <div className="content-panel p-6 text-center text-muted-foreground">
              <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No activity recorded for {d.date}</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function TradeMonitorPage() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") === "paper" ? "validation" : "active";
  const [tab, setTab] = useState(initialTab);
  const summaryQ = useTradeMonitorSummary();
  const tradesQ = useTradeMonitorTrades();

  const active = tradesQ.data?.active_trades ?? [];
  const closed = tradesQ.data?.closed_trades ?? [];
  const slFailed = active.filter((t) => t.sl_failed).length;

  return (
    <div className="space-y-6">
      <RibbonVixBar symbols={NIFTY_50_TICKERS} market="IND" />

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Trade Monitor</h2>
        <p className="text-xs text-muted-foreground">Auto-refresh every 30s</p>
      </div>

      {summaryQ.isLoading ? (
        <Spinner />
      ) : (
        <MetricsGrid>
          <MetricCard label="Active Trades" value={tradesQ.data?.total_active ?? summaryQ.data?.active ?? 0} color="text-blue-500" />
          <MetricCard label="Closed Trades" value={tradesQ.data?.total_closed ?? summaryQ.data?.closed ?? 0} />
          <MetricCard label="Total Registered" value={summaryQ.data?.total_registered ?? 0} />
          {slFailed > 0 && (
            <MetricCard label="SL Failed" value={slFailed} color="text-red-500" />
          )}
        </MetricsGrid>
      )}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="active">
            Active ({active.length})
          </TabsTrigger>
          <TabsTrigger value="closed">
            Closed ({closed.length})
          </TabsTrigger>
          <TabsTrigger value="validation">
            Paper Validation
          </TabsTrigger>
          <TabsTrigger value="daily-detail">
            Daily Detail
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-4">
          {tradesQ.isLoading ? <Spinner /> : (
            <div className="content-panel p-4">
              <TradeTable trades={active} showPnl />
            </div>
          )}
        </TabsContent>

        <TabsContent value="closed" className="mt-4">
          {tradesQ.isLoading ? <Spinner /> : (
            <div className="content-panel p-4">
              <TradeTable trades={closed} />
            </div>
          )}
        </TabsContent>

        <TabsContent value="validation" className="mt-4">
          <PaperValidationPanel />
        </TabsContent>

        <TabsContent value="daily-detail" className="mt-4">
          <DailyDetailPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
