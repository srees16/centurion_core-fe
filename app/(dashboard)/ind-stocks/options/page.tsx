"use client";

import { useState } from "react";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { RibbonVixBar } from "@/components/common/ribbon-vix-bar";
import { Spinner } from "@/components/common/spinner";
import { useIndexQuotes, useOptionChain, useOptionExpiries, useOverlayScan } from "@/hooks/use-options";
import { INDEX_OPTIONS, NIFTY_50_TICKERS } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";
import { MetricsGrid, MetricCard } from "@/components/common/metrics-cards";
import { Play, Shield, TrendingDown, Layers } from "lucide-react";
import type { OverlayOrder, MultiLegOrder } from "@/lib/types";

type MoneynessFilter = "ALL" | "ITM" | "ATM" | "OTM";

const fmtNum = (v: number | null, digits: number) => (v === null ? "-" : v.toFixed(digits));
const fmtCount = (v: number | null) => (v === null ? "-" : v.toLocaleString());

/* ────────── Overlay Order Table ────────── */
function OverlayOrderTable({ orders, type }: { orders: OverlayOrder[]; type: "CC" | "CSP" }) {
  if (orders.length === 0)
    return <p className="text-sm text-muted-foreground">No {type === "CC" ? "covered call" : "cash-secured put"} passed the scan; the log below says why.</p>;
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b text-muted-foreground text-xs">
          <th className="py-1 px-2 text-left">Symbol</th>
          <th className="py-1 px-2 text-right">Spot</th>
          <th className="py-1 px-2 text-right">Strike</th>
          <th className="py-1 px-2 text-right">Expiry</th>
          <th className="py-1 px-2 text-right">Premium</th>
          <th className="py-1 px-2 text-right">Total</th>
          <th className="py-1 px-2 text-right">Delta</th>
          <th className="py-1 px-2 text-right">IV</th>
          <th className="py-1 px-2 text-right">Lots</th>
        </tr>
      </thead>
      <tbody>
        {orders.map((o, i) => (
          <tr key={`${o.symbol}-${i}`} className="border-b hover:bg-muted/30">
            <td className="py-1 px-2 font-medium">{o.symbol}</td>
            <td className="py-1 px-2 text-right font-mono">{formatCurrency(o.underlying_price)}</td>
            <td className="py-1 px-2 text-right font-mono">{o.strike.toFixed(1)}</td>
            <td className="py-1 px-2 text-right">{o.expiry}</td>
            <td className="py-1 px-2 text-right font-mono text-green-500">₹{o.premium.toFixed(2)}</td>
            <td className="py-1 px-2 text-right font-mono text-green-500">₹{o.total_premium.toLocaleString()}</td>
            <td className="py-1 px-2 text-right">{o.delta.toFixed(3)}</td>
            <td className="py-1 px-2 text-right">{(o.iv * 100).toFixed(1)}%</td>
            <td className="py-1 px-2 text-right">{o.lots}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/* ────────── Multi-Leg Table ────────── */
function MultiLegTable({ orders }: { orders: MultiLegOrder[] }) {
  if (orders.length === 0)
    return <p className="text-sm text-muted-foreground">No iron condor passed the scan; the log below says why.</p>;
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b text-muted-foreground text-xs">
          <th className="py-1 px-2 text-left">Underlying</th>
          <th className="py-1 px-2 text-left">Legs</th>
          <th className="py-1 px-2 text-right">Net Credit</th>
          <th className="py-1 px-2 text-right">Max Loss</th>
          <th className="py-1 px-2 text-right">PoP</th>
          <th className="py-1 px-2 text-right">Margin</th>
        </tr>
      </thead>
      <tbody>
        {orders.map((o, i) => (
          <tr key={`${o.underlying}-${i}`} className="border-b hover:bg-muted/30">
            <td className="py-1 px-2 font-medium">{o.underlying}</td>
            <td className="py-1 px-2">
              <div className="flex flex-wrap gap-1">
                {o.legs.map((l, li) => (
                  <Badge key={li} variant={l.side === "SELL" ? "destructive" : "secondary"} className="text-[10px] px-1 py-0">
                    {l.side} {l.type} {l.strike}
                  </Badge>
                ))}
              </div>
            </td>
            <td className="py-1 px-2 text-right font-mono text-green-500">₹{o.net_credit.toLocaleString()}</td>
            <td className="py-1 px-2 text-right font-mono text-red-500">₹{o.max_loss.toLocaleString()}</td>
            <td className="py-1 px-2 text-right">{o.pop.toFixed(1)}%</td>
            <td className="py-1 px-2 text-right font-mono">₹{o.margin_required.toLocaleString()}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function INDOptionsPage() {
  const [symbol, setSymbol] = useState("NIFTY");
  const [expiry, setExpiry] = useState("");
  const [moneyness, setMoneyness] = useState<MoneynessFilter>("ALL");
  const indexQ = useIndexQuotes();
  const expiriesQ = useOptionExpiries(symbol);
  const chainQ = useOptionChain(symbol, expiry);
  const overlayScan = useOverlayScan();

  const indices = indexQ.data ?? [];
  const chain = chainQ.data ?? [];
  const filteredChain = moneyness === "ALL" ? chain : chain.filter((r) => r.moneyness === moneyness);
  const scan = overlayScan.data;

  return (
    <div className="space-y-6">
      <RibbonVixBar symbols={NIFTY_50_TICKERS} market="IND" />
      {/* Index quotes ribbon */}
      <MetricsGrid>
        {indices.map((idx) => (
          <MetricCard
            key={idx.index}
            label={idx.index}
            value={formatCurrency(idx.ltp)}
            color={idx.change >= 0 ? "text-green-500" : "text-red-500"}
            deltaLabel={`${idx.change >= 0 ? "+" : ""}${idx.change.toFixed(2)} (${idx.change_pct.toFixed(2)}%)`}
          />
        ))}
      </MetricsGrid>

      <Tabs defaultValue="chain" className="w-full">
        <TabsList>
          <TabsTrigger value="chain">Option Chain</TabsTrigger>
          <TabsTrigger value="strategies">
            Overlay Strategies
            {scan && <Badge variant="secondary" className="ml-2 text-[10px]">{scan.summary.covered_call_count + scan.summary.csp_count + scan.summary.iron_condor_count}</Badge>}
          </TabsTrigger>
        </TabsList>

        {/* ────── Chain Tab ────── */}
        <TabsContent value="chain">
          <div className="flex gap-4 items-end flex-wrap mb-4">
            <div>
              <Label className="text-xs">Symbol</Label>
              <Select value={symbol} onValueChange={(v) => { setSymbol(v); setExpiry(""); }}>
                <SelectTrigger className="h-8 text-sm w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {INDEX_OPTIONS.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Expiry</Label>
              <Select value={expiry} onValueChange={setExpiry} disabled={!expiriesQ.data?.length}>
                <SelectTrigger className="h-8 text-sm w-40"><SelectValue placeholder="Select expiry" /></SelectTrigger>
                <SelectContent>
                  {expiriesQ.data?.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Moneyness</Label>
              <Select value={moneyness} onValueChange={(v) => setMoneyness(v as MoneynessFilter)}>
                <SelectTrigger className="h-8 text-sm w-28"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All</SelectItem>
                  <SelectItem value="ITM">ITM</SelectItem>
                  <SelectItem value="ATM">ATM</SelectItem>
                  <SelectItem value="OTM">OTM</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {chainQ.isLoading && <Spinner />}
          {(expiriesQ.error || chainQ.error) && (
            <p className="text-sm text-red-500">
              {String((expiriesQ.error ?? chainQ.error) instanceof Error
                ? (expiriesQ.error ?? chainQ.error)?.message
                : (expiriesQ.error ?? chainQ.error))}
            </p>
          )}
          {filteredChain.length > 0 && (
            <div className="content-panel p-4 overflow-x-auto">
              <h4 className="text-sm font-semibold mb-2">Option Chain — {symbol} {expiry}</h4>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th colSpan={8} className="py-2 text-center border-r bg-green-500/5">CALLS</th>
                    <th className="py-2 px-3">Strike</th>
                    <th colSpan={8} className="py-2 text-center border-l bg-red-500/5">PUTS</th>
                  </tr>
                  <tr className="border-b text-muted-foreground text-xs">
                    <th className="py-1 px-1">OI</th><th className="py-1 px-1">Vol</th><th className="py-1 px-1">IV</th><th className="py-1 px-1">LTP</th>
                    <th className="py-1 px-1">Δ</th><th className="py-1 px-1">Γ</th><th className="py-1 px-1">Θ</th><th className="py-1 px-1 border-r">V</th>
                    <th className="py-1 px-3 font-bold">Strike</th>
                    <th className="py-1 px-1 border-l">LTP</th><th className="py-1 px-1">IV</th><th className="py-1 px-1">Vol</th><th className="py-1 px-1">OI</th>
                    <th className="py-1 px-1">Δ</th><th className="py-1 px-1">Γ</th><th className="py-1 px-1">Θ</th><th className="py-1 px-1">V</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredChain.map((row) => (
                    <tr key={row.strike} className={`border-b hover:bg-muted/30 ${row.moneyness === "ATM" ? "bg-yellow-500/5" : ""}`}>
                      <td className="py-1 px-1 text-right">{fmtCount(row.ce_oi)}</td>
                      <td className="py-1 px-1 text-right">{fmtCount(row.ce_volume)}</td>
                      <td className="py-1 px-1 text-right">{fmtNum(row.ce_iv, 1)}</td>
                      <td className="py-1 px-1 text-right font-mono">{fmtNum(row.ce_ltp, 2)}</td>
                      <td className="py-1 px-1 text-right text-muted-foreground">{fmtNum(row.ce_delta, 2)}</td>
                      <td className="py-1 px-1 text-right text-muted-foreground">{fmtNum(row.ce_gamma, 4)}</td>
                      <td className="py-1 px-1 text-right text-muted-foreground">{fmtNum(row.ce_theta, 2)}</td>
                      <td className="py-1 px-1 text-right text-muted-foreground border-r">{fmtNum(row.ce_vega, 2)}</td>
                      <td className="py-1 px-3 text-center font-bold bg-muted/30">{row.strike}</td>
                      <td className="py-1 px-1 text-right border-l font-mono">{fmtNum(row.pe_ltp, 2)}</td>
                      <td className="py-1 px-1 text-right">{fmtNum(row.pe_iv, 1)}</td>
                      <td className="py-1 px-1 text-right">{fmtCount(row.pe_volume)}</td>
                      <td className="py-1 px-1 text-right">{fmtCount(row.pe_oi)}</td>
                      <td className="py-1 px-1 text-right text-muted-foreground">{fmtNum(row.pe_delta, 2)}</td>
                      <td className="py-1 px-1 text-right text-muted-foreground">{fmtNum(row.pe_gamma, 4)}</td>
                      <td className="py-1 px-1 text-right text-muted-foreground">{fmtNum(row.pe_theta, 2)}</td>
                      <td className="py-1 px-1 text-right text-muted-foreground">{fmtNum(row.pe_vega, 2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        {/* ────── Strategies Tab ────── */}
        <TabsContent value="strategies">
          <div className="space-y-6">
            {/* Scan Controls */}
            <div className="flex items-center gap-4">
              <Button
                size="sm"
                onClick={() => overlayScan.mutate({})}
                disabled={overlayScan.isPending}
              >
                {overlayScan.isPending ? (
                  <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : (
                  <Play className="mr-2 h-4 w-4" />
                )}
                Scan Overlay Strategies
              </Button>
              {overlayScan.error && (
                <p className="text-sm text-red-500">
                  {overlayScan.error instanceof Error
                    ? overlayScan.error.message
                    : String(overlayScan.error)}
                </p>
              )}
            </div>

            {/* Summary Cards */}
            {scan && (
              <>
                <MetricsGrid>
                  <MetricCard label="Total Premium" value={`₹${scan.summary.total_premium.toLocaleString()}`} color="text-green-500" />
                  <MetricCard label="Monthly Yield" value={`${scan.summary.monthly_yield_pct.toFixed(2)}%`} color="text-green-500" />
                  <MetricCard label="Annualized Yield" value={`${scan.summary.annualized_yield_pct.toFixed(1)}%`} color="text-green-500" />
                  <MetricCard label="Strategies Found" value={`${scan.summary.covered_call_count + scan.summary.csp_count + scan.summary.iron_condor_count}`} />
                </MetricsGrid>

                {/* Covered Calls */}
                <div className="content-panel p-4">
                  <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <Shield className="h-4 w-4 text-blue-500" />
                    Covered Calls
                    <Badge variant="outline">{scan.covered_calls.length}</Badge>
                  </h4>
                  <OverlayOrderTable orders={scan.covered_calls} type="CC" />
                </div>

                {/* Cash-Secured Puts */}
                <div className="content-panel p-4">
                  <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <TrendingDown className="h-4 w-4 text-purple-500" />
                    Cash-Secured Puts
                    <Badge variant="outline">{scan.cash_secured_puts.length}</Badge>
                  </h4>
                  <OverlayOrderTable orders={scan.cash_secured_puts} type="CSP" />
                </div>

                {/* Iron Condors */}
                <div className="content-panel p-4">
                  <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <Layers className="h-4 w-4 text-amber-500" />
                    Iron Condors
                    <Badge variant="outline">{scan.iron_condors.length}</Badge>
                  </h4>
                  <MultiLegTable orders={scan.iron_condors} />
                </div>

                {/* Log */}
                {scan.log.length > 0 && (
                  <div className="content-panel p-4">
                    <h4 className="text-sm font-semibold mb-2">Scan Log</h4>
                    <pre className="text-xs text-muted-foreground whitespace-pre-wrap">{scan.log.join("\n")}</pre>
                  </div>
                )}
              </>
            )}

            {!scan && !overlayScan.isPending && (
              <div className="content-panel p-8 text-center text-muted-foreground">
                <p className="text-sm">Click &quot;Scan Overlay Strategies&quot; to find covered calls on your holdings, cash-secured puts on the names the book wants, and iron condors on the indices, from listed contracts and live quotes. It reads only: nothing is placed.</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
