"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/common/spinner";
import { LiveQuotesTable } from "@/components/tables/live-quotes-table";
import { useKiteQuotes } from "@/hooks/use-kite";
import { DEFAULT_IND_TICKERS } from "@/lib/constants";

const STORAGE_KEY = "flykite.watchlist";
const MAX_SYMBOLS = 50;
// NSE trading symbols: letters, digits, "&" and "-" (e.g. M&M, BAJAJ-AUTO)
const SYMBOL = /^[A-Z0-9&-]{1,20}$/;

function loadWatchlist(): string[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const list = raw ? (JSON.parse(raw) as unknown) : null;
    if (Array.isArray(list) && list.every((s) => typeof s === "string" && SYMBOL.test(s))) return list;
  } catch {
    /* storage blocked or unreadable: start from the defaults */
  }
  return [...DEFAULT_IND_TICKERS];
}

function saveWatchlist(list: string[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    /* a private window: the list lasts for this visit only */
  }
}

/** Live quotes for any NSE symbols you add: Kite quotes whatever is asked, and a symbol it does not know is
 *  reported and dropped.  The list is kept in this browser. */
export function QuoteWatchlist() {
  const [symbols, setSymbols] = useState<string[]>(() => [...DEFAULT_IND_TICKERS]);
  const [entry, setEntry] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const [pending, setPending] = useState<string[]>([]);       // added, not yet seen in a quote
  const quotesQ = useKiteQuotes(symbols);

  useEffect(() => setSymbols(loadWatchlist()), []);

  // a symbol Kite returned no quote for is not on NSE (or not in its EQ series): say so and drop it
  const quoted = useMemo(() => new Set((quotesQ.data ?? []).map((q) => q.symbol)), [quotesQ.data]);
  useEffect(() => {
    if (!quotesQ.data || quotesQ.isFetching || pending.length === 0) return;
    const missing = pending.filter((s) => !quoted.has(s));
    setPending([]);
    if (missing.length) {
      setNote(`Not found on NSE: ${missing.join(", ")}`);
      setSymbols((cur) => {
        const next = cur.filter((s) => !missing.includes(s));
        saveWatchlist(next);
        return next;
      });
    }
  }, [quotesQ.data, quotesQ.isFetching, pending, quoted]);

  const add = () => {
    const asked = entry.toUpperCase().split(/[\s,]+/).filter(Boolean);
    const bad = asked.filter((s) => !SYMBOL.test(s));
    const fresh = asked.filter((s) => SYMBOL.test(s) && !symbols.includes(s));
    if (symbols.length + fresh.length > MAX_SYMBOLS) {
      setNote(`At most ${MAX_SYMBOLS} symbols: remove some first.`);
      return;
    }
    setNote(bad.length ? `Not a symbol: ${bad.join(", ")}` : null);
    if (fresh.length) {
      const next = [...symbols, ...fresh];
      setSymbols(next);
      saveWatchlist(next);
      setPending(fresh);
    }
    setEntry("");
  };

  const remove = (sym: string) => {
    const next = symbols.filter((s) => s !== sym);
    setSymbols(next);
    saveWatchlist(next);
  };

  return (
    <div className="content-panel p-4 space-y-3">
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
      >
        <Input
          className="h-8 text-xs"
          placeholder="Add NSE symbols, e.g. RELIANCE, M&M"
          value={entry}
          onChange={(e) => setEntry(e.target.value)}
          aria-label="Add NSE symbols"
        />
        <Button type="submit" size="sm" className="h-8" disabled={!entry.trim()}>
          <Plus className="mr-1 h-3.5 w-3.5" /> Add
        </Button>
      </form>
      {note && <p className="text-xs text-amber-600">{note}</p>}
      <div className="flex flex-wrap gap-1.5">
        {symbols.map((s) => (
          <span key={s} className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs">
            {s}
            <button type="button" onClick={() => remove(s)} aria-label={`Remove ${s}`} className="hover:text-destructive">
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        {symbols.length === 0 && <span className="text-xs text-muted-foreground">No symbols: add some above.</span>}
      </div>
      {symbols.length > 0 &&
        (quotesQ.isLoading ? (
          <Spinner />
        ) : quotesQ.error ? (
          <p className="text-sm text-destructive">{quotesQ.error.message}</p>
        ) : quotesQ.data ? (
          <LiveQuotesTable quotes={quotesQ.data} />
        ) : null)}
    </div>
  );
}
