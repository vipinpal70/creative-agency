import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import fs from "fs";
import path from "path";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const relativePath = searchParams.get("path");
    if (!relativePath) {
      return NextResponse.json({ error: "Path parameter is required" }, { status: 400 });
    }

    // Resolve absolute path and protect against directory traversal
    const storageRoot = path.join(process.cwd(), "storage");
    const absolutePath = path.resolve(storageRoot, relativePath);

    if (!absolutePath.startsWith(storageRoot)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    if (!fs.existsSync(absolutePath)) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const fileBuffer = fs.readFileSync(absolutePath);
    const fileName = path.basename(absolutePath);

    // Get mime type based on extension
    const ext = fileName.split(".").pop()?.toLowerCase() || "";
    let mimeType = "application/octet-stream";
    if (ext === "pdf") mimeType = "application/pdf";
    else if (ext === "png") mimeType = "image/png";
    else if (ext === "jpg" || ext === "jpeg") mimeType = "image/jpeg";
    else if (ext === "doc") mimeType = "application/msword";
    else if (ext === "docx") mimeType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    else if (ext === "xls") mimeType = "application/vnd.ms-excel";
    else if (ext === "xlsx") mimeType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

    const response = new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Disposition": `attachment; filename="${encodeURIComponent(fileName)}"`,
        "Content-Type": mimeType,
      },
    });

    return response;
  } catch (err: any) {
    console.error("[Document download error]", err);
    return NextResponse.json({ error: err.message || "Download failed" }, { status: 500 });
  }
}
