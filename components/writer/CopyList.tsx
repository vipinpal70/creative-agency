"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Send, Trash2, Calendar, Image, Hash, Loader2, Pencil, Clock, MessageSquare, RotateCcw, Eye } from "lucide-react";
import type { WriterDeliverable } from "./types";
import { ModuleTag } from "@/components/ui/ModuleTag";
import { STATUS_LABEL, STATUS_COLOR, normalizeDraftStatus } from "@/lib/status-flow";

// Display label for a paid ad copy's own platform (Meta vs Google), which is
// chosen per ad copy and is the source of truth for paid cards — not the
// campaign-inherited platform list on the deliverable.
const AD_PLATFORM_LABEL: Record<string, string> = { meta: "Meta", google: "Google" };

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

interface Props {
  copies: WriterDeliverable[];
  onRemove: (delId: string) => Promise<void>;
  onSubmitSingle: (delId: string, draftId: string) => Promise<void>;
  onSubmitAll: () => Promise<void>;
  onOpenEdit: (copy: WriterDeliverable) => void;
  onRecall: (delId: string, draftId: string) => Promise<void>;
  // Optional — when provided, a "Preview" button is shown per row. Only the
  // paid-media workspace passes this today (AdPreviewCard); the social flow
  // is unaffected when it's omitted.
  onPreview?: (copy: WriterDeliverable) => void;
  // Whether the current user (admin / account manager) may recall a copy that
  // is in the content_client_review stage. Internal-review recall is available
  // to the copy's creator, which in the writer workspace is the current user.
  canRecallClientReview: boolean;
  submitting: string | null;
  // Terminology overrides — default to social "copy" wording. The paid-media
  // workspace passes noun="variant" / title="Campaign Variants".
  noun?: string;
  title?: string;
  // Scope-of-work module ("social" | "paid" | …) of the calendar/campaign
  // these copies belong to. Rendered as a tag on each card. Optional — the
  // deliverable shape itself doesn't carry it, so the workspace supplies it.
  module?: string;
}

