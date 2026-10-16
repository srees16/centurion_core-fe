"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuthStore } from "@/hooks/use-auth";
import { useUsAdvisory } from "@/hooks/use-us-advisory";
import { MetricsGrid, MetricCard } from "@/components/common/metrics-cards";
import { RibbonVixBar } from "@/components/common/ribbon-vix-bar";
import { Spinner } from "@/components/common/spinner";
import { EquityCurveChart } from "@/components/charts/equity-curve-chart";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { NASDAQ_50_TICKERS } from "@/lib/constants";
import { cn, formatCurrency, formatNumber } from "@/lib/utils";
import type { EquityPoint, UsAdvisoryDay, UsAdvisoryOrder } from "@/lib/types";
import { AlertTriangle, Calendar } from "lucide-react";

/** Your capital, remembered in this browser only (the email's is US_ADVISORY_CAPITAL_USD). */
const CAPITAL_KEY = "us_advisory_capital";

/** A fraction as a percentage: 0.0123 -> "1.2%", or "+1.2%" when signed. */
function pct(x: number | null | undefined, signed = false, digits = 1): string {
  if (x == null || isNaN(x)) return "—";
  const s = `${(x * 100).toFixed(digits)}%`;
  return signed && x >= 0 ? `+${s}` : s;
}

/** A US session date ("2026-10-15") as "Thu 15 Oct". */
function sessionDate(d?: string): string {
  if (!d) return "—";
  return new Date(`${d}T00:00:00Z`).toLocaleDateString("en-GB", {
    weekday: "short", day: "numeric", month: "short", timeZone: "UTC",
  });
}

/** The next open (ISO with its offset) in IST: "Fri 16 Oct, 19:00 IST". */
function openIst(iso?: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-GB", {
    weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false,
    timeZone: "Asia/Kolkata",
  }) + " IST";
}

function readCapital(): number | null {
  try {
    const v = Number(localStorage.getItem(CAPITAL_KEY));
    return v > 0 ? v : null;
  } catch {
    return null;
  }
}

function SidePill({ side }: { side: "BUY" | "SELL" }) {
  return (
    <span className={cn(
      "inline-flex rounded px-1.5 py-0.5 text-xs font-bold",
      side === "BUY" ? "bg-green-600/15 text-green-600" : "bg-red-600/15 text-red-500",
    )}>
      {side}
    </span>
  );
}

