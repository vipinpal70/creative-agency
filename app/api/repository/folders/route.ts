import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import RepoFolder from "@/lib/models/repo-folder.model";
import {
  canManageRepository,
  resolveActor,
  normalizeFolderId,
  serializeFolder,
} from "@/lib/storage/repository";

// POST /api/repository/folders  { name, parentId? }
// Creates a folder under parentId (or the root). Names must be unique within
// their parent — a collision returns 409.
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!canManageRepository(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const name = (body.name || "").trim();
    const parentId = normalizeFolderId(body.parentId ?? null);

    if (!name) return NextResponse.json({ error: "Folder name is required" }, { status: 400 });
    if (name.length > 200) return NextResponse.json({ error: "Folder name is too long" }, { status: 400 });
    if (/[\/\\]/.test(name)) {
      return NextResponse.json({ error: "Folder name cannot contain slashes" }, { status: 400 });
    }

    await connectDB();

    if (parentId) {
      const parent = await RepoFolder.findById(parentId).select("_id").lean();
      if (!parent) return NextResponse.json({ error: "Parent folder not found" }, { status: 404 });
    }

    const actor = await resolveActor(session);

    try {
      const folder = await RepoFolder.create({ name, parentId, createdBy: actor });
      return NextResponse.json(serializeFolder(folder.toObject()), { status: 201 });
    } catch (err: any) {
      if (err?.code === 11000) {
        return NextResponse.json(
          { error: "A folder with that name already exists here" },
          { status: 409 }
        );
      }
      throw err;
    }
  } catch (err: any) {
    console.error("[repository/folders POST]", err);
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}
