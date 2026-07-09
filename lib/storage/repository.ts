import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";
import mongoose from "mongoose";
import User from "@/lib/models/user.model";
import RepoFolder from "@/lib/models/repo-folder.model";
import type { IRepoActor } from "@/lib/models/repo-folder.model";
import type { RepoFileCategory } from "@/lib/models/repo-file.model";
import type { JWTPayload } from "@/lib/auth";

// Max upload size accepted by the repository (100 MB).
export const MAX_REPO_FILE_BYTES = 100 * 1024 * 1024;

// Roles permitted to mutate the repository (create/rename/upload/move/delete).
export function canManageRepository(role?: string): boolean {
  return role === "admin" || role === "member";
}

// Physical store lives alongside the existing private `storage/` tree.
function repoRoot(): string {
  return path.join(process.cwd(), "storage", "repository");
}

/** Resolves an actor {userId,name,email} from the session, looking up the name. */
export async function resolveActor(session: JWTPayload): Promise<IRepoActor> {
  let name = session.email;
  try {
    const user = await User.findById(session.userId).select("firstName lastName email").lean();
    if (user) name = `${user.firstName} ${user.lastName || ""}`.trim() || session.email;
  } catch {
    /* fall back to email */
  }
  return { userId: session.userId, name, email: session.email };
}

// ── File-type classification ────────────────────────────────────────────────

const EXT_CATEGORY: Record<string, RepoFileCategory> = {
  // images
  jpg: "image", jpeg: "image", png: "image", gif: "image", webp: "image",
  svg: "image", bmp: "image", heic: "image", avif: "image",
  // video
  mp4: "video", mov: "video", avi: "video", mkv: "video", webm: "video", m4v: "video",
  // audio
  mp3: "audio", wav: "audio", ogg: "audio", m4a: "audio", aac: "audio", flac: "audio",
  // docs
  pdf: "pdf",
  doc: "document", docx: "document", txt: "document", rtf: "document", md: "document", odt: "document",
  xls: "spreadsheet", xlsx: "spreadsheet", csv: "spreadsheet", ods: "spreadsheet",
  ppt: "presentation", pptx: "presentation", odp: "presentation",
  // archives
  zip: "archive", rar: "archive", "7z": "archive", tar: "archive", gz: "archive",
};

export function extensionOf(fileName: string): string {
  const m = /\.([a-z0-9]+)$/i.exec(fileName.trim());
  return m ? m[1].toLowerCase() : "";
}

export function categoryFor(fileName: string, mimeType?: string): RepoFileCategory {
  const ext = extensionOf(fileName);
  if (EXT_CATEGORY[ext]) return EXT_CATEGORY[ext];
  const mime = (mimeType || "").toLowerCase();
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  if (mime === "application/pdf") return "pdf";
  if (mime.includes("spreadsheet") || mime.includes("excel")) return "spreadsheet";
  if (mime.includes("presentation") || mime.includes("powerpoint")) return "presentation";
  if (mime.includes("word") || mime.startsWith("text/")) return "document";
  if (mime.includes("zip") || mime.includes("compressed") || mime.includes("tar")) return "archive";
  return "other";
}

const MIME_BY_EXT: Record<string, string> = {
  pdf: "application/pdf",
  png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif",
  webp: "image/webp", svg: "image/svg+xml",
  mp4: "video/mp4", mov: "video/quicktime", webm: "video/webm",
  mp3: "audio/mpeg", wav: "audio/wav",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  csv: "text/csv", txt: "text/plain", zip: "application/zip",
};

export function mimeForFile(fileName: string, stored?: string): string {
  if (stored && stored !== "application/octet-stream") return stored;
  return MIME_BY_EXT[extensionOf(fileName)] || stored || "application/octet-stream";
}

// ── Physical storage ─────────────────────────────────────────────────────────

/**
 * Writes a file to the repository store under an opaque, collision-proof key.
 * Files are stored flat (keyed by a random id), so moving between folders is a
 * pure DB update — no bytes are ever relocated on disk.
 */
