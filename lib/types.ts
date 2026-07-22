// Core domain types for CreativeOS V2.
// These are typed in a way that maps 1:1 to a future relational DB schema.

export type ModuleKey =
  | "social"
  | "paid"
  | "seo"
  | "email"
  | "whatsapp"
  | "website"
  | "orm"
  | "influencer"
  | "video"
  | "design"
  | "custom";

export interface ModuleMeta {
  key: ModuleKey;
  label: string;
  /** Tailwind utility prefix for the module's accent color. Driven by CSS vars (no raw hex). */
  tone: "social" | "paid" | "seo" | "email" | "website" | "orm" | "influencer" | "video" | "design" | "custom";
  description: string;
}

export const MODULES: ModuleMeta[] = [
  { key: "social", label: "Social Media", tone: "social", description: "Posts, reels, stories, community" },
  { key: "paid", label: "Paid Media", tone: "paid", description: "Ads on Meta, Google, LinkedIn" },
  { key: "seo", label: "SEO", tone: "seo", description: "Blogs, landing pages, backlinks" },
  { key: "email", label: "Email Marketing", tone: "email", description: "Campaigns, newsletters, drips" },
  { key: "whatsapp", label: "WhatsApp Marketing", tone: "email", description: "Broadcasts, flows, automations" },
  { key: "website", label: "Website", tone: "website", description: "Pages, updates, hosting" },
  { key: "orm", label: "ORM", tone: "orm", description: "Reviews & reputation management" },
  { key: "influencer", label: "Influencer", tone: "influencer", description: "Creator partnerships" },
  { key: "video", label: "Video", tone: "video", description: "Shoots, edits, motion" },
  { key: "design", label: "Design", tone: "design", description: "Branding, collateral" },
  { key: "custom", label: "Custom", tone: "custom", description: "Bespoke service line" },
];

export const moduleByKey = (key: ModuleKey) => MODULES.find((m) => m.key === key)!;

// ---------- Scope ----------

export interface ScopeItem {
  id: string;
  module: ModuleKey;
  label: string;
  unit?: string;
  allocatedBudget?: string;
  delivered: number;
}

export const DEFAULT_SCOPE_TEMPLATES: Record<ModuleKey, { label: string; unit?: string }[]> = {
  social: [
    { label: "Posts per month", unit: "12" },
    { label: "Reels per month", unit: "4" },
    { label: "Stories per month", unit: "20" },
    { label: "Community management", unit: "20" },
    { label: "Monthly reports", unit: "1" },
  ],
  seo: [
    { label: "Blogs per month", unit: "4" },
    { label: "Landing pages", unit: "2" },
    { label: "Backlinks", unit: "10" },
    { label: "Technical audits", unit: "1" },
  ],
  email: [
    { label: "Campaigns per month", unit: "4" },
    { label: "Newsletters", unit: "2" },
    { label: "Automation flows", unit: "1" },
    { label: "Drip sequences", unit: "1" },
  ],
  whatsapp: [
    { label: "Broadcasts per month", unit: "4" },
    { label: "Promotional messages", unit: "2" },
    { label: "Automation flows", unit: "1" },
  ],
  paid: [
    { label: "Campaigns", unit: "3" },
    { label: "Ad sets", unit: "9" },
    { label: "Creatives", unit: "18" },
    { label: "Landing pages", unit: "2" },
  ],
  website: [
    { label: "Page updates", unit: "4" },
    { label: "New pages", unit: "1" },
    { label: "Performance audits", unit: "1" },
  ],
  orm: [
    { label: "Reviews monitored", unit: "50" },
    { label: "Responses drafted", unit: "30" },
  ],
  influencer: [
    { label: "Creator partnerships", unit: "3" },
    { label: "Campaigns", unit: "1" },
  ],
  video: [
    { label: "Short-form videos", unit: "6" },
    { label: "Long-form videos", unit: "1" },
  ],
  design: [
    { label: "Static creatives", unit: "12" },
    { label: "Brand collaterals", unit: "4" },
  ],
  custom: [],
};

// ---------- Credentials ----------

export type CredentialCategory =
  | "social"
  | "website"
  | "email_tools"
  | "ads"
  | "analytics"
  | "custom";

export interface CredentialField {
  key: string;
  label: string;
  type: "text" | "password" | "url" | "email" | "textarea";
}

