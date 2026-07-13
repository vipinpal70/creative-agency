import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import RepoFolder from "@/lib/models/repo-folder.model";
import RepoFile from "@/lib/models/repo-file.model";
import {
  canManageRepository,
  resolveActor,
  normalizeFolderId,
  saveRepoFile,
  deleteRepoFile,
  categoryFor,
  extensionOf,
  mimeForFile,
  serializeFile,
  MAX_REPO_FILE_BYTES,
  canAccessRepoItem,
  resolveNewItemClientId,
} from "@/lib/storage/repository";

// Larger multipart bodies than Next's default are expected here.
export const maxDuration = 60;

// POST /api/repository/files   (multipart: file, folderId?)
// Uploads a single file into a folder. The client uploads multiple files by
// issuing one request per file so it can track progress independently.
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!canManageRepository(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const form = await req.formData();
    const file = form.get("file") as File | null;
    const folderId = normalizeFolderId((form.get("folderId") as string | null) ?? null);

    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
    if (file.size > MAX_REPO_FILE_BYTES) {
      return NextResponse.json(
        { error: `File exceeds the ${Math.round(MAX_REPO_FILE_BYTES / (1024 * 1024))} MB limit` },
        { status: 413 }
      );
    }

    await connectDB();

    let folder: { clientId?: unknown } | null = null;
    if (folderId) {
      folder = await RepoFolder.findById(folderId).select("_id clientId").lean();
      if (!folder) return NextResponse.json({ error: "Target folder not found" }, { status: 404 });
      // A client may only upload into a folder they own.
      if (!(await canAccessRepoItem(session, folder.clientId))) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    const clientId = await resolveNewItemClientId({
      session,
      parent: folder,
      explicitClientId: (form.get("clientId") as string | null) ?? null,
    });
    if (session.role === "client" && !clientId) {
      return NextResponse.json({ error: "No client workspace linked to this account" }, { status: 403 });
    }

    const name = file.name.trim();
    // Reject up front for a clear message (the unique index is the real guard).
    const existing = await RepoFile.findOne({ folderId, clientId, name }).select("_id").lean();
    if (existing) {
      return NextResponse.json(
        { error: `A file named "${name}" already exists in this folder` },
        { status: 409 }
      );
    }

    const actor = await resolveActor(session);
    const { storageKey, size } = await saveRepoFile(file);

    try {
      const now = new Date();
      const doc = await RepoFile.create({
        name,
        folderId,
        clientId,
        mimeType: mimeForFile(name, file.type),
        ext: extensionOf(name),
        size,
        category: categoryFor(name, file.type),
        storageKey,
        uploadedBy: actor,
        lastModifiedAt: now,
      });
      return NextResponse.json(serializeFile(doc.toObject()), { status: 201 });
    } catch (err: any) {
      // Roll back the orphaned bytes if the DB write fails (e.g. race on name).
      await deleteRepoFile(storageKey);
      if (err?.code === 11000) {
        return NextResponse.json(
          { error: `A file named "${name}" already exists in this folder` },
          { status: 409 }
        );
      }
      throw err;
    }
  } catch (err: any) {
    console.error("[repository/files POST]", err);
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}
