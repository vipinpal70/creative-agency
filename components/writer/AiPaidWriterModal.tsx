"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { TextShimmerWave } from "@/components/ui/aiLoading";
import { Sparkles, Loader2, X, ArrowUp } from "lucide-react";
import type { AdPlatform } from "./types";
import { apiErrorMessage, readJson } from "@/lib/read-json";

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

// Snapshot of one AI result, stored per chat turn so the transcript can show
// what the AI actually produced (not just "updated ✓").
interface ResultSnapshot {
  adCopy: string;
  headlines: string[];
  primaryTexts: string[];
  longHeadline: string;
  descriptions: string[];
}

// One exchange in the refine conversation: the writer's instruction and the
// result the AI returned for it.
interface ChatTurn {
  instruction: string;
  result: ResultSnapshot;
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

// Read-only rendering of a past turn's result in the transcript.
function ResultPreview({ result, isGoogle }: { result: ResultSnapshot; isGoogle: boolean }) {
  const body = isGoogle ? result.descriptions : result.primaryTexts;
  return (
    <div className="space-y-2 text-sm text-foreground whitespace-pre-wrap">
      {result.adCopy && <p>{result.adCopy}</p>}
      {result.headlines.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground">Headlines</p>
          <p>{result.headlines.join("\n")}</p>
        </div>
      )}
      {isGoogle && result.longHeadline && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground">Long headline</p>
          <p>{result.longHeadline}</p>
        </div>
      )}
      {body.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground">
            {isGoogle ? "Descriptions" : "Primary text"}
          </p>
          <p>{body.join("\n")}</p>
        </div>
      )}
    </div>
  );
}

interface EditableResultProps {
  isGoogle: boolean;
  adCopy: string;
  onAdCopyChange: (v: string) => void;
  headlines: string[];
  onHeadlinesChange: (v: string[]) => void;
  longHeadline: string;
  onLongHeadlineChange: (v: string) => void;
  descriptions: string[];
  onDescriptionsChange: (v: string[]) => void;
  primaryTexts: string[];
  onPrimaryTextsChange: (v: string[]) => void;
}

