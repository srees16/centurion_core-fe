"use client";

import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api-client";
import { cn } from "@/lib/utils";

/** NSE's cash market now, from the backend's one NSE calendar (holidays, Budget and Muhurat sessions). */
interface NseSession {
  state: "open" | "pre_open" | "closed" | "weekend" | "holiday" | "muhurat";
  open: boolean;
  detail: string;
  date: string;
  time: string;
  next_open: string;
  note: string | null;
}

const LABEL: Record<NseSession["state"], string> = {
  open: "NSE open",
  pre_open: "NSE pre-open",
  closed: "NSE closed",
  weekend: "NSE closed",
  holiday: "NSE holiday",
  muhurat: "NSE Muhurat day",
};

/** Green while NSE's session is on (09:15-15:30 IST on a trading day); grey otherwise: before or after hours, the
 *  pre-open, weekends, holidays.  Shown in the header on every Ind stocks page; re-read every minute. */
export function NseSessionBadge() {
  const { data } = useQuery({
    queryKey: ["nse-session"],
    queryFn: () => api.get<NseSession>("/api/v1/market/nse-session"),
    refetchInterval: 60_000,
    staleTime: 30_000,
    retry: 1,
  });
  if (!data) return null;
  const title = `${LABEL[data.state]} (${data.time} IST): ${data.detail}${data.note ? `. ${data.note}` : ""}`;
  return (
    <span
      role="status"
      aria-label={title}
      title={title}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium whitespace-nowrap",
        data.open
          ? "border-green-500/40 bg-green-500/15 text-green-400"
          : "border-gray-500/40 bg-gray-500/15 text-gray-400",
      )}
    >
      <span className={cn("h-2 w-2 rounded-full", data.open ? "bg-green-500 animate-pulse" : "bg-gray-400")} />
      <span className="hidden sm:inline">{LABEL[data.state]}</span>
      <span className="sm:hidden">NSE</span>
    </span>
  );
}
