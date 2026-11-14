import Link from "next/link";
import { Info } from "lucide-react";

/**
 * Shown on the pages that run the older multi-layer scorer (Verdict, Screener) instead of the NSE engine that
 * trades the paper and live books (tracker PG1, 14 Nov 2026).  ``orders``: the page can also send orders.
 */
export function LegacyNotice({ orders = false }: { orders?: boolean }) {
  return (
    <div role="note" className="flex items-start gap-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3">
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
      <p className="text-xs leading-relaxed text-muted-foreground">
        <span className="font-semibold text-foreground">Research tool, not the trading engine. </span>
        These scores come from an older multi-layer model. Centurion&apos;s deployed NSE engine does not use it,
        and it has not been through the validation protocol (walk-forward, deflated Sharpe, paper trading).
        {orders
          ? " Orders sent from this page are your own decision: they are not the engine's, and its books do not track them. "
          : " "}
        What the engine holds and trades is in the{" "}
        <Link href="/ind-stocks/trade-center" className="font-medium text-primary underline-offset-2 hover:underline">
          Trade Center
        </Link>
        .
      </p>
    </div>
  );
}
