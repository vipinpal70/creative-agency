import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { isClient, assertClientAccess, notFound } from "@/lib/authz";
import { connectDB } from "@/lib/db";
import ContentDraft from "@/lib/models/content-draft.model";
import Deliverable from "@/lib/models/deliverable.model";
import DraftHistory from "@/lib/models/draft-history.model";
import User from "@/lib/models/user.model";
import { computeChanges } from "@/lib/draft-history";
import { purgeDraft } from "@/lib/copy-cleanup";
import {
  DRAFT_STATUSES,
  normalizeDraftStatus,
  skipsDesignPhase,
  DELIVERABLE_STATUS_FOR_DRAFT,
  timelineForStatus,
  historyActionForStatus,
} from "@/lib/status-flow";
import type { DraftStatus } from "@/lib/status-flow";

type Ctx = { params: Promise<{ id: string; delId: string; draftId: string }> };

// GET /api/clients/[id]/deliverables/[delId]/drafts/[draftId]
export async function GET(req: NextRequest, { params }: Ctx) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (isClient(session)) {
      const { id } = await params;
      if (!(await assertClientAccess(session, id))) return notFound();
    }

    const { id, delId, draftId } = await params;
    await connectDB();

    const draft = await ContentDraft.findOne({ _id: draftId, deliverableId: delId })
      .populate("createdBy", "firstName lastName email")
      .lean();

    if (!draft) {
      return NextResponse.json({ error: "Draft not found" }, { status: 404 });
    }

    return NextResponse.json({ ...draft, id: (draft._id as any).toString() });
  } catch (err: any) {
    console.error("[draft GET]", err);
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}

