"use client";

import { Loader2, AlertCircle } from "lucide-react";
import GanttChart from "@/components/GanttChart";
import { useOwnClientId } from "@/components/client/useOwnClientId";

// Client portal Gantt view — read-only and locked to the caller's own client.
// No client picker and no "duplicate" tooling (those are staff-only).
export default function ClientGanttPage() {
  const { clientId, error } = useOwnClientId();

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 py-20 text-center">
        <AlertCircle className="h-10 w-10 text-red-400" />
        <p className="text-sm text-red-600">{error}</p>
        <p className="text-xs text-gray-400">
          Please contact your account manager if you believe this is a mistake.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-6.5rem)] min-h-[560px] gap-4 max-w-[1600px] mx-auto w-full">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Gantt Chart</h1>
        <p className="text-sm text-muted-foreground mt-1">Your project timeline and milestones</p>
      </div>

      <div className="flex-1 overflow-hidden mb-2">
        {clientId ? (
          <GanttChart clientId={clientId} readOnly={false} />
        ) : (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-20 justify-center">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading your Gantt chart…
          </div>
        )}
      </div>
    </div>
  );
}
