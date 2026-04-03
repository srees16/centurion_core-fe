import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { ChapterInfo, AsyncBatchProgress, BatchRunHistoryRow } from "@/lib/types";
import { useState, useCallback, useEffect, useRef } from "react";

export function useAronsonChapters() {
  return useQuery({
    queryKey: ["aronson-chapters"],
    queryFn: () => api.get<ChapterInfo[]>("/api/v1/aronson/chapters"),
  });
}

export interface AronsonRunParams {
  chapters: string[];
  tickers?: string[];
  date_start?: string;
  date_end?: string;
}

export function useAronsonRun() {
  const [progress, setProgress] = useState<AsyncBatchProgress | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const runMutation = useMutation({
    mutationFn: (params: AronsonRunParams) =>
      api.post<{ batch_id: string }>("/api/v1/aronson/run", params),
  });

  const startSSE = useCallback(
    (batchId: string) => {
      eventSourceRef.current?.close();
      const es = api.createSSE(`/api/v1/aronson/progress/${batchId}`);
      es.onmessage = (e) => {
        try { setProgress(JSON.parse(e.data)); } catch {}
      };
      es.onerror = () => es.close();
      eventSourceRef.current = es;
    },
    [],
  );

  useEffect(() => {
    if (runMutation.data?.batch_id) startSSE(runMutation.data.batch_id);
    return () => eventSourceRef.current?.close();
  }, [runMutation.data?.batch_id, startSSE]);

  const abort = useCallback(async () => {
    const batchId = runMutation.data?.batch_id;
    if (!batchId) return;
    await api.post(`/api/v1/aronson/abort/${batchId}`);
    eventSourceRef.current?.close();
  }, [runMutation.data?.batch_id]);

  const isAborted = progress?.status === "aborted";

  return {
    run: runMutation.mutate,
    isRunning: !isAborted && (runMutation.isPending || (progress !== null && progress.completed < progress.total)),
    batchId: runMutation.data?.batch_id ?? null,
    progress,
    error: runMutation.error?.message ?? null,
    abort,
    isAborted,
  };
}

export function useAronsonHistory(page = 1, limit = 50) {
  return useQuery({
    queryKey: ["aronson-history", page, limit],
    queryFn: () =>
      api.get<{ data: BatchRunHistoryRow[]; total: number }>(
        "/api/v1/aronson/history",
        { page: String(page), limit: String(limit) },
      ),
  });
}
