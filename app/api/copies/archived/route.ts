import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import ContentDraft from "@/lib/models/content-draft.model";
import Deliverable from "@/lib/models/deliverable.model";
import Calendar from "@/lib/models/calendar.model";
import Client from "@/lib/models/client.model";
import User from "@/lib/models/user.model";
import { serializeCopy } from "@/lib/serialize-copy";
import { purgeExpiredArchived } from "@/lib/copy-cleanup";

// GET /api/copies/archived
//   ?q=<text>            search copy/caption/hashtags/notes
//   &clientId=<id>       filter by client
//   &sort=recent|oldest  by archive date (default recent)
//   &page=1&limit=20     pagination
// Lists archived copies. Staff only (clients cannot browse the archive).
// Opportunistically purges any copies past the 14-day retention window so the
// list never shows items that should already be gone.
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.role === "client") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectDB();

    // Fallback cleanup in case the scheduled job hasn't run recently.
    await purgeExpiredArchived().catch((e) =>
      console.error("[copies/archived] opportunistic purge failed:", e)
    );

    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();
    const clientId = (searchParams.get("clientId") || "").trim();
    const sort = searchParams.get("sort") === "oldest" ? 1 : -1;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10) || 20));

    void Deliverable; void Calendar; void Client; void User;

    const filter: Record<string, any> = { archivedAt: { $ne: null } };
    if (clientId) filter.clientId = clientId;
    if (q) {
      const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter.$or = [
        { creativeCopy: rx },
        { articleCopy: rx },
        { caption: rx },
        { notes: rx },
        { hashtags: rx },
      ];
    }

    const total = await ContentDraft.countDocuments(filter);
    const drafts = await ContentDraft.find(filter)
      .populate("clientId", "name brandName")
      .populate("deliverableId", "title platforms buckets type status module scheduledDate")
      .populate("calendarId", "name")
      .populate("createdBy", "firstName lastName email")
      .sort({ archivedAt: sort })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    return NextResponse.json({
      items: drafts.map(serializeCopy),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (err: any) {
    console.error("[copies/archived GET]", err);
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}
