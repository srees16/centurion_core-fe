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
  PaperSessionsResponse,
  PaperBooksResponse,
  MetricsJournalResponse,
} from "@/lib/types";

/** Query params for a paper book other than the deployed one (G12). */
const bookParams = (book?: string) => (book && book !== "deployed" ? { book } : undefined);

export function usePaperBooks() {
  return useQuery({
    queryKey: ["paper-books"],
    queryFn: () => api.get<PaperBooksResponse>("/api/v1/screener/monitor/books"),
    staleTime: 10 * 60_000,
  });
}

export function useTradeMonitorSummary() {
  return useQuery({
    queryKey: ["trade-monitor-summary"],
    queryFn: () => api.get<TradeMonitorSummary>("/api/v1/screener/monitor"),
    refetchInterval: 30_000, // refresh every 30s during market hours
  });
}

export function useTradeMonitorTrades(book?: string) {
  return useQuery({
    queryKey: ["trade-monitor-trades", book],
    queryFn: () => api.get<TradeMonitorDetail>("/api/v1/screener/monitor/trades", bookParams(book)),
    refetchInterval: 30_000,
  });
}

export function usePaperDashboard(book?: string) {
  return useQuery({
    queryKey: ["paper-dashboard", book],
    queryFn: () => api.get<PaperDashboard>("/api/v1/screener/monitor/paper-dashboard", bookParams(book)),
    refetchInterval: 60_000,
  });
}

export function useDailySnapshots(book?: string) {
  return useQuery({
    queryKey: ["daily-snapshots", book],
    queryFn: () => api.get<DailySnapshotsResponse>("/api/v1/screener/monitor/daily-snapshots", bookParams(book)),
    refetchInterval: 120_000,
  });
}

export function useSignalLog(book?: string) {
  return useQuery({
    queryKey: ["signal-log", book],
    queryFn: () => api.get<SignalLogResponse>("/api/v1/screener/monitor/signal-log", bookParams(book)),
    refetchInterval: 120_000,
  });
}

export function useWeeklyCheckpoints(book?: string) {
  return useQuery({
    queryKey: ["weekly-checkpoints", book],
    queryFn: () => api.get<WeeklyCheckpointsResponse>("/api/v1/screener/monitor/weekly-checkpoints", bookParams(book)),
    refetchInterval: 120_000,
  });
}

/** JR1: research evidence (changes at re-baselines) and weekly paper points for a book. */
export function useMetricsJournal(book?: string) {
  return useQuery({
    queryKey: ["metrics-journal", book],
    queryFn: () => api.get<MetricsJournalResponse>("/api/v1/screener/monitor/journal", bookParams(book)),
    staleTime: 10 * 60_000,
  });
}

export function usePaperSessions(book?: string) {
  return useQuery({
    queryKey: ["paper-sessions", book],
    queryFn: () => api.get<PaperSessionsResponse>("/api/v1/screener/monitor/sessions", bookParams(book)),
    refetchInterval: 120_000,
  });
}

export function useDailyDetail(date: string | null, book?: string) {
  return useQuery({
    queryKey: ["daily-detail", date, book],
    queryFn: () => api.get<DailyDetailResponse>(`/api/v1/screener/monitor/daily-detail/${date}`, bookParams(book)),
    enabled: !!date,
    refetchInterval: 120_000,
  });
}
