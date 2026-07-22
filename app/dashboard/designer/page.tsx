"use client";

import { useState, useEffect, useCallback, useRef, useMemo, memo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Loader2, Building2, Calendar, Hash, Image as ImageIcon, Film,
  Send, Upload, ShieldCheck, Palette, User, MessageSquare, Play,
  History, ChevronDown, ChevronUp, Lock, Archive, ArchiveRestore, Trash2, X,
} from "lucide-react";
import { toast, Toaster } from "sonner";
import { STATUS_LABEL, STATUS_COLOR } from "@/lib/status-flow";
import { ContentPreviewModal } from "@/components/calendar/ContentPreviewModal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toCalendarCopy } from "@/lib/adapt-copy";
import type { ApprovalCopy } from "@/lib/adapt-copy";
import { useAuth } from "@/hooks/useAuth";

// Days an archived copy is kept before automatic permanent deletion.
const ARCHIVE_RETENTION_DAYS = 14;

// Whole days remaining before an archived copy is auto-deleted (never negative).
function archiveDaysLeft(archivedAt: string): number {
  const elapsedMs = Date.now() - new Date(archivedAt).getTime();
  const elapsedDays = Math.floor(elapsedMs / (24 * 60 * 60 * 1000));
  return Math.max(0, ARCHIVE_RETENTION_DAYS - elapsedDays);
}

const STAGES = [
  { key: "content_approved",       label: "Ready for Design" },
  { key: "design_in_progress",     label: "In Progress" },
  { key: "design_internal_review", label: "Internal Review" },
  { key: "design_client_review",   label: "Client Review" },
  { key: "history",                label: "History" },
] as const;

type StageKey = (typeof STAGES)[number]["key"];

// The History tab splits into two status buckets.
const HISTORY_SUBS = [
  { key: "design_approved", label: "Approved" },
  { key: "rejected",        label: "Rejected" },
] as const;

type HistorySub = (typeof HISTORY_SUBS)[number]["key"];

function isVideoType(mediaType: string, fileType?: string) {
  if (fileType) return fileType.startsWith("video/");
  return /video|reel|gif/i.test(mediaType);
}

function isCarousel(copy: ApprovalCopy) {
  return copy.mediaType.toLowerCase() === "carousel" || (copy.frames?.length ?? 0) > 1;
}

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

