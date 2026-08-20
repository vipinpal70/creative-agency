"use client";

import { Card } from "@/components/ui/card";
import { Clock } from "lucide-react";
import type { AnalyticsResponse } from "@/lib/analytics";

interface TurnaroundCardProps {
  turnaround: AnalyticsResponse["turnaround"];
  discipline: string; // "" | "copy" | "design"
}

// Human-readable duration from ms: "2d 4h", "6h", "45m", "<1m".
function formatDuration(ms: number): string {
  if (ms <= 0) return "—";
  const totalMinutes = Math.round(ms / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
  if (hours > 0) return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  if (minutes > 0) return `${minutes}m`;
  return "<1m";
}

// Average turnaround time, split into the two review phases. Content = created →
// content approved; Design = design start → design approved. Each average is over
// items that *completed* that phase (in-progress items are excluded). The
// discipline lens hides the phase that tab does not report.
export function TurnaroundCard({ turnaround, discipline }: TurnaroundCardProps) {
  const showContent = discipline !== "design";
  const showDesign = discipline !== "copy";

  const stats = [
    showContent && {
      key: "content",
      label: "Content phase",
      desc: "Created → content approved",
      avgMs: turnaround.contentAvgMs,
      count: turnaround.contentCount,
      noun: "copies",
      nounSingular: "copy",
    },
    showDesign && {
      key: "design",
      label: "Design phase",
      desc: "Design start → design approved",
      avgMs: turnaround.designAvgMs,
      count: turnaround.designCount,
      noun: "designs",
      nounSingular: "design",
    },
  ].filter(Boolean) as {
    key: string;
    label: string;
    desc: string;
    avgMs: number;
    count: number;
    noun: string;
    nounSingular: string;
  }[];

  return (
    <Card className="border-gray-100 p-5">
      <div className="flex items-baseline justify-between">
        <div>
          <h2 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <Clock className="h-4 w-4" /> Average turnaround time
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            How long each phase takes from start to approval
          </p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {stats.map((s) => (
          <div key={s.key} className="rounded-lg border border-gray-100 bg-gray-50/60 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
              {s.label}
            </p>
            {s.count === 0 ? (
              <p className="mt-2 text-sm text-gray-400">No approved {s.noun} in range</p>
            ) : (
              <>
                <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">
                  {formatDuration(s.avgMs)}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {s.desc} · avg over {s.count} {s.count === 1 ? s.nounSingular : s.noun}
                </p>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Comparison graph — both bars measure the same thing (a duration), so this
          is single-hue magnitude: no categorical palette, no legend. */}
      {(() => {
        const chartRows = stats.filter((s) => s.count > 0);
        if (chartRows.length === 0) return null;
        const max = Math.max(1, ...chartRows.map((s) => s.avgMs));
        return (
          <div className="mt-5 border-t border-gray-100 pt-4">
            <p className="mb-3 text-[11px] font-medium uppercase tracking-wide text-gray-400">
              Average duration by phase
            </p>
            <ul className="space-y-3">
              {chartRows.map((s) => (
                <li key={s.key} className="flex items-center gap-3">
                  <span className="w-24 shrink-0 truncate text-xs text-foreground">
                    {s.label}
                  </span>
                  <div className="relative h-6 flex-1 rounded bg-gray-50">
                    <div
                      className="flex h-full items-center justify-end rounded bg-[#2a78d6] px-2"
                      style={{ width: `${(s.avgMs / max) * 100}%`, minWidth: 44 }}
                      title={`${s.label}: ${formatDuration(s.avgMs)} avg over ${s.count} ${
                        s.count === 1 ? s.nounSingular : s.noun
                      }`}
                    >
                      <span className="text-xs font-semibold text-white tabular-nums">
                        {formatDuration(s.avgMs)}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        );
      })()}
    </Card>
  );
}
