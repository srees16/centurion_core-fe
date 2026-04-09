"use client";

import { TrendingUp, Bell, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";

interface BullAlertBannerProps {
  hasAlert: boolean;
  message: string;
  onInfuse?: () => void;
  className?: string;
}

export function BullAlertBanner({
  hasAlert,
  message,
  onInfuse,
  className,
}: BullAlertBannerProps) {
  if (!hasAlert) return null;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg border p-4",
        "border-emerald-500/50 bg-emerald-950/30",
        "animate-in slide-in-from-top-2 duration-500",
        className
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 to-transparent" />
      <div className="relative flex items-center gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/20">
          <TrendingUp className="h-5 w-5 text-emerald-400" />
        </div>
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-emerald-400 animate-bounce" />
            <p className="text-sm font-semibold text-emerald-300">
              Bull Run Confirmed
            </p>
          </div>
          <p className="text-sm text-muted-foreground">{message}</p>
        </div>
        {onInfuse && (
          <button
            onClick={onInfuse}
            className="flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-500"
          >
            <DollarSign className="h-4 w-4" />
            Infuse Capital
          </button>
        )}
      </div>
    </div>
  );
}