const CopyCard = memo(function CopyCard({
  copy,
  currentUserId,
  isAdmin,
  canArchive,
  inRejectedView,
  onChanged,
  onPreview,
  onUploaded,
  onPatch,
  onRemove,
}: {
  copy: ApprovalCopy;
  currentUserId?: string;
  isAdmin: boolean;
  canArchive: boolean;
  inRejectedView: boolean;
  onChanged: () => void;
  onPreview: (copy: ApprovalCopy) => void;
  onUploaded: (draftId: string, patch: Partial<ApprovalCopy>) => void;
  onPatch: (draftId: string, patch: Partial<ApprovalCopy>) => void;
  onRemove: (draftId: string) => void;
}) {
  const [starting, setStarting] = useState(false);
  const [uploadingFrame, setUploadingFrame] = useState<number | null>(null); // -1 = single upload
  const [submitting, setSubmitting] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [frames, setFrames] = useState(copy.frames ?? []);
  const [attachedUrl, setAttachedUrl] = useState<string>(copy.imageUrl || copy.videoUrl || "");
  const [attachedIsVideo, setAttachedIsVideo] = useState<boolean>(!!copy.videoUrl && !copy.imageUrl);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingFrameRef = useRef<number | null>(null);

  const isArchived = !!copy.archivedAt;
  const isQueue = copy.status === "content_approved" && !isArchived;
  const isWorking = copy.status === "design_in_progress" && !isArchived;
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
        onUploaded(copy.draftId, { frames: updated });
        toast.success(`Creative attached to frame ${frameNo}`);
      } else {
        const video = isVideoType(copy.mediaType, file.type);
        await patchDraft(video ? { videoUrl: fileUrl } : { imageUrl: fileUrl });
        setAttachedUrl(fileUrl);
        setAttachedIsVideo(video);
        onUploaded(copy.draftId, video ? { videoUrl: fileUrl } : { imageUrl: fileUrl });
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

  const handleArchiveToggle = async (action: "archive" | "restore") => {
    setArchiving(true);
    try {
      const res = await fetch(`/api/approvals/copies/${copy.draftId}/archive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");

      if (action === "archive") {
        toast.success("Copy archived");
        // Stays visible (with badge) in the Rejected view; leaves any other list.
        if (inRejectedView) {
          onPatch(copy.draftId, { archivedAt: data.archivedAt, archivedBy: data.archivedBy });
        } else {
          onRemove(copy.draftId);
        }
      } else {
        toast.success("Copy restored");
        // A restored copy only belongs in the Rejected view if it's actually
        // rejected; one archived from an active stage leaves the view.
        if (inRejectedView && copy.status === "rejected") {
          onPatch(copy.draftId, { archivedAt: null, archivedBy: null });
        } else {
          onRemove(copy.draftId);
        }
      }
    } catch (err: any) {
      toast.error(err.message || "Action failed");
    } finally {
      setArchiving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/approvals/copies/${copy.draftId}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Delete failed");
      toast.success("Copy permanently deleted");
      setConfirmDelete(false);
      onRemove(copy.draftId);
    } catch (err: any) {
      toast.error(err.message || "Delete failed");
      setDeleting(false);
    }
  };

  return (
    <Card
      className="cursor-pointer hover:shadow-md hover:border-primary/20 transition-all"
      onClick={() => onPreview(copy)}
    >
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm font-medium text-foreground line-clamp-2 flex-1 min-w-0">{copyText}</p>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <span
              className={`text-[11px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${STATUS_COLOR[copy.status] || "bg-muted text-muted-foreground"}`}
            >
              {STATUS_LABEL[copy.status] || copy.status}
            </span>
            {isArchived && (
              <span className="flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap bg-zinc-200 text-zinc-700">
                <Archive className="h-3 w-3" /> Archived
              </span>
            )}
          </div>
        </div>

        {isArchived && copy.archivedAt && (
          <div className="flex items-center gap-2 text-xs bg-zinc-100 text-zinc-600 rounded-lg p-2.5">
            <Archive className="h-3.5 w-3.5 shrink-0" />
            <span>
              Archived{copy.archivedBy ? ` by ${copy.archivedBy.name}` : ""} ·{" "}
              {new Date(copy.archivedAt).toLocaleDateString()} · auto-deletes in{" "}
              {archiveDaysLeft(copy.archivedAt)} day{archiveDaysLeft(copy.archivedAt) === 1 ? "" : "s"}
            </span>
          </div>
        )}

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
                    disabled={uploadingFrame !== null || (!!claimer && !isMine)}
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
                  disabled={uploadingFrame !== null || (!!claimer && !isMine)}
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
                disabled={submitting || uploadingFrame !== null || !canSubmit || (!!claimer && !isMine)}
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

          {/* Archive / Restore / Delete */}
          {(canArchive || isAdmin) && (
            <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-border">
              {canArchive && !isArchived && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-[11px]"
                  disabled={archiving}
                  onClick={() => handleArchiveToggle("archive")}
                >
                  {archiving ? (
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  ) : (
                    <Archive className="h-3 w-3 mr-1" />
                  )}
                  Archive
                </Button>
              )}
              {canArchive && isArchived && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-[11px]"
                  disabled={archiving}
                  onClick={() => handleArchiveToggle("restore")}
                >
                  {archiving ? (
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  ) : (
                    <ArchiveRestore className="h-3 w-3 mr-1" />
                  )}
                  Restore
                </Button>
              )}
              {isAdmin && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-[11px] text-red-600 hover:text-red-700 hover:bg-red-50"
                  disabled={deleting}
                  onClick={() => setConfirmDelete(true)}
                >
                  <Trash2 className="h-3 w-3 mr-1" /> Delete
                </Button>
              )}
            </div>
          )}

          <ActivityTrail copy={copy} />
        </div>
      </CardContent>

      <ConfirmDialog
        open={confirmDelete}
        destructive
        busy={deleting}
        title="Permanently delete this copy?"
        description={
          <>
            This removes the copy, all attached files (images, videos, documents),
            and its history. <span className="font-medium text-red-600">This cannot be undone.</span>
          </>
        }
        confirmLabel="Delete permanently"
        onConfirm={handleDelete}
        onCancel={() => !deleting && setConfirmDelete(false)}
      />
    </Card>
  );
});


function getTodayString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

interface MultiSelectOption {
  label: string;
  value: string;
}

interface MultiSelectDropdownProps {
  icon?: React.ReactNode;
  label: string;
  options: MultiSelectOption[];
  selectedValues: string[];
  onChange: (selected: string[]) => void;
}

function MultiSelectDropdown({
  icon,
  label,
  options,
  selectedValues,
  onChange,
}: MultiSelectDropdownProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = useMemo(() => {
    if (!search.trim()) return options;
    const q = search.toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, search]);

  const toggleValue = (value: string) => {
    if (selectedValues.includes(value)) {
      onChange(selectedValues.filter((v) => v !== value));
    } else {
      onChange([...selectedValues, value]);
    }
  };

  const selectAll = () => {
    onChange(options.map((o) => o.value));
  };

  const clearAll = () => {
    onChange([]);
  };

  const getDisplayText = () => {
    if (selectedValues.length === 0) {
      return `All ${label}s`;
    }
    if (selectedValues.length === options.length && options.length > 0) {
      return `All ${label}s (${options.length})`;
    }
    if (selectedValues.length === 1) {
      const match = options.find((o) => o.value === selectedValues[0]);
      return match ? match.label : `1 ${label}`;
    }
    return `${selectedValues.length} ${label}s selected`;
  };

  const hasSelection = selectedValues.length > 0;

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen((prev) => !prev)}
        className={`h-9 text-xs justify-between gap-2 border-gray-200 bg-white font-normal hover:bg-gray-50 transition-colors ${
          hasSelection ? "border-primary/50 ring-1 ring-primary/20 text-primary font-medium" : "text-gray-700"
        }`}
      >
        <span className="flex items-center gap-1.5 truncate max-w-[160px]">
          {icon}
          <span className="truncate">{getDisplayText()}</span>
        </span>
        <div className="flex items-center gap-1 shrink-0">
          {hasSelection && (
            <span className="bg-primary text-primary-foreground text-[10px] rounded-full px-1.5 py-0.2 font-semibold">
              {selectedValues.length}
            </span>
          )}
          <ChevronDown className={`h-3.5 w-3.5 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} />
        </div>
      </Button>

      {open && (
        <div className="absolute left-0 mt-1 w-64 rounded-xl border border-gray-200 bg-white p-2 shadow-lg z-50 animate-in fade-in-50 zoom-in-95 duration-100">
          {options.length > 5 && (
            <div className="mb-2">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={`Search ${label.toLowerCase()}s...`}
                className="w-full px-2.5 py-1.5 text-xs rounded-md border border-gray-200 focus:outline-none focus:ring-1 focus:ring-primary text-gray-900 bg-white"
              />
            </div>
          )}

          <div className="flex items-center justify-between px-1 py-1 mb-1 border-b border-gray-100 text-[11px]">
            <button
              type="button"
              onClick={selectAll}
              className="text-primary hover:underline font-medium"
            >
              Select All
            </button>
            <button
              type="button"
              onClick={clearAll}
              className="text-gray-500 hover:text-gray-800 hover:underline"
            >
              Clear
            </button>
          </div>

          <div className="max-h-48 overflow-y-auto space-y-0.5 pr-1">
            {filteredOptions.length === 0 ? (
              <p className="text-xs text-gray-400 py-3 text-center">No options found</p>
            ) : (
              filteredOptions.map((opt) => {
                const checked = selectedValues.includes(opt.value);
                return (
                  <label
                    key={opt.value}
                    onClick={(e) => e.stopPropagation()}
                    className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-xs cursor-pointer select-none transition-colors ${
                      checked ? "bg-primary/5 text-primary font-medium" : "hover:bg-gray-50 text-gray-700"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleValue(opt.value)}
                      className="h-3.5 w-3.5 rounded border-gray-300 text-primary focus:ring-primary accent-primary"
                    />
                    <span className="truncate">{opt.label}</span>
                  </label>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function DesignerPage() {
  const { user } = useAuth();
  const [stage, setStage] = useState<StageKey>("content_approved");
  const [historySub, setHistorySub] = useState<HistorySub>("design_approved");
  const [copies, setCopies] = useState<ApprovalCopy[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewCopy, setPreviewCopy] = useState<ApprovalCopy | null>(null);
  const [clients, setClients] = useState<{ id: string; companyName: string }[]>([]);
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [selectedMediaTypes, setSelectedMediaTypes] = useState<string[]>([]);
  const [startDate, setStartDate] = useState<string>(getTodayString);
  const [endDate, setEndDate] = useState<string>("");

  const isAdmin = user?.role === "admin";
  const canArchive = user?.role === "admin" || user?.role === "member";

  // The tab drives which DB status we list. "history" is a UI-only tab whose
  // sub-tabs map to real statuses.
  const activeStatus: string = stage === "history" ? historySub : stage;
  // The Rejected sub-tab also surfaces archived copies (with an Archived badge).
  const inRejectedView = stage === "history" && historySub === "rejected";

  // Per-status cache for instant tab switches (stale-while-revalidate).
  const cacheRef = useRef<Record<string, ApprovalCopy[]>>({});
  // Guards against out-of-order responses when tabs are switched quickly.
  const reqRef = useRef<string>("");
  const activeStatusRef = useRef(activeStatus);
  activeStatusRef.current = activeStatus;

  const loadCopies = useCallback(async (s: string, { bustCache = false } = {}) => {
    if (bustCache) cacheRef.current = {};
    const cached = cacheRef.current[s];
    if (cached) {
      setCopies(cached);
      setLoading(false);
    } else {
      setLoading(true);
    }
    reqRef.current = s;
    try {
      // The rejected bucket additionally includes archived copies.
      const qs = s === "rejected" ? `status=${s}&includeArchived=1` : `status=${s}`;
      const data = await fetch(`/api/approvals/copies?${qs}`).then((r) => r.json());
      const list: ApprovalCopy[] = Array.isArray(data) ? data : [];
      cacheRef.current[s] = list;
      if (reqRef.current === s) setCopies(list);
    } finally {
      if (reqRef.current === s) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCopies(activeStatus);
  }, [activeStatus, loadCopies]);

  useEffect(() => {
    fetch("/api/clients")
      .then((res) => (res.ok ? res.json() : []))
      .then((data: any[]) =>
        setClients(
          data.map((c) => ({
            id: c.id,
            companyName: c.brandName || c.name || "Unknown",
          }))
        )
      )
      .catch(console.error);
  }, []);

  // Stable card callbacks so memoized CopyCards don't re-render on every parent update.
  const handleChanged = useCallback(() => {
    // A mutation can move a copy between statuses, so drop the whole cache.
    loadCopies(activeStatusRef.current, { bustCache: true });
  }, [loadCopies]);

  const handlePreview = useCallback((copy: ApprovalCopy) => setPreviewCopy(copy), []);

  const handleUploaded = useCallback((draftId: string, patch: Partial<ApprovalCopy>) => {
    setCopies((prev) => {
      const next = prev.map((c) => (c.draftId === draftId ? { ...c, ...patch } : c));
      const s = activeStatusRef.current;
      if (cacheRef.current[s]) cacheRef.current[s] = next;
      return next;
    });
    setPreviewCopy((prev) =>
      prev && prev.draftId === draftId ? { ...prev, ...patch } : prev
    );
  }, []);

  // Patch a copy in the current view and drop sibling caches — archive/restore
  // moves an item between status buckets, so other tabs must refetch on visit.
  const handlePatchIsolated = useCallback((draftId: string, patch: Partial<ApprovalCopy>) => {
    setCopies((prev) => {
      const next = prev.map((c) => (c.draftId === draftId ? { ...c, ...patch } : c));
      cacheRef.current = { [activeStatusRef.current]: next };
      return next;
    });
    setPreviewCopy((prev) =>
      prev && prev.draftId === draftId ? { ...prev, ...patch } : prev
    );
  }, []);

  // Drop a copy from the current view immediately (archive-out / restore-out / delete).
  const handleRemove = useCallback((draftId: string) => {
    setCopies((prev) => {
      const next = prev.filter((c) => c.draftId !== draftId);
      cacheRef.current = { [activeStatusRef.current]: next };
      return next;
    });
    setPreviewCopy((prev) => (prev && prev.draftId === draftId ? null : prev));
  }, []);

  const clientOptions = useMemo(
    () => clients.map((c) => ({ label: c.companyName, value: c.id })),
    [clients]
  );

  const availableMediaTypes = useMemo(() => {
    const defaultTypes = ["Image", "Video", "Carousel", "Reel", "GIF", "Story", "Article"];
    const fromCopies = copies.map((c) => c.mediaType).filter(Boolean);
    const set = new Set<string>();

    defaultTypes.forEach((t) => set.add(t));
    fromCopies.forEach((t) => {
      const formatted = t.charAt(0).toUpperCase() + t.slice(1);
      set.add(formatted);
    });

    return Array.from(set).map((t) => ({ label: t, value: t }));
  }, [copies]);

  const filteredCopies = useMemo(() => {
    return copies.filter((copy) => {
      // 1. Multi-select Client filter
      if (selectedClients.length > 0 && !selectedClients.includes(copy.clientId)) {
        return false;
      }

      // 2. Multi-select Media Type filter
      if (selectedMediaTypes.length > 0) {
        const copyMedia = (copy.mediaType || "").toLowerCase();
        const match = selectedMediaTypes.some(
          (m) => m.toLowerCase() === copyMedia
        );
        if (!match) return false;
      }

      // 3. Date range filter (Start Date default current date, End Date picker)
      const rawDate = copy.publishDate || copy.scheduledDate || copy.updatedAt;
      if (rawDate) {
        const d = new Date(rawDate);
        if (!isNaN(d.getTime())) {
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, "0");
          const day = String(d.getDate()).padStart(2, "0");
          const copyYMD = `${y}-${m}-${day}`;

          if (startDate && copyYMD < startDate) return false;
          if (endDate && copyYMD > endDate) return false;
        }
      }

      return true;
    });
  }, [copies, selectedClients, selectedMediaTypes, startDate, endDate]);

  const hasActiveFilters =
    selectedClients.length > 0 ||
    selectedMediaTypes.length > 0 ||
    startDate !== getTodayString() ||
    endDate !== "";

  const handleResetFilters = () => {
    setSelectedClients([]);
    setSelectedMediaTypes([]);
    setStartDate(getTodayString());
    setEndDate("");
  };

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

      <div className="space-y-3 bg-white p-3.5 rounded-xl border border-gray-100 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full lg:w-auto">
            <Tabs value={stage} onValueChange={(v) => setStage(v as StageKey)}>
              <TabsList>
                {STAGES.map((s) => (
                  <TabsTrigger key={s.key} value={s.key}>
                    {s.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            {stage === "history" && (
              <Tabs value={historySub} onValueChange={(v) => setHistorySub(v as HistorySub)}>
                <TabsList>
                  {HISTORY_SUBS.map((s) => (
                    <TabsTrigger key={s.key} value={s.key}>
                      {s.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-gray-100">
          {/* Multi-Select Client Filter */}
          <MultiSelectDropdown
            icon={<Building2 className="w-3.5 h-3.5 text-gray-400" />}
            label="Client"
            options={clientOptions}
            selectedValues={selectedClients}
            onChange={setSelectedClients}
          />

          {/* Multi-Select Media Type Filter */}
          <MultiSelectDropdown
            icon={<Film className="w-3.5 h-3.5 text-gray-400" />}
            label="Media Type"
            options={availableMediaTypes}
            selectedValues={selectedMediaTypes}
            onChange={setSelectedMediaTypes}
          />

          {/* Date Range Filter (Start Date default current date, End Date picker) */}
          <div className="flex items-center gap-1.5 bg-gray-50/80 border border-gray-200 rounded-lg px-2.5 py-1">
            <Calendar className="h-3.5 w-3.5 text-gray-400 shrink-0" />
            <div className="flex items-center gap-1">
              <span className="text-[11px] font-medium text-gray-500">From:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="text-xs bg-transparent border-0 focus:outline-none focus:ring-0 text-gray-800 font-medium p-0"
                title="Start Date"
              />
            </div>
            <span className="text-gray-300 text-xs px-0.5">-</span>
            <div className="flex items-center gap-1">
              <span className="text-[11px] font-medium text-gray-500">To:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="text-xs bg-transparent border-0 focus:outline-none focus:ring-0 text-gray-800 font-medium p-0"
                title="End Date"
              />
            </div>
            {(startDate || endDate) && (
              <button
                type="button"
                onClick={() => {
                  setStartDate("");
                  setEndDate("");
                }}
                className="ml-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-200 p-0.5 transition-colors"
                title="Clear dates"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* Reset Filters button when active */}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetFilters}
              className="h-8 text-xs text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3 mr-1" /> Reset filters
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading copies…
        </div>
      ) : filteredCopies.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center space-y-3">
            <ImageIcon className="h-10 w-10 text-muted-foreground/30 mx-auto" />
            <p className="text-sm text-muted-foreground">
              {hasActiveFilters
                ? "No copies match the selected filters."
                : activeStatus === "content_approved"
                ? "No approved copies waiting for design."
                : activeStatus === "design_approved"
                ? "No approved copies yet."
                : activeStatus === "rejected"
                ? "No rejected copies."
                : `No copies in ${STAGES.find((s) => s.key === stage)?.label.toLowerCase()}.`}
            </p>
            {hasActiveFilters && (
              <Button variant="outline" size="sm" onClick={handleResetFilters}>
                Clear Filters
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredCopies.map((copy) => (
            <CopyCard
              key={copy.draftId}
              copy={copy}
              currentUserId={user?.id}
              isAdmin={isAdmin}
              canArchive={canArchive}
              inRejectedView={inRejectedView}
              onChanged={handleChanged}
              onPreview={handlePreview}
              onUploaded={handleUploaded}
              onPatch={handlePatchIsolated}
              onRemove={handleRemove}
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
          handleChanged();
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
