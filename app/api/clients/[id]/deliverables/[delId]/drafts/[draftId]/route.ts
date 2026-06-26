import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import ContentDraft from "@/lib/models/content-draft.model";
import Deliverable from "@/lib/models/deliverable.model";
import DraftHistory from "@/lib/models/draft-history.model";
import User from "@/lib/models/user.model";
import { computeChanges } from "@/lib/draft-history";
import type { DraftStatus } from "@/lib/models/content-draft.model";

type Ctx = { params: Promise<{ id: string; delId: string; draftId: string }> };

const VALID_STATUSES: DraftStatus[] = ["draft", "submitted", "approved", "rejected"];

// GET /api/clients/[id]/deliverables/[delId]/drafts/[draftId]
export async function GET(req: NextRequest, { params }: Ctx) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
// When status → submitted: auto-moves deliverable to internal_review
// When status → approved:  auto-moves deliverable to approved
export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id, delId, draftId } = await params;
    const body = await req.json();
    await connectDB();

    const draft = await ContentDraft.findOne({ _id: draftId, deliverableId: delId });
    if (!draft) {
      return NextResponse.json({ error: "Draft not found" }, { status: 404 });
    }

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

    if (status !== undefined) {
      if (!VALID_STATUSES.includes(status)) {
        return NextResponse.json(
          { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}` },
          { status: 400 }
        );
      }
      draft.status = status;

      // Cascade draft status to the parent deliverable + push writerTimeline entry
      const deliverable = await Deliverable.findOne({ _id: delId, clientId: id });
      if (deliverable) {
        if (status === "submitted") deliverable.status = "internal_review";
        if (status === "approved")  deliverable.status = "approved";
        if (status === "rejected")  deliverable.status = "in_progress";
        await deliverable.save();
      }
    }

    // Resolve editor name and record history
    const editor = await User.findById(session.userId).select("firstName lastName email").lean();
    const editorName = editor
      ? `${editor.firstName} ${editor.lastName || ""}`.trim()
      : session.email;

    const now = new Date();

    // Push writerTimeline entry for status transitions
    if (status !== undefined) {
      const timelineStatusMap: Record<string, string> = {
        submitted: "internal_review",
        approved:  "approved",
        rejected:  "rejected",
      };
      const tlStatus = timelineStatusMap[status];
      if (tlStatus) {
        await Deliverable.updateOne(
          { _id: delId },
          {
            $push: {
              "statusTimeline.writerTimeline": {
                status:    tlStatus,
                timestamp: now,
                changedBy: { userId: session.userId, name: editorName, email: session.email },
              },
            },
          }
        );
      }
    }
    const newValues: Record<string, unknown> = {};
    if (creativeCopy !== undefined)  newValues.creativeCopy = creativeCopy;
    if (Array.isArray(frames))       newValues.frames       = frames;
    if (caption !== undefined)       newValues.caption      = caption;
    if (Array.isArray(hashtags))     newValues.hashtags     = hashtags;
    if (publishDate !== undefined)   newValues.publishDate  = publishDate ? new Date(publishDate) : null;
    if (publishTime !== undefined)   newValues.publishTime  = publishTime;
    if (notes !== undefined)         newValues.notes        = notes;
    if (status !== undefined)            newValues.status       = status;
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
    let action: "edited" | "submitted" | "approved" | "rejected" = "edited";
    if (status === "submitted") action = "submitted";
    else if (status === "approved")  action = "approved";
    else if (status === "rejected")  action = "rejected";

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

    await draft.deleteOne();

    return NextResponse.json({ message: "Draft deleted" });
  } catch (err: any) {
    console.error("[draft DELETE]", err);
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}