// Editable rendering of the latest result — bound to the modal's live state.
// Defined at module level (not inside the modal) so React keeps the same
// textarea elements between keystrokes and focus isn't lost while typing.
function EditableResult(p: EditableResultProps) {
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <label className={LABEL}>Copy</label>
        <Textarea value={p.adCopy} onChange={(e) => p.onAdCopyChange(e.target.value)} rows={2} />
      </div>
      {p.isGoogle ? (
        <>
          <ArrayField label="Headlines" values={p.headlines} onChange={p.onHeadlinesChange} rows={4} />
          <div className="space-y-1.5">
            <label className={LABEL}>Long headline</label>
            <Textarea
              value={p.longHeadline}
              onChange={(e) => p.onLongHeadlineChange(e.target.value)}
              rows={2}
            />
          </div>
          <ArrayField
            label="Descriptions"
            values={p.descriptions}
            onChange={p.onDescriptionsChange}
            rows={4}
          />
        </>
      ) : (
        <>
          <ArrayField
            label="Primary text"
            values={p.primaryTexts}
            onChange={p.onPrimaryTextsChange}
            rows={5}
          />
          <ArrayField label="Headlines" values={p.headlines} onChange={p.onHeadlinesChange} rows={4} />
        </>
      )}
    </div>
  );
}

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

  // Live, editable copy of the latest result — what Push sends.
  const [adCopy, setAdCopy] = useState("");
  const [headlines, setHeadlines] = useState<string[]>([]);
  const [primaryTexts, setPrimaryTexts] = useState<string[]>([]);
  const [longHeadline, setLongHeadline] = useState("");
  const [descriptions, setDescriptions] = useState<string[]>([]);

  const isGoogle = adPlatform === "google";

  // Refine chat: once there's a first result, the writer keeps the conversation
  // going — each turn edits the existing ad copy instead of starting over.
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [feedback, setFeedback] = useState("");
  // The instruction currently in flight, shown optimistically as a user bubble
  // alongside the shimmer while the AI responds.
  const [pendingInstruction, setPendingInstruction] = useState<string | null>(null);

  const [generating, setGenerating] = useState(false);
  const [pushing, setPushing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasResult = turns.length > 0;

  // Auto-scroll the transcript to the newest message as it grows.
  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns.length, pendingInstruction, generating]);

  function toggleContext(key: ContextKey) {
    setSelectedContext((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  }

  function normalizeResult(data: any): ResultSnapshot {
    return {
      adCopy: data.adCopy || "",
      headlines: Array.isArray(data.headlines) ? data.headlines : [],
      primaryTexts: Array.isArray(data.primaryTexts) ? data.primaryTexts : [],
      longHeadline: data.longHeadline || "",
      descriptions: Array.isArray(data.descriptions) ? data.descriptions : [],
    };
  }

  function applyResult(result: ResultSnapshot) {
    setAdCopy(result.adCopy);
    setHeadlines(result.headlines);
    setPrimaryTexts(result.primaryTexts);
    setLongHeadline(result.longHeadline);
    setDescriptions(result.descriptions);
  }

  async function handleGenerate() {
    if (generating) return;
    if (!customPrompt.trim()) {
      setError("Describe what you want the AI to create first.");
      return;
    }
    setError(null);
    setGenerating(true);
    setPendingInstruction(customPrompt.trim());
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
      const data = await readJson(res);
      if (!res.ok) throw new Error(apiErrorMessage(res, data, "Generation failed"));

      const result = normalizeResult(data);
      applyResult(result);
      setTurns([{ instruction: customPrompt.trim(), result }]);
    } catch (err: any) {
      setError(err.message || "Something went wrong generating content.");
    } finally {
      setGenerating(false);
      setPendingInstruction(null);
    }
  }

  // Refine: send the current (possibly hand-edited) ad copy plus the writer's
  // feedback so the AI revises it in place rather than starting over.
  async function handleRefine() {
    if (generating) return;
    const instruction = feedback.trim();
    if (!instruction) {
      setError("Type what you'd like to change.");
      return;
    }
    setError(null);
    setGenerating(true);
    setPendingInstruction(instruction);
    setFeedback("");
    try {
      const res = await fetch(`/api/clients/${clientId}/ai/paid-copywriting`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adPlatform,
          mediaType,
          selectedContext,
          mode: "refine",
          instruction,
          existing: isGoogle
            ? { adCopy, headlines, longHeadline, descriptions }
            : { adCopy, headlines, primaryTexts },
        }),
      });
      const data = await readJson(res);
      if (!res.ok) throw new Error(apiErrorMessage(res, data, "Refine failed"));

      const result = normalizeResult(data);
      applyResult(result);
      setTurns((prev) => [...prev, { instruction, result }]);
    } catch (err: any) {
      setError(err.message || "Something went wrong refining content.");
      setFeedback(instruction); // restore so the writer doesn't lose their text
    } finally {
      setGenerating(false);
      setPendingInstruction(null);
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

  const platformLabel =
    PLATFORM_OPTIONS.find((o) => o.value === adPlatform)?.label ?? adPlatform;

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

        {/* Setup phase — configure, then generate the first draft */}
        {!hasResult ? (
          <>
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
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleGenerate();
                  }}
                />
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              {generating ? (
                <div className="flex items-center gap-2 py-1">
                  <Sparkles className="h-4 w-4 text-emerald-600" />
                  <TextShimmerWave className="text-sm font-medium">
                    Writing your ad copy…
                  </TextShimmerWave>
                </div>
              ) : (
                <Button
                  onClick={handleGenerate}
                  disabled={generating || pushing}
                  className="bg-green-700 text-white hover:bg-green-800 transition-colors"
                >
                  <Sparkles className="h-4 w-4 mr-1.5" /> Generate with AI
                </Button>
              )}
            </div>

            {/* Footer — pinned */}
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border flex-shrink-0">
              <Button variant="outline" onClick={onClose} disabled={pushing}>
                Cancel
              </Button>
            </div>
          </>
        ) : (
          /* Chat phase — iterate on the draft conversationally */
          <>
            {/* Collapsed config summary */}
            <div className="flex flex-wrap items-center gap-1.5 px-6 py-2.5 border-b border-border flex-shrink-0 text-xs text-muted-foreground">
              <span className="rounded-full bg-primary/10 text-primary px-2 py-0.5 font-medium">
                {platformLabel}
              </span>
              <span className="rounded-full bg-muted px-2 py-0.5">{mediaType}</span>
              {selectedContext.length > 0 && (
                <span className="rounded-full bg-muted px-2 py-0.5">
                  {selectedContext.length} context{selectedContext.length > 1 ? "s" : ""}
                </span>
              )}
            </div>

            {/* Transcript — scrollable */}
            <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1 min-h-0">
              {turns.map((turn, i) => {
                const isLatest = i === turns.length - 1;
                return (
                  <div key={i} className="space-y-3">
                    {/* User bubble */}
                    <div className="flex justify-end">
                      <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-primary/10 text-foreground px-3.5 py-2 text-sm whitespace-pre-wrap">
                        {turn.instruction}
                      </div>
                    </div>
                    {/* Assistant bubble */}
                    <div className="flex justify-start">
                      <div className="max-w-[92%] w-full rounded-2xl rounded-bl-sm border border-border bg-muted/40 px-3.5 py-3">
                        <div className="flex items-center gap-1.5 mb-2 text-xs font-semibold text-emerald-600">
                          <Sparkles className="h-3.5 w-3.5" />
                          {isLatest ? "Latest draft — edit before pushing" : "Draft"}
                        </div>
                        {isLatest ? (
                          <EditableResult
                            isGoogle={isGoogle}
                            adCopy={adCopy}
                            onAdCopyChange={setAdCopy}
                            headlines={headlines}
                            onHeadlinesChange={setHeadlines}
                            longHeadline={longHeadline}
                            onLongHeadlineChange={setLongHeadline}
                            descriptions={descriptions}
                            onDescriptionsChange={setDescriptions}
                            primaryTexts={primaryTexts}
                            onPrimaryTextsChange={setPrimaryTexts}
                          />
                        ) : (
                          <ResultPreview result={turn.result} isGoogle={isGoogle} />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* In-flight turn */}
              {generating && pendingInstruction && (
                <div className="space-y-3">
                  <div className="flex justify-end">
                    <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-primary/10 text-foreground px-3.5 py-2 text-sm whitespace-pre-wrap">
                      {pendingInstruction}
                    </div>
                  </div>
                  <div className="flex justify-start">
                    <div className="rounded-2xl rounded-bl-sm border border-border bg-muted/40 px-3.5 py-3 flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-emerald-600" />
                      <TextShimmerWave className="text-sm font-medium">
                        Revising your ad copy…
                      </TextShimmerWave>
                    </div>
                  </div>
                </div>
              )}

              {error && <p className="text-sm text-red-600">{error}</p>}
              <div ref={bottomRef} />
            </div>

            {/* Composer — pinned */}
            <div className="px-6 py-3 border-t border-border flex-shrink-0">
              <div className="flex items-end gap-2 rounded-xl border border-border bg-background p-1.5 focus-within:border-primary/50 transition-colors">
                <Textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  rows={1}
                  placeholder="Ask for another change… (e.g. shorter headlines, lead with the offer)"
                  className="flex-1 border-0 focus-visible:ring-0 shadow-none resize-none min-h-0 py-1.5"
                  disabled={generating}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      if (!generating && feedback.trim()) handleRefine();
                    }
                  }}
                />
                <Button
                  onClick={handleRefine}
                  disabled={generating || pushing || !feedback.trim()}
                  size="icon"
                  className="bg-green-700 text-white hover:bg-green-800 transition-colors shrink-0 h-8 w-8 rounded-lg"
                >
                  {generating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowUp className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground mt-1.5 px-1">
                Enter to send · Shift+Enter for a new line
              </p>
            </div>

            {/* Footer — pinned */}
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border flex-shrink-0">
              <Button variant="outline" onClick={onClose} disabled={pushing}>
                Cancel
              </Button>
              <Button
                onClick={handlePush}
                disabled={pushing || generating}
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
          </>
        )}
      </div>
    </div>
  );
}
