import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { MacroSnapshot, FearGreedIndex, TickerPrice, PortfolioRiskSnapshot } from "@/lib/types";

interface TickerPricesResponse {
  is_market_open: boolean;
  prices: TickerPrice[];
}

export function useMacroSnapshot(market: string) {
  return useQuery({
    queryKey: ["macro-snapshot", market],
    queryFn: () => api.get<MacroSnapshot>("/api/v1/macro/snapshot", { market }),
    staleTime: 5 * 60 * 1000, // 5 min
    retry: 1,
  });
}

export function useFearGreed() {
  return useQuery({
    queryKey: ["fear-greed"],
    queryFn: () => api.get<FearGreedIndex>("/api/v1/macro/fear-greed"),
    staleTime: 10 * 60 * 1000, // 10 min
    retry: 1,
  });
}

export function useTickerPrices(symbols: string[], market: string) {
  const query = useQuery({
    queryKey: ["ticker-prices", market, symbols],
    queryFn: () =>
      api.get<TickerPricesResponse>("/api/v1/market/ticker-prices", {
        symbols: symbols.join(","),
        market,
      }),
    enabled: symbols.length > 0,
    refetchInterval: (query) => {
      const isOpen = query.state.data?.is_market_open;
      return isOpen ? 10_000 : 60_000; // 10s live, 60s after hours
    },
    staleTime: 8_000,
    placeholderData: keepPreviousData,
    retry: 1,
  });

  return {
    ...query,
    prices: query.data?.prices ?? [],
    isMarketOpen: query.data?.is_market_open ?? false,
  };
}

export function usePortfolioRisk(market: string) {
  return useQuery({
    queryKey: ["portfolio-risk", market],
    queryFn: () => api.get<PortfolioRiskSnapshot>("/api/v1/macro/portfolio-risk", { market }),
    staleTime: 30_000, // 30s
    refetchInterval: 60_000, // 1 min
    retry: 1,
  });
}