export interface CredentialEntry {
  id: string;
  category: CredentialCategory;
  label: string;
  values: Record<string, string>;
  notes?: string;
}

// ---------- Client ----------

export interface Client {
  id: string;
  name: string;
  brandName: string;
  industry: string;
  website: string;
  primaryContact: string;
  contactEmail: string;
  contactPhone: string;
  contractStart: string;
  contractEnd: string;
  activeModules: ModuleKey[];
  scope: ScopeItem[];
  credentials: CredentialEntry[];
}

// ---------- Statuses ----------

export type TaskStatus = "Open" | "In Progress" | "Internal Review" | "Client Review" | "Approved";
export type ContentStatus = "Draft" | "Approved" | "Scheduled" | "Published";

export const TASK_STATUSES: TaskStatus[] = ["Open", "In Progress", "Internal Review", "Client Review", "Approved"];
export const CONTENT_STATUSES: ContentStatus[] = ["Draft", "Approved", "Scheduled", "Published"];

// ---------- Calendar items (polymorphic) ----------

export type CalendarItemType =
  | "social_post"
  | "social_reel"
  | "social_story"
  | "email_campaign"
  | "email_newsletter"
  | "email_automation"
  | "paid_ad"
  | "paid_launch"
  | "seo_blog"
  | "seo_landing"
  | "seo_article"
  | "website_page"
  | "website_update";

export interface SocialPayload {
  platform: "Instagram" | "Facebook" | "LinkedIn" | "Twitter / X" | "YouTube" | "Pinterest" | "TikTok";
  caption: string;
  hashtags: string;
  bucket?: string;
  mediaType: "Static" | "Carousel" | "Reel" | "Story" | "Video";
  mediaUrl?: string;
}

export interface EmailPayload {
  segment: string;
  subjectLines: string[];
  previewText: string;
  body: string;
  ctaLabel: string;
  ctaUrl: string;
  fromName: string;
  fromEmail: string;
}

export interface PaidPayload {
  platform: "Meta Ads" | "Google Ads" | "LinkedIn Ads";
  funnelStage: "TOF" | "MOF" | "BOF";
  primaryText: string;
  headline: string;
  description: string;
  cta: string;
  landingUrl: string;
  creativeUrl?: string;
}

export interface SeoPayload {
  targetKeyword: string;
  secondaryKeywords: string[];
  intent: "Informational" | "Commercial" | "Transactional" | "Navigational";
  title: string;
  metaTitle: string;
  metaDescription: string;
  body: string;
  internalLinks: string[];
  externalLinks: string[];
}

export interface WebsitePayload {
  pageUrl: string;
  changeSummary: string;
}

export type CalendarPayload =
  | { kind: "social"; data: SocialPayload }
  | { kind: "email"; data: EmailPayload }
  | { kind: "paid"; data: PaidPayload }
  | { kind: "seo"; data: SeoPayload }
  | { kind: "website"; data: WebsitePayload };

export interface CalendarItem {
  id: string;
  clientId: string;
  module: ModuleKey;
  type: CalendarItemType;
  title: string;
  assignee: string;
  date: string; // ISO yyyy-mm-dd
  time: string; // HH:mm
  taskStatus: TaskStatus;
  contentStatus: ContentStatus;
  payload: CalendarPayload;
  feedback?: { author: string; at: string; text: string }[];
}

export const CONTENT_TYPE_LABEL: Record<CalendarItemType, string> = {
  social_post: "Social Post",
  social_reel: "Reel",
  social_story: "Story",
  email_campaign: "Email Campaign",
  email_newsletter: "Newsletter",
  email_automation: "Automation Email",
  paid_ad: "Ad Creative",
  paid_launch: "Campaign Launch",
  seo_blog: "Blog Article",
  seo_landing: "Landing Page",
  seo_article: "Article",
  website_page: "Website Page",
  website_update: "Website Update",
};

export const TYPE_TO_MODULE: Record<CalendarItemType, ModuleKey> = {
  social_post: "social",
  social_reel: "social",
  social_story: "social",
  email_campaign: "email",
  email_newsletter: "email",
  email_automation: "email",
  paid_ad: "paid",
  paid_launch: "paid",
  seo_blog: "seo",
  seo_landing: "seo",
  seo_article: "seo",
  website_page: "website",
  website_update: "website",
};
