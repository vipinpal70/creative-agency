import type { DraftStatus } from "@/lib/status-flow";

export interface ContentBucket {
  id: string;
  name: string;
  description: string;
}

// Used by CopyEntryForm / CopyList for the "add copy" UI flow
export interface CarouselFrame {
  frameNo: number;
  copy: string;
  imageUrl: string;  // optional — designer fills post-creation
}

export interface CopyFormData {
  mediaType: string;
  creativeCopy: string;      // used for non-carousel posts
  frames?: CarouselFrame[];  // used when mediaType === "carousel"
  caption: string;
  hashtags: string;          // space/comma-separated string, split on submit
  publishDate: string;
  publishTime: string;
  contentBucket: string;
  platforms: string[];
  referenceUrl?: string;
  videoType?: string;
  videoNotes?: string;
  articleMode?: string;      // "with-creative" | "without-creative" — only for article/copy media type
  articleCopy?: string;      // written article/copy text — only for article/copy media type
}

export interface LastChangedBy {
  userId:    string;
  name:      string;
  email:     string;
  changedAt: string;
}

export interface HistoryChange {
  field: string;
  label: string;
  from:  string;
  to:    string;
}

export interface HistoryEntry {
  id:           string;
  action:       "created" | "edited" | "submitted" | "approved" | "rejected";
  changedBy:    { userId: string; name: string; email: string };
  changedAt:    string;
  draftVersion: number;
  changes:      HistoryChange[];
}

// Snapshot of a draft version (comes from API)
export interface DraftSnapshot {
  id: string;
  version: number;
  creativeCopy: string;
  frames?: { frameNo: number; copy: string; imageUrl: string }[];
  caption: string;
  hashtags: string[];
  publishDate: string | null;
  publishTime: string | null;
  mediaType: string;
  referenceUrl?: string;
  videoType?: string;
  videoNotes?: string;
  articleMode?: string;
  articleCopy?: string;
  // New pipeline statuses, plus legacy "submitted"/"approved" from old documents
  status: DraftStatus | "submitted" | "approved";
  rejectionNote?: string;
  lastChangedBy?: LastChangedBy | null;
}

// A deliverable returned by the API, optionally enriched with its latest draft
export interface WriterDeliverable {
  id: string;
  type: string;
  platforms: string[];
  title: string;
  buckets: string[];
  status: string;
  scheduledDate: string;
  latestDraft: DraftSnapshot | null;
}

// Planned item from scope (what the calendar is supposed to deliver)
export interface PlannedItem {
  scopeItemId: string;
  label: string;
  type: string;
  platforms: string[];
  plannedQty: number;
  totalInScope: number;
  // only on single-calendar GET
  createdQty?: number;
  deliveredQty?: number;
}

// A calendar as returned by /api/writer/calendars
export interface WriterCalendar {
  id: string;
  clientId: string;
  clientName: string;
  scopeId: string;
  module: string;
  name: string;
  objective: string;
  buckets: string[];
  startDate: string;
  endDate: string;
  status: string;
  plannedItems: PlannedItem[];
  progress: { totalPlanned: number; totalCreated: number; totalDelivered: number };
}

// Legacy: kept so ObjectiveStep / BucketsStep still compile unchanged
export interface CalendarData {
  objective: string;
  buckets: ContentBucket[];
  copies: never[];  // replaced by WriterDeliverable[]
}

export const MEDIA_TYPES = [
  "Text",
  "Static",
  "Carousel",
  "Video / Reel",
  "GIF",
  "Long Format",
] as const;

export const PLATFORMS = [
  "Instagram",
  "Facebook",
  "LinkedIn",
  "Twitter / X",
  "YouTube",
  "Pinterest",
  "TikTok",
  "Google Ads",
  "Meta Ads",
  "Email",
  "Blog",
  "Blog Article",
] as const;
