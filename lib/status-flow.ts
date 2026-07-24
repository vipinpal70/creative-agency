/* Shared status pipeline for copies (ContentDraft) and their parent Deliverable.

A copy moves linearly through two review phases on a single status field:
  content phase (writer):   draft → content_internal_review → content_client_review → content_approved
  design phase (designer):  content_approved → design_in_progress → design_internal_review
                            → design_client_review → design_approved
"design_in_progress" is the claim step: a designer starts work, which locks
the item to them.

Requesting changes at a review step sends the item back with feedback:
  content review → "content_req_change" (back to the writer), who reworks and
    re-enters the content cycle: content_req_change → content_internal_review
    → content_client_review → content_approved.
  design review → "design_req_change" (back to the claiming designer), who
    reworks and re-enters the design cycle: design_req_change →
    design_internal_review → design_client_review → design_approved.
A hard reject splits by phase: content review → "rejected" (back to the
  writer); design review → "design_rejected" (surfaces in the designer's
  Rejected tab, still owned by the claiming designer). "Re-work" on a
  design_rejected copy moves it to design_in_progress to restart the cycle.
The legacy "rejected" status is content-phase only (also used by pre-existing
documents).

This module is plain TypeScript (no mongoose) so client components can import it.
*/

export const DRAFT_STATUSES = [
  "draft",
  "content_internal_review",
  "content_client_review",
  "content_approved",
  "content_req_change",
  "design_in_progress",
  "design_internal_review",
  "design_client_review",
  "design_approved",
  "design_req_change",
  "design_rejected",
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

// Requesting changes at a review step: content changes go back to the writer
// ("content_req_change"); design changes go back to the claiming designer
// ("design_req_change"). Feedback is attached as the copy's rejectionNote.
export const REJECT_TRANSITIONS: Partial<Record<DraftStatus, DraftStatus>> = {
  content_internal_review: "content_req_change",
  content_client_review: "content_req_change",
  design_internal_review: "design_req_change",
  design_client_review: "design_req_change",
};

// Re-submitting a reworked item after changes were requested: the writer sends
// a content_req_change copy back into content internal review; the designer
// sends a design_req_change copy back into design internal review.
export const RESUBMIT_TRANSITIONS: Partial<Record<DraftStatus, DraftStatus>> = {
  content_req_change: "content_internal_review",
  design_req_change: "design_internal_review",
  // legacy rejected copies re-enter the content cycle
  rejected: "content_internal_review",
};

// Recall: pull a copy back one step to the previous stage, to undo a premature
// submission or approval. Only valid from these stages; ownership/role gating is
// enforced in the recall route (creator for content_internal_review, assigned
// designer for design_internal_review, admin/account-manager for the two
// client-review stages; admin may recall from any stage).
export const RECALL_TRANSITIONS: Partial<Record<DraftStatus, DraftStatus>> = {
  content_internal_review: "draft",
  content_client_review:   "content_internal_review",
  design_internal_review:  "design_in_progress",
  design_client_review:    "design_internal_review",
};

// The two client-review stages require elevated roles (admin / account manager)
// to recall; the internal-review stages are gated to the item's owner.
export function isClientReviewStage(status: DraftStatus): boolean {
  return status === "content_client_review" || status === "design_client_review";
}

// Reel / video (long-format) media types, which offer a "video type" choice
// (shoot based / motion graphic / stock based) in the copy forms.
export function isReelOrVideoType(mediaType?: string): boolean {
  if (!mediaType) return false;
  return /reel|video|long\s*form|long\s*format/.test(mediaType.toLowerCase());
}

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
  content_req_change: "content_req_change",
  design_in_progress: "design_in_progress",
  design_internal_review: "design_internal_review",
  design_client_review: "design_client_review",
  design_approved: "design_approved",
  design_req_change: "design_req_change",
  design_rejected: "design_rejected",
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
    case "content_req_change":
    case "design_req_change":
    case "design_rejected":
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
  content_req_change: "Content Changes Requested",
  design_in_progress: "Design In Progress",
  design_internal_review: "Design Internal Review",
  design_client_review: "Design Client Review",
  design_approved: "Design Approved",
  design_req_change: "Design Changes Requested",
  design_rejected: "Design Rejected",
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
  content_req_change: "bg-rose-100 text-rose-700",
  design_in_progress: "bg-sky-100 text-sky-700",
  design_internal_review: "bg-orange-100 text-orange-700",
  design_client_review: "bg-violet-100 text-violet-700",
  design_approved: "bg-emerald-100 text-emerald-700",
  design_req_change: "bg-orange-100 text-orange-700",
  design_rejected: "bg-red-100 text-red-700",
  rejected: "bg-red-100 text-red-700",
  delivered: "bg-emerald-100 text-emerald-700",
  // legacy
  submitted: "bg-amber-100 text-amber-700",
  internal_review: "bg-amber-100 text-amber-700",
  client_review: "bg-purple-100 text-purple-700",
  approved: "bg-green-100 text-green-700",
};
