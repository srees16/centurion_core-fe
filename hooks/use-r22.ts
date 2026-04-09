import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { R22BacktestRequest, R22BacktestResponse } from "@/lib/types";

interface BullAlertStatus {
  has_active_alert: boolean;
  message: string;
  last_check: string | null;
}

export function useR22() {
  // Poll for active bull-run alerts (every 60s)
  const alertQuery = useQuery({
    queryKey: ["r22-alerts"],
    queryFn: () => api.get<BullAlertStatus>("/r22/alerts"),
    refetchInterval: 60_000,
  });

  // Run R22 backtest
  const backtestMutation = useMutation({
    mutationFn: (req: R22BacktestRequest) =>
      api.post<R22BacktestResponse>("/r22/backtest", req),
  });

  return {
    alert: alertQuery.data,
    alertLoading: alertQuery.isLoading,
    runBacktest: backtestMutation.mutate,
    runBacktestAsync: backtestMutation.mutateAsync,
    isRunning: backtestMutation.isPending,
    result: backtestMutation.data,
    error: backtestMutation.error,
  };
}
