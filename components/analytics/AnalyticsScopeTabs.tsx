"use client";

import { cn } from "@/lib/utils";

// The two top-level tab groups that reshape the whole dashboard:
//   • discipline — Copy (content phase) vs Creative/Design (design phase)
//   • module     — Social vs Paid media scope
// Each group keeps an "All" option so the default view stays combined.
interface AnalyticsScopeTabsProps {
  discipline: string;
  module: string;
  onChange: (next: { discipline?: string; module?: string }) => void;
}

const DISCIPLINE_TABS = [
  { value: "", label: "All" },
  { value: "copy", label: "Copy" },
  { value: "design", label: "Creative" },
] as const;

const MODULE_TABS = [
  { value: "", label: "All" },
  { value: "social", label: "Social Media" },
  { value: "paid", label: "Paid Media" },
] as const;

export function AnalyticsScopeTabs({ discipline, module, onChange }: AnalyticsScopeTabsProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <SegmentedControl
        value={discipline}
        options={DISCIPLINE_TABS}
        onSelect={(v) => onChange({ discipline: v })}
      />
      <SegmentedControl
        value={module}
        options={MODULE_TABS}
        onSelect={(v) => onChange({ module: v })}
      />
    </div>
  );
}

function SegmentedControl({
  value,
  options,
  onSelect,
}: {
  value: string;
  options: readonly { value: string; label: string }[];
  onSelect: (v: string) => void;
}) {
  return (
    <div className="inline-flex rounded-lg border border-gray-200 bg-white p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onSelect(o.value)}
          className={cn(
            "rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors",
            value === o.value
              ? "bg-[#2a78d6] text-white shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
