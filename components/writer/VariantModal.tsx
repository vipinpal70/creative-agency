"use client";

import { useState, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Save, X, History, ChevronDown, ChevronLeft, ChevronRight, Eye } from "lucide-react";
import { isReelOrVideoType } from "@/lib/status-flow";
import { AdPreviewCard } from "./AdPreviewCard";
import { RepeatableList } from "./RepeatableList";
import type { CopyFormData, CarouselFrame, HistoryEntry } from "./types";
import { VIDEO_TYPE_OPTIONS } from "./types";

// An "ad copy" is a paid-media copy inside a campaign — the paid-media
// counterpart of a social "copy". It reuses the ContentDraft data model:
// primary text → creativeCopy, reference URL → referenceUrl, launch date →
// publishDate, plus paid-only headline / description / cta / landingUrl / adCopy.
// Like the social CopyModal, the creative-authoring fields below the
// Reference URL branch by media type: Carousel gets per-frame copy, Video
// gets a video type + notes block, Static keeps a single primary text box.

export const VARIANT_MEDIA_TYPES = ["Static", "Carousel", "Video"] as const;
export const VARIANT_CTAS = ["Sign Up", "Learn More", "Shop Now", "Get Quote", "Download", "Book Demo"] as const;

export interface VariantModalInitialData {
  mediaType?: string;
  creativeCopy?: string;   // primary text
  frames?: CarouselFrame[];
  referenceUrl?: string;   // reference url
  headline?: string;
  description?: string;
  cta?: string;
  landingUrl?: string;
  adCopy?: string;         // standalone "Copy" field
  primaryTexts?: string[];
  headlines?: string[];
  descriptions?: string[];
  publishDate?: string;    // launch date
  videoType?: string;
  videoNotes?: string;
}

interface Props {
  mode: "create" | "edit";
  index: number;           // 1-based variant number, for the title
  initialData?: VariantModalInitialData;
  historyEndpoint?: string;
  onClose: () => void;
  onSave: (form: CopyFormData) => Promise<void>;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1)   return "just now";
  if (m < 60)  return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7)   return `${d}d ago`;
  return new Date(dateStr).toLocaleString();
}

const ACTION_LABEL: Record<string, string> = {
  created:   "Created ad copy",
  edited:    "Edited",
  submitted: "Submitted for review",
  approved:  "Approved",
  rejected:  "Rejected",
};
const ACTION_COLOR: Record<string, string> = {
  created:   "bg-blue-500",
  edited:    "bg-muted-foreground",
  submitted: "bg-amber-500",
  approved:  "bg-green-500",
  rejected:  "bg-destructive",
};

const LABEL = "text-xs font-semibold text-muted-foreground uppercase tracking-wider";

