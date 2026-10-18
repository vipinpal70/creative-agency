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
import { ADHOC_CATEGORIES, ADHOC_FLYER_CATEGORY } from "@/lib/types";

// An adhoc request carries a category (media type) chosen from ADHOC_CATEGORIES
// and a delivery format (digital | printable). It runs the normal content →
// design lifecycle (it never skips the design phase).
const VALID_FORMATS = ["digital", "printable"] as const;

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
// Flyer body:     { clientId, category: "Flyer", copy, referenceUrl?, deliveryDate?,
//                   deliveryFormat?, title? }
// Non-flyer body: { clientId, category, creativeCopy|copy, caption, hashtags?,
//                   frames?, platforms?, publishDate?, publishTime?, referenceUrl?,
//                   videoType?, videoNotes?, articleMode?, articleCopy?, title? }
// Creates (lazily bootstrapping the client's adhoc calendar + scope), bumps the
// shared adhoc scope item, and writes the deliverable + draft (status "draft")
// so the copy enters the normal review pipeline. Adhoc copies never carry
// buckets. The Flyer category also drops platforms/caption/hashtags and uses a
// delivery format; every other category is a standalone social copy.
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (isClient(session)) return forbidden();

    const body = await req.json();
    const {
      clientId, category, title, notes,
      // flyer
      deliveryFormat, deliveryDate,
      // shared
      copy, creativeCopy, referenceUrl,
      // social
      caption, hashtags, frames, platforms, publishDate, publishTime,
      videoType, videoNotes, articleMode, articleCopy,
    } = body;

    if (!clientId || !category || !(ADHOC_CATEGORIES as readonly string[]).includes(category)) {
      return NextResponse.json(
        { error: "clientId and a valid category are required" },
        { status: 400 }
      );
    }

    const isFlyer = category === ADHOC_FLYER_CATEGORY;
    const isCarousel = String(category).toLowerCase() === "carousel";
    const bodyCopy = (creativeCopy ?? copy ?? "").toString();
    const framesClean = Array.isArray(frames) ? frames : [];

    // Validation: carousel needs frame copy; everything else needs body copy.
    if (isCarousel ? framesClean.length === 0 : !bodyCopy.trim()) {
      return NextResponse.json({ error: "Copy content is required" }, { status: 400 });
    }

    await connectDB();

    const format = (VALID_FORMATS as readonly string[]).includes(deliveryFormat) ? deliveryFormat : "";
    // Flyer schedules on its delivery date; social copies on their publish date.
    const dateStr = isFlyer ? deliveryDate : publishDate;

    // Bootstrap (or reuse) the client's adhoc calendar + scope, then record the
    // request against the shared adhoc scope item.
    const { calendarId, scopeId } = await getOrCreateAdhocContext(clientId, session.userId);
    await incrementAdhocScopeCount(scopeId);

    const author = await User.findById(session.userId).select("firstName lastName email").lean();
    const authorName = author
      ? `${author.firstName} ${author.lastName || ""}`.trim()
      : session.email;
    const now = new Date();

    const resolvedTitle = (title?.trim() || bodyCopy.trim()).slice(0, 80) || category;

    // ── Deliverable ──────────────────────────────────────────────────────
    const deliverable = await Deliverable.create({
      clientId,
      scopeId,
      calendarId,
      module: ADHOC_MODULE,
      // Deliverable.type is free-text in the schema; the TS union is narrower,
      // so cast the chosen category through. Drives carousel detection etc.
      type: category as DeliverableType,
      // Flyers have no platform; other adhoc copies are standalone social posts.
      platforms: isFlyer ? [] : (Array.isArray(platforms) ? platforms : []),
      title: resolvedTitle,
      buckets: [],
      scheduledDate: dateStr ? new Date(dateStr) : now,
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
      mediaType: category,
      creativeCopy: isCarousel ? "" : bodyCopy,
      frames: isFlyer ? [] : framesClean,
      caption: isFlyer ? "" : (caption || ""),
      hashtags: isFlyer ? [] : (Array.isArray(hashtags) ? hashtags : []),
      referenceUrl: referenceUrl || "",
      videoType: isFlyer ? "" : (videoType || ""),
      videoNotes: isFlyer ? "" : (videoNotes || ""),
      articleMode: isFlyer ? "" : (articleMode || ""),
      articleCopy: isFlyer ? "" : (articleCopy || ""),
      deliveryFormat: isFlyer ? format : "",
      notes: (notes || "").toString(),
      publishDate: dateStr ? new Date(dateStr) : null,
      publishTime: isFlyer ? null : (publishTime || null),
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
