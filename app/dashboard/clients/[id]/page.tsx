"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import {
  ArrowLeft, Users, Settings, Shield, FileText, Plus, Trash2,
  ExternalLink, Eye, EyeOff, Copy, PlusCircle, FolderOpen,
  MessageSquare, ClipboardList, FileDown, Globe, Award, UserCheck,
  Save, ChevronDown, ChevronUp, Calendar as CalendarIcon,
  ShieldAlert, KeyRound,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Competitor { name: string; websiteLink: string; socialMediaLink?: string }
interface SocialPresence { platform: string; link: string }
type CredentialCategory = "social" | "website" | "email_tools" | "ads" | "analytics" | "custom";
interface CredentialField { key: string; label: string; type: "text" | "password" | "url" | "email" | "textarea" }
interface Credential { id: string; category: CredentialCategory; label: string; values: Record<string, string> }
interface DocumentItem { id: string; name: string; fileUrl: string; uploadedAt: string }
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
  primaryContact: { name: string; email: string; phone: string };
  aboutBrand?: string; requirementNotes?: string;
  competitors: Competitor[]; socialMediaPresence: SocialPresence[];
  assignedTeam: AssignedTeamUser[]; credentials: Credential[];
  documents: DocumentItem[]; meetingLogs: MeetingLog[];
  scope?: SowScope;
}

