import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import ContentDraft from "@/lib/models/content-draft.model";
import Deliverable from "@/lib/models/deliverable.model";
import Calendar from "@/lib/models/calendar.model";
import Client from "@/lib/models/client.model";
import User from "@/lib/models/user.model";
import { serializeCopy } from "@/lib/serialize-copy";

type Ctx = { params: Promise<{ draftId: string }> };

// Staff who may archive/restore. Clients cannot manage the archive.
function canManageArchive(role: string) {
  return role === "admin" || role === "member";
}

async function populatedCopy(draftId: string) {
  void Deliverable; void Calendar; void Client; void User;
  return ContentDraft.findById(draftId)
    .populate("clientId", "name brandName")
    .populate("deliverableId", "title platforms buckets type status module scheduledDate")
    .populate("calendarId", "name")
    .populate("createdBy", "firstName lastName email")
    .lean();
}

// POST /api/approvals/copies/[draftId]/archive
// Body: { action: "archive" | "restore" }
// Archiving hides the copy from active lists (retained 14 days); restoring
// returns it to the active list. Concurrent calls are naturally idempotent.
export async function POST(req: NextRequest, { params }: Ctx) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!canManageArchive(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { draftId } = await params;
    if (!mongoose.Types.ObjectId.isValid(draftId)) {
      return NextResponse.json({ error: "Invalid draft ID" }, { status: 400 });
    }

    const { action } = await req.json().catch(() => ({}));
    if (action !== "archive" && action !== "restore") {
      return NextResponse.json(
        { error: 'action must be "archive" or "restore"' },
        { status: 400 }
      );
    }

    await connectDB();

    const draft = await ContentDraft.findById(draftId);
    if (!draft) return NextResponse.json({ error: "Copy not found" }, { status: 404 });

    if (action === "archive") {
      // No-op if already archived — keep the original archive timestamp so the
      // 14-day retention window isn't silently extended by a repeat click.
      if (!draft.archivedAt) {
        const actor = await User.findById(session.userId)
          .select("firstName lastName email")
          .lean();
        const actorName = actor
          ? `${actor.firstName} ${actor.lastName || ""}`.trim()
          : session.email;
        draft.archivedAt = new Date();
        draft.archivedBy = {
          userId: session.userId,
          name: actorName,
          email: session.email,
          changedAt: draft.archivedAt,
        };
        await draft.save();
      }
    } else {
      draft.archivedAt = null;
      draft.archivedBy = null;
      await draft.save();
    }

    const populated = await populatedCopy(draftId);
    return NextResponse.json(serializeCopy(populated));
  } catch (err: any) {
    console.error("[approvals/copies archive POST]", err);
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}
