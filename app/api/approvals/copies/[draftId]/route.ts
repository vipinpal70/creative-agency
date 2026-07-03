import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import ContentDraft from "@/lib/models/content-draft.model";
import Deliverable from "@/lib/models/deliverable.model";
import Calendar from "@/lib/models/calendar.model";
import Client from "@/lib/models/client.model";
import DraftHistory from "@/lib/models/draft-history.model";
import User from "@/lib/models/user.model";
import {
  normalizeDraftStatus,
  APPROVE_TRANSITIONS,
  DELIVERABLE_STATUS_FOR_DRAFT,
  timelineForStatus,
  historyActionForStatus,
} from "@/lib/status-flow";
import { serializeCopy } from "@/lib/serialize-copy";

type Ctx = { params: Promise<{ draftId: string }> };

// PATCH /api/approvals/copies/[draftId]
// Body: { action: "approve" | "reject", note?: string }
// approve advances the copy one review step:
//   content_internal_review → content_client_review → content_approved
//   design_internal_review  → design_client_review  → design_approved
// reject during the content phase → "rejected" (back to the writer);
// reject during the design phase  → "design_in_progress" (back to the
// designer who claimed it — the copy itself stays approved).
export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { draftId } = await params;
    if (!mongoose.Types.ObjectId.isValid(draftId)) {
      return NextResponse.json({ error: "Invalid draft ID" }, { status: 400 });
    }

    const { action, note } = await req.json();
    if (action !== "approve" && action !== "reject") {
      return NextResponse.json({ error: 'action must be "approve" or "reject"' }, { status: 400 });
    }

    await connectDB();

    const draft = await ContentDraft.findById(draftId);
    if (!draft) return NextResponse.json({ error: "Copy not found" }, { status: 404 });

    const current = normalizeDraftStatus(draft.status);
    if (!current) {
      return NextResponse.json({ error: `Copy has unknown status "${draft.status}"` }, { status: 409 });
    }

    let next;
    let timelineStatus;
    let historyAction: "submitted" | "approved" | "rejected" | "edited";
    if (action === "approve") {
      next = APPROVE_TRANSITIONS[current];
      if (!next) {
        return NextResponse.json(
          { error: `Copy in status "${current}" is not awaiting review` },
          { status: 409 }
        );
      }
      timelineStatus = next;
      historyAction = historyActionForStatus(next) ?? "edited";
    } else {
      next = current.startsWith("design_") ? ("design_in_progress" as const) : ("rejected" as const);
      timelineStatus = "rejected" as const;
      historyAction = "rejected";
      draft.rejectionNote = note?.trim() || "";
    }

    const reviewer = await User.findById(session.userId).select("firstName lastName email").lean();
    const reviewerName = reviewer
      ? `${reviewer.firstName} ${reviewer.lastName || ""}`.trim()
      : session.email;
    const now = new Date();

    draft.status = next;
    draft.lastChangedBy = { userId: session.userId, name: reviewerName, email: session.email, changedAt: now };
    await draft.save();

    // Cascade to deliverable + timeline. Rejections are recorded on the
    // timeline of the phase being left (writer for content_*, designer for design_*).
    const timelineKey =
      action === "reject" ? timelineForStatus(current) : timelineForStatus(next);
    await Deliverable.updateOne(
      { _id: draft.deliverableId },
      {
        $set: { status: DELIVERABLE_STATUS_FOR_DRAFT[next] },
        $push: {
          [`statusTimeline.${timelineKey}`]: {
            status:    timelineStatus,
            timestamp: now,
            changedBy: { userId: session.userId, name: reviewerName, email: session.email },
          },
        },
      }
    );

    await DraftHistory.create({
      clientId:      draft.clientId,
      calendarId:    draft.calendarId,
      deliverableId: draft.deliverableId,
      draftId:       draft._id,
      draftVersion:  draft.version,
      action:        historyAction,
      changedBy:     { userId: session.userId, name: reviewerName, email: session.email },
      changedAt:     now,
      changes:       [
        { field: "status", label: "Status", from: current, to: next },
        ...(note?.trim() ? [{ field: "rejectionNote", label: "Note", from: "", to: note.trim() }] : []),
      ],
    });

    // Re-fetch populated for a consistent response shape
    void Calendar; void Client;
    const populated = await ContentDraft.findById(draft._id)
      .populate("clientId", "name brandName")
      .populate("deliverableId", "title platforms buckets type status module scheduledDate")
      .populate("calendarId", "name")
      .populate("createdBy", "firstName lastName email")
      .lean();

    return NextResponse.json(serializeCopy(populated));
  } catch (err: any) {
    console.error("[approvals/copies PATCH]", err);
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}
