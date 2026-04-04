import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { TradeMonitorDetail, TradeMonitorSummary } from "@/lib/types";

export function useTradeMonitorSummary() {
  return useQuery({
    queryKey: ["trade-monitor-summary"],
    queryFn: () => api.get<TradeMonitorSummary>("/api/v1/screener/monitor"),
    refetchInterval: 30_000, // refresh every 30s during market hours
  });
}

export function useTradeMonitorTrades() {
  return useQuery({
    queryKey: ["trade-monitor-trades"],
    queryFn: () => api.get<TradeMonitorDetail>("/api/v1/screener/monitor/trades"),
    refetchInterval: 30_000,
  });
}
