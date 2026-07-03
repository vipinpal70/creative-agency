"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Loader2, Building2, Calendar, Hash, Image as ImageIcon, Film,
  Send, Upload, ShieldCheck, Palette, User, MessageSquare, Play,
  History, ChevronDown, ChevronUp, Lock,
} from "lucide-react";
import { toast, Toaster } from "sonner";
import { STATUS_LABEL, STATUS_COLOR } from "@/lib/status-flow";
import { ContentPreviewModal } from "@/components/calendar/ContentPreviewModal";
import { toCalendarCopy } from "@/lib/adapt-copy";
import type { ApprovalCopy } from "@/lib/adapt-copy";
import { useAuth } from "@/hooks/useAuth";

const STAGES = [
  { key: "content_approved",       label: "Ready for Design" },
  { key: "design_in_progress",     label: "In Progress" },
  { key: "design_internal_review", label: "Internal Review" },
  { key: "design_client_review",   label: "Client Review" },
  { key: "design_approved",        label: "Approved" },
] as const;

type StageKey = (typeof STAGES)[number]["key"];

function isVideoType(mediaType: string, fileType?: string) {
  if (fileType) return fileType.startsWith("video/");
  return /video|reel|gif/i.test(mediaType);
}

function isCarousel(copy: ApprovalCopy) {
  return copy.mediaType.toLowerCase() === "carousel" || (copy.frames?.length ?? 0) > 1;
}

// ─── Design activity trail (lazy-loaded from draft history) ──────────────────

interface HistoryEntry {
  id: string;
  action: "created" | "edited" | "submitted" | "approved" | "rejected";
  changedBy: { userId: string; name: string; email: string };
  changedAt: string;
  changes: { field: string; label: string; from: string; to: string }[];
}

function describeEntry(entry: HistoryEntry): string {
  const statusChange = entry.changes?.find((c) => c.field === "status");
  if (statusChange?.to === "design_in_progress") return "Started work";
  if (entry.action === "submitted") return "Submitted for review";
  if (entry.action === "approved") return "Approved";
  if (entry.action === "rejected") return "Rejected / changes requested";
  if (entry.changes?.some((c) => ["imageUrl", "videoUrl", "thumbnailUrl", "audioUrl", "frames"].includes(c.field))) {
    return "Uploaded creative";
  }
  if (entry.action === "created") return "Created";
  return "Edited";
}

