"use client";

import { Loader2, AlertCircle } from "lucide-react";
import ContentCalendar from "@/components/calendar/ContentCalendar";
import { useOwnClientId } from "@/components/client/useOwnClientId";

// Client portal Content Calendar — scoped to the caller's own client and
// rendered read-only. The backend (/api/calendar) independently enforces that
// a client can only read their own content.
export default function ClientCalendarPage() {
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

  if (!clientId) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-20 justify-center">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading your content calendar…
      </div>
    );
  }

  return <ContentCalendar lockedClientId={clientId} readOnly={false} />;
}
