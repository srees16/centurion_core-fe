import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { BacktestCompareResponse } from "@/lib/types";

export function useBacktestCompare(ids: string[]) {
  const idStr = ids.join(",");
  return useQuery({
    queryKey: ["backtest-compare", idStr],
    queryFn: () =>
      api.get<BacktestCompareResponse>("/api/v1/backtest/compare", { ids: idStr }),
    enabled: ids.length > 0,
  });
}
