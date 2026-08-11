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
// Allocate a queued design (content_approved) to another team member. This is
// the same "claim" the PATCH self-allocate performs (status → design_in_progress
// + designStartedBy stamp + deliverable cascade + timeline/history), except the
// owner is the chosen target user instead of the acting session user.
// Only an admin / creative lead / account manager may allocate to others.
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

    // Authorise the actor: admin, creative lead, or account manager only.
    const actor = await User.findById(session.userId).select("firstName lastName email roles").lean();
    const actorRoles = (actor?.roles as string[]) ?? [];
    const canAllocate =
      session.role === "admin" ||
      actorRoles.includes("CREATIVE_LEAD") ||
      actorRoles.includes("ACCOUNT_MANAGER");
    if (!canAllocate) {
      return NextResponse.json(
        { error: "Only an admin, creative lead, or account manager can allocate a task" },
        { status: 403 }
      );
    }

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

    // Queue-only: allocation is a fresh claim, mirroring Start Work. Anything
    // already in progress / reviewed is off-limits here.
    if (draft.status !== "content_approved") {
      return NextResponse.json(
        { error: "Only copies ready for design (approved copy) can be allocated" },
        { status: 409 }
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

    const targetName = `${target.firstName} ${(target.lastName as string) || ""}`.trim();
    const actorName = actor
      ? `${actor.firstName} ${(actor.lastName as string) || ""}`.trim()
      : session.email;
    const now = new Date();

    const oldStatus = draft.status;

    // Same claim the PATCH self-allocate performs — owner is the target user.
    draft.designStartedBy = {
      userId: (target._id as any).toString(),
      name: targetName,
      email: target.email,
      startedAt: now,
    };
    draft.status = "design_in_progress";
    draft.lastChangedBy = { userId: session.userId, name: actorName, email: session.email, changedAt: now };
    await draft.save();

    // Cascade to the parent deliverable.
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

    // History: record both the status move and who it was allocated to, so the
    // activity trail reads "Allocated to <name>" rather than a bare "Started work".
    const changes = computeChanges({ status: oldStatus }, { status: "design_in_progress" });
    changes.push({ field: "assignedTo", label: "Assigned To", from: "", to: targetName });
    await DraftHistory.create({
      clientId: id,
      calendarId: draft.calendarId,
      deliverableId: delId,
      draftId: draft._id,
      draftVersion: draft.version,
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
