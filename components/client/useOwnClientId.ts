"use client";

import { useEffect, useState } from "react";

// Resolves the Client id owned by the logged-in client user via /api/client/me.
// Every client-portal data view is scoped to this id; the backend independently
// enforces the same ownership, so this is purely for wiring the UI to the
// caller's own client.
export function useOwnClientId() {
  const [clientId, setClientId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/client/me")
      .then(async (r) => {
        const data = await r.json();
        if (!active) return;
        if (r.ok && data.clientId) setClientId(data.clientId);
        else setError(data.error || "Unable to load your account.");
      })
      .catch(() => active && setError("Unable to load your account."));
    return () => {
      active = false;
    };
  }, []);

  return { clientId, error };
}
