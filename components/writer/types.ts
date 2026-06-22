export interface ContentBucket {
  id: string;
  name: string;
  description: string;
}

export interface CopyEntry {
  id: string;
  creativeCopy: string;
  caption: string;
  hashtags: string;
  publishDate: string;
  publishTime: string;
  contentBucketId: string;
  platform: string;
  mediaType: string;
  status: "Draft" | "Internal Review" | "Client Review" | "Approved";
}

export interface CalendarData {
  objective: string;
  buckets: ContentBucket[];
  copies: CopyEntry[];
}

export const MEDIA_TYPES = [
  "Text",
  "Static",
  "Carousel",
  "Video / Reel",
  "GIF",
  "Long Format",
] as const;

export const PLATFORMS = [
  "Instagram",
  "Facebook",
  "LinkedIn",
  "Twitter / X",
  "YouTube",
  "Pinterest",
  "TikTok",
  "Google Ads",
  "Meta Ads",
  "Email",
  "Blog",
  "Blog Article",
] as const;
