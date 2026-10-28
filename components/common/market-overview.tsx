"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity, ArrowRight, Briefcase, ClipboardList, Compass, FileText, Filter, FlaskConical, History, Layers,
  PieChart, Scale, type LucideIcon,
} from "lucide-react";

import { useAuthStore } from "@/hooks/use-auth";
import { IND_SUB_PAGES, US_SUB_PAGES, type SubPage } from "@/lib/constants";

type Market = "IND" | "US";

interface Fact {
  label: string;
  value: string;
  hint: string;
}

interface Tool {
  key: string;
  icon: LucideIcon;
  text: string;
}

const CONTENT: Record<Market, { title: string; tagline: string; facts: Fact[]; tools: Tool[]; pages: SubPage[] }> = {
  IND: {
    title: "Indian equities",
    tagline: "Signals, screens, backtests and paper trading for NSE stocks, with an optional Zerodha (Kite) connection.",
    facts: [
      { label: "Exchange", value: "NSE", hint: "Cash equities and F&O" },
      { label: "Session", value: "09:15–15:30 IST", hint: "Monday to Friday" },
      { label: "Style", value: "Swing & positional", hint: "No intraday trades" },
      { label: "Execution", value: "Zerodha Kite", hint: "Whole shares, paper or live" },
    ],
    tools: [
      { key: "fly-kite", icon: Activity, text: "Live dashboard of positions and the Carver pipeline" },
      { key: "screener", icon: Filter, text: "Screen NSE stocks with your own filters and risk limits" },
      { key: "backtest", icon: FlaskConical, text: "Test a strategy on NSE history" },
      { key: "trade-center", icon: ClipboardList, text: "Paper trading: signals, orders and trades" },
      { key: "options", icon: Layers, text: "Covered calls, cash-secured puts, condors and strangles on F&O stocks" },
      { key: "portfolio", icon: PieChart, text: "Allocate capital across your picks" },
    ],
    pages: IND_SUB_PAGES,
  },
  US: {
    title: "US equities",
    tagline: "Signals, fundamentals and backtests for US stocks. Centurion advises; you place every order.",
    facts: [
      { label: "Exchanges", value: "NYSE · Nasdaq", hint: "Listed US stocks and ETFs" },
      { label: "Session", value: "09:30–16:00 ET", hint: "Monday to Friday" },
      { label: "Style", value: "Advisory", hint: "No automated orders" },
      { label: "Shares", value: "Fractional", hint: "Options not offered" },
    ],
    tools: [
      { key: "advisory", icon: Compass, text: "Suggested orders and stops for each session" },
      { key: "fundamentals", icon: FileText, text: "Fundamental analysis of any US ticker" },
      { key: "verdict", icon: Scale, text: "A weighted verdict for each stock" },
      { key: "backtest", icon: FlaskConical, text: "Test a strategy on US history" },
      { key: "holdings", icon: Briefcase, text: "Your open positions" },
      { key: "history", icon: History, text: "Past signals and backtest runs" },
    ],
    pages: US_SUB_PAGES,
  },
};

const STEPS = ["Choose your tickers", "Run the analysis", "Read the signals, Strong Buy to Strong Sell"];

/** Today's US session (09:30–16:00 New York) in IST: 19:00–01:30 in US summer time, 20:00–02:30 otherwise. */
function usSessionInIst(now: Date): string {
  const at = (zone: string) => new Date(now.toLocaleString("en-US", { timeZone: zone })).getTime();
  const nyOffsetMin = Math.round((at("America/New_York") - at("UTC")) / 60000);
  const ist = (h: number, m: number) => {
    const mins = (((h * 60 + m - nyOffsetMin + 330) % 1440) + 1440) % 1440;
    return `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;
  };
  return `${ist(9, 30)}–${ist(16, 0)} IST`;
}

/** What a market's page offers, shown until the first analysis runs: purpose, key facts, how to start and
 *  the main tools.  Links come from the sidebar's own list, so routes and access rules stay in one place. */
export function MarketOverview({ market }: { market: Market }) {
  const content = CONTENT[market];
  const isUser = useAuthStore((s) => s.user?.role === "user");
  const [usIst, setUsIst] = useState("");                  // after mount: the build's date may sit across a DST change

  useEffect(() => {
    if (market === "US") setUsIst(usSessionInIst(new Date()));
  }, [market]);

  const tools = content.tools
    .map((tool) => ({ tool, page: content.pages.find((p) => p.key === tool.key) }))
    .filter((t): t is { tool: Tool; page: SubPage } => Boolean(t.page) && !(isUser && t.page?.operatorOnly));

  return (
    <div className="content-panel p-5 space-y-5">
      <div>
        <h2 className="text-lg font-semibold">{content.title}</h2>
        <p className="text-sm text-muted-foreground mt-1">{content.tagline}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {content.facts.map((f) => (
          <div key={f.label} className="metric-card">
            <p className="metric-label">{f.label}</p>
            <p className="text-sm font-semibold mt-1">{f.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {market === "US" && f.label === "Session" && usIst ? usIst : f.hint}
            </p>
          </div>
        ))}
      </div>

      <ol className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm">
        {STEPS.map((step, i) => (
          <li key={step} className="flex items-center gap-2">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
              {i + 1}
            </span>
            <span className="text-muted-foreground">{step}</span>
          </li>
        ))}
      </ol>

      <div className="space-y-2">
        <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Tools</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {tools.map(({ tool, page }) => (
            <Link key={tool.key} href={page.href}
                  className="group flex items-start gap-3 rounded-lg border p-3 transition-colors hover:border-primary/50 hover:bg-primary/5">
              <tool.icon className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1 text-sm font-medium">
                  {page.label}
                  <ArrowRight className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
                </span>
                <span className="block text-xs text-muted-foreground">{tool.text}</span>
              </span>
            </Link>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">Every tool is also in the sidebar.</p>
      </div>

      <p className="text-xs text-muted-foreground border-t pt-3">
        For research and education, not investment advice. Markets carry risk, and past performance does not
        guarantee future results.
      </p>
    </div>
  );
}
