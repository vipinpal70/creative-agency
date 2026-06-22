import { cn } from "@/lib/utils";
import type { ContentStatus } from "@/lib/types";

const styles: Record<ContentStatus, string> = {
  Draft: "bg-muted text-muted-foreground border border-border",
  Approved: "bg-[hsl(var(--mod-social)/0.12)] text-[hsl(var(--mod-social))]",
  Scheduled: "bg-[hsl(var(--mod-email)/0.12)] text-[hsl(var(--mod-email))]",
  Published: "bg-[hsl(var(--mod-seo)/0.12)] text-[hsl(var(--mod-seo))]",
};

export function ContentStatusBadge({ status, className }: { status: ContentStatus; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase",
        styles[status],
        className,
      )}
    >
      {status}
    </span>
  );
}
