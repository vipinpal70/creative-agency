import type { IChangeField } from "@/lib/models/draft-history.model";

const FIELD_LABELS: Record<string, string> = {
  creativeCopy:  "Creative Copy",
  frames:        "Frames",
  caption:       "Caption",
  hashtags:      "Hashtags",
  publishDate:   "Publish Date",
  publishTime:   "Publish Time",
  status:        "Status",
  notes:         "Notes",
  referenceUrl:  "Reference URL",
  videoType:     "Video Type",
  videoNotes:    "Video Notes",
  imageUrl:      "Image URL",
  videoUrl:      "Video URL",
  thumbnailUrl:  "Thumbnail URL",
  audioUrl:      "Audio URL",
};

function serialise(val: unknown): string {
  if (val === null || val === undefined) return "";
  if (Array.isArray(val))  return JSON.stringify(val);
  if (val instanceof Date) return val.toISOString();
  return String(val);
}

export function computeChanges(
  oldValues: Record<string, unknown>,
  newValues: Record<string, unknown>
): IChangeField[] {
  const changes: IChangeField[] = [];
  for (const [field, label] of Object.entries(FIELD_LABELS)) {
    if (!(field in newValues)) continue;
    const from = serialise(oldValues[field]);
    const to   = serialise(newValues[field]);
    if (from !== to) changes.push({ field, label, from, to });
  }
  return changes;
}
