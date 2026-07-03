import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import ContentDraft from "@/lib/models/content-draft.model";
import Deliverable from "@/lib/models/deliverable.model";
import Calendar from "@/lib/models/calendar.model";
import Client from "@/lib/models/client.model";
import User from "@/lib/models/user.model";
import { normalizeDraftStatus } from "@/lib/status-flow";
import type { DraftStatus } from "@/lib/status-flow";
import { serializeCopy, dbStatusesFor } from "@/lib/serialize-copy";

// GET /api/approvals/copies?status=content_internal_review[,design_internal_review]
// Lists copies (drafts) across all clients, filtered by status.
// Default: content_internal_review. Legacy statuses match their mapped value.
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();

    const { searchParams } = new URL(req.url);
    const statusParam = searchParams.get("status") || "content_internal_review";

    const requested = statusParam
      .split(",")
      .map((s) => normalizeDraftStatus(s.trim()))
      .filter(Boolean) as DraftStatus[];

    if (requested.length === 0) {
      return NextResponse.json({ error: "Invalid status filter" }, { status: 400 });
    }

    const dbStatuses = requested.flatMap(dbStatusesFor);

    // Reference models so populate works even before they're registered elsewhere
    void Deliverable; void Calendar; void Client; void User;

    // Filter includes legacy string values, so it's wider than the schema type
    const filter: Record<string, any> = { status: { $in: dbStatuses } };
    const drafts = await ContentDraft.find(filter)
      .populate("clientId", "name brandName")
      .populate("deliverableId", "title platforms buckets type status module scheduledDate")
      .populate("calendarId", "name")
      .populate("createdBy", "firstName lastName email")
      .sort({ updatedAt: -1 })
      .lean();

    return NextResponse.json(drafts.map(serializeCopy));
  } catch (err: any) {
    console.error("[approvals/copies GET]", err);
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}