export function VariantModal({ mode, index, initialData, historyEndpoint, onClose, onSave }: Props) {
  const initFrames: CarouselFrame[] = initialData?.frames?.length
    ? initialData.frames
    : Array.from({ length: 3 }, (_, i) => ({ frameNo: i + 1, copy: "", imageUrl: "" }));

  const [mediaType,    setMediaType]    = useState(initialData?.mediaType ?? "");
  const [referenceUrl, setReferenceUrl] = useState(initialData?.referenceUrl ?? "");
  const [adCopy,       setAdCopy]       = useState(initialData?.adCopy ?? "");
  // Meta-style multi-value fields (up to 5 each). Fall back to the legacy
  // scalar value for drafts created before these were arrays.
  const [primaryTexts, setPrimaryTexts] = useState<string[]>(
    initialData?.primaryTexts?.length ? initialData.primaryTexts
      : initialData?.creativeCopy ? [initialData.creativeCopy] : [""]
  );
  const [headlines,    setHeadlines]    = useState<string[]>(
    initialData?.headlines?.length ? initialData.headlines
      : initialData?.headline ? [initialData.headline] : [""]
  );
  const [descriptions, setDescriptions] = useState<string[]>(
    initialData?.descriptions?.length ? initialData.descriptions
      : initialData?.description ? [initialData.description] : []
  );
  const [cta,          setCta]          = useState(initialData?.cta ?? "Learn More");
  const [landingUrl,   setLandingUrl]   = useState(initialData?.landingUrl ?? "");
  const [launchDate,   setLaunchDate]   = useState(initialData?.publishDate ?? "");
  const [videoType,    setVideoType]    = useState(initialData?.videoType ?? "");
  const [videoNotes,   setVideoNotes]   = useState(initialData?.videoNotes ?? "");
  const [saving,       setSaving]       = useState(false);
  const [showPreview,  setShowPreview]  = useState(false);

  const today = new Date().toLocaleDateString("en-CA");

  // Carousel
  const [frameCount,   setFrameCount]   = useState(initFrames.length);
  const [frames,       setFrames]       = useState<CarouselFrame[]>(initFrames);
  const [currentFrame, setCurrentFrame] = useState(1);

  // ── History ──
  const [history,        setHistory]        = useState<HistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyOpen,    setHistoryOpen]    = useState(false);

  useEffect(() => {
    if (!historyEndpoint) return;
    setHistoryLoading(true);
    fetch(historyEndpoint)
      .then((r) => r.json())
      .then((data) => setHistory(Array.isArray(data) ? data : []))
      .catch(() => setHistory([]))
      .finally(() => setHistoryLoading(false));
  }, [historyEndpoint]);

  // ── Derived ──
  const isCarousel = mediaType.toLowerCase() === "carousel";
  const isVideo     = isReelOrVideoType(mediaType);

  const updateFrame = (frameNo: number, patch: Partial<CarouselFrame>) => {
    setFrames((prev) => {
      const existing = prev.find((f) => f.frameNo === frameNo);
      if (existing) return prev.map((f) => f.frameNo === frameNo ? { ...f, ...patch } : f);
      return [...prev, { frameNo, copy: "", imageUrl: "", ...patch }];
    });
  };

  const getFrame = (frameNo: number): CarouselFrame =>
    frames.find((f) => f.frameNo === frameNo) ?? { frameNo, copy: "", imageUrl: "" };

  const handleMediaTypeChange = (val: string) => {
    setMediaType(val);
    // Only reset creative-authoring state in create mode
    if (mode === "create") {
      setVideoType("");
      setVideoNotes("");
      setFrames(Array.from({ length: 3 }, (_, i) => ({ frameNo: i + 1, copy: "", imageUrl: "" })));
      setFrameCount(3);
      setCurrentFrame(1);
    }
  };

  const carouselFramesFilled = isCarousel
    ? Array.from({ length: frameCount }, (_, i) => getFrame(i + 1)).every((f) => f.copy.trim())
    : true;

  const hasPrimary  = primaryTexts.some((t) => t.trim());
  const hasHeadline = headlines.some((h) => h.trim());

  const isValid =
    mediaType.trim() &&
    adCopy.trim() &&
    (isCarousel ? carouselFramesFilled : true) &&
    hasPrimary &&
    hasHeadline &&
    launchDate;

  const resolvedFrames = isCarousel
    ? Array.from({ length: frameCount }, (_, i) => getFrame(i + 1))
    : undefined;

  const handleSave = async () => {
    if (!isValid || saving) return;
    setSaving(true);
    try {
      const primaryTextsClean = primaryTexts.map((t) => t.trim()).filter(Boolean);
      const headlinesClean    = headlines.map((h) => h.trim()).filter(Boolean);
      const descriptionsClean = descriptions.map((d) => d.trim()).filter(Boolean);
      await onSave({
        mediaType,
        creativeCopy: primaryTextsClean[0] ?? "",
        frames:       resolvedFrames,
        caption:      "",
        hashtags:     "",
        publishDate:  launchDate,
        publishTime:  "",
        contentBucket: "",
        platforms:    [],           // campaign platforms are injected by the workspace
        referenceUrl: referenceUrl.trim() || undefined,
        adCopy,
        headline:     headlinesClean[0] ?? "",
        description:  descriptionsClean[0] ?? "",
        primaryTexts: primaryTextsClean,
        headlines:    headlinesClean,
        descriptions: descriptionsClean,
        cta,
        landingUrl:   landingUrl.trim(),
        videoType:    isVideo ? videoType  : undefined,
        videoNotes:   isVideo ? videoNotes : undefined,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-background rounded-xl border border-border w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <div>
            <h2 className="text-base font-semibold text-foreground">
              {mode === "create" ? `Add Ad Copy ${index}` : `Edit Ad Copy ${index}`}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {mode === "create"
                ? "A single ad copy inside this campaign"
                : "Update this ad copy before submitting for review"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-accent transition-colors"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5 overflow-y-auto flex-1 min-h-0">

          {/* 1 — Media Type */}
          <div className="space-y-2">
            <label className={LABEL}>Media Type *</label>
            <div className="flex flex-wrap gap-2">
              {VARIANT_MEDIA_TYPES.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => handleMediaTypeChange(m)}
                  disabled={mode === "edit"}
                  className={`text-sm px-3 py-1.5 rounded-full border transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${
                    mediaType === m
                      ? "border-primary bg-primary/10 text-primary font-medium"
                      : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
            {mode === "edit" && (
              <p className="text-[11px] text-muted-foreground">Media type cannot be changed after creation.</p>
            )}
          </div>

          {/* 1b — Video Details (Video media type only) */}
          {isVideo && (
            <div className="space-y-3 rounded-xl border border-border bg-accent/20 px-4 py-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Video Details</p>
              <div className="space-y-1.5">
                <label className={LABEL}>Video Type <span className="normal-case font-normal text-muted-foreground">(optional)</span></label>
                <div className="flex flex-wrap gap-4">
                  {VIDEO_TYPE_OPTIONS.map((opt) => (
                    <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="variantVideoType"
                        value={opt.value}
                        checked={videoType === opt.value}
                        onChange={() => setVideoType(opt.value)}
                        className="h-4 w-4 accent-primary"
                      />
                      <span className="text-sm text-foreground">{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <label className={LABEL}>Video Notes <span className="normal-case font-normal text-muted-foreground">(optional)</span></label>
                <Input
                  placeholder="Any notes about the video production…"
                  value={videoNotes}
                  onChange={(e) => setVideoNotes(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* 2 — Reference URL — present for every media type */}
          <div className="space-y-2">
            <label className={LABEL}>Reference URL <span className="normal-case font-normal text-muted-foreground">(optional)</span></label>
            <Input
              type="url"
              placeholder="https://example.com/reference"
              value={referenceUrl}
              onChange={(e) => setReferenceUrl(e.target.value)}
            />
          </div>

          {/* 2b — Copy (standalone, required) — sits above Primary Text */}
          <div className="space-y-2">
            <label className={LABEL}>Copy *</label>
            <Textarea
              placeholder="Ad copy…"
              className="min-h-[80px]"
              value={adCopy}
              onChange={(e) => setAdCopy(e.target.value)}
            />
          </div>

          {/* 3 — Primary Texts (Meta allows up to 5) */}
          <RepeatableList
            label="Primary Text"
            addLabel="Add primary text"
            values={primaryTexts}
            onChange={setPrimaryTexts}
            required
            multiline
            placeholder="The main body copy of the ad…"
          />

          {/* Carousel Frames */}
          {isCarousel && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <label className={LABEL}>Frames / Cards *</label>
                {mode === "create" && (
                  <select
                    value={frameCount}
                    onChange={(e) => {
                      const n = Number(e.target.value);
                      setFrameCount(n);
                      setFrames(Array.from({ length: n }, (_, i) => ({ frameNo: i + 1, copy: "", imageUrl: "" })));
                      setCurrentFrame(1);
                    }}
                    className="px-3 py-1.5 border border-border rounded-md text-sm bg-background text-foreground outline-none focus:border-primary"
                  >
                    {Array.from({ length: 9 }, (_, i) => i + 2).map((n) => (
                      <option key={n} value={n}>{n} cards</option>
                    ))}
                  </select>
                )}
                {mode === "edit" && (
                  <span className="text-xs text-muted-foreground">{frameCount} cards</span>
                )}
              </div>

              <div className="rounded-xl border border-border bg-accent/20 px-4 py-4 space-y-3">
                {/* Nav */}
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setCurrentFrame((f) => Math.max(1, f - 1))}
                    disabled={currentFrame === 1}
                    className="h-8 w-8 flex items-center justify-center rounded-lg border border-border bg-background hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>

                  <div className="flex flex-col items-center gap-0.5">
                    <span className="text-sm font-semibold text-foreground">Card {currentFrame}</span>
                    <div className="flex gap-1">
                      {Array.from({ length: frameCount }, (_, i) => {
                        const filled = getFrame(i + 1).copy.trim().length > 0;
                        return (
                          <button
                            key={i}
                            type="button"
                            onClick={() => setCurrentFrame(i + 1)}
                            className={`h-1.5 rounded-full transition-all ${
                              i + 1 === currentFrame
                                ? "w-4 bg-primary"
                                : filled
                                ? "w-1.5 bg-primary/40"
                                : "w-1.5 bg-border"
                            }`}
                          />
                        );
                      })}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setCurrentFrame((f) => Math.min(frameCount, f + 1))}
                    disabled={currentFrame === frameCount}
                    className="h-8 w-8 flex items-center justify-center rounded-lg border border-border bg-background hover:bg-accent disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>

                <Textarea
                  key={`copy-${currentFrame}`}
                  placeholder={`Copy for card ${currentFrame}…`}
                  className="min-h-[90px]"
                  value={getFrame(currentFrame).copy}
                  onChange={(e) => updateFrame(currentFrame, { copy: e.target.value })}
                />
                <Input
                  key={`url-${currentFrame}`}
                  type="url"
                  placeholder="Creative image URL (optional — designer fills later)"
                  value={getFrame(currentFrame).imageUrl}
                  onChange={(e) => updateFrame(currentFrame, { imageUrl: e.target.value })}
                />

                <p className="text-[11px] text-muted-foreground text-right">
                  {Array.from({ length: frameCount }, (_, i) => getFrame(i + 1).copy.trim()).filter(Boolean).length}
                  /{frameCount} cards filled
                </p>
              </div>
            </div>
          )}

          {/* 4 — Headlines (Meta allows up to 5) */}
          <RepeatableList
            label="Headline"
            addLabel="Add headline"
            values={headlines}
            onChange={setHeadlines}
            required
            placeholder="Short attention-grabbing headline"
          />

          {/* 5 — Descriptions (optional, up to 5) */}
          <RepeatableList
            label="Description"
            addLabel="Add description"
            values={descriptions}
            onChange={setDescriptions}
            placeholder="Supporting description line"
          />

          {/* 6+7 — CTA & Landing URL */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className={LABEL}>CTA</label>
              <Select value={cta} onValueChange={setCta}>
                <SelectTrigger><SelectValue placeholder="Select CTA" /></SelectTrigger>
                <SelectContent>
                  {VARIANT_CTAS.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className={LABEL}>Landing URL <span className="normal-case font-normal text-muted-foreground">(optional)</span></label>
              <Input
                type="url"
                placeholder="https://"
                value={landingUrl}
                onChange={(e) => setLandingUrl(e.target.value)}
              />
            </div>
          </div>

          {/* 8 — Launch Date */}
          <div className="space-y-2">
            <label className={LABEL}>Launch Date *</label>
            <Input
              type="date"
              min={mode === "create" ? today : undefined}
              value={launchDate}
              onChange={(e) => setLaunchDate(e.target.value)}
            />
          </div>

          {/* Change History (edit mode only) */}
          {mode === "edit" && (
            <div className="-mx-6 border-t border-border mt-2">
              <button
                type="button"
                onClick={() => setHistoryOpen((o) => !o)}
                className="w-full flex items-center justify-between px-6 py-3 hover:bg-accent/50 transition-colors"
              >
                <span className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <History className="h-3.5 w-3.5" />
                  Change History
                  {history.length > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground text-[10px] font-medium normal-case tracking-normal">
                      {history.length}
                    </span>
                  )}
                </span>
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${historyOpen ? "rotate-180" : ""}`} />
              </button>

              {historyOpen && (
                <div className="px-6 pb-4">
                  {historyLoading ? (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground py-3">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading history…
                    </div>
                  ) : history.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-3">No history recorded yet.</p>
                  ) : (
                    <div className="relative pl-4">
                      <div className="absolute left-[7px] top-2 bottom-2 w-px bg-border" />
                      {history.map((entry) => (
                        <div key={entry.id} className="relative flex gap-3 pb-4 last:pb-0">
                          <div className={`absolute -left-[1px] mt-1 h-3 w-3 rounded-full border-2 border-background ${ACTION_COLOR[entry.action] ?? "bg-muted-foreground"}`} />
                          <div className="pl-5 flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <span className="text-xs font-semibold text-foreground">
                                  {ACTION_LABEL[entry.action] ?? entry.action}
                                </span>
                                <span className="text-xs text-muted-foreground ml-1.5">by {entry.changedBy.name}</span>
                              </div>
                              <span className="text-[11px] text-muted-foreground/70 whitespace-nowrap shrink-0">
                                {timeAgo(entry.changedAt)}
                              </span>
                            </div>
                            {entry.changes.length > 0 && (
                              <div className="mt-1.5 space-y-1.5">
                                {entry.changes.map((c, ci) => (
                                  <div key={ci} className="text-[11px] text-muted-foreground bg-accent/40 rounded-md px-2.5 py-2 space-y-1">
                                    <span className="font-semibold text-foreground text-xs">{c.label}</span>
                                    {c.from ? (
                                      <div className="space-y-0.5">
                                        <p className="text-muted-foreground line-through opacity-70 break-words leading-relaxed">{c.from}</p>
                                        <p className="text-foreground break-words leading-relaxed">→ {c.to || "—"}</p>
                                      </div>
                                    ) : (
                                      <p className="text-foreground break-words leading-relaxed">{c.to || "—"}</p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border flex-shrink-0">
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button variant="outline" onClick={() => setShowPreview(true)}>
            <Eye className="h-4 w-4 mr-1.5" /> Preview
          </Button>
          <Button onClick={handleSave} disabled={!isValid || saving}>
            {saving
              ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              : mode === "create"
              ? <Plus className="h-4 w-4 mr-1.5" />
              : <Save className="h-4 w-4 mr-1.5" />}
            {mode === "create" ? "Add Ad Copy to Campaign" : "Save Changes"}
          </Button>
        </div>
      </div>

      {/* Ad preview overlay — shows the in-progress form, unsaved */}
      {showPreview && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 overflow-y-auto"
          onClick={() => setShowPreview(false)}
        >
          <div className="w-full max-w-sm space-y-3 my-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-white">Ad Preview</p>
              <button
                onClick={() => setShowPreview(false)}
                className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="h-4 w-4 text-white" />
              </button>
            </div>
            <AdPreviewCard
              mediaType={mediaType}
              primaryTexts={primaryTexts}
              frames={resolvedFrames}
              headlines={headlines}
              descriptions={descriptions}
              cta={cta}
              landingUrl={landingUrl}
              adCopy={adCopy}
            />
          </div>
        </div>
      )}
    </div>
  );
}
