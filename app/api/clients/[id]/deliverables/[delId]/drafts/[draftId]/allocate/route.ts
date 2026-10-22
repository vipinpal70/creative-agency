import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { isClient, forbidden } from "@/lib/authz";
import { connectDB } from "@/lib/db";
import ContentDraft from "@/lib/models/content-draft.model";
import Deliverable from "@/lib/models/deliverable.model";
import DraftHistory from "@/lib/models/draft-history.model";
import User from "@/lib/models/user.model";
import { computeChanges } from "@/lib/draft-history";
import {
  DELIVERABLE_STATUS_FOR_DRAFT,
  timelineForStatus,
} from "@/lib/status-flow";

type Ctx = { params: Promise<{ id: string; delId: string; draftId: string }> };

// Team roles that can be handed a design task.
const ASSIGNABLE_ROLES = ["GRAPHIC_DESIGNER", "VIDEO_EDITOR", "PHOTO_VIDEOGRAPHER"];

// POST /api/clients/[id]/deliverables/[delId]/drafts/[draftId]/allocate
// Allocate a design to a team member. Two cases:
//   • Claim — a queued copy (content_approved): mirrors Start Work
//     (status → design_in_progress + designStartedBy stamp + deliverable
//     cascade + timeline/history), but owned by the chosen target.
//   • Reassignment — an in-progress copy (design_in_progress / design_req_change):
//     hands ownership to a different designer. Status is left untouched; only
//     designStartedBy is re-stamped.
// Allowed actors: admin / creative lead / account manager (any copy), plus the
// designer who currently owns an in-progress copy (handing off their own work).
export async function POST(req: NextRequest, { params }: Ctx) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (isClient(session)) return forbidden();

    const { id, delId, draftId } = await params;
    const { userId: targetUserId } = await req.json();
    if (!targetUserId) {
      return NextResponse.json({ error: "A target userId is required" }, { status: 400 });
    }

    await connectDB();

    // Load the draft first — authorisation depends on its current owner.
    const draft = await ContentDraft.findOne({ _id: draftId, deliverableId: delId });
    if (!draft) {
      return NextResponse.json({ error: "Draft not found" }, { status: 404 });
    }
    if (draft.archivedAt) {
      return NextResponse.json(
        { error: "This copy is archived and cannot be allocated. Restore it first." },
        { status: 409 }
      );
    }

    // A fresh claim from the queue, or a reassignment of an in-progress copy
    // (the two statuses surfaced in the In Progress tab).
    const isClaim = draft.status === "content_approved";
    const isReassignment =
      draft.status === "design_in_progress" || draft.status === "design_req_change";
    if (!isClaim && !isReassignment) {
      return NextResponse.json(
        { error: "Only copies ready for design or already in progress can be allocated" },
        { status: 409 }
      );
    }

    // Authorise the actor: admin / creative lead / account manager may allocate
    // any copy; additionally, the designer who currently owns an in-progress copy
    // may hand it off to someone else.
    const actor = await User.findById(session.userId).select("firstName lastName email roles").lean();
    const actorRoles = (actor?.roles as string[]) ?? [];
    const isPrivileged =
      session.role === "admin" ||
      actorRoles.includes("CREATIVE_LEAD") ||
      actorRoles.includes("ACCOUNT_MANAGER");
    const isCurrentOwner =
      !!draft.designStartedBy && draft.designStartedBy.userId === session.userId.toString();
    if (!isPrivileged && !(isReassignment && isCurrentOwner)) {
      return NextResponse.json(
        {
          error:
            "Only an admin, creative lead, account manager, or the assigned designer can allocate this task",
        },
        { status: 403 }
      );
    }

    // Validate the target: an active team member holding an assignable role.
    const target = await User.findById(targetUserId).select("firstName lastName email roles role status").lean();
    if (!target || target.role === "client" || target.status !== "active") {
      return NextResponse.json({ error: "Assignee is not a valid team member" }, { status: 400 });
    }
    const targetRoles = (target.roles as string[]) ?? [];
    if (!targetRoles.some((r) => ASSIGNABLE_ROLES.includes(r))) {
      return NextResponse.json(
        { error: "Assignee must be a designer, video editor, or photo/videographer" },
        { status: 400 }
      );
    }

    // No-op guard: reassigning a copy to its current owner changes nothing.
    if (draft.designStartedBy && draft.designStartedBy.userId === (target._id as any).toString()) {
      return NextResponse.json(
        { error: "This copy is already assigned to that team member" },
        { status: 409 }
      );
    }

    const targetName = `${target.firstName} ${(target.lastName as string) || ""}`.trim();
    const actorName = actor
      ? `${actor.firstName} ${(actor.lastName as string) || ""}`.trim()
      : session.email;
    const now = new Date();

    const oldStatus = draft.status;
    const previousOwnerName = draft.designStartedBy?.name ?? "";

    // Re-stamp ownership to the target. On a fresh claim the status also advances
    // to design_in_progress; on a reassignment the status is left as-is.
    draft.designStartedBy = {
      userId: (target._id as any).toString(),
      name: targetName,
      email: target.email,
      startedAt: now,
    };
    if (isClaim) {
      draft.status = "design_in_progress";
    }
    draft.lastChangedBy = { userId: session.userId, name: actorName, email: session.email, changedAt: now };
    await draft.save();

    // A fresh claim is a genuine status change: cascade to the parent deliverable
    // and push a designer timeline entry. A reassignment keeps the same status,
    // so the deliverable and timeline are unaffected.
    if (isClaim) {
      const deliverable = await Deliverable.findOne({ _id: delId, clientId: id });
      if (deliverable) {
        deliverable.status = DELIVERABLE_STATUS_FOR_DRAFT["design_in_progress"] as any;
        await deliverable.save();
      }

      // Push the designer timeline entry (recorded against the acting user).
      const timelineKey = timelineForStatus("design_in_progress");
      await Deliverable.updateOne(
        { _id: delId },
        {
          $push: {
            [`statusTimeline.${timelineKey}`]: {
              status: "design_in_progress",
              timestamp: now,
              changedBy: { userId: session.userId, name: actorName, email: session.email },
            },
          },
        }
      );
    }

    // History: record who the task was allocated to (from → to drives the
    // "Allocated to <name>" activity entry). A fresh claim also records the
    // status move; a reassignment records the owner change only.
    const changes = isClaim
      ? computeChanges({ status: oldStatus }, { status: "design_in_progress" })
      : [];
    changes.push({ field: "assignedTo", label: "Assigned To", from: previousOwnerName, to: targetName });
    await DraftHistory.create({
      clientId: id,
      calendarId: draft.calendarId,
      deliverableId: delId,
      draftId: draft._id,
      draftVersion: draft.version,
      revision: draft.revision ?? 0,
      action: "edited",
      changedBy: { userId: session.userId, name: actorName, email: session.email },
      changedAt: now,
      changes,
    });

    return NextResponse.json({ ...draft.toObject(), id: draft._id.toString() });
  } catch (err: any) {
    console.error("[draft allocate POST]", err);
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}
