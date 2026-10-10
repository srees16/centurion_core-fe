"use client";

import {
  CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
  type TooltipProps,
} from "recharts";
import type { JournalPaperPoint, JournalRow, JournalTarget } from "@/lib/types";

/** What the journal chart can plot; percent metrics are fractions in the data. */
export const JOURNAL_CHART_METRICS = [
  { key: "sharpe", label: "Sharpe", pct: false },
  { key: "cagr", label: "CAGR", pct: true },
  { key: "max_dd", label: "Max DD", pct: true },
  { key: "calmar", label: "Calmar", pct: false },
] as const;
export type JournalChartMetric = (typeof JOURNAL_CHART_METRICS)[number]["key"];

const SERIES = [
  { key: "backtest", name: "Backtest 2013-25", color: "#4299e1", type: "stepAfter" },
  { key: "walk_forward", name: "Walk-forward OOS 2017-25", color: "#9f7aea", type: "stepAfter" },
  { key: "paper", name: "Paper, to date", color: "#38a169", type: "linear" },
] as const;
type SeriesKey = (typeof SERIES)[number]["key"];

interface Point {
  t: number;
  date: string;
  event: string;
  backtest?: number;
  walk_forward?: number;
  paper?: number;
}

const DAY = 86_400_000;
const dayStart = (date: string) => Date.parse(`${date}T00:00:00Z`);

interface MetricsJournalChartProps {
  rows: JournalRow[];
  paper: JournalPaperPoint[];
  targets: JournalTarget[];
  metric: JournalChartMetric;
  height?: number;
}

/** A book's metric over time: each re-baseline holds until the next (steps), paper weekly, targets dashed. */
export function MetricsJournalChart({ rows, paper, targets, metric, height = 300 }: MetricsJournalChartProps) {
  const pct = JOURNAL_CHART_METRICS.find((m) => m.key === metric)?.pct ?? false;
  const scale = (v: number | null | undefined) => (v == null ? undefined : pct ? v * 100 : v);
  const fmt = (v: number) => (pct ? `${v.toFixed(1)}%` : v.toFixed(3));

  const points: Point[] = [];
  const sameDay: Record<string, number> = {};
  for (const r of rows) {
    const v = scale(r[metric]);
    if (v === undefined) continue;
    // Rows of one day (e.g. two re-baselines) sit a few hours apart, in journal order.
    const n = (sameDay[r.date] = (sameDay[r.date] ?? -1) + 1);
    const point: Point = { t: dayStart(r.date) + (n * DAY) / 4, date: r.date, event: r.event };
    point[r.kind] = v;
    points.push(point);
  }
  if (metric === "sharpe" || metric === "max_dd") {
    for (const p of paper) {
      const v = scale(p[metric]);
      if (v !== undefined) points.push({ t: dayStart(p.date), date: p.date, event: `paper, ${p.sessions} sessions`, paper: v });
    }
  }
  points.sort((a, b) => a.t - b.t);
  if (points.length === 0) return <p className="text-sm text-muted-foreground">No journal entries for this metric yet</p>;

  const shown = SERIES.filter((s) => points.some((p) => p[s.key as SeriesKey] !== undefined));
  const goals = Array.from(new Set(targets.filter((t) => t.metric === metric).map((t) => t.value)));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={points} margin={{ top: 10, right: 30, bottom: 10, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          dataKey="t" type="number" scale="time" domain={[`dataMin - ${DAY}`, `dataMax + ${DAY}`]}
          tick={{ fontSize: 10 }}
          tickFormatter={(t: number) => new Date(t).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
        />
        <YAxis tick={{ fontSize: 10 }} tickFormatter={(v: number) => (pct ? `${v}%` : `${v}`)} domain={["auto", "auto"]} />
        <Tooltip content={<JournalTooltip fmt={fmt} />} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        {goals.map((g) => (
          <ReferenceLine key={g} y={pct ? g * 100 : g} stroke="#e53e3e" strokeDasharray="4 4" ifOverflow="extendDomain"
            label={{ value: `target ${pct ? `${g * 100}%` : g}`, position: "insideTopRight", fontSize: 10, fill: "#e53e3e" }} />
        ))}
        {shown.map((s) => (
          <Line key={s.key} dataKey={s.key} name={s.name} stroke={s.color} type={s.type} connectNulls
            dot={{ r: 3 }} isAnimationActive={false} />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

function JournalTooltip({ active, payload, fmt }: TooltipProps<number, string> & { fmt: (v: number) => string }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload as Point;
  return (
    <div className="rounded-md border bg-background p-2 text-xs shadow-sm max-w-[280px]">
      <p className="font-medium">{p.date}</p>
      <p className="text-muted-foreground">{p.event}</p>
      {payload.filter((e) => e.value != null).map((e) => (
        <p key={String(e.dataKey)} style={{ color: e.color }}>{e.name}: {fmt(Number(e.value))}</p>
      ))}
    </div>
  );
}
