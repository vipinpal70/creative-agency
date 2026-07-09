"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  X,
  Check,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  Play,
  Film,
  Music,
  Loader2,
  Clock,
  Send,
  Bookmark,
  Heart,
  MessageCircle,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MODULES } from "@/lib/types";
import {
  STATUS_LABEL,
  STATUS_COLOR,
  normalizeDraftStatus,
  approveTargetFor,
  skipsDesignPhase,
  REJECT_TRANSITIONS,
} from "@/lib/status-flow";
import type { DraftStatus } from "@/lib/status-flow";
import type { CalendarCopy, CalendarDraft } from "./types";

interface HistoryChange {
  field: string;
  label: string;
  from: string;
  to: string;
}

interface HistoryEntry {
  id: string;
  action: "created" | "edited" | "submitted" | "approved" | "rejected";
  changedBy: { userId: string; name: string; email: string };
  changedAt: string;
  draftVersion: number;
  changes: HistoryChange[];
}

interface Props {
  item: CalendarCopy | null;
  open: boolean;
  onClose: () => void;
  onUpdate: (deliverableId: string, updatedDraft: CalendarDraft) => void;
  // When true, the modal is a pure preview: edit form is disabled and the
  // Approve tab / Save button are hidden. Used by the client portal.
  readOnly?: boolean;
}

const DELIVERABLE_STATUS_LABEL = STATUS_LABEL;
const DRAFT_STATUS_COLOR = STATUS_COLOR;

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return d < 7 ? `${d}d ago` : new Date(dateStr).toLocaleDateString();
}

function getMediaCategory(
  mediaType: string,
  type: string
): "carousel" | "video" | "story" | "gif" | "image" | "audio" | "text" {
  const mt = (mediaType || type || "").toLowerCase().trim();
  if (mt.includes("carousel") || mt.includes("slider")) return "carousel";
  if (mt.includes("reel") || mt.includes("video")) return "video";
  if (mt.includes("story")) return "story";
  if (mt.includes("gif")) return "gif";
  if (
    mt.includes("audio") ||
    mt.includes("podcast") ||
    mt.includes("radio")
  )
    return "audio";
  if (
    mt.includes("static") ||
    mt.includes("image") ||
    mt.includes("photo") ||
    mt.includes("banner") ||
    mt.includes("graphic")
  )
    return "image";
  return "text";
}

// ── Carousel Slider ────────────────────────────────────────────────
function CarouselSlider({
  frames,
}: {
  frames: { frameNo: number; copy: string; imageUrl: string }[];
}) {
  const [current, setCurrent] = useState(0);
  const frame = frames[current];

  return (
    <div className="relative w-full h-full">
      {frame?.imageUrl ? (
        <img
          src={frame.imageUrl}
          alt={`Frame ${frame.frameNo}`}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-muted p-4">
          <div className="text-center">
            <p className="text-[10px] font-semibold text-muted-foreground mb-2">
              Frame {frame?.frameNo}
            </p>
            <p className="text-xs text-foreground line-clamp-6">
              {frame?.copy || "No copy yet"}
            </p>
          </div>
        </div>
      )}
      <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1">
        {frames.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={cn(
              "h-1.5 rounded-full transition-all",
              i === current ? "w-4 bg-white" : "w-1.5 bg-white/50"
            )}
          />
        ))}
      </div>
      {current > 0 && (
        <button
          onClick={() => setCurrent((c) => c - 1)}
          className="absolute left-1 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full bg-black/40 text-white flex items-center justify-center"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      )}
      {current < frames.length - 1 && (
        <button
          onClick={() => setCurrent((c) => c + 1)}
          className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full bg-black/40 text-white flex items-center justify-center"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      )}
      <div className="absolute top-2 right-2 bg-black/50 text-white text-[10px] px-1.5 py-0.5 rounded-full">
        {current + 1}/{frames.length}
      </div>
    </div>
  );
}

