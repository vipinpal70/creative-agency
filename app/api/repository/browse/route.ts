import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import RepoFolder from "@/lib/models/repo-folder.model";
import RepoFile from "@/lib/models/repo-file.model";
import {
  buildBreadcrumbs,
  normalizeFolderId,
  serializeFolder,
  serializeFile,
  canManageRepository,
  repoVisibilityFilter,
  canAccessRepoItem,
} from "@/lib/storage/repository";

type SortKey = "name" | "created" | "modified" | "size";

// GET /api/repository/browse
//   ?folderId=<id|root>     folder to list (default root)
//   &q=<text>               global search (ignores folderId, searches everywhere)
//   &sort=name|created|modified|size   (default name)
//   &dir=asc|desc           (default asc)
//   &type=<category>        filter files by category (image/video/pdf/…)
// Returns the current folder's breadcrumbs, subfolders and files.
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();

    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();
    let folderId = normalizeFolderId(searchParams.get("folderId"));
    const type = (searchParams.get("type") || "").trim();
    const sort = (searchParams.get("sort") || "name") as SortKey;
    const dir = searchParams.get("dir") === "desc" ? -1 : 1;

    // Per-client visibility. `null` means a client with no linked Client record,
    // so they see an empty repository.
    const scope = await repoVisibilityFilter(session, searchParams.get("clientId"));
    if (scope === null) {
      return NextResponse.json({
        folderId: null, breadcrumbs: [], folders: [], files: [],
        canManage: canManageRepository(session.role), searching: false,
      });
    }

    // A client opening a folder they don't own is bounced to their own root
    // (prevents enumerating another client's folder names via breadcrumbs).
    if (folderId) {
      const current = await RepoFolder.findById(folderId).select("clientId").lean();
      if (!current || !(await canAccessRepoItem(session, (current as any).clientId))) {
        folderId = null;
      }
    }

    const searching = q.length > 0;

    // Folder sort maps only where meaningful; folders have no size.
    const folderSort: Record<string, 1 | -1> =
      sort === "created" ? { createdAt: dir } :
      sort === "modified" ? { updatedAt: dir } :
      { name: dir };
    const fileSort: Record<string, 1 | -1> =
      sort === "created" ? { createdAt: dir } :
      sort === "modified" ? { lastModifiedAt: dir } :
      sort === "size" ? { size: dir } :
      { name: dir };

    const folderFilter: Record<string, any> = { ...scope };
    const fileFilter: Record<string, any> = { ...scope };

    if (searching) {
      const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      folderFilter.name = rx;
      fileFilter.name = rx;
    } else {
      folderFilter.parentId = folderId;
      fileFilter.folderId = folderId;
    }
    if (type) fileFilter.category = type;

    // When filtering by file type, folders are not relevant to the result set.
    const [folders, files, breadcrumbs] = await Promise.all([
      type ? [] : RepoFolder.find(folderFilter).sort(folderSort).collation({ locale: "en", strength: 2 }).lean(),
      RepoFile.find(fileFilter).sort(fileSort).collation({ locale: "en", strength: 2 }).lean(),
      searching ? Promise.resolve([]) : buildBreadcrumbs(folderId),
    ]);

    return NextResponse.json({
      folderId,
      breadcrumbs,
      folders: (folders as any[]).map(serializeFolder),
      files: (files as any[]).map(serializeFile),
      canManage: canManageRepository(session.role),
      searching,
    });
  } catch (err: any) {
    console.error("[repository/browse GET]", err);
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}
