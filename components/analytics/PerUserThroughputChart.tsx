"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { AnalyticsPerUser } from "@/lib/analytics";
import {
  MEDIA_TYPE_CATEGORIES,
  MEDIA_TYPE_META,
  type MediaCategory,
} from "@/lib/media-type-colors";

interface PerUserThroughputChartProps {
  data: AnalyticsPerUser[];
  activeDays: number;
  // When the discipline tab pins a single phase, lock the chart to that measure
  // and hide the toggle (the other measure is empty by construction).
  lockedMetric?: Metric;
}

type Metric = "copies" | "designs";

// Horizontal bars: one measure (copies OR designs) per user, each bar segmented by
// media type so you can see *what kind* of work a person produced. Segments follow
// the fixed media-type palette (article=red … video=blue), are separated by a 2px
// surface gap, and the whole row is hoverable for a full per-media breakdown. A
// legend below names every category present. Bars anchor to the left baseline.
export function PerUserThroughputChart({ data, activeDays, lockedMetric }: PerUserThroughputChartProps) {
  const [localMetric, setMetric] = useState<Metric>("copies");
  const [hovered, setHovered] = useState<string | null>(null);
  const metric = lockedMetric ?? localMetric;

  const rows = [...data]
    .filter((u) => (metric === "copies" ? u.copies > 0 : u.designs > 0))
    .sort((a, b) => (metric === "copies" ? b.copies - a.copies : b.designs - a.designs));

  const valueOf = (u: AnalyticsPerUser) => (metric === "copies" ? u.copies : u.designs);
  const breakdownOf = (u: AnalyticsPerUser) =>
    metric === "copies" ? u.copiesByMedia : u.designsByMedia;
  const avgPerDayOf = (u: AnalyticsPerUser) =>
    metric === "copies" ? u.avgCopiesPerDay : u.avgDesignsPerDay;

  const max = Math.max(1, ...rows.map(valueOf));
  const teamTotal = rows.reduce((sum, u) => sum + valueOf(u), 0);
  const teamAvgPerDay = rows.length ? teamTotal / rows.length / activeDays : 0;

  // Categories that actually appear in the current data — drives the legend.
  const presentCategories = MEDIA_TYPE_CATEGORIES.filter((cat) =>
    rows.some((u) => (breakdownOf(u)[cat] ?? 0) > 0)
  );

  return (
    <Card className="analytics-media border-gray-100 p-5">
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
        <>
          <ul className="mt-5 space-y-3">
            {rows.map((u) => {
              const value = valueOf(u);
              const breakdown = breakdownOf(u);
              const barWidth = `${(value / max) * 100}%`;
              const segments = MEDIA_TYPE_CATEGORIES.map((cat) => ({
                cat,
                count: breakdown[cat] ?? 0,
              })).filter((s) => s.count > 0);
              const isHovered = hovered === u.userId;

              return (
                <li
                  key={u.userId}
                  className="relative flex items-center gap-3"
                  onMouseEnter={() => setHovered(u.userId)}
                  onMouseLeave={() => setHovered(null)}
                >
                  <span className="w-32 shrink-0 truncate text-sm text-foreground" title={u.name}>
                    {u.name}
                  </span>
                  <div className="relative h-6 flex-1 rounded bg-gray-50">
                    {/* Stacked media-type segments, 2px surface gaps between fills */}
                    <div
                      className="flex h-full gap-[2px] overflow-hidden rounded"
                      style={{ width: barWidth, minWidth: 24 }}
                    >
                      {segments.map((s, i) => (
                        <div
                          key={s.cat}
                          className={cn(
                            "h-full",
                            i === 0 && "rounded-l",
                            i === segments.length - 1 && "rounded-r"
                          )}
                          style={{
                            width: `${(s.count / value) * 100}%`,
                            backgroundColor: `var(--media-${s.cat})`,
                          }}
                          title={`${MEDIA_TYPE_META[s.cat].label}: ${s.count} (${Math.round(
                            (s.count / value) * 100
                          )}%)`}
                        />
                      ))}
                    </div>

                    {/* Full breakdown tooltip for the whole bar */}
                    {isHovered && (
                      <div className="absolute left-0 top-full z-30 mt-1.5 w-52 rounded-lg border border-gray-200 bg-white p-2.5 text-xs shadow-lg">
                        <div className="mb-1.5 flex items-center justify-between font-semibold text-foreground">
                          <span className="truncate">{u.name}</span>
                          <span className="tabular-nums text-muted-foreground">
                            {value} {metric}
                          </span>
                        </div>
                        <ul className="space-y-1">
                          {segments.map((s) => (
                            <li key={s.cat} className="flex items-center gap-2">
                              <span
                                className="h-2.5 w-2.5 shrink-0 rounded-sm"
                                style={{ backgroundColor: `var(--media-${s.cat})` }}
                              />
                              <span className="flex-1 truncate text-foreground">
                                {MEDIA_TYPE_META[s.cat].label}
                              </span>
                              <span className="tabular-nums text-muted-foreground">
                                {s.count} · {Math.round((s.count / value) * 100)}%
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                  <span className="w-8 shrink-0 text-right text-xs font-semibold text-foreground tabular-nums">
                    {value}
                  </span>
                  <span className="w-16 shrink-0 text-right text-xs text-muted-foreground tabular-nums">
                    {avgPerDayOf(u).toFixed(1)}/day
                  </span>
                </li>
              );
            })}
          </ul>

          {/* Media-type legend — the categories present, with their colors */}
          {presentCategories.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2 border-t border-gray-100 pt-4">
              {presentCategories.map((cat) => (
                <span key={cat} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span
                    className="h-2.5 w-2.5 rounded-sm"
                    style={{ backgroundColor: `var(--media-${cat})` }}
                  />
                  {MEDIA_TYPE_META[cat].label}
                </span>
              ))}
            </div>
          )}
        </>
      )}

      {/* Media-type color roles — light values, swapped for dark surfaces. Kept
          local to the card so light/dark values live in one place. */}
      <MediaTypeStyle />
    </Card>
  );
}

// CSS custom properties for the media-type palette (theme-aware). Consumers read
// `var(--media-<category>)`.
function MediaTypeStyle() {
  const light = (MEDIA_TYPE_CATEGORIES as MediaCategory[])
    .map((c) => `--media-${c}:${MEDIA_TYPE_META[c].light};`)
    .join("");
  const dark = (MEDIA_TYPE_CATEGORIES as MediaCategory[])
    .map((c) => `--media-${c}:${MEDIA_TYPE_META[c].dark};`)
    .join("");
  return (
    <style>{`.analytics-media{${light}}@media (prefers-color-scheme:dark){.analytics-media{${dark}}}`}</style>
  );
}
