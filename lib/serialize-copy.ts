import { normalizeDraftStatus, LEGACY_DRAFT_STATUS_MAP } from "@/lib/status-flow";
import type { DraftStatus } from "@/lib/status-flow";

// Legacy DB values that should match when filtering on a new status
export function dbStatusesFor(status: DraftStatus): string[] {
  const aliases = Object.entries(LEGACY_DRAFT_STATUS_MAP)
    .filter(([, mapped]) => mapped === status)
    .map(([legacy]) => legacy);
  return [status, ...aliases];
}

// Serializes a populated ContentDraft (client, deliverable, calendar, createdBy)
// into the flat shape used by the approvals and designer pages.
export function serializeCopy(draft: any) {
  const client = draft.clientId as any;
  const deliverable = draft.deliverableId as any;
  const calendar = draft.calendarId as any;
  const writer = draft.createdBy as any;

  return {
    draftId: draft._id.toString(),
    deliverableId: deliverable?._id?.toString() ?? draft.deliverableId?.toString(),
    clientId: client?._id?.toString() ?? draft.clientId?.toString(),
    calendarId: calendar?._id?.toString() ?? draft.calendarId?.toString(),
    version: draft.version,
    status: normalizeDraftStatus(draft.status) ?? draft.status,
    mediaType: draft.mediaType || deliverable?.type || "",
    creativeCopy: draft.creativeCopy,
    articleCopy: draft.articleCopy,
    articleMode: draft.articleMode,
    frames: draft.frames ?? [],
    imageUrl: draft.imageUrl,
    videoUrl: draft.videoUrl,
    thumbnailUrl: draft.thumbnailUrl,
    audioUrl: draft.audioUrl,
    videoType: draft.videoType,
    videoNotes: draft.videoNotes,
    caption: draft.caption,
    hashtags: draft.hashtags ?? [],
    publishDate: draft.publishDate,
    publishTime: draft.publishTime,
    referenceUrl: draft.referenceUrl,
    notes: draft.notes,
    rejectionNote: draft.rejectionNote,
    title: deliverable?.title ?? "",
    platforms: deliverable?.platforms ?? [],
    buckets: deliverable?.buckets ?? [],
    module: deliverable?.module ?? "",
    scheduledDate: deliverable?.scheduledDate ?? null,
    clientName: client?.brandName || client?.name || "—",
    calendarName: calendar?.name || "—",
    writerName: writer
      ? `${writer.firstName} ${writer.lastName || ""}`.trim()
      : "—",
    updatedAt: draft.updatedAt,
    lastChangedBy: draft.lastChangedBy ?? null,
    designStartedBy: draft.designStartedBy ?? null,
    archivedAt: draft.archivedAt ?? null,
    archivedBy: draft.archivedBy ?? null,
  };
}
