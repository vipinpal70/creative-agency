"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Loader2, X } from "lucide-react";
import type { AdPlatform } from "./types";

// Paid-media creative format — mirrors VARIANT_MEDIA_TYPES in VariantModal.tsx.
export type PaidMediaType = "Static" | "Carousel" | "Video";

// Matches CopywritingContextKey in lib/ai/context/context-selector.ts.
type ContextKey =
  | "businessAnalysis"
  | "competitors"
  | "sources"
  | "differentiationOpportunities"
  | "verifiedFacts";

// What the modal hands back to the workspace to create a new ad copy.
export interface AiPaidPushPayload {
  adPlatform: AdPlatform;
  mediaType: PaidMediaType;
  adCopy: string;
  headlines: string[];
  // Meta only.
  primaryTexts: string[];
  // Google only.
  longHeadline: string;
  descriptions: string[];
}

const PLATFORM_OPTIONS: { value: AdPlatform; label: string }[] = [
  { value: "meta", label: "Meta" },
  { value: "google", label: "Google" },
];

const MEDIA_OPTIONS: { value: PaidMediaType; label: string }[] = [
  { value: "Static", label: "Static" },
  { value: "Carousel", label: "Carousel" },
  { value: "Video", label: "Video" },
];

const CONTEXT_OPTIONS: { value: ContextKey; label: string }[] = [
  { value: "businessAnalysis", label: "Business analysis" },
  { value: "competitors", label: "Competitor analysis" },
  { value: "sources", label: "Sources" },
  { value: "differentiationOpportunities", label: "Differentiation opportunities" },
  { value: "verifiedFacts", label: "Verified facts" },
];

const LABEL = "text-xs font-semibold text-muted-foreground uppercase tracking-wider";

interface Props {
  clientId: string;
  // Creates a brand-new ad copy (deliverable + draft) from the reviewed AI
  // output. Owned by the workspace so the new copy inherits the campaign's
  // platforms and shows up in the list. Throws on failure.
  onPushToCopy: (payload: AiPaidPushPayload) => Promise<void>;
  onClose: () => void;
}

