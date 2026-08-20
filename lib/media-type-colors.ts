// lib/media-type-colors.ts — the single source of truth for how a media type maps
// to a display category and its color, used across the Analytics page.
//
// Media type is free-text in the data (drafts carry strings like "Static",
// "Video / Reel", "article/blog"; deliverables carry free-text scope labels like
// "Reels", "Static Posts"). `classifyMediaType` folds that noise into a small,
// fixed set of categories, each with a prescribed color:
//
//   article/blog → red · carousel → orange · reel → purple ·
//   static/image → yellow · video → blue · (anything else) → gray "other"
//
// Colors were validated with the dataviz palette validator (light & dark):
// worst adjacent CVD ΔE 16.2 (light) / 26.3 (dark), both clear of the ≥12 target.
// Yellow is sub-3:1 on the light surface, so consumers must not rely on color
// alone — always pair with a legend/labels and gaps between fills (the relief
// rule). No mongoose / React imports here on purpose — importable from both the
// API route and client components.

export type MediaCategory =
  | "article"
  | "carousel"
  | "reel"
  | "static"
  | "video"
  | "other";

// Fixed assignment order (categorical hues are assigned in order, never cycled).
export const MEDIA_TYPE_CATEGORIES: MediaCategory[] = [
  "article",
  "carousel",
  "reel",
  "static",
  "video",
  "other",
];

export interface MediaTypeMeta {
  label: string;
  light: string; // hex for the light chart surface
  dark: string; // hex stepped for the dark chart surface
}

export const MEDIA_TYPE_META: Record<MediaCategory, MediaTypeMeta> = {
  article: { label: "Article / Blog", light: "#e34948", dark: "#f78a05" },
  carousel: { label: "Carousel", light: "#eb6834", dark: "#d95926" },
  reel: { label: "Reel", light: "#4a3aa7", dark: "#720ff5" },
  static: { label: "Static / Image", light: "#f5d742", dark: "#deb902" },
  video: { label: "Video", light: "#2a78d6", dark: "#05d3fc" },
  other: { label: "Other", light: "#898781", dark: "#898781" },
};

// Fold a free-text media type into a display category. Order matters: article
// family first (it also catches copy/text/seo, which have no creative), then the
// specific social formats. "reel" is tested before "video" so an ambiguous
// "Video / Reel" resolves to reel per the color spec.
export function classifyMediaType(raw?: string | null): MediaCategory {
  const s = (raw || "").toLowerCase().trim();
  if (!s) return "other";

  if (/article|blog|\bcopy\b|\btext\b|seo/.test(s)) return "article";
  if (/carousel/.test(s)) return "carousel";
  if (/reel/.test(s)) return "reel";
  if (/video|long\s*[- ]?form(at)?/.test(s)) return "video";
  if (/static|image|story|\bgif\b/.test(s)) return "static";

  return "other";
}
