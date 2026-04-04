"use client";

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { MetricsGrid, MetricCard } from "@/components/common/metrics-cards";
import { RibbonVixBar } from "@/components/common/ribbon-vix-bar";
import { Spinner } from "@/components/common/spinner";
import { NIFTY_50_TICKERS } from "@/lib/constants";
import { useTradeMonitorSummary, useTradeMonitorTrades } from "@/hooks/use-trade-monitor";
import { formatCurrency, formatPct } from "@/lib/utils";
import { Activity, CheckCircle, XCircle, AlertTriangle, ArrowUpRight, ArrowDownRight } from "lucide-react";
import type { MonitoredTradeDetail } from "@/lib/types";

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

export default function TradeMonitorPage() {
  const [tab, setTab] = useState("active");
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
        <p className="text-xs text-muted-foreground">Auto-refreshes every 30s</p>
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
      </Tabs>
    </div>
  );
}
