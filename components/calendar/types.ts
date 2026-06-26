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
  status: "draft" | "submitted" | "approved" | "rejected";
  rejectionNote: string;
  lastChangedBy: {
    userId: string;
    name: string;
    email: string;
    changedAt: string;
  } | null;
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
  draft: CalendarDraft | null;
}
