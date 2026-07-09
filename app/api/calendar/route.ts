import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { assertClientAccess, notFound } from "@/lib/authz";
import { connectDB } from "@/lib/db";
import Calendar from "@/lib/models/calendar.model";
import Deliverable from "@/lib/models/deliverable.model";
import ContentDraft from "@/lib/models/content-draft.model";
import mongoose from "mongoose";

// GET /api/calendar?clientId=&scopeId=
// Returns all deliverables + their latest draft for the given client/scope
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get("clientId");
    const scopeId  = searchParams.get("scopeId");

    if (!clientId) {
      return NextResponse.json({ error: "clientId is required" }, { status: 400 });
    }

    // Clients may only read their own content calendar.
    if (!(await assertClientAccess(session, clientId))) return notFound();

    await connectDB();

    // Fetch calendars for this client+scope
    const calFilter: Record<string, unknown> = { clientId };
    if (scopeId) calFilter.scopeId = scopeId;
    const calendars = await Calendar.find(calFilter).lean();

    if (calendars.length === 0) {
      return NextResponse.json([]);
    }

    const calendarIds = calendars.map((c) => c._id);
    const calendarMap = new Map(calendars.map((c) => [c._id.toString(), c]));

    // Fetch all deliverables in these calendars
    const deliverables = await Deliverable.find({
      clientId,
      calendarId: { $in: calendarIds },
    }).lean();

    if (deliverables.length === 0) {
      return NextResponse.json([]);
    }

    const deliverableIds = deliverables.map((d) => d._id) as mongoose.Types.ObjectId[];

    // Get latest draft per deliverable via aggregation
    const latestDrafts = await ContentDraft.aggregate([
      { $match: { deliverableId: { $in: deliverableIds } } },
      { $sort: { version: -1 } },
      {
        $group: {
          _id: "$deliverableId",
          draft: { $first: "$$ROOT" },
        },
      },
    ]);

    const draftMap = new Map(
      latestDrafts.map((d) => [d._id.toString(), d.draft])
    );

    const result = deliverables.map((del) => {
      const draft = draftMap.get((del._id as mongoose.Types.ObjectId).toString());
      const calendar = calendarMap.get((del.calendarId as mongoose.Types.ObjectId).toString());

      return {
        deliverableId:  (del._id as mongoose.Types.ObjectId).toString(),
        calendarId:     (del.calendarId as mongoose.Types.ObjectId).toString(),
        scopeId:        (del.scopeId as mongoose.Types.ObjectId).toString(),
        clientId:       (del.clientId as mongoose.Types.ObjectId).toString(),
        module:         del.module,
        calendarName:   calendar?.name ?? "",
        type:           del.type,
        platforms:      del.platforms ?? [],
        title:          del.title,
        status:         del.status,
        buckets:        del.buckets ?? [],
        scheduledDate:  del.scheduledDate?.toISOString() ?? null,
        statusTimeline: {
          writerTimeline: (del.statusTimeline?.writerTimeline ?? []).map((e: any) => ({
            status:    e.status,
            timestamp: e.timestamp?.toISOString() ?? "",
            changedBy: e.changedBy,
          })),
          designerTimeline: (del.statusTimeline?.designerTimeline ?? []).map((e: any) => ({
            status:    e.status,
            timestamp: e.timestamp?.toISOString() ?? "",
            changedBy: e.changedBy,
          })),
        },
        draft: draft
          ? {
              id:            draft._id.toString(),
              version:       draft.version,
              mediaType:     draft.mediaType ?? "",
              creativeCopy:  draft.creativeCopy ?? "",
              frames:        draft.frames ?? [],
              imageUrl:      draft.imageUrl ?? "",
              videoUrl:      draft.videoUrl ?? "",
              thumbnailUrl:  draft.thumbnailUrl ?? "",
              audioUrl:      draft.audioUrl ?? "",
              caption:       draft.caption ?? "",
              hashtags:      draft.hashtags ?? [],
              publishDate:   draft.publishDate?.toISOString() ?? null,
              publishTime:   draft.publishTime ?? null,
              referenceUrl:  draft.referenceUrl ?? "",
              videoType:     draft.videoType ?? "",
              videoNotes:    draft.videoNotes ?? "",
              articleMode:   draft.articleMode ?? "",
              articleCopy:   draft.articleCopy ?? "",
              notes:         draft.notes ?? "",
              status:        draft.status ?? "draft",
              rejectionNote: draft.rejectionNote ?? "",
              lastChangedBy: draft.lastChangedBy
                ? {
                    userId:    draft.lastChangedBy.userId,
                    name:      draft.lastChangedBy.name,
                    email:     draft.lastChangedBy.email,
                    changedAt: draft.lastChangedBy.changedAt?.toISOString() ?? "",
                  }
                : null,
            }
          : null,
      };
    });

    return NextResponse.json(result);
  } catch (err: any) {
    console.error("[calendar GET]", err);
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}