export function AiPaidWriterModal({ clientId, onPushToCopy, onClose }: Props) {
  const [adPlatform, setAdPlatform] = useState<AdPlatform>("meta");
  const [mediaType, setMediaType] = useState<PaidMediaType>("Static");
  const [selectedContext, setSelectedContext] = useState<ContextKey[]>([
    "businessAnalysis",
  ]);
  const [customPrompt, setCustomPrompt] = useState("");

  const [adCopy, setAdCopy] = useState("");
  const [headlines, setHeadlines] = useState<string[]>([]);
  const [primaryTexts, setPrimaryTexts] = useState<string[]>([]);
  const [longHeadline, setLongHeadline] = useState("");
  const [descriptions, setDescriptions] = useState<string[]>([]);
  const [hasResult, setHasResult] = useState(false);

  const isGoogle = adPlatform === "google";

  const [generating, setGenerating] = useState(false);
  const [pushing, setPushing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleContext(key: ContextKey) {
    setSelectedContext((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  }

  async function handleGenerate() {
    if (!customPrompt.trim()) {
      setError("Describe what you want the AI to create first.");
      return;
    }
    setError(null);
    setGenerating(true);
    try {
      const res = await fetch(`/api/clients/${clientId}/ai/paid-copywriting`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adPlatform,
          mediaType,
          selectedContext,
          customPrompt,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed");

      setAdCopy(data.adCopy || "");
      setHeadlines(Array.isArray(data.headlines) ? data.headlines : []);
      setPrimaryTexts(Array.isArray(data.primaryTexts) ? data.primaryTexts : []);
      setLongHeadline(data.longHeadline || "");
      setDescriptions(Array.isArray(data.descriptions) ? data.descriptions : []);
      setHasResult(true);
    } catch (err: any) {
      setError(err.message || "Something went wrong generating content.");
    } finally {
      setGenerating(false);
    }
  }

  async function handlePush() {
    const hasHeadline = headlines.some((h) => h.trim());
    const hasBody = isGoogle
      ? descriptions.some((d) => d.trim())
      : primaryTexts.some((t) => t.trim());
    if (!adCopy.trim() || !hasHeadline || !hasBody) {
      setError("Nothing to push yet — generate content first.");
      return;
    }
    setError(null);
    setPushing(true);
    try {
      await onPushToCopy({
        adPlatform,
        mediaType,
        adCopy,
        headlines: headlines.filter((h) => h.trim()),
        primaryTexts: isGoogle ? [] : primaryTexts.filter((t) => t.trim()),
        longHeadline: isGoogle ? longHeadline : "",
        descriptions: isGoogle ? descriptions.filter((d) => d.trim()) : [],
      });
      onClose();
    } catch (err: any) {
      setError(err.message || "Something went wrong saving the ad copy.");
    } finally {
      setPushing(false);
    }
  }

  // Editable multi-line field for an array of variations (one per line).
  function ArrayField({
    label,
    values,
    onChange,
    rows,
  }: {
    label: string;
    values: string[];
    onChange: (v: string[]) => void;
    rows: number;
  }) {
    return (
      <div className="space-y-1.5">
        <label className={LABEL}>{label}</label>
        <Textarea
          value={values.join("\n")}
          onChange={(e) => onChange(e.target.value.split("\n"))}
          rows={rows}
        />
        <p className="text-[11px] text-muted-foreground">One per line.</p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-background rounded-xl border border-border w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header — pinned */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <div>
            <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-emerald-600" /> Write with AI
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Generate ad copy for the selected platform, then push it to a new ad copy.
            </p>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-accent transition-colors"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        {/* Body — scrollable */}
        <div className="px-6 py-5 space-y-5 overflow-y-auto flex-1 min-h-0">
          {/* Ad platform */}
          <div className="space-y-2">
            <label className={LABEL}>Ad platform *</label>
            <div className="flex flex-wrap gap-2">
              {PLATFORM_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setAdPlatform(opt.value)}
                  className={`text-sm px-3 py-1.5 rounded-full border transition-colors ${
                    adPlatform === opt.value
                      ? "border-primary bg-primary/10 text-primary font-medium"
                      : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Media type */}
          <div className="space-y-2">
            <label className={LABEL}>Media type *</label>
            <div className="flex flex-wrap gap-2">
              {MEDIA_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setMediaType(opt.value)}
                  className={`text-sm px-3 py-1.5 rounded-full border transition-colors ${
                    mediaType === opt.value
                      ? "border-primary bg-primary/10 text-primary font-medium"
                      : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Context to include */}
          <div className="space-y-2">
            <label className={LABEL}>Context to include</label>
            <div className="flex flex-wrap gap-2">
              {CONTEXT_OPTIONS.map((opt) => {
                const on = selectedContext.includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggleContext(opt.value)}
                    className={`text-sm px-3 py-1.5 rounded-full border transition-colors ${
                      on
                        ? "border-primary bg-primary/10 text-primary font-medium"
                        : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Instructions */}
          <div className="space-y-2">
            <label className={LABEL}>Your instructions *</label>
            <Textarea
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              rows={3}
              placeholder='e.g. "Create a Meta ad promoting our same-day dental implant offer for busy professionals."'
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <Button
            onClick={handleGenerate}
            disabled={generating || pushing}
            className="bg-green-700 text-white hover:bg-green-800 transition-colors"
          >
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Generating…
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-1.5" /> {hasResult ? "Regenerate" : "Generate with AI"}
              </>
            )}
          </Button>

          {/* Result — editable before pushing */}
          {hasResult && (
            <div className="space-y-4 border-t border-border pt-4">
              <div className="space-y-1.5">
                <label className={LABEL}>Copy</label>
                <Textarea value={adCopy} onChange={(e) => setAdCopy(e.target.value)} rows={2} />
              </div>

              {isGoogle ? (
                <>
                  <ArrayField label="Headlines" values={headlines} onChange={setHeadlines} rows={4} />
                  <div className="space-y-1.5">
                    <label className={LABEL}>Long headline</label>
                    <Textarea
                      value={longHeadline}
                      onChange={(e) => setLongHeadline(e.target.value)}
                      rows={2}
                    />
                  </div>
                  <ArrayField
                    label="Descriptions"
                    values={descriptions}
                    onChange={setDescriptions}
                    rows={4}
                  />
                </>
              ) : (
                <>
                  <ArrayField
                    label="Primary text"
                    values={primaryTexts}
                    onChange={setPrimaryTexts}
                    rows={5}
                  />
                  <ArrayField label="Headlines" values={headlines} onChange={setHeadlines} rows={4} />
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer — pinned */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border flex-shrink-0">
          <Button variant="outline" onClick={onClose} disabled={pushing}>
            Cancel
          </Button>
          <Button
            onClick={handlePush}
            disabled={!hasResult || pushing || generating}
            className="bg-green-700 text-white hover:bg-green-800 transition-colors"
          >
            {pushing ? (
              <>
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Pushing…
              </>
            ) : (
              "Push to Ad Copy"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