function OrdersTable({ orders, k }: { orders: UsAdvisoryOrder[]; k: number }) {
  const buys = orders.filter((o) => o.side === "BUY");
  const buyTotal = buys.reduce((a, o) => a + o.qty * o.price * k, 0);
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-muted-foreground text-left">
            <th className="py-2 pr-3"></th>
            <th className="py-2 pr-3">Symbol</th>
            <th className="py-2 pr-3 text-right">Your shares</th>
            <th className="py-2 pr-3 text-right">Your $</th>
            <th className="py-2 pr-3 text-right">Last close</th>
            <th className="py-2 pr-3 text-right">Stop</th>
            <th className="py-2 pr-3 text-right">Weight after</th>
            <th className="py-2">Why</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => (
            <tr key={`${o.side}-${o.symbol}`} className="border-b">
              <td className="py-2 pr-3"><SidePill side={o.side} /></td>
              <td className="py-2 pr-3 font-mono font-medium">{o.symbol}</td>
              <td className="py-2 pr-3 text-right">{o.all ? "all" : formatNumber(o.qty * k, 4)}</td>
              <td className="py-2 pr-3 text-right">{formatCurrency(o.qty * o.price * k)}</td>
              <td className="py-2 pr-3 text-right">{formatNumber(o.price)}</td>
              <td className="py-2 pr-3 text-right">
                {o.stop ? <>{formatNumber(o.stop)} <span className="text-xs text-muted-foreground">({pct(o.stop / o.price - 1, true)})</span></> : "—"}
              </td>
              <td className="py-2 pr-3 text-right">{pct(o.weight)}</td>
              <td className="py-2 text-xs">{o.reason}</td>
            </tr>
          ))}
          {buys.length > 0 && (
            <tr className="font-semibold">
              <td className="py-2 pr-3"></td>
              <td className="py-2 pr-3">Buys</td>
              <td className="py-2 pr-3"></td>
              <td className="py-2 pr-3 text-right">{formatCurrency(buyTotal)}</td>
              <td colSpan={4}></td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

/* ── Daily Detail: the model book session by session, as the India Trade Center's ── */

type DayKind = "traded" | "decided" | "held";

const dayKind = (d: UsAdvisoryDay): DayKind =>
  d.executed.some((e) => e.status === "FILLED") ? "traded" : d.suggested.length > 0 ? "decided" : "held";

const DAY_STYLE: Record<DayKind, string> = {
  traded: "bg-green-500/15 border-green-500/50 text-green-700 dark:text-green-400 hover:bg-green-500/25",
  decided: "bg-amber-500/15 border-amber-500/50 text-amber-700 dark:text-amber-400 hover:bg-amber-500/25",
  held: "bg-background hover:bg-accent border-border",
};

const DAY_TITLE: Record<DayKind, string> = {
  traded: "Holdings changed: orders filled or a stop was hit",
  decided: "Orders suggested after the close, for the next open",
  held: "Held: no change to the model book",
};

function DailyDetail({ days, k }: { days: UsAdvisoryDay[]; k: number }) {
  const [picked, setPicked] = useState<string | null>(null);
  const day = days.find((d) => d.date === picked) ?? days[0];
  if (!day) {
    return <div className="content-panel p-4 text-sm text-muted-foreground">No sessions recorded yet.</div>;
  }
  const filled = day.executed.filter((e) => e.status === "FILLED").length;

  return (
    <div className="space-y-4">
      <div className="content-panel p-4">
        <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Calendar className="h-4 w-4" /> Select session
        </h4>
        <div className="flex flex-wrap gap-2">
          {days.map((d) => (
            <button
              key={d.date}
              onClick={() => setPicked(d.date)}
              title={DAY_TITLE[dayKind(d)]}
              className={cn("px-3 py-1.5 text-xs font-mono rounded-md border transition-colors",
                d.date === day.date ? "bg-primary text-primary-foreground border-primary" : DAY_STYLE[dayKind(d)])}
            >
              {d.date}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded border border-green-500/50 bg-green-500/15" /> holdings changed
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded border border-amber-500/50 bg-amber-500/15" /> orders suggested, fill next open
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded border border-border bg-background" /> held
          </span>
        </div>
      </div>

      <MetricsGrid>
        <MetricCard label="Model book, your capital" value={formatCurrency(day.equity * k)} />
        <MetricCard label="Day P&L" value={formatCurrency(day.day_pnl * k)}
          color={day.day_pnl >= 0 ? "pnl-positive" : "pnl-negative"} />
        <MetricCard label="Since start" value={pct(day.return, true, 2)}
          color={day.return >= 0 ? "pnl-positive" : "pnl-negative"} />
        <MetricCard label="Names held" value={String(day.names)} />
        <MetricCard label="Filled" value={String(filled)} />
        <MetricCard label="Suggested" value={String(day.suggested.length)} />
      </MetricsGrid>

      <div className="content-panel p-4">
        <h4 className="text-sm font-semibold mb-2">Executed on {sessionDate(day.date)} ({day.executed.length})</h4>
        {day.executed.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing executed: no order filled and no stop was hit.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-muted-foreground text-left">
                  <th className="py-2 pr-3"></th>
                  <th className="py-2 pr-3">Symbol</th>
                  <th className="py-2 pr-3 text-right">Your shares</th>
                  <th className="py-2 pr-3 text-right">Price</th>
                  <th className="py-2 pr-3 text-right">Return</th>
                  <th className="py-2">What</th>
                </tr>
              </thead>
              <tbody>
                {day.executed.map((e, i) => (
                  <tr key={`${e.side}-${e.symbol}-${i}`} className="border-b">
                    <td className="py-2 pr-3"><SidePill side={e.side} /></td>
                    <td className="py-2 pr-3 font-mono font-medium">{e.symbol}</td>
                    <td className="py-2 pr-3 text-right">
                      {e.status === "FILLED" ? formatNumber(e.qty * k, 4) : <span className="text-muted-foreground">not filled</span>}
                    </td>
                    <td className="py-2 pr-3 text-right">{e.status === "FILLED" ? formatNumber(e.price) : "—"}</td>
                    <td className={cn("py-2 pr-3 text-right", e.pnl == null ? "" : e.pnl >= 0 ? "pnl-positive" : "pnl-negative")}>
                      {e.pnl == null ? "—" : pct(e.pnl, true)}
                    </td>
                    <td className="py-2 text-xs">
                      {e.stop_hit ? "stop hit" : e.status === "CANCELLED" ? e.note : e.reason}
                      {e.side === "SELL" && e.closed && !e.stop_hit ? " · position closed" : ""}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="content-panel p-4">
        <h4 className="text-sm font-semibold mb-2">
          Suggested after the {sessionDate(day.date)} close ({day.suggested.length})
        </h4>
        {day.suggested.length === 0 ? (
          <p className="text-sm text-muted-foreground">No orders suggested: hold, and keep the stops in place.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-muted-foreground text-left">
                  <th className="py-2 pr-3"></th>
                  <th className="py-2 pr-3">Symbol</th>
                  <th className="py-2 pr-3 text-right">Your shares</th>
                  <th className="py-2 pr-3 text-right">Your $</th>
                  <th className="py-2 pr-3 text-right">Last close</th>
                  <th className="py-2 pr-3 text-right">Stop</th>
                  <th className="py-2 pr-3">Outcome</th>
                  <th className="py-2">Why</th>
                </tr>
              </thead>
              <tbody>
                {day.suggested.map((s, i) => (
                  <tr key={`${s.side}-${s.symbol}-${i}`} className="border-b">
                    <td className="py-2 pr-3"><SidePill side={s.side} /></td>
                    <td className="py-2 pr-3 font-mono font-medium">{s.symbol}</td>
                    <td className="py-2 pr-3 text-right">{s.side === "SELL" && s.closed ? "all" : formatNumber(s.qty * k, 4)}</td>
                    <td className="py-2 pr-3 text-right">{formatCurrency(s.qty * s.price * k)}</td>
                    <td className="py-2 pr-3 text-right">{formatNumber(s.price)}</td>
                    <td className="py-2 pr-3 text-right">{s.stop ? formatNumber(s.stop) : "—"}</td>
                    <td className="py-2 pr-3 text-xs">
                      {s.status === "PENDING" ? <span className="text-amber-600">next open</span>
                        : s.status === "FILLED"
                          ? `filled ${sessionDate(s.filled_on ?? undefined)} at ${formatNumber(s.fill_price ?? 0)}${
                              s.filled_qty != null && s.filled_qty < s.qty ? ` (${formatNumber(s.filled_qty * k, 4)} of them)` : ""}`
                          : <span className="text-muted-foreground">not filled: {s.note}</span>}
                    </td>
                    <td className="py-2 text-xs">{s.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default function USAdvisoryPage() {
  const isUser = useAuthStore((s) => s.user?.role === "user");
  const q = useUsAdvisory(!isUser);
  const data = q.data;
  const [typed, setTyped] = useState("");                  // the box; empty means the email's capital

  useEffect(() => {
    const saved = readCapital();                           // after hydration: the server has no storage
    if (saved) setTyped(String(saved));
  }, []);

  const defaultCapital = data?.capital ?? 10_000;
  const capital = Number(typed) > 0 ? Number(typed) : defaultCapital;
  const k = data ? capital / data.notional : 0;            // model shares and dollars -> yours

  const saveCapital = (text: string) => {
    setTyped(text);
    try {
      if (Number(text) > 0) localStorage.setItem(CAPITAL_KEY, text);
      else localStorage.removeItem(CAPITAL_KEY);
    } catch {
      /* a convenience only: the page works without it */
    }
  };

  const curve: EquityPoint[] = useMemo(() => {
    const byDate = new Map((data?.equity_curve ?? []).map((p) => [p.date, p.equity]));   // the last mark per day
    let peak = 0;
    return [...byDate.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([date, e]) => {
      peak = Math.max(peak, e);
      return { date, value: e * k, drawdown: peak > 0 ? e / peak - 1 : 0 };
    });
  }, [data, k]);

  if (isUser) {
    return (
      <div className="content-panel p-4 text-sm text-muted-foreground">
        The US advisory is the operator&apos;s model book: it is not available to your account.
      </div>
    );
  }

  const facts = data?.facts ?? {};
  const orders = data?.orders ?? [];
  const holdings = data?.holdings ?? [];
  const days = data?.days ?? [];
  const sells = orders.filter((o) => o.side === "SELL").length;

  return (
    <div className="space-y-6">
      <RibbonVixBar symbols={NASDAQ_50_TICKERS} market="US" />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Left: your capital and how to place */}
        <div className="content-panel p-4 space-y-4 min-w-0 overflow-hidden">
          <h3 className="text-sm font-semibold">US Advisory</h3>
          <div className="space-y-1.5">
            <Label htmlFor="us-capital" className="text-xs">Your US capital (USD)</Label>
            <Input
              id="us-capital" type="number" min={1} step={100} className="h-8 text-sm"
              value={typed} placeholder={String(defaultCapital)} onChange={(e) => saveCapital(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Every amount below is the model book scaled to this capital, in dollars and fractional shares.
              {data?.capital_set && ` The nightly email sizes for ${formatCurrency(data.capital)}.`}
            </p>
          </div>
          <div className="space-y-1.5">
            <h4 className="text-xs font-semibold">How to place</h4>
            <ol className="list-decimal ml-4 space-y-1 text-xs text-muted-foreground">
              <li>At the open ({openIst(data?.next_open_ist)}): sells first, then buys of the dollar amounts,
                as market orders or limits a little above the last close.</li>
              <li>Give every holding a good-till-cancelled sell-stop at its stop; raise stops when listed,
                never lower them.</li>
              <li>The model assumes each order filled at the open.</li>
              <li>Tax: gains on shares held under 24 months are taxed at your slab rate; US dividends lose 25% to
                withholding (credited in India).</li>
            </ol>
          </div>
        </div>

        {/* Main */}
        <div className="md:col-span-3 space-y-4">
          <div className="flex gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500 mt-0.5" />
            <p>
              <span className="font-semibold">Unvalidated · advisory only.</span> The India book&apos;s deployed rules
              on today&apos;s S&amp;P 500; no US backtest or gate has passed yet. Nothing is sent to a broker: you
              place every order.
            </p>
          </div>

          {q.isLoading && <Spinner />}
          {q.error && <p className="text-sm text-destructive">{(q.error as Error).message}</p>}
          {data && !data.ready && (
            <div className="content-panel p-4 text-sm text-muted-foreground">
              No advisory yet: the model book starts with the first run after a US close.
            </div>
          )}

          {data?.ready && (
            <Tabs defaultValue="overview">
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="daily">Daily Detail</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="mt-4 space-y-4">
                <div>
                  <h3 className="text-base font-semibold">Suggestions for the {openIst(data.next_open_ist)} open</h3>
                  <p className="text-xs text-muted-foreground">
                    Decided after the {sessionDate(data.as_of)} US close
                    {data.emailed ? " · emailed" : ""} · model book since {sessionDate(data.start)}
                  </p>
                </div>

                <MetricsGrid>
                  <MetricCard label="Model book" value={pct(data.return, true, 2)}
                    color={(data.return ?? 0) >= 0 ? "text-green-500" : "text-red-500"} />
                  {facts.spx_return != null && <MetricCard label="S&P 500, same period" value={pct(facts.spx_return, true, 2)} />}
                  <MetricCard label="Max drawdown" value={pct(data.max_drawdown)} />
                  <MetricCard label="Invested" value={pct(data.equity ? 1 - (data.cash ?? 0) / data.equity : 0, false, 0)} />
                  <MetricCard label="Holdings" value={String(holdings.length)} />
                  {facts.regime && (
                    <MetricCard label="Market regime" value={`${facts.regime.replace(/_/g, " ")}`}
                      color={facts.regime === "risk_off" ? "text-red-500" : facts.regime === "risk_on" ? "text-green-500" : undefined} />
                  )}
                  {facts.dd_state && facts.dd_state !== "normal" && (
                    <MetricCard label="Drawdown rule" value={`${facts.dd_state} (${pct(facts.dd)})`} color="text-red-500" />
                  )}
                </MetricsGrid>
                {facts.spx != null && (
                  <p className="text-xs text-muted-foreground -mt-2">
                    S&amp;P 500 {formatNumber(facts.spx, 0)}, {pct(facts.spx_vs_ma200, true)} vs its 200-day average
                    {facts.vix != null && ` · VIX ${formatNumber(facts.vix, 1)}`}
                    {facts.scale != null && ` · position scale ${formatNumber(facts.scale, 1)}`}
                  </p>
                )}

                <div className="content-panel p-4">
                  <h4 className="text-sm font-semibold mb-2">
                    Next open: {orders.length - sells} buy{orders.length - sells === 1 ? "" : "s"}, {sells} sell{sells === 1 ? "" : "s"}
                  </h4>
                  {orders.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No orders: hold, and keep the stops in place.</p>
                  ) : (
                    <OrdersTable orders={orders} k={k} />
                  )}
                </div>

                {(facts.raised?.length ?? 0) > 0 && (
                  <div className="content-panel p-4">
                    <h4 className="text-sm font-semibold mb-2">Raise these stops</h4>
                    <div className="flex flex-wrap gap-2 text-sm">
                      {facts.raised!.map(([sym, old, now]) => (
                        <span key={sym} className="rounded border px-2 py-1">
                          <span className="font-mono font-medium">{sym}</span>{" "}
                          <span className="text-muted-foreground">{old != null ? formatNumber(old) : "—"} →</span>{" "}
                          <span className="font-semibold">{formatNumber(now)}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="content-panel p-4">
                  <h4 className="text-sm font-semibold mb-2">Holdings ({holdings.length})</h4>
                  {holdings.length === 0 ? (
                    <p className="text-sm text-muted-foreground">None yet: the first buys fill at the next open.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-muted-foreground text-left">
                            <th className="py-2 pr-3">Symbol</th>
                            <th className="py-2 pr-3 text-right">Weight</th>
                            <th className="py-2 pr-3 text-right">Your shares</th>
                            <th className="py-2 pr-3 text-right">Your $</th>
                            <th className="py-2 pr-3">Since</th>
                            <th className="py-2 pr-3 text-right">Entry → last</th>
                            <th className="py-2 pr-3 text-right">P&amp;L</th>
                            <th className="py-2 text-right">Stop</th>
                          </tr>
                        </thead>
                        <tbody>
                          {holdings.map((h) => (
                            <tr key={h.symbol} className="border-b">
                              <td className="py-2 pr-3 font-mono font-medium">{h.symbol}</td>
                              <td className="py-2 pr-3 text-right">{pct(h.weight)}</td>
                              <td className="py-2 pr-3 text-right">{formatNumber(h.qty * k, 4)}</td>
                              <td className="py-2 pr-3 text-right">{formatCurrency(h.qty * h.last * k)}</td>
                              <td className="py-2 pr-3 text-xs">{sessionDate(h.since)}</td>
                              <td className="py-2 pr-3 text-right">{formatNumber(h.entry)} → {formatNumber(h.last)}</td>
                              <td className={cn("py-2 pr-3 text-right", h.pnl >= 0 ? "pnl-positive" : "pnl-negative")}>
                                {pct(h.pnl, true)}
                              </td>
                              <td className="py-2 text-right">{h.stop ? formatNumber(h.stop) : "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {curve.length > 1 && (
                  <div className="content-panel p-4">
                    <h4 className="text-sm font-semibold mb-2">Model book, scaled to your capital</h4>
                    <EquityCurveChart data={curve} height={280} />
                  </div>
                )}
              </TabsContent>

              <TabsContent value="daily" className="mt-4">
                <DailyDetail days={days} k={k} />
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>
    </div>
  );
}
