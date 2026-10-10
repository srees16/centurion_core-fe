"use client";

import { useAuthStore } from "@/hooks/use-auth";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { MetricsGrid, MetricCard } from "@/components/common/metrics-cards";
import { RibbonVixBar } from "@/components/common/ribbon-vix-bar";
import { Spinner } from "@/components/common/spinner";
import { EquityCurveChart } from "@/components/charts/equity-curve-chart";
import { JOURNAL_CHART_METRICS, MetricsJournalChart, type JournalChartMetric } from "@/components/charts/metrics-journal-chart";
import { Button } from "@/components/ui/button";
import { NIFTY_50_TICKERS } from "@/lib/constants";
import {
  useTradeMonitorSummary,
  useTradeMonitorTrades,
  usePaperBooks,
  usePaperDashboard,
  useDailySnapshots,
  useSignalLog,
  useWeeklyCheckpoints,
  useDailyDetail,
  usePaperSessions,
  useMetricsJournal,
} from "@/hooks/use-trade-monitor";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency, formatPct, formatNumber } from "@/lib/utils";
import {
  Activity, CheckCircle, XCircle, AlertTriangle,
  ArrowUpRight, ArrowDownRight, TrendingUp, TrendingDown,
  BarChart3, Target, Shield, Zap, Calendar, Search,
  Play, Square, Clock, RefreshCw, BookOpen,
} from "lucide-react";
import type { MonitoredTradeDetail, SignalLogEntry, WeeklyCheckpoint,
  PaperSessionActivity, PaperExecution, DailySnapshot, TradeMonitorDetail,
  JournalKind, JournalMetric, JournalTarget } from "@/lib/types";
import { usePaperTradingState, usePaperTradingToggle } from "@/hooks/use-paper-trading-state";
import { SortableTh, timeValue, useSortableRows } from "@/components/tables/sortable";

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

function tradeStatus(t: MonitoredTradeDetail): string {
  if (!t.entry_filled) return "Pending";
  if (t.sl_triggered) return "SL Hit";
  if (t.tp_triggered) return "TP Hit";
  if (t.closed) return "Closed";
  return "Active";
}

function rewardToRisk(t: MonitoredTradeDetail): number | null {
  const risk = Math.abs(t.entry_price - t.stop_loss);
  return risk > 0 ? Math.abs(t.target_price - t.entry_price) / risk : null;
}

/* Per-position P&L (G10): open positions at their live or last-close price
   (before exit costs), closed trades realised; null when there is no price. */
function tradePrice(t: MonitoredTradeDetail): number | null {
  if (t.closed) return t.exit_price ?? null;
  return t.entry_filled ? (t.current_price ?? null) : null;
}

function pnlInr(t: MonitoredTradeDetail): number | null {
  if (t.closed) return t.pnl ?? null;
  return t.entry_filled && t.current_price != null ? (t.unrealised_pnl ?? null) : null;
}

function pnlPct(t: MonitoredTradeDetail): number | null {
  if (t.closed) return t.pnl_pct ?? t.unrealised_pnl_pct ?? null;
  return t.entry_filled && t.current_price != null ? t.unrealised_pnl_pct : null;
}

function pnlClass(v: number | null): string {
  if (v == null) return "text-muted-foreground";
  return v >= 0 ? "text-green-500" : "text-red-500";
}

function PnlSummary({ data, mode }: { data?: TradeMonitorDetail; mode: "active" | "closed" }) {
  if (!data) return null;
  if (mode === "closed") {
    if (!data.total_closed) return null;
    const r = data.realised_pnl ?? 0;
    return (
      <p className="mb-3 text-sm text-muted-foreground">
        Realised P&amp;L <span className={`font-medium ${pnlClass(r)}`}>{formatCurrency(r, "INR")}</span>
        {" "}over {data.total_closed} trades, {data.realised_wins ?? 0} with a profit.
      </p>
    );
  }
  if (!data.total_active) return null;
  if (!data.marked_positions) {
    return (
      <p className="mb-3 text-sm text-muted-foreground">
        No prices yet: per-position P&amp;L appears after the next paper session.
      </p>
    );
  }
  const u = data.unrealised_pnl ?? 0;
  const when = data.marks_source === "live" ? "live prices" : `the close of ${data.marks_as_of ?? "the last session"}`;
  return (
    <p className="mb-3 text-sm text-muted-foreground">
      Unrealised P&amp;L <span className={`font-medium ${pnlClass(u)}`}>{formatCurrency(u, "INR")}</span>
      {data.unrealised_pnl_pct != null && <> ({formatPct(data.unrealised_pnl_pct, 2)})</>}
      {" "}on {formatCurrency(data.invested_value ?? 0, "INR")} invested across {data.marked_positions} positions,
      {" "}at {when}; before exit costs.
    </p>
  );
}

const TRADE_SORT = {
  symbol: (t: MonitoredTradeDetail) => t.symbol,
  side: (t: MonitoredTradeDetail) => t.direction,
  status: (t: MonitoredTradeDetail) => tradeStatus(t),
  qty: (t: MonitoredTradeDetail) => t.quantity,
  entry: (t: MonitoredTradeDetail) => t.entry_price,
  sl: (t: MonitoredTradeDetail) => t.stop_loss,
  target: (t: MonitoredTradeDetail) => t.target_price,
  rr: rewardToRisk,
  price: tradePrice,
  pnl_inr: pnlInr,
  pnl: pnlPct,
  closed_at: (t: MonitoredTradeDetail) => timeValue(t.closed_at ?? ""),
  product: (t: MonitoredTradeDetail) => t.product,
  opened: (t: MonitoredTradeDetail) => timeValue(t.opened_at),
};

