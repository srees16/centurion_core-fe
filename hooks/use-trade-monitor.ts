import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type {
  TradeMonitorDetail,
  TradeMonitorSummary,
  PaperDashboard,
  DailySnapshotsResponse,
  SignalLogResponse,
  WeeklyCheckpointsResponse,
  DailyDetailResponse,
} from "@/lib/types";

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

export function usePaperDashboard() {
  return useQuery({
    queryKey: ["paper-dashboard"],
    queryFn: () => api.get<PaperDashboard>("/api/v1/screener/monitor/paper-dashboard"),
    refetchInterval: 60_000,
  });
}

export function useDailySnapshots() {
  return useQuery({
    queryKey: ["daily-snapshots"],
    queryFn: () => api.get<DailySnapshotsResponse>("/api/v1/screener/monitor/daily-snapshots"),
    refetchInterval: 120_000,
  });
}

export function useSignalLog() {
  return useQuery({
    queryKey: ["signal-log"],
    queryFn: () => api.get<SignalLogResponse>("/api/v1/screener/monitor/signal-log"),
    refetchInterval: 120_000,
  });
}

export function useWeeklyCheckpoints() {
  return useQuery({
    queryKey: ["weekly-checkpoints"],
    queryFn: () => api.get<WeeklyCheckpointsResponse>("/api/v1/screener/monitor/weekly-checkpoints"),
    refetchInterval: 120_000,
  });
}

export function useDailyDetail(date: string | null) {
  return useQuery({
    queryKey: ["daily-detail", date],
    queryFn: () => api.get<DailyDetailResponse>(`/api/v1/screener/monitor/daily-detail/${date}`),
    enabled: !!date,
    refetchInterval: 120_000,
  });
}
