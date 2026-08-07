"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BarChart3, Loader2, AlertCircle } from "lucide-react";
import { AnalyticsFilterBar, type AnalyticsFilters } from "./AnalyticsFilterBar";
import { AnalyticsScopeTabs } from "./AnalyticsScopeTabs";
import { KpiStatTile } from "./KpiStatTile";
import { ShotApprovalHistogram } from "./ShotApprovalHistogram";
import { PerUserThroughputChart } from "./PerUserThroughputChart";
import type { AnalyticsResponse } from "@/lib/analytics";

interface AnalyticsDashboardProps {
  variant?: "staff" | "client";
}

function defaultRange(): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 29);
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}

export function AnalyticsDashboard({ variant = "staff" }: AnalyticsDashboardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Initialise filters from the URL (shareable / refresh-safe), falling back to
  // the last-30-days default.
  const [filters, setFilters] = useState<AnalyticsFilters>(() => {
    const def = defaultRange();
    return {
      from: searchParams.get("from") || def.from,
      to: searchParams.get("to") || def.to,
      clientId: searchParams.get("clientId") || "",
      memberId: searchParams.get("memberId") || "",
      mediaType: searchParams.get("mediaType") || "",
      discipline: searchParams.get("discipline") || "",
      module: searchParams.get("module") || "",
    };
  });

  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const queryString = useMemo(() => {
    const p = new URLSearchParams();
    p.set("from", filters.from);
    p.set("to", filters.to);
    if (filters.clientId) p.set("clientId", filters.clientId);
    if (filters.memberId) p.set("memberId", filters.memberId);
    if (filters.mediaType) p.set("mediaType", filters.mediaType);
    if (filters.discipline) p.set("discipline", filters.discipline);
    if (filters.module) p.set("module", filters.module);
    return p.toString();
  }, [filters]);

  // Keep the URL in sync so the view is shareable and survives refresh.
  useEffect(() => {
    router.replace(`?${queryString}`, { scroll: false });
  }, [queryString, router]);

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/analytics?${queryString}`, {
          signal: controller.signal,
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || `Request failed (${res.status})`);
        }
        const json: AnalyticsResponse = await res.json();
        setData(json);
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setError((err as Error).message);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [queryString]);

  const onChange = useCallback((next: Partial<AnalyticsFilters>) => {
    setFilters((prev) => ({ ...prev, ...next }));
  }, []);

  const fmtPct = (n: number) => `${n.toFixed(n % 1 === 0 ? 0 : 1)}%`;

  // The discipline tab renames the unit throughout (copies vs designs) and the
  // review stage the redo tiles describe (content vs design review).
  const isDesign = filters.discipline === "design";
  const nounPlural = isDesign ? "designs" : "copies";
  const totalLabel = isDesign ? "Total designs" : "Total copy / content";
  const reviewNoun = isDesign ? "design" : "content";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-semibold text-foreground">
          <BarChart3 className="h-5 w-5" /> Analytics
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Content volume, rework, and approval quality across your{" "}
          {variant === "client" ? "campaigns" : "team and clients"}.
        </p>
      </div>

      <AnalyticsScopeTabs
        discipline={filters.discipline}
        module={filters.module}
        onChange={onChange}
      />

      <AnalyticsFilterBar
        filters={filters}
        onChange={onChange}
        clients={data?.filters.clients ?? []}
        members={data?.filters.members ?? []}
        mediaTypes={data?.filters.mediaTypes ?? []}
        showClientFilter={variant === "staff"}
      />

      {error ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-red-100 py-16 text-center">
          <AlertCircle className="h-8 w-8 text-red-300" />
          <p className="text-sm text-red-500">{error}</p>
        </div>
      ) : loading && !data ? (
        <div className="flex flex-col items-center gap-2 py-24 text-center text-gray-400">
          <Loader2 className="h-7 w-7 animate-spin" />
          <p className="text-sm">Crunching the numbers…</p>
        </div>
      ) : data ? (
        <div className={loading ? "space-y-6 opacity-60 transition-opacity" : "space-y-6"}>
          {/* KPI row 1 — total + redo rates */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <KpiStatTile
              label={totalLabel}
              value={String(data.totals.totalCopies)}
              subtitle={`${data.totals.approvedCopies} approved · ${data.totals.inProgress} in progress`}
              accent="neutral"
            />
            <KpiStatTile
              label="Internal redo rate"
              value={fmtPct(data.redo.internalRate)}
              subtitle={`${data.redo.internalCount} of ${data.totals.totalCopies} ${nounPlural}`}
              hint={`Items that needed ≥1 change at an internal ${reviewNoun} review`}
              accent="internal"
            />
            <KpiStatTile
              label="Client redo rate"
              value={fmtPct(data.redo.clientRate)}
              subtitle={`${data.redo.clientCount} of ${data.totals.totalCopies} ${nounPlural}`}
              hint={`Items that needed ≥1 change requested by the client at ${reviewNoun} review`}
              accent="client"
            />
          </div>

          {/* Row 2 — shot histogram + per-user throughput */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <ShotApprovalHistogram
              oneShot={data.shots.oneShot}
              twoShot={data.shots.twoShot}
              twoPlusShot={data.shots.twoPlusShot}
              inProgress={data.totals.inProgress}
              noun={nounPlural}
            />
            <PerUserThroughputChart
              data={data.perUser}
              activeDays={data.range.activeDays}
              lockedMetric={
                filters.discipline === "copy"
                  ? "copies"
                  : filters.discipline === "design"
                    ? "designs"
                    : undefined
              }
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
