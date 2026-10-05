"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Loader2, X } from "lucide-react";

// Kept in sync with ContentCategory in lib/ai/writer/generate-copy.ts.
// Defined locally (not imported) so this client component doesn't pull in the
// server-only Anthropic SDK that module instantiates at load.
export type ContentCategory = "reel" | "static_image" | "carousel" | "article";

// One slide of a carousel — mirrors CarouselFrame used across the copy UI.
export interface AiCarouselFrame {
  frameNo: number;
  copy: string;
}

// Matches CopywritingContextKey in lib/ai/context/context-selector.ts.
type ContextKey =
  | "businessAnalysis"
  | "competitors"
  | "sources"
  | "differentiationOpportunities"
  | "verifiedFacts";

export interface AiPushPayload {
  category: ContentCategory;
  copy: string;
  caption: string;
  hashtags: string[];
  // Present only for carousel — one entry per slide, in order.
  frames?: AiCarouselFrame[];
}

const CATEGORY_OPTIONS: { value: ContentCategory; label: string }[] = [
  { value: "reel", label: "Reel" },
  { value: "static_image", label: "Static / Image" },
  { value: "carousel", label: "Carousel" },
  { value: "article", label: "Article / Blog" },
];

// Frame-count choices for carousel — mirrors CopyEntryForm's selector.
const FRAME_COUNT_OPTIONS = [2, 3, 4, 5, 6, 7, 8, 9, 10];

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
  // Creates a brand-new copy (deliverable + draft) from the reviewed AI output.
  // Owned by the workspace so the new copy lands in the same calendar the writer
  // is working in and shows up in the list. Throws on failure.
  onPushToCopy: (payload: AiPushPayload) => Promise<void>;
  onClose: () => void;
}

export function AiWriterModal({ clientId, onPushToCopy, onClose }: Props) {
  const [category, setCategory] = useState<ContentCategory>("reel");
  const [frameCount, setFrameCount] = useState(3);
  const [selectedContext, setSelectedContext] = useState<ContextKey[]>([
    "businessAnalysis",
  ]);
  const [customPrompt, setCustomPrompt] = useState("");

  const [copy, setCopy] = useState("");
  const [caption, setCaption] = useState("");
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [frames, setFrames] = useState<AiCarouselFrame[]>([]);
  const [hasResult, setHasResult] = useState(false);

  const isCarousel = category === "carousel";

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
      const res = await fetch(`/api/clients/${clientId}/ai/copywriting`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          selectedContext,
          customPrompt,
          ...(isCarousel ? { frameCount } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed");

      setCopy(data.copy || "");
      setCaption(data.caption || "");
      setHashtags(Array.isArray(data.hashtags) ? data.hashtags : []);
      setFrames(
        Array.isArray(data.frames)
          ? data.frames.map((f: any, i: number) => ({
              frameNo: typeof f?.frameNo === "number" ? f.frameNo : i + 1,
              copy: typeof f?.copy === "string" ? f.copy : "",
            }))
          : []
      );
      setHasResult(true);
    } catch (err: any) {
      setError(err.message || "Something went wrong generating content.");
    } finally {
      setGenerating(false);
    }
  }

  function updateFrame(frameNo: number, value: string) {
    setFrames((prev) =>
      prev.map((f) => (f.frameNo === frameNo ? { ...f, copy: value } : f))
    );
  }

  async function handlePush() {
    const hasFrameCopy = frames.some((f) => f.copy.trim());
    if (isCarousel ? !hasFrameCopy : !copy.trim() && !caption.trim()) {
      setError("Nothing to push yet — generate content first.");
      return;
    }
    setError(null);
    setPushing(true);
    try {
      await onPushToCopy({
        category,
        copy,
        caption,
        hashtags,
        ...(isCarousel ? { frames } : {}),
      });
      onClose();
    } catch (err: any) {
      setError(err.message || "Something went wrong saving the copy.");
    } finally {
      setPushing(false);
    }
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
              Generate copy, caption and hashtags, then push them to a new copy.
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
          {/* Category */}
          <div className="space-y-2">
            <label className={LABEL}>Content type *</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setCategory(opt.value)}
                  className={`text-sm px-3 py-1.5 rounded-full border transition-colors ${
                    category === opt.value
                      ? "border-primary bg-primary/10 text-primary font-medium"
                      : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Frame count — carousel only */}
          {isCarousel && (
            <div className="space-y-2">
              <label className={LABEL}>Number of frames *</label>
              <select
                value={frameCount}
                onChange={(e) => setFrameCount(Number(e.target.value))}
                className="text-sm px-3 py-1.5 rounded-lg border border-border bg-background text-foreground"
              >
                {FRAME_COUNT_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    {n} frames
                  </option>
                ))}
              </select>
            </div>
          )}

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
              placeholder='e.g. "Create an engaging reel about the benefits of digital dentistry for dental practices."'
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
              {isCarousel ? (
                <div className="space-y-3">
                  <label className={LABEL}>Frames ({frames.length})</label>
                  {frames.map((f) => (
                    <div key={f.frameNo} className="space-y-1">
                      <span className="text-xs font-medium text-muted-foreground">
                        Frame {f.frameNo}
                      </span>
                      <Textarea
                        value={f.copy}
                        onChange={(e) => updateFrame(f.frameNo, e.target.value)}
                        rows={3}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-1.5">
                  <label className={LABEL}>Copy</label>
                  <Textarea value={copy} onChange={(e) => setCopy(e.target.value)} rows={4} />
                </div>
              )}
              <div className="space-y-1.5">
                <label className={LABEL}>Caption</label>
                <Textarea value={caption} onChange={(e) => setCaption(e.target.value)} rows={3} />
              </div>
              <div className="space-y-1.5">
                <label className={LABEL}>Hashtags</label>
                <Textarea
                  value={hashtags.join(" ")}
                  onChange={(e) => setHashtags(e.target.value.split(/\s+/).filter(Boolean))}
                  rows={2}
                />
              </div>
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
              "Push to Copy"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
