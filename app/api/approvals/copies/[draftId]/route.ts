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
  approveTargetFor,
  REJECT_TRANSITIONS,
  RECALL_TRANSITIONS,
  isClientReviewStage,
  DELIVERABLE_STATUS_FOR_DRAFT,
  timelineForStatus,
  historyActionForStatus,
} from "@/lib/status-flow";
import { serializeCopy } from "@/lib/serialize-copy";
import { purgeDraft } from "@/lib/copy-cleanup";
import { isClient, resolveClientId, forbidden, notFound } from "@/lib/authz";

type Ctx = { params: Promise<{ draftId: string }> };

// PATCH /api/approvals/copies/[draftId]
// Body: { action: "approve" | "reject" | "request_change" | "recall", note?: string }
// recall pulls a copy back one stage (undo a premature submission/approval):
//   content_internal_review → draft; content_client_review → content_internal_review;
//   design_internal_review → design_in_progress; design_client_review → design_internal_review.
//   Gated by ownership/role (see the recall branch below); admin may always recall.
// approve advances the copy one review step:
//   content_internal_review → content_client_review → content_approved
//   design_internal_review  → design_client_review  → design_approved
// request_change sends the item back for revision with feedback:
//   content phase → "content_req_change" (back to the writer);
//   design phase  → "design_req_change" (back to the claiming designer).
// reject is a hard rejection that returns the copy to the workspace owning the
// stage it was rejected in:
//   content phase → "rejected" (back to the writer);
//   design phase  → "design_rejected" (surfaces in the designer's Rejected tab,
//                   still owned by the claiming designer — it must not fall back
//                   to the writer via the content-coupled "rejected" status; the
//                   designer uses "Re-work" to move it back into progress).
// For request_change / reject the feedback note is stored on the copy.
export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { draftId } = await params;
    if (!mongoose.Types.ObjectId.isValid(draftId)) {
      return NextResponse.json({ error: "Invalid draft ID" }, { status: 400 });
    }

    const { action, note } = await req.json();
    if (
      action !== "approve" &&
      action !== "reject" &&
      action !== "request_change" &&
      action !== "recall"
    ) {
      return NextResponse.json(
        { error: 'action must be "approve", "reject", "request_change", or "recall"' },
        { status: 400 }
      );
    }

    await connectDB();

    const draft = await ContentDraft.findById(draftId);
    if (!draft) return NextResponse.json({ error: "Copy not found" }, { status: 404 });

    // Archived copies are frozen — they can't be approved/rejected until restored.
    if (draft.archivedAt) {
      return NextResponse.json(
        { error: "This copy is archived. Restore it before taking action." },
        { status: 409 }
      );
    }

    const current = normalizeDraftStatus(draft.status);
    if (!current) {
      return NextResponse.json({ error: `Copy has unknown status "${draft.status}"` }, { status: 409 });
    }

    // A client may only act on their own copies, and only while the copy is
    // in one of the client-review stages. Staff (internal reviewers) are
    // unrestricted here.
    if (isClient(session)) {
      const own = await resolveClientId(session);
      if (!own || own !== draft.clientId?.toString()) return notFound("Copy not found");
      if (current !== "content_client_review" && current !== "design_client_review") {
        return forbidden("This copy is not awaiting your review");
      }
    }

    // Actor identity + team roles (roles are needed to authorise recalls; the
    // JWT only carries the account-level role, not team roles like ACCOUNT_MANAGER).
    const reviewer = await User.findById(session.userId)
      .select("firstName lastName email roles")
      .lean();
    const reviewerName = reviewer
      ? `${reviewer.firstName} ${reviewer.lastName || ""}`.trim()
      : session.email;
    const now = new Date();

    let next;
    let timelineStatus;
    let historyAction: "submitted" | "approved" | "rejected" | "edited";
    if (action === "approve") {
      // Applies the design-skip rule: article/copy without a creative goes
      // straight from content client approval to design_approved (final).
      next = approveTargetFor(current, draft);
      if (!next) {
        return NextResponse.json(
          { error: `Copy in status "${current}" is not awaiting review` },
          { status: 409 }
        );
      }
      timelineStatus = next;
      historyAction = historyActionForStatus(next) ?? "edited";
    } else if (action === "recall") {
      // Recall is a staff-only backward move.
      if (isClient(session)) return forbidden("Clients cannot recall copies");

      const target = RECALL_TRANSITIONS[current];
      if (!target) {
        return NextResponse.json(
          { error: `Copy in status "${current}" cannot be recalled` },
          { status: 409 }
        );
      }

      // Ownership / role gating. Admin overrides at any stage.
      const isAdmin = session.role === "admin";
      const isAccountManager = (reviewer?.roles ?? []).includes("ACCOUNT_MANAGER");
      if (isClientReviewStage(current)) {
        if (!isAdmin && !isAccountManager) {
          return forbidden("Only an admin or account manager can recall a client review");
        }
      } else if (current === "content_internal_review") {
        if (!isAdmin && draft.createdBy?.toString() !== session.userId) {
          return forbidden("Only the copy's creator can recall it");
        }
      } else if (current === "design_internal_review") {
        if (!isAdmin && draft.designStartedBy?.userId !== session.userId) {
          return forbidden("Only the assigned designer can recall this design");
        }
      }

      next = target;
      timelineStatus = next;
      historyAction = "edited";
    } else {
      // reject / request_change are only valid from a review stage.
      const reworkTarget = REJECT_TRANSITIONS[current];
      if (!reworkTarget) {
        return NextResponse.json(
          { error: `Copy in status "${current}" is not awaiting review` },
          { status: 409 }
        );
      }
      // request_change → phase rework status (content/design_req_change).
      // reject → content phase: legacy hard "rejected" (returns to the writer,
      //          unchanged); design phase: "design_rejected" so the rejected
      //          creative surfaces in the designer's Rejected tab and stays with
      //          the assigned designer (designStartedBy is preserved) instead of
      //          falling back to the writer via the content-coupled "rejected".
      next =
        action === "request_change"
          ? reworkTarget
          : current.startsWith("design_")
          ? ("design_rejected" as const)
          : ("rejected" as const);
      timelineStatus = next;
      historyAction = "rejected";
      draft.rejectionNote = note?.trim() || "";
    }

    draft.status = next;
    draft.lastChangedBy = { userId: session.userId, name: reviewerName, email: session.email, changedAt: now };
    await draft.save();

    // Cascade to deliverable + timeline. Rejections / change requests are
    // recorded on the timeline of the phase being left (writer for content_*,
    // designer for design_*); approvals and recalls on the phase being entered.
    const timelineKey =
      action === "approve" || action === "recall"
        ? timelineForStatus(next)
        : timelineForStatus(current);
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

// DELETE /api/approvals/copies/[draftId]
// Permanently removes a copy — the draft, its stored files, and all linked
// metadata. Admin only (enforced on the backend regardless of the UI).
export async function DELETE(req: NextRequest, { params }: Ctx) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.role !== "admin") {
      return NextResponse.json({ error: "Forbidden — admin only" }, { status: 403 });
    }

    const { draftId } = await params;
    if (!mongoose.Types.ObjectId.isValid(draftId)) {
      return NextResponse.json({ error: "Invalid draft ID" }, { status: 400 });
    }

    await connectDB();

    const draft = await ContentDraft.findById(draftId).lean();
    // Idempotent: treat an already-deleted copy as success.
    if (!draft) return NextResponse.json({ message: "Already deleted", deleted: false });

    const result = await purgeDraft(draft as any);
    return NextResponse.json({ message: "Copy permanently deleted", ...result });
  } catch (err: any) {
    console.error("[approvals/copies DELETE]", err);
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}
