import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import RepoFolder from "@/lib/models/repo-folder.model";
import RepoFile from "@/lib/models/repo-file.model";
import {
  canManageRepository,
  normalizeFolderId,
  deleteRepoFile,
  extensionOf,
  mimeForFile,
  categoryFor,
  serializeFile,
} from "@/lib/storage/repository";

type Ctx = { params: Promise<{ id: string }> };

// PATCH /api/repository/files/[id]  { name? (rename), folderId? (move) }
export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!canManageRepository(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid file id" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    await connectDB();

    const file = await RepoFile.findById(id);
    if (!file) return NextResponse.json({ error: "File not found" }, { status: 404 });

    if (body.name !== undefined) {
      const name = (body.name || "").trim();
      if (!name) return NextResponse.json({ error: "File name is required" }, { status: 400 });
      if (/[\/\\]/.test(name)) {
        return NextResponse.json({ error: "File name cannot contain slashes" }, { status: 400 });
      }
      file.name = name;
      // Keep derived metadata consistent with the (possibly new) extension.
      file.ext = extensionOf(name);
      file.mimeType = mimeForFile(name, file.mimeType);
      file.category = categoryFor(name, file.mimeType);
      file.lastModifiedAt = new Date();
    }

    if (body.folderId !== undefined) {
      const target = normalizeFolderId(body.folderId);
      if (target) {
        const folder = await RepoFolder.findById(target).select("_id").lean();
        if (!folder) return NextResponse.json({ error: "Target folder not found" }, { status: 404 });
      }
      file.folderId = target ? new mongoose.Types.ObjectId(target) : null;
    }

    try {
      await file.save();
    } catch (err: any) {
      if (err?.code === 11000) {
        return NextResponse.json(
          { error: "A file with that name already exists in the destination" },
          { status: 409 }
        );
      }
      throw err;
    }

    return NextResponse.json(serializeFile(file.toObject()));
  } catch (err: any) {
    console.error("[repository/files PATCH]", err);
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}

// DELETE /api/repository/files/[id]  — removes the record and its stored bytes.
export async function DELETE(req: NextRequest, { params }: Ctx) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!canManageRepository(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid file id" }, { status: 400 });
    }

    await connectDB();

    const file = await RepoFile.findById(id).lean();
    if (!file) return NextResponse.json({ message: "Already deleted", deleted: false });

    await deleteRepoFile((file as any).storageKey);
    await RepoFile.deleteOne({ _id: id });

    return NextResponse.json({ message: "File deleted", deleted: true });
  } catch (err: any) {
    console.error("[repository/files DELETE]", err);
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}
