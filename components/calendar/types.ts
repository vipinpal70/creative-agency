import type { DraftStatus } from "@/lib/status-flow";

export interface CalendarDraft {
  id: string;
  version: number;
  mediaType: string;
  creativeCopy: string;
  frames: { frameNo: number; copy: string; imageUrl: string }[];
  imageUrl: string;
  videoUrl: string;
  thumbnailUrl: string;
  audioUrl: string;
  caption: string;
  hashtags: string[];
  publishDate: string | null;
  publishTime: string | null;
  referenceUrl: string;
  videoType: string;
  videoNotes: string;
  articleMode: string;
  articleCopy: string;
  notes: string;
  // New pipeline statuses, plus legacy "submitted"/"approved" from old documents
  status: DraftStatus | "submitted" | "approved";
  rejectionNote: string;
  lastChangedBy: {
    userId: string;
    name: string;
    email: string;
    changedAt: string;
  } | null;
}

export type TimelineStatus =
  | "created"
  | "draft"
  | "content_internal_review"
  | "content_client_review"
  | "content_approved"
  | "design_internal_review"
  | "design_client_review"
  | "design_approved"
  | "rejected"
  | "publish"
  // legacy values from before the content/design split
  | "internal_review"
  | "client_review"
  | "approved";

export interface TimelineEntry {
  status:    TimelineStatus;
  timestamp: string;
  changedBy: { userId: string; name: string; email: string };
}

export interface StatusTimeline {
  writerTimeline:   TimelineEntry[];
  designerTimeline: TimelineEntry[];
}

export interface CalendarCopy {
  deliverableId: string;
  calendarId: string;
  scopeId: string;
  clientId: string;
  module: string;
  calendarName: string;
  type: string;
  platforms: string[];
  title: string;
  status: string;
  buckets: string[];
  scheduledDate: string | null;
  statusTimeline: StatusTimeline;
  draft: CalendarDraft | null;
}
