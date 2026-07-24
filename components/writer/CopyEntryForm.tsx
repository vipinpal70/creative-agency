"use client";

import { useState, useMemo } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, FileText, Loader2, Check, ChevronLeft, ChevronRight } from "lucide-react";
import { isReelOrVideoType } from "@/lib/status-flow";
import type { CopyFormData, CarouselFrame, PlannedItem } from "./types";
import { VIDEO_TYPE_OPTIONS } from "./types";

// ── Platform SVG icons ──────────────────────────────────────────────────────

const PlatformIcon = ({ id, size = 28 }: { id: string; size?: number }) => {
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
          <path d="M6.915 4.03c-1.968 0-3.683 1.28-4.871 3.113C.704 9.208 0 11.883 0 14.449c0 .706.07 1.369.21 1.973a6.624 6.624 0 0 0 .265.86 5.297 5.297 0 0 0 .371.761c.696 1.159 1.818 1.927 3.593 1.927 1.497 0 2.633-.671 3.965-2.444.76-1.012 1.144-1.626 2.663-4.32l.756-1.339.186-.325c.061.1.12.196.18.3l2.45 4.054c1.32 2.118 2.28 3.075 3.898 3.075 1.306 0 2.277-.507 2.988-1.353.49-.57.851-1.364 1.048-2.308.224-1.051.33-2.31.33-3.901 0-2.56-.62-5.184-1.978-7.058C20.752 5.28 18.984 4 17.007 4c-1.39 0-2.584.567-3.604 1.729-.348.4-.662.842-.95 1.322-.28-.48-.59-.92-.935-1.322C10.524 4.567 9.313 4 7.916 4L6.915 4.03zm.02 1.83c.73 0 1.503.41 2.237 1.27.584.69 1.141 1.652 1.908 3.018l.377.659.22.386c-1.071 1.76-1.768 2.894-2.315 3.702-.773 1.155-1.384 1.89-2.254 2.118-.24.065-.49.1-.745.1-.918 0-1.512-.37-1.94-1.048-.196-.314-.343-.702-.442-1.185a9.575 9.575 0 0 1-.169-1.797c0-2.269.575-4.611 1.556-6.14.716-1.108 1.582-1.683 2.567-1.683z" />
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

// ── Component ────────────────────────────────────────────────────────────────

interface Props {
  buckets: string[];
  plannedItems: PlannedItem[];  // derives available platforms per media type
  onAddCopy: (form: CopyFormData) => Promise<void>;
}

const LABEL = "text-xs font-semibold text-muted-foreground uppercase tracking-wider";

export function CopyEntryForm({ buckets, plannedItems, onAddCopy }: Props) {
  const [mediaType,     setMediaType]     = useState("");
  const [creativeCopy,  setCreativeCopy]  = useState("");
  const [caption,       setCaption]       = useState("");
  const [hashtags,      setHashtags]      = useState("");
  const [publishDate,   setPublishDate]   = useState("");
  // Local YYYY-MM-DD; blocks scheduling copies before today.
  const today = new Date().toLocaleDateString("en-CA");
  const [publishTime,   setPublishTime]   = useState("");
  const [contentBucket, setContentBucket] = useState("");
  const [selPlatforms,  setSelPlatforms]  = useState<string[]>([]);
  const [referenceUrl,  setReferenceUrl]  = useState("");
  const [videoType,     setVideoType]     = useState("");
  const [videoNotes,    setVideoNotes]    = useState("");
  const [saving,        setSaving]        = useState(false);

  // Carousel state
  const [frameCount,    setFrameCount]    = useState(3);
  const [frames,        setFrames]        = useState<CarouselFrame[]>([]);
  const [currentFrame,  setCurrentFrame]  = useState(1);

  const isReelOrVideo   = isReelOrVideoType(mediaType);
  const isCarousel      = mediaType.toLowerCase() === "carousel";

  const updateFrame = (frameNo: number, patch: Partial<CarouselFrame>) => {
    setFrames((prev) => {
      const existing = prev.find((f) => f.frameNo === frameNo);
      if (existing) return prev.map((f) => f.frameNo === frameNo ? { ...f, ...patch } : f);
      return [...prev, { frameNo, copy: "", imageUrl: "", ...patch }];
    });
  };

  const getFrame = (frameNo: number): CarouselFrame =>
    frames.find((f) => f.frameNo === frameNo) ?? { frameNo, copy: "", imageUrl: "" };

  // Derive available platforms from the selected media type's plannedItem
  const availablePlatforms = useMemo<string[]>(() => {
    if (plannedItems.length === 0) return [];
    if (mediaType) {
      const match = plannedItems.find(
        (i) => i.type.toLowerCase() === mediaType.toLowerCase() || i.label.toLowerCase() === mediaType.toLowerCase()
      );
      if (match && match.platforms.length > 0) return match.platforms;
    }
    // fallback: all unique platforms across all planned items
    return [...new Set(plannedItems.flatMap((i) => i.platforms))];
  }, [mediaType, plannedItems]);

  // Reset selected platforms when media type changes
  const handleMediaTypeChange = (val: string) => {
    setMediaType(val);
    setSelPlatforms([]);
    setVideoType("");
    setVideoNotes("");
    setFrames([]);
    setFrameCount(3);
    setCurrentFrame(1);
  };

  const togglePlatform = (p: string) => {
    setSelPlatforms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );
  };

  const mediaTypes = [...new Set(plannedItems.map((i) => i.type))];

  const carouselFramesFilled = isCarousel
    ? Array.from({ length: frameCount }, (_, i) => getFrame(i + 1)).every((f) => f.copy.trim())
    : true;

  const isValid =
    mediaType.trim() &&
    (isCarousel ? carouselFramesFilled : creativeCopy.trim()) &&
    caption.trim() &&
    publishDate &&
    selPlatforms.length > 0;

  const handleAdd = async () => {
    if (!isValid || saving) return;
    setSaving(true);
    try {
      const resolvedFrames = isCarousel
        ? Array.from({ length: frameCount }, (_, i) => getFrame(i + 1))
        : undefined;

      await onAddCopy({
        mediaType,
        creativeCopy:  isCarousel ? "" : creativeCopy,
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
      });
      setMediaType(""); setCreativeCopy(""); setCaption("");
      setHashtags(""); setPublishDate(""); setPublishTime("");
      setContentBucket(""); setSelPlatforms([]);
      setReferenceUrl(""); setVideoType(""); setVideoNotes("");
      setFrames([]); setFrameCount(3); setCurrentFrame(1);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <FileText className="h-4 w-4 text-primary" />
          </div>
          <div>
            <CardTitle className="text-base">Add New Copy</CardTitle>
            <CardDescription>Fill in copy details for a single creative post</CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">

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
                  className={`text-sm px-3 py-1.5 rounded-full border transition-colors ${
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
            <Select value={mediaType} onValueChange={handleMediaTypeChange}>
              <SelectTrigger><SelectValue placeholder="Select media type" /></SelectTrigger>
              <SelectContent>
                {["Static", "Reel", "Story", "Reel/Story", "Carousel", "Video", "Blog", "Email", "Ad"].map((m) => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* 1b — Reel / Video (long-format) extra info (conditional) */}
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

        {/* 2 — Creative Copy / Carousel Frames */}
        {isCarousel ? (
          <div className="space-y-3">
            {/* Frame count selector */}
            <div className="flex items-center gap-3">
              <label className={LABEL}>Frames / Slides *</label>
              <select
                value={frameCount}
                onChange={(e) => {
                  setFrameCount(Number(e.target.value));
                  setFrames([]);
                  setCurrentFrame(1);
                }}
                className="px-3 py-1.5 border border-border rounded-md text-sm bg-background text-foreground outline-none focus:border-primary"
              >
                {Array.from({ length: 19 }, (_, i) => i + 2).map((n) => (
                  <option key={n} value={n}>{n} frames</option>
                ))}
              </select>
            </div>

            {/* Slider */}
            <div className="rounded-xl border border-border bg-accent/20 px-4 py-4 space-y-3">
              {/* Header: nav + frame indicator */}
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

              {/* Frame inputs */}
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

              {/* Progress summary */}
              <p className="text-[11px] text-muted-foreground text-right">
                {Array.from({ length: frameCount }, (_, i) => getFrame(i + 1).copy.trim()).filter(Boolean).length}
                /{frameCount} frames filled
              </p>
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
            <Input type="date" min={today} value={publishDate} onChange={(e) => setPublishDate(e.target.value)} />
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

        {/* 8 — Platform (icon multi-select, derived from media type) */}
        <div className="space-y-2">
          <label className={LABEL}>
            Platform *
            {availablePlatforms.length > 0 && (
              <span className="ml-1 text-muted-foreground normal-case font-normal">
                — select all that apply
              </span>
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
                const color = platformColor(p);
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
                    {/* checkmark badge */}
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

        <div className="flex justify-end pt-1">
          <Button onClick={handleAdd} disabled={!isValid || saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
            Add Copy to Calendar
          </Button>
        </div>

      </CardContent>
    </Card>
  );
}
