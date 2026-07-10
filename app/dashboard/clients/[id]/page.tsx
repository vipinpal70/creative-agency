"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import {
  ArrowLeft, Users, Settings, Shield, FileText, Plus, Trash2,
  ExternalLink, Eye, EyeOff, Copy, PlusCircle, FolderOpen,
  MessageSquare, ClipboardList, FileDown, Globe, Award, UserCheck,
  Save, ChevronDown, ChevronUp, Calendar as CalendarIcon,
  ShieldAlert, KeyRound, Check, AlertCircle, X,
} from "lucide-react";

import instagram from "@/app/assets/instagram.png";
import facebook from "@/app/assets/facebook.png";
import linkedin from "@/app/assets/linkedin.png";
import twitter from "@/app/assets/twitter.png";
import youtube from "@/app/assets/youtube.png";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Competitor { name: string; websiteLink: string; socialMediaLink?: string }
interface SocialPresence { platform: string; link: string }
type CredentialCategory = "social" | "website" | "email_tools" | "ads" | "analytics" | "custom";
interface CredentialField { key: string; label: string; type: "text" | "password" | "url" | "email" | "textarea" }
interface Credential { id: string; category: CredentialCategory; label: string; values: Record<string, string> }
interface DocumentItem {
  id: string;
  name: string;
  fileUrl: string;
  filePath: string;
  fileSize: number;
  uploadedAt: string;
  uploadedBy: string;
}
interface MeetingLog { id: string; title: string; notes: string; date: string; loggedBy: string }
interface AssignedTeamUser { _id: string; firstName: string; lastName: string; name: string; email: string; roles: string[]; avatarColor: string }

interface SowScope {
  socialMedia?: {
    instagram?: { reels: number; posts: number; stories: number; custom?: number };
    facebook?: { staticCount: number; reels: number; posts: number; stories: number };
    youtube?: { staticCount: number; reels: number; posts: number; stories: number };
    linkedin?: { posts: number };
    x?: { posts: number };
  };
  paidMedia?: {
    metaAds?: { adSpend: number; creatives: number; commission?: number };
    googleAds?: { adSpend: number; creatives: number; commission?: number };
    linkedinAds?: { adSpend: number; creatives: number; commission?: number };
  };
  emailWhatsapp?: {
    transactional?: { enabled: boolean; triggers: number };
    promotional?: { enabled: boolean; emails: number };
  };
  seo?: {
    keywords?: string[];
    totalKeywords?: number;
    onPage?: boolean;
    gaAccess?: { type: "login" | "email" | "none"; details?: string };
    gtmAccess?: { type: "login" | "email" | "none"; details?: string };
    gscAccess?: { type: "login" | "email" | "none"; details?: string };
    auditSheetLink?: string;
    docLink?: string;
  };
  influencer?: { influencersCount?: number; commission?: number; budget?: number };
}

interface ClientDetail {
  id: string; name: string; brandName: string; industry: string; website: string;
  status: "active" | "inactive"; contractStart: string; contractEnd: string;
  clientPortalPassword?: string;
  primaryContact: { name: string; email: string; phone: string };
  aboutBrand?: string; requirementNotes?: string;
  competitors: Competitor[]; socialMediaPresence: SocialPresence[];
  assignedTeam: AssignedTeamUser[]; credentials: Credential[];
  documents: DocumentItem[]; meetingLogs: MeetingLog[];
  scope?: SowScope;
}

interface Deliverable {
  id: string; title: string; module: string; type: string;
  platforms: string[]; status: string; scheduledDate: string;
  deliveredAt?: string | null; publishedUrl?: string; notes?: string;
  statusTimeline?: {
    writerTimeline?: { status: string; timestamp: string }[];
    designerTimeline?: { status: string; timestamp: string }[];
  };
}

interface TaskRequest {
  id: string; title: string; description: string;
  status: "pending" | "approved" | "rejected" | "in-progress" | "completed";
  dueDate?: string;
  requestedBy: { _id: string; firstName: string; lastName: string; name?: string; email: string; roles?: string[] };
  createdAt: string;
}

interface ScopeRecord {
  id: string; period?: string; label?: string; isActive?: boolean;
  createdAt: string; socialMedia?: any; paidMedia?: any;
  emailWhatsapp?: any; seo?: any; influencer?: any;
  items?: any[];
}

// ─── Module metadata ──────────────────────────────────────────────────────────

const SCOPE_MODULES = [
  { key: "social", label: "Social Media", dot: "bg-emerald-500", bar: "bg-emerald-500" },
  { key: "paid-ads", label: "Paid Advertising", dot: "bg-indigo-500", bar: "bg-indigo-500" },
  { key: "email", label: "Email & WhatsApp", dot: "bg-amber-500", bar: "bg-amber-500" },
  { key: "seo", label: "SEO", dot: "bg-sky-500", bar: "bg-sky-500" },
  { key: "influencer", label: "Influencer Marketing", dot: "bg-pink-500", bar: "bg-pink-500" },
];

// ─── Credential categories (matches reference CredentialVault) ────────────────

const CREDENTIAL_CATEGORIES: { key: CredentialCategory; label: string; fields: CredentialField[] }[] = [
  {
    key: "social", label: "Social Platforms",
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
    key: "website", label: "Website & Hosting",
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
    key: "email_tools", label: "Email Marketing Tools",
    fields: [
      { key: "tool", label: "Tool Name", type: "text" },
      { key: "loginUrl", label: "Login URL", type: "url" },
      { key: "username", label: "Username", type: "text" },
      { key: "password", label: "Password", type: "password" },
    ],
  },
  {
    key: "ads", label: "Ad Platforms",
    fields: [
      { key: "platform", label: "Platform", type: "text" },
      { key: "accountId", label: "Account ID", type: "text" },
      { key: "loginEmail", label: "Login Email", type: "email" },
      { key: "password", label: "Password", type: "password" },
      { key: "notes", label: "Notes", type: "textarea" },
    ],
  },
  {
    key: "analytics", label: "Analytics",
    fields: [
      { key: "tool", label: "Tool Name", type: "text" },
      { key: "loginUrl", label: "Login URL", type: "url" },
      { key: "username", label: "Username", type: "text" },
      { key: "password", label: "Password", type: "password" },
    ],
  },
  {
    key: "custom", label: "Custom",
    fields: [
      { key: "tool", label: "Tool / Asset", type: "text" },
      { key: "loginUrl", label: "Login URL", type: "url" },
      { key: "username", label: "Username", type: "text" },
      { key: "password", label: "Password", type: "password" },
      { key: "notes", label: "Notes", type: "textarea" },
    ],
  },
];

// ─── CredentialRow component ──────────────────────────────────────────────────

