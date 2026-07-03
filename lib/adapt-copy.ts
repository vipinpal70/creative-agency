import type { CalendarCopy, CalendarDraft } from "@/components/calendar/types";

// Flat copy shape returned by /api/approvals/copies (see lib/serialize-copy.ts).
// Used by the approvals page and the designer workspace.
export interface ApprovalCopy {
  draftId: string;
  deliverableId: string;
  clientId: string;
  calendarId: string;
  version: number;
  status: string;
  mediaType: string;
  creativeCopy: string;
  articleCopy: string;
  articleMode: string;
  frames: { frameNo: number; copy: string; imageUrl: string }[];
  imageUrl: string;
  videoUrl: string;
  thumbnailUrl: string;
  audioUrl: string;
  videoType: string;
  videoNotes: string;
  caption: string;
  hashtags: string[];
  publishDate: string | null;
  publishTime: string | null;
  referenceUrl: string;
  notes: string;
  rejectionNote: string;
  title: string;
  platforms: string[];
  buckets: string[];
  module: string;
  scheduledDate: string | null;
  clientName: string;
  calendarName: string;
  writerName: string;
  updatedAt: string;
  lastChangedBy: { userId: string; name: string; email: string; changedAt: string } | null;
  designStartedBy: { userId: string; name: string; email: string; startedAt: string } | null;
}

// Adapts the flat approvals API shape into the CalendarCopy/CalendarDraft
// shape that ContentPreviewModal expects.
export function toCalendarCopy(copy: ApprovalCopy): CalendarCopy {
  const draft: CalendarDraft = {
    id: copy.draftId,
    version: copy.version,
    mediaType: copy.mediaType,
    creativeCopy: copy.creativeCopy,
    frames: copy.frames ?? [],
    imageUrl: copy.imageUrl,
    videoUrl: copy.videoUrl,
    thumbnailUrl: copy.thumbnailUrl,
    audioUrl: copy.audioUrl,
    caption: copy.caption,
    hashtags: copy.hashtags ?? [],
    publishDate: copy.publishDate,
    publishTime: copy.publishTime,
    referenceUrl: copy.referenceUrl,
    videoType: copy.videoType,
    videoNotes: copy.videoNotes,
    articleMode: copy.articleMode,
    articleCopy: copy.articleCopy,
    notes: copy.notes,
    status: copy.status as CalendarDraft["status"],
    rejectionNote: copy.rejectionNote,
    lastChangedBy: copy.lastChangedBy,
  };
  return {
    deliverableId: copy.deliverableId,
    calendarId: copy.calendarId,
    scopeId: "",
    clientId: copy.clientId,
    module: copy.module,
    calendarName: copy.calendarName,
    type: copy.mediaType,
    platforms: copy.platforms ?? [],
    title: copy.title,
    status: copy.status,
    buckets: copy.buckets ?? [],
    scheduledDate: copy.scheduledDate,
    statusTimeline: { writerTimeline: [], designerTimeline: [] },
    draft,
  };
}
