"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { apiErrorMessage, readJson } from "@/lib/read-json";
import { AlertTriangle, CheckCircle2, KeyRound, Loader2, RotateCcw, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ─── Types mirroring GET /api/settings/ai-providers ──────────────────────────

export type Capability = "text" | "image";

export interface CatalogProvider {
  id: string;
  label: string;
  supportsText: boolean;
  supportsImage: boolean;
  hasServerKey: boolean;
  textModels: { id: string; label: string; supportsWebSearch: boolean }[];
  imageModels: { id: string; label: string; sizes: string[]; defaultSize: string; maxImages: number }[];
}

export interface SavedConfig {
  provider: string;
  model: string;
  credentialSource: "user" | "env";
  apiKeyHint?: string;
  options: Record<string, unknown>;
  lastValidatedAt?: string;
}

export interface EffectiveConfig {
  provider: string;
  model: string;
  source: "user" | "env" | "default";
  ready: boolean;
  issue?: string;
}

interface Props {
  capability: Capability;
  catalog: CatalogProvider[];
  saved: SavedConfig | null;
  effective: EffectiveConfig;
  compatibilityWarning: { title: string; message: string };
  onChanged: () => void;
}

type Status = { kind: "success" | "error"; message: string } | null;

const COPY: Record<Capability, { title: string; description: string }> = {
  text: {
    title: "Text Generation",
    description: "Used for client research, AI chat, and social / paid copywriting.",
  },
  image: {
    title: "Image Generation",
    description: "Used for AI image creation. Only providers with native image models can be saved.",
  },
};

const SOURCE_LABEL: Record<EffectiveConfig["source"], string> = {
  user: "saved API key",
  env: "server API key",
  default: "server default",
};

export function AIProviderSection({ capability, catalog, saved, effective, compatibilityWarning, onChanged }: Props) {
  const initialProvider = saved?.provider ?? effective.provider;
  const [provider, setProvider] = useState(initialProvider);
  const [selectedModel, setModel] = useState(saved?.model ?? effective.model);
  const [selectedSource, setCredentialSource] = useState<"user" | "env">(
    saved?.credentialSource ?? (catalog.find((p) => p.id === initialProvider)?.hasServerKey ? "env" : "user")
  );
  const [apiKey, setApiKey] = useState("");
  const [selectedSize, setSize] = useState<string>((saved?.options?.size as string) ?? "");
  const [busy, setBusy] = useState<"test" | "save" | "reset" | null>(null);
  const [status, setStatus] = useState<Status>(null);

  // Any edit invalidates the last Test/Save result shown under the form.
  const edit =
    <T,>(setter: (v: T) => void) =>
    (value: T) => {
      setter(value);
      setStatus(null);
    };

  const providerInfo = catalog.find((p) => p.id === provider);
  const models = useMemo(
    () => (capability === "text" ? providerInfo?.textModels ?? [] : providerInfo?.imageModels ?? []),
    [capability, providerInfo]
  );

  // Derived rather than synced via effects: the selection always stays valid
  // for the current provider / model / server-key availability.
  const model = models.some((m) => m.id === selectedModel) ? selectedModel : models[0]?.id ?? "";
  const imageModel = capability === "image" ? providerInfo?.imageModels.find((m) => m.id === model) : undefined;
  const size = imageModel && !imageModel.sizes.includes(selectedSize) ? imageModel.defaultSize : selectedSize;
  const credentialSource = selectedSource === "env" && !providerInfo?.hasServerKey ? "user" : selectedSource;

  // A provider (or model) with no native image generation, e.g. Claude.
  const imageIncompatible = capability === "image" && (!providerInfo?.supportsImage || !imageModel);
  // A saved key can only be reused for the provider it was saved for.
  const canReuseSavedKey = saved?.credentialSource === "user" && saved.provider === provider;

  const needsKey = credentialSource === "user" && !apiKey.trim() && !canReuseSavedKey;
  const canSubmit = !imageIncompatible && !!model && !needsKey && !busy;

  const payload = () => ({
    provider,
    model,
    credentialSource,
    ...(credentialSource === "user" && apiKey.trim() ? { apiKey: apiKey.trim() } : {}),
    ...(capability === "image" ? { options: { size } } : {}),
  });

  async function submit(kind: "test" | "save") {
    setBusy(kind);
    setStatus(null);
    try {
      const res = await fetch(
        kind === "test" ? `/api/settings/ai-providers/${capability}/test` : `/api/settings/ai-providers/${capability}`,
        { method: kind === "test" ? "POST" : "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload()) }
      );
      const data = await readJson<{ error?: string }>(res);
      if (!res.ok) {
        setStatus({ kind: "error", message: apiErrorMessage(res, data, "Request failed") });
        return;
      }
      if (kind === "test") {
        setStatus({ kind: "success", message: "Connection successful — credentials and model are valid." });
      } else {
        setApiKey("");
        setStatus({ kind: "success", message: "Saved. New requests will use this configuration." });
        toast.success(`${COPY[capability].title} settings saved`);
        onChanged();
      }
    } catch {
      setStatus({ kind: "error", message: "Network error — please try again." });
    } finally {
      setBusy(null);
    }
  }

  async function reset() {
    setBusy("reset");
    setStatus(null);
    try {
      const res = await fetch(`/api/settings/ai-providers/${capability}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      setApiKey("");
      toast.success(`${COPY[capability].title} reset to server defaults`);
      onChanged();
    } catch {
      setStatus({ kind: "error", message: "Could not reset settings." });
    } finally {
      setBusy(null);
    }
  }

  const effectiveProviderLabel = catalog.find((p) => p.id === effective.provider)?.label ?? effective.provider;

  return (
    <section className="bg-white border border-gray-100 rounded-xl p-5 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">{COPY[capability].title}</h2>
          <p className="text-[11px] text-gray-400 mt-0.5">{COPY[capability].description}</p>
        </div>
        <div
          className={`text-[11px] px-2.5 py-1 rounded-md border shrink-0 ${
            effective.ready
              ? "bg-indigo-50 border-indigo-100 text-indigo-700"
              : "bg-amber-50 border-amber-200 text-amber-800"
          }`}
          title={effective.issue}
        >
          Active: {effectiveProviderLabel} · {effective.model}{" "}
          <span className="opacity-70">({SOURCE_LABEL[effective.source]})</span>
          {!effective.ready && <span className="block">{effective.issue}</span>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-xs">Provider</Label>
          <Select value={provider} onValueChange={edit(setProvider)}>
            <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {catalog
                .filter((p) => (capability === "text" ? p.supportsText : true))
                .map((p) => (
                  <SelectItem key={p.id} value={p.id} className="text-xs">
                    {p.label}
                    {capability === "image" && !p.supportsImage ? " (text only)" : ""}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Model</Label>
          <Select value={models.some((m) => m.id === model) ? model : ""} onValueChange={edit(setModel)} disabled={!models.length}>
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder={models.length ? "Select a model" : "No supported models"} />
            </SelectTrigger>
            <SelectContent>
              {models.map((m) => (
                <SelectItem key={m.id} value={m.id} className="text-xs">{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {imageModel && (
          <div className="space-y-1.5">
            <Label className="text-xs">Default image size</Label>
            <Select value={size} onValueChange={edit(setSize)}>
              <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {imageModel.sizes.map((s) => (
                  <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {imageIncompatible && (
        <div role="alert" className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-900">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <div>
            <p className="text-xs font-semibold">{compatibilityWarning.title}</p>
            <p className="text-[11px] mt-1 leading-relaxed">{compatibilityWarning.message}</p>
          </div>
        </div>
      )}

      {!imageIncompatible && (
        <div className="space-y-2">
          <Label className="text-xs">API key</Label>
          <div className="flex flex-wrap gap-4 text-xs text-gray-700">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={credentialSource === "user"}
                onChange={() => edit(setCredentialSource)("user")}
              />
              Enter an API key
            </label>
            <label
              className={`flex items-center gap-2 ${providerInfo?.hasServerKey ? "cursor-pointer" : "opacity-50 cursor-not-allowed"}`}
              title={providerInfo?.hasServerKey ? undefined : "No server key is configured for this provider"}
            >
              <input
                type="radio"
                checked={credentialSource === "env"}
                disabled={!providerInfo?.hasServerKey}
                onChange={() => edit(setCredentialSource)("env")}
              />
              Use server .env key {providerInfo?.hasServerKey ? "" : "(not configured)"}
            </label>
          </div>

          {credentialSource === "user" && (
            <div className="relative max-w-md">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              <Input
                type="password"
                autoComplete="off"
                spellCheck={false}
                value={apiKey}
                onChange={(e) => edit(setApiKey)(e.target.value)}
                placeholder={
                  canReuseSavedKey
                    ? `Saved key ${saved?.apiKeyHint ?? ""} — leave blank to keep it`
                    : `Enter a ${providerInfo?.label ?? ""} API key`
                }
                className="pl-8 h-9 text-xs"
              />
            </div>
          )}
          <p className="text-[11px] text-gray-400">
            Keys are verified with the provider, encrypted on the server, and never shown again.
          </p>
        </div>
      )}

      {status && (
        <div
          className={`flex items-center gap-2 text-xs ${status.kind === "success" ? "text-green-700" : "text-red-600"}`}
          role="status"
        >
          {status.kind === "success" ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
          {status.message}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 pt-1">
        <Button size="sm" variant="outline" disabled={!canSubmit} onClick={() => submit("test")}>
          {busy === "test" && <Loader2 className="animate-spin" />} Test connection
        </Button>
        <Button size="sm" disabled={!canSubmit} onClick={() => submit("save")}>
          {busy === "save" && <Loader2 className="animate-spin" />} Save
        </Button>
        {saved && (
          <Button size="sm" variant="ghost" disabled={!!busy} onClick={reset} className="text-gray-500">
            {busy === "reset" ? <Loader2 className="animate-spin" /> : <RotateCcw />} Reset to defaults
          </Button>
        )}
      </div>
    </section>
  );
}
