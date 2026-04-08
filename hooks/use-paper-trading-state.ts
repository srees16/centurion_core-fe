import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface PaperTradingState {
  id: number;
  active: boolean;
  started_at: string | null;
  expires_at: string | null;
  stopped_at: string | null;
  last_run_at: string | null;
  total_runs: number;
  last_run_status: string;
  last_run_message: string;
  updated_at: string;
}

async function fetchState(): Promise<PaperTradingState> {
  const res = await fetch("/api/paper-trading");
  if (!res.ok) throw new Error("Failed to fetch paper trading state");
  return res.json();
}

async function toggleState(action: "start" | "stop", weeks?: number) {
  const res = await fetch("/api/paper-trading", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, weeks }),
  });
  if (!res.ok) throw new Error("Failed to toggle paper trading");
  return res.json();
}

export function usePaperTradingState() {
  return useQuery({
    queryKey: ["paper-trading-state"],
    queryFn: fetchState,
    refetchInterval: 60_000,
  });
}

export function usePaperTradingToggle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ action, weeks }: { action: "start" | "stop"; weeks?: number }) =>
      toggleState(action, weeks),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["paper-trading-state"] });
    },
  });
}
