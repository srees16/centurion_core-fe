"use client";

import { LiveQuotesTable } from "@/components/tables/live-quotes-table";
import { QuickTradePanel } from "@/components/kite/quick-trade-panel";
import { MetricsGrid, MetricCard } from "@/components/common/metrics-cards";
import { RibbonVixBar } from "@/components/common/ribbon-vix-bar";
import { Spinner } from "@/components/common/spinner";
import {
  useKiteSessionStatus,
  useKiteSessionStart,
  useKiteSessionStop,
  useKiteSessionComplete,
  useKiteQuotes,
  useKiteHoldings,
  useKitePositions,
  useKiteOrders,
  useCarverStatus,
} from "@/hooks/use-kite";
import { DEFAULT_IND_TICKERS, NIFTY_50_TICKERS, NSE_HOLIDAYS } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import {
  Play, Square, RefreshCw, TrendingUp, Briefcase, BarChart3, ClipboardList,
  AlertCircle, Zap, Shield, LineChart, ExternalLink, KeyRound, Settings2,
} from "lucide-react";

function KiteLanding({
  onStart,
  isStarting,
  error,
  loginUrl,
  onSubmitToken,
  isSubmittingToken,
}: {
  onStart: () => void;
  isStarting: boolean;
  error: string | null;
  loginUrl: string | null;
  onSubmitToken: (token: string) => void;
  isSubmittingToken: boolean;
}) {
  const [requestToken, setRequestToken] = useState("");

  return (
    <div className="space-y-6">
      <RibbonVixBar symbols={NIFTY_50_TICKERS} market="IND" />
      <div className="content-panel p-6 max-w-2xl mx-auto space-y-5">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <TrendingUp className="h-6 w-6 text-blue-500" />
            <h2 className="text-xl font-bold">Indian Equities — Live Dashboard</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Zerodha Kite Connect — Real-time market data & order management
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="flex items-start gap-2 p-3 rounded-lg bg-secondary/50">
            <Zap className="h-4 w-4 mt-0.5 text-amber-500 shrink-0" />
            <div>
              <p className="text-sm font-medium">Real-time Quotes</p>
              <p className="text-xs text-muted-foreground">NIFTY 50, Bank Nifty, IT & Energy indices streamed live</p>
            </div>
          </div>
          <div className="flex items-start gap-2 p-3 rounded-lg bg-secondary/50">
            <Shield className="h-4 w-4 mt-0.5 text-green-500 shrink-0" />
            <div>
              <p className="text-sm font-medium">Market Status</p>
              <p className="text-xs text-muted-foreground">Pre-open, live & post-market sessions auto-detected</p>
            </div>
          </div>
          <div className="flex items-start gap-2 p-3 rounded-lg bg-secondary/50">
            <LineChart className="h-4 w-4 mt-0.5 text-purple-500 shrink-0" />
            <div>
              <p className="text-sm font-medium">Order Management</p>
              <p className="text-xs text-muted-foreground">Place, modify & cancel orders directly from dashboard</p>
            </div>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 rounded-md p-3">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Manual login flow — shown when auto-login fails */}
        {loginUrl ? (
          <div className="space-y-4 border rounded-lg p-4 bg-secondary/30">
            <div className="flex items-center gap-2 text-sm font-medium text-amber-600 dark:text-amber-400">
              <KeyRound className="h-4 w-4" />
              Token expired — complete Kite login manually
            </div>

            <div className="space-y-2 text-sm text-muted-foreground">
              <p>1. Click below to open the Kite login page</p>
              <p>2. Enter your Zerodha credentials and TOTP</p>
              <p>3. Copy the <code className="text-xs bg-secondary px-1 py-0.5 rounded">request_token</code> from the redirect URL and paste it below</p>
            </div>

            <a
              href={loginUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            >
              <ExternalLink className="h-4 w-4" />
              Open Kite Login
            </a>

            <div className="flex gap-2">
              <input
                type="text"
                value={requestToken}
                onChange={(e) => setRequestToken(e.target.value)}
                placeholder="Paste request_token here…"
                className="flex-1 px-3 py-2 text-sm rounded-md border bg-background focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Button
                onClick={() => onSubmitToken(requestToken.trim())}
                disabled={!requestToken.trim() || isSubmittingToken}
              >
                {isSubmittingToken ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  "Connect"
                )}
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex justify-center">
              <Button size="lg" onClick={onStart} disabled={isStarting} className="min-w-[200px]">
                {isStarting ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Connecting to Kite…
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Start Kite Session
                  </>
                )}
              </Button>
            </div>

            {isStarting && (
              <p className="text-xs text-center text-muted-foreground">
                Initiating Zerodha login. If a browser window opens, complete authentication via TOTP/2FA.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function KiteDashboard({ onDisconnect }: { onDisconnect: () => void }) {
  const [tab, setTab] = useState("quotes");
  const quotesQ = useKiteQuotes(DEFAULT_IND_TICKERS);
  const holdingsQ = useKiteHoldings();
  const positionsQ = useKitePositions();
  const ordersQ = useKiteOrders();
  const stopSession = useKiteSessionStop();
  const carverQ = useCarverStatus();

  const holdingsPnl = holdingsQ.data?.reduce((a, h) => a + h.pnl, 0) ?? 0;
  const positionsPnl = positionsQ.data?.reduce((a, p) => a + p.pnl, 0) ?? 0;

  // NSE market hours: Mon–Fri, 9:15 AM – 3:30 PM IST (excl. holidays)
  const now = new Date();
  const ist = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  const day = ist.getDay();
  const mins = ist.getHours() * 60 + ist.getMinutes();
  const istDate = `${ist.getFullYear()}-${String(ist.getMonth() + 1).padStart(2, "0")}-${String(ist.getDate()).padStart(2, "0")}`;
  const isMarketOpen = day >= 1 && day <= 5 && mins >= 555 && mins <= 930 && !NSE_HOLIDAYS.has(istDate);

  const handleDisconnect = () => {
    stopSession.mutate(undefined, { onSuccess: onDisconnect });
  };

  return (
    <div className="space-y-4">
      <RibbonVixBar symbols={NIFTY_50_TICKERS} market="IND" />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="default" className={isMarketOpen ? "bg-green-600 text-white" : "bg-zinc-600 text-white"}>
            <span className={`mr-1.5 inline-block h-2 w-2 rounded-full ${isMarketOpen ? "bg-green-300 animate-pulse" : "bg-zinc-400"}`} />
            {isMarketOpen ? "Live" : "Closed"}
          </Badge>
        </div>
        <Button variant="outline" size="sm" onClick={handleDisconnect} disabled={stopSession.isPending}>
          <Square className="mr-1.5 h-3.5 w-3.5" />
          Disconnect
        </Button>
      </div>

      <MetricsGrid>
        <MetricCard
          label="Holdings P&L"
          value={formatCurrency(holdingsPnl, "INR")}
          color={holdingsPnl >= 0 ? "text-green-500" : "text-red-500"}
        />
        <MetricCard
          label="Positions P&L"
          value={formatCurrency(positionsPnl, "INR")}
          color={positionsPnl >= 0 ? "text-green-500" : "text-red-500"}
        />
        <MetricCard
          label="Open Orders"
          value={ordersQ.data?.filter((o) => o.status === "OPEN").length ?? 0}
        />
      </MetricsGrid>

      {/* Carver Pipeline Status */}
      {carverQ.data && (
        <div className="rounded-lg border bg-secondary/30 p-4">
          <div className="flex items-center gap-2 mb-3">
            <Settings2 className="h-4 w-4 text-blue-500" />
            <h3 className="text-sm font-bold">Carver Pipeline</h3>
            <Badge variant={carverQ.data.carver_enabled ? "default" : "secondary"} className={carverQ.data.carver_enabled ? "bg-green-600 text-white" : ""}>
              {carverQ.data.carver_enabled ? "Active" : "Disabled"}
            </Badge>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3 text-xs">
            <div><span className="text-muted-foreground">Vol Target</span><p className="font-semibold">{(carverQ.data.vol_target * 100).toFixed(0)}%</p></div>
            <div><span className="text-muted-foreground">IDM</span><p className="font-semibold">{carverQ.data.idm}×</p></div>
            <div><span className="text-muted-foreground">Max Leverage</span><p className="font-semibold">{carverQ.data.max_leverage}×</p></div>
            <div><span className="text-muted-foreground">Forecasts</span><p className="font-semibold">{carverQ.data.forecast_sources}</p></div>
            <div><span className="text-muted-foreground">Max Positions</span><p className="font-semibold">{carverQ.data.max_open_trades}</p></div>
            <div><span className="text-muted-foreground">Capital</span><p className="font-semibold">{formatCurrency(carverQ.data.initial_capital, "INR")}</p></div>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {carverQ.data.options_enabled && <Badge variant="outline" className="text-[0.65rem]">Options ON</Badge>}
            {carverQ.data.rl_enabled && <Badge variant="outline" className="text-[0.65rem]">RL ON</Badge>}
            <Badge variant="outline" className="text-[0.65rem]">ML Gate ≥ {(carverQ.data.meta_label_min_prob * 100).toFixed(0)}%</Badge>
            <Badge variant="outline" className="text-[0.65rem]">DD Gates {carverQ.data.dd_warning_pct}% / {carverQ.data.dd_critical_pct}% / {carverQ.data.dd_halt_pct}%</Badge>
          </div>
        </div>
      )}

      <QuickTradePanel symbols={DEFAULT_IND_TICKERS} />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="quotes">
            <BarChart3 className="mr-1.5 h-3.5 w-3.5" /> Live Quotes
          </TabsTrigger>
          <TabsTrigger value="holdings">
            <Briefcase className="mr-1.5 h-3.5 w-3.5" /> Holdings
          </TabsTrigger>
          <TabsTrigger value="positions">
            <TrendingUp className="mr-1.5 h-3.5 w-3.5" /> Positions
          </TabsTrigger>
          <TabsTrigger value="orders">
            <ClipboardList className="mr-1.5 h-3.5 w-3.5" /> Orders
          </TabsTrigger>
        </TabsList>

        <TabsContent value="quotes" className="mt-4">
          {quotesQ.isLoading ? (
            <Spinner />
          ) : quotesQ.error ? (
            <p className="text-sm text-destructive p-4">{quotesQ.error.message}</p>
          ) : quotesQ.data ? (
            <div className="content-panel p-4">
              <LiveQuotesTable quotes={quotesQ.data} />
            </div>
          ) : null}
        </TabsContent>

        <TabsContent value="holdings" className="mt-4">
          {holdingsQ.isLoading ? (
            <Spinner />
          ) : (
            <div className="content-panel p-4 overflow-x-auto">
              {holdingsQ.data && holdingsQ.data.length > 0 ? (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground text-left">
                      <th className="py-2 pr-3">Symbol</th>
                      <th className="py-2 pr-3">Qty</th>
                      <th className="py-2 pr-3">Avg Price</th>
                      <th className="py-2 pr-3">LTP</th>
                      <th className="py-2 pr-3">P&L</th>
                      <th className="py-2">Day Chg%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {holdingsQ.data.map((h) => (
                      <tr key={h.tradingsymbol} className="border-b">
                        <td className="py-2 pr-3 font-mono">{h.tradingsymbol}</td>
                        <td className="py-2 pr-3">{h.quantity}</td>
                        <td className="py-2 pr-3">{formatCurrency(h.average_price, "INR")}</td>
                        <td className="py-2 pr-3">{formatCurrency(h.last_price, "INR")}</td>
                        <td className={`py-2 pr-3 ${h.pnl >= 0 ? "pnl-positive" : "pnl-negative"}`}>
                          {formatCurrency(h.pnl, "INR")}
                        </td>
                        <td className={`py-2 ${(h.day_change_pct ?? 0) >= 0 ? "pnl-positive" : "pnl-negative"}`}>
                          {(h.day_change_pct ?? 0).toFixed(2)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-sm text-muted-foreground py-4 text-center">No holdings found</p>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="positions" className="mt-4">
          {positionsQ.isLoading ? (
            <Spinner />
          ) : (
            <div className="content-panel p-4 overflow-x-auto">
              {positionsQ.data && positionsQ.data.length > 0 ? (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground text-left">
                      <th className="py-2 pr-3">Symbol</th>
                      <th className="py-2 pr-3">Qty</th>
                      <th className="py-2 pr-3">Avg</th>
                      <th className="py-2 pr-3">LTP</th>
                      <th className="py-2 pr-3">P&L</th>
                      <th className="py-2">Product</th>
                    </tr>
                  </thead>
                  <tbody>
                    {positionsQ.data.map((p) => (
                      <tr key={p.tradingsymbol} className="border-b">
                        <td className="py-2 pr-3 font-mono">{p.tradingsymbol}</td>
                        <td className="py-2 pr-3">{p.quantity}</td>
                        <td className="py-2 pr-3">{formatCurrency(p.average_price, "INR")}</td>
                        <td className="py-2 pr-3">{formatCurrency(p.last_price, "INR")}</td>
                        <td className={`py-2 pr-3 ${p.pnl >= 0 ? "pnl-positive" : "pnl-negative"}`}>
                          {formatCurrency(p.pnl, "INR")}
                        </td>
                        <td className="py-2">{p.product}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-sm text-muted-foreground py-4 text-center">No open positions</p>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="orders" className="mt-4">
          {ordersQ.isLoading ? (
            <Spinner />
          ) : (
            <div className="content-panel p-4 overflow-x-auto">
              {ordersQ.data && ordersQ.data.length > 0 ? (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground text-left">
                      <th className="py-2 pr-3">Order ID</th>
                      <th className="py-2 pr-3">Symbol</th>
                      <th className="py-2 pr-3">Type</th>
                      <th className="py-2 pr-3">Side</th>
                      <th className="py-2 pr-3">Qty</th>
                      <th className="py-2 pr-3">Price</th>
                      <th className="py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ordersQ.data.map((o) => (
                      <tr key={o.order_id} className="border-b">
                        <td className="py-2 pr-3 font-mono text-xs">{o.order_id}</td>
                        <td className="py-2 pr-3 font-mono">{o.tradingsymbol}</td>
                        <td className="py-2 pr-3">{o.order_type}</td>
                        <td className="py-2 pr-3">{o.transaction_type}</td>
                        <td className="py-2 pr-3">{o.quantity}</td>
                        <td className="py-2 pr-3">{formatCurrency(o.price, "INR")}</td>
                        <td className="py-2">{o.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-sm text-muted-foreground py-4 text-center">No orders today</p>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function FlyKitePage() {
  const sessionQ = useKiteSessionStatus();
  const startSession = useKiteSessionStart();
  const completeSession = useKiteSessionComplete();
  const [startError, setStartError] = useState<string | null>(null);
  const [loginUrl, setLoginUrl] = useState<string | null>(null);

  const isActive = sessionQ.data?.active === true;
  const isChecking = sessionQ.isLoading;

  const handleStart = () => {
    setStartError(null);
    setLoginUrl(null);
    startSession.mutate(undefined, {
      onSuccess: (data) => {
        if (!data.success && data.needs_login && data.login_url) {
          setLoginUrl(data.login_url);
          setStartError(data.message ?? "Token expired. Please log in manually.");
        }
      },
      onError: (err) => setStartError(err.message),
    });
  };

  const handleSubmitToken = (token: string) => {
    setStartError(null);
    completeSession.mutate(token, {
      onSuccess: () => {
        setLoginUrl(null);
        sessionQ.refetch();
      },
      onError: (err) => setStartError(err.message),
    });
  };

  if (isChecking) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner />
      </div>
    );
  }

  if (!isActive) {
    return (
      <KiteLanding
        onStart={handleStart}
        isStarting={startSession.isPending}
        error={startError}
        loginUrl={loginUrl}
        onSubmitToken={handleSubmitToken}
        isSubmittingToken={completeSession.isPending}
      />
    );
  }

  return <KiteDashboard onDisconnect={() => sessionQ.refetch()} />;
}