// ── Video Preview ───────────────────────────────────────────────────
function VideoPreview({
  videoUrl,
  thumbnailUrl,
}: {
  videoUrl: string;
  thumbnailUrl: string;
}) {
  const [playing, setPlaying] = useState(false);

  if (videoUrl && playing) {
    return (
      <video
        src={videoUrl}
        controls
        autoPlay
        className="w-full h-full object-cover"
      />
    );
  }

  return (
    <div
      className={cn(
        "relative w-full h-full",
        videoUrl && "cursor-pointer"
      )}
      onClick={() => videoUrl && setPlaying(true)}
    >
      {thumbnailUrl ? (
        <img
          src={thumbnailUrl}
          alt="Video thumbnail"
          className="w-full h-full object-cover"
        />
      ) : videoUrl ? (
        <video
          src={videoUrl}
          preload="metadata"
          muted
          playsInline
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center">
          <Film className="h-10 w-10 text-white/30" />
        </div>
      )}
      {videoUrl && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-14 w-14 rounded-full bg-black/50 border-2 border-white/60 flex items-center justify-center">
            <Play className="h-6 w-6 text-white ml-1" />
          </div>
        </div>
      )}
      {!videoUrl && !thumbnailUrl && (
        <p className="absolute bottom-3 left-0 right-0 text-center text-xs text-white/50">
          No video URL set
        </p>
      )}
    </div>
  );
}

// ── Audio Preview ───────────────────────────────────────────────────
function AudioPreview({ audioUrl, title }: { audioUrl: string; title: string }) {
  return (
    <div className="w-full flex flex-col items-center justify-center h-full gap-4 px-4">
      <div className="h-24 w-24 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center shadow-lg">
        <Music className="h-10 w-10 text-white" />
      </div>
      <p className="text-sm font-medium text-foreground text-center line-clamp-2">
        {title || "Audio content"}
      </p>
      {audioUrl ? (
        <audio controls src={audioUrl} className="w-full mt-2" />
      ) : (
        <p className="text-xs text-muted-foreground">No audio URL set</p>
      )}
    </div>
  );
}

// ── Image Preview ───────────────────────────────────────────────────
function ImagePreview({
  imageUrl,
  mediaType,
}: {
  imageUrl: string;
  mediaType: string;
}) {
  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt="Content preview"
        className="w-full h-full object-contain"
      />
    );
  }
  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-muted-foreground">
      <div className="h-16 w-16 rounded-xl bg-muted flex items-center justify-center">
        <span className="text-3xl">🖼️</span>
      </div>
      <p className="text-xs capitalize">{mediaType || "Image"} — no URL set</p>
    </div>
  );
}

