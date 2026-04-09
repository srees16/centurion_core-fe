"use client";

import type { HarvestSummary } from "@/lib/types";
import { formatNumber } from "@/lib/utils";
import { ArrowDownCircle, ArrowUpCircle } from "lucide-react";

interface HarvestTimelineProps {
  summary: HarvestSummary;
}

export function HarvestTimeline({ summary }: HarvestTimelineProps) {
  const events = [
    ...summary.inject_events.map((e) => ({ ...e, event_type: "inject" as const })),
    ...summary.book_events.map((e) => ({ ...e, event_type: "book" as const })),
  ].sort((a, b) => a.day - b.day);

  if (events.length === 0)
    return <p className="text-sm text-muted-foreground">No harvest events</p>;

  return (
    <div className="content-panel p-4 space-y-3">
      <h3 className="text-sm font-semibold">Harvest Events</h3>
      <div className="flex gap-4 text-xs text-muted-foreground mb-2">
        <span>Injected: ₹{formatNumber(summary.total_injected)}</span>
        <span>Booked: ₹{formatNumber(summary.total_booked)}</span>
        <span className="font-semibold text-foreground">Net: ₹{formatNumber(summary.net_extracted)}</span>
      </div>
      <div className="max-h-64 overflow-y-auto space-y-1">
        {events.map((ev, i) => (
          <div
            key={i}
            className="flex items-center gap-2 text-xs py-1 px-2 rounded hover:bg-muted/50"
          >
            {ev.event_type === "inject" ? (
              <ArrowDownCircle className="h-4 w-4 text-blue-500 shrink-0" />
            ) : (
              <ArrowUpCircle className="h-4 w-4 text-green-500 shrink-0" />
            )}
            <span className="w-16 font-mono">Day {ev.day}</span>
            <span className={ev.event_type === "inject" ? "text-blue-600" : "text-green-600"}>
              {ev.event_type === "inject" ? "Inject" : "Book"} ₹{formatNumber(ev.amount)}
            </span>
            <span className="ml-auto text-muted-foreground">
              ₹{formatNumber(ev.equity_before)} → ₹{formatNumber(ev.equity_after)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
