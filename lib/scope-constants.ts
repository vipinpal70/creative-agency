// lib/scope-constants.ts — browser-safe scope-of-work vocabulary shared across
// the onboarding wizard and the client scope editors (no mongoose imports).

export interface DeliverableOption {
  value: string; // stored on the scope item's `label`
  label: string; // human-facing text shown in the dropdown
}

// Social media deliverable types. The `value` doubles as the stored scope-item
// label and is token-matched against a deliverable's `type` when counting
// delivered work, so renaming the display label is safe for existing records.
export const SOCIAL_DELIVERABLE_OPTIONS: DeliverableOption[] = [
  { value: "reel", label: "Reel" },
  { value: "story", label: "Story" },
  { value: "article/blog", label: "Article / Blog" },
  { value: "static/image", label: "Static / Image" },
  { value: "carousel", label: "Carousel" },
  { value: "video (long format)", label: "Video (Long Format)" },
];
