"use client";

import { useState, useMemo, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Check, ChevronLeft, ChevronRight, X, Plus, Save, History, ChevronDown } from "lucide-react";
import { isArticleType, isReelOrVideoType } from "@/lib/status-flow";
import type { CopyFormData, CarouselFrame, PlannedItem, HistoryEntry } from "./types";
import { VIDEO_TYPE_OPTIONS } from "./types";

// ── Platform icons ────────────────────────────────────────────────────────────

const PlatformIcon = ({ id, size = 22 }: { id: string; size?: number }) => {
  const s = size;
  switch (id) {
    case "instagram":
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
          <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
          <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
        </svg>
      );
    case "facebook":
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor">
          <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
        </svg>
      );
    case "youtube":
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor">
          <path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46A2.78 2.78 0 0 0 1.46 6.42 29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58 2.78 2.78 0 0 0 1.95 1.96C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.96A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z" />
          <polygon points="9.75,15.02 15.5,12 9.75,8.98 9.75,15.02" fill="white" />
        </svg>
      );
    case "linkedin":
    case "linkedin-ads":
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor">
          <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
          <rect x="2" y="9" width="4" height="12" />
          <circle cx="4" cy="4" r="2" />
        </svg>
      );
    case "x":
    case "twitter":
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      );
    case "tiktok":
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor">
          <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.32 6.32 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.16 8.16 0 0 0 4.77 1.52V6.74a4.85 4.85 0 0 1-1-.05z" />
        </svg>
      );
    case "pinterest":
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 0 1 .083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z" />
        </svg>
      );
    case "meta-ads":
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor">
          <path d="M6.915 4.03c-1.968 0-3.683 1.28-4.871 3.113C.704 9.208 0 11.883 0 14.449c0 .706.07 1.369.21 1.973a6.624 6.624 0 0 0 .265.86 5.297 5.297 0 0 0 .371.761c.696 1.159 1.818 1.927 3.593 1.927 1.497 0 2.633-.671 3.965-2.444.76-1.012 1.144-1.626 2.663-4.32l.756-1.339.186-.325c.061.1.12.196.18.3l2.45 4.054c1.32 2.118 2.28 3.075 3.898 3.075 1.306 0 2.277-.507 2.988-1.353.49-.57.851-1.364 1.048-2.308.224-1.051.33-2.31.33-3.901 0-2.56-.62-5.184-1.978-7.058C20.752 5.28 18.984 4 17.007 4c-1.39 0-2.584.567-3.604 1.729-.348.4-.662.842-.95 1.322-.28-.48-.59-.92-.935-1.322C10.524 4.567 9.313 4 7.916 4L6.915 4.03z" />
        </svg>
      );
    case "google-ads":
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor">
          <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z" />
        </svg>
      );
    case "email-whatsapp":
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
          <polyline points="22,6 12,13 2,6" />
        </svg>
      );
    case "seo":
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      );
    case "influencer":
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      );
    default:
      return (
        <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="2" y1="12" x2="22" y2="12" />
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
      );
  }
};

const PLATFORM_META: Record<string, { label: string; color: string }> = {
  instagram:        { label: "Instagram",    color: "#E1306C" },
  facebook:         { label: "Facebook",     color: "#1877F2" },
  youtube:          { label: "YouTube",      color: "#FF0000" },
  linkedin:         { label: "LinkedIn",     color: "#0A66C2" },
  "linkedin-ads":   { label: "LinkedIn Ads", color: "#0A66C2" },
  x:                { label: "X",            color: "#000000" },
  twitter:          { label: "Twitter",      color: "#1DA1F2" },
  tiktok:           { label: "TikTok",       color: "#010101" },
  pinterest:        { label: "Pinterest",    color: "#E60023" },
  "meta-ads":       { label: "Meta Ads",     color: "#0082FB" },
  "google-ads":     { label: "Google Ads",   color: "#4285F4" },
  "email-whatsapp": { label: "Email / WA",   color: "#25D366" },
  seo:              { label: "SEO",          color: "#4285F4" },
  influencer:       { label: "Influencer",   color: "#9333EA" },
};

