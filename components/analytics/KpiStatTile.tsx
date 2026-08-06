import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface KpiStatTileProps {
  label: string;
  value: string;
  subtitle?: string;
  hint?: string;
  accent?: "neutral" | "internal" | "client";
}

// A single headline number. No plot, so per the dataviz form heuristic this is a
// stat tile rather than a chart. The small colored rule ties redo tiles to their
// series color without letting color carry meaning alone (the label does that).
const ACCENT_RULE: Record<NonNullable<KpiStatTileProps["accent"]>, string> = {
  neutral: "bg-[#2a78d6]",
  internal: "bg-[#eda100]",
  client: "bg-[#e34948]",
};

export function KpiStatTile({ label, value, subtitle, hint, accent = "neutral" }: KpiStatTileProps) {
  return (
    <Card className="relative overflow-hidden border-gray-100 p-5">
      <div className={cn("absolute left-0 top-0 h-full w-1", ACCENT_RULE[accent])} />
      <div className="pl-2">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <p className="mt-2 text-3xl font-semibold tracking-tight text-foreground tabular-nums">
          {value}
        </p>
        {subtitle && <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>}
        {hint && <p className="mt-2 text-[11px] leading-snug text-gray-400">{hint}</p>}
      </div>
    </Card>
  );
}
