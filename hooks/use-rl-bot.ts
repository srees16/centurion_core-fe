import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type {
  RLTrainConfig,
  RLTrainResponse,
  RLEvalResponse,
  RLSignal,
  RLModel,
  RLUploadResult,
  RLUploadedFile,
  PortfolioAnalysisResponse,
} from "@/lib/types";

export function useRLTrain() {
  return useMutation({
    mutationFn: (config: RLTrainConfig) =>
      api.postDirect<RLTrainResponse>("/api/v1/rl-bot/train", config),
  });
}

export function useRLEvaluate() {
  return useMutation({
    mutationFn: (params: { ticker: string; algorithm: string; eval_days?: number }) =>
      api.postDirect<RLEvalResponse>("/api/v1/rl-bot/evaluate", params),
  });
}

export function useRLSignal() {
  return useMutation({
    mutationFn: (params: { ticker: string; algorithm: string }) =>
      api.post<RLSignal>("/api/v1/rl-bot/signal", params),
  });
}

export function useRLModels() {
  return useQuery({
    queryKey: ["rl-models"],
    queryFn: async () => {
      const res = await api.get<{ models: RLModel[] }>("/api/v1/rl-bot/models");
      return res.models;
    },
  });
}

export function useRLUpload() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => {
      const fd = new FormData();
      fd.append("file", file);
      return api.postForm<RLUploadResult>("/api/v1/rl-bot/upload-data", fd);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["rl-uploads"] }),
  });
}

export function useRLUploads() {
  return useQuery({
    queryKey: ["rl-uploads"],
    queryFn: async () => {
      const res = await api.get<{ files: RLUploadedFile[] }>("/api/v1/rl-bot/uploads");
      return res.files;
    },
  });
}

export function usePortfolioAnalysis() {
  return useQuery({
    queryKey: ["rl-portfolio-analysis"],
    queryFn: () =>
      api.get<PortfolioAnalysisResponse>("/api/v1/rl-bot/portfolio-analysis"),
    staleTime: 5 * 60 * 1000,
  });
}