function TradeTable({ trades, mode }: { trades: MonitoredTradeDetail[]; mode: "active" | "closed" }) {
  const { rows, sort } = useSortableRows(trades, TRADE_SORT);

  if (trades.length === 0) {
    return <p className="text-sm text-muted-foreground py-4 text-center">No trades found</p>;
  }

  const th = "py-2 pr-3 font-medium";
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            <SortableTh label="Symbol" sortKey="symbol" sort={sort} className={th} />
            <SortableTh label="Side" sortKey="side" sort={sort} className={th} />
            <SortableTh label="Status" sortKey="status" sort={sort} className={th} />
            <SortableTh label="Qty" sortKey="qty" sort={sort} align="right" className={th} />
            <SortableTh label="Entry" sortKey="entry" sort={sort} align="right" className={th} />
            <SortableTh label={mode === "closed" ? "Exit" : "Last"} sortKey="price" sort={sort} align="right" className={th} />
            <SortableTh label="Stop Loss" sortKey="sl" sort={sort} align="right" className={th} />
            <SortableTh label="Target" sortKey="target" sort={sort} align="right" className={th} />
            <SortableTh label="R:R" sortKey="rr" sort={sort} align="right" className={th} />
            <SortableTh label="P&L ₹" sortKey="pnl_inr" sort={sort} align="right" className={th} />
            <SortableTh label="P&L %" sortKey="pnl" sort={sort} align="right" className={th} />
            <SortableTh label="Product" sortKey="product" sort={sort} className={th} />
            <SortableTh label="Opened" sortKey="opened" sort={sort} className={mode === "closed" ? th : "py-2 font-medium"} />
            {mode === "closed" && <SortableTh label="Closed" sortKey="closed_at" sort={sort} className="py-2 font-medium" />}
          </tr>
        </thead>
        <tbody>
          {rows.map((t) => {
            const ratio = rewardToRisk(t);
            const rr = ratio === null ? "—" : ratio.toFixed(1);
            const price = tradePrice(t);
            const pnl = pnlInr(t);
            const pct = pnlPct(t);
            return (
              <tr key={t.entry_order_id} className="border-b last:border-0 hover:bg-accent/50 transition-colors">
                <td className="py-2 pr-3 font-mono font-medium">{t.symbol}</td>
                <td className="py-2 pr-3"><TradeBadge direction={t.direction} /></td>
                <td className="py-2 pr-3"><StatusBadge trade={t} /></td>
                <td className="py-2 pr-3 text-right">{t.quantity}</td>
                <td className="py-2 pr-3 text-right">{formatCurrency(t.entry_price, "INR")}</td>
                <td className="py-2 pr-3 text-right"
                    title={t.mark_source === "close" && t.mark_date ? `close of ${t.mark_date}` : t.mark_source ?? undefined}>
                  {price == null ? "—" : formatCurrency(price, "INR")}
                </td>
                <td className="py-2 pr-3 text-right text-red-500">{formatCurrency(t.stop_loss, "INR")}</td>
                <td className="py-2 pr-3 text-right text-green-500">{formatCurrency(t.target_price, "INR")}</td>
                <td className="py-2 pr-3 text-right">{rr}×</td>
                <td className={`py-2 pr-3 text-right font-medium ${pnlClass(pnl)}`}>
                  {pnl == null ? "—" : formatCurrency(pnl, "INR")}
                </td>
                <td className={`py-2 pr-3 text-right font-medium ${pnlClass(pct)}`}>
                  {pct == null ? "—" : formatPct(pct, 1)}
                </td>
                <td className="py-2 pr-3 text-xs">{t.product}</td>
                <td className={`${mode === "closed" ? "py-2 pr-3" : "py-2"} text-xs text-muted-foreground`}>{new Date(t.opened_at).toLocaleString()}</td>
                {mode === "closed" && (
                  <td className="py-2 text-xs text-muted-foreground">{t.closed_at ? new Date(t.closed_at).toLocaleString() : "—"}</td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ── Sortable detail tables ────────────────────────────────────────────── */

const SIGNAL_SORT = {
  date: (s: SignalLogEntry) => s.date,
  symbol: (s: SignalLogEntry) => s.symbol,
  forecast: (s: SignalLogEntry) => s.combined_forecast,
  action: (s: SignalLogEntry) => s.action,
  entry: (s: SignalLogEntry) => s.entry_price,
  sl: (s: SignalLogEntry) => s.stop_loss,
  tp: (s: SignalLogEntry) => s.target_price,
  qty: (s: SignalLogEntry) => s.quantity,
  sources: (s: SignalLogEntry) => s.pipeline_sources,
  traded: (s: SignalLogEntry) => s.was_traded,
};

function SignalTable({ signals, showDate, showSources }: { signals: SignalLogEntry[]; showDate?: boolean; showSources?: boolean }) {
  const { rows, sort } = useSortableRows(signals, SIGNAL_SORT);
  const th = "py-1 pr-2";
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            {showDate && <SortableTh label="Date" sortKey="date" sort={sort} className={th} />}
            <SortableTh label="Symbol" sortKey="symbol" sort={sort} className={th} />
            <SortableTh label="Forecast" sortKey="forecast" sort={sort} align="right" className={th} />
            <SortableTh label="Action" sortKey="action" sort={sort} className={th} />
            <SortableTh label="Entry" sortKey="entry" sort={sort} align="right" className={th} />
            <SortableTh label="SL" sortKey="sl" sort={sort} align="right" className={th} />
            <SortableTh label="TP" sortKey="tp" sort={sort} align="right" className={th} />
            <SortableTh label="Qty" sortKey="qty" sort={sort} align="right" className={th} />
            {showSources && <SortableTh label="Sources" sortKey="sources" sort={sort} className={th} />}
            <SortableTh label="Traded" sortKey="traded" sort={sort} className={th} />
          </tr>
        </thead>
        <tbody>
          {rows.map((s, i) => (
            <tr key={s.id ?? i} className="border-b last:border-0">
              {showDate && <td className="py-1 pr-2">{s.date}</td>}
              <td className={`py-1 pr-2 font-mono${showSources ? " font-medium" : ""}`}>{s.symbol}</td>
              <td className="py-1 pr-2 text-right">{s.combined_forecast.toFixed(1)}</td>
              <td className="py-1 pr-2">{s.action}</td>
              <td className="py-1 pr-2 text-right">{formatNumber(s.entry_price)}</td>
              <td className="py-1 pr-2 text-right text-red-500">{formatNumber(s.stop_loss)}</td>
              <td className="py-1 pr-2 text-right text-green-500">{formatNumber(s.target_price)}</td>
              <td className="py-1 pr-2 text-right">{s.quantity}</td>
              {showSources && (
                <td className="py-1 pr-2">
                  <div className="flex flex-wrap gap-0.5">
                    {s.pipeline_sources.split(",").map((src, j) => (
                      <span key={j} className="inline-block rounded bg-accent px-1 py-0.5 text-[10px] font-medium text-muted-foreground">
                        {src.trim()}
                      </span>
                    ))}
                  </div>
                </td>
              )}
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
  );
}

const WEEK_SORT = {
  week: (w: WeeklyCheckpoint) => w.week_number,
  period: (w: WeeklyCheckpoint) => w.week_start,
  ret: (w: WeeklyCheckpoint) => w.week_return_pct,
  sharpe: (w: WeeklyCheckpoint) => w.sharpe_ratio,
  dd: (w: WeeklyCheckpoint) => w.max_dd_pct,
  trades: (w: WeeklyCheckpoint) => w.trades_closed,
  win: (w: WeeklyCheckpoint) => w.win_rate,
  hold: (w: WeeklyCheckpoint) => w.avg_holding_days,
};

function WeeklyCheckpointTable({ weeks }: { weeks: WeeklyCheckpoint[] }) {
  const { rows, sort } = useSortableRows(weeks, WEEK_SORT);
  const th = "py-2 pr-3 font-medium";
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            <SortableTh label="Week" sortKey="week" sort={sort} className={th} />
            <SortableTh label="Period" sortKey="period" sort={sort} className={th} />
            <SortableTh label="Return" sortKey="ret" sort={sort} align="right" className={th} />
            <SortableTh label="Sharpe" sortKey="sharpe" sort={sort} align="right" className={th} />
            <SortableTh label="Max DD" sortKey="dd" sort={sort} align="right" className={th} />
            <SortableTh label="Trades" sortKey="trades" sort={sort} align="right" className={th} />
            <SortableTh label="Win Rate" sortKey="win" sort={sort} align="right" className={th} />
            <SortableTh label="Avg Hold" sortKey="hold" sort={sort} align="right" className={th} />
          </tr>
        </thead>
        <tbody>
          {rows.map((w) => (
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
  );
}

const EXECUTION_SORT = {
  symbol: (e: PaperExecution) => e.symbol,
  source: (e: PaperExecution) => e.source,
  side: (e: PaperExecution) => e.side,
  qty: (e: PaperExecution) => e.quantity,
  decided: (e: PaperExecution) => e.ref_price,
  filled: (e: PaperExecution) => e.fill_price,
  slip: (e: PaperExecution) => (e.ref_price ? e.fill_price / e.ref_price - 1 : null),
  impact: (e: PaperExecution) => e.impact_bps,
  costs: (e: PaperExecution) => e.costs_inr,
  pnl: (e: PaperExecution) => e.pnl,
};

const SOURCE_LABEL: Record<string, string> = {
  pending_open: "Filled at open",
  stop: "Stop exit",
  cancel: "Cancelled",
};

function ExecutionsTable({ executions }: { executions: PaperExecution[] }) {
  const { rows, sort } = useSortableRows(executions, EXECUTION_SORT);
  const th = "py-1 pr-2";
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            <SortableTh label="Symbol" sortKey="symbol" sort={sort} className={th} />
            <SortableTh label="Event" sortKey="source" sort={sort} className={th} />
            <SortableTh label="Side" sortKey="side" sort={sort} className={th} />
            <SortableTh label="Qty" sortKey="qty" sort={sort} align="right" className={th} />
            <SortableTh label="Decided at" sortKey="decided" sort={sort} align="right" className={th} />
            <SortableTh label="Filled at" sortKey="filled" sort={sort} align="right" className={th} />
            <SortableTh label="Slippage" sortKey="slip" sort={sort} align="right" className={th} />
            <SortableTh label="Impact" sortKey="impact" sort={sort} align="right" className={th} />
            <SortableTh label="Costs" sortKey="costs" sort={sort} align="right" className={th} />
            <SortableTh label="P&L" sortKey="pnl" sort={sort} align="right" className={th} />
          </tr>
        </thead>
        <tbody>
          {rows.map((e, i) => {
            const slip = e.ref_price ? (e.fill_price / e.ref_price - 1) * 1e4 : null;
            return (
              <tr key={i} className="border-b last:border-0">
                <td className="py-1 pr-2 font-mono font-medium">{e.symbol}</td>
                <td className="py-1 pr-2">
                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${
                    e.source === "stop" ? "bg-red-500/10 text-red-500"
                      : e.source === "cancel" ? "bg-muted text-muted-foreground"
                        : "bg-green-500/10 text-green-600"
                  }`}>{SOURCE_LABEL[e.source] ?? e.source}</span>
                </td>
                <td className="py-1 pr-2">{e.side}</td>
                <td className="py-1 pr-2 text-right">{e.quantity || "—"}</td>
                <td className="py-1 pr-2 text-right">{e.ref_price ? formatNumber(e.ref_price) : "—"}</td>
                <td className="py-1 pr-2 text-right">{e.fill_price ? formatNumber(e.fill_price) : "—"}</td>
                <td className={`py-1 pr-2 text-right ${slip != null && slip > 0 ? "text-red-500" : "text-green-600"}`}>
                  {slip == null ? "—" : `${slip > 0 ? "+" : ""}${slip.toFixed(0)} bp`}
                </td>
                <td className="py-1 pr-2 text-right">{e.impact_bps ? `${e.impact_bps.toFixed(1)} bp` : "—"}</td>
                <td className="py-1 pr-2 text-right">{e.costs_inr ? formatCurrency(e.costs_inr, "INR") : "—"}</td>
                <td className={`py-1 pr-2 text-right ${e.pnl > 0 ? "text-green-500" : e.pnl < 0 ? "text-red-500" : ""}`}>
                  {e.pnl ? formatCurrency(e.pnl, "INR") : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function SessionActivityCard({ session, date, snapshot, trades }: {
  session: PaperSessionActivity | null;
  date: string;
  snapshot: DailySnapshot | null;
  trades: { opened: number; closed: number; executions: number };
}) {
  // Activity recording started 23 Sep 2026. For earlier sessions the snapshot
  // still proves the engine ran, so report from that rather than claiming
  // nothing is known.
  if (!session) {
    const traded = trades.opened + trades.closed + trades.executions;
    if (!snapshot) {
      return (
        <div className="content-panel p-4 border-l-4 border-l-amber-500 bg-amber-500/5">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" /> No session on {date}
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            No snapshot was recorded, so the engine did not run this day.
          </p>
        </div>
      );
    }
    return (
      <div className="content-panel p-4 border-l-4 border-l-blue-500 bg-blue-500/5">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Activity className="h-4 w-4 text-blue-500" /> Session {date}
        </h3>
        <p className="text-xs text-muted-foreground mt-1">
          {traded > 0
            ? `${trades.opened} opened, ${trades.closed} closed, ${trades.executions} execution(s).`
            : `Held ${snapshot.open_positions} position(s), no trades. `}
          Equity {formatCurrency(snapshot.equity, "INR")}. Detailed session recording began
          on 23 Sep 2026, so the planned-order breakdown is not available for this date.
        </p>
      </div>
    );
  }
  const stat = (label: string, value: React.ReactNode) => (
    <div className="text-center p-2 rounded bg-accent/30">
      <p className="text-lg font-bold font-mono">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
  return (
    <div className="content-panel p-4 border-l-4 border-l-blue-500 bg-blue-500/5">
      <h3 className="text-sm font-semibold mb-1 flex items-center gap-2">
        <Activity className="h-4 w-4 text-blue-500" /> Session {session.session_date}
        <span className={`ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${
          session.rebalance_day ? "bg-blue-500/10 text-blue-600" : "bg-muted text-muted-foreground"
        }`}>{session.rebalance_day ? "rebalance day" : "hold day"}</span>
      </h3>
      <p className="text-xs text-muted-foreground mb-3">{session.outcome}</p>
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {stat("Planned buys", session.planned_buys)}
        {stat("Planned sells", session.planned_sells)}
        {stat("Queued", session.queued)}
        {stat("Filled", session.filled)}
        {stat("Stops hit", session.stops_triggered)}
        {stat("Stops armed", session.stops_armed)}
      </div>
      {(session.notes || session.shift_multiplier !== 1 || session.drawdown_state) && (
        <p className="text-xs text-muted-foreground mt-3">
          {session.drawdown_state &&
            `Drawdown rule ${session.drawdown_state.replace("_", "-")}, ${(session.drawdown_pct ?? 0).toFixed(1)}% below the episode peak. `}
          {session.shift_multiplier !== 1 && `Position size multiplier ${session.shift_multiplier.toFixed(2)}. `}
          {session.notes}
        </p>
      )}
    </div>
  );
}

type TradeRecord = Record<string, unknown>;
const num = (v: unknown) => (v == null || v === "" ? null : Number(v));
const text = (v: unknown) => (v == null ? "" : String(v));

const OPENED_SORT = {
  symbol: (t: TradeRecord) => text(t.symbol),
  side: (t: TradeRecord) => text(t.side ?? "LONG"),
  qty: (t: TradeRecord) => num(t.quantity),
  entry: (t: TradeRecord) => num(t.entry_price),
  sl: (t: TradeRecord) => num(t.stop_loss),
  tp: (t: TradeRecord) => num(t.target_price),
  opened: (t: TradeRecord) => timeValue(t.opened_at),
};

function TradesOpenedTable({ trades }: { trades: TradeRecord[] }) {
  const { rows, sort } = useSortableRows(trades, OPENED_SORT);
  const th = "py-1 pr-2";
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            <SortableTh label="Symbol" sortKey="symbol" sort={sort} className={th} />
            <SortableTh label="Side" sortKey="side" sort={sort} className={th} />
            <SortableTh label="Qty" sortKey="qty" sort={sort} align="right" className={th} />
            <SortableTh label="Entry" sortKey="entry" sort={sort} align="right" className={th} />
            <SortableTh label="SL" sortKey="sl" sort={sort} align="right" className={th} />
            <SortableTh label="TP" sortKey="tp" sort={sort} align="right" className={th} />
            <SortableTh label="Opened At" sortKey="opened" sort={sort} className={th} />
          </tr>
        </thead>
        <tbody>
          {rows.map((t, i) => (
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
  );
}

const CLOSED_SORT = {
  symbol: (t: TradeRecord) => text(t.symbol),
  reason: (t: TradeRecord) => text(t.exit_reason),
  entry: (t: TradeRecord) => num(t.entry_price),
  exit: (t: TradeRecord) => num(t.exit_price),
  pnl: (t: TradeRecord) => num(t.pnl),
  pnlPct: (t: TradeRecord) => num(t.pnl_pct),
  closed: (t: TradeRecord) => timeValue(t.closed_at),
};

function TradesClosedTable({ trades }: { trades: TradeRecord[] }) {
  const { rows, sort } = useSortableRows(trades, CLOSED_SORT);
  const th = "py-1 pr-2";
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            <SortableTh label="Symbol" sortKey="symbol" sort={sort} className={th} />
            <SortableTh label="Exit Reason" sortKey="reason" sort={sort} className={th} />
            <SortableTh label="Entry" sortKey="entry" sort={sort} align="right" className={th} />
            <SortableTh label="Exit" sortKey="exit" sort={sort} align="right" className={th} />
            <SortableTh label="P&L" sortKey="pnl" sort={sort} align="right" className={th} />
            <SortableTh label="P&L %" sortKey="pnlPct" sort={sort} align="right" className={th} />
            <SortableTh label="Closed At" sortKey="closed" sort={sort} className={th} />
          </tr>
        </thead>
        <tbody>
          {rows.map((t, i) => {
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
          className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-medium transition-all ${
            isActive
              ? "bg-muted text-muted-foreground hover:bg-red-500/10 hover:text-red-600 border border-border hover:border-red-500/30"
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

function PaperValidationPanel({ book }: { book: string }) {
  const dashQ = usePaperDashboard(book);
  const snapQ = useDailySnapshots(book);
  const sigQ = useSignalLog(book);
  const weekQ = useWeeklyCheckpoints(book);

  const dash = dashQ.data;
  const snapshots = snapQ.data?.snapshots ?? [];
  const signals = sigQ.data;
  const weeks = weekQ.data?.checkpoints ?? [];

  const equityData = snapshots.map((s) => ({
    date: s.date,
    value: s.equity,
    drawdown: s.max_drawdown_pct,
  }));

  // Daily P&L chart: last 30 sessions; bar height is the size of the day's P&L, colour its sign.
  const recentPnl = snapshots.slice(-30);
  const maxAbsPnl = Math.max(...recentPnl.map((x) => Math.abs(x.day_pnl)), 1);
  const shortDate = (d: string) =>
    new Date(`${d}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

  // Compute annualised CAGR from snapshots
  const tradingDays = snapshots.length;
  const years = tradingDays / 252;
  const cagrPct =
    years > 0 && dash
      ? ((dash.current_capital / dash.initial_capital) ** (1 / years) - 1) * 100
      : 0;

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
          <MetricCard label="CAGR (annualised)" value={formatPct(cagrPct)} color={cagrPct >= 0 ? "pnl-positive" : "pnl-negative"} />
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

      {/* Signal audit — above equity curve for quick actionability */}
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
              <div className="mt-2">
                <SignalTable signals={signals.signals.slice(0, 50)} showDate />
              </div>
            </details>
          )}
        </div>
      )}

      {/* Daily P&L bar chart — above equity curve */}
      {snapshots.length > 0 && (
        <div className="content-panel p-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <TrendingDown className="h-4 w-4" /> Daily P&L
          </h3>
          <div className="flex gap-2">
            {/* y-axis: title and scale */}
            <div className="flex items-center">
              <span className="text-[10px] text-muted-foreground whitespace-nowrap [writing-mode:vertical-rl] rotate-180">
                Daily P&L (₹)
              </span>
            </div>
            <div className="flex flex-col justify-between h-24 text-[10px] text-muted-foreground text-right tabular-nums">
              <span>±{formatCurrency(maxAbsPnl, "INR")}</span>
              <span>₹0</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-end gap-[2px] h-24 border-l border-b border-border">
                {recentPnl.map((s) => (
                  <div
                    key={s.date}
                    title={`${s.date}: ${formatCurrency(s.day_pnl, "INR")}`}
                    className={`flex-1 min-w-[3px] rounded-t ${s.day_pnl >= 0 ? "bg-green-500" : "bg-red-500"}`}
                    style={{ height: `${Math.max(Math.abs(s.day_pnl) / maxAbsPnl * 100, 2)}%`, alignSelf: "flex-end" }}
                  />
                ))}
              </div>
              {/* x-axis: first and last session, then the title */}
              <div className="flex justify-between text-[10px] text-muted-foreground mt-1 tabular-nums">
                <span>{shortDate(recentPnl[0].date)}</span>
                <span>{shortDate(recentPnl[recentPnl.length - 1].date)}</span>
              </div>
              <p className="text-[10px] text-muted-foreground text-center">Trading day</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Last 30 trading days — bar height is the size of the day&apos;s P&L: green a gain, red a loss. Hover for details.
          </p>
        </div>
      )}

      {/* Equity curve */}
      {equityData.length > 0 && (
        <div className="content-panel p-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <TrendingUp className="h-4 w-4" /> Equity Curve
          </h3>
          <EquityCurveChart data={equityData} height={300} />
        </div>
      )}

      {/* Weekly checkpoints */}
      {weeks.length > 0 && (
        <div className="content-panel p-4">
          <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Shield className="h-4 w-4" /> Weekly Checkpoints
          </h3>
          <WeeklyCheckpointTable weeks={weeks} />
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

/* ── Metrics journal (JR1) ─────────────────────────────────────────────── */

const pctOrDash = (v: number | null | undefined, d = 1) => (v == null ? "—" : `${(v * 100).toFixed(d)}%`);
const numOrDash = (v: number | null | undefined, d = 3) => (v == null ? "—" : v.toFixed(d));
const PCT_METRICS: JournalMetric[] = ["cagr", "max_dd"];

function MetricsJournalPanel({ book }: { book: string }) {
  const journalQ = useMetricsJournal(book);
  const [metric, setMetric] = useState<JournalChartMetric>("sharpe");

  if (journalQ.isLoading) return <Spinner />;
  if (!journalQ.data) {
    return <p className="text-sm text-muted-foreground py-4 text-center">Metrics journal unavailable.</p>;
  }
  const { rows, paper, targets, paper_error } = journalQ.data;
  const latest = (kind: JournalKind) => [...rows].reverse().find((r) => r.kind === kind);
  const bt = latest("backtest");
  const wf = latest("walk_forward");
  const last = paper[paper.length - 1];

  // Card label with its target, and green / red against it (no colour without a target or a value).
  const goal = (m: JournalMetric, kind: JournalKind) =>
    targets.find((t) => t.metric === m && (t.kind === null || t.kind === kind));
  const goalText = (t?: JournalTarget) =>
    t ? ` (${t.op} ${PCT_METRICS.includes(t.metric) ? `${t.value * 100}%` : t.value})` : "";
  const goalColor = (t: JournalTarget | undefined, v: number | null | undefined) =>
    !t || v == null ? undefined : (t.op === ">" ? v > t.value : v >= t.value) ? "text-green-500" : "text-red-500";
  const card = (label: string, m: JournalMetric, kind: JournalKind, v: number | null | undefined, digits: number) => {
    const t = goal(m, kind);
    const value = PCT_METRICS.includes(m) ? pctOrDash(v, digits) : numOrDash(v, digits);
    return <MetricCard label={`${label}${goalText(t)}`} value={value} color={goalColor(t, v)} />;
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Target className="h-4 w-4" /> Where it stands
          {bt && (
            <span className="text-xs font-normal text-muted-foreground">
              backtest of {bt.date}: cost model {bt.cost_model ?? "—"}, data {bt.data_hash ?? "—"}
            </span>
          )}
        </h3>
        <MetricsGrid>
          {card("Backtest CAGR", "cagr", "backtest", bt?.cagr, 2)}
          {card("Backtest Sharpe", "sharpe", "backtest", bt?.sharpe, 3)}
          {card("Max DD", "max_dd", "backtest", bt?.max_dd, 1)}
          {card("Calmar", "calmar", "backtest", bt?.calmar, 2)}
          {card("Deflated Sharpe", "dsr", "backtest", bt?.dsr, 3)}
          {card("Walk-forward Sharpe", "sharpe", "walk_forward", wf?.sharpe, 3)}
          <MetricCard label={bt?.pbo_n ? `PBO (${bt.pbo_n} configs)` : "PBO"} value={pctOrDash(bt?.pbo)} />
          <MetricCard label="Expected live Sharpe" value={numOrDash(bt?.exp_sharpe, 2)} />
          <MetricCard label="Expected live CAGR" value={pctOrDash(bt?.exp_cagr)} />
          <MetricCard label={`Paper return (${last?.sessions ?? 0} sessions)`} value={pctOrDash(last?.total_return, 2)}
            color={last?.total_return == null ? undefined : last.total_return >= 0 ? "pnl-positive" : "pnl-negative"} />
        </MetricsGrid>
      </div>

      <div className="content-panel p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <TrendingUp className="h-4 w-4" /> How it moved
          </h3>
          <div className="flex gap-1">
            {JOURNAL_CHART_METRICS.map((m) => (
              <Button key={m.key} size="sm" variant={metric === m.key ? "default" : "outline"}
                className="h-7 px-2 text-xs" onClick={() => setMetric(m.key)}>
                {m.label}
              </Button>
            ))}
          </div>
        </div>
        <MetricsJournalChart rows={rows} paper={paper} targets={targets} metric={metric} />
        <p className="text-xs text-muted-foreground mt-1">
          A backtest or walk-forward value holds until the next re-baseline; paper is the book&apos;s record at each
          week&apos;s last session (Sharpe from 20 sessions). Dashed red: the target.
        </p>
      </div>

      <div className="content-panel p-4">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <BookOpen className="h-4 w-4" /> Journal ({rows.length} entries)
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="py-2 pr-3 font-medium">Date</th>
                <th className="py-2 pr-3 font-medium">Evidence</th>
                <th className="py-2 pr-3 font-medium">Event</th>
                <th className="py-2 pr-3 font-medium text-right">Cost model</th>
                <th className="py-2 pr-3 font-medium">Data</th>
                <th className="py-2 pr-3 font-medium text-right">CAGR</th>
                <th className="py-2 pr-3 font-medium text-right">Sharpe</th>
                <th className="py-2 pr-3 font-medium text-right">Max DD</th>
                <th className="py-2 pr-3 font-medium text-right">Calmar</th>
                <th className="py-2 pr-3 font-medium text-right">DSR</th>
                <th className="py-2 pr-3 font-medium text-right">PBO</th>
              </tr>
            </thead>
            <tbody>
              {[...rows].reverse().map((r) => (
                <tr key={`${r.kind}-${r.ref}`} className="border-b last:border-0 hover:bg-accent/50">
                  <td className="py-2 pr-3 text-xs whitespace-nowrap">{r.date}</td>
                  <td className="py-2 pr-3 text-xs whitespace-nowrap">{r.kind === "backtest" ? "Backtest" : "Walk-forward"}</td>
                  <td className="py-2 pr-3 text-xs" title={r.note ?? undefined}>{r.event}</td>
                  <td className="py-2 pr-3 text-right">{r.cost_model ?? "—"}</td>
                  <td className="py-2 pr-3 text-xs font-mono">{r.data_hash ?? "—"}</td>
                  <td className="py-2 pr-3 text-right">{pctOrDash(r.cagr, 2)}</td>
                  <td className="py-2 pr-3 text-right">{numOrDash(r.sharpe)}</td>
                  <td className="py-2 pr-3 text-right text-red-500">{pctOrDash(r.max_dd)}</td>
                  <td className="py-2 pr-3 text-right">{numOrDash(r.calmar, 2)}</td>
                  <td className="py-2 pr-3 text-right">{numOrDash(r.dsr)}</td>
                  <td className="py-2 pr-3 text-right" title={r.note ?? undefined}>{pctOrDash(r.pbo)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Research evidence from docs/metrics_journal.csv in the repository: a row is added at each re-baseline
          (nse_engine.books register) and committed with the change that moved it. Older PBOs are on raw returns;
          hover a PBO for its basis.
          {paper_error && <span className="text-amber-500"> Paper record unavailable: {paper_error}</span>}
        </p>
      </div>
    </div>
  );
}

/* ── Main Page ─────────────────────────────────────────────────────────── */

function DailyDetailPanel({ book }: { book: string }) {
  const snapQ = useDailySnapshots(book);
  const sessionsQ = usePaperSessions(book);
  const dates = (snapQ.data?.snapshots ?? []).map((s) => s.date).sort().reverse();
  // Two different days matter: the rebalance decides the orders, and the next
  // session fills them - that is when the holdings actually change.
  const byDate = new Map((sessionsQ.data?.sessions ?? []).map((s) => [s.session_date, s]));
  const dayKind = (d: string): "traded" | "rebalance" | "hold" => {
    const s = byDate.get(d);
    if (!s) return "hold";
    if (s.filled > 0 || s.stops_triggered > 0) return "traded";
    if (s.rebalance_day && (s.planned_buys > 0 || s.planned_sells > 0)) return "rebalance";
    return "hold";
  };
  const [selectedDate, setSelectedDate] = useState<string | null>(dates[0] ?? null);
  const detailQ = useDailyDetail(selectedDate, book);
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
            {dates.slice(0, 28).map((dt) => {
              const kind = dayKind(dt);
              const resting = kind === "traded"
                ? "bg-green-500/15 border-green-500/50 text-green-700 dark:text-green-400 hover:bg-green-500/25"
                : kind === "rebalance"
                  ? "bg-amber-500/15 border-amber-500/50 text-amber-700 dark:text-amber-400 hover:bg-amber-500/25"
                  : "bg-background hover:bg-accent border-border";
              const title = kind === "traded"
                ? "Holdings changed: orders filled or a stop was hit"
                : kind === "rebalance"
                  ? "Rebalance decided: orders queued for the next open"
                  : "Held: no change to the portfolio";
              return (
                <button
                  key={dt}
                  onClick={() => setSelectedDate(dt)}
                  title={title}
                  className={`px-3 py-1.5 text-xs font-mono rounded-md border transition-colors ${
                    dt === selectedDate ? "bg-primary text-primary-foreground border-primary" : resting
                  }`}
                >
                  {dt}
                </button>
              );
            })}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded border border-green-500/50 bg-green-500/15" />
            holdings changed
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded border border-amber-500/50 bg-amber-500/15" />
            rebalance decided, fills next session
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded border border-border bg-background" />
            held
          </span>
        </div>
      </div>

      {detailQ.isLoading && <Spinner />}

      {d && (
        <>
          <SessionActivityCard
            session={d.session}
            date={d.date}
            snapshot={d.snapshot}
            trades={{ opened: d.trades_opened_count, closed: d.trades_closed_count,
                      executions: d.executions_count }}
          />

          {/* Executions: fills, stop exits and cancellations */}
          <div className="content-panel p-4">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Zap className="h-4 w-4" /> Executions ({d.executions_count})
            </h3>
            {d.executions_count > 0
              ? <ExecutionsTable executions={d.executions} />
              : <p className="text-sm text-muted-foreground">
                  Nothing executed this session — no order filled, no stop triggered.
                </p>}
          </div>

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
              <SignalTable signals={d.signals} showSources />
            </div>
          )}

          {/* Trades opened */}
          <div className="content-panel p-4">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <ArrowUpRight className="h-4 w-4 text-green-500" /> Trades Opened ({d.trades_opened_count})
            </h3>
            {d.trades_opened_count > 0
              ? <TradesOpenedTable trades={d.trades_opened} />
              : <p className="text-sm text-muted-foreground">
                  No position was opened on this date. Entries fill at the open of the session
                  after a rebalance, so most days show none.
                </p>}
          </div>

          {/* Trades closed / SL-TP events */}
          <div className="content-panel p-4">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-500" /> Trades Closed / SL-TP Events ({d.trades_closed_count})
            </h3>
            {d.trades_closed_count > 0
              ? <TradesClosedTable trades={d.trades_closed} />
              : <p className="text-sm text-muted-foreground">
                  No position was closed on this date: no stop was hit and no rebalance sold out of a name.
                </p>}
          </div>

          {/* Empty state */}
          {!d.snapshot && d.signals.length === 0 && d.executions_count === 0 && (
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

export default function TradeCenterPage() {
  const searchParams = useSearchParams();
  // A signed-up user (MU2) sees the trades, not the operator's paper validation or daily detail
  const isUser = useAuthStore((s) => s.user?.role === "user");
  const tabParam = searchParams.get("tab");
  const initialTab = isUser ? "active" : tabParam === "paper" ? "validation" : tabParam === "journal" ? "journal" : "active";
  const [tab, setTab] = useState(initialTab);
  // G12: which paper book the page shows (deployed, candidate, e4, ...)
  const [book, setBook] = useState(searchParams.get("book") ?? "deployed");
  const booksQ = usePaperBooks();
  const books = booksQ.data?.books ?? [{ book: "deployed", label: "deployed" }];
  const summaryQ = useTradeMonitorSummary();
  const tradesQ = useTradeMonitorTrades(book);

  const active = tradesQ.data?.active_trades ?? [];
  const closed = tradesQ.data?.closed_trades ?? [];
  const slFailed = active.filter((t) => t.sl_failed).length;

  return (
    <div className="space-y-6">
      <RibbonVixBar symbols={NIFTY_50_TICKERS} market="IND" />

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Trade Center</h2>
        <div className="flex items-center gap-3">
          <Select value={book} onValueChange={setBook}>
            <SelectTrigger className="h-8 w-[200px] text-xs" aria-label="Paper book">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {books.map((b) => (
                <SelectItem key={b.book} value={b.book}>{b.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">Auto-refresh every 30s</p>
        </div>
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
          {!isUser && (
            <TabsTrigger value="validation">
              Paper Validation
            </TabsTrigger>
          )}
          {!isUser && (
            <TabsTrigger value="daily-detail">
              Daily Detail
            </TabsTrigger>
          )}
          {!isUser && (
            <TabsTrigger value="journal">
              Journal
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="active" className="mt-4">
          {tradesQ.isLoading ? <Spinner /> : (
            <div className="content-panel p-4">
              <PnlSummary data={tradesQ.data} mode="active" />
              <TradeTable trades={active} mode="active" />
            </div>
          )}
        </TabsContent>

        <TabsContent value="closed" className="mt-4">
          {tradesQ.isLoading ? <Spinner /> : (
            <div className="content-panel p-4">
              <PnlSummary data={tradesQ.data} mode="closed" />
              <TradeTable trades={closed} mode="closed" />
            </div>
          )}
        </TabsContent>

        {!isUser && (
          <TabsContent value="validation" className="mt-4">
            <PaperValidationPanel book={book} />
          </TabsContent>
        )}

        {!isUser && (
          <TabsContent value="daily-detail" className="mt-4">
            <DailyDetailPanel book={book} />
          </TabsContent>
        )}

        {!isUser && (
          <TabsContent value="journal" className="mt-4">
            <MetricsJournalPanel book={book} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
