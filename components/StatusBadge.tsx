import { cn } from "@/lib/utils";

type StatusType =
  | "Open Task"
  | "Open"
  | "In Progress"
  | "Internal Review"
  | "Client Review"
  | "Approved"
  | "Draft"
  | "Scheduled"
  | "Published"
  | "Active"
  | "Inactive"
  | string;

const styles: Record<string, string> = {
  "Open Task": "bg-blue-50 text-blue-700 border border-blue-100",
  "Open": "bg-blue-50 text-blue-700 border border-blue-100",
  "In Progress": "bg-amber-50 text-amber-700 border border-amber-100",
  "Internal Review": "bg-indigo-50 text-indigo-700 border border-indigo-100",
  "Client Review": "bg-purple-50 text-purple-700 border border-purple-100",
  "Approved": "bg-emerald-50 text-emerald-700 border border-emerald-100",
  "Draft": "bg-gray-100 text-gray-600 border border-gray-200",
  "Scheduled": "bg-sky-50 text-sky-700 border border-sky-100",
  "Published": "bg-violet-50 text-violet-700 border border-violet-100",
  "Active": "bg-emerald-50 text-emerald-700 border border-emerald-100",
  "Inactive": "bg-rose-50 text-rose-700 border border-rose-100",
};

export function StatusBadge({ status, className }: { status: StatusType; className?: string }) {
  const normalized = status.trim();
  const style = styles[normalized] || "bg-gray-50 text-gray-600 border border-gray-100";
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase",
        style,
        className
      )}
    >
      {status}
    </span>
  );
}
