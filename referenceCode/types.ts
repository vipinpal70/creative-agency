// Core domain types for CreativeOS V2.
// These are typed in a way that maps 1:1 to a future relational DB schema.

export type ModuleKey =
  | "social"
  | "paid"
  | "seo"
  | "email"
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
  { key: "social", label: "Social Media Marketing", tone: "social", description: "Posts, reels, stories, community" },
  { key: "paid", label: "Paid Media", tone: "paid", description: "Ads on Meta, Google, LinkedIn" },
  { key: "seo", label: "SEO", tone: "seo", description: "Blogs, landing pages, backlinks" },
  { key: "email", label: "Email Marketing", tone: "email", description: "Campaigns, newsletters, drips" },
  { key: "website", label: "Website Management", tone: "website", description: "Pages, updates, hosting" },
  { key: "orm", label: "ORM", tone: "orm", description: "Reviews & reputation management" },
  { key: "influencer", label: "Influencer Marketing", tone: "influencer", description: "Creator partnerships" },
  { key: "video", label: "Video Production", tone: "video", description: "Shoots, edits, motion" },
  { key: "design", label: "Creative Design", tone: "design", description: "Branding, collateral" },
  { key: "custom", label: "Custom Module", tone: "custom", description: "Bespoke service line" },
];

export const moduleByKey = (key: ModuleKey) => MODULES.find((m) => m.key === key)!;

// ---------- Scope ----------

export interface ScopeItem {
  id: string;
  module: ModuleKey;
  /** Free-text label, e.g. "Posts per month". */
  label: string;
  unit?: string;
  committed: number;
  delivered: number;
}

export const DEFAULT_SCOPE_TEMPLATES: Record<ModuleKey, { label: string; unit?: string; committed: number }[]> = {
  social: [
    { label: "Posts per month", committed: 12 },
    { label: "Reels per month", committed: 4 },
    { label: "Stories per month", committed: 20 },
    { label: "Community management", unit: "hrs", committed: 20 },
    { label: "Monthly reports", committed: 1 },
  ],
  seo: [
    { label: "Blogs per month", committed: 4 },
    { label: "Landing pages", committed: 2 },
    { label: "Backlinks", committed: 10 },
    { label: "Technical audits", committed: 1 },
  ],
  email: [
    { label: "Campaigns per month", committed: 4 },
    { label: "Newsletters", committed: 2 },
    { label: "Automation flows", committed: 1 },
    { label: "Drip sequences", committed: 1 },
  ],
  paid: [
    { label: "Campaigns", committed: 3 },
    { label: "Ad sets", committed: 9 },
    { label: "Creatives", committed: 18 },
    { label: "Landing pages", committed: 2 },
  ],
  website: [
    { label: "Page updates", committed: 4 },
    { label: "New pages", committed: 1 },
    { label: "Performance audits", committed: 1 },
  ],
  orm: [
    { label: "Reviews monitored", committed: 50 },
    { label: "Responses drafted", committed: 30 },
  ],
  influencer: [
    { label: "Creator partnerships", committed: 3 },
    { label: "Campaigns", committed: 1 },
  ],
  video: [
    { label: "Short-form videos", committed: 6 },
    { label: "Long-form videos", committed: 1 },
  ],
  design: [
    { label: "Static creatives", committed: 12 },
    { label: "Brand collaterals", committed: 4 },
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
  /** e.g. "Instagram", "Mailchimp", "Hostinger" */
  label: string;
  values: Record<string, string>;
  notes?: string;
}

export const CREDENTIAL_CATEGORIES: { key: CredentialCategory; label: string; fields: CredentialField[] }[] = [
  {
    key: "social",
    label: "Social Platforms",
    fields: [
      { key: "platform", label: "Platform", type: "text" },
      { key: "profileUrl", label: "Profile URL", type: "url" },
      { key: "username", label: "Username", type: "text" },
      { key: "email", label: "Email", type: "email" },
      { key: "password", label: "Password", type: "password" },
      { key: "notes", label: "Notes", type: "textarea" },
    ],
  },
  {
    key: "website",
    label: "Website & Hosting",
    fields: [
      { key: "websiteUrl", label: "Website URL", type: "url" },
      { key: "cmsLogin", label: "CMS Login", type: "text" },
      { key: "cmsPassword", label: "CMS Password", type: "password" },
      { key: "hostingLogin", label: "Hosting Login", type: "text" },
      { key: "hostingPassword", label: "Hosting Password", type: "password" },
      { key: "serverLogin", label: "Server Login", type: "text" },
      { key: "domainProvider", label: "Domain Provider", type: "text" },
    ],
  },
  {
    key: "email_tools",
    label: "Email Marketing Tools",
    fields: [
      { key: "tool", label: "Tool Name", type: "text" },
      { key: "loginUrl", label: "Login URL", type: "url" },
      { key: "username", label: "Username", type: "text" },
      { key: "password", label: "Password", type: "password" },
    ],
  },
  {
    key: "ads",
    label: "Ad Platforms",
    fields: [
      { key: "platform", label: "Platform", type: "text" },
      { key: "accountId", label: "Account ID", type: "text" },
      { key: "loginEmail", label: "Login Email", type: "email" },
      { key: "password", label: "Password", type: "password" },
      { key: "notes", label: "Notes", type: "textarea" },
    ],
  },
  {
    key: "analytics",
    label: "Analytics",
    fields: [
      { key: "tool", label: "Tool Name", type: "text" },
      { key: "loginUrl", label: "Login URL", type: "url" },
      { key: "username", label: "Username", type: "text" },
      { key: "password", label: "Password", type: "password" },
    ],
  },
  {
    key: "custom",
    label: "Custom",
    fields: [
      { key: "tool", label: "Tool / Asset", type: "text" },
      { key: "loginUrl", label: "Login URL", type: "url" },
      { key: "username", label: "Username", type: "text" },
      { key: "password", label: "Password", type: "password" },
      { key: "notes", label: "Notes", type: "textarea" },
    ],
  },
];

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
