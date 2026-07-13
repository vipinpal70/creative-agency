import { promises as fs } from "fs";
import path from "path";
import { connectDB } from "@/lib/db";
import ContentDraft from "@/lib/models/content-draft.model";
import CreativeUpload from "@/lib/models/creative-uploads";
import Client from "@/lib/models/client.model";
import DraftHistory from "@/lib/models/draft-history.model";
import Deliverable from "@/lib/models/deliverable.model";

// How long an archived copy is retained before it is permanently deleted.
export const ARCHIVE_RETENTION_DAYS = 14;

/** Milliseconds in the retention window. */
export const ARCHIVE_RETENTION_MS = ARCHIVE_RETENTION_DAYS * 24 * 60 * 60 * 1000;

/** Date at which a copy archived at `archivedAt` becomes eligible for deletion. */
export function archiveExpiryDate(archivedAt: Date | string): Date {
  return new Date(new Date(archivedAt).getTime() + ARCHIVE_RETENTION_MS);
}

// Every file URL a draft may reference. Frames each carry their own image.
export function collectDraftFileUrls(draft: {
  imageUrl?: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  audioUrl?: string;
  frames?: { imageUrl?: string }[];
}): string[] {
  const urls = [
    draft.imageUrl,
    draft.videoUrl,
    draft.thumbnailUrl,
    draft.audioUrl,
    ...(draft.frames ?? []).map((f) => f?.imageUrl),
  ].filter((u): u is string => typeof u === "string" && u.trim().length > 0);

  // Dedupe — the same asset can be referenced by more than one field.
  return Array.from(new Set(urls));
}

// Only ever remove files that live under public/uploads, so a malformed or
// external URL can never point the unlink at something outside the store.
function resolveLocalUploadPath(fileUrl: string): string | null {
  if (!fileUrl.startsWith("/uploads/")) return null;
  const rel = fileUrl.replace(/^\/+/, "");
  const abs = path.join(process.cwd(), "public", rel);
  const uploadsRoot = path.join(process.cwd(), "public", "uploads");
  // Guard against path traversal via "../" segments in the URL.
  if (!abs.startsWith(uploadsRoot)) return null;
  return abs;
}

async function unlinkIfExists(filePath: string): Promise<void> {
  try {
    await fs.unlink(filePath);
  } catch (err: any) {
    // Missing file is fine — deletion is idempotent.
    if (err?.code !== "ENOENT") {
      console.error(`[copy-cleanup] failed to unlink ${filePath}:`, err?.message || err);
    }
  }
}

/**
 * Deletes every stored file a draft references, along with the CreativeUpload
 * record and the matching Client.documents entry. Safe to call more than once;
 * missing files/records are ignored.
 */
export async function deleteDraftFiles(draft: {
  imageUrl?: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  audioUrl?: string;
  frames?: { imageUrl?: string }[];
}): Promise<{ filesRemoved: number }> {
  const urls = collectDraftFileUrls(draft);
  let filesRemoved = 0;

  for (const fileUrl of urls) {
    try {
      // Prefer the tracked record: it has the authoritative absolute path and
      // links the asset to a client document we must also clean up.
      const uploads = await CreativeUpload.find({ fileUrl });

      if (uploads.length > 0) {
        for (const upload of uploads) {
          const target = upload.filePath || resolveLocalUploadPath(fileUrl);
          if (target) await unlinkIfExists(target);
          await Client.updateOne(
            { _id: upload.clientId },
            { $pull: { documents: { id: (upload._id as any).toString() } } }
          );
          await CreativeUpload.deleteOne({ _id: upload._id });
          filesRemoved += 1;
        }
      } else {
        // No tracked record — fall back to removing the file by its URL path.
        const target = resolveLocalUploadPath(fileUrl);
        if (target) {
          await unlinkIfExists(target);
          filesRemoved += 1;
        }
      }
    } catch (err: any) {
      // Never let one bad asset abort the rest of the cleanup.
      console.error(`[copy-cleanup] error removing ${fileUrl}:`, err?.message || err);
    }
  }

  return { filesRemoved };
}

/**
 * Permanently removes a copy: its files, its history records, and the draft
 * document itself. Idempotent and resilient to already-deleted records.
 *
 * @param draftInput  A draft document/lean object, or a draft id to look up.
 */
export async function purgeDraft(
  draftInput: string | { _id: any } & Record<string, any>
): Promise<{ deleted: boolean; filesRemoved: number }> {
  await connectDB();

  const draft =
    typeof draftInput === "string"
      ? await ContentDraft.findById(draftInput).lean()
      : draftInput;

  if (!draft) return { deleted: false, filesRemoved: 0 };

  const { filesRemoved } = await deleteDraftFiles(draft as any);

  // Remove linked metadata so no orphaned history remains.
  await DraftHistory.deleteMany({ draftId: (draft as any)._id });

  const res = await ContentDraft.deleteOne({ _id: (draft as any)._id });

  // Delete the associated Deliverable to remove it from the content calendar.
  if (draft.deliverableId) {
    await Deliverable.deleteOne({ _id: draft.deliverableId });

    // Also clean up any other drafts (versions) of this same deliverable.
    const otherDrafts = await ContentDraft.find({
      deliverableId: draft.deliverableId,
      _id: { $ne: (draft as any)._id }
    }).lean();

    for (const d of otherDrafts) {
      await deleteDraftFiles(d as any);
      await DraftHistory.deleteMany({ draftId: d._id });
      await ContentDraft.deleteOne({ _id: d._id });
    }
  }

  return { deleted: res.deletedCount > 0, filesRemoved };
}

/**
 * Permanently deletes every archived copy whose retention window has elapsed.
 * Processes each independently so one failure can't block the batch. Returns a
 * summary suitable for logging from a cron/manual trigger.
 */
export async function purgeExpiredArchived(now: Date = new Date()): Promise<{
  scanned: number;
  purged: number;
  filesRemoved: number;
  errors: number;
}> {
  await connectDB();

  const cutoff = new Date(now.getTime() - ARCHIVE_RETENTION_MS);
  const expired = await ContentDraft.find({
    archivedAt: { $ne: null, $lte: cutoff },
  })
    .select("_id imageUrl videoUrl thumbnailUrl audioUrl frames")
    .lean();

  let purged = 0;
  let filesRemoved = 0;
  let errors = 0;

  for (const draft of expired) {
    try {
      const res = await purgeDraft(draft as any);
      if (res.deleted) purged += 1;
      filesRemoved += res.filesRemoved;
    } catch (err: any) {
      errors += 1;
      console.error(
        `[copy-cleanup] failed to purge archived draft ${(draft as any)._id}:`,
        err?.message || err
      );
    }
  }

  return { scanned: expired.length, purged, filesRemoved, errors };
}
