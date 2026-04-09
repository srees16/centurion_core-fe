"use client";

import { useEffect, useRef } from "react";
import { createChart, ColorType, type IChartApi } from "lightweight-charts";
import type { PortfolioEquityPoint } from "@/lib/types";

interface DualEquityCurveProps {
  compounder: PortfolioEquityPoint[];
  harvest: PortfolioEquityPoint[];
  height?: number;
}

export function DualEquityCurve({ compounder, harvest, height = 380 }: DualEquityCurveProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    if (!containerRef.current || compounder.length === 0) return;

    const chart = createChart(containerRef.current, {
      height,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#888",
      },
      grid: {
        vertLines: { color: "#e8e8e8" },
        horzLines: { color: "#e8e8e8" },
      },
      rightPriceScale: { borderColor: "#ccc" },
      timeScale: { borderColor: "#ccc", tickMarkFormatter: (t: number) => `D${t}` },
    });

    // Centurion Compounder — blue
    const ccSeries = chart.addLineSeries({
      color: "#4299e1",
      lineWidth: 2,
      title: "Compounder",
    });
    ccSeries.setData(compounder.map((d) => ({ time: d.day as unknown as string, value: d.equity })));

    // Centurion Harvest — amber
    const chSeries = chart.addLineSeries({
      color: "#f59e0b",
      lineWidth: 2,
      title: "Harvest",
    });
    chSeries.setData(harvest.map((d) => ({ time: d.day as unknown as string, value: d.equity })));

    chart.timeScale().fitContent();
    chartRef.current = chart;

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width } = entry.contentRect;
        if (width > 0) chart.applyOptions({ width });
      }
    });
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
    };
  }, [compounder, harvest, height]);

  if (compounder.length === 0 && harvest.length === 0)
    return <p className="text-sm text-muted-foreground">No equity data</p>;

  return (
    <div className="content-panel p-4 space-y-2">
      <h3 className="text-sm font-semibold">Equity Curves</h3>
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><span className="inline-block h-2 w-4 rounded bg-blue-500" /> Compounder</span>
        <span className="flex items-center gap-1"><span className="inline-block h-2 w-4 rounded bg-amber-500" /> Harvest</span>
      </div>
      <div ref={containerRef} className="w-full" />
    </div>
  );
}
