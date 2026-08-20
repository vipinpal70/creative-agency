// lib/analytics.ts — pure, framework-free helpers for the Analytics page.
//
// These functions derive the analytics KPIs from data we already persist:
//   • copy/content volume  → count of ContentDraft documents
//   • redo (rework) counts → Deliverable.statusTimeline (writer + designer)
//   • shot-approval buckets→ number of change-request cycles before approval
//
// The redo signal is the *_req_change transition. A req_change alone does not
// say whether the change was requested at an internal or a client review, so we
// walk the ordered timeline and attribute each req_change to the review stage
// that immediately preceded it. See plan.md §5 for the full derivation.
//
// No mongoose / React imports here on purpose — the file is unit-testable and
// importable from both the API route and (its types) client components.

import { normalizeDraftStatus, skipsDesignPhase } from "@/lib/status-flow";

export interface TimelineEntryLite {
  status: string;
  timestamp: string | Date;
}

export interface DeliverableTimelineLite {
  writerTimeline?: TimelineEntryLite[];
  designerTimeline?: TimelineEntryLite[];
}

export interface RedoCounts {
  internal: number;
  client: number;
}

// Classify a status as an internal- or client-review stage (legacy values,
// which drop the content_/design_ prefix, are handled explicitly).
function reviewStageOf(status: string): "internal" | "client" | null {
  if (status === "internal_review" || status.endsWith("_internal_review")) return "internal";
  if (status === "client_review" || status.endsWith("_client_review")) return "client";
  return null;
}

// Walk one ordered timeline and attribute every *_req_change to the review stage
// that preceded it. Resetting `prev` after each req_change means one redo is
// counted per rework cycle, and recalls/other transitions are ignored.
export function countRedosInTimeline(entries: TimelineEntryLite[]): RedoCounts {
  const sorted = [...entries].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  let internal = 0;
  let client = 0;
  let prev: "internal" | "client" | null = null;

  for (const entry of sorted) {
    const stage = reviewStageOf(entry.status);
    if (stage) {
      prev = stage;
      continue;
    }
    if (entry.status.endsWith("_req_change")) {
      if (prev === "internal") internal += 1;
      else if (prev === "client") client += 1;
      prev = null;
    }
  }

  return { internal, client };
}

// Content redos live on the writerTimeline, design redos on the designerTimeline;
// sum them for the copy as a whole.
export function countRedosForDeliverable(timeline?: DeliverableTimelineLite | null): RedoCounts {
  const w = countRedosInTimeline(timeline?.writerTimeline ?? []);
  const d = countRedosInTimeline(timeline?.designerTimeline ?? []);
  return { internal: w.internal + d.internal, client: w.client + d.client };
}

// ── Turnaround time ──────────────────────────────────────────────────────────
// Two independent phase durations, each averaged over items that *completed* that
// phase (in-progress items have no end and are excluded):
//   • content = t(content approval) − t(created)
//   • design  = t(design approval)  − t(design start)
// See docs/analytics-mediatype-turnaround.md for the full derivation.

const CONTENT_APPROVAL = new Set(["content_approved", "approved"]);

// ms from the copy's creation to the first content-approval entry on the writer
// timeline, or null if content was never approved.
export function contentTurnaroundMs(
  createdAt: string | Date,
  writerTimeline: TimelineEntryLite[]
): number | null {
  const start = new Date(createdAt).getTime();
  if (isNaN(start)) return null;
  const sorted = [...writerTimeline].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
  const approval = sorted.find((e) => CONTENT_APPROVAL.has(e.status));
  if (!approval) return null;
  const end = new Date(approval.timestamp).getTime();
  return end >= start ? end - start : null;
}

