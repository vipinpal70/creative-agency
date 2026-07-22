// Shared status pipeline for copies (ContentDraft) and their parent Deliverable.
//
// A copy moves linearly through two review phases on a single status field:
//   content phase (writer):   draft → content_internal_review → content_client_review → content_approved
//   design phase (designer):  content_approved → design_in_progress → design_internal_review
//                             → design_client_review → design_approved
// "design_in_progress" is the claim step: a designer starts work, which locks
// the item to them. Content rejections go to "rejected" (back to the writer);
// design rejections return to "design_in_progress" (back to the claiming designer).
//
// This module is plain TypeScript (no mongoose) so client components can import it.

export const DRAFT_STATUSES = [
  "draft",
  "content_internal_review",
  "content_client_review",
  "content_approved",
  "design_in_progress",
  "design_internal_review",
  "design_client_review",
  "design_approved",
  "rejected",
] as const;

export type DraftStatus = (typeof DRAFT_STATUSES)[number];

// Legacy values written before the content/design split. Kept readable and
// mapped forward on write so pre-refactor documents keep working.
export const LEGACY_DRAFT_STATUS_MAP: Record<string, DraftStatus> = {
  submitted: "content_internal_review",
  approved: "content_approved",
  internal_review: "content_internal_review",
  client_review: "content_client_review",
};

export function normalizeDraftStatus(status: string): DraftStatus | null {
  if ((DRAFT_STATUSES as readonly string[]).includes(status)) return status as DraftStatus;
  return LEGACY_DRAFT_STATUS_MAP[status] ?? null;
}

// Deliverable statuses share the same legacy mapping; pending / in_progress /
// delivered pass through unchanged.
export function normalizeDeliverableStatus(status: string): string {
  return LEGACY_DRAFT_STATUS_MAP[status] ?? status;
}

// Approving an item at a review step advances it to the next step.
export const APPROVE_TRANSITIONS: Partial<Record<DraftStatus, DraftStatus>> = {
  content_internal_review: "content_client_review",
  content_client_review: "content_approved",
  design_internal_review: "design_client_review",
  design_client_review: "design_approved",
};

// Rejecting an item at a review step: content rejections go back to the
// writer ("rejected"); design rejections return to the claiming designer
// ("design_in_progress" — the copy itself stays approved).
export const REJECT_TRANSITIONS: Partial<Record<DraftStatus, DraftStatus>> = {
  content_internal_review: "rejected",
  content_client_review: "rejected",
  design_internal_review: "design_in_progress",
  design_client_review: "design_in_progress",
};

export function isArticleType(mediaType?: string): boolean {
  if (!mediaType) return false;
  const mt = mediaType.toLowerCase().trim();
  return (
    mt === "article/copy" ||
    mt === "article/blog" ||
    mt === "article" ||
    mt.startsWith("article/")
  );
}

// Exceptional case: "article/copy" or "article/blog" submitted without a creative has nothing
// to design, so it skips the design phase entirely — client approval of the
// content takes it straight to design_approved (final).
export function skipsDesignPhase(draft: {
  mediaType?: string;
  articleMode?: string;
}): boolean {
  return (
    isArticleType(draft.mediaType) &&
    draft.articleMode === "without-creative"
  );
}

// Approve target for a draft at a given status, applying the design-skip rule.
export function approveTargetFor(
  status: DraftStatus,
  draft: { mediaType?: string; articleMode?: string }
): DraftStatus | undefined {
  const next = APPROVE_TRANSITIONS[status];
  if (next === "content_approved" && skipsDesignPhase(draft)) {
    return "design_approved";
  }
  return next;
}

// Status the parent deliverable takes when its draft enters a given status.
export const DELIVERABLE_STATUS_FOR_DRAFT: Record<DraftStatus, string> = {
  draft: "in_progress",
  content_internal_review: "content_internal_review",
  content_client_review: "content_client_review",
  content_approved: "content_approved",
  design_in_progress: "design_in_progress",
  design_internal_review: "design_internal_review",
  design_client_review: "design_client_review",
  design_approved: "design_approved",
  rejected: "in_progress",
};

// Which deliverable timeline a status transition is recorded on.
export function timelineForStatus(status: DraftStatus): "writerTimeline" | "designerTimeline" {
  return status.startsWith("design_") ? "designerTimeline" : "writerTimeline";
}

// DraftHistory action label for a status transition (history enum is unchanged).
export function historyActionForStatus(
  status: DraftStatus
): "submitted" | "approved" | "rejected" | null {
  switch (status) {
    case "content_internal_review":
    case "design_internal_review":
      return "submitted";
    case "content_client_review":
    case "content_approved":
    case "design_client_review":
    case "design_approved":
      return "approved";
    case "rejected":
      return "rejected";
    default:
      return null;
  }
}

// ── UI display maps (draft + deliverable statuses, legacy values included) ──

export const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  pending: "Draft",
  in_progress: "In Progress",
  content_internal_review: "Content Internal Review",
  content_client_review: "Content Client Review",
  content_approved: "Content Approved",
  design_in_progress: "Design In Progress",
  design_internal_review: "Design Internal Review",
  design_client_review: "Design Client Review",
  design_approved: "Design Approved",
  rejected: "Rejected",
  delivered: "Delivered",
  // legacy
  submitted: "Content Internal Review",
  internal_review: "Content Internal Review",
  client_review: "Content Client Review",
  approved: "Content Approved",
};

export const STATUS_COLOR: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  pending: "bg-muted text-muted-foreground",
  in_progress: "bg-blue-100 text-blue-700",
  content_internal_review: "bg-amber-100 text-amber-700",
  content_client_review: "bg-purple-100 text-purple-700",
  content_approved: "bg-green-100 text-green-700",
  design_in_progress: "bg-sky-100 text-sky-700",
  design_internal_review: "bg-orange-100 text-orange-700",
  design_client_review: "bg-violet-100 text-violet-700",
  design_approved: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-700",
  delivered: "bg-emerald-100 text-emerald-700",
  // legacy
  submitted: "bg-amber-100 text-amber-700",
  internal_review: "bg-amber-100 text-amber-700",
  client_review: "bg-purple-100 text-purple-700",
  approved: "bg-green-100 text-green-700",
};
