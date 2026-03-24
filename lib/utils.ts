import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { DecisionTag, TradingSignal } from "./types";

/** Tailwind className merge utility */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format number with commas and fixed decimals */
export function formatNumber(n: number, decimals = 2): string {
  if (n == null || isNaN(n)) return "—";
  return n.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/** Format currency */
export function formatCurrency(n: number, currency = "USD"): string {
  if (n == null || isNaN(n)) return "—";
  const locale = currency === "INR" ? "en-IN" : "en-US";
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(n);
}

/** Format percentage */
export function formatPct(n: number, decimals = 2): string {
  if (n == null || isNaN(n)) return "—";
  return `${n >= 0 ? "+" : ""}${n.toFixed(decimals)}%`;
}

/** Parse comma-separated tickers */
export function parseTickers(input: string): string[] {
  return input
    .split(",")
    .map((t) => t.trim().toUpperCase())
    .filter(Boolean);
}

/** Validate a ticker symbol */
export function isValidTicker(t: string): boolean {
  return /^[A-Z0-9.^-]{1,12}$/.test(t);
}

/** Parse CSV file into ticker array */
export async function parseTickerCSV(file: File): Promise<string[]> {
  const text = await file.text();
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const tickers: string[] = [];
  for (const line of lines) {
    for (const cell of line.split(",")) {
      const t = cell.trim().toUpperCase().replace(/["']/g, "");
      if (t && isValidTicker(t)) tickers.push(t);
    }
  }
  return [...new Set(tickers)];
}

/** Generate a sample CSV string */
export function createSampleCSV(): string {
  return "Ticker\nAAPL\nMSFT\nGOOGL\nAMZN\nMETA\nTSLA\nNVDA";
}

/** Download data as CSV */
export function downloadCSV(data: Record<string, unknown>[], filename: string) {
  if (!data.length) return;
  const keys = Object.keys(data[0]);
  const csv = [
    keys.join(","),
    ...data.map((row) => keys.map((k) => JSON.stringify(row[k] ?? "")).join(",")),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Download string as file */
export function downloadFile(content: string, filename: string, mime = "text/csv") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Get Z-Score health status */
export function getZScoreStatus(z: number): string {
  if (z >= 2.99) return "Safe";
  if (z >= 1.81) return "Grey Zone";
  return "Distress";
}

/** Get M-Score status */
export function getMScoreStatus(m: number): string {
  return m < -2.22 ? "Unlikely" : "Likely Manipulator";
}

/** Get F-Score status */
export function getFScoreStatus(f: number): string {
  if (f >= 8) return "Strong";
  if (f >= 5) return "Moderate";
  return "Weak";
}

/** Get top N buy/sell signals */
export function getTopSignals(signals: TradingSignal[], n = 5) {
  const topBuy = signals
    .filter((s) => s.decision === "STRONG_BUY" || s.decision === "BUY")
    .sort((a, b) => b.decision_score - a.decision_score)
    .slice(0, n);
  const topSell = signals
    .filter((s) => s.decision === "STRONG_SELL" || s.decision === "SELL")
    .sort((a, b) => a.decision_score - b.decision_score)
    .slice(0, n);
  return { topBuy, topSell };
}

/** Summarize decision counts */
export function decisionSummary(signals: TradingSignal[]) {
  const counts: Record<DecisionTag, number> = {
    STRONG_BUY: 0, BUY: 0, HOLD: 0, SELL: 0, STRONG_SELL: 0,
  };
  signals.forEach((s) => { counts[s.decision]++; });
  return {
    total: signals.length,
    strong_buy: counts.STRONG_BUY,
    buy: counts.BUY,
    hold: counts.HOLD,
    sell: counts.SELL,
    strong_sell: counts.STRONG_SELL,
  };
}

/** Random pick from array */
export function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Debounce function */
export function debounce<T extends (...args: unknown[]) => void>(fn: T, ms: number) {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}
