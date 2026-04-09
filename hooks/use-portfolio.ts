import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type {
  PortfolioBacktestRequest,
  PortfolioBacktestResponse,
  HarvestPresets,
} from "@/lib/types";

export function usePortfolio() {
  const presetsQuery = useQuery({
    queryKey: ["portfolio-presets"],
    queryFn: () => api.get<HarvestPresets>("/portfolio/presets"),
  });

  const backtestMutation = useMutation({
    mutationFn: (req: PortfolioBacktestRequest) =>
      api.post<PortfolioBacktestResponse>("/portfolio/backtest", req),
  });

  return {
    presets: presetsQuery.data?.presets ?? {},
    presetsLoading: presetsQuery.isLoading,
    run: backtestMutation.mutate,
    runAsync: backtestMutation.mutateAsync,
    isRunning: backtestMutation.isPending,
    result: backtestMutation.data ?? null,
    error: backtestMutation.error?.message ?? null,
  };
}
