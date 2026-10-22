"use client";

import { useCallback, useEffect, useState } from "react";
import { Toaster } from "sonner";
import { Loader2 } from "lucide-react";
import { apiErrorMessage, readJson } from "@/lib/read-json";
import {
  AIProviderSection,
  CatalogProvider,
  EffectiveConfig,
  SavedConfig,
} from "@/components/settings/AIProviderSection";

interface SettingsResponse {
  catalog: CatalogProvider[];
  imageCompatibilityWarning: { title: string; message: string };
  text: SavedConfig | null;
  image: SavedConfig | null;
  effective: { text: EffectiveConfig; image: EffectiveConfig };
}

async function fetchSettings(): Promise<SettingsResponse> {
  const res = await fetch("/api/settings/ai-providers", { cache: "no-store" });
  const json = await readJson<SettingsResponse & { error?: string }>(res);
  if (!res.ok) throw new Error(apiErrorMessage(res, json, "Failed to load AI settings"));
  return json;
}

export default function AISettingsPage() {
  const [data, setData] = useState<SettingsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Bumped after save/reset so each section re-initialises from fresh data.
  const [version, setVersion] = useState(0);

  const apply = useCallback((promise: Promise<SettingsResponse>) => {
    promise
      .then((json) => {
        setData(json);
        setError(null);
        setVersion((v) => v + 1);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load AI settings"));
  }, []);

  const reload = useCallback(() => apply(fetchSettings()), [apply]);

  useEffect(() => {
    apply(fetchSettings());
  }, [apply]);

  return (
    <div className="max-w-4xl space-y-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-gray-900">AI Settings</h1>
        <p className="text-[11px] text-gray-400 mt-0.5">
          Choose the providers and models used for text and image generation across the whole workspace. Only admins can change these settings; they apply to every user.
        </p>
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      {!data && !error && (
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      )}

      {data && (
        <>
          <AIProviderSection
            key={`text-${version}`}
            capability="text"
            catalog={data.catalog}
            saved={data.text}
            effective={data.effective.text}
            compatibilityWarning={data.imageCompatibilityWarning}
            onChanged={reload}
          />
          <AIProviderSection
            key={`image-${version}`}
            capability="image"
            catalog={data.catalog}
            saved={data.image}
            effective={data.effective.image}
            compatibilityWarning={data.imageCompatibilityWarning}
            onChanged={reload}
          />
        </>
      )}

      <Toaster position="top-right" richColors />
    </div>
  );
}
