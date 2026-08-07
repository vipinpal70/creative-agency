"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { AnalyticsPerUser } from "@/lib/analytics";

interface PerUserThroughputChartProps {
  data: AnalyticsPerUser[];
  activeDays: number;
  // When the discipline tab pins a single phase, lock the chart to that measure
  // and hide the toggle (the other measure is empty by construction).
  lockedMetric?: Metric;
}

type Metric = "copies" | "designs";

// Horizontal bars: one measure (copies OR designs) per user. A toggle switches
// the measure so the chart stays single-series (no dual encoding, no cycled
// palette). The per-day average rides on each row; a dashed team-average line
// gives a reference. Bars anchor to the left baseline with rounded data-ends.
export function PerUserThroughputChart({ data, activeDays, lockedMetric }: PerUserThroughputChartProps) {
  const [localMetric, setMetric] = useState<Metric>("copies");
  const metric = lockedMetric ?? localMetric;

  const rows = [...data]
    .filter((u) => (metric === "copies" ? u.copies > 0 : u.designs > 0))
    .sort((a, b) => (metric === "copies" ? b.copies - a.copies : b.designs - a.designs));

  const valueOf = (u: AnalyticsPerUser) => (metric === "copies" ? u.copies : u.designs);
  const avgPerDayOf = (u: AnalyticsPerUser) =>
    metric === "copies" ? u.avgCopiesPerDay : u.avgDesignsPerDay;

  const max = Math.max(1, ...rows.map(valueOf));
  const teamTotal = rows.reduce((sum, u) => sum + valueOf(u), 0);
  const teamAvgPerDay = rows.length ? teamTotal / rows.length / activeDays : 0;

  return (
    <Card className="border-gray-100 p-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-foreground">
            {metric === "copies" ? "Copy/content per user" : "Designs claimed per user"}
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Team avg {teamAvgPerDay.toFixed(1)} / day over {activeDays}{" "}
            {activeDays === 1 ? "day" : "days"}
          </p>
        </div>
        {!lockedMetric && (
          <div className="inline-flex rounded-md border border-gray-200 p-0.5 text-xs">
            {(["copies", "designs"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMetric(m)}
                className={cn(
                  "rounded px-2.5 py-1 font-medium capitalize transition-colors",
                  metric === m
                    ? "bg-[#2a78d6] text-white"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {m}
              </button>
            ))}
          </div>
        )}
      </div>

      {rows.length === 0 ? (
        <p className="py-14 text-center text-sm text-gray-400">
          No {metric} recorded in this range.
        </p>
      ) : (
        <ul className="mt-5 space-y-3">
          {rows.map((u) => {
            const value = valueOf(u);
            const width = `${(value / max) * 100}%`;
            return (
              <li key={u.userId} className="flex items-center gap-3">
                <span className="w-32 shrink-0 truncate text-sm text-foreground" title={u.name}>
                  {u.name}
                </span>
                <div className="relative h-6 flex-1 rounded bg-gray-50">
                  <div
                    className="flex h-full items-center rounded bg-[#2a78d6] px-2"
                    style={{ width, minWidth: 24 }}
                    title={`${u.name}: ${value} ${metric} · ${avgPerDayOf(u).toFixed(1)}/day`}
                  >
                    <span className="text-xs font-semibold text-white tabular-nums">{value}</span>
                  </div>
                </div>
                <span className="w-16 shrink-0 text-right text-xs text-muted-foreground tabular-nums">
                  {avgPerDayOf(u).toFixed(1)}/day
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
