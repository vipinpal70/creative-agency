import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import RepoFolder from "@/lib/models/repo-folder.model";
import RepoFile from "@/lib/models/repo-file.model";
import {
  canManageRepository,
  normalizeFolderId,
  isDescendantOrSelf,
  collectDescendantFolderIds,
  deleteRepoFile,
  serializeFolder,
  canAccessRepoItem,
} from "@/lib/storage/repository";

type Ctx = { params: Promise<{ id: string }> };

// PATCH /api/repository/folders/[id]  { name? , parentId? (move) }
export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!canManageRepository(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid folder id" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    await connectDB();

    const folder = await RepoFolder.findById(id);
    if (!folder) return NextResponse.json({ error: "Folder not found" }, { status: 404 });
    // A client may only touch folders in their own scope.
    if (!(await canAccessRepoItem(session, folder.clientId))) {
      return NextResponse.json({ error: "Folder not found" }, { status: 404 });
    }

    // Track a scope change so the whole subtree can be re-tagged after save.
    let rescopeTo: mongoose.Types.ObjectId | null | undefined;

    // Rename
    if (body.name !== undefined) {
      const name = (body.name || "").trim();
      if (!name) return NextResponse.json({ error: "Folder name is required" }, { status: 400 });
      if (/[\/\\]/.test(name)) {
        return NextResponse.json({ error: "Folder name cannot contain slashes" }, { status: 400 });
      }
      folder.name = name;
    }

    // Move
    if (body.parentId !== undefined) {
      const target = normalizeFolderId(body.parentId);
      let targetClientId: mongoose.Types.ObjectId | null = null;
      if (target) {
        if (!mongoose.Types.ObjectId.isValid(target)) {
          return NextResponse.json({ error: "Invalid target folder" }, { status: 400 });
        }
        const parent = await RepoFolder.findById(target).select("_id clientId").lean();
        if (!parent) return NextResponse.json({ error: "Target folder not found" }, { status: 404 });
        if (!(await canAccessRepoItem(session, (parent as any).clientId))) {
          return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }
        // A folder can't be moved into itself or any of its descendants.
        if (await isDescendantOrSelf(id, target)) {
          return NextResponse.json(
            { error: "Cannot move a folder into itself or one of its subfolders" },
            { status: 400 }
          );
        }
        targetClientId = (parent as any).clientId
          ? new mongoose.Types.ObjectId(String((parent as any).clientId))
          : null;
      }
      folder.parentId = target ? new mongoose.Types.ObjectId(target) : null;
      // Staff moves re-scope the folder (and its whole subtree) to the
      // destination's client; a client's folders stay in their own scope.
      if (session.role !== "client" && String(folder.clientId ?? "") !== String(targetClientId ?? "")) {
        folder.clientId = targetClientId;
        rescopeTo = targetClientId;
      }
    }

    try {
      await folder.save();
    } catch (err: any) {
      if (err?.code === 11000) {
        return NextResponse.json(
          { error: "A folder with that name already exists in the destination" },
          { status: 409 }
        );
      }
      throw err;
    }

    // Cascade the new scope to every descendant folder and file so a client's
    // visibility stays consistent across the whole moved subtree.
    if (rescopeTo !== undefined) {
      const descendantIds = await collectDescendantFolderIds(id);
      await Promise.all([
        RepoFolder.updateMany({ _id: { $in: descendantIds } }, { clientId: rescopeTo }),
        RepoFile.updateMany({ folderId: { $in: descendantIds } }, { clientId: rescopeTo }),
      ]);
    }

    return NextResponse.json(serializeFolder(folder.toObject()));
  } catch (err: any) {
    console.error("[repository/folders PATCH]", err);
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}

// DELETE /api/repository/folders/[id]?recursive=1
// Without recursive: refuses to delete a non-empty folder (409 + counts).
// With recursive: deletes the whole subtree — folders, files, and stored bytes.
export async function DELETE(req: NextRequest, { params }: Ctx) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!canManageRepository(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid folder id" }, { status: 400 });
    }

    const recursive = new URL(req.url).searchParams.get("recursive") === "1";
    await connectDB();

    const folder = await RepoFolder.findById(id).lean();
    if (!folder) return NextResponse.json({ message: "Already deleted", deleted: false });
    if (!(await canAccessRepoItem(session, (folder as any).clientId))) {
      return NextResponse.json({ error: "Folder not found" }, { status: 404 });
    }

    const [subfolderCount, fileCount] = await Promise.all([
      RepoFolder.countDocuments({ parentId: id }),
      RepoFile.countDocuments({ folderId: id }),
    ]);

    if (!recursive && (subfolderCount > 0 || fileCount > 0)) {
      return NextResponse.json(
        {
          error: "Folder is not empty",
          notEmpty: true,
          subfolderCount,
          fileCount,
        },
        { status: 409 }
      );
    }

    // Gather the whole subtree, remove all stored files, then the records.
    const folderIds = recursive ? await collectDescendantFolderIds(id) : [id];
    const files = await RepoFile.find({ folderId: { $in: folderIds } })
      .select("storageKey")
      .lean();

    for (const f of files) {
      await deleteRepoFile((f as any).storageKey);
    }
    await RepoFile.deleteMany({ folderId: { $in: folderIds } });
    await RepoFolder.deleteMany({ _id: { $in: folderIds } });

    return NextResponse.json({
      message: "Folder deleted",
      deleted: true,
      foldersRemoved: folderIds.length,
      filesRemoved: files.length,
    });
  } catch (err: any) {
    console.error("[repository/folders DELETE]", err);
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}