// PATCH /api/clients/[id]/deliverables/[delId]/drafts/[draftId]
// Updatable: mediaType, creativeCopy, caption, hashtags,
//            publishDate, publishTime, notes, status, rejectionNote
// Status transitions cascade to the parent deliverable and push a
// writerTimeline (content_*) or designerTimeline (design_*) entry.
// Legacy statuses ("submitted", "approved") are mapped forward on write.
export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (isClient(session)) {
      const { id } = await params;
      if (!(await assertClientAccess(session, id))) return notFound();
    }

    const { id, delId, draftId } = await params;
    const body = await req.json();
    await connectDB();

    const draft = await ContentDraft.findOne({ _id: draftId, deliverableId: delId });
    if (!draft) {
      return NextResponse.json({ error: "Draft not found" }, { status: 404 });
    }

    // Archived copies are read-only — no edits or workflow moves until restored.
    if (draft.archivedAt) {
      return NextResponse.json(
        { error: "This copy is archived and cannot be edited. Restore it first." },
        { status: 409 }
      );
    }

    // Design-phase lock: while a design is in progress, only the designer who
    // claimed it (via Start Work) — or an admin — may modify it.
    if (
      draft.status === "design_in_progress" &&
      draft.designStartedBy &&
      draft.designStartedBy.userId !== session.userId.toString() &&
      session.role !== "admin"
    ) {
      return NextResponse.json(
        { error: `This design is being worked on by ${draft.designStartedBy.name}` },
        { status: 403 }
      );
    }

    // Resolve editor name up front (needed for claim + timeline + history)
    const editor = await User.findById(session.userId).select("firstName lastName email").lean();
    const editorName = editor
      ? `${editor.firstName} ${editor.lastName || ""}`.trim()
      : session.email;
    const now = new Date();

    const {
      mediaType, creativeCopy, frames, caption, hashtags,
      publishDate, publishTime, notes, status, rejectionNote,
      imageUrl, videoUrl, thumbnailUrl, audioUrl,
      articleMode, articleCopy,
    } = body;

    // Snapshot old values for diff before any mutation
    const oldValues: Record<string, unknown> = {
      creativeCopy:  draft.creativeCopy,
      frames:        draft.frames,
      imageUrl:      draft.imageUrl,
      videoUrl:      draft.videoUrl,
      thumbnailUrl:  draft.thumbnailUrl,
      audioUrl:      draft.audioUrl,
      caption:       draft.caption,
      hashtags:      draft.hashtags,
      publishDate:   draft.publishDate,
      publishTime:   draft.publishTime,
      status:        draft.status,
      notes:         draft.notes,
      referenceUrl:  draft.referenceUrl,
      videoType:     draft.videoType,
      videoNotes:    draft.videoNotes,
      articleMode:   draft.articleMode,
      articleCopy:   draft.articleCopy,
    };

    if (mediaType !== undefined)     draft.mediaType    = mediaType;
    if (creativeCopy !== undefined)  draft.creativeCopy = creativeCopy;
    if (articleMode !== undefined)   draft.articleMode  = articleMode;
    if (articleCopy !== undefined)   draft.articleCopy  = articleCopy;
    if (Array.isArray(frames))       draft.frames       = frames;
    if (imageUrl !== undefined)      draft.imageUrl     = imageUrl;
    if (videoUrl !== undefined)      draft.videoUrl     = videoUrl;
    if (thumbnailUrl !== undefined)  draft.thumbnailUrl = thumbnailUrl;
    if (audioUrl !== undefined)      draft.audioUrl     = audioUrl;
    if (caption !== undefined)       draft.caption      = caption;
    if (notes !== undefined)         draft.notes        = notes;
    if (publishTime !== undefined)   draft.publishTime  = publishTime;
    if (rejectionNote !== undefined) draft.rejectionNote = rejectionNote;
    if (publishDate !== undefined)   draft.publishDate  = publishDate ? new Date(publishDate) : null;
    if (Array.isArray(hashtags))     draft.hashtags     = hashtags;

    let normalizedStatus: DraftStatus | null = null;
    if (status !== undefined) {
      normalizedStatus = normalizeDraftStatus(status);
      if (!normalizedStatus) {
        return NextResponse.json(
          { error: `Invalid status. Must be one of: ${DRAFT_STATUSES.join(", ")}` },
          { status: 400 }
        );
      }

      // Design-skip: article/copy without a creative has nothing to design,
      // so content approval takes it straight to design_approved (final)
      // instead of entering the designer queue.
      if (normalizedStatus === "content_approved" && skipsDesignPhase(draft)) {
        normalizedStatus = "design_approved";
      }

      // "Start Work" claim: first designer to move it to design_in_progress
      // owns it. Only a fresh claim (from content_approved) is a claim —
      // a rejection from design review back to design_in_progress is rework
      // and must neither conflict nor reassign ownership.
      if (normalizedStatus === "design_in_progress") {
        const isClaim = normalizeDraftStatus(draft.status) === "content_approved";
        if (isClaim) {
          if (
            draft.designStartedBy &&
            draft.designStartedBy.userId !== session.userId.toString() &&
            session.role !== "admin"
          ) {
            return NextResponse.json(
              { error: `Already being worked on by ${draft.designStartedBy.name}` },
              { status: 409 }
            );
          }
          if (!draft.designStartedBy) {
            draft.designStartedBy = {
              userId: session.userId.toString(),
              name: editorName,
              email: session.email,
              startedAt: now,
            };
          }
        }
      }

      draft.status = normalizedStatus;

      // Cascade draft status to the parent deliverable
      const deliverable = await Deliverable.findOne({ _id: delId, clientId: id });
      if (deliverable) {
        deliverable.status = DELIVERABLE_STATUS_FOR_DRAFT[normalizedStatus] as any;
        await deliverable.save();
      }
    }

    // Push timeline entry for status transitions:
    // content_* transitions land on writerTimeline, design_* on designerTimeline
    if (normalizedStatus && normalizedStatus !== "draft") {
      const timelineKey = timelineForStatus(normalizedStatus);
      await Deliverable.updateOne(
        { _id: delId },
        {
          $push: {
            [`statusTimeline.${timelineKey}`]: {
              status:    normalizedStatus,
              timestamp: now,
              changedBy: { userId: session.userId, name: editorName, email: session.email },
            },
          },
        }
      );
    }
    const newValues: Record<string, unknown> = {};
    if (creativeCopy !== undefined)  newValues.creativeCopy = creativeCopy;
    if (Array.isArray(frames))       newValues.frames       = frames;
    if (caption !== undefined)       newValues.caption      = caption;
    if (Array.isArray(hashtags))     newValues.hashtags     = hashtags;
    if (publishDate !== undefined)   newValues.publishDate  = publishDate ? new Date(publishDate) : null;
    if (publishTime !== undefined)   newValues.publishTime  = publishTime;
    if (notes !== undefined)         newValues.notes        = notes;
    if (normalizedStatus)                newValues.status       = normalizedStatus;
    if (body.referenceUrl !== undefined) newValues.referenceUrl = body.referenceUrl;
    if (body.videoType !== undefined)    newValues.videoType    = body.videoType;
    if (body.videoNotes !== undefined)   newValues.videoNotes   = body.videoNotes;
    if (articleMode !== undefined)       newValues.articleMode  = articleMode;
    if (articleCopy !== undefined)       newValues.articleCopy  = articleCopy;
    if (imageUrl !== undefined)          newValues.imageUrl     = imageUrl;
    if (videoUrl !== undefined)          newValues.videoUrl     = videoUrl;
    if (thumbnailUrl !== undefined)      newValues.thumbnailUrl = thumbnailUrl;
    if (audioUrl !== undefined)          newValues.audioUrl     = audioUrl;

    const changes = computeChanges(oldValues, newValues);

    // Determine action label
    const action: "edited" | "submitted" | "approved" | "rejected" =
      (normalizedStatus && historyActionForStatus(normalizedStatus)) || "edited";

    // Update lastChangedBy on draft
    draft.lastChangedBy = { userId: session.userId, name: editorName, email: session.email, changedAt: now };

    await draft.save();

    // Persist history entry (skip if nothing changed and it's just a status-only update already handled above)
    if (changes.length > 0 || action !== "edited") {
      await DraftHistory.create({
        clientId:      id,
        calendarId:    draft.calendarId,
        deliverableId: delId,
        draftId:       draft._id,
        draftVersion:  draft.version,
        action,
        changedBy:     { userId: session.userId, name: editorName, email: session.email },
        changedAt:     now,
        changes,
      });
    }

    return NextResponse.json({ ...draft.toObject(), id: draft._id.toString() });
  } catch (err: any) {
    console.error("[draft PATCH]", err);
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}

// DELETE /api/clients/[id]/deliverables/[delId]/drafts/[draftId]
// Only the draft author or an admin can delete
export async function DELETE(req: NextRequest, { params }: Ctx) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (isClient(session)) {
      const { id } = await params;
      if (!(await assertClientAccess(session, id))) return notFound();
    }

    const { delId, draftId } = await params;
    await connectDB();

    const draft = await ContentDraft.findOne({ _id: draftId, deliverableId: delId });
    if (!draft) {
      return NextResponse.json({ error: "Draft not found" }, { status: 404 });
    }

    if (
      draft.createdBy.toString() !== session.userId.toString() &&
      session.role !== "admin"
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Full cleanup: remove stored files and linked history alongside the draft
    // so no orphaned data is left behind.
    const result = await purgeDraft(draft);

    return NextResponse.json({ message: "Draft deleted", ...result });
  } catch (err: any) {
    console.error("[draft DELETE]", err);
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}
