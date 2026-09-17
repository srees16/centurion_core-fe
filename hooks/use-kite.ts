import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type {
  LiveQuote,
  KiteHolding,
  KitePosition,
  KiteOrder,
  KiteSessionStatus,
  CarverStatus,
} from "@/lib/types";

// The backend answers 409 "Kite session not active" when the token expired or
// the backend restarted while a Kite page was open. Retrying cannot help:
// re-check the session so the page falls back to the login screen.
const KITE_SESSION_INACTIVE = "Kite session not active";

function useKiteDataQuery<T>(queryKey: unknown[], path: string, params?: Record<string, string>) {
  const qc = useQueryClient();
  return {
    queryKey,
    queryFn: async () => {
      try {
        return await api.get<T>(path, params);
      } catch (err) {
        if (err instanceof Error && err.message === KITE_SESSION_INACTIVE) {
          qc.invalidateQueries({ queryKey: ["kite-session-status"] });
        }
        throw err;
      }
    },
    retry: (failures: number, err: Error) => err.message !== KITE_SESSION_INACTIVE && failures < 1,
  };
}

export function useKiteSessionStatus() {
  return useQuery({
    queryKey: ["kite-session-status"],
    queryFn: () => api.get<KiteSessionStatus>("/api/v1/kite/session/status"),
    refetchInterval: 30000,
  });
}

export function useKiteSessionStart() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      api.post<{
        success: boolean;
        profile?: Record<string, unknown>;
        message?: string;
        needs_login?: boolean;
        login_url?: string;
      }>("/api/v1/kite/session/start"),
    onSuccess: (data) => {
      if (data.success) {
        qc.invalidateQueries({ queryKey: ["kite-session-status"] });
        qc.invalidateQueries({ queryKey: ["kite-quotes"] });
        qc.invalidateQueries({ queryKey: ["kite-holdings"] });
        qc.invalidateQueries({ queryKey: ["kite-positions"] });
        qc.invalidateQueries({ queryKey: ["kite-orders"] });
      }
    },
  });
}

export function useKiteSessionComplete() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (requestToken: string) =>
      api.post<{ success: boolean; profile: Record<string, unknown> }>(
        "/api/v1/kite/session/complete",
        { request_token: requestToken },
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["kite-session-status"] });
      qc.invalidateQueries({ queryKey: ["kite-quotes"] });
      qc.invalidateQueries({ queryKey: ["kite-holdings"] });
      qc.invalidateQueries({ queryKey: ["kite-positions"] });
      qc.invalidateQueries({ queryKey: ["kite-orders"] });
    },
  });
}

export function useKiteSessionStop() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<{ success: boolean }>("/api/v1/kite/session/stop"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["kite-session-status"] });
    },
  });
}

export function useKiteQuotes(symbols: string[], enabled = true) {
  return useQuery({
    ...useKiteDataQuery<LiveQuote[]>(["kite-quotes", symbols], "/api/v1/kite/quotes", {
      symbols: symbols.join(","),
    }),
    enabled: enabled && symbols.length > 0,
    refetchInterval: 5000,
  });
}

export function useKiteHoldings() {
  return useQuery(useKiteDataQuery<KiteHolding[]>(["kite-holdings"], "/api/v1/kite/holdings"));
}

export function useKitePositions() {
  return useQuery(useKiteDataQuery<KitePosition[]>(["kite-positions"], "/api/v1/kite/positions"));
}

export function useKiteOrders() {
  return useQuery(useKiteDataQuery<KiteOrder[]>(["kite-orders"], "/api/v1/kite/orders"));
}

export function useKitePlaceOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (order: {
      tradingsymbol: string;
      exchange: string;
      transaction_type: "BUY" | "SELL";
      order_type: "MARKET" | "LIMIT" | "SL" | "SL-M";
      quantity: number;
      price?: number;
      trigger_price?: number;
      product?: string;
      validity?: string;
      variety?: string;
    }) => api.post<{ order_id: string }>("/api/v1/kite/orders", order),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["kite-orders"] });
      qc.invalidateQueries({ queryKey: ["kite-positions"] });
    },
  });
}

export function useCarverStatus() {
  return useQuery({
    queryKey: ["carver-status"],
    queryFn: () => api.get<CarverStatus>("/ind-stocks/pipeline/carver/status"),
    staleTime: 5 * 60 * 1000,
  });
}