function platformLabel(id: string) {
  return PLATFORM_META[id]?.label ?? id.charAt(0).toUpperCase() + id.slice(1);
}
function platformColor(id: string) {
  return PLATFORM_META[id]?.color ?? "#6B7280";
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CopyModalInitialData {
  mediaType?: string;
  creativeCopy?: string;
  frames?: CarouselFrame[];
  caption?: string;
  hashtags?: string;       // space-separated
  publishDate?: string;
  publishTime?: string;
  contentBucket?: string;
  platforms?: string[];
  referenceUrl?: string;
  videoType?: string;
  videoNotes?: string;
  articleMode?: string;
  articleCopy?: string;
}

interface Props {
  mode: "create" | "edit";
  initialData?: CopyModalInitialData;
  historyEndpoint?: string;
  buckets: string[];
  plannedItems: PlannedItem[];
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
  created:   "Created draft",
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

// ── Component ─────────────────────────────────────────────────────────────────

export function CopyModal({ mode, initialData, historyEndpoint, buckets, plannedItems, onClose, onSave }: Props) {
  // Derive initial carousel state from initialData
  const initFrames: CarouselFrame[] = initialData?.frames?.length
    ? initialData.frames
    : Array.from({ length: 3 }, (_, i) => ({ frameNo: i + 1, copy: "", imageUrl: "" }));

  const [mediaType,      setMediaType]      = useState(initialData?.mediaType ?? "");
  const [creativeCopy,   setCreativeCopy]   = useState(initialData?.creativeCopy ?? "");
  const [articleMode,    setArticleMode]    = useState(
    initialData?.articleMode ||
    (isArticleType(initialData?.mediaType) ? "without-creative" : "")
  );
  const [articleCopy,    setArticleCopy]    = useState(initialData?.articleCopy ?? "");
  const [caption,        setCaption]        = useState(initialData?.caption ?? "");
  const [hashtags,       setHashtags]       = useState(initialData?.hashtags ?? "");
  const [publishDate,    setPublishDate]    = useState(initialData?.publishDate ?? "");
  // Local YYYY-MM-DD; used to block scheduling copies in the past on create.
  const today = new Date().toLocaleDateString("en-CA");
  const [publishTime,    setPublishTime]    = useState(initialData?.publishTime ?? "");
  const [contentBucket,  setContentBucket]  = useState(initialData?.contentBucket ?? "");
  const [selPlatforms,   setSelPlatforms]   = useState<string[]>(initialData?.platforms ?? []);
  const [referenceUrl,   setReferenceUrl]   = useState(initialData?.referenceUrl ?? "");
  const [videoType,      setVideoType]      = useState(initialData?.videoType ?? "");
  const [videoNotes,     setVideoNotes]     = useState(initialData?.videoNotes ?? "");
  const [saving,         setSaving]         = useState(false);

  // Carousel
  const [frameCount,    setFrameCount]    = useState(initFrames.length);
  const [frames,        setFrames]        = useState<CarouselFrame[]>(initFrames);
  const [currentFrame,  setCurrentFrame]  = useState(1);

  // ── History ────────────────────────────────────────────────────────────────
  const [history,          setHistory]          = useState<HistoryEntry[]>([]);
  const [historyLoading,   setHistoryLoading]   = useState(false);
  const [historyOpen,      setHistoryOpen]      = useState(false);
  const [expandedChanges,  setExpandedChanges]  = useState<Set<string>>(new Set());

  const toggleChangeExpand = (key: string) => {
    setExpandedChanges((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  useEffect(() => {
    if (!historyEndpoint) return;
    setHistoryLoading(true);
    fetch(historyEndpoint)
      .then((r) => r.json())
      .then((data) => setHistory(Array.isArray(data) ? data : []))
      .catch(() => setHistory([]))
      .finally(() => setHistoryLoading(false));
  }, [historyEndpoint]);

  // ── Derived ────────────────────────────────────────────────────────────────
  const isCarousel       = mediaType.toLowerCase() === "carousel";
  const isReelOrVideo    = isReelOrVideoType(mediaType);
  const isArticleCopy    = isArticleType(mediaType);

  const updateFrame = (frameNo: number, patch: Partial<CarouselFrame>) => {
    setFrames((prev) => {
      const existing = prev.find((f) => f.frameNo === frameNo);
      if (existing) return prev.map((f) => f.frameNo === frameNo ? { ...f, ...patch } : f);
      return [...prev, { frameNo, copy: "", imageUrl: "", ...patch }];
    });
  };

  const getFrame = (frameNo: number): CarouselFrame =>
    frames.find((f) => f.frameNo === frameNo) ?? { frameNo, copy: "", imageUrl: "" };

  const availablePlatforms = useMemo<string[]>(() => {
    if (plannedItems.length === 0) return [];
    if (mediaType) {
      const match = plannedItems.find(
        (i) => i.type.toLowerCase() === mediaType.toLowerCase() || i.label.toLowerCase() === mediaType.toLowerCase()
      );
      if (match && match.platforms.length > 0) return match.platforms;
    }
    return [...new Set(plannedItems.flatMap((i) => i.platforms))];
  }, [mediaType, plannedItems]);

  const handleMediaTypeChange = (val: string) => {
    setMediaType(val);
    // Only reset platforms and type-specific state in create mode
    if (mode === "create") {
      setSelPlatforms([]);
      setVideoType("");
      setVideoNotes("");
      setArticleCopy("");
      // Default article/copy to "without-creative" so the copy field shows immediately
      setArticleMode(isArticleType(val) ? "without-creative" : "");
      setFrames(Array.from({ length: 3 }, (_, i) => ({ frameNo: i + 1, copy: "", imageUrl: "" })));
      setFrameCount(3);
      setCurrentFrame(1);
    }
  };

  const togglePlatform = (p: string) => {
    setSelPlatforms((prev) => prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]);
  };

  const mediaTypes = [...new Set(plannedItems.map((i) => i.type))];

  const carouselFramesFilled = isCarousel
    ? Array.from({ length: frameCount }, (_, i) => getFrame(i + 1)).every((f) => f.copy.trim())
    : true;

  const articleCopyValid = isArticleCopy
    ? articleCopy.trim().length > 0 &&
      (articleMode === "without-creative" || creativeCopy.trim().length > 0)
    : true;

  const copyFieldValid = isCarousel
    ? carouselFramesFilled
    : isArticleCopy
    ? articleCopyValid
    : creativeCopy.trim().length > 0;

  const isValid =
    mediaType.trim() &&
    copyFieldValid &&
    caption.trim() &&
    publishDate &&
    selPlatforms.length > 0;

  const handleSave = async () => {
    if (!isValid || saving) return;
    setSaving(true);
    try {
      const resolvedFrames = isCarousel
        ? Array.from({ length: frameCount }, (_, i) => getFrame(i + 1))
        : undefined;

      await onSave({
        mediaType,
        creativeCopy:  isCarousel ? "" : (isArticleCopy && articleMode === "without-creative") ? "" : creativeCopy,
        frames:        resolvedFrames,
        caption,
        hashtags,
        publishDate,
        publishTime,
        contentBucket,
        platforms:     selPlatforms,
        referenceUrl:  referenceUrl.trim() || undefined,
        videoType:     isReelOrVideo ? videoType  : undefined,
        videoNotes:    isReelOrVideo ? videoNotes : undefined,
        articleMode:   isArticleCopy ? articleMode : undefined,
        articleCopy:   isArticleCopy ? articleCopy : undefined,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-background rounded-xl border border-border w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl">

        {/* Header — pinned */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <div>
            <h2 className="text-base font-semibold text-foreground">
              {mode === "create" ? "Add New Copy" : "Edit Copy"}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {mode === "create"
                ? "Fill in copy details for a single creative post"
                : "Update the copy details before submitting for review"}
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

          {/* 1 — Media Type */}
          <div className="space-y-2">
            <label className={LABEL}>Media Type *</label>
            {mediaTypes.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {mediaTypes.map((m) => (
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
            ) : (
              <Select value={mediaType} onValueChange={handleMediaTypeChange} disabled={mode === "edit"}>
                <SelectTrigger><SelectValue placeholder="Select media type" /></SelectTrigger>
                <SelectContent>
                  {["Static", "Reel", "Story", "Reel/Story", "Carousel", "Video", "Blog", "Email", "Ad"].map((m) => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {mode === "edit" && (
              <p className="text-[11px] text-muted-foreground">Media type cannot be changed after creation.</p>
            )}
          </div>

          {/* 1b — Reel / Video (long-format) extras */}
          {isReelOrVideo && (
            <div className="space-y-3 rounded-xl border border-border bg-accent/20 px-4 py-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Video Details</p>
              <div className="space-y-1.5">
                <label className={LABEL}>Video Type <span className="normal-case font-normal text-muted-foreground">(optional)</span></label>
                <div className="flex flex-wrap gap-4">
                  {VIDEO_TYPE_OPTIONS.map((opt) => (
                    <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="videoType"
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

          {/* 2 — Creative Copy, Article/Copy, or Carousel Frames */}
          {isCarousel ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <label className={LABEL}>Frames / Slides *</label>
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
                    {Array.from({ length: 19 }, (_, i) => i + 2).map((n) => (
                      <option key={n} value={n}>{n} frames</option>
                    ))}
                  </select>
                )}
                {mode === "edit" && (
                  <span className="text-xs text-muted-foreground">{frameCount} frames</span>
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
                    <span className="text-sm font-semibold text-foreground">Frame {currentFrame}</span>
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
                  placeholder={`Copy for frame ${currentFrame}…`}
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
                  /{frameCount} frames filled
                </p>
              </div>
            </div>
          ) : isArticleCopy ? (
            <div className="space-y-4">
              {/* Radio toggle — always visible for article/copy */}
              <div className="space-y-2">
                <label className={LABEL}>Creative</label>
                <div className="flex gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="articleMode"
                      value="without-creative"
                      checked={articleMode === "without-creative"}
                      onChange={() => { setArticleMode("without-creative"); setCreativeCopy(""); }}
                      className="h-4 w-4 accent-primary"
                    />
                    <span className="text-sm text-foreground">Without Creative</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="articleMode"
                      value="with-creative"
                      checked={articleMode === "with-creative"}
                      onChange={() => setArticleMode("with-creative")}
                      className="h-4 w-4 accent-primary"
                    />
                    <span className="text-sm text-foreground">With Creative</span>
                  </label>
                </div>
              </div>

              {/* Creative Copy — only shown when "With Creative" is selected */}
              {articleMode === "with-creative" && (
                <div className="space-y-2">
                  <label className={LABEL}>Creative Copy *</label>
                  <Textarea
                    placeholder="Text displayed on the image / creative…"
                    className="min-h-[90px]"
                    value={creativeCopy}
                    onChange={(e) => setCreativeCopy(e.target.value)}
                  />
                </div>
              )}

              {/* Article Copy — always shown for article/copy media type */}
              <div className="space-y-2">
                <label className={LABEL}>Article Copy *</label>
                <Textarea
                  placeholder="The body content of the article…"
                  className="min-h-[100px]"
                  value={articleCopy}
                  onChange={(e) => setArticleCopy(e.target.value)}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <label className={LABEL}>Creative Copy *</label>
              <Textarea
                placeholder="The main creative copy / content for this post..."
                className="min-h-[100px]"
                value={creativeCopy}
                onChange={(e) => setCreativeCopy(e.target.value)}
              />
            </div>
          )}

          {/* 3 — Caption */}
          <div className="space-y-2">
            <label className={LABEL}>Caption *</label>
            <Textarea
              placeholder="Caption that accompanies the creative..."
              className="min-h-[80px]"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
            />
          </div>

          {/* 4 — Hashtags */}
          <div className="space-y-2">
            <label className={LABEL}>Hashtags</label>
            <Input
              placeholder="#marketing #socialmedia #growth"
              value={hashtags}
              onChange={(e) => setHashtags(e.target.value)}
            />
          </div>

          {/* 4b — Reference URL */}
          <div className="space-y-2">
            <label className={LABEL}>Reference URL <span className="normal-case font-normal text-muted-foreground">(optional)</span></label>
            <Input
              type="url"
              placeholder="https://example.com/inspiration"
              value={referenceUrl}
              onChange={(e) => setReferenceUrl(e.target.value)}
            />
          </div>

          {/* 5+6 — Publish Date & Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className={LABEL}>Publish Date *</label>
              <Input type="date" min={mode === "create" ? today : undefined} value={publishDate} onChange={(e) => setPublishDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className={LABEL}>Publish Time</label>
              <Input type="time" value={publishTime} onChange={(e) => setPublishTime(e.target.value)} />
            </div>
          </div>

          {/* 7 — Content Bucket */}
          {buckets.length > 0 && (
            <div className="space-y-2">
              <label className={LABEL}>Content Bucket</label>
              <div className="flex flex-wrap gap-2">
                {buckets.map((b) => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => setContentBucket(contentBucket === b ? "" : b)}
                    className={`text-sm px-3 py-1.5 rounded-full border transition-colors ${
                      contentBucket === b
                        ? "border-primary bg-primary/10 text-primary font-medium"
                        : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                    }`}
                  >
                    {b}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 8 — Platform */}
          <div className="space-y-2">
            <label className={LABEL}>
              Platform *
              {availablePlatforms.length > 0 && (
                <span className="ml-1 text-muted-foreground normal-case font-normal">— select all that apply</span>
              )}
            </label>

            {availablePlatforms.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                {mediaType ? "No platforms defined for this media type in scope." : "Select a media type first."}
              </p>
            ) : (
              <div className="flex flex-wrap gap-3">
                {availablePlatforms.map((p) => {
                  const selected = selPlatforms.includes(p);
                  const color    = platformColor(p);
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => togglePlatform(p)}
                      className={`relative flex flex-col items-center gap-1.5 w-16 py-3 rounded-xl border-2 transition-all ${
                        selected
                          ? "border-current shadow-sm"
                          : "border-border hover:border-muted-foreground/40"
                      }`}
                      style={selected ? { borderColor: color, background: `${color}12` } : undefined}
                      title={platformLabel(p)}
                    >
                      {selected && (
                        <span
                          className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full flex items-center justify-center"
                          style={{ background: color }}
                        >
                          <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />
                        </span>
                      )}
                      <span style={{ color: selected ? color : undefined }}>
                        <PlatformIcon id={p} size={22} />
                      </span>
                      <span
                        className="text-[9px] font-medium leading-none text-center truncate w-full px-1"
                        style={{ color: selected ? color : "hsl(var(--muted-foreground))" }}
                      >
                        {platformLabel(p)}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
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
              <div className="px-6 pb-4 space-y-0">
                {historyLoading ? (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground py-3">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading history…
                  </div>
                ) : history.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-3">No history recorded yet.</p>
                ) : (
                  <div className="relative pl-4">
                    {/* Vertical line */}
                    <div className="absolute left-[7px] top-2 bottom-2 w-px bg-border" />

                    {history.map((entry, idx) => (
                      <div key={entry.id} className="relative flex gap-3 pb-4 last:pb-0">
                        {/* Dot */}
                        <div className={`absolute -left-[1px] mt-1 h-3 w-3 rounded-full border-2 border-background ${ACTION_COLOR[entry.action] ?? "bg-muted-foreground"}`} />

                        <div className="pl-5 flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span className="text-xs font-semibold text-foreground">
                                {ACTION_LABEL[entry.action] ?? entry.action}
                              </span>
                              <span className="text-xs text-muted-foreground ml-1.5">
                                by {entry.changedBy.name}
                              </span>
                            </div>
                            <span className="text-[11px] text-muted-foreground/70 whitespace-nowrap shrink-0">
                              {timeAgo(entry.changedAt)}
                            </span>
                          </div>

                          {entry.changes.length > 0 && (
                            <div className="mt-1.5 space-y-1.5">
                              {entry.changes.map((c, ci) => {
                                const key        = `${entry.id}-${ci}`;
                                const isExpanded = expandedChanges.has(key);
                                const LIMIT      = 80;
                                const fromLong   = c.from.length > LIMIT;
                                const toLong     = c.to.length   > LIMIT;
                                const needsMore  = fromLong || toLong;

                                const fromText = isExpanded || !fromLong ? c.from : c.from.slice(0, LIMIT) + "…";
                                const toText   = isExpanded || !toLong   ? c.to   : c.to.slice(0, LIMIT)   + "…";

                                return (
                                  <div key={ci} className="text-[11px] text-muted-foreground bg-accent/40 rounded-md px-2.5 py-2 space-y-1">
                                    <span className="font-semibold text-foreground text-xs">{c.label}</span>

                                    {c.from ? (
                                      <div className="space-y-0.5">
                                        <p className="text-muted-foreground line-through opacity-70 break-words leading-relaxed">
                                          {fromText}
                                        </p>
                                        <p className="text-foreground break-words leading-relaxed">
                                          → {toText || "—"}
                                        </p>
                                      </div>
                                    ) : (
                                      <p className="text-foreground break-words leading-relaxed">{toText || "—"}</p>
                                    )}

                                    {needsMore && (
                                      <button
                                        type="button"
                                        onClick={() => toggleChangeExpand(key)}
                                        className="text-[10px] font-medium text-primary hover:underline mt-0.5"
                                      >
                                        {isExpanded ? "See less" : "See more"}
                                      </button>
                                    )}
                                  </div>
                                );
                              })}
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

        {/* Footer — pinned */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border flex-shrink-0">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!isValid || saving}>
            {saving
              ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              : mode === "create"
              ? <Plus className="h-4 w-4 mr-1.5" />
              : <Save className="h-4 w-4 mr-1.5" />}
            {mode === "create" ? "Add Copy to Calendar" : "Save Changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}
