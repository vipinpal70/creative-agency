import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import RepoFolder from "@/lib/models/repo-folder.model";
import {
  canManageRepository,
  resolveActor,
  normalizeFolderId,
  serializeFolder,
  canAccessRepoItem,
  resolveNewItemClientId,
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

    let parent: { clientId?: unknown } | null = null;
    if (parentId) {
      parent = await RepoFolder.findById(parentId).select("_id clientId").lean();
      if (!parent) return NextResponse.json({ error: "Parent folder not found" }, { status: 404 });
      // A client may only create inside a folder they own.
      if (!(await canAccessRepoItem(session, parent.clientId))) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const clientId = await resolveNewItemClientId({
      session,
      parent,
      explicitClientId: body.clientId ?? null,
    });
    // A client account with no linked Client record cannot own repository items.
    if (session.role === "client" && !clientId) {
      return NextResponse.json({ error: "No client workspace linked to this account" }, { status: 403 });
    }

    const actor = await resolveActor(session);

    try {
      const folder = await RepoFolder.create({ name, parentId, clientId, createdBy: actor });
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