export function CopyList({ copies, onRemove, onSubmitSingle, onSubmitAll, onOpenEdit, onRecall, onPreview, canRecallClientReview, submitting, noun = "copy", title, module }: Props) {
  const draftCopies = copies.filter(
    (c) => c.latestDraft && normalizeDraftStatus(c.latestDraft.status) === "draft"
  );
  const nounPlural = noun.endsWith("copy") ? noun.replace(/copy$/, "copies") : `${noun}s`;

  if (copies.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Calendar className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No {nounPlural} added yet. Use the button above to add your first {noun}.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">{title ?? `Calendar Copies`} ({copies.length})</CardTitle>
            <CardDescription>{draftCopies.length} draft(s) ready for review</CardDescription>
          </div>
            {draftCopies.length > 1 && (
            <Button onClick={onSubmitAll} size="sm">
                <Send className="h-3.5 w-3.5 mr-1" /> Submit All for Review
              </Button>
            )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {copies.map((copy) => {
          const draft = copy.latestDraft;
          // The draft status is the real pipeline state — display and gate
          // actions on it. The deliverable status is only a coarse rollup
          // (e.g. a rejected draft rolls up to "in_progress").
          const draftStatus = draft ? normalizeDraftStatus(draft.status) : null;
          const isDraft = draftStatus === "draft";
          // Changes-requested and legacy rejected copies both return to the
          // writer to rework and re-submit into the content review cycle.
          const isRejected = draftStatus === "content_req_change" || draftStatus === "rejected";
          // Recall a copy one stage back. content_internal_review → draft is
          // available to the creator (the writer viewing their own workspace);
          // content_client_review → content_internal_review needs admin / account
          // manager. Server enforces the same rules.
          const canRecall =
            !!draft &&
            (draftStatus === "content_internal_review" ||
              (draftStatus === "content_client_review" && canRecallClientReview));
          const displayStatus = draft ? draft.status : copy.status;
          const label = STATUS_LABEL[displayStatus] || displayStatus;
          const colorClass = STATUS_COLOR[displayStatus] || "bg-muted text-muted-foreground";
          const isCarousel = copy.type.toLowerCase() === "carousel";

          const previewText = isCarousel && draft?.frames?.length
            ? `[Carousel · ${draft.frames.length} frames] ${draft.frames[0]?.copy || ""}`.trim()
            : draft?.creativeCopy || copy.title || "—";

          return (
            <div key={copy.id} className="p-4 rounded-lg border border-border bg-accent/10 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground whitespace-pre-wrap line-clamp-2">{previewText}</p>
                  {draft?.caption && (
                    <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap line-clamp-1">{draft.caption}</p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${colorClass}`}>
                    {label}
                  </span>
                  <ModuleTag module={module} />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                {(draft?.publishDate || copy.scheduledDate) && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {draft?.publishDate
                      ? new Date(draft.publishDate).toLocaleDateString()
                      : new Date(copy.scheduledDate).toLocaleDateString()}
                    {draft?.publishTime ? ` at ${draft.publishTime}` : ""}
                  </span>
                )}
                {module === "paid" && draft?.adPlatform ? (
                  <span className="flex items-center gap-1">
                    {AD_PLATFORM_LABEL[draft.adPlatform] ?? draft.adPlatform}
                  </span>
                ) : (
                  copy.platforms && copy.platforms.length > 0 && (
                    <span className="flex items-center gap-1">
                      {copy.platforms.join(", ")}
                    </span>
                  )
                )}
                <span className="flex items-center gap-1">
                  <Image className="h-3 w-3" />
                  {copy.type}
                </span>
                {copy.buckets.length > 0 && (
                  <span className="flex items-center gap-1">
                    <Hash className="h-3 w-3" />
                    {copy.buckets[0]}
                  </span>
                )}
                {draft?.version && (
                  <span className="text-muted-foreground/60">v{draft.version}</span>
                )}
              </div>

              {draft?.hashtags && draft.hashtags.length > 0 && (
                <p className="text-xs text-primary/70">{draft.hashtags.join(" ")}</p>
              )}

              {draft?.lastChangedBy && (
                <div className="flex items-center gap-1 text-[11px] text-muted-foreground/70">
                  <Clock className="h-3 w-3" />
                  <span>
                    Last edited by <span className="font-medium text-muted-foreground">{draft.lastChangedBy.name}</span>
                    {" · "}{timeAgo(draft.lastChangedBy.changedAt)}
                  </span>
                </div>
              )}

              {isRejected && (
                <div className="flex items-start gap-2 text-xs bg-red-50 text-red-700 rounded-lg p-2.5">
                  <MessageSquare className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  <span>
                    {draft?.rejectionNote
                      ? `Feedback: ${draft.rejectionNote}`
                      : "Changes were requested. Edit the copy and re-submit."}
                  </span>
                </div>
              )}

              <div className="flex items-center gap-2 pt-1">
                {(isDraft || isRejected) && draft && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={submitting === copy.id}
                    onClick={() => onSubmitSingle(copy.id, draft.id)}
                  >
                    {submitting === copy.id
                      ? <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      : <Send className="h-3 w-3 mr-1" />}
                    {isRejected ? "Re-submit for Review" : "Submit for Review"}
                  </Button>
                )}
                {(isDraft || isRejected) && draft && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onOpenEdit(copy)}
                  >
                    <Pencil className="h-3 w-3 mr-1" /> Edit
                  </Button>
                )}
                {onPreview && draft && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPreview(copy)}
                  >
                    <Eye className="h-3 w-3 mr-1" /> Preview
                  </Button>
                )}
                {canRecall && draft && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={submitting === copy.id}
                    onClick={() => onRecall(copy.id, draft.id)}
                  >
                    {submitting === copy.id
                      ? <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      : <RotateCcw className="h-3 w-3 mr-1" />}
                    Recall
                  </Button>
                )}
                {isDraft && (
                  <Button variant="destructive" size="sm" onClick={() => onRemove(copy.id)}>
                    <Trash2 className="h-3 w-3 mr-1 text-white" /> <span className="text-white">Remove</span>
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
