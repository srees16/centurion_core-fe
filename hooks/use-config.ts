import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { CarverConfig } from "@/lib/types";

export function useCarverConfig() {
  return useQuery({
    queryKey: ["carver-config"],
    queryFn: () => api.get<CarverConfig>("/api/v1/config/carver"),
  });
}

export function useUpdateCarverConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (updates: Partial<CarverConfig>) =>
      api.post<{ applied: Record<string, unknown>; errors: string[] }>(
        "/api/v1/config/carver",
        updates,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["carver-config"] });
    },
  });
}
