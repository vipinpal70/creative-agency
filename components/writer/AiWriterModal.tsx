"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { TextShimmerWave } from "@/components/ui/aiLoading";
import { Sparkles, Loader2, X, ArrowUp } from "lucide-react";
import { apiErrorMessage, readJson } from "@/lib/read-json";

// Kept in sync with ContentCategory in lib/ai/writer/generate-copy.ts.
// Defined locally (not imported) so this client component doesn't pull
// server-only AI code into the browser bundle.
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

// Snapshot of one AI result, stored per chat turn so the transcript can show
// what the AI actually produced (not just "updated ✓").
interface ResultSnapshot {
  copy: string;
  caption: string;
  hashtags: string[];
  frames: AiCarouselFrame[];
}

// One exchange in the refine conversation: the writer's instruction and the
// result the AI returned for it.
interface ChatTurn {
  instruction: string;
  result: ResultSnapshot;
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

// Hashtags are edited as free text so the writer can type spaces; they are
// only split into an array when sent to the API or pushed.
function parseHashtags(text: string): string[] {
  return text.split(/\s+/).filter(Boolean);
}

// Read-only rendering of a past turn's result in the transcript.
function ResultPreview({ result }: { result: ResultSnapshot }) {
  return (
    <div className="space-y-1.5 text-sm text-foreground whitespace-pre-wrap">
      {result.frames.length > 0 ? (
        result.frames.map((f) => (
          <p key={f.frameNo}>
            <span className="text-xs font-semibold text-muted-foreground">
              Frame {f.frameNo}:{" "}
            </span>
            {f.copy}
          </p>
        ))
      ) : (
        result.copy && <p>{result.copy}</p>
      )}
      {result.caption && (
        <p className="text-muted-foreground">{result.caption}</p>
      )}
      {result.hashtags.length > 0 && (
        <p className="text-emerald-600">{result.hashtags.join(" ")}</p>
      )}
    </div>
  );
}

// Editable rendering of the latest result — bound to the modal's live state.
// Defined at module level (not inside the modal) so React keeps the same
// textarea elements between keystrokes and focus isn't lost while typing.
function EditableResult({
  isCarousel,
  frames,
  onFrameChange,
  copy,
  onCopyChange,
  caption,
  onCaptionChange,
  hashtagsText,
  onHashtagsChange,
}: {
  isCarousel: boolean;
  frames: AiCarouselFrame[];
  onFrameChange: (frameNo: number, value: string) => void;
  copy: string;
  onCopyChange: (value: string) => void;
  caption: string;
  onCaptionChange: (value: string) => void;
  hashtagsText: string;
  onHashtagsChange: (value: string) => void;
}) {
  return (
    <div className="space-y-3">
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
                onChange={(e) => onFrameChange(f.frameNo, e.target.value)}
                rows={3}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-1.5">
          <label className={LABEL}>Copy</label>
          <Textarea value={copy} onChange={(e) => onCopyChange(e.target.value)} rows={4} />
        </div>
      )}
      <div className="space-y-1.5">
        <label className={LABEL}>Caption</label>
        <Textarea value={caption} onChange={(e) => onCaptionChange(e.target.value)} rows={3} />
      </div>
      <div className="space-y-1.5">
        <label className={LABEL}>Hashtags</label>
        <Textarea
          value={hashtagsText}
          onChange={(e) => onHashtagsChange(e.target.value)}
          rows={2}
          placeholder="#brand #campaign"
        />
      </div>
    </div>
  );
}

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

  // Live, editable copy of the latest result — what Push sends.
  const [copy, setCopy] = useState("");
  const [caption, setCaption] = useState("");
  const [hashtagsText, setHashtagsText] = useState("");
  const [frames, setFrames] = useState<AiCarouselFrame[]>([]);

  const isCarousel = category === "carousel";

  // Refine chat: once there's a first result, the writer keeps the conversation
  // going — each turn edits the existing copy instead of starting over.
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
      copy: data.copy || "",
      caption: data.caption || "",
      hashtags: Array.isArray(data.hashtags) ? data.hashtags : [],
      frames: Array.isArray(data.frames)
        ? data.frames.map((f: any, i: number) => ({
            frameNo: typeof f?.frameNo === "number" ? f.frameNo : i + 1,
            copy: typeof f?.copy === "string" ? f.copy : "",
          }))
        : [],
    };
  }

  function applyResult(result: ResultSnapshot) {
    setCopy(result.copy);
    setCaption(result.caption);
    setHashtagsText(result.hashtags.join(" "));
    setFrames(result.frames);
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

  // Refine: send the current (possibly hand-edited) content plus the writer's
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
      const res = await fetch(`/api/clients/${clientId}/ai/copywriting`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          selectedContext,
          mode: "refine",
          instruction,
          existing: isCarousel
            ? { caption, hashtags: parseHashtags(hashtagsText), frames }
            : { copy, caption, hashtags: parseHashtags(hashtagsText) },
          ...(isCarousel ? { frameCount } : {}),
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
        hashtags: parseHashtags(hashtagsText),
        ...(isCarousel ? { frames } : {}),
      });
      onClose();
    } catch (err: any) {
      setError(err.message || "Something went wrong saving the copy.");
    } finally {
      setPushing(false);
    }
  }

  const categoryLabel =
    CATEGORY_OPTIONS.find((o) => o.value === category)?.label ?? category;

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

        {/* Setup phase — configure, then generate the first draft */}
        {!hasResult ? (
          <>
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
                    Writing your copy…
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
                {categoryLabel}
              </span>
              {isCarousel && (
                <span className="rounded-full bg-muted px-2 py-0.5">
                  {frameCount} frames
                </span>
              )}
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
                            isCarousel={isCarousel}
                            frames={frames}
                            onFrameChange={updateFrame}
                            copy={copy}
                            onCopyChange={setCopy}
                            caption={caption}
                            onCaptionChange={setCaption}
                            hashtagsText={hashtagsText}
                            onHashtagsChange={setHashtagsText}
                          />
                        ) : (
                          <ResultPreview result={turn.result} />
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
                        Revising your copy…
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
                  placeholder="Ask for another change… (e.g. make it punchier, add a CTA)"
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
                  "Push to Copy"
                )}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