function CredentialRow({ entry, onRemove }: { entry: Credential; onRemove: () => void }) {
  const [showSecrets, setShowSecrets] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const fields = CREDENTIAL_CATEGORIES.find((c) => c.key === entry.category)?.fields ?? [];

  const copyField = (key: string, val: string) => {
    navigator.clipboard.writeText(val);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  return (
    <div className="rounded-lg border border-gray-100 bg-white/60 p-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-semibold text-gray-900">{entry.label}</p>
        <div className="flex items-center gap-1">
          <button onClick={() => setShowSecrets((s) => !s)} className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700">
            {showSecrets ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
          <button onClick={onRemove} className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-red-500">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-2">
        {fields
          .filter((f) => entry.values[f.key])
          .map((f) => {
            const isSecret = f.type === "password";
            const val = entry.values[f.key];
            const display = isSecret && !showSecrets ? "•".repeat(Math.min(12, val.length)) : val;
            const copied = copiedKey === f.key;
            return (
              <div key={f.key} className="text-xs">
                <p className="text-gray-400 uppercase tracking-wide text-[10px]">{f.label}</p>
                <div className="flex items-center justify-between gap-2 mt-0.5">
                  <span className="font-mono text-gray-900 truncate">{display}</span>
                  <button onClick={() => copyField(f.key, val)} className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-emerald-700 shrink-0">
                    {copied ? <span className="text-[9px] font-semibold text-emerald-600">✓</span> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}


// ─── Helpers ──────────────────────────────────────────────────────────────────

const pct = (d: number, c: number) => (c === 0 ? 0 : Math.min(100, Math.round((d / c) * 100)));

const getActiveModulesList = (sow: any) => {
  if (!sow || !Array.isArray(sow.items)) return [];
  const moduleNamesMap: Record<string, string> = {
    social: "Social Media",
    paid: "Paid Media",
    email: "Email & WhatsApp",
    seo: "SEO",
    influencer: "Influencer",
  };
  const uniqueModules = Array.from(new Set(sow.items.map((item: any) => item.module)));
  return uniqueModules.map((m: any) => moduleNamesMap[m] || m);
};

const getModuleBadgeColors = (modName: string) => {
  const name = modName.toLowerCase();
  if (name.includes("social")) {
    return {
      badge: "bg-emerald-50 text-emerald-700 border-emerald-100",
      text: "text-emerald-600",
      border: "border-emerald-100",
      dot: "bg-emerald-500"
    };
  }
  if (name.includes("paid")) {
    return {
      badge: "bg-indigo-50 text-indigo-700 border-indigo-100",
      text: "text-indigo-600",
      border: "border-indigo-100",
      dot: "bg-indigo-500"
    };
  }
  if (name.includes("email") || name.includes("whatsapp")) {
    return {
      badge: "bg-amber-50 text-amber-700 border-amber-100",
      text: "text-amber-600",
      border: "border-amber-100",
      dot: "bg-amber-500"
    };
  }
  if (name.includes("seo")) {
    return {
      badge: "bg-sky-50 text-sky-700 border-sky-100",
      text: "text-sky-600",
      border: "border-sky-100",
      dot: "bg-sky-500"
    };
  }
  if (name.includes("influencer")) {
    return {
      badge: "bg-pink-50 text-pink-700 border-pink-100",
      text: "text-pink-600",
      border: "border-pink-100",
      dot: "bg-pink-500"
    };
  }
  return {
    badge: "bg-gray-50 text-gray-700 border-gray-100",
    text: "text-gray-600",
    border: "border-gray-150",
    dot: "bg-gray-500"
  };
};



// A copy counts as delivered once it is fully approved (design_approved) or
// explicitly marked delivered — the draft pipeline never sets "delivered".
const DELIVERED_STATUSES = new Set(["delivered", "design_approved"]);

const norm = (s?: string) => (s || "").toLowerCase().trim();
const tokens = (s?: string) => norm(s).split(/[^a-z0-9]+/).filter(Boolean);

// Scope item labels and deliverable types share the same vocabulary
// ("reel", "carousel", "article/copy", …). Exact match first, then token
// overlap for compound labels ("reel/story" ↔ "reel", "static/image" ↔ "static").
function typeMatches(itemLabel: string, delType: string): boolean {
  if (norm(itemLabel) === norm(delType)) return true;
  const a = tokens(itemLabel);
  const b = new Set(tokens(delType));
  return a.some((t) => b.has(t));
}

function platformsOverlap(itemPlatforms?: string[], delPlatforms?: string[]): boolean {
  const a = (itemPlatforms ?? []).map(norm).filter(Boolean);
  const b = (delPlatforms ?? []).map(norm).filter(Boolean);
  if (a.length === 0 || b.length === 0) return true;
  return a.some((p) => b.includes(p));
}

// Modules that historically used different keys for the same thing
const MODULE_ALIASES: Record<string, string> = { "paid-ads": "paid", emailWhatsapp: "email" };
const normModule = (m?: string) => MODULE_ALIASES[m || ""] ?? norm(m);

function deriveScopeItems(
  scope: any | undefined,
  dels: Deliverable[],
  year: number,
  month: number
) {
  if (!scope || !Array.isArray(scope.items)) return [];

  const inPeriod = (dateStr?: string | null) => {
    if (!dateStr) return false;
    const dt = new Date(dateStr);
    return dt.getFullYear() === year && dt.getMonth() === month;
  };

  // Delivered in this period = the delivery event (deliveredAt or the
  // design_approved timeline entry) happened in it, so copies scheduled last
  // month but approved this month count for this month. Legacy documents
  // without either timestamp fall back to the scheduled month.
  const deliveredInPeriod = (d: Deliverable) => {
    if (!DELIVERED_STATUSES.has(d.status)) return false;
    if (d.deliveredAt) return inPeriod(d.deliveredAt);
    const approvedEntries = (d.statusTimeline?.designerTimeline ?? []).filter(
      (e) => e.status === "design_approved"
    );
    if (approvedEntries.length > 0) {
      return approvedEntries.some((e) => inPeriod(e.timestamp));
    }
    return inPeriod(d.scheduledDate);
  };

  return scope.items.map((item: any) => {
    const delivered = dels.filter(
      (d) =>
        normModule(d.module) === normModule(item.module) &&
        typeMatches(item.label, d.type) &&
        platformsOverlap(item.platforms, d.platforms) &&
        deliveredInPeriod(d)
    ).length;

    return {
      id: item.id || item._id || Math.random().toString(),
      module: item.module,
      label: item.label,
      qty: parseInt(item.unit) || 0,
      delivered,
    };
  });
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: clientId } = use(params);

  const [client, setClient] = useState<ClientDetail | null>(null);
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [taskRequests, setTaskRequests] = useState<TaskRequest[]>([]);
  const [teamList, setTeamList] = useState<any[]>([]);
  const [allScopes, setAllScopes] = useState<ScopeRecord[]>([]);

  const [activeTab, setActiveTab] = useState<
    "profile" | "overview" | "calendar" | "scope" | "access" | "team" | "documents" | "meetings" | "requests"
  >("profile");

  const [currentYear, setCurrentYear] = useState(2026);
  const [currentMonth, setCurrentMonth] = useState(5);

  // Profile tab draft state
  const [aboutBrandDraft, setAboutBrandDraft] = useState("");
  const [requirementNotesDraft, setRequirementNotesDraft] = useState("");

  // Credential state
  const [showAddCredential, setShowAddCredential] = useState(false);
  const [credForm, setCredForm] = useState<{ category: CredentialCategory; label: string; values: Record<string, string> }>({
    category: "social", label: "", values: {},
  });
  const [openCategories, setOpenCategories] = useState<string[]>(CREDENTIAL_CATEGORIES.map((c) => c.key));

  // Client portal login (shown at top of Access Control tab)
  const [showPortalPw, setShowPortalPw] = useState(false);
  const [portalPwDraft, setPortalPwDraft] = useState("");
  const [editingPortalPw, setEditingPortalPw] = useState(false);
  const [portalCopied, setPortalCopied] = useState(false);

  // Doc / meeting state
  const [showAddDoc, setShowAddDoc] = useState(false);
  const [uploadingFile, setUploadingFile] = useState<{
    name: string;
    size: number;
    progress: number;
    status: "idle" | "uploading" | "success" | "error";
    errorMsg?: string;
  } | null>(null);
  const [showAddMeeting, setShowAddMeeting] = useState(false);
  const [newMeeting, setNewMeeting] = useState({ title: "", notes: "", date: "" });

  // Task request state
  const [showAddTaskReq, setShowAddTaskReq] = useState(false);
  const [newTaskReq, setNewTaskReq] = useState({ title: "", description: "", dueDate: "" });
  const [showAddTeamModal, setShowAddTeamModal] = useState(false);

  // Profile tab competitor / social state
  const [newComp, setNewComp] = useState({ name: "", websiteLink: "", socialMediaLink: "" });
  const [newSocial, setNewSocial] = useState({ platform: "instagram", link: "" });

  // Scope of Work tab state
  const [expandedScopeId, setExpandedScopeId] = useState<string | null>(null);
  const [showNewScopeModal, setShowNewScopeModal] = useState(false);
  const [newScopePeriod, setNewScopePeriod] = useState("");
  const [newScopeLabel, setNewScopeLabel] = useState("");
  const [newScopeModules, setNewScopeModules] = useState<Record<string, boolean>>({
    social: false,
    paid: false,
    email: false,
    seo: false,
    influencer: false,
  });
  const [newScopeItems, setNewScopeItems] = useState<any[]>([]);
  const [newScopeStep, setNewScopeStep] = useState(0);
  const [newScopeSubmitting, setNewScopeSubmitting] = useState(false);

  const updateNewScopeItem = (id: string, updates: any) => {
    setNewScopeItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...updates } : item)));
  };

  const deleteNewScopeItem = (id: string) => {
    setNewScopeItems((prev) => prev.filter((item) => item.id !== id));
  };

  const toggleNewScopePlatform = (itemId: string, platform: string) => {
    setNewScopeItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;
        const platforms = item.platforms || [];
        const nextPlats = platforms.includes(platform)
          ? platforms.filter((p: string) => p !== platform)
          : [...platforms, platform];
        return { ...item, platforms: nextPlats };
      })
    );
  };

  const handleNewScopeNext = () => {
    if (newScopeStep === 0) {
      if (!newScopePeriod.trim()) return;

      // Seed default items for active modules if empty
      const nextItems = [...newScopeItems];
      if (newScopeModules.social) {
        const hasSocial = nextItems.some((s) => s.module === "social");
        if (!hasSocial) {
          nextItems.push(
            { id: "social-reel", module: "social", label: "reel", unit: "8", platforms: ["instagram"] },
            { id: "social-story", module: "social", label: "story", unit: "8", platforms: ["instagram"] },
            { id: "social-static", module: "social", label: "static/image", unit: "6", platforms: ["instagram", "facebook"] },
            { id: "social-carousel", module: "social", label: "carousel", unit: "4", platforms: ["instagram", "facebook"] }
          );
        }
      }
      if (newScopeModules.paid) {
        const hasPaid = nextItems.some((s) => s.module === "paid");
        if (!hasPaid) {
          nextItems.push(
            { id: "paid-meta", module: "paid", label: "Meta Ad Creatives", unit: "4" },
            { id: "paid-google", module: "paid", label: "Google Ads Copy", unit: "2" }
          );
        }
      }
      if (newScopeModules.email) {
        const hasEmail = nextItems.some((s) => s.module === "email");
        if (!hasEmail) {
          nextItems.push(
            { id: "email-promo", module: "email", label: "Promotional Campaigns", unit: "4" },
            { id: "email-trans", module: "email", label: "Transactional Flows", unit: "1" }
          );
        }
      }
      if (newScopeModules.seo) {
        const hasSeo = nextItems.some((s) => s.module === "seo");
        if (!hasSeo) {
          nextItems.push(
            { id: "seo-blogs", module: "seo", label: "SEO Blog Posts", unit: "4" },
            { id: "seo-audits", module: "seo", label: "Technical SEO Audits", unit: "1" }
          );
        }
      }
      if (newScopeModules.influencer) {
        const hasInfluencer = nextItems.some((s) => s.module === "influencer");
        if (!hasInfluencer) {
          nextItems.push(
            { id: "influencer-campaigns", module: "influencer", label: "Influencer Campaigns", unit: "2" }
          );
        }
      }
      setNewScopeItems(nextItems);
    }
    setNewScopeStep(newScopeStep + 1);
  };

  // ── Effects ────────────────────────────────────────────────────────────────

  useEffect(() => {
    fetchClientData();
    fetchDeliverables();
    fetchTaskRequests();
    fetchTeamList();
    fetchAllScopes();
    const now = new Date();
    setCurrentYear(now.getFullYear());
    setCurrentMonth(now.getMonth());
  }, [clientId]);

  useEffect(() => {
    if (client) {
      setAboutBrandDraft(client.aboutBrand || "");
      setRequirementNotesDraft(client.requirementNotes || "");
    }
  }, [client]);

  // Auto-refresh the scope/calendar deliverables every 30s while that tab is
  // open, so edits made elsewhere appear without a manual refresh.
  useEffect(() => {
    if (activeTab !== "calendar") return;
    const interval = setInterval(fetchDeliverables, 30_000);
    return () => clearInterval(interval);
  }, [activeTab, clientId]);

  // ── Fetch functions ────────────────────────────────────────────────────────

  const fetchClientData = async () => {
    try {
      const res = await fetch(`/api/clients/${clientId}`);
      if (res.ok) setClient(await res.json());
    } catch (err) { console.error(err); }
  };

  const fetchDeliverables = async () => {
    try {
      const res = await fetch(`/api/clients/${clientId}/deliverables`);
      if (res.ok) setDeliverables(await res.json());
    } catch (err) { console.error(err); }
  };

  const fetchTaskRequests = async () => {
    try {
      const res = await fetch(`/api/clients/${clientId}/task-requests`);
      if (res.ok) setTaskRequests(await res.json());
    } catch (err) { console.error(err); }
  };

  const fetchTeamList = async () => {
    try {
      const res = await fetch("/api/team");
      if (res.ok) setTeamList(await res.json());
    } catch (err) { console.error(err); }
  };

  const fetchAllScopes = async () => {
    try {
      const res = await fetch(`/api/clients/${clientId}/scope`);
      if (res.ok) setAllScopes(await res.json());
    } catch (err) { console.error(err); }
  };

  // ── Patch helpers ──────────────────────────────────────────────────────────

  const patchClient = async (updatedFields: Partial<ClientDetail>) => {
    try {
      const res = await fetch(`/api/clients/${clientId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedFields),
      });
      if (res.ok) fetchClientData();
    } catch (err) { console.error(err); }
  };

  const handleSaveProfileInfo = () => patchClient({ aboutBrand: aboutBrandDraft, requirementNotes: requirementNotesDraft });

  const generatePortalPassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let pw = "";
    for (let i = 0; i < 10; i++) pw += chars.charAt(Math.floor(Math.random() * chars.length));
    return pw;
  };

  const handleSavePortalPassword = async (pw: string) => {
    if (!pw.trim()) return;
    await patchClient({ clientPortalPassword: pw.trim() } as Partial<ClientDetail>);
    setEditingPortalPw(false);
    setPortalPwDraft("");
    setShowPortalPw(true);
  };

  const handleAddCompetitor = () => {
    if (!client || !newComp.name.trim() || !newComp.websiteLink.trim()) return;
    patchClient({ competitors: [...(client.competitors || []), { ...newComp }] });
    setNewComp({ name: "", websiteLink: "", socialMediaLink: "" });
  };
  const handleRemoveCompetitor = (idx: number) => {
    if (!client) return;
    patchClient({ competitors: client.competitors.filter((_, i) => i !== idx) });
  };
  const handleAddSocial = () => {
    if (!client || !newSocial.link.trim()) return;
    patchClient({ socialMediaPresence: [...(client.socialMediaPresence || []), { ...newSocial }] });
    setNewSocial({ platform: "instagram", link: "" });
  };
  const handleRemoveSocial = (idx: number) => {
    if (!client) return;
    patchClient({ socialMediaPresence: client.socialMediaPresence.filter((_, i) => i !== idx) });
  };

  const handleUploadFile = (file: File) => {
    if (!client) return;

    // Check extension
    const allowedExtensions = ["pdf", "doc", "docx", "xls", "xlsx", "jpeg", "jpg", "png"];
    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    if (!allowedExtensions.includes(ext)) {
      setUploadingFile({
        name: file.name,
        size: file.size,
        progress: 0,
        status: "error",
        errorMsg: `File type .${ext} not allowed. Allowed types: ${allowedExtensions.join(", ")}`,
      });
      setTimeout(() => {
        setUploadingFile(null);
      }, 5000);
      return;
    }

    setUploadingFile({
      name: file.name,
      size: file.size,
      progress: 0,
      status: "uploading",
    });

    const xhr = new XMLHttpRequest();
    xhr.open("POST", `/api/documents/upload?clientId=${clientId}`);

    // Track upload progress
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 100);
        setUploadingFile((prev) => (prev ? { ...prev, progress: percent } : null));
      }
    };

    // Load completion
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        setUploadingFile((prev) => (prev ? { ...prev, progress: 100, status: "success" } : null));
        fetchClientData();
        setTimeout(() => {
          setUploadingFile(null);
        }, 3000);
      } else {
        let errMsg = "Upload failed";
        try {
          const res = JSON.parse(xhr.responseText);
          errMsg = res.error || errMsg;
        } catch (_) { }
        setUploadingFile((prev) => (prev ? { ...prev, status: "error", errorMsg: errMsg } : null));
        setTimeout(() => {
          setUploadingFile(null);
        }, 5000);
      }
    };

    // Error handling
    xhr.onerror = () => {
      setUploadingFile((prev) => (prev ? { ...prev, status: "error", errorMsg: "Network connection error" } : null));
      setTimeout(() => {
        setUploadingFile(null);
      }, 5000);
    };

    const formData = new FormData();
    formData.append("file", file);
    xhr.send(formData);
  };

  const handleRemoveDoc = (id: string) => {
    if (!client) return;
    patchClient({ documents: client.documents.filter((d) => d.id !== id) });
  };

  const handleAddMeetingSubmit = () => {
    if (!client || !newMeeting.title.trim() || !newMeeting.notes.trim()) return;
    patchClient({ meetingLogs: [...(client.meetingLogs || []), { id: crypto.randomUUID(), title: newMeeting.title.trim(), notes: newMeeting.notes.trim(), date: newMeeting.date ? new Date(newMeeting.date).toISOString() : new Date().toISOString(), loggedBy: "Admin" }] });
    setShowAddMeeting(false); setNewMeeting({ title: "", notes: "", date: "" });
  };
  const handleRemoveMeeting = (id: string) => {
    if (!client) return;
    patchClient({ meetingLogs: client.meetingLogs.filter((m) => m.id !== id) });
  };

  const handleAddTaskReqSubmit = async () => {
    if (!newTaskReq.title.trim() || !newTaskReq.description.trim()) return;
    try {
      const res = await fetch(`/api/clients/${clientId}/task-requests`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(newTaskReq) });
      if (res.ok) { fetchTaskRequests(); setShowAddTaskReq(false); setNewTaskReq({ title: "", description: "", dueDate: "" }); }
    } catch (err) { console.error(err); }
  };

  const handleUpdateTaskRequestStatus = async (taskId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/clients/${clientId}/task-requests`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ taskId, status: newStatus }) });
      if (res.ok) { fetchTaskRequests(); fetchDeliverables(); }
    } catch (err) { console.error(err); }
  };

  const handleAssignTeamToggle = (memberId: string) => {
    if (!client) return;
    const cur = client.assignedTeam.map((u) => u._id);
    patchClient({ assignedTeam: (cur.includes(memberId) ? cur.filter((id) => id !== memberId) : [...cur, memberId]) as any });
  };

  const handleAddCredentialSubmit = () => {
    if (!client || !credForm.label.trim()) return;
    patchClient({ credentials: [...(client.credentials || []), { id: crypto.randomUUID(), category: credForm.category, label: credForm.label.trim(), values: credForm.values }] });
    setShowAddCredential(false);
    setCredForm({ category: "social", label: "", values: {} });
  };
  const handleRemoveCredential = (id: string) => {
    if (!client) return;
    patchClient({ credentials: client.credentials.filter((c) => c.id !== id) });
  };

  const handleCreateNewScope = async () => {
    setNewScopeSubmitting(true);
    try {
      const payload = {
        period: newScopePeriod,
        label: newScopeLabel,
        items: newScopeItems.map((item) => ({
          module: item.module,
          label: item.label,
          unit: item.unit || "0",
          platforms: item.platforms || [],
        })),
      };
      const res = await fetch(`/api/clients/${clientId}/scope`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        fetchAllScopes(); fetchClientData();
        setShowNewScopeModal(false);
        setNewScopePeriod("");
        setNewScopeLabel("");
        setNewScopeModules({ social: false, paid: false, email: false, seo: false, influencer: false });
        setNewScopeItems([]);
        setNewScopeStep(0);
      }
    } catch (err) { console.error(err); }
    finally { setNewScopeSubmitting(false); }
  };

  // Derived scope dashboard data

  const scopeItems = deriveScopeItems(client?.scope, deliverables, currentYear, currentMonth);
  const activeModuleKeys = Array.from(new Set(scopeItems.map((s: any) => s.module)));

  const totalCommitted = scopeItems.reduce((a: number, s: any) => a + s.qty, 0);
  const totalDelivered = scopeItems.reduce((a: number, s: any) => a + s.delivered, 0);
  const overallPct = pct(totalDelivered, totalCommitted);

  // ── Loading guard ──────────────────────────────────────────────────────────

  if (!client) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] space-y-2">
        <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-gray-500">Loading client dashboard...</p>
      </div>
    );
  }

  const accessBadge = (type?: "login" | "email" | "none") => {
    if (!type || type === "none") return <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-semibold">No Access</span>;
    if (type === "email") return <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-semibold border border-blue-100">Email Access</span>;
    return <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-100">Login Provided</span>;
  };

  const monthName = new Date(currentYear, currentMonth).toLocaleString("default", { month: "long" });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <Link href="/dashboard/clients" className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-emerald-700 font-medium transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Client Directory
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-100 pb-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-emerald-50 text-emerald-700 font-semibold text-xl flex items-center justify-center rounded-2xl shadow-sm border border-emerald-100/50">
              {client.brandName.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">{client.name}</h1>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-100">{client.industry}</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={client.status === "active"}
                    onClick={() => patchClient({ status: client.status === "active" ? "inactive" : "active" })}
                    title={`Toggle client status (currently ${client.status})`}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out outline-none focus:ring-2 focus:ring-gray-200 focus:ring-offset-1 ${
                      client.status === "active" ? "bg-emerald-500" : "bg-red-500"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        client.status === "active" ? "translate-x-4" : "translate-x-0"
                      }`}
                    />
                  </button>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase border ${
                      client.status === "active"
                        ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                        : "bg-red-100 text-red-800 border-red-200"
                    }`}
                  >
                    {client.status}
                  </span>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-1">Contract: {new Date(client.contractStart).toLocaleDateString()} → {new Date(client.contractEnd).toLocaleDateString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 border-b border-gray-200">
        {[
          { key: "profile", label: "Client Profile", icon: UserCheck },
          { key: "overview", label: "Overview", icon: Settings },
          { key: "calendar", label: "Scope Dashboard", icon: CalendarIcon },
          { key: "scope", label: "Scope of Work", icon: ClipboardList },
          { key: "access", label: "Access Control", icon: Shield },
          { key: "team", label: "Assigned Team", icon: Users },
          { key: "documents", label: "Documents", icon: FolderOpen },
          { key: "meetings", label: "Meeting Logs", icon: MessageSquare },
          { key: "requests", label: "Request Tasks", icon: FileText },
        ].map((tab) => {
          const active = activeTab === tab.key;
          return (
            <button key={tab.key} onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center gap-1.5 px-2 py-1.5 border-b-2 text-xs font-semibold shrink-0 transition-all ${active ? "border-emerald-600 text-emerald-700 bg-emerald-50/20" : "border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-200"
                }`}
            >
              <tab.icon className="w-3.5 h-3.5" />{tab.label}
            </button>
          );
        })}
      </div>

      {/* CLIENT PROFILE */}
      {activeTab === "profile" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm space-y-3">
              <h4 className="text-xs font-semibold text-gray-900 uppercase tracking-wider">About Brand</h4>
              <textarea value={aboutBrandDraft} onChange={(e) => setAboutBrandDraft(e.target.value)} rows={5}
                placeholder="Core value propositions, tone of voice, design aesthetics..."
                className="w-full px-3 py-2 border border-gray-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none text-xs rounded-lg placeholder-gray-400 bg-white resize-none" />
            </div>
            <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm space-y-3">
              <h4 className="text-xs font-semibold text-gray-900 uppercase tracking-wider">Requirement Notes</h4>
              <textarea value={requirementNotesDraft} onChange={(e) => setRequirementNotesDraft(e.target.value)} rows={5}
                placeholder="Specific goals, milestones, restrictions, special instructions..."
                className="w-full px-3 py-2 border border-gray-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none text-xs rounded-lg placeholder-gray-400 bg-white resize-none" />
            </div>
          </div>
          <div className="flex justify-end">
            <button onClick={handleSaveProfileInfo} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-semibold rounded-lg shadow-sm">
              <Save className="w-3.5 h-3.5" /> Save Info
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Social Presence */}
            <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm space-y-3">
              <h3 className="text-xs font-semibold text-gray-900 uppercase tracking-wider">Brand Social Media Presence</h3>
              {client.socialMediaPresence?.map((soc, idx) => (
                <div key={idx} className="flex justify-between items-center text-xs bg-gray-50 p-2 rounded-lg border border-gray-100">
                  <span className="capitalize font-semibold text-gray-700 w-20 shrink-0">{soc.platform}</span>
                  <a href={soc.link} target="_blank" rel="noreferrer" className="text-emerald-600 hover:underline flex-1 truncate px-2">{soc.link}</a>
                  <button onClick={() => handleRemoveSocial(idx)} className="text-gray-400 hover:text-red-500 shrink-0">×</button>
                </div>
              ))}
              {(!client.socialMediaPresence || client.socialMediaPresence.length === 0) && <p className="text-xs text-gray-400 italic">No social links added yet.</p>}
              <div className="flex gap-1 pt-2 border-t border-gray-100">
                <select value={newSocial.platform} onChange={(e) => setNewSocial({ ...newSocial, platform: e.target.value })} className="text-[10px] border p-1.5 rounded bg-white text-gray-700">
                  <option value="instagram">Instagram</option><option value="facebook">Facebook</option><option value="youtube">YouTube</option>
                  <option value="linkedin">LinkedIn</option><option value="x">X / Twitter</option><option value="pinterest">Pinterest</option>
                  <option value="tiktok">TikTok</option><option value="custom">Custom</option>
                </select>
                <input type="url" placeholder="Paste profile link..." value={newSocial.link} onChange={(e) => setNewSocial({ ...newSocial, link: e.target.value })} className="text-[10px] border p-1.5 rounded flex-1 text-gray-700 placeholder-gray-400 outline-none" />
                <button onClick={handleAddSocial} className="px-2.5 py-1.5 bg-emerald-600 text-white rounded text-[10px] font-semibold">Add</button>
              </div>
            </div>

            {/* Competitors */}
            <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm space-y-3">
              <h3 className="text-xs font-semibold text-gray-900 uppercase tracking-wider">Market Competitors</h3>
              {client.competitors?.map((comp, idx) => (
                <div key={idx} className="text-xs bg-gray-50 p-2.5 rounded-lg border border-gray-100 flex justify-between items-start">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-gray-800">{comp.name}</p>
                    <a href={comp.websiteLink} target="_blank" rel="noreferrer" className="text-[10px] text-emerald-600 hover:underline block truncate">{comp.websiteLink}</a>
                    {comp.socialMediaLink && <a href={comp.socialMediaLink} target="_blank" rel="noreferrer" className="text-[10px] text-gray-500 hover:underline block truncate">{comp.socialMediaLink}</a>}
                  </div>
                  <button onClick={() => handleRemoveCompetitor(idx)} className="text-gray-400 hover:text-red-500 ml-2 shrink-0">×</button>
                </div>
              ))}
              {(!client.competitors || client.competitors.length === 0) && <p className="text-xs text-gray-400 italic">No competitors added yet.</p>}
              <div className="bg-gray-50/50 border border-dashed border-gray-200 p-2.5 rounded-lg text-xs space-y-1.5">
                <input type="text" placeholder="Competitor name *" value={newComp.name} onChange={(e) => setNewComp({ ...newComp, name: e.target.value })} className="w-full p-1.5 border text-[10px] rounded bg-white" />
                <input type="url" placeholder="Website link *" value={newComp.websiteLink} onChange={(e) => setNewComp({ ...newComp, websiteLink: e.target.value })} className="w-full p-1.5 border text-[10px] rounded bg-white" />
                <input type="url" placeholder="Social media link (optional)" value={newComp.socialMediaLink} onChange={(e) => setNewComp({ ...newComp, socialMediaLink: e.target.value })} className="w-full p-1.5 border text-[10px] rounded bg-white" />
                <button onClick={handleAddCompetitor} className="w-full py-1.5 bg-emerald-600 text-white rounded text-[10px] font-semibold">Add Competitor</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* OVERVIEW */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            {/* KPI */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: "Total Scope", value: totalCommitted },
                { label: "Delivered", value: totalDelivered, cls: "text-emerald-600" },
                { label: "Pending", value: Math.max(0, totalCommitted - totalDelivered) },
                { label: "Delivery %", value: `${overallPct}%` },
              ].map((k) => (
                <div key={k.label} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{k.label}</p>
                  <p className={`text-xl font-semibold mt-1 ${(k as any).cls || "text-gray-900"}`}>{k.value}</p>
                </div>
              ))}
            </div>

            {/* Active channel progress */}
            <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm space-y-4">
              <h3 className="text-xs font-semibold text-gray-900 uppercase tracking-wider">Channel Progress — {monthName} {currentYear}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {activeModuleKeys.length === 0 && <p className="text-xs text-gray-400 italic col-span-2 py-4 text-center">No scope configured yet.</p>}
                {SCOPE_MODULES.filter((m) => activeModuleKeys.includes(m.key)).map((meta) => {
                  const items = scopeItems.filter((s: any) => s.module === meta.key);
                  const c = items.reduce((a: number, s: any) => a + s.qty, 0);
                  const d = items.reduce((a: number, s: any) => a + s.delivered, 0);
                  const p = pct(d, c);
                  return (
                    <div key={meta.key} className="p-3 border border-gray-100 rounded-lg space-y-1.5 bg-gray-50/30">
                      <div className="flex justify-between items-center text-xs">
                        <div className="flex items-center gap-1.5"><span className={`h-2 w-2 rounded-full ${meta.dot}`} /><span className="font-semibold text-gray-800">{meta.label}</span></div>
                        <span className="text-[10px] text-gray-500">{d}/{c} ({p}%)</span>
                      </div>
                      <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden"><div className={`h-full rounded-full ${meta.bar}`} style={{ width: `${p}%` }} /></div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right col */}
          <div className="space-y-6">
            <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm space-y-4">
              <h3 className="text-xs font-semibold text-gray-900 uppercase tracking-wider">Primary Contact</h3>
              <div className="text-xs space-y-2 text-gray-600">
                <p><span className="font-semibold text-gray-900">Name:</span> {client.primaryContact.name}</p>
                <p><span className="font-semibold text-gray-900">Email:</span> {client.primaryContact.email}</p>
                <p><span className="font-semibold text-gray-900">Phone:</span> {client.primaryContact.phone}</p>
              </div>
            </div>
            <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm space-y-3">
              <h3 className="text-xs font-semibold text-gray-900 uppercase tracking-wider">Business Info</h3>
              <div className="text-xs space-y-2 text-gray-600">
                <p><span className="font-semibold text-gray-900">Industry:</span> {client.industry}</p>
                <p><span className="font-semibold text-gray-900">Status:</span> <span className={`font-semibold capitalize ${client.status === "active" ? "text-emerald-600" : "text-gray-400"}`}>{client.status}</span></p>
                <p><span className="font-semibold text-gray-900">Contract:</span> {new Date(client.contractStart).toLocaleDateString()} → {new Date(client.contractEnd).toLocaleDateString()}</p>
                {client.website && <p><span className="font-semibold text-gray-900">Website:</span> <a href={client.website} target="_blank" rel="noreferrer" className="text-emerald-600 hover:underline inline-flex items-center gap-0.5">{client.website} <ExternalLink className="w-3 h-3" /></a></p>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SCOPE DASHBOARD */}
      {activeTab === "calendar" && (
        <div className="space-y-5">
          {/* Month navigation */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button onClick={() => { if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(currentYear - 1); } else setCurrentMonth(currentMonth - 1); }}
                className="p-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-500">
                ‹
              </button>
              <span className="text-sm font-semibold text-gray-900 w-36 text-center">{monthName} {currentYear}</span>
              <button onClick={() => { if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(currentYear + 1); } else setCurrentMonth(currentMonth + 1); }}
                className="p-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-500">
                ›
              </button>
            </div>
            <p className="text-xs text-gray-500">Scope vs. delivered for this period</p>
          </div>

          {/* KPI cards — same layout as ScopeDashboard.tsx */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Total scope", value: totalCommitted },
              { label: "Delivered", value: totalDelivered },
              { label: "Pending", value: Math.max(0, totalCommitted - totalDelivered) },
              { label: "Delivery %", value: `${overallPct}%` },
            ].map((k) => (
              <div key={k.label} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-400">{k.label}</p>
                <p className="text-2xl font-semibold mt-1 text-gray-900">{k.value}</p>
              </div>
            ))}
          </div>

          {/* Per-module cards — exact ScopeDashboard.tsx structure */}
          {activeModuleKeys.length === 0 ? (
            <div className="text-center py-14 border border-dashed border-gray-200 rounded-xl">
              <Globe className="w-8 h-8 text-gray-300 mx-auto" />
              <p className="text-xs text-gray-500 mt-2 font-medium">No scope configured yet.</p>
              <p className="text-[10px] text-gray-400">Add deliverables in the Scope of Work tab first.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {SCOPE_MODULES.filter((m) => activeModuleKeys.includes(m.key)).map((meta) => {
                const items = scopeItems.filter((s: any) => s.module === meta.key);
                const c = items.reduce((a: number, s: any) => a + s.qty, 0);
                const d = items.reduce((a: number, s: any) => a + s.delivered, 0);
                const p = pct(d, c);
                return (
                  <div key={meta.key} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm space-y-3">
                    {/* Module header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`h-2.5 w-2.5 rounded-full ${meta.dot}`} />
                        <p className="text-sm font-semibold text-gray-900">{meta.label}</p>
                      </div>
                      <span className="text-xs font-semibold text-gray-900">{p}%</span>
                    </div>
                    {/* Module progress bar */}
                    <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${meta.bar}`} style={{ width: `${p}%` }} />
                    </div>
                    {/* Committed / Delivered / Pending */}
                    <div className="grid grid-cols-3 gap-2 text-xs text-gray-500">
                      <span>Scope: <span className="text-gray-900 font-medium">{c}</span></span>
                      <span>Delivered: <span className="text-gray-900 font-medium">{d}</span></span>
                      <span>Pending: <span className="text-gray-900 font-medium">{Math.max(0, c - d)}</span></span>
                    </div>
                    {/* Per-item sub-rows */}
                    <div className="space-y-1.5 pt-1">
                      {items.map((item: any) => {
                        const sp = pct(item.delivered, item.qty);
                        return (
                          <div key={item.id} className="text-xs">
                            <div className="flex justify-between mb-0.5">
                              <span className="text-gray-700">{item.label}</span>
                              <span className="text-gray-400">{item.delivered}/{item.qty}</span>
                            </div>
                            <div className="w-full bg-gray-100 h-1 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${meta.bar} opacity-70`} style={{ width: `${sp}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SCOPE OF WORK */}
      {activeTab === "scope" && (
        <div className="space-y-5">
          <div className="flex justify-between items-center border-b pb-3">
            <div>
              <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Scope of Work</h2>
              <p className="text-xs text-gray-500 mt-0.5">All contract periods — historical and current</p>
            </div>
            <button onClick={() => { setShowNewScopeModal(true); setNewScopeStep(0); }} className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-semibold rounded-lg shadow-sm">
              <Plus className="w-3.5 h-3.5" /> New Scope of Work
            </button>
          </div>

          {allScopes.length === 0 && (
            <div className="text-center py-14 border border-dashed border-gray-200 rounded-xl">
              <ClipboardList className="w-8 h-8 text-gray-300 mx-auto" />
              <p className="text-xs text-gray-500 mt-2 font-medium">No scope records yet.</p>
              <p className="text-[10px] text-gray-400">Create the first scope of work to track deliverables.</p>
            </div>
          )}

          <div className="space-y-3">
            {allScopes.map((sow) => {
              const isExpanded = expandedScopeId === sow.id;

              return (
                <div key={sow.id} className={`border rounded-xl overflow-hidden shadow-sm ${sow.isActive ? "border-emerald-200 bg-emerald-50/10" : "border-gray-100 bg-white"}`}>
                  {/* Card header */}
                  <button className="w-full flex items-center justify-between p-4 text-left" onClick={() => setExpandedScopeId(isExpanded ? null : sow.id)}>
                    <div className="flex items-center gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-gray-900">{sow.period || sow.label || "Scope of Work"}</span>
                          {sow.label && sow.period && <span className="text-xs text-gray-500">— {sow.label}</span>}
                          {sow.isActive
                            ? <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">Active</span>
                            : <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Historical</span>}
                        </div>
                        <p className="text-[10px] text-gray-400 mt-0.5">Created {new Date(sow.createdAt).toLocaleDateString()}</p>
                        {(() => {
                          const activeMods = getActiveModulesList(sow);
                          if (activeMods.length > 0) {
                            return (
                              <div className="flex flex-wrap gap-1.5 mt-1.5">
                                {activeMods.map((mod) => (
                                  <span key={mod} className={`text-[9px] font-semibold px-1.5 py-0.5 rounded border ${getModuleBadgeColors(mod).badge}`}>
                                    {mod}
                                  </span>
                                ))}
                              </div>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    </div>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />}
                  </button>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="border-t border-gray-100 p-5 bg-white">
                      {(() => {
                        if (!sow.items || sow.items.length === 0) {
                          return <p className="text-xs text-gray-400 italic">No scope items configured.</p>;
                        }

                        // Group items by module
                        const modulesMap: Record<string, { label: string; icon: any; color: string }> = {
                          social: { label: "Social Media", icon: Globe, color: "text-emerald-600" },
                          paid: { label: "Paid Advertising", icon: Award, color: "text-indigo-600" },
                          email: { label: "Email & WhatsApp", icon: MessageSquare, color: "text-amber-600" },
                          seo: { label: "SEO", icon: Globe, color: "text-sky-600" },
                          influencer: { label: "Influencer Marketing", icon: Users, color: "text-pink-600" },
                        };

                        const grouped: Record<string, any[]> = {};
                        sow.items.forEach((item: any) => {
                          const m = item.module === "paid-ads" ? "paid" : item.module === "emailWhatsapp" ? "email" : item.module;
                          if (!grouped[m]) grouped[m] = [];
                          grouped[m].push(item);
                        });

                        return (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            {Object.entries(grouped).map(([modKey, items]) => {
                              const meta = modulesMap[modKey] || { label: modKey, icon: ClipboardList, color: "text-gray-600" };
                              const Icon = meta.icon;
                              return (
                                <div key={modKey} className="space-y-2">
                                  <h4 className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                                    <Icon className={`w-3.5 h-3.5 ${meta.color}`} /> {meta.label} / Mo
                                  </h4>
                                  <div className="border border-gray-100 rounded-lg p-3 divide-y divide-gray-50 bg-gray-50/20 text-xs">
                                    {items.map((item) => (
                                      <div key={item.id || item._id} className="flex justify-between items-center py-1">
                                        <div>
                                          <span>{item.label}</span>
                                          {modKey === "social" && item.platforms && item.platforms.length > 0 && (
                                            <span className="text-[9px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded ml-2 font-semibold uppercase border border-emerald-100">
                                              {item.platforms.join(", ")}
                                            </span>
                                          )}
                                        </div>
                                        <span className="font-semibold">{item.unit || "0"} / mo</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}


      {/* ACCESS CONTROL */}
      {activeTab === "access" && (
        <div className="space-y-4">
          {/* Client Portal Login (pinned at very top) */}
          <div className="border border-emerald-100 rounded-xl p-4 bg-emerald-50/20 space-y-3">
            <h3 className="text-xs font-semibold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-emerald-600" /> Client Portal Login
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Email */}
              <div className="bg-white border border-gray-100 rounded-lg p-3 space-y-1">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Sign-in Email</p>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-gray-800 truncate">{client.primaryContact.email}</span>
                  <button
                    onClick={() => { navigator.clipboard.writeText(client.primaryContact.email); }}
                    className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-emerald-700 shrink-0"
                    title="Copy email"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                </div>
              </div>
              {/* Password */}
              <div className="bg-white border border-gray-100 rounded-lg p-3 space-y-1">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Password</p>
                {client.clientPortalPassword ? (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-mono font-semibold text-gray-800 truncate">
                      {showPortalPw ? client.clientPortalPassword : "••••••••••"}
                    </span>
                    <div className="flex items-center gap-0.5 shrink-0">
                      <button
                        onClick={() => setShowPortalPw((v) => !v)}
                        className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-emerald-700"
                        title={showPortalPw ? "Hide" : "Reveal"}
                      >
                        {showPortalPw ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      </button>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(client.clientPortalPassword || "");
                          setPortalCopied(true);
                          setTimeout(() => setPortalCopied(false), 1500);
                        }}
                        className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-emerald-700"
                        title="Copy password"
                      >
                        {portalCopied ? <span className="text-[9px] font-semibold text-emerald-600">✓</span> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 italic">Not set — regenerate to create a login.</p>
                )}
              </div>
            </div>

            {/* Set / regenerate password */}
            {editingPortalPw ? (
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  value={portalPwDraft}
                  onChange={(e) => setPortalPwDraft(e.target.value)}
                  placeholder="Enter new password"
                  className="flex-1 min-w-[180px] text-xs px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 font-medium text-gray-900 bg-white"
                />
                <button
                  onClick={() => setPortalPwDraft(generatePortalPassword())}
                  className="px-2.5 py-2 border border-gray-200 text-[10px] font-bold text-gray-600 hover:bg-gray-50 rounded-lg"
                >
                  Generate
                </button>
                <button
                  onClick={() => handleSavePortalPassword(portalPwDraft)}
                  className="px-3 py-2 bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-semibold rounded-lg"
                >
                  Save
                </button>
                <button
                  onClick={() => { setEditingPortalPw(false); setPortalPwDraft(""); }}
                  className="px-3 py-2 border border-gray-200 text-gray-600 hover:bg-gray-50 text-xs font-semibold rounded-lg"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setEditingPortalPw(true); setPortalPwDraft(""); }}
                  className="inline-flex items-center gap-1 px-3 py-1.5 border border-gray-200 text-gray-700 hover:bg-white text-xs font-semibold rounded-lg"
                >
                  Set custom password
                </button>
                <button
                  onClick={() => handleSavePortalPassword(generatePortalPassword())}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-semibold rounded-lg shadow-sm"
                >
                  Regenerate password
                </button>
              </div>
            )}
            <p className="text-[10px] text-gray-400">
              Updating this resets the client's actual portal login. Share the new password with the client.
            </p>
          </div>

          {/* SEO Tool Access (pinned above vault) */}
          {client.scope?.seo && (client.scope.seo.gaAccess?.type && client.scope.seo.gaAccess.type !== "none" || client.scope.seo.gtmAccess?.type && client.scope.seo.gtmAccess.type !== "none" || client.scope.seo.gscAccess?.type && client.scope.seo.gscAccess.type !== "none") && (
            <div className="border border-gray-100 rounded-xl p-4 bg-gray-50/30 space-y-3">
              <h3 className="text-xs font-semibold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-emerald-600" /> SEO Tool Access
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { label: "Google Analytics", field: client.scope.seo.gaAccess },
                  { label: "Google Tag Manager", field: client.scope.seo.gtmAccess },
                  { label: "Google Search Console", field: client.scope.seo.gscAccess },
                ].map(({ label, field }) => (
                  <div key={label} className="bg-white border border-gray-100 rounded-lg p-3 space-y-1.5">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{label}</p>
                    {accessBadge(field?.type)}
                    {field?.details && <p className="text-[10px] text-gray-600 font-mono mt-1">{field.details}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ShieldAlert banner */}
          <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-sm flex-1">
              <p className="font-semibold text-gray-900">Credential Storage Policy</p>
              <p className="text-amber-800/80 mt-0.5 text-xs">
                Credentials are stored in your database. Passwords are masked by default — use the eye icon to reveal. Copy individual values without exposing the full record.
              </p>
            </div>
          </div>

          {/* Header + Add button */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-900">Access Control</p>
              <p className="text-xs text-gray-500">
                {client.credentials?.length || 0} credential{(client.credentials?.length || 0) === 1 ? "" : "s"} stored
              </p>
            </div>
            <button
              onClick={() => setShowAddCredential(true)}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-semibold rounded-lg shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" /> Add credential
            </button>
          </div>

          {/* Accordion — one section per category, all open by default */}
          <div className="space-y-2">
            {CREDENTIAL_CATEGORIES.map((cat) => {
              const inCat = (client.credentials || []).filter((c) => c.category === cat.key);
              const isOpen = openCategories.includes(cat.key);
              return (
                <div key={cat.key} className="border border-gray-100 rounded-xl overflow-hidden bg-white shadow-sm">
                  <button
                    className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                    onClick={() => setOpenCategories((prev) =>
                      isOpen ? prev.filter((k) => k !== cat.key) : [...prev, cat.key]
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <KeyRound className="w-3.5 h-3.5 text-gray-400" />
                      <span className="text-sm font-semibold text-gray-800">{cat.label}</span>
                      <span className="text-xs text-gray-400">({inCat.length})</span>
                    </span>
                    {isOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                  </button>

                  {isOpen && (
                    <div className="border-t border-gray-50 p-3 space-y-2 bg-gray-50/30">
                      {inCat.length === 0 ? (
                        <p className="text-xs text-gray-400 py-2 pl-6 italic">No credentials stored yet.</p>
                      ) : (
                        inCat.map((entry) => (
                          <CredentialRow
                            key={entry.id}
                            entry={entry}
                            onRemove={() => handleRemoveCredential(entry.id)}
                          />
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Add credential modal */}
          {showAddCredential && (() => {
            const catFields = CREDENTIAL_CATEGORIES.find((c) => c.key === credForm.category)?.fields ?? [];
            return (
              <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
                <div className="bg-white border border-gray-100 shadow-xl rounded-2xl max-w-lg w-full p-5 space-y-4 max-h-[90vh] overflow-y-auto">
                  <h3 className="text-sm font-semibold text-gray-900 border-b pb-2">Add credential</h3>
                  <div className="space-y-3 text-xs">
                    {/* Category */}
                    <div className="space-y-1">
                      <label className="font-semibold text-gray-500 uppercase">Category</label>
                      <select
                        value={credForm.category}
                        onChange={(e) => setCredForm({ category: e.target.value as CredentialCategory, label: credForm.label, values: {} })}
                        className="w-full px-2 py-1.5 border rounded-lg bg-white text-xs"
                      >
                        {CREDENTIAL_CATEGORIES.map((c) => (
                          <option key={c.key} value={c.key}>{c.label}</option>
                        ))}
                      </select>
                    </div>
                    {/* Label */}
                    <div className="space-y-1">
                      <label className="font-semibold text-gray-500 uppercase">Label</label>
                      <input
                        type="text"
                        placeholder="e.g. Instagram, Mailchimp, GoDaddy"
                        value={credForm.label}
                        onChange={(e) => setCredForm({ ...credForm, label: e.target.value })}
                        className="w-full px-3 py-1.5 border rounded-lg text-xs outline-none focus:border-emerald-500"
                      />
                    </div>
                    {/* Dynamic fields driven by category */}
                    {catFields.map((f) => (
                      <div key={f.key} className="space-y-1">
                        <label className="font-semibold text-gray-500 uppercase">{f.label}</label>
                        {f.type === "textarea" ? (
                          <textarea
                            rows={2}
                            value={credForm.values[f.key] ?? ""}
                            onChange={(e) => setCredForm({ ...credForm, values: { ...credForm.values, [f.key]: e.target.value } })}
                            className="w-full px-3 py-1.5 border rounded-lg text-xs outline-none focus:border-emerald-500 resize-none"
                          />
                        ) : (
                          <input
                            type={f.type === "password" ? "password" : f.type === "url" ? "url" : f.type === "email" ? "email" : "text"}
                            value={credForm.values[f.key] ?? ""}
                            onChange={(e) => setCredForm({ ...credForm, values: { ...credForm.values, [f.key]: e.target.value } })}
                            className="w-full px-3 py-1.5 border rounded-lg text-xs outline-none focus:border-emerald-500"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button onClick={() => { setShowAddCredential(false); setCredForm({ category: "social", label: "", values: {} }); }} className="px-3 py-1.5 border rounded-lg text-xs">Cancel</button>
                    <button onClick={handleAddCredentialSubmit} className="px-4 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-semibold">Save credential</button>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* ASSIGNED TEAM */}
      {activeTab === "team" && (
        <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-6 space-y-5">
          <div className="flex justify-between items-center border-b pb-3">
            <div>
              <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Project Team</h2>
              <p className="text-xs text-gray-500 mt-0.5">Team members assigned to this client</p>
            </div>
            <button
              onClick={() => setShowAddTeamModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" /> Add Team Member
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            {client.assignedTeam.map((member) => {
              const fullName = member.name || `${member.firstName || ""} ${member.lastName || ""}`.trim() || "Team Member";
              const initials = fullName.split(" ").map((n: string) => n[0]).join("").toUpperCase() || "TM";
              return (
                <div
                  key={member._id}
                  className="flex items-center justify-between p-4 border border-gray-100 bg-white rounded-xl transition-all shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-800 font-semibold text-xs flex items-center justify-center">
                      {initials}
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-gray-900">{fullName}</h4>
                      <p className="text-[10px] text-gray-500">{member.email}</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {member.roles?.map((r: string) => (
                          <span
                            key={r}
                            className="text-[8px] font-semibold px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 capitalize"
                          >
                            {r.replace("_", " ")}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleAssignTeamToggle(member._id)}
                    className="px-3 py-1 rounded-lg text-[10px] font-semibold transition-all bg-red-50 text-red-600 hover:bg-red-100"
                  >
                    Remove
                  </button>
                </div>
              );
            })}
            {client.assignedTeam.length === 0 && (
              <p className="text-xs text-gray-500 italic p-4 col-span-2 text-center">
                No team members assigned to this client yet.
              </p>
            )}
          </div>
        </div>
      )}

      {/* DOCUMENTS */}
      {activeTab === "documents" && (
        <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-6 space-y-5">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-gray-50/50 border border-gray-100 rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Total Documents</p>
                <p className="text-2xl font-semibold text-gray-900 mt-1">{client.documents?.length || 0}</p>
              </div>
              <FolderOpen className="w-8 h-8 text-emerald-600" />
            </div>
            <div className="bg-gray-50/50 border border-gray-100 rounded-xl p-4 flex flex-col justify-center">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Allowed Formats</p>
              <p className="text-xs font-medium text-gray-700 mt-1.5">PDF, DOC, DOCX, XLS, XLSX, JPEG, JPG, PNG</p>
            </div>
          </div>

          <div className="flex justify-between items-center border-b pb-2">
            <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Client Documents & Assets</h2>
            <button onClick={() => setShowAddDoc(true)} className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-semibold rounded-lg shadow-sm"><Plus className="w-3.5 h-3.5" /> Upload File</button>
          </div>

          {client.documents?.length === 0 ? (
            <div className="text-center py-12 border border-dashed rounded-xl"><FolderOpen className="w-8 h-8 text-gray-300 mx-auto" /><p className="text-xs text-gray-500 mt-2 font-medium">No files uploaded yet.</p></div>
          ) : (
            <div className="overflow-x-auto border border-gray-100 rounded-xl">
              <table className="min-w-full divide-y divide-gray-100 text-xs">
                <thead className="bg-gray-50/50">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-gray-500 uppercase tracking-wider">File Name</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-500 uppercase tracking-wider">File Path</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-500 uppercase tracking-wider">File Size</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-500 uppercase tracking-wider">Uploaded At</th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-500 uppercase tracking-wider">Uploaded By</th>
                    <th className="px-4 py-3 text-right font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {client.documents.map((doc) => {
                    const formatSize = (bytes: number) => {
                      if (!bytes) return "0 Bytes";
                      const k = 1024;
                      const sizes = ["Bytes", "KB", "MB", "GB"];
                      const i = Math.floor(Math.log(bytes) / Math.log(k));
                      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
                    };
                    const getIcon = (filename: string) => {
                      const ext = filename.split(".").pop()?.toLowerCase() || "";
                      if (ext === "pdf") return <FileText className="w-4 h-4 text-red-500" />;
                      if (["png", "jpg", "jpeg"].includes(ext)) return <FileText className="w-4 h-4 text-blue-500" />;
                      if (["xls", "xlsx"].includes(ext)) return <FileText className="w-4 h-4 text-emerald-600" />;
                      if (["doc", "docx"].includes(ext)) return <FileText className="w-4 h-4 text-indigo-500" />;
                      return <FileText className="w-4 h-4 text-gray-500" />;
                    };
                    return (
                      <tr key={doc.id} className="hover:bg-gray-50/40 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap font-medium text-gray-900">
                          <div className="flex items-center gap-2">
                            {getIcon(doc.name)}
                            <span className="truncate max-w-[180px]" title={doc.name}>{doc.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap font-mono text-[10px] text-gray-500">
                          {doc.filePath || "N/A"}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-gray-600">
                          {doc.fileSize ? formatSize(doc.fileSize) : "N/A"}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-gray-400">
                          {doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleString() : "N/A"}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
                            {doc.uploadedBy || "Unknown"}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <a
                              href={doc.fileUrl}
                              className="p-1.5 hover:text-emerald-700 text-gray-400 rounded-lg hover:bg-emerald-50 transition-colors"
                              title="Download File"
                            >
                              <FileDown className="w-4 h-4" />
                            </a>
                            <button
                              onClick={() => handleRemoveDoc(doc.id)}
                              className="p-1.5 hover:text-red-600 text-gray-400 rounded-lg hover:bg-red-50 transition-colors"
                              title="Delete File"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {showAddDoc && (
            <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
              <div className="bg-white border border-gray-100 shadow-2xl rounded-2xl max-w-sm w-full p-6 space-y-4">
                <h3 className="text-sm font-semibold text-gray-900 border-b pb-2">Upload Document</h3>
                <div className="space-y-4 text-xs">
                  <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 flex flex-col items-center justify-center bg-gray-50/50 hover:bg-gray-50 transition-all relative">
                    <input
                      type="file"
                      id="file-upload"
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handleUploadFile(file);
                          setShowAddDoc(false);
                        }
                      }}
                    />
                    <FolderOpen className="w-8 h-8 text-gray-400 mb-2" />
                    <p className="font-semibold text-gray-700 text-center">Click to upload or drag & drop</p>
                    <p className="text-[10px] text-gray-400 text-center mt-1">Allowed formats: PDF, DOC, DOCX, XLS, XLSX, JPEG, JPG, PNG</p>
                  </div>
                </div>
                <div className="flex justify-end pt-2">
                  <button onClick={() => setShowAddDoc(false)} className="px-4 py-2 border border-gray-200 rounded-lg text-xs font-semibold hover:bg-gray-50 text-gray-600">
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MEETING */}
      {activeTab === "meetings" && (
        <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-6 space-y-5">
          <div className="flex justify-between items-center border-b pb-2">
            <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Meeting Logs & Notes</h2>
            <button onClick={() => setShowAddMeeting(true)} className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-semibold rounded-lg shadow-sm"><Plus className="w-3.5 h-3.5" /> Log Meeting</button>
          </div>
          {client.meetingLogs?.length === 0 ? (
            <div className="text-center py-12 border border-dashed rounded-xl"><MessageSquare className="w-8 h-8 text-gray-300 mx-auto" /><p className="text-xs text-gray-500 mt-2 font-medium">No meeting notes logged yet.</p></div>
          ) : (
            <div className="space-y-4">
              {client.meetingLogs?.map((meeting) => (
                <div key={meeting.id} className="border border-gray-100 rounded-xl p-4 bg-gray-50/20 shadow-sm group space-y-2">
                  <div className="flex justify-between items-start">
                    <div><h4 className="text-xs font-semibold text-gray-900">{meeting.title}</h4><p className="text-[9px] text-gray-400 mt-0.5">{new Date(meeting.date).toLocaleDateString()} · {meeting.loggedBy}</p></div>
                    <button onClick={() => handleRemoveMeeting(meeting.id)} className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-line bg-white border p-3 rounded-lg border-gray-100/50">{meeting.notes}</p>
                </div>
              ))}
            </div>
          )}
          {showAddMeeting && (
            <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
              <div className="bg-white border border-gray-100 shadow-xl rounded-2xl max-w-lg w-full p-5 space-y-4">
                <h3 className="text-sm font-semibold text-gray-900 border-b pb-2">Log Meeting Notes</h3>
                <div className="space-y-3 text-xs">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1"><label className="font-semibold text-gray-500 uppercase">Meeting Title *</label><input type="text" placeholder="Weekly Retention Sync" value={newMeeting.title} onChange={(e) => setNewMeeting({ ...newMeeting, title: e.target.value })} className="w-full px-3 py-1.5 border rounded-lg" /></div>
                    <div className="space-y-1"><label className="font-semibold text-gray-500 uppercase">Date</label><input type="date" value={newMeeting.date} onChange={(e) => setNewMeeting({ ...newMeeting, date: e.target.value })} className="w-full px-3 py-1.5 border rounded-lg" /></div>
                  </div>
                  <div className="space-y-1"><label className="font-semibold text-gray-500 uppercase">Notes & Takeaways *</label><textarea rows={6} placeholder="Action items, decisions, next steps..." value={newMeeting.notes} onChange={(e) => setNewMeeting({ ...newMeeting, notes: e.target.value })} className="w-full px-3 py-2 border rounded-lg" /></div>
                </div>
                <div className="flex justify-end gap-2 pt-2"><button onClick={() => setShowAddMeeting(false)} className="px-3 py-1.5 border rounded-lg text-xs">Cancel</button><button onClick={handleAddMeetingSubmit} className="px-4 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-semibold">Save Meeting Log</button></div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* REQUEST TASKS */}
      {activeTab === "requests" && (
        <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-6 space-y-5">
          <div className="flex justify-between items-center border-b pb-2">
            <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Client Requested Tasks</h2>
            <button onClick={() => setShowAddTaskReq(true)} className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-semibold rounded-lg shadow-sm"><Plus className="w-3.5 h-3.5" /> Request Task</button>
          </div>
          {taskRequests.length === 0 ? (
            <div className="text-center py-12 border border-dashed rounded-xl"><ClipboardList className="w-8 h-8 text-gray-300 mx-auto" /><p className="text-xs text-gray-500 mt-2 font-medium">No task requests yet.</p></div>
          ) : (
            <div className="space-y-3">
              {taskRequests.map((task) => (
                <div key={task.id} className="border border-gray-100 rounded-xl p-4 bg-gray-50/20 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-semibold text-gray-900">{task.title}</span>
                      <span className={`text-[9px] font-semibold px-2 py-0.5 rounded uppercase ${task.status === "completed" ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : task.status === "approved" ? "bg-indigo-50 text-indigo-700 border border-indigo-100" : task.status === "rejected" ? "bg-red-50 text-red-700 border border-red-100" : "bg-amber-50 text-amber-700 border border-amber-100"}`}>{task.status}</span>
                    </div>
                    <p className="text-xs text-gray-600">{task.description}</p>
                    <p className="text-[9px] text-gray-400">{new Date(task.createdAt).toLocaleDateString()}{task.dueDate && ` · Due: ${new Date(task.dueDate).toLocaleDateString()}`}{task.requestedBy && ` · By: ${task.requestedBy.firstName} ${task.requestedBy.lastName}`}</p>
                  </div>
                  {task.status === "pending" && <div className="flex gap-1.5 shrink-0"><button onClick={() => handleUpdateTaskRequestStatus(task.id, "approved")} className="px-2.5 py-1 bg-emerald-600 text-white rounded text-[10px] font-semibold hover:bg-emerald-700">Approve</button><button onClick={() => handleUpdateTaskRequestStatus(task.id, "rejected")} className="px-2.5 py-1 bg-gray-200 text-gray-700 rounded text-[10px] font-semibold hover:bg-gray-300">Reject</button></div>}
                  {task.status === "approved" && <button onClick={() => handleUpdateTaskRequestStatus(task.id, "completed")} className="px-2.5 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-100 rounded text-[10px] font-semibold shrink-0">Mark Completed</button>}
                </div>
              ))}
            </div>
          )}
          {showAddTaskReq && (
            <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
              <div className="bg-white border border-gray-100 shadow-xl rounded-2xl max-w-sm w-full p-5 space-y-4">
                <h3 className="text-sm font-semibold text-gray-900 border-b pb-2">Request Custom Task</h3>
                <div className="space-y-3 text-xs">
                  <div className="space-y-1"><label className="font-semibold text-gray-500 uppercase">Task Title *</label><input type="text" placeholder="e.g. Father's Day Carousel Post" value={newTaskReq.title} onChange={(e) => setNewTaskReq({ ...newTaskReq, title: e.target.value })} className="w-full px-3 py-1.5 border rounded-lg" /></div>
                  <div className="space-y-1"><label className="font-semibold text-gray-500 uppercase">Description / Specs *</label><textarea placeholder="Content outline, target platforms..." value={newTaskReq.description} onChange={(e) => setNewTaskReq({ ...newTaskReq, description: e.target.value })} className="w-full px-3 py-1.5 border rounded-lg" rows={3} /></div>
                  <div className="space-y-1"><label className="font-semibold text-gray-500 uppercase">Target Due Date</label><input type="date" value={newTaskReq.dueDate} onChange={(e) => setNewTaskReq({ ...newTaskReq, dueDate: e.target.value })} className="w-full px-3 py-1.5 border rounded-lg" /></div>
                </div>
                <div className="flex justify-end gap-2 pt-2"><button onClick={() => setShowAddTaskReq(false)} className="px-3 py-1.5 border rounded-lg text-xs">Cancel</button><button onClick={handleAddTaskReqSubmit} className="px-4 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-semibold">Submit Request</button></div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* NEW SCOPE OF WORK MODAL */}
      {showNewScopeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white border border-gray-100 shadow-2xl rounded-2xl w-full max-w-2xl my-8">
            {/* Modal header */}
            <div className="flex items-center justify-between p-5 border-b">
              <div>
                <h2 className="text-sm font-semibold text-gray-900">New Scope of Work</h2>
                <p className="text-xs text-gray-500 mt-0.5">Step {newScopeStep + 1} of 3</p>
              </div>
              {/* Step indicators */}
              <div className="flex items-center gap-1.5">
                {["Configuration", "Deliverables", "Review"].map((s, i) => (
                  <div key={s} className={`h-1.5 rounded-full transition-all ${i === newScopeStep ? "w-6 bg-emerald-600" : i < newScopeStep ? "w-4 bg-emerald-300" : "w-4 bg-gray-200"}`} title={s} />
                ))}
              </div>
            </div>

            <div className="p-6 max-h-[70vh] overflow-y-auto space-y-4">
              {/* Step 0 — Period / Label / Modules */}
              {newScopeStep === 0 && (
                <div className="space-y-5">
                  <p className="text-xs text-gray-500">Define the scope period details and select active modules.</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-gray-500 uppercase">Period *</label>
                      <input type="text" placeholder="e.g. July 2026 / Q3 2026" value={newScopePeriod}
                        onChange={(e) => setNewScopePeriod(e.target.value)}
                        className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-xs outline-none focus:border-emerald-500" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-gray-500 uppercase">Label (optional)</label>
                      <input type="text" placeholder="e.g. Revised contract, Growth phase" value={newScopeLabel}
                        onChange={(e) => setNewScopeLabel(e.target.value)}
                        className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-xs outline-none focus:border-emerald-500" />
                    </div>
                  </div>

                  <div className="space-y-2 pt-2">
                    <label className="text-xs font-semibold text-gray-500 uppercase block">Active Retainer Modules</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {[
                        { key: "social", label: "Social Media Marketing", desc: "Instagram, FB, LinkedIn, YT, X" },
                        { key: "paid", label: "Paid Performance Ads", desc: "Meta, Google, LinkedIn Ads" },
                        { key: "email", label: "Email / WhatsApp Marketing", desc: "Newsletters & flows" },
                        { key: "seo", label: "Search Engine Optimization (SEO)", desc: "Blog posts & audits" },
                        { key: "influencer", label: "Influencer Marketing", desc: "Campaigns & budgets" },
                      ].map((m) => {
                        const active = newScopeModules[m.key] || false;
                        return (
                          <button
                            key={m.key}
                            type="button"
                            onClick={() => setNewScopeModules(prev => ({ ...prev, [m.key]: !prev[m.key] }))}
                            className={`flex items-start text-left p-3 rounded-xl border transition-all gap-3 ${active
                              ? "border-emerald-600 bg-emerald-50/20"
                              : "border-gray-100 hover:border-gray-200 bg-white"
                              }`}
                          >
                            <div className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${active ? "bg-emerald-600 border-emerald-600 text-white" : "border-gray-300 bg-white"
                              }`}>
                              {active && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-gray-900">{m.label}</p>
                              <p className="text-[10px] text-gray-500 mt-0.5 leading-tight">{m.desc}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Step 1 — Scope Deliverables Builder */}
              {newScopeStep === 1 && (
                <div className="space-y-6">
                  {Object.keys(newScopeModules).filter((k) => newScopeModules[k]).map((modKey) => {
                    const meta = [
                      { key: "social", label: "Social Media Marketing", color: "emerald" },
                      { key: "paid", label: "Paid Performance Ads", color: "blue" },
                      { key: "email", label: "Email / WhatsApp Marketing", color: "purple" },
                      { key: "seo", label: "Search Engine Optimization (SEO)", color: "indigo" },
                      { key: "influencer", label: "Influencer Marketing", color: "amber" },
                    ].find((m) => m.key === modKey) || { key: modKey, label: modKey, color: "gray" };

                    const items = newScopeItems.filter((s) => s.module === modKey);

                    return (
                      <div key={modKey} className="border border-gray-100 rounded-xl p-4 space-y-4 bg-white shadow-sm">
                        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                          <div className="flex items-center gap-2">
                            <span className={`h-2.5 w-2.5 rounded-full bg-${meta.color}-500`} />
                            <h3 className="text-xs font-semibold text-gray-800">{meta.label}</h3>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setNewScopeItems((prev) => [
                                ...prev,
                                {
                                  id: `${modKey}-${crypto.randomUUID().slice(0, 6)}`,
                                  module: modKey,
                                  label: modKey === "social" ? "reel" : "",
                                  unit: "1",
                                  platforms: modKey === "social" ? ["instagram"] : [],
                                },
                              ]);
                            }}
                            className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg transition-colors cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" /> Add Item
                          </button>
                        </div>

                        {items.length === 0 && (
                          <p className="text-xs text-gray-400 italic">No scope items added yet.</p>
                        )}

                        <div className="space-y-4">
                          {items.map((s) => (
                            <div key={s.id} className="grid grid-cols-12 gap-3 items-end border-b border-gray-50 pb-3 last:border-0 last:pb-0">
                              {modKey === "social" ? (
                                <>
                                  <div className="col-span-12 sm:col-span-3 space-y-1">
                                    <label className="text-[10px] font-semibold text-gray-400 uppercase">Deliverable</label>
                                    <select
                                      value={s.label}
                                      onChange={(e) => updateNewScopeItem(s.id, { label: e.target.value })}
                                      className="w-full px-2 py-1.5 border border-gray-200 text-xs rounded-lg bg-white"
                                    >
                                      <option value="">Select...</option>
                                      <option value="reel">Reel</option>
                                      <option value="story">Story</option>
                                      <option value="article/copy">Article / Copy</option>
                                      <option value="static/image">Static / Image</option>
                                      <option value="carousel">Carousel</option>
                                      <option value="video long form">Video Long Form</option>
                                    </select>
                                  </div>

                                  <div className="col-span-4 sm:col-span-2 space-y-1">
                                    <label className="text-[10px] font-semibold text-gray-400 uppercase">Qty / mo</label>
                                    <input
                                      type="number"
                                      min="0"
                                      placeholder="0"
                                      value={s.unit || ""}
                                      onChange={(e) => updateNewScopeItem(s.id, { unit: e.target.value })}
                                      className="w-full px-2 py-1.5 border border-gray-200 text-xs rounded-lg"
                                    />
                                  </div>

                                  <div className="col-span-12 sm:col-span-4 space-y-1">
                                    <label className="text-[10px] font-semibold text-gray-400 uppercase">Platforms</label>
                                    <div className="flex gap-1.5 flex-wrap">
                                      {[
                                        { key: "instagram", icon: instagram, label: "Instagram" },
                                        { key: "facebook", icon: facebook, label: "Facebook" },
                                        { key: "linkedin", icon: linkedin, label: "LinkedIn" },
                                        { key: "youtube", icon: youtube, label: "YouTube" },
                                        { key: "x", icon: twitter, label: "X" },
                                      ].map((p) => {
                                        const selected = (s.platforms || []).includes(p.key);
                                        return (
                                          <button
                                            key={p.key}
                                            type="button"
                                            onClick={() => toggleNewScopePlatform(s.id, p.key)}
                                            title={p.label}
                                            className={`p-1.5 rounded-lg border transition-all cursor-pointer flex items-center justify-center ${selected
                                              ? "bg-emerald-50 border-emerald-300 scale-105"
                                              : "bg-gray-50/50 border-gray-200 hover:bg-gray-100 opacity-60 hover:opacity-100"
                                              }`}
                                          >
                                            <img
                                              src={p.icon.src}
                                              alt={p.label}
                                              className={`w-5 h-5 object-contain transition-transform ${selected ? "scale-110" : ""}`}
                                            />
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>

                                </>
                              ) : (
                                <>
                                  <div className="col-span-12 sm:col-span-6 space-y-1">
                                    <label className="text-[10px] font-semibold text-gray-400 uppercase">Deliverable</label>
                                    <input
                                      type="text"
                                      placeholder="e.g. Meta Ad Creatives, Blogs, etc."
                                      value={s.label}
                                      onChange={(e) => updateNewScopeItem(s.id, { label: e.target.value })}
                                      className="w-full px-2 py-1.5 border border-gray-200 text-xs rounded-lg"
                                    />
                                  </div>

                                  <div className="col-span-6 sm:col-span-3 space-y-1">
                                    <label className="text-[10px] font-semibold text-gray-400 uppercase">Qty / mo</label>
                                    <input
                                      type="number"
                                      min="0"
                                      placeholder="0"
                                      value={s.unit || ""}
                                      onChange={(e) => updateNewScopeItem(s.id, { unit: e.target.value })}
                                      className="w-full px-2 py-1.5 border border-gray-200 text-xs rounded-lg"
                                    />
                                  </div>
                                </>
                              )}

                              <div className="col-span-12 sm:col-span-1 flex justify-end">
                                <button
                                  type="button"
                                  onClick={() => deleteNewScopeItem(s.id)}
                                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-gray-50 rounded-lg transition-all cursor-pointer"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Step 2 — Review & Summary */}
              {newScopeStep === 2 && (
                <div className="space-y-4">
                  <div className="bg-gray-50 border border-gray-150 rounded-xl p-5 space-y-3">
                    <h3 className="text-xs font-semibold text-gray-800 uppercase tracking-wider">Review Contract Period</h3>
                    <div className="grid grid-cols-2 gap-4 text-xs text-gray-600">
                      <div>
                        <p className="text-[10px] text-gray-400 uppercase font-semibold">Scope Period</p>
                        <p className="font-semibold text-gray-900 mt-0.5">{newScopePeriod}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-400 uppercase font-semibold">Label</p>
                        <p className="font-semibold text-gray-900 mt-0.5">{newScopeLabel || "—"}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-xs font-semibold text-gray-800 uppercase tracking-wider">Configured Deliverables</h3>
                    {(() => {
                      const modulesMap: Record<string, string> = {
                        social: "Social Media Marketing",
                        paid: "Paid Performance Ads",
                        email: "Email / WhatsApp Marketing",
                        seo: "Search Engine Optimization (SEO)",
                        influencer: "Influencer Marketing",
                      };

                      return Object.keys(newScopeModules).filter((k) => newScopeModules[k]).map((modKey) => {
                        const items = newScopeItems.filter((s) => s.module === modKey);
                        return (
                          <div key={modKey} className="border border-gray-100 rounded-xl p-4 space-y-2 bg-white">
                            <p className="text-xs font-semibold text-gray-800">{modulesMap[modKey] || modKey}</p>
                            <div className="divide-y divide-gray-50 text-xs text-gray-600">
                              {items.map((item) => (
                                <div key={item.id} className="py-1.5 space-y-0.5">
                                  <div className="flex justify-between">
                                    <div>
                                      <span className="font-medium">{item.label}</span>
                                      {modKey === "social" && item.platforms && item.platforms.length > 0 && (
                                        <span className="text-[9px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded ml-2 font-semibold uppercase border border-emerald-100">
                                          {item.platforms.join(", ")}
                                        </span>
                                      )}
                                    </div>
                                    <span className="font-semibold text-gray-900">{item.unit || "0"} / mo</span>
                                  </div>
                                </div>
                              ))}
                              {items.length === 0 && <p className="text-xs text-gray-400 italic">No deliverables configured.</p>}
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              )}
            </div>

            {/* Modal footer */}
            <div className="flex justify-between items-center p-5 border-t bg-gray-50/50 rounded-b-2xl">
              <button
                onClick={() => {
                  if (newScopeStep === 0) {
                    setShowNewScopeModal(false);
                    setNewScopePeriod("");
                    setNewScopeLabel("");
                    setNewScopeModules({ social: false, paid: false, email: false, seo: false, influencer: false });
                    setNewScopeItems([]);
                  } else {
                    setNewScopeStep((s) => s - 1);
                  }
                }}
                className="px-4 py-2 border border-gray-200 rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-100 bg-white"
              >
                {newScopeStep === 0 ? "Cancel" : "Back"}
              </button>
              {newScopeStep < 2 ? (
                <button
                  onClick={handleNewScopeNext}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold"
                >
                  Next →
                </button>
              ) : (
                <button
                  onClick={handleCreateNewScope}
                  disabled={newScopeSubmitting}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold disabled:opacity-70"
                >
                  {newScopeSubmitting ? "Creating..." : "Create Scope of Work"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {showAddTeamModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white border border-gray-100 rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-scale-up">
            <div className="p-4 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
              <h3 className="text-xs font-semibold text-gray-800 uppercase tracking-wider">Add Team Member</h3>
              <button onClick={() => setShowAddTeamModal(false)} className="text-gray-400 hover:text-gray-600 text-lg">×</button>
            </div>
            <div className="p-4 max-h-[300px] overflow-y-auto space-y-2">
              {(() => {
                const unassigned = teamList.filter(
                  (member) => !client.assignedTeam.some((u) => u._id === member._id)
                );
                if (unassigned.length === 0) {
                  return <p className="text-xs text-gray-500 italic text-center py-6">All available team members are already assigned.</p>;
                }
                return unassigned.map((member) => {
                  const initials = member.name?.split(" ").map((n: string) => n[0]).join("").toUpperCase() || "TM";
                  return (
                    <div key={member._id} className="flex items-center justify-between p-3 border border-gray-50 rounded-lg hover:bg-gray-50 bg-white shadow-sm">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-800 font-semibold text-[10px] flex items-center justify-center">
                          {initials}
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-gray-900">{member.name}</p>
                          <p className="text-[9px] text-gray-500">{member.email}</p>
                        </div>
                      </div>
                      <button
                        onClick={async () => {
                          await handleAssignTeamToggle(member._id);
                          setShowAddTeamModal(false);
                        }}
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-semibold shadow-sm"
                      >
                        Assign
                      </button>
                    </div>
                  );
                });
              })()}
            </div>
            <div className="p-3 border-t border-gray-50 flex justify-end bg-gray-50/50">
              <button onClick={() => setShowAddTeamModal(false)} className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs hover:bg-gray-100 text-gray-600 font-medium">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Upload Progress Toast */}
      {uploadingFile && (
        <div className="fixed top-5 right-5 z-50 w-80 bg-white/95 border border-gray-200/80 shadow-2xl rounded-2xl p-4 backdrop-blur-md transition-all duration-300 flex items-start gap-3">
          <div className="mt-0.5 shrink-0">
            {uploadingFile.status === "uploading" && (
              <div className="relative flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-200 border-t-emerald-600"></div>
                <span className="absolute text-[8px] font-semibold text-emerald-700">{uploadingFile.progress}%</span>
              </div>
            )}
            {uploadingFile.status === "success" && (
              <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 border border-emerald-200 scale-110 transition-transform duration-300">
                <Check className="w-4 h-4 stroke-[3]" />
              </div>
            )}
            {uploadingFile.status === "error" && (
              <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-600 border border-red-200 scale-110 transition-transform duration-300">
                <AlertCircle className="w-4 h-4 stroke-[3]" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-gray-900 truncate">
              {uploadingFile.status === "uploading" && "Uploading File..."}
              {uploadingFile.status === "success" && "Upload Complete!"}
              {uploadingFile.status === "error" && "Upload Failed"}
            </p>
            <p className="text-[10px] text-gray-500 truncate mt-0.5">{uploadingFile.name}</p>
            {uploadingFile.status === "uploading" && (
              <div className="w-full bg-gray-100 rounded-full h-1 mt-2 overflow-hidden">
                <div
                  className="bg-emerald-600 h-1 rounded-full transition-all duration-150 ease-out"
                  style={{ width: `${uploadingFile.progress}%` }}
                ></div>
              </div>
            )}
            {uploadingFile.status === "error" && (
              <p className="text-[10px] text-red-600 mt-1 font-medium leading-tight">
                {uploadingFile.errorMsg || "An error occurred."}
              </p>
            )}
          </div>
          <button
            onClick={() => setUploadingFile(null)}
            className="text-gray-400 hover:text-gray-600 hover:bg-gray-100/50 rounded-lg p-0.5 shrink-0 self-start transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
