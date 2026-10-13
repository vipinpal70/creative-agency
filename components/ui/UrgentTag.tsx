import { Flame } from "lucide-react";
import { cn } from "@/lib/utils";

// Small red pill flagging a high-priority copy/creative. Rendered on every
// staff-facing card (and the preview modal) when the draft's highPriority flag
// is set; nothing is shown when it is false. Internal signal — never shown to
// clients. Pass `className` to tune the size per context (cards use text-[11px],
// the modal uses text-[10px]); cn() merges so the override wins.
export function UrgentTag({ className = "" }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap bg-red-100 text-red-700",
        className
      )}
    >
      <Flame className="h-3 w-3" />
      Urgent
    </span>
  );
}
