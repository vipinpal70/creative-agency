import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import mongoose from "mongoose";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import RepoFile from "@/lib/models/repo-file.model";
import { resolveRepoFilePath, mimeForFile } from "@/lib/storage/repository";

type Ctx = { params: Promise<{ id: string }> };

// GET /api/repository/files/[id]/download[?inline=1]
// Streams the stored bytes. Any authenticated user may download.
export async function GET(req: NextRequest, { params }: Ctx) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid file id" }, { status: 400 });
    }

    await connectDB();

    const file = await RepoFile.findById(id).lean();
    if (!file) return NextResponse.json({ error: "File not found" }, { status: 404 });

    const abs = resolveRepoFilePath((file as any).storageKey);
    if (!abs) return NextResponse.json({ error: "Access denied" }, { status: 403 });

    let buffer: Buffer;
    try {
      buffer = await fs.readFile(abs);
    } catch {
      return NextResponse.json({ error: "File is missing from storage" }, { status: 404 });
    }

    const inline = new URL(req.url).searchParams.get("inline") === "1";
    const name = (file as any).name as string;
    const disposition = inline ? "inline" : "attachment";

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": mimeForFile(name, (file as any).mimeType),
        "Content-Disposition": `${disposition}; filename*=UTF-8''${encodeURIComponent(name)}`,
        "Content-Length": String(buffer.length),
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err: any) {
    console.error("[repository/files download GET]", err);
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}