// ms from when design work started to the first design-approval entry on the
// designer timeline, or null if either bound is missing. When no explicit start
// timestamp is provided, the first `design_in_progress` entry is used instead.
export function designTurnaroundMs(
  designStartedAt: string | Date | null | undefined,
  designerTimeline: TimelineEntryLite[]
): number | null {
  const sorted = [...designerTimeline].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  let start = designStartedAt ? new Date(designStartedAt).getTime() : NaN;
  if (isNaN(start)) {
    const started = sorted.find((e) => e.status === "design_in_progress");
    if (!started) return null;
    start = new Date(started.timestamp).getTime();
  }
  if (isNaN(start)) return null;

  const approval = sorted.find((e) => e.status === "design_approved");
  if (!approval) return null;
  const end = new Date(approval.timestamp).getTime();
  return end >= start ? end - start : null;
}

// Arithmetic mean of a list of durations; 0 for an empty list.
export function meanMs(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

export type ShotBucket = "one_shot" | "two_shot" | "two_plus_shot";

// 0 redos → one-shot, exactly 1 → two-shot, 2+ → 2+ shot.
export function shotBucketFor(totalRedos: number): ShotBucket {
  if (totalRedos <= 0) return "one_shot";
  if (totalRedos === 1) return "two_shot";
  return "two_plus_shot";
}

// Terminal "approved" states. A copy that skips the design phase
// (article/copy without a creative) finalizes at content_approved; every other
// copy finalizes at design_approved (and may then move to scheduled/published).
const APPROVED_TERMINAL = new Set(["design_approved", "scheduled", "published"]);

export function isApprovedCopy(input: {
  status: string;
  mediaType?: string;
  articleMode?: string;
}): boolean {
  const status = normalizeDraftStatus(input.status) ?? input.status;
  if (APPROVED_TERMINAL.has(status)) return true;
  if (status === "content_approved" && skipsDesignPhase(input)) return true;
  return false;
}

// Statuses in which the *content* phase is still open. Everything else means the
// copy has passed content approval (it may be in, or past, the design phase).
// Used by the Copy discipline view, where "approved" means content-approved.
const CONTENT_PENDING = new Set([
  "draft",
  "content_internal_review",
  "content_client_review",
  "content_req_change",
  "rejected",
]);

export function isContentApproved(status: string): boolean {
  const s = normalizeDraftStatus(status) ?? status;
  return !CONTENT_PENDING.has(s);
}

// The Copy/Creative discipline tab. "" = both phases combined (default view),
// "copy" = content phase only, "design" = design phase only.
export type Discipline = "" | "copy" | "design";

// Inclusive count of calendar days in [from, to] — the denominator for the
// per-user "average per day" metric. Always ≥ 1 to avoid divide-by-zero.
export function activeDaysBetween(from: Date, to: Date): number {
  const ms = to.getTime() - from.getTime();
  return Math.max(1, Math.round(ms / 86_400_000) + 1);
}

export function safeRate(numerator: number, denominator: number): number {
  if (!denominator) return 0;
  return (numerator / denominator) * 100;
}

// ── Shared response contract (imported by the client dashboard) ──────────────

export interface AnalyticsPerUser {
  userId: string;
  name: string;
  copies: number;
  designs: number;
  avgCopiesPerDay: number;
  avgDesignsPerDay: number;
  // Breakdown of the user's copies / designs by media category (keys are
  // MediaCategory values from lib/media-type-colors). Sums to `copies`/`designs`.
  copiesByMedia: Record<string, number>;
  designsByMedia: Record<string, number>;
}

export interface AnalyticsFilterOption {
  id: string;
  label: string;
}

export interface AnalyticsResponse {
  range: { from: string; to: string; activeDays: number };
  totals: { totalCopies: number; approvedCopies: number; inProgress: number };
  redo: {
    internalRate: number;
    clientRate: number;
    internalCount: number;
    clientCount: number;
  };
  shots: { oneShot: number; twoShot: number; twoPlusShot: number };
  turnaround: {
    contentAvgMs: number;
    contentCount: number;
    designAvgMs: number;
    designCount: number;
  };
  perUser: AnalyticsPerUser[];
  filters: {
    clients: AnalyticsFilterOption[];
    members: AnalyticsFilterOption[];
    mediaTypes: string[];
  };
}
