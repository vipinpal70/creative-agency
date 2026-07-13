import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import RepoFolder from "@/lib/models/repo-folder.model";
import { serializeFolder, repoVisibilityFilter } from "@/lib/storage/repository";

// GET /api/repository/folders/tree
// Returns every folder the caller may see (flat, with parentId) so the client
// can render a move target picker / navigation tree. Scoped per client.
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();

    const scope = await repoVisibilityFilter(
      session,
      new URL(req.url).searchParams.get("clientId")
    );
    if (scope === null) return NextResponse.json({ folders: [] });

    const folders = await RepoFolder.find(scope)
      .sort({ name: 1 })
      .collation({ locale: "en", strength: 2 })
      .lean();

    return NextResponse.json({ folders: folders.map(serializeFolder) });
  } catch (err: any) {
    console.error("[repository/folders/tree GET]", err);
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}