export async function saveRepoFile(file: File): Promise<{ storageKey: string; size: number }> {
  const root = repoRoot();
  await fs.mkdir(root, { recursive: true });

  const ext = extensionOf(file.name);
  const storageKey = `${Date.now()}-${crypto.randomUUID()}${ext ? `.${ext}` : ""}`;
  const abs = path.join(root, storageKey);

  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(abs, buffer);

  return { storageKey, size: buffer.length };
}

/** Absolute on-disk path for a storage key, guarded against path traversal. */
export function resolveRepoFilePath(storageKey: string): string | null {
  const root = repoRoot();
  const abs = path.resolve(root, storageKey);
  if (!abs.startsWith(root)) return null; // traversal attempt
  return abs;
}

/** Deletes a stored file. Idempotent — a missing file is treated as success. */
export async function deleteRepoFile(storageKey: string): Promise<void> {
  const abs = resolveRepoFilePath(storageKey);
  if (!abs) return;
  try {
    await fs.unlink(abs);
  } catch (err: any) {
    if (err?.code !== "ENOENT") {
      console.error(`[repository] failed to delete ${storageKey}:`, err?.message || err);
    }
  }
}

// ── Folder hierarchy helpers ───────────────────────────────────────────────────

export interface Breadcrumb {
  id: string | null;
  name: string;
}

/** Root → current breadcrumb trail for a folder (empty for the root). */
export async function buildBreadcrumbs(
  folderId: string | null
): Promise<Breadcrumb[]> {
  const trail: Breadcrumb[] = [];
  let current = folderId;
  const guard = new Set<string>(); // cycle protection
  while (current) {
    if (guard.has(current)) break;
    guard.add(current);
    const folder = await RepoFolder.findById(current).select("name parentId").lean();
    if (!folder) break;
    trail.unshift({ id: (folder._id as any).toString(), name: folder.name });
    current = folder.parentId ? (folder.parentId as any).toString() : null;
  }
  return trail;
}

/**
 * All descendant folder ids of `folderId` (inclusive), via breadth-first walk.
 * Used to recursively delete a folder subtree.
 */
export async function collectDescendantFolderIds(folderId: string): Promise<string[]> {
  const all: string[] = [folderId];
  let frontier: string[] = [folderId];
  while (frontier.length) {
    const children = await RepoFolder.find({ parentId: { $in: frontier } })
      .select("_id")
      .lean();
    frontier = children.map((c) => (c._id as any).toString());
    all.push(...frontier);
  }
  return all;
}

/**
 * True if `candidateParentId` is `folderId` itself or one of its descendants.
 * Prevents moving a folder into its own subtree (which would orphan the branch).
 */
export async function isDescendantOrSelf(
  folderId: string,
  candidateParentId: string
): Promise<boolean> {
  if (folderId === candidateParentId) return true;
  let current: string | null = candidateParentId;
  const guard = new Set<string>();
  while (current) {
    if (current === folderId) return true;
    if (guard.has(current)) break;
    guard.add(current);
    const folder: { parentId?: any } | null = await RepoFolder.findById(current)
      .select("parentId")
      .lean();
    if (!folder) break;
    current = folder.parentId ? folder.parentId.toString() : null;
  }
  return false;
}

/** Normalizes a folderId query param ("", "root", "null" → null root). */
export function normalizeFolderId(raw: string | null): string | null {
  if (!raw || raw === "root" || raw === "null") return null;
  return mongoose.Types.ObjectId.isValid(raw) ? raw : null;
}

// ── Serializers (flat shapes for the client) ───────────────────────────────────

export function serializeFolder(folder: any) {
  return {
    id: folder._id.toString(),
    kind: "folder" as const,
    name: folder.name,
    parentId: folder.parentId ? folder.parentId.toString() : null,
    createdBy: folder.createdBy ?? null,
    createdAt: folder.createdAt,
    updatedAt: folder.updatedAt,
  };
}

export function serializeFile(file: any) {
  return {
    id: file._id.toString(),
    kind: "file" as const,
    name: file.name,
    folderId: file.folderId ? file.folderId.toString() : null,
    mimeType: file.mimeType,
    ext: file.ext,
    size: file.size,
    category: file.category,
    uploadedBy: file.uploadedBy ?? null,
    uploadedAt: file.createdAt,
    lastModifiedAt: file.lastModifiedAt,
    downloadUrl: `/api/repository/files/${file._id.toString()}/download`,
  };
}
