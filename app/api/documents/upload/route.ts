import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { assertClientAccess, notFound } from "@/lib/authz";
import { connectDB } from "@/lib/db";
import Client from "@/lib/models/client.model";
import fs from "fs";
import path from "path";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get("clientId");
    if (!clientId) {
      return NextResponse.json({ error: "Client ID is required" }, { status: 400 });
    }
    // Owner-scoped: staff any client, a client only their own.
    if (!(await assertClientAccess(session, clientId))) return notFound("Client not found");

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Check extension
    const allowedExtensions = ["pdf", "doc", "docx", "xls", "xlsx", "jpeg", "jpg", "png"];
    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    if (!allowedExtensions.includes(ext)) {
      return NextResponse.json(
        { error: `File type not allowed. Allowed types: ${allowedExtensions.join(", ")}` },
        { status: 400 }
      );
    }

    await connectDB();
    const client = await Client.findById(clientId);
    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    // Folder structure: document/client_name/document_name.pdf
    const cleanClientName = client.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/(^_+|_+$)/g, "");

    const relativeFolder = path.join("document", cleanClientName);
    const relativePath = path.join(relativeFolder, file.name);

    // Absolute path on server
    const storageRoot = path.join(process.cwd(), "storage");
    const absoluteFolder = path.join(storageRoot, relativeFolder);
    const absolutePath = path.join(storageRoot, relativePath);

    // Create folder if it doesn't exist
    if (!fs.existsSync(absoluteFolder)) {
      fs.mkdirSync(absoluteFolder, { recursive: true });
    }

    // Save file
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    fs.writeFileSync(absolutePath, buffer);

    // Create the document entry
    const docId = crypto.randomUUID();
    const fileUrl = `/api/documents/download?path=${encodeURIComponent(relativePath)}`;

    const newDoc = {
      id: docId,
      name: file.name,
      fileUrl: fileUrl,
      filePath: relativePath,
      fileSize: file.size,
      uploadedAt: new Date(),
      uploadedBy: session.email || session.userId || "Unknown",
    };

    // Save to Mongoose client
    client.documents = client.documents || [];
    client.documents.push(newDoc);
    await client.save();

    return NextResponse.json({
      message: "File uploaded successfully",
      document: newDoc,
    });
  } catch (err: any) {
    console.error("[Document upload error]", err);
    return NextResponse.json({ error: err.message || "Upload failed" }, { status: 500 });
  }
}
