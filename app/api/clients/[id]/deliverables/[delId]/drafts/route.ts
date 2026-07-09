import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { isClient, assertClientAccess, notFound } from "@/lib/authz";
import { connectDB } from "@/lib/db";
import Deliverable from "@/lib/models/deliverable.model";
import ContentDraft from "@/lib/models/content-draft.model";
import DraftHistory from "@/lib/models/draft-history.model";
import User from "@/lib/models/user.model";

type Ctx = { params: Promise<{ id: string; delId: string }> };

// GET /api/clients/[id]/deliverables/[delId]/drafts
// Returns all draft versions for this deliverable, newest first
export async function GET(req: NextRequest, { params }: Ctx) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (isClient(session)) {
      const { id } = await params;
      if (!(await assertClientAccess(session, id))) return notFound();
    }

    const { id, delId } = await params;
    await connectDB();

    const deliverable = await Deliverable.findOne({ _id: delId, clientId: id }).lean();
    if (!deliverable) {
      return NextResponse.json({ error: "Deliverable not found" }, { status: 404 });
    }

    const drafts = await ContentDraft.find({ deliverableId: delId })
      .sort({ version: -1 })
      .populate("createdBy", "firstName lastName email")
      .lean();

    return NextResponse.json(
      drafts.map((d) => ({ ...d, id: (d._id as any).toString() }))
    );
  } catch (err: any) {
    console.error("[drafts GET]", err);
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}

// POST /api/clients/[id]/deliverables/[delId]/drafts
// Creates a new draft version (auto-increments version number)
// Body: { mediaType?, creativeCopy?, caption?, hashtags?, publishDate?, publishTime?, notes? }
export async function POST(req: NextRequest, { params }: Ctx) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (isClient(session)) {
      const { id } = await params;
      if (!(await assertClientAccess(session, id))) return notFound();
    }

    const { id, delId } = await params;
    const body = await req.json();
    await connectDB();

    const deliverable = await Deliverable.findOne({ _id: delId, clientId: id }).lean();
    if (!deliverable) {
      return NextResponse.json({ error: "Deliverable not found" }, { status: 404 });
    }

    // Compute next version number
    const latest = await ContentDraft.findOne({ deliverableId: delId })
      .sort({ version: -1 })
      .select("version")
      .lean();
    const nextVersion = latest ? latest.version + 1 : 1;

    const { mediaType, creativeCopy, frames, caption, hashtags,
            publishDate, publishTime, referenceUrl, videoType, videoNotes,
            articleMode, articleCopy, notes,
            imageUrl, videoUrl, thumbnailUrl, audioUrl } = body;

    // Resolve author name for history snapshot
    const author = await User.findById(session.userId).select("firstName lastName email").lean();
    const authorName = author
      ? `${author.firstName} ${author.lastName || ""}`.trim()
      : session.email;

    const now = new Date();

    const draft = await ContentDraft.create({
      clientId:      id,
      calendarId:    deliverable.calendarId,
      deliverableId: delId,
      version:       nextVersion,
      createdBy:     session.userId,
      mediaType:     mediaType    || "",
      creativeCopy:  creativeCopy || "",
      frames:        Array.isArray(frames) ? frames : [],
      imageUrl:      imageUrl     || "",
      videoUrl:      videoUrl     || "",
      thumbnailUrl:  thumbnailUrl || "",
      audioUrl:      audioUrl     || "",
      caption:       caption      || "",
      hashtags:      Array.isArray(hashtags) ? hashtags : [],
      publishDate:   publishDate  ? new Date(publishDate) : null,
      publishTime:   publishTime  || null,
      referenceUrl:  referenceUrl || "",
      videoType:     videoType    || "",
      videoNotes:    videoNotes   || "",
      articleMode:   articleMode  || "",
      articleCopy:   articleCopy  || "",
      notes:         notes        || "",
      status:        "draft",
      lastChangedBy: { userId: session.userId, name: authorName, email: session.email, changedAt: now },
    });

    // Push "created" entry to writerTimeline on the parent deliverable
    await Deliverable.updateOne(
      { _id: delId },
      {
        $push: {
          "statusTimeline.writerTimeline": {
            status:    "created",
            timestamp: now,
            changedBy: { userId: session.userId, name: authorName, email: session.email },
          },
        },
      }
    );

    // Record creation in history
    await DraftHistory.create({
      clientId:      id,
      calendarId:    deliverable.calendarId,
      deliverableId: delId,
      draftId:       draft._id,
      draftVersion:  nextVersion,
      action:        "created",
      changedBy:     { userId: session.userId, name: authorName, email: session.email },
      changedAt:     now,
      changes:       [],
    });

    return NextResponse.json(
      { ...draft.toObject(), id: draft._id.toString() },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("[drafts POST]", err);
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}