// ── Text / Blog / Email Preview ─────────────────────────────────────
function TextPreview({ draft, title, module }: { draft: CalendarDraft | null; title: string; module: string }) {
  const text = draft?.creativeCopy || draft?.caption || "";
  const isEmail = module === "email";
  const isBlog = module === "seo";

  if (isEmail) {
    return (
      <div className="w-full rounded-xl border border-border bg-card shadow overflow-hidden">
        <div className="bg-muted/40 px-4 py-2 border-b border-border text-xs text-muted-foreground flex justify-between">
          <span>📧 Email Preview</span>
        </div>
        <div className="px-4 py-3 border-b border-border">
          <p className="text-sm font-bold text-foreground">{title}</p>
        </div>
        <div className="px-4 py-4 text-sm text-foreground max-h-[300px] overflow-y-auto whitespace-pre-wrap">
          {text || <span className="text-muted-foreground">No content yet…</span>}
        </div>
      </div>
    );
  }

  if (isBlog) {
    return (
      <div className="w-full space-y-3">
        <div className="rounded-xl border border-border bg-card p-4 shadow">
          <p className="text-[10px] text-muted-foreground">acme.com › blog</p>
          <p className="text-base font-semibold text-foreground leading-snug mt-1">
            {title}
          </p>
          {draft?.caption && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
              {draft.caption}
            </p>
          )}
        </div>
        {text && (
          <div className="rounded-xl border border-border bg-card p-4 text-sm text-foreground max-h-[220px] overflow-y-auto whitespace-pre-wrap">
            {text}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="w-full rounded-xl border border-border bg-card p-5 shadow">
      <p className="text-sm font-semibold text-foreground mb-3">{title}</p>
      <p className="text-sm text-foreground whitespace-pre-wrap line-clamp-10">
        {text || <span className="text-muted-foreground">No content yet…</span>}
      </p>
    </div>
  );
}

// ── Social Mockup (Instagram-like frame) ────────────────────────────
function SocialMockup({
  item,
  mediaCategory,
}: {
  item: CalendarCopy;
  mediaCategory: ReturnType<typeof getMediaCategory>;
}) {
  const draft = item.draft;
  const isPortrait = mediaCategory === "story";

  return (
    <div
      className={cn(
        "rounded-[1.5rem] bg-card border border-border shadow-xl overflow-hidden",
        isPortrait ? "w-[180px]" : "w-[260px]"
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2 p-3">
        <div className="h-7 w-7 rounded-full bg-gradient-to-br from-pink-500 via-orange-400 to-yellow-400 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-foreground truncate">
            brand.handle
          </p>
        </div>
        <span className="text-muted-foreground text-sm">···</span>
      </div>

      {/* Media */}
      <div className={cn("bg-muted relative overflow-hidden", isPortrait ? "aspect-[9/16]" : "aspect-square")}>
        {mediaCategory === "carousel" && (draft?.frames?.length ?? 0) > 0 ? (
          <CarouselSlider frames={draft!.frames} />
        ) : mediaCategory === "video" ? (
          <VideoPreview
            videoUrl={draft?.videoUrl || ""}
            thumbnailUrl={draft?.thumbnailUrl || draft?.imageUrl || ""}
          />
        ) : draft?.imageUrl ? (
          <img
            src={draft.imageUrl}
            alt="Preview"
            className="w-full h-full object-cover"
          />
        ) : (draft?.articleMode === "with-creative" || (draft?.mediaType || item.type).toLowerCase() === "article/copy") && draft?.creativeCopy ? (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-primary/10 to-muted p-4">
            <p className="text-xs text-foreground text-center font-medium leading-relaxed line-clamp-6">
              {draft.creativeCopy}
            </p>
          </div>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-muted-foreground bg-gradient-to-br from-primary/10 to-muted">
            <span className="text-3xl">{mediaCategory === "gif" ? "🎞️" : mediaCategory === "story" ? "📱" : "🖼️"}</span>
            <p className="text-[10px] capitalize">{draft?.mediaType || item.type}</p>
          </div>
        )}
      </div>

      {/* Engagement icons */}
      <div className="flex items-center gap-3 px-3 py-2 text-foreground">
        <Heart className="h-4 w-4" />
        <MessageCircle className="h-4 w-4" />
        <Send className="h-4 w-4" />
        <Bookmark className="h-4 w-4 ml-auto" />
      </div>

      {/* Caption */}
      {(draft?.caption || draft?.hashtags?.length) && (
        <div className="px-3 pb-3">
          {draft?.caption && (
            <p className="text-xs text-foreground line-clamp-3">
              <span className="font-semibold">brand.handle</span>{" "}
              {draft.caption}
            </p>
          )}
          {draft?.hashtags && draft.hashtags.length > 0 && (
            <p className="text-[10px] text-[hsl(var(--mod-social))] mt-0.5">
              {draft.hashtags.slice(0, 5).join(" ")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Article Preview ─────────────────────────────────────────────────
function ArticlePreview({ draft, title }: { draft: CalendarDraft | null; title: string }) {
  const articleCopy = draft?.articleCopy || "";
  const withCreative = draft?.articleMode === "with-creative";

  return (
    <div className="w-full max-w-sm space-y-3">
      {withCreative && draft?.creativeCopy && (
        <div className="rounded-xl border border-border bg-gradient-to-br from-primary/10 to-muted p-4 shadow text-center">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Creative</p>
          <p className="text-sm text-foreground font-medium leading-relaxed">
            {draft.creativeCopy}
          </p>
        </div>
      )}
      <div className="rounded-xl border border-border bg-card p-4 shadow">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Article Copy</p>
        {articleCopy ? (
          <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed max-h-[260px] overflow-y-auto">
            {articleCopy}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">No article copy yet…</p>
        )}
      </div>
      {draft?.caption && (
        <div className="rounded-xl border border-border bg-card p-3 shadow">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Caption</p>
          <p className="text-xs text-foreground">{draft.caption}</p>
        </div>
      )}
    </div>
  );
}

// ── Media Preview (dispatcher) ──────────────────────────────────────
function MediaPreviewPane({ item }: { item: CalendarCopy }) {
  const draft = item.draft;
  const mediaCategory = getMediaCategory(draft?.mediaType || "", item.type);
  const isArticleCopy = (draft?.mediaType || item.type).toLowerCase() === "article/copy";
  const isSocial =
    item.module === "social" ||
    item.module === "paid" ||
    item.module === "influencer";

  if (mediaCategory === "audio") {
    return (
      <AudioPreview
        audioUrl={draft?.audioUrl || ""}
        title={item.title}
      />
    );
  }

  if (isSocial) {
    return <SocialMockup item={item} mediaCategory={mediaCategory} />;
  }

  if (isArticleCopy) {
    return <ArticlePreview draft={draft} title={item.title} />;
  }

  if (mediaCategory === "video") {
    return (
      <div className="w-full max-w-sm rounded-xl overflow-hidden border border-border shadow-xl bg-black aspect-video">
        <VideoPreview
          videoUrl={draft?.videoUrl || ""}
          thumbnailUrl={draft?.thumbnailUrl || draft?.imageUrl || ""}
        />
      </div>
    );
  }

  if (mediaCategory === "image" || mediaCategory === "gif") {
    return (
      <div className="w-full max-w-sm rounded-xl overflow-hidden border border-border shadow-xl aspect-square bg-muted">
        <ImagePreview
          imageUrl={draft?.imageUrl || ""}
          mediaType={draft?.mediaType || item.type}
        />
      </div>
    );
  }

  // Uncategorized media type but a creative was uploaded — show it
  if (draft?.videoUrl) {
    return (
      <div className="w-full max-w-sm rounded-xl overflow-hidden border border-border shadow-xl bg-black aspect-video">
        <VideoPreview
          videoUrl={draft.videoUrl}
          thumbnailUrl={draft.thumbnailUrl || ""}
        />
      </div>
    );
  }
  if (draft?.imageUrl) {
    return (
      <div className="w-full max-w-sm rounded-xl overflow-hidden border border-border shadow-xl aspect-square bg-muted">
        <ImagePreview
          imageUrl={draft.imageUrl}
          mediaType={draft?.mediaType || item.type}
        />
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm">
      <TextPreview draft={draft} title={item.title} module={item.module} />
    </div>
  );
}

// ── History Tab ─────────────────────────────────────────────────────
function HistoryTab({
  clientId,
  deliverableId,
  draftId,
}: {
  clientId: string;
  deliverableId: string;
  draftId: string;
}) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    setLoading(true);
    fetch(
      `/api/clients/${clientId}/deliverables/${deliverableId}/drafts/${draftId}/history`
    )
      .then((r) => r.json())
      .then((data) => {
        setHistory(Array.isArray(data) ? data : []);
      })
      .catch(() => setHistory([]))
      .finally(() => setLoading(false));
  }, [clientId, deliverableId, draftId]);

  const toggleExpand = (key: string) =>
    setExpanded((s) => {
      const next = new Set(s);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });

  const ACTION_DOT: Record<string, string> = {
    created:   "bg-blue-500",
    edited:    "bg-muted-foreground",
    submitted: "bg-amber-500",
    approved:  "bg-green-500",
    rejected:  "bg-destructive",
  };

  const ACTION_LABEL: Record<string, string> = {
    created:   "Created",
    edited:    "Edited",
    submitted: "Submitted for review",
    approved:  "Approved",
    rejected:  "Rejected / changes requested",
  };

  if (loading)
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );

  if (history.length === 0)
    return (
      <p className="text-xs text-muted-foreground py-4 text-center">
        No history yet.
      </p>
    );

  return (
    <div className="space-y-3">
      {history.map((entry, ei) => {
        const key = entry.id ?? `h-${ei}`;
        return (
          <div key={key} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span
                className={cn(
                  "h-2.5 w-2.5 rounded-full mt-0.5 flex-shrink-0",
                  ACTION_DOT[entry.action] ?? "bg-muted-foreground"
                )}
              />
              {ei < history.length - 1 && (
                <div className="w-px flex-1 bg-border mt-1" />
              )}
            </div>
            <div className="flex-1 min-w-0 pb-3">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-xs font-medium text-foreground">
                  {ACTION_LABEL[entry.action] ?? entry.action}
                </p>
                <span className="text-[10px] text-muted-foreground">
                  v{entry.draftVersion}
                </span>
              </div>
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-0.5">
                <Clock className="h-2.5 w-2.5" />
                <span>{entry.changedBy?.name ?? "Unknown"}</span>
                <span>·</span>
                <span>{timeAgo(entry.changedAt)}</span>
              </div>
              {entry.changes.length > 0 && (
                <div className="mt-1.5 space-y-1">
                  {entry.changes.map((ch, ci) => {
                    const eKey = `${key}-${ci}`;
                    const isSeeMore =
                      ch.to.length > 80 || ch.from.length > 80;
                    const isExpanded = expanded.has(eKey);
                    return (
                      <div
                        key={ci}
                        className="text-[10px] rounded bg-muted/60 px-2 py-1"
                      >
                        <span className="font-medium text-muted-foreground">
                          {ch.label}:{" "}
                        </span>
                        {ch.from && (
                          <>
                            <span className="line-through text-destructive/70">
                              {isSeeMore && !isExpanded
                                ? ch.from.slice(0, 80) + "…"
                                : ch.from}
                            </span>
                            <span className="mx-1 text-muted-foreground">→</span>
                          </>
                        )}
                        <span className="text-foreground">
                          {isSeeMore && !isExpanded
                            ? ch.to.slice(0, 80) + "…"
                            : ch.to}
                        </span>
                        {isSeeMore && (
                          <button
                            onClick={() => toggleExpand(eKey)}
                            className="ml-1 text-primary hover:underline"
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
        );
      })}
    </div>
  );
}

// ── Main Modal ──────────────────────────────────────────────────────
export function ContentPreviewModal({ item, open, onClose, onUpdate, readOnly = false }: Props) {
  const [form, setForm] = useState<Partial<CalendarDraft>>({});
  const [saving, setSaving]     = useState(false);
  const [actioning, setActioning] = useState(false);
  const [note, setNote]         = useState("");
  const [activeTab, setActiveTab] = useState("details");

  // Reset form when item changes
  useEffect(() => {
    if (item?.draft) {
      const d = item.draft;
      setForm({
        caption:      d.caption,
        hashtags:     d.hashtags,
        creativeCopy: d.creativeCopy,
        frames:       d.frames,
        publishDate:  d.publishDate ? d.publishDate.slice(0, 10) : "",
        publishTime:  d.publishTime ?? "",
        imageUrl:     d.imageUrl,
        videoUrl:     d.videoUrl,
        thumbnailUrl: d.thumbnailUrl,
        audioUrl:     d.audioUrl,
        videoType:    d.videoType,
        videoNotes:   d.videoNotes,
        articleMode:  d.articleMode,
        articleCopy:  d.articleCopy,
        notes:        d.notes,
        referenceUrl: d.referenceUrl,
      });
    }
    setNote("");
    setActiveTab("details");
  }, [item?.deliverableId, item?.draft?.id]);

  const patchDraft = useCallback(
    async (body: Record<string, unknown>) => {
      if (!item?.draft) return null;
      const res = await fetch(
        `/api/clients/${item.clientId}/deliverables/${item.deliverableId}/drafts/${item.draft.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    [item]
  );

  const handleSave = async () => {
    if (!item?.draft) return;
    setSaving(true);
    try {
      const updated = await patchDraft({
        caption:      form.caption,
        hashtags:     form.hashtags,
        creativeCopy: form.creativeCopy,
        frames:       form.frames,
        publishDate:  form.publishDate || null,
        publishTime:  form.publishTime || null,
        imageUrl:     form.imageUrl,
        videoUrl:     form.videoUrl,
        thumbnailUrl: form.thumbnailUrl,
        audioUrl:     form.audioUrl,
        videoType:    form.videoType,
        videoNotes:   form.videoNotes,
        articleMode:  form.articleMode,
        articleCopy:  form.articleCopy,
        notes:        form.notes,
        referenceUrl: form.referenceUrl,
      });
      if (updated) {
        onUpdate(item.deliverableId, {
          ...item.draft,
          ...updated,
          id: item.draft.id,
        });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleAction = async (newStatus: DraftStatus, isRejection = false) => {
    if (!item?.draft) return;
    setActioning(true);
    try {
      const body: Record<string, unknown> = { status: newStatus };
      if (note && isRejection) body.rejectionNote = note;
      const updated = await patchDraft(body);
      if (updated) {
        onUpdate(item.deliverableId, {
          ...item.draft,
          ...updated,
          id: item.draft.id,
        });
        setNote("");
      }
    } finally {
      setActioning(false);
    }
  };

  if (!open || !item) return null;

  const draft = item.draft;
  const mod = MODULES.find((m) => m.key === item.module);
  const draftStatusColor = DRAFT_STATUS_COLOR[draft?.status ?? "draft"] ?? "bg-muted text-muted-foreground";
  const mediaCategory = getMediaCategory(draft?.mediaType || "", item.type);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 flex items-center gap-3 px-6 py-4 border-b border-border">
          {mod && (
            <span
              className="h-2.5 w-2.5 rounded-full flex-shrink-0"
              style={{ background: `hsl(var(--mod-${mod.tone}))` }}
            />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">
              {item.title || item.type}
            </p>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <span className="text-[10px] text-muted-foreground capitalize">
                {mod?.label ?? item.module} · {item.calendarName || item.type}
              </span>
              {item.platforms.length > 0 && (
                <span className="text-[10px] text-muted-foreground">
                  · {item.platforms.join(", ")}
                </span>
              )}
              {/* Single status badge: the draft status is the real pipeline
                  state; the deliverable status is only a coarse rollup and is
                  shown only when there is no draft yet. */}
              {draft ? (
                <span
                  className={cn(
                    "text-[10px] font-medium px-1.5 py-0.5 rounded-full",
                    draftStatusColor
                  )}
                >
                  {STATUS_LABEL[draft.status] ?? draft.status}
                </span>
              ) : (
                <span
                  className={cn(
                    "text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground"
                  )}
                >
                  {DELIVERABLE_STATUS_LABEL[item.status] ?? item.status}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground transition-colors flex-shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body: left preview + right editor */}
        <div className="flex-1 min-h-0 grid lg:grid-cols-2 overflow-hidden">
          {/* Left – media preview */}
          <div className="bg-muted/30 border-r border-border flex items-center justify-center p-6 overflow-y-auto">
            {draft ? (
              <MediaPreviewPane item={item} />
            ) : (
              <div className="text-center text-muted-foreground">
                <div className="text-4xl mb-3">📭</div>
                <p className="text-sm">No draft yet</p>
                <p className="text-xs mt-1">Create a copy from the writer workspace first.</p>
              </div>
            )}
          </div>

          {/* Right – tabs */}
          <div className="flex flex-col overflow-hidden">
            {!draft ? (
              <div className="flex-1 flex items-center justify-center p-6">
                <div className="text-center text-muted-foreground">
                  <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No draft to edit</p>
                </div>
              </div>
            ) : (
              <Tabs
                value={activeTab}
                onValueChange={setActiveTab}
                className="flex-1 flex flex-col overflow-hidden"
              >
                <div className="flex-shrink-0 px-6 pt-4">
                  <TabsList className="w-full">
                    <TabsTrigger value="details" className="flex-1">
                      Details
                    </TabsTrigger>
                    {!readOnly && (
                      <TabsTrigger value="history" className="flex-1">
                        History
                      </TabsTrigger>
                    )}
                    {!readOnly && (
                      <TabsTrigger value="approve" className="flex-1">
                        Approve
                      </TabsTrigger>
                    )}
                  </TabsList>
                </div>

                {/* Details Tab */}
                <TabsContent
                  value="details"
                  className="flex-1 overflow-y-auto px-6 pb-6 space-y-4 mt-4"
                >
                  <fieldset disabled={readOnly} className="contents">
                  {/* Carousel frames — editable */}
                  {mediaCategory === "carousel" && draft.frames.length > 0 && (
                    <div className="space-y-3 p-3 rounded-lg bg-muted/40 border border-border">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Carousel Frames ({draft.frames.length})
                      </p>
                      <div className="space-y-3">
                        {(form.frames ?? draft.frames).map((fr, i) => (
                          <div key={i} className="space-y-1">
                            <Label className="text-xs text-muted-foreground">
                              Frame {fr.frameNo}
                            </Label>
                            <Textarea
                              className="min-h-[60px] text-sm"
                              placeholder={`Copy for frame ${fr.frameNo}…`}
                              value={fr.copy ?? ""}
                              onChange={(e) =>
                                setForm((f) => ({
                                  ...f,
                                  frames: (f.frames ?? draft.frames).map(
                                    (frame, idx) =>
                                      idx === i
                                        ? { ...frame, copy: e.target.value }
                                        : frame
                                  ),
                                }))
                              }
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Article/Copy fields */}
                  {(draft.mediaType || item.type).toLowerCase() === "article/copy" ? (
                    <>
                      {form.articleMode === "with-creative" && (
                        <div>
                          <Label className="text-xs">Creative Copy</Label>
                          <Textarea
                            className="mt-1.5 min-h-[80px] text-sm"
                            placeholder="Text displayed on the image / creative…"
                            value={form.creativeCopy ?? ""}
                            onChange={(e) =>
                              setForm((f) => ({ ...f, creativeCopy: e.target.value }))
                            }
                          />
                        </div>
                      )}
                      <div>
                        <Label className="text-xs">Article Copy</Label>
                        <Textarea
                          className="mt-1.5 min-h-[110px] text-sm"
                          placeholder="The body content of the article…"
                          value={form.articleCopy ?? ""}
                          onChange={(e) =>
                            setForm((f) => ({ ...f, articleCopy: e.target.value }))
                          }
                        />
                      </div>
                    </>
                  ) : mediaCategory !== "carousel" && (
                    <div>
                      <Label className="text-xs">Creative Copy</Label>
                      <Textarea
                        className="mt-1.5 min-h-[90px] text-sm"
                        placeholder="Write your content here…"
                        value={form.creativeCopy ?? ""}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, creativeCopy: e.target.value }))
                        }
                      />
                    </div>
                  )}

                  {/* Caption */}
                  <div>
                    <Label className="text-xs">Caption</Label>
                    <Textarea
                      className="mt-1.5 min-h-[70px] text-sm"
                      placeholder="Caption for the post…"
                      value={form.caption ?? ""}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, caption: e.target.value }))
                      }
                    />
                  </div>

                  {/* Hashtags */}
                  <div>
                    <Label className="text-xs">Hashtags</Label>
                    <Input
                      className="mt-1.5 text-xs"
                      placeholder="#tag1 #tag2 #tag3"
                      value={
                        Array.isArray(form.hashtags)
                          ? form.hashtags.join(" ")
                          : ""
                      }
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          hashtags: e.target.value
                            .split(/\s+/)
                            .filter(Boolean),
                        }))
                      }
                    />
                  </div>

                  {/* Dates */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Publish Date</Label>
                      <Input
                        type="date"
                        className="mt-1.5 text-xs"
                        value={form.publishDate ?? ""}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            publishDate: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Publish Time</Label>
                      <Input
                        type="time"
                        className="mt-1.5 text-xs"
                        value={form.publishTime ?? ""}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            publishTime: e.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>

                  {/* Notes */}
                  {(mediaCategory === "video") && (
                    <div>
                      <Label className="text-xs">Video Notes</Label>
                      <Textarea
                        className="mt-1.5 text-sm"
                        placeholder="Director notes, shot list…"
                        value={form.videoNotes ?? ""}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, videoNotes: e.target.value }))
                        }
                      />
                    </div>
                  )}

                  <div>
                    <Label className="text-xs">Internal Notes</Label>
                    <Textarea
                      className="mt-1.5 text-sm"
                      placeholder="Notes for the team…"
                      value={form.notes ?? ""}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, notes: e.target.value }))
                      }
                    />
                  </div>

                  </fieldset>
                  {!readOnly && (
                    <Button className="w-full" onClick={handleSave} disabled={saving}>
                      {saving && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                      Save Changes
                    </Button>
                  )}
                </TabsContent>

                {/* History Tab */}
                <TabsContent
                  value="history"
                  className="flex-1 overflow-y-auto px-6 pb-6 mt-4"
                >
                  <HistoryTab
                    clientId={item.clientId}
                    deliverableId={item.deliverableId}
                    draftId={draft.id}
                  />
                </TabsContent>

                {/* Approve Tab */}
                <TabsContent
                  value="approve"
                  className="flex-1 overflow-y-auto px-6 pb-6 mt-4 space-y-4"
                >
                  <div className="p-3 rounded-lg bg-muted/40 border border-border space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">
                      Current draft status
                    </p>
                    <span
                      className={cn(
                        "inline-block text-xs font-medium px-2 py-0.5 rounded-full",
                        draftStatusColor
                      )}
                    >
                      {STATUS_LABEL[draft.status] ?? draft.status}
                    </span>
                    {draft.lastChangedBy && (
                      <p className="text-[10px] text-muted-foreground mt-1">
                        Last edited by{" "}
                        <span className="font-medium">
                          {draft.lastChangedBy.name}
                        </span>{" "}
                        · {timeAgo(draft.lastChangedBy.changedAt)}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label className="text-xs">Note (optional)</Label>
                    <Textarea
                      className="mt-1.5 text-sm"
                      placeholder="Add a note or feedback…"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-2">
                    {(() => {
                      const normStatus = normalizeDraftStatus(draft.status) ?? "draft";
                      // Applies the design-skip rule: article/copy without a
                      // creative goes straight to design_approved (final).
                      const nextOnApprove = approveTargetFor(normStatus, draft);
                      const nextOnReject = REJECT_TRANSITIONS[normStatus];
                      const approveLabel =
                        normStatus === "content_internal_review" || normStatus === "design_internal_review"
                          ? "Approve → Client Review"
                          : "Client Approved";

                      return (
                        <>
                          {normStatus === "draft" && (
                            <Button
                              variant="outline"
                              onClick={() => handleAction("content_internal_review")}
                              disabled={actioning}
                            >
                              {actioning ? (
                                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                              ) : (
                                <Send className="h-3.5 w-3.5 mr-1.5" />
                              )}
                              Submit for Review
                            </Button>
                          )}
                          {nextOnApprove && (
                            <>
                              <Button
                                onClick={() => handleAction(nextOnApprove)}
                                disabled={actioning}
                                className="bg-green-600 hover:bg-green-700 text-white"
                              >
                                {actioning ? (
                                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                                ) : (
                                  <Check className="h-3.5 w-3.5 mr-1.5" />
                                )}
                                {approveLabel}
                              </Button>
                              <Button
                                variant="outline"
                                onClick={() =>
                                  handleAction(nextOnReject ?? "rejected", true)
                                }
                                disabled={actioning}
                              >
                                {actioning ? (
                                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                                ) : (
                                  <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
                                )}
                                Request Changes
                              </Button>
                            </>
                          )}
                          {normStatus === "content_approved" && (
                            <div className="flex items-center gap-2 text-green-600 text-sm">
                              <Check className="h-4 w-4" />
                              Copy approved — ready for design.
                            </div>
                          )}
                          {normStatus === "design_in_progress" && (
                            <div className="flex items-center gap-2 text-sky-600 text-sm">
                              <Loader2 className="h-4 w-4" />
                              Design in progress — awaiting submission from the designer.
                            </div>
                          )}
                          {normStatus === "design_approved" && (
                            <div className="flex items-center gap-2 text-green-600 text-sm">
                              <Check className="h-4 w-4" />
                              {skipsDesignPhase(draft)
                                ? "Approved — no design phase needed."
                                : "Design approved."}
                            </div>
                          )}
                          {normStatus === "rejected" && (
                            <>
                              <div className="text-xs text-muted-foreground bg-muted/40 rounded-lg p-3">
                                {draft.rejectionNote
                                  ? `Feedback: ${draft.rejectionNote}`
                                  : "Changes were requested."}
                              </div>
                              <Button
                                onClick={() => handleAction("content_internal_review")}
                                disabled={actioning}
                                variant="outline"
                              >
                                Re-submit for Review
                              </Button>
                            </>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </TabsContent>
              </Tabs>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