function ActivityTrail({ copy }: { copy: ApprovalCopy }) {
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState<HistoryEntry[] | null>(null);
  const [loading, setLoading] = useState(false);

  const toggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const next = !open;
    setOpen(next);
    if (next && entries === null) {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/clients/${copy.clientId}/deliverables/${copy.deliverableId}/drafts/${copy.draftId}/history`
        );
        const data = await res.json();
        setEntries(Array.isArray(data) ? data : []);
      } catch {
        setEntries([]);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div onClick={(e) => e.stopPropagation()}>
      <button
        onClick={toggle}
        className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
      >
        <History className="h-3 w-3" />
        Activity
        {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </button>
      {open && (
        <div className="mt-2 space-y-1.5 border-l-2 border-border pl-3">
          {loading ? (
            <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
          ) : entries && entries.length > 0 ? (
            entries.slice(0, 8).map((entry, i) => (
              <div key={entry.id ?? i} className="text-[11px] text-muted-foreground">
                <span className="font-medium text-foreground">{describeEntry(entry)}</span>
                {" · "}{entry.changedBy?.name || "—"}
                {" · "}{new Date(entry.changedAt).toLocaleDateString()}
              </div>
            ))
          ) : (
            <p className="text-[11px] text-muted-foreground">No activity yet.</p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Copy card ────────────────────────────────────────────────────────────────

function CopyCard({
  copy,
  currentUserId,
  isAdmin,
  onChanged,
  onPreview,
}: {
  copy: ApprovalCopy;
  currentUserId?: string;
  isAdmin: boolean;
  onChanged: () => void;
  onPreview: () => void;
}) {
  const [starting, setStarting] = useState(false);
  const [uploadingFrame, setUploadingFrame] = useState<number | null>(null); // -1 = single upload
  const [submitting, setSubmitting] = useState(false);
  const [frames, setFrames] = useState(copy.frames ?? []);
  const [attachedUrl, setAttachedUrl] = useState<string>(copy.imageUrl || copy.videoUrl || "");
  const [attachedIsVideo, setAttachedIsVideo] = useState<boolean>(!!copy.videoUrl && !copy.imageUrl);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingFrameRef = useRef<number | null>(null);

  const isQueue = copy.status === "content_approved";
  const isWorking = copy.status === "design_in_progress";
  const carousel = isCarousel(copy);

  const claimer = copy.designStartedBy;
  const isMine = !!claimer && claimer.userId === currentUserId;
  const canWork = isWorking && (isMine || isAdmin || !claimer);

  const allFramesFilled = frames.length > 0 && frames.every((f) => !!f.imageUrl);
  const canSubmit = carousel ? allFramesFilled : !!attachedUrl;

  const copyText =
    copy.creativeCopy ||
    copy.articleCopy ||
    (frames.length > 0 ? `[Carousel · ${frames.length} frames] ${frames[0]?.copy || ""}` : "") ||
    copy.title ||
    "—";

  const patchDraft = async (body: Record<string, unknown>) => {
    const res = await fetch(
      `/api/clients/${copy.clientId}/deliverables/${copy.deliverableId}/drafts/${copy.draftId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }
    );
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Request failed");
    return data;
  };

  const handleStartWork = async () => {
    setStarting(true);
    try {
      await patchDraft({ status: "design_in_progress" });
      toast.success("Work started — this copy is now assigned to you");
      onChanged();
    } catch (err: any) {
      toast.error(err.message || "Failed to start work");
    } finally {
      setStarting(false);
    }
  };

  const uploadFile = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("clientId", copy.clientId);
    const res = await fetch("/api/creative-upload", { method: "POST", body: formData });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Upload failed");
    return data.fileUrl as string;
  };

  const handleFileSelected = async (file: File) => {
    const frameNo = pendingFrameRef.current;
    pendingFrameRef.current = null;
    setUploadingFrame(frameNo ?? -1);
    try {
      const fileUrl = await uploadFile(file);
      if (frameNo !== null && frameNo !== undefined && frameNo >= 0) {
        // Carousel: write the creative onto the selected frame
        const updated = frames.map((f) =>
          f.frameNo === frameNo ? { ...f, imageUrl: fileUrl } : f
        );
        await patchDraft({ frames: updated });
        setFrames(updated);
        toast.success(`Creative attached to frame ${frameNo}`);
      } else {
        const video = isVideoType(copy.mediaType, file.type);
        await patchDraft(video ? { videoUrl: fileUrl } : { imageUrl: fileUrl });
        setAttachedUrl(fileUrl);
        setAttachedIsVideo(video);
        toast.success("Creative attached to copy");
      }
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploadingFrame(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const pickFile = (frameNo: number | null) => {
    pendingFrameRef.current = frameNo;
    fileInputRef.current?.click();
  };

  const handleSubmit = async () => {
    if (!canSubmit) {
      toast.error(
        carousel
          ? "Attach a creative to every frame before submitting"
          : "Attach a creative before submitting for review"
      );
      return;
    }
    setSubmitting(true);
    try {
      await patchDraft({ status: "design_internal_review" });
      toast.success("Design submitted for internal review");
      onChanged();
    } catch (err: any) {
      toast.error(err.message || "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card
      className="cursor-pointer hover:shadow-md hover:border-primary/20 transition-all"
      onClick={onPreview}
    >
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm font-medium text-foreground line-clamp-2 flex-1 min-w-0">{copyText}</p>
          <span
            className={`text-[11px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${STATUS_COLOR[copy.status] || "bg-muted text-muted-foreground"}`}
          >
            {STATUS_LABEL[copy.status] || copy.status}
          </span>
        </div>

        {copy.caption && (
          <p className="text-xs text-muted-foreground line-clamp-1 italic">{copy.caption}</p>
        )}

        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Building2 className="h-3 w-3" /> {copy.clientName}
          </span>
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {copy.publishDate ? new Date(copy.publishDate).toLocaleDateString() : "—"}
            {copy.publishTime ? ` at ${copy.publishTime}` : ""}
          </span>
          {copy.mediaType && (
            <span className="flex items-center gap-1">
              <Film className="h-3 w-3" /> {copy.mediaType}
            </span>
          )}
          {copy.platforms.length > 0 && <span>{copy.platforms.join(", ")}</span>}
          {copy.buckets.length > 0 && (
            <span className="flex items-center gap-1">
              <Hash className="h-3 w-3" /> {copy.buckets[0]}
            </span>
          )}
          <span className="flex items-center gap-1">
            <User className="h-3 w-3" /> {copy.writerName}
          </span>
        </div>

        {copy.hashtags.length > 0 && (
          <p className="text-xs text-primary/70 line-clamp-1">{copy.hashtags.join(" ")}</p>
        )}

        {/* Who is working on it */}
        {claimer && (
          <div className="flex items-center gap-2 text-xs bg-sky-50 text-sky-700 rounded-lg p-2.5">
            {isMine ? <Palette className="h-3.5 w-3.5 shrink-0" /> : <Lock className="h-3.5 w-3.5 shrink-0" />}
            <span>
              {isMine ? "You are working on this" : `Being worked on by ${claimer.name}`}
              {" · started "}{new Date(claimer.startedAt).toLocaleDateString()}
            </span>
          </div>
        )}

        {/* Design rework feedback */}
        {copy.rejectionNote && isWorking && (
          <div className="flex items-start gap-2 text-xs bg-red-50 text-red-700 rounded-lg p-2.5">
            <MessageSquare className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <span>Design feedback: {copy.rejectionNote}</span>
          </div>
        )}

        {/* Attached creative summary (non-carousel) */}
        {!carousel && attachedUrl && (
          <div
            className="flex items-center gap-3 bg-accent/20 border border-border rounded-lg p-2.5"
            onClick={(e) => e.stopPropagation()}
          >
            {attachedIsVideo ? (
              <Film className="h-4 w-4 text-muted-foreground shrink-0" />
            ) : (
              <img
                src={attachedUrl}
                alt="Attached creative"
                className="h-12 w-12 rounded-md object-cover shrink-0"
              />
            )}
            <a
              href={attachedUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-primary hover:underline truncate"
            >
              View attached creative
            </a>
          </div>
        )}

        {/* Carousel frame slots */}
        {carousel && frames.length > 0 && (isWorking || copy.status !== "content_approved") && (
          <div
            className="grid grid-cols-2 sm:grid-cols-3 gap-2"
            onClick={(e) => e.stopPropagation()}
          >
            {frames.map((frame) => (
              <div
                key={frame.frameNo}
                className="border border-border rounded-lg p-2 space-y-1.5 bg-accent/10"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase">
                    Frame {frame.frameNo}
                  </span>
                  {frame.imageUrl && (
                    <span className="text-[10px] text-green-600 font-medium">✓</span>
                  )}
                </div>
                {frame.imageUrl ? (
                  <img
                    src={frame.imageUrl}
                    alt={`Frame ${frame.frameNo}`}
                    className="w-full aspect-square rounded-md object-cover"
                  />
                ) : (
                  <div className="w-full aspect-square rounded-md bg-muted/50 flex items-center justify-center">
                    <ImageIcon className="h-5 w-5 text-muted-foreground/40" />
                  </div>
                )}
                {canWork && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full h-7 text-[11px]"
                    disabled={uploadingFrame !== null}
                    onClick={() => pickFile(frame.frameNo)}
                  >
                    {uploadingFrame === frame.frameNo ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <>
                        <Upload className="h-3 w-3 mr-1" />
                        {frame.imageUrl ? "Replace" : "Upload"}
                      </>
                    )}
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Actions — must not trigger the preview modal */}
        <div onClick={(e) => e.stopPropagation()} className="space-y-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*,.pdf"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileSelected(file);
            }}
          />

          {isQueue && (
            <Button size="sm" disabled={starting} onClick={handleStartWork}>
              {starting ? (
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              ) : (
                <Play className="h-3 w-3 mr-1" />
              )}
              Start Work
            </Button>
          )}

          {isWorking && canWork && (
            <div className="flex items-center gap-2 flex-wrap">
              {!carousel && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={uploadingFrame !== null}
                  onClick={() => pickFile(null)}
                >
                  {uploadingFrame !== null ? (
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  ) : (
                    <Upload className="h-3 w-3 mr-1" />
                  )}
                  {attachedUrl ? "Replace Creative" : "Upload Creative"}
                </Button>
              )}
              <Button
                size="sm"
                disabled={submitting || uploadingFrame !== null || !canSubmit}
                onClick={handleSubmit}
              >
                {submitting ? (
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                ) : (
                  <Send className="h-3 w-3 mr-1" />
                )}
                Submit for Design Review
              </Button>
              {carousel && !allFramesFilled && (
                <span className="text-[11px] text-muted-foreground">
                  {frames.filter((f) => f.imageUrl).length}/{frames.length} frames uploaded
                </span>
              )}
            </div>
          )}

          <ActivityTrail copy={copy} />
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DesignerPage() {
  const { user } = useAuth();
  const [stage, setStage] = useState<StageKey>("content_approved");
  const [copies, setCopies] = useState<ApprovalCopy[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewCopy, setPreviewCopy] = useState<ApprovalCopy | null>(null);

  const isAdmin = user?.role === "admin";

  const loadCopies = useCallback(async (s: StageKey) => {
    setLoading(true);
    try {
      const data = await fetch(`/api/approvals/copies?status=${s}`).then((r) => r.json());
      setCopies(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCopies(stage);
  }, [stage, loadCopies]);

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <Palette className="h-5 w-5" /> Designer's Workspace
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Approved copies ready for creative production.
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <a href="/dashboard/approvals">
            <ShieldCheck className="h-4 w-4 mr-1.5" /> Approvals
          </a>
        </Button>
      </div>

      <Tabs value={stage} onValueChange={(v) => setStage(v as StageKey)}>
        <TabsList>
          {STAGES.map((s) => (
            <TabsTrigger key={s.key} value={s.key}>
              {s.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading copies…
        </div>
      ) : copies.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center space-y-3">
            <ImageIcon className="h-10 w-10 text-muted-foreground/30 mx-auto" />
            <p className="text-sm text-muted-foreground">
              {stage === "content_approved"
                ? "No approved copies waiting for design."
                : `No copies in ${STAGES.find((s) => s.key === stage)?.label.toLowerCase()}.`}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {copies.map((copy) => (
            <CopyCard
              key={copy.draftId}
              copy={copy}
              currentUserId={user?.id}
              isAdmin={isAdmin}
              onChanged={() => loadCopies(stage)}
              onPreview={() => setPreviewCopy(copy)}
            />
          ))}
        </div>
      )}

      {/* Instagram-style preview (same modal the content calendar uses) */}
      <ContentPreviewModal
        item={previewCopy ? toCalendarCopy(previewCopy) : null}
        open={!!previewCopy}
        onClose={() => {
          setPreviewCopy(null);
          loadCopies(stage);
        }}
        onUpdate={(_deliverableId, updatedDraft) => {
          setPreviewCopy((prev) =>
            prev
              ? {
                  ...prev,
                  ...updatedDraft,
                  draftId: prev.draftId,
                  status: updatedDraft.status ?? prev.status,
                  publishDate:
                    updatedDraft.publishDate !== undefined ? updatedDraft.publishDate : prev.publishDate,
                }
              : prev
          );
        }}
      />

      <Toaster position="top-right" richColors />
    </div>
  );
}
