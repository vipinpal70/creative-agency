import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { isClient, forbidden } from "@/lib/authz";
import { connectDB } from "@/lib/db";
import Deliverable from "@/lib/models/deliverable.model";
import type { DeliverableType } from "@/lib/models/deliverable.model";
import ContentDraft from "@/lib/models/content-draft.model";
import DraftHistory from "@/lib/models/draft-history.model";
import User from "@/lib/models/user.model";
import Calendar from "@/lib/models/calendar.model";
import {
  ADHOC_MODULE,
  getOrCreateAdhocContext,
  incrementAdhocScopeCount,
} from "@/lib/adhoc";

// Adhoc copy types. "flyer" uses the standard copy fields; "unstructured" is a
// freeform body the writer just writes. Both run the normal content → design
// lifecycle (neither skips the design phase).
const ADHOC_TYPES = ["flyer", "unstructured"] as const;
type AdhocType = (typeof ADHOC_TYPES)[number];

const DELIVERABLE_TYPE: Record<AdhocType, string> = {
  flyer: "flyer",
  unstructured: "unstructured",
};
const MEDIA_TYPE: Record<AdhocType, string> = {
  flyer: "Flyer",
  unstructured: "Unstructured",
};

// GET /api/adhoc/copies?clientId=
// Lists the client's adhoc copies (deliverables under the adhoc calendar, each
// enriched with its latest draft) in the WriterDeliverable shape the UI reuses.
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (isClient(session)) return forbidden();

    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get("clientId");
    if (!clientId) {
      return NextResponse.json({ error: "clientId is required" }, { status: 400 });
    }

    await connectDB();

    // No adhoc calendar yet → the client has no adhoc copies.
    const calendar = await Calendar.findOne({ clientId, module: ADHOC_MODULE }).lean();
    if (!calendar) return NextResponse.json([]);

    const deliverables = await Deliverable.find({
      clientId,
      calendarId: calendar._id,
    })
      .sort({ createdAt: -1 })
      .lean();

    const withDrafts = await Promise.all(
      deliverables.map(async (d) => {
        const draft = await ContentDraft.findOne({ deliverableId: d._id })
          .sort({ version: -1 })
          .lean();
        return {
          ...d,
          id: (d._id as any).toString(),
          latestDraft: draft ? { ...draft, id: (draft._id as any).toString() } : null,
        };
      })
    );

    return NextResponse.json(withDrafts);
  } catch (err: any) {
    console.error("[adhoc/copies GET]", err);
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}

// POST /api/adhoc/copies
// Body: { clientId, type: "flyer"|"unstructured", copy, caption?, referenceUrl?,
//         publishDate?, publishTime?, title? }
// Creates (lazily bootstrapping the client's adhoc calendar + scope), bumps the
// shared adhoc scope item, and writes the deliverable + draft (status "draft")
// so the copy enters the normal review pipeline.
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (isClient(session)) return forbidden();

    const body = await req.json();
    const { clientId, type, copy, caption, referenceUrl, publishDate, publishTime, title } = body;

    if (!clientId || !ADHOC_TYPES.includes(type)) {
      return NextResponse.json(
        { error: "clientId and a valid type (flyer | unstructured) are required" },
        { status: 400 }
      );
    }
    if (!copy?.trim()) {
      return NextResponse.json({ error: "Copy content is required" }, { status: 400 });
    }

    await connectDB();

    const adhocType = type as AdhocType;

    // Bootstrap (or reuse) the client's adhoc calendar + scope, then record the
    // request against the shared adhoc scope item.
    const { calendarId, scopeId } = await getOrCreateAdhocContext(clientId, session.userId);
    await incrementAdhocScopeCount(scopeId);

    const author = await User.findById(session.userId).select("firstName lastName email").lean();
    const authorName = author
      ? `${author.firstName} ${author.lastName || ""}`.trim()
      : session.email;
    const now = new Date();

    const resolvedTitle =
      (title?.trim() || copy.trim()).slice(0, 80) || MEDIA_TYPE[adhocType];

    // ── Deliverable ──────────────────────────────────────────────────────
    const deliverable = await Deliverable.create({
      clientId,
      scopeId,
      calendarId,
      module: ADHOC_MODULE,
      // Deliverable.type is free-text in the schema; the TS union is narrower,
      // so cast our adhoc type labels through.
      type: DELIVERABLE_TYPE[adhocType] as DeliverableType,
      platforms: [],
      title: resolvedTitle,
      buckets: [],
      scheduledDate: publishDate ? new Date(publishDate) : now,
      status: "pending",
    });

    // ── Draft (status "draft" → enters the normal content review cycle) ───
    const draft = await ContentDraft.create({
      clientId,
      calendarId,
      deliverableId: deliverable._id,
      version: 1,
      revision: 0,
      createdBy: session.userId,
      mediaType: MEDIA_TYPE[adhocType],
      creativeCopy: copy,
      caption: caption || "",
      referenceUrl: referenceUrl || "",
      publishDate: publishDate ? new Date(publishDate) : null,
      publishTime: publishTime || null,
      status: "draft",
      lastChangedBy: { userId: session.userId, name: authorName, email: session.email, changedAt: now },
    });

    // Mirror the standard draft-creation side effects: a "created" writer
    // timeline entry on the deliverable and a history record.
    await Deliverable.updateOne(
      { _id: deliverable._id },
      {
        $push: {
          "statusTimeline.writerTimeline": {
            status: "created",
            timestamp: now,
            changedBy: { userId: session.userId, name: authorName, email: session.email },
          },
        },
      }
    );
    await DraftHistory.create({
      clientId,
      calendarId,
      deliverableId: deliverable._id,
      draftId: draft._id,
      draftVersion: 1,
      revision: 0,
      action: "created",
      changedBy: { userId: session.userId, name: authorName, email: session.email },
      changedAt: now,
      changes: [],
    });

    return NextResponse.json(
      {
        ...deliverable.toObject(),
        id: deliverable._id.toString(),
        latestDraft: { ...draft.toObject(), id: draft._id.toString() },
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("[adhoc/copies POST]", err);
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}
