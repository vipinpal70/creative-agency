"use client";

import { Suspense, useMemo } from "react";
import { Loader2, AlertCircle } from "lucide-react";
import ClientDetailPage from "@/app/dashboard/clients/[id]/page";
import { useOwnClientId } from "@/components/client/useOwnClientId";

function ProfileLoading() {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground py-20 justify-center">
      <Loader2 className="h-4 w-4 animate-spin" /> Loading your profile…
    </div>
  );
}

// The client portal profile reuses the internal client-detail page, scoped to
// the Client record linked to the logged-in account. Every endpoint it calls is
// owner-scoped on the backend, so a client only ever sees/edits their own record.
export default function ClientProfilePage() {
  const { clientId, error } = useOwnClientId();

  // ClientDetailPage expects a Promise<{ id }> (Next route params shape).
  const params = useMemo(
    () => (clientId ? Promise.resolve({ id: clientId }) : null),
    [clientId]
  );

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

  if (!params) return <ProfileLoading />;

  return (
    <Suspense fallback={<ProfileLoading />}>
      <ClientDetailPage params={params} />
    </Suspense>
  );
}
