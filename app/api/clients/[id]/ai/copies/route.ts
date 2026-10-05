import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { isClient, assertClientAccess, notFound } from "@/lib/authz";
import { connectDB } from "@/lib/db";

// ASSUMPTION: adjust this import path if your model file lives elsewhere —
// I've matched the naming convention of your other model imports
// (deliverable.model, client.model).
import ContentDraft from "@/lib/models/content-draft.model";
import Deliverable from "@/lib/models/deliverable.model";

type Ctx = { params: Promise<{ id: string }> };

// UI category -> ContentDraft.mediaType, aligned with Deliverable's type enum
// rather than the friendlier labels the picker shows the writer.
const CATEGORY_TO_MEDIA_TYPE: Record<string, string> = {
  reel: "reel",
  static_image: "image",
  carousel: "image/carousel",
};

// POST /api/clients/[id]/copies
// Body: { deliverableId, category, copy, caption, hashtags }
//
// Creates a new ContentDraft (version N+1 for that deliverable) with the
// reviewed AI output mapped onto creativeCopy / caption / hashtags.
export async function POST(req: NextRequest, { params }: Ctx) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    if (isClient(session)) {
      if (!(await assertClientAccess(session, id))) return notFound();
    }

    const body = await req.json();
    const { deliverableId, category, copy, caption, hashtags } = body;

    if (!deliverableId) {
      return NextResponse.json({ error: "deliverableId is required" }, { status: 400 });
    }

    if (!copy?.trim() && !caption?.trim()) {
      return NextResponse.json(
        { error: "copy or caption is required" },
        { status: 400 }
      );
    }

    await connectDB();

    // Load the deliverable ourselves rather than trusting a client-supplied
    // calendarId - this also confirms the deliverable actually belongs to
    // this client before we attach a draft to it.
    const deliverable = await Deliverable.findOne({
      _id: deliverableId,
      clientId: id,
    }).lean();

    if (!deliverable) {
      return NextResponse.json(
        { error: "Deliverable not found for this client" },
        { status: 404 }
      );
    }

    // {deliverableId, version} is a unique index - auto-increment off the
    // current highest version for this deliverable.
    const latest = await ContentDraft.findOne({ deliverableId })
      .sort({ version: -1 })
      .select("version")
      .lean();

    const nextVersion = (latest?.version ?? 0) + 1;

    const draft = await ContentDraft.create({
      clientId: id,
      calendarId: deliverable.calendarId,
      deliverableId,
      version: nextVersion,
      createdBy: session.userId,
      mediaType: CATEGORY_TO_MEDIA_TYPE[category] || category || "",
      creativeCopy: copy?.trim() || "",
      caption: caption?.trim() || "",
      hashtags: Array.isArray(hashtags) ? hashtags : [],
      notes: "Created via Write with AI",
    });

    return NextResponse.json(
      { ...draft.toObject(), id: draft._id.toString() },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("[copies POST]", err);
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}