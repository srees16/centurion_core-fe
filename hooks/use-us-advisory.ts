import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { UsAdvisoryResponse } from "@/lib/types";

/** US-UI1: the US advisory book the nightly run saves after each US close (advisory only: no order path). */
export function useUsAdvisory(enabled = true) {
  return useQuery({
    queryKey: ["us-advisory"],
    queryFn: () => api.get<UsAdvisoryResponse>("/api/v1/us-advisory"),
    staleTime: 10 * 60_000,   // it changes once a night
    enabled,
  });
}
