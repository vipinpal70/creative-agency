"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { AnalyticsFilterOption } from "@/lib/analytics";

export interface AnalyticsFilters {
  from: string; // yyyy-mm-dd
  to: string; // yyyy-mm-dd
  clientId: string; // "" = all
  memberId: string; // "" = all
  mediaType: string; // "" = all
}

interface AnalyticsFilterBarProps {
  filters: AnalyticsFilters;
  onChange: (next: Partial<AnalyticsFilters>) => void;
  clients: AnalyticsFilterOption[];
  members: AnalyticsFilterOption[];
  mediaTypes: string[];
  showClientFilter?: boolean;
}

const ALL = "__all__";

// yyyy-mm-dd for a date N days before today (inclusive range → today).
function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}
function startOfMonth(): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}
function today(): string {
  return new Date().toISOString().slice(0, 10);
}

const PRESETS = [
  { label: "7d", get: () => ({ from: daysAgo(6), to: today() }) },
  { label: "30d", get: () => ({ from: daysAgo(29), to: today() }) },
  { label: "90d", get: () => ({ from: daysAgo(89), to: today() }) },
  { label: "This month", get: () => ({ from: startOfMonth(), to: today() }) },
];

export function AnalyticsFilterBar({
  filters,
  onChange,
  clients,
  members,
  mediaTypes,
  showClientFilter = true,
}: AnalyticsFilterBarProps) {
  const activePreset = PRESETS.find((p) => {
    const r = p.get();
    return r.from === filters.from && r.to === filters.to;
  })?.label;

  return (
    <div className="sticky top-14 z-20 -mx-1 rounded-xl border border-gray-100 bg-white/90 px-4 py-3 backdrop-blur">
      <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
        {/* Date presets + custom range */}
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-medium uppercase tracking-wide text-gray-400">
            Date range
          </span>
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-md border border-gray-200 p-0.5">
              {PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => onChange(p.get())}
                  className={cn(
                    "rounded px-2.5 py-1 text-xs font-medium transition-colors",
                    activePreset === p.label
                      ? "bg-[#2a78d6] text-white"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <input
              type="date"
              value={filters.from}
              max={filters.to}
              onChange={(e) => onChange({ from: e.target.value })}
              className="h-9 rounded-md border border-input bg-background px-2 text-xs"
            />
            <span className="text-xs text-muted-foreground">to</span>
            <input
              type="date"
              value={filters.to}
              min={filters.from}
              max={today()}
              onChange={(e) => onChange({ to: e.target.value })}
              className="h-9 rounded-md border border-input bg-background px-2 text-xs"
            />
          </div>
        </div>

        {showClientFilter && (
          <FilterSelect
            label="Client"
            value={filters.clientId}
            onValueChange={(v) => onChange({ clientId: v })}
            options={clients}
            allLabel="All clients"
          />
        )}

        <FilterSelect
          label="Team member"
          value={filters.memberId}
          onValueChange={(v) => onChange({ memberId: v })}
          options={members}
          allLabel="All members"
        />

        <FilterSelect
          label="Media type"
          value={filters.mediaType}
          onValueChange={(v) => onChange({ mediaType: v })}
          options={mediaTypes.map((t) => ({ id: t, label: t }))}
          allLabel="All media"
        />
      </div>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onValueChange,
  options,
  allLabel,
}: {
  label: string;
  value: string;
  onValueChange: (v: string) => void;
  options: AnalyticsFilterOption[];
  allLabel: string;
}) {
  return (
    <div className="flex min-w-[150px] flex-col gap-1">
      <span className="text-[11px] font-medium uppercase tracking-wide text-gray-400">
        {label}
      </span>
      <Select
        value={value || ALL}
        onValueChange={(v) => onValueChange(v === ALL ? "" : v)}
      >
        <SelectTrigger className="h-9 text-xs">
          <SelectValue placeholder={allLabel} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{allLabel}</SelectItem>
          {options.map((o) => (
            <SelectItem key={o.id} value={o.id}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