interface Deliverable {
  id: string; title: string; platform: string; type: string;
  status: "pending" | "delivered"; scheduledDate: string;
  completedDate?: string; publishedUrl?: string; notes?: string;
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
                    {copied ? <span className="text-[9px] font-bold text-emerald-600">✓</span> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}

// ─── Default new-scope form ───────────────────────────────────────────────────

const DEFAULT_SCOPE_FORM = {
  period: "", label: "",
  socialMedia: {
    instagram: { reels: 0, posts: 0, stories: 0, custom: 0 },
    facebook: { staticCount: 0, reels: 0, posts: 0, stories: 0 },
    youtube: { staticCount: 0, reels: 0, posts: 0, stories: 0 },
    linkedin: { posts: 0 }, x: { posts: 0 },
  },
  paidMedia: {
    metaAds: { adSpend: 0, creatives: 0, commission: 0 },
    googleAds: { adSpend: 0, creatives: 0, commission: 0 },
    linkedinAds: { adSpend: 0, creatives: 0, commission: 0 },
  },
  emailWhatsapp: {
    transactional: { enabled: false, triggers: 0 },
    promotional: { enabled: false, emails: 0 },
  },
  seo: {
    keywords: [] as string[],
    gaAccess: { type: "none" as "login" | "email" | "none", details: "" },
    gtmAccess: { type: "none" as "login" | "email" | "none", details: "" },
    gscAccess: { type: "none" as "login" | "email" | "none", details: "" },
    auditSheetLink: "", docLink: "",
  },
  influencer: { influencersCount: 0, commission: 0, budget: 0 },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const pct = (d: number, c: number) => (c === 0 ? 0 : Math.min(100, Math.round((d / c) * 100)));

function deriveScopeItems(scope: SowScope | undefined, monthDels: Deliverable[]) {
  const D = (platform: string, type: string) =>
    monthDels.filter((d) => d.platform === platform && d.type === type && d.status === "delivered").length;

  const items: { id: string; module: string; label: string; committed: number; delivered: number }[] = [];

  if (scope?.socialMedia) {
    const sm = scope.socialMedia;
    const add = (id: string, lbl: string, c: number, plat: string, tp: string) => {
      if (c > 0) items.push({ id, module: "social", label: lbl, committed: c, delivered: D(plat, tp) });
    };
    add("ig-reel", "Instagram Reels", sm.instagram?.reels || 0, "instagram", "reel");
    add("ig-post", "Instagram Posts", sm.instagram?.posts || 0, "instagram", "post");
    add("ig-story", "Instagram Stories", sm.instagram?.stories || 0, "instagram", "story");
    add("ig-custom", "Instagram Flexible", sm.instagram?.custom || 0, "instagram", "custom");
    add("fb-static", "Facebook Static", sm.facebook?.staticCount || 0, "facebook", "static");
    add("fb-reel", "Facebook Reels", sm.facebook?.reels || 0, "facebook", "reel");
    add("fb-post", "Facebook Posts", sm.facebook?.posts || 0, "facebook", "post");
    add("fb-story", "Facebook Stories", sm.facebook?.stories || 0, "facebook", "story");
    add("yt-short", "YouTube Shorts", sm.youtube?.reels || 0, "youtube", "reel");
    add("yt-video", "YouTube Videos", sm.youtube?.posts || 0, "youtube", "post");
    add("li-post", "LinkedIn Posts", sm.linkedin?.posts || 0, "linkedin", "post");
    add("x-post", "X Posts", sm.x?.posts || 0, "x", "post");
  }

  if (scope?.paidMedia) {
    const pm = scope.paidMedia;
    if ((pm.metaAds?.creatives || 0) > 0) items.push({ id: "meta-ad", module: "paid-ads", label: "Meta Ad Creatives", committed: pm.metaAds!.creatives, delivered: D("meta-ads", "ad") });
    if ((pm.googleAds?.creatives || 0) > 0) items.push({ id: "gads-ad", module: "paid-ads", label: "Google Ad Creatives", committed: pm.googleAds!.creatives, delivered: D("google-ads", "ad") });
    if ((pm.linkedinAds?.creatives || 0) > 0) items.push({ id: "li-ad", module: "paid-ads", label: "LinkedIn Ad Creatives", committed: pm.linkedinAds!.creatives, delivered: D("linkedin-ads", "ad") });
  }

  if (scope?.emailWhatsapp) {
    const ew = scope.emailWhatsapp;
    if (ew.transactional?.enabled && (ew.transactional.triggers || 0) > 0)
      items.push({ id: "ew-trans", module: "email", label: "Transactional Flows", committed: ew.transactional.triggers, delivered: D("email-whatsapp", "seo-task") });
    if (ew.promotional?.enabled && (ew.promotional.emails || 0) > 0)
      items.push({ id: "ew-promo", module: "email", label: "Promotional Campaigns", committed: ew.promotional.emails, delivered: D("email-whatsapp", "email-blast") });
  }

  if (scope?.seo?.keywords && scope.seo.keywords.length > 0)
    items.push({ id: "seo-kw", module: "seo", label: "Target Keywords", committed: scope.seo.keywords.length, delivered: D("seo", "seo-task") });

  if (scope?.influencer && (scope.influencer.influencersCount ?? 0) > 0)
    items.push({ id: "inf", module: "influencer", label: "Influencer Campaigns", committed: scope.influencer.influencersCount!, delivered: D("influencer", "influencer-campaign") });

  return items;
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

  // Doc / meeting state
  const [showAddDoc, setShowAddDoc] = useState(false);
  const [newDoc, setNewDoc] = useState({ name: "", fileUrl: "" });
  const [showAddMeeting, setShowAddMeeting] = useState(false);
  const [newMeeting, setNewMeeting] = useState({ title: "", notes: "", date: "" });

  // Task request state
  const [showAddTaskReq, setShowAddTaskReq] = useState(false);
  const [newTaskReq, setNewTaskReq] = useState({ title: "", description: "", dueDate: "" });

  // Profile tab competitor / social state
  const [newComp, setNewComp] = useState({ name: "", websiteLink: "", socialMediaLink: "" });
  const [newSocial, setNewSocial] = useState({ platform: "instagram", link: "" });

  // Scope of Work tab state
  const [expandedScopeId, setExpandedScopeId] = useState<string | null>(null);
  const [showNewScopeModal, setShowNewScopeModal] = useState(false);
  const [newScopeForm, setNewScopeForm] = useState(DEFAULT_SCOPE_FORM);
  const [newScopeKeyInput, setNewScopeKeyInput] = useState("");
  const [newScopeStep, setNewScopeStep] = useState(0);
  const [newScopeSubmitting, setNewScopeSubmitting] = useState(false);

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

  const handleAddDocSubmit = () => {
    if (!client || !newDoc.name.trim() || !newDoc.fileUrl.trim()) return;
    patchClient({ documents: [...(client.documents || []), { id: crypto.randomUUID(), name: newDoc.name.trim(), fileUrl: newDoc.fileUrl.trim(), uploadedAt: new Date().toISOString() }] });
    setShowAddDoc(false); setNewDoc({ name: "", fileUrl: "" });
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
      const res = await fetch(`/api/clients/${clientId}/scope`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newScopeForm),
      });
      if (res.ok) {
        fetchAllScopes(); fetchClientData();
        setShowNewScopeModal(false);
        setNewScopeForm(DEFAULT_SCOPE_FORM);
        setNewScopeStep(0);
      }
    } catch (err) { console.error(err); }
    finally { setNewScopeSubmitting(false); }
  };

  // ── Derived scope dashboard data ───────────────────────────────────────────

  const thisMonthDels = deliverables.filter((d) => {
    const dt = new Date(d.scheduledDate);
    return dt.getFullYear() === currentYear && dt.getMonth() === currentMonth;
  });
  const scopeItems = deriveScopeItems(client?.scope, thisMonthDels);
  const activeModuleKeys = Array.from(new Set(scopeItems.map((s) => s.module)));

  const totalCommitted = scopeItems.reduce((a, s) => a + s.committed, 0);
  const totalDelivered = scopeItems.reduce((a, s) => a + s.delivered, 0);
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

  // ── Inline helpers ─────────────────────────────────────────────────────────

  const accessBadge = (type?: "login" | "email" | "none") => {
    if (!type || type === "none") return <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-semibold">No Access</span>;
    if (type === "email") return <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-semibold border border-blue-100">Email Access</span>;
    return <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-100">Login Provided</span>;
  };

  const monthName = new Date(currentYear, currentMonth).toLocaleString("default", { month: "long" });

  const nf = (v: number) => v; // number field helper
  const setSM = (path: string[], val: number) =>
    setNewScopeForm((prev) => {
      const next = JSON.parse(JSON.stringify(prev));
      let obj: any = next.socialMedia;
      for (let i = 0; i < path.length - 1; i++) obj = obj[path[i]];
      obj[path[path.length - 1]] = val;
      return next;
    });
  const setPM = (path: string[], val: number) =>
    setNewScopeForm((prev) => {
      const next = JSON.parse(JSON.stringify(prev));
      let obj: any = next.paidMedia;
      for (let i = 0; i < path.length - 1; i++) obj = obj[path[i]];
      obj[path[path.length - 1]] = val;
      return next;
    });

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <Link href="/dashboard/clients" className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-emerald-700 font-medium transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Client Directory
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-100 pb-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-emerald-50 text-emerald-700 font-extrabold text-xl flex items-center justify-center rounded-2xl shadow-sm border border-emerald-100/50">
              {client.brandName.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{client.name}</h1>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-100">{client.industry}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${client.status === "active" ? "bg-emerald-100 text-emerald-800" : "bg-gray-100 text-gray-600"}`}>{client.status}</span>
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

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* CLIENT PROFILE                                                      */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {activeTab === "profile" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm space-y-3">
              <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">About Brand</h4>
              <textarea value={aboutBrandDraft} onChange={(e) => setAboutBrandDraft(e.target.value)} rows={5}
                placeholder="Core value propositions, tone of voice, design aesthetics..."
                className="w-full px-3 py-2 border border-gray-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none text-xs rounded-lg placeholder-gray-400 bg-white resize-none" />
            </div>
            <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm space-y-3">
              <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Requirement Notes</h4>
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
              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Brand Social Media Presence</h3>
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
              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Market Competitors</h3>
              {client.competitors?.map((comp, idx) => (
                <div key={idx} className="text-xs bg-gray-50 p-2.5 rounded-lg border border-gray-100 flex justify-between items-start">
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-gray-800">{comp.name}</p>
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

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* OVERVIEW                                                            */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
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
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{k.label}</p>
                  <p className={`text-xl font-extrabold mt-1 ${(k as any).cls || "text-gray-900"}`}>{k.value}</p>
                </div>
              ))}
            </div>

            {/* Active channel progress */}
            <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm space-y-4">
              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Channel Progress — {monthName} {currentYear}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {activeModuleKeys.length === 0 && <p className="text-xs text-gray-400 italic col-span-2 py-4 text-center">No scope configured yet.</p>}
                {SCOPE_MODULES.filter((m) => activeModuleKeys.includes(m.key)).map((meta) => {
                  const items = scopeItems.filter((s) => s.module === meta.key);
                  const c = items.reduce((a, s) => a + s.committed, 0);
                  const d = items.reduce((a, s) => a + s.delivered, 0);
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
              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Primary Contact</h3>
              <div className="text-xs space-y-2 text-gray-600">
                <p><span className="font-semibold text-gray-900">Name:</span> {client.primaryContact.name}</p>
                <p><span className="font-semibold text-gray-900">Email:</span> {client.primaryContact.email}</p>
                <p><span className="font-semibold text-gray-900">Phone:</span> {client.primaryContact.phone}</p>
              </div>
            </div>
            <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm space-y-3">
              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Business Info</h3>
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

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* SCOPE DASHBOARD — matches ScopeDashboard.tsx reference             */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {activeTab === "calendar" && (
        <div className="space-y-5">
          {/* Month navigation */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button onClick={() => { if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(currentYear - 1); } else setCurrentMonth(currentMonth - 1); }}
                className="p-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-500">
                ‹
              </button>
              <span className="text-sm font-bold text-gray-900 w-36 text-center">{monthName} {currentYear}</span>
              <button onClick={() => { if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(currentYear + 1); } else setCurrentMonth(currentMonth + 1); }}
                className="p-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-500">
                ›
              </button>
            </div>
            <p className="text-xs text-gray-500">Committed vs. delivered for this period</p>
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
                <p className="text-2xl font-bold mt-1 text-gray-900">{k.value}</p>
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
                const items = scopeItems.filter((s) => s.module === meta.key);
                const c = items.reduce((a, s) => a + s.committed, 0);
                const d = items.reduce((a, s) => a + s.delivered, 0);
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
                      <span>Committed: <span className="text-gray-900 font-medium">{c}</span></span>
                      <span>Delivered: <span className="text-gray-900 font-medium">{d}</span></span>
                      <span>Pending: <span className="text-gray-900 font-medium">{Math.max(0, c - d)}</span></span>
                    </div>
                    {/* Per-item sub-rows */}
                    <div className="space-y-1.5 pt-1">
                      {items.map((item) => {
                        const sp = pct(item.delivered, item.committed);
                        return (
                          <div key={item.id} className="text-xs">
                            <div className="flex justify-between mb-0.5">
                              <span className="text-gray-700">{item.label}</span>
                              <span className="text-gray-400">{item.delivered}/{item.committed}</span>
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

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* SCOPE OF WORK — history + create new                               */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {activeTab === "scope" && (
        <div className="space-y-5">
          <div className="flex justify-between items-center border-b pb-3">
            <div>
              <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Scope of Work</h2>
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
              const sm = sow.socialMedia || {};
              const pm = sow.paidMedia || {};
              const ew = sow.emailWhatsapp || {};
              const seo = sow.seo || {};
              const inf = sow.influencer || {};

              return (
                <div key={sow.id} className={`border rounded-xl overflow-hidden shadow-sm ${sow.isActive ? "border-emerald-200 bg-emerald-50/10" : "border-gray-100 bg-white"}`}>
                  {/* Card header */}
                  <button className="w-full flex items-center justify-between p-4 text-left" onClick={() => setExpandedScopeId(isExpanded ? null : sow.id)}>
                    <div className="flex items-center gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-gray-900">{sow.period || sow.label || "Scope of Work"}</span>
                          {sow.label && sow.period && <span className="text-xs text-gray-500">— {sow.label}</span>}
                          {sow.isActive
                            ? <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">Active</span>
                            : <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Historical</span>}
                        </div>
                        <p className="text-[10px] text-gray-400 mt-0.5">Created {new Date(sow.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />}
                  </button>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div className="border-t border-gray-100 p-5 space-y-5 bg-white">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {/* Social Media */}
                        {sm.instagram || sm.facebook || sm.youtube || sm.linkedin || sm.x ? (
                          <div className="space-y-2">
                            <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5"><Globe className="w-3.5 h-3.5 text-emerald-600" /> Social Media / Mo</h4>
                            <div className="border border-gray-100 rounded-lg p-3 divide-y divide-gray-50 bg-gray-50/20 text-xs">
                              {sm.instagram?.reels > 0 && <div className="flex justify-between py-1"><span>Instagram Reels</span><span className="font-semibold">{sm.instagram.reels}</span></div>}
                              {sm.instagram?.posts > 0 && <div className="flex justify-between py-1"><span>Instagram Posts</span><span className="font-semibold">{sm.instagram.posts}</span></div>}
                              {sm.instagram?.stories > 0 && <div className="flex justify-between py-1"><span>Instagram Stories</span><span className="font-semibold">{sm.instagram.stories}</span></div>}
                              {sm.facebook?.reels > 0 && <div className="flex justify-between py-1"><span>Facebook Reels</span><span className="font-semibold">{sm.facebook.reels}</span></div>}
                              {sm.facebook?.posts > 0 && <div className="flex justify-between py-1"><span>Facebook Posts</span><span className="font-semibold">{sm.facebook.posts}</span></div>}
                              {sm.youtube?.reels > 0 && <div className="flex justify-between py-1"><span>YouTube Shorts</span><span className="font-semibold">{sm.youtube.reels}</span></div>}
                              {sm.youtube?.posts > 0 && <div className="flex justify-between py-1"><span>YouTube Videos</span><span className="font-semibold">{sm.youtube.posts}</span></div>}
                              {sm.linkedin?.posts > 0 && <div className="flex justify-between py-1"><span>LinkedIn Posts</span><span className="font-semibold">{sm.linkedin.posts}</span></div>}
                              {sm.x?.posts > 0 && <div className="flex justify-between py-1"><span>X Posts</span><span className="font-semibold">{sm.x.posts}</span></div>}
                            </div>
                          </div>
                        ) : null}

                        {/* Paid Media */}
                        {(pm.metaAds?.creatives > 0 || pm.googleAds?.creatives > 0 || pm.linkedinAds?.creatives > 0) ? (
                          <div className="space-y-2">
                            <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5"><Award className="w-3.5 h-3.5 text-indigo-600" /> Paid Advertising</h4>
                            <div className="border border-gray-100 rounded-lg p-3 divide-y divide-gray-50 bg-gray-50/20 text-xs">
                              {pm.metaAds?.creatives > 0 && <div className="flex justify-between py-1"><span>Meta Ads — Creatives</span><span className="font-semibold">{pm.metaAds.creatives} · ${pm.metaAds.adSpend}/mo</span></div>}
                              {pm.googleAds?.creatives > 0 && <div className="flex justify-between py-1"><span>Google Ads — Creatives</span><span className="font-semibold">{pm.googleAds.creatives} · ${pm.googleAds.adSpend}/mo</span></div>}
                              {pm.linkedinAds?.creatives > 0 && <div className="flex justify-between py-1"><span>LinkedIn Ads — Creatives</span><span className="font-semibold">{pm.linkedinAds.creatives} · ${pm.linkedinAds.adSpend}/mo</span></div>}
                            </div>
                          </div>
                        ) : null}

                        {/* Email / WhatsApp */}
                        {(ew.transactional?.enabled || ew.promotional?.enabled) ? (
                          <div className="space-y-2">
                            <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5"><MessageSquare className="w-3.5 h-3.5 text-amber-600" /> Email & WhatsApp</h4>
                            <div className="border border-gray-100 rounded-lg p-3 divide-y divide-gray-50 bg-gray-50/20 text-xs">
                              {ew.transactional?.enabled && <div className="flex justify-between py-1"><span>Transactional Flows</span><span className="font-semibold">{ew.transactional.triggers} triggers</span></div>}
                              {ew.promotional?.enabled && <div className="flex justify-between py-1"><span>Promotional Campaigns</span><span className="font-semibold">{ew.promotional.emails}/mo</span></div>}
                            </div>
                          </div>
                        ) : null}

                        {/* SEO */}
                        {seo.keywords?.length > 0 ? (
                          <div className="space-y-2">
                            <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5"><Globe className="w-3.5 h-3.5 text-sky-600" /> SEO</h4>
                            <div className="border border-gray-100 rounded-lg p-3 bg-gray-50/20 text-xs space-y-1.5">
                              <p className="font-semibold text-gray-700">Keywords ({seo.keywords.length})</p>
                              <div className="flex flex-wrap gap-1">{seo.keywords.map((k: string) => <span key={k} className="text-[9px] px-1.5 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-100">{k}</span>)}</div>
                              {seo.auditSheetLink && <p className="pt-1"><a href={seo.auditSheetLink} target="_blank" rel="noreferrer" className="text-emerald-600 hover:underline text-[10px]">Audit sheet ↗</a></p>}
                              {seo.docLink && <p><a href={seo.docLink} target="_blank" rel="noreferrer" className="text-emerald-600 hover:underline text-[10px]">Content doc ↗</a></p>}
                            </div>
                          </div>
                        ) : null}

                        {/* Influencer */}
                        {(inf.influencersCount ?? 0) > 0 ? (
                          <div className="space-y-2">
                            <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5"><Users className="w-3.5 h-3.5 text-pink-600" /> Influencer</h4>
                            <div className="border border-gray-100 rounded-lg p-3 bg-gray-50/20 text-xs grid grid-cols-3 gap-3">
                              <div><p className="text-gray-400 text-[9px] uppercase font-bold">Count/Mo</p><p className="font-semibold mt-0.5">{inf.influencersCount}</p></div>
                              <div><p className="text-gray-400 text-[9px] uppercase font-bold">Budget</p><p className="font-semibold mt-0.5">${inf.budget}</p></div>
                              <div><p className="text-gray-400 text-[9px] uppercase font-bold">Commission</p><p className="font-semibold mt-0.5">${inf.commission}</p></div>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* ACCESS CONTROL — matches CredentialVault reference                 */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {activeTab === "access" && (
        <div className="space-y-4">
          {/* SEO Tool Access (pinned above vault) */}
          {client.scope?.seo && (
            <div className="border border-gray-100 rounded-xl p-4 bg-gray-50/30 space-y-3">
              <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-emerald-600" /> SEO Tool Access
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { label: "Google Analytics", field: client.scope.seo.gaAccess },
                  { label: "Google Tag Manager", field: client.scope.seo.gtmAccess },
                  { label: "Google Search Console", field: client.scope.seo.gscAccess },
                ].map(({ label, field }) => (
                  <div key={label} className="bg-white border border-gray-100 rounded-lg p-3 space-y-1.5">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label}</p>
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
                  <h3 className="text-sm font-bold text-gray-900 border-b pb-2">Add credential</h3>
                  <div className="space-y-3 text-xs">
                    {/* Category */}
                    <div className="space-y-1">
                      <label className="font-bold text-gray-500 uppercase">Category</label>
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
                      <label className="font-bold text-gray-500 uppercase">Label</label>
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
                        <label className="font-bold text-gray-500 uppercase">{f.label}</label>
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
                    <button onClick={handleAddCredentialSubmit} className="px-4 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold">Save credential</button>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* ASSIGNED TEAM                                                       */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {activeTab === "team" && (
        <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-6 space-y-5">
          <h2 className="text-sm font-bold text-gray-900 border-b pb-2 uppercase tracking-wider">Assign Internal Team Members</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            {teamList.map((member) => {
              const assigned = client.assignedTeam.some((u) => u._id === member._id);
              return (
                <div key={member._id} className={`flex items-center justify-between p-4 border rounded-xl transition-all ${assigned ? "border-emerald-600 bg-emerald-50/10" : "border-gray-100 hover:border-gray-200"}`}>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center">{member.name.split(" ").map((n: string) => n[0]).join("")}</div>
                    <div>
                      <h4 className="text-xs font-bold text-gray-900">{member.name}</h4>
                      <p className="text-[10px] text-gray-500">{member.email}</p>
                      <div className="flex flex-wrap gap-1 mt-1">{member.roles?.map((r: string) => <span key={r} className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 capitalize">{r}</span>)}</div>
                    </div>
                  </div>
                  <button onClick={() => handleAssignTeamToggle(member._id)} className={`px-3 py-1 rounded-lg text-[10px] font-semibold transition-all ${assigned ? "bg-emerald-600 text-white hover:bg-emerald-700" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}>
                    {assigned ? "Deallocate" : "Allocate"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* DOCUMENTS                                                           */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {activeTab === "documents" && (
        <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-6 space-y-5">
          <div className="flex justify-between items-center border-b pb-2">
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Client Documents & Assets</h2>
            <button onClick={() => setShowAddDoc(true)} className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-semibold rounded-lg shadow-sm"><Plus className="w-3.5 h-3.5" /> Add Document</button>
          </div>
          {client.documents?.length === 0 ? (
            <div className="text-center py-12 border border-dashed rounded-xl"><FolderOpen className="w-8 h-8 text-gray-300 mx-auto" /><p className="text-xs text-gray-500 mt-2 font-medium">No files uploaded yet.</p></div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {client.documents?.map((doc) => (
                <div key={doc.id} className="border border-gray-100 hover:border-gray-200 rounded-xl p-4 bg-gray-50/20 shadow-sm flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0"><FileText className="w-6 h-6 text-emerald-600 shrink-0" /><div className="min-w-0"><p className="text-xs font-bold text-gray-800 truncate">{doc.name}</p><p className="text-[9px] text-gray-400 mt-0.5">{new Date(doc.uploadedAt).toLocaleDateString()}</p></div></div>
                  <div className="flex items-center gap-1 shrink-0">
                    <a href={doc.fileUrl} target="_blank" rel="noreferrer" className="p-1 hover:text-emerald-700 text-gray-400 rounded"><FileDown className="w-4 h-4" /></a>
                    <button onClick={() => handleRemoveDoc(doc.id)} className="p-1 hover:text-red-500 text-gray-400 rounded"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {showAddDoc && (
            <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
              <div className="bg-white border border-gray-100 shadow-xl rounded-2xl max-w-sm w-full p-5 space-y-4">
                <h3 className="text-sm font-bold text-gray-900 border-b pb-2">Add Document</h3>
                <div className="space-y-3 text-xs">
                  <div className="space-y-1"><label className="font-bold text-gray-500 uppercase">Document Name *</label><input type="text" placeholder="e.g. Brand Color Guidelines" value={newDoc.name} onChange={(e) => setNewDoc({ ...newDoc, name: e.target.value })} className="w-full px-3 py-1.5 border rounded-lg" /></div>
                  <div className="space-y-1"><label className="font-bold text-gray-500 uppercase">File Link / URL *</label><input type="url" placeholder="https://drive.google.com/..." value={newDoc.fileUrl} onChange={(e) => setNewDoc({ ...newDoc, fileUrl: e.target.value })} className="w-full px-3 py-1.5 border rounded-lg" /></div>
                </div>
                <div className="flex justify-end gap-2 pt-2"><button onClick={() => setShowAddDoc(false)} className="px-3 py-1.5 border rounded-lg text-xs">Cancel</button><button onClick={handleAddDocSubmit} className="px-4 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold">Add Document</button></div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* MEETING LOGS                                                        */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {activeTab === "meetings" && (
        <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-6 space-y-5">
          <div className="flex justify-between items-center border-b pb-2">
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Meeting Logs & Notes</h2>
            <button onClick={() => setShowAddMeeting(true)} className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-semibold rounded-lg shadow-sm"><Plus className="w-3.5 h-3.5" /> Log Meeting</button>
          </div>
          {client.meetingLogs?.length === 0 ? (
            <div className="text-center py-12 border border-dashed rounded-xl"><MessageSquare className="w-8 h-8 text-gray-300 mx-auto" /><p className="text-xs text-gray-500 mt-2 font-medium">No meeting notes logged yet.</p></div>
          ) : (
            <div className="space-y-4">
              {client.meetingLogs?.map((meeting) => (
                <div key={meeting.id} className="border border-gray-100 rounded-xl p-4 bg-gray-50/20 shadow-sm group space-y-2">
                  <div className="flex justify-between items-start">
                    <div><h4 className="text-xs font-bold text-gray-900">{meeting.title}</h4><p className="text-[9px] text-gray-400 mt-0.5">{new Date(meeting.date).toLocaleDateString()} · {meeting.loggedBy}</p></div>
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
                <h3 className="text-sm font-bold text-gray-900 border-b pb-2">Log Meeting Notes</h3>
                <div className="space-y-3 text-xs">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1"><label className="font-bold text-gray-500 uppercase">Meeting Title *</label><input type="text" placeholder="Weekly Retention Sync" value={newMeeting.title} onChange={(e) => setNewMeeting({ ...newMeeting, title: e.target.value })} className="w-full px-3 py-1.5 border rounded-lg" /></div>
                    <div className="space-y-1"><label className="font-bold text-gray-500 uppercase">Date</label><input type="date" value={newMeeting.date} onChange={(e) => setNewMeeting({ ...newMeeting, date: e.target.value })} className="w-full px-3 py-1.5 border rounded-lg" /></div>
                  </div>
                  <div className="space-y-1"><label className="font-bold text-gray-500 uppercase">Notes & Takeaways *</label><textarea rows={6} placeholder="Action items, decisions, next steps..." value={newMeeting.notes} onChange={(e) => setNewMeeting({ ...newMeeting, notes: e.target.value })} className="w-full px-3 py-2 border rounded-lg" /></div>
                </div>
                <div className="flex justify-end gap-2 pt-2"><button onClick={() => setShowAddMeeting(false)} className="px-3 py-1.5 border rounded-lg text-xs">Cancel</button><button onClick={handleAddMeetingSubmit} className="px-4 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold">Save Meeting Log</button></div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* REQUEST TASKS                                                       */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {activeTab === "requests" && (
        <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-6 space-y-5">
          <div className="flex justify-between items-center border-b pb-2">
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Client Requested Tasks</h2>
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
                      <span className="text-xs font-bold text-gray-900">{task.title}</span>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase ${task.status === "completed" ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : task.status === "approved" ? "bg-indigo-50 text-indigo-700 border border-indigo-100" : task.status === "rejected" ? "bg-red-50 text-red-700 border border-red-100" : "bg-amber-50 text-amber-700 border border-amber-100"}`}>{task.status}</span>
                    </div>
                    <p className="text-xs text-gray-600">{task.description}</p>
                    <p className="text-[9px] text-gray-400">{new Date(task.createdAt).toLocaleDateString()}{task.dueDate && ` · Due: ${new Date(task.dueDate).toLocaleDateString()}`}{task.requestedBy && ` · By: ${task.requestedBy.firstName} ${task.requestedBy.lastName}`}</p>
                  </div>
                  {task.status === "pending" && <div className="flex gap-1.5 shrink-0"><button onClick={() => handleUpdateTaskRequestStatus(task.id, "approved")} className="px-2.5 py-1 bg-emerald-600 text-white rounded text-[10px] font-bold hover:bg-emerald-700">Approve</button><button onClick={() => handleUpdateTaskRequestStatus(task.id, "rejected")} className="px-2.5 py-1 bg-gray-200 text-gray-700 rounded text-[10px] font-semibold hover:bg-gray-300">Reject</button></div>}
                  {task.status === "approved" && <button onClick={() => handleUpdateTaskRequestStatus(task.id, "completed")} className="px-2.5 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-100 rounded text-[10px] font-bold shrink-0">Mark Completed</button>}
                </div>
              ))}
            </div>
          )}
          {showAddTaskReq && (
            <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
              <div className="bg-white border border-gray-100 shadow-xl rounded-2xl max-w-sm w-full p-5 space-y-4">
                <h3 className="text-sm font-bold text-gray-900 border-b pb-2">Request Custom Task</h3>
                <div className="space-y-3 text-xs">
                  <div className="space-y-1"><label className="font-bold text-gray-500 uppercase">Task Title *</label><input type="text" placeholder="e.g. Father's Day Carousel Post" value={newTaskReq.title} onChange={(e) => setNewTaskReq({ ...newTaskReq, title: e.target.value })} className="w-full px-3 py-1.5 border rounded-lg" /></div>
                  <div className="space-y-1"><label className="font-bold text-gray-500 uppercase">Description / Specs *</label><textarea placeholder="Content outline, target platforms..." value={newTaskReq.description} onChange={(e) => setNewTaskReq({ ...newTaskReq, description: e.target.value })} className="w-full px-3 py-1.5 border rounded-lg" rows={3} /></div>
                  <div className="space-y-1"><label className="font-bold text-gray-500 uppercase">Target Due Date</label><input type="date" value={newTaskReq.dueDate} onChange={(e) => setNewTaskReq({ ...newTaskReq, dueDate: e.target.value })} className="w-full px-3 py-1.5 border rounded-lg" /></div>
                </div>
                <div className="flex justify-end gap-2 pt-2"><button onClick={() => setShowAddTaskReq(false)} className="px-3 py-1.5 border rounded-lg text-xs">Cancel</button><button onClick={handleAddTaskReqSubmit} className="px-4 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold">Submit Request</button></div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* NEW SCOPE OF WORK MODAL — multi-step                               */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {showNewScopeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white border border-gray-100 shadow-2xl rounded-2xl w-full max-w-2xl my-8">
            {/* Modal header */}
            <div className="flex items-center justify-between p-5 border-b">
              <div>
                <h2 className="text-sm font-bold text-gray-900">New Scope of Work</h2>
                <p className="text-xs text-gray-500 mt-0.5">Step {newScopeStep + 1} of 5</p>
              </div>
              {/* Step indicators */}
              <div className="flex items-center gap-1.5">
                {["Info", "Social", "Paid Ads", "Email / SEO", "Influencer"].map((s, i) => (
                  <div key={s} className={`h-1.5 rounded-full transition-all ${i === newScopeStep ? "w-6 bg-emerald-600" : i < newScopeStep ? "w-4 bg-emerald-300" : "w-4 bg-gray-200"}`} title={s} />
                ))}
              </div>
            </div>

            <div className="p-6 max-h-[70vh] overflow-y-auto space-y-4">
              {/* Step 0 — Period / Label */}
              {newScopeStep === 0 && (
                <div className="space-y-4">
                  <p className="text-xs text-gray-500">Name this scope period so you can distinguish it from past records.</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-500 uppercase">Period *</label>
                      <input type="text" placeholder="e.g. July 2026 / Q3 2026" value={newScopeForm.period}
                        onChange={(e) => setNewScopeForm({ ...newScopeForm, period: e.target.value })}
                        className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-xs outline-none focus:border-emerald-500" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-500 uppercase">Label (optional)</label>
                      <input type="text" placeholder="e.g. Revised contract, Growth phase" value={newScopeForm.label}
                        onChange={(e) => setNewScopeForm({ ...newScopeForm, label: e.target.value })}
                        className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-xs outline-none focus:border-emerald-500" />
                    </div>
                  </div>
                </div>
              )}

              {/* Step 1 — Social Media */}
              {newScopeStep === 1 && (
                <div className="space-y-4">
                  <p className="text-xs text-gray-500">Set monthly deliverable quantities per social channel.</p>
                  {[
                    { label: "Instagram", key: "instagram", fields: [{ f: "reels", lbl: "Reels" }, { f: "posts", lbl: "Posts" }, { f: "stories", lbl: "Stories" }] },
                    { label: "Facebook", key: "facebook", fields: [{ f: "staticCount", lbl: "Static" }, { f: "reels", lbl: "Reels" }, { f: "posts", lbl: "Posts" }, { f: "stories", lbl: "Stories" }] },
                    { label: "YouTube", key: "youtube", fields: [{ f: "reels", lbl: "Shorts" }, { f: "posts", lbl: "Videos" }] },
                    { label: "LinkedIn", key: "linkedin", fields: [{ f: "posts", lbl: "Posts" }] },
                    { label: "X (Twitter)", key: "x", fields: [{ f: "posts", lbl: "Posts" }] },
                  ].map(({ label, key, fields }) => (
                    <div key={key} className="border border-gray-100 rounded-xl p-4 space-y-2">
                      <p className="text-xs font-bold text-gray-700">{label}</p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {fields.map(({ f, lbl }) => (
                          <div key={f} className="space-y-1">
                            <label className="text-[10px] font-semibold text-gray-400 uppercase">{lbl}</label>
                            <input type="number" min={0} value={(newScopeForm.socialMedia as any)[key][f] || 0}
                              onChange={(e) => setSM([key, f], parseInt(e.target.value) || 0)}
                              className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs outline-none focus:border-emerald-500" />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Step 2 — Paid Ads */}
              {newScopeStep === 2 && (
                <div className="space-y-4">
                  <p className="text-xs text-gray-500">Set ad spend and creative counts per advertising platform.</p>
                  {[
                    { label: "Meta Ads", key: "metaAds" },
                    { label: "Google Ads", key: "googleAds" },
                    { label: "LinkedIn Ads", key: "linkedinAds" },
                  ].map(({ label, key }) => (
                    <div key={key} className="border border-gray-100 rounded-xl p-4 space-y-2">
                      <p className="text-xs font-bold text-gray-700">{label}</p>
                      <div className="grid grid-cols-3 gap-3">
                        {[{ f: "adSpend", lbl: "Ad Spend ($)" }, { f: "creatives", lbl: "Creatives" }, { f: "commission", lbl: "Commission ($)" }].map(({ f, lbl }) => (
                          <div key={f} className="space-y-1">
                            <label className="text-[10px] font-semibold text-gray-400 uppercase">{lbl}</label>
                            <input type="number" min={0} value={(newScopeForm.paidMedia as any)[key][f] || 0}
                              onChange={(e) => setPM([key, f], parseInt(e.target.value) || 0)}
                              className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs outline-none focus:border-emerald-500" />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Step 3 — Email & SEO */}
              {newScopeStep === 3 && (
                <div className="space-y-5">
                  {/* Email / WhatsApp */}
                  <div className="border border-gray-100 rounded-xl p-4 space-y-3">
                    <p className="text-xs font-bold text-gray-700">Email & WhatsApp</p>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <input type="checkbox" id="trans-en" checked={newScopeForm.emailWhatsapp.transactional.enabled}
                          onChange={(e) => setNewScopeForm((prev) => ({ ...prev, emailWhatsapp: { ...prev.emailWhatsapp, transactional: { ...prev.emailWhatsapp.transactional, enabled: e.target.checked } } }))}
                          className="accent-emerald-600" />
                        <label htmlFor="trans-en" className="text-xs font-semibold text-gray-700">Transactional flows</label>
                        {newScopeForm.emailWhatsapp.transactional.enabled && (
                          <input type="number" min={0} placeholder="# triggers" value={newScopeForm.emailWhatsapp.transactional.triggers}
                            onChange={(e) => setNewScopeForm((prev) => ({ ...prev, emailWhatsapp: { ...prev.emailWhatsapp, transactional: { ...prev.emailWhatsapp.transactional, triggers: parseInt(e.target.value) || 0 } } }))}
                            className="w-24 px-2 py-1 border border-gray-200 rounded text-xs outline-none focus:border-emerald-500" />
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <input type="checkbox" id="promo-en" checked={newScopeForm.emailWhatsapp.promotional.enabled}
                          onChange={(e) => setNewScopeForm((prev) => ({ ...prev, emailWhatsapp: { ...prev.emailWhatsapp, promotional: { ...prev.emailWhatsapp.promotional, enabled: e.target.checked } } }))}
                          className="accent-emerald-600" />
                        <label htmlFor="promo-en" className="text-xs font-semibold text-gray-700">Promotional campaigns</label>
                        {newScopeForm.emailWhatsapp.promotional.enabled && (
                          <input type="number" min={0} placeholder="emails/mo" value={newScopeForm.emailWhatsapp.promotional.emails}
                            onChange={(e) => setNewScopeForm((prev) => ({ ...prev, emailWhatsapp: { ...prev.emailWhatsapp, promotional: { ...prev.emailWhatsapp.promotional, emails: parseInt(e.target.value) || 0 } } }))}
                            className="w-24 px-2 py-1 border border-gray-200 rounded text-xs outline-none focus:border-emerald-500" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* SEO */}
                  <div className="border border-gray-100 rounded-xl p-4 space-y-3">
                    <p className="text-xs font-bold text-gray-700">SEO Configuration</p>
                    {/* Keywords */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-gray-400 uppercase">Target Keywords</label>
                      <div className="flex gap-1.5">
                        <input type="text" placeholder="Add keyword..." value={newScopeKeyInput}
                          onChange={(e) => setNewScopeKeyInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && newScopeKeyInput.trim()) {
                              setNewScopeForm((prev) => ({ ...prev, seo: { ...prev.seo, keywords: [...prev.seo.keywords, newScopeKeyInput.trim()] } }));
                              setNewScopeKeyInput("");
                            }
                          }}
                          className="flex-1 px-2 py-1.5 border border-gray-200 rounded-lg text-xs outline-none focus:border-emerald-500" />
                        <button onClick={() => {
                          if (!newScopeKeyInput.trim()) return;
                          setNewScopeForm((prev) => ({ ...prev, seo: { ...prev.seo, keywords: [...prev.seo.keywords, newScopeKeyInput.trim()] } }));
                          setNewScopeKeyInput("");
                        }} className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-semibold">Add</button>
                      </div>
                      <div className="flex flex-wrap gap-1.5 min-h-[28px]">
                        {newScopeForm.seo.keywords.map((k) => (
                          <span key={k} className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-sky-50 text-sky-800 border border-sky-100">
                            {k}
                            <button onClick={() => setNewScopeForm((prev) => ({ ...prev, seo: { ...prev.seo, keywords: prev.seo.keywords.filter((x) => x !== k) } }))} className="text-sky-500 hover:text-red-500 ml-0.5">×</button>
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* GA / GTM / GSC */}
                    {[
                      { key: "gaAccess", label: "Google Analytics" },
                      { key: "gtmAccess", label: "Google Tag Manager" },
                      { key: "gscAccess", label: "Google Search Console" },
                    ].map(({ key, label }) => (
                      <div key={key} className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">{label}</label>
                        <div className="flex gap-2">
                          <select value={(newScopeForm.seo as any)[key].type}
                            onChange={(e) => setNewScopeForm((prev) => ({ ...prev, seo: { ...prev.seo, [key]: { ...(prev.seo as any)[key], type: e.target.value } } }))}
                            className="px-2 py-1.5 border border-gray-200 rounded-lg text-xs bg-white outline-none focus:border-emerald-500">
                            <option value="none">No Access</option><option value="email">Email Access</option><option value="login">Login Provided</option>
                          </select>
                          {(newScopeForm.seo as any)[key].type !== "none" && (
                            <input type="text" placeholder={(newScopeForm.seo as any)[key].type === "email" ? "Enter email address" : "Enter username/URL"}
                              value={(newScopeForm.seo as any)[key].details || ""}
                              onChange={(e) => setNewScopeForm((prev) => ({ ...prev, seo: { ...prev.seo, [key]: { ...(prev.seo as any)[key], details: e.target.value } } }))}
                              className="flex-1 px-2 py-1.5 border border-gray-200 rounded-lg text-xs outline-none focus:border-emerald-500" />
                          )}
                        </div>
                      </div>
                    ))}

                    <div className="grid grid-cols-2 gap-3 pt-1">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">Audit Sheet Link</label>
                        <input type="url" placeholder="https://docs.google.com/..." value={newScopeForm.seo.auditSheetLink}
                          onChange={(e) => setNewScopeForm((prev) => ({ ...prev, seo: { ...prev.seo, auditSheetLink: e.target.value } }))}
                          className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs outline-none focus:border-emerald-500" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">Content Doc Link</label>
                        <input type="url" placeholder="https://docs.google.com/..." value={newScopeForm.seo.docLink}
                          onChange={(e) => setNewScopeForm((prev) => ({ ...prev, seo: { ...prev.seo, docLink: e.target.value } }))}
                          className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs outline-none focus:border-emerald-500" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 4 — Influencer */}
              {newScopeStep === 4 && (
                <div className="space-y-4">
                  <p className="text-xs text-gray-500">Configure influencer marketing scope for this period.</p>
                  <div className="border border-gray-100 rounded-xl p-4 space-y-3">
                    <p className="text-xs font-bold text-gray-700">Influencer Marketing</p>
                    <div className="grid grid-cols-3 gap-3">
                      {[{ f: "influencersCount", lbl: "Influencers / Mo" }, { f: "budget", lbl: "Budget ($)" }, { f: "commission", lbl: "Commission ($)" }].map(({ f, lbl }) => (
                        <div key={f} className="space-y-1">
                          <label className="text-[10px] font-bold text-gray-400 uppercase">{lbl}</label>
                          <input type="number" min={0} value={(newScopeForm.influencer as any)[f] || 0}
                            onChange={(e) => setNewScopeForm((prev) => ({ ...prev, influencer: { ...prev.influencer, [f]: parseInt(e.target.value) || 0 } }))}
                            className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs outline-none focus:border-emerald-500" />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Review summary */}
                  <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 text-xs space-y-1 text-gray-600">
                    <p className="font-bold text-gray-800 mb-2">Summary</p>
                    {newScopeForm.period && <p>Period: <span className="font-semibold text-gray-900">{newScopeForm.period}</span></p>}
                    {newScopeForm.seo.keywords.length > 0 && <p>SEO Keywords: <span className="font-semibold text-gray-900">{newScopeForm.seo.keywords.length}</span></p>}
                    {newScopeForm.paidMedia.metaAds.creatives > 0 && <p>Meta Creatives: <span className="font-semibold text-gray-900">{newScopeForm.paidMedia.metaAds.creatives}</span></p>}
                    {newScopeForm.influencer.influencersCount > 0 && <p>Influencers/Mo: <span className="font-semibold text-gray-900">{newScopeForm.influencer.influencersCount}</span></p>}
                  </div>
                </div>
              )}
            </div>

            {/* Modal footer */}
            <div className="flex justify-between items-center p-5 border-t">
              <button onClick={() => { if (newScopeStep === 0) { setShowNewScopeModal(false); setNewScopeForm(DEFAULT_SCOPE_FORM); } else setNewScopeStep((s) => s - 1); }} className="px-4 py-2 border border-gray-200 rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-50">
                {newScopeStep === 0 ? "Cancel" : "Back"}
              </button>
              {newScopeStep < 4 ? (
                <button onClick={() => { if (newScopeStep === 0 && !newScopeForm.period.trim()) return; setNewScopeStep((s) => s + 1); }} className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700">
                  Next →
                </button>
              ) : (
                <button onClick={handleCreateNewScope} disabled={newScopeSubmitting} className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 disabled:opacity-70">
                  {newScopeSubmitting ? "Saving..." : "Create Scope of Work"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
