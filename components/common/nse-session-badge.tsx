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

/** The pill and its dot by state: green while the session is on, amber in the pre-open (orders taken, no trading
 *  yet), violet on a Muhurat day (an evening session), grey when closed (after hours, weekends, holidays). */
const STYLE: Record<NseSession["state"], { pill: string; dot: string }> = {
  open: { pill: "border-green-500/40 bg-green-500/15 text-green-400", dot: "bg-green-500 animate-pulse" },
  pre_open: { pill: "border-amber-500/40 bg-amber-500/15 text-amber-400", dot: "bg-amber-400" },
  muhurat: { pill: "border-violet-500/40 bg-violet-500/15 text-violet-300", dot: "bg-violet-400" },
  closed: { pill: "border-gray-500/40 bg-gray-500/15 text-gray-400", dot: "bg-gray-400" },
  weekend: { pill: "border-gray-500/40 bg-gray-500/15 text-gray-400", dot: "bg-gray-400" },
  holiday: { pill: "border-gray-500/40 bg-gray-500/15 text-gray-400", dot: "bg-gray-400" },
};

/** NSE's session in the header on every Ind stocks page (``STYLE`` for the colours); re-read every minute. */
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
        STYLE[data.state].pill,
      )}
    >
      <span className={cn("h-2 w-2 rounded-full", STYLE[data.state].dot)} />
      <span className="hidden sm:inline">{LABEL[data.state]}</span>
      <span className="sm:hidden">NSE</span>
    </span>
  );
}
