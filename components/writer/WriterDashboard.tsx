"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FileText, Clock, Building2, ChevronRight, CalendarPlus,
  ArrowLeft, Mail, Megaphone, Search, Loader2, Target, Layers, Plus, ShieldCheck, ChevronDown,
} from "lucide-react";

const Instagram = (props: React.ComponentProps<"svg">) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
  </svg>
);

import { useToast } from "@/hooks/use-toast";
import { ObjectiveStep } from "@/components/writer/ObjectiveStep";
import { BucketsStep } from "@/components/writer/BucketsStep";
import { CopyList } from "@/components/writer/CopyList";
import { CopyModal } from "@/components/writer/CopyModal";
import type { CopyModalInitialData } from "@/components/writer/CopyModal";
import { CalendarCreateView } from "@/components/writer/CalendarCreateView";
import { EmailCampaignWizard } from "@/components/writer/EmailCampaignWizard";
import { PaidMediaWizard } from "@/components/writer/PaidMediaWizard";
import { SeoWizard } from "@/components/writer/SeoWizard";
import type {
  WriterCalendar, WriterDeliverable, ContentBucket, CopyFormData,
} from "@/components/writer/types";
import { MODULES } from "@/lib/types";
import type { ModuleKey } from "@/lib/types";
import { normalizeDraftStatus } from "@/lib/status-flow";

type ModuleFilter = "all" | ModuleKey;

type CopyModalState =
  | null
  | { mode: "create" }
  | { mode: "edit"; delId: string; draftId: string; initialData: CopyModalInitialData };
type CalendarsView = "list" | "create";
type FlowStep = "objective" | "buckets" | "copies";

const MODULE_ICONS: Partial<Record<ModuleKey, React.ComponentType<any>>> = {
  social: Instagram,
  email:  Mail,
  paid:   Megaphone,
  seo:    Search,
};

export default function WriterDashboard() {
  const { toast } = useToast();

  // ── Calendar list state ──
  const [calendars, setCalendars]       = useState<WriterCalendar[]>([]);
  const [loading, setLoading]           = useState(true);
  const [filter, setFilter]             = useState<ModuleFilter>("all");
  const [calendarsView, setCalendarsView] = useState<CalendarsView>("list");

  // ── Active calendar / workspace state ──
  const [activeCalendar, setActiveCalendar] = useState<WriterCalendar | null>(null);
  const [activeTab, setActiveTab]           = useState("calendars");
  const [flowStep, setFlowStep]             = useState<FlowStep>("objective");

  // ── Objective & buckets (local editing, saved on Next) ──
  const [localObjective, setLocalObjective]   = useState("");
  const [localBuckets, setLocalBuckets]       = useState<ContentBucket[]>([]);
  const [savingMeta, setSavingMeta]           = useState(false);

  // ── Copies (deliverables + latest drafts) ──
  const [copies, setCopies]               = useState<WriterDeliverable[]>([]);
  const [loadingCopies, setLoadingCopies] = useState(false);
  const [submitting, setSubmitting]       = useState<string | null>(null);

  // ── Copy modal (create or edit) ──
  const [copyModal, setCopyModal] = useState<CopyModalState>(null);

  // ── Central Client filter state ──
  const [clients, setClients] = useState<{ id: string; companyName: string }[]>([]);
  const [clientFilter, setClientFilter] = useState<string>("");

  // ── Load calendars ──
  const loadCalendars = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetch("/api/writer/calendars").then((r) => r.json());
      setCalendars(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadCalendars(); }, [loadCalendars]);

  // ── Load clients ──
  useEffect(() => {
    fetch("/api/clients")
      .then((res) => (res.ok ? res.json() : []))
      .then((data: any[]) =>
        setClients(
          data.map((c) => ({
            id: c.id,
            companyName: c.brandName || c.name || "Unknown",
          }))
        )
      )
      .catch(console.error);
  }, []);

  // ── Load copies when entering copies step ──
  const loadCopies = useCallback(async (cal: WriterCalendar) => {
    setLoadingCopies(true);
    try {
      const dels: any[] = await fetch(
        `/api/clients/${cal.clientId}/deliverables?calendarId=${cal.id}`
      ).then((r) => r.json());

      const withDrafts = await Promise.all(
        dels.map(async (d) => {
          const drafts: any[] = await fetch(
            `/api/clients/${cal.clientId}/deliverables/${d.id}/drafts`
          ).then((r) => r.json());
          return { ...d, latestDraft: drafts[0] ?? null } as WriterDeliverable;
        })
      );
      setCopies(withDrafts);
    } finally {
      setLoadingCopies(false);
    }
  }, []);

  // ── Open a calendar in the workspace ──
  // Skip objective/buckets steps if data already exists in DB
  const openCalendar = (cal: WriterCalendar) => {
    setActiveCalendar(cal);
    setLocalObjective(cal.objective || "");
    setLocalBuckets(
      (cal.buckets || []).map((name) => ({ id: crypto.randomUUID(), name, description: "" }))
    );
    setCopies([]);
    setActiveTab("work");

    const hasObjective = !!cal.objective?.trim();
    const hasBuckets   = cal.buckets && cal.buckets.length > 0;

    if (hasObjective && hasBuckets) {
      setFlowStep("copies");
      loadCopies(cal);
    } else if (hasObjective) {
      setFlowStep("buckets");
    } else {
      setFlowStep("objective");
    }
  };

  const exitWork = () => {
    setActiveTab("calendars");
    setActiveCalendar(null);
    setCopies([]);
  };

  // ── Save objective → PATCH calendar ──
  const saveObjective = async () => {
    if (!activeCalendar) return;
    setSavingMeta(true);
    await fetch(`/api/clients/${activeCalendar.clientId}/calendars/${activeCalendar.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ objective: localObjective }),
    });
    setActiveCalendar((c) => c ? { ...c, objective: localObjective } : c);
    setSavingMeta(false);
  };

  // ── Save buckets → PATCH calendar ──
  const saveBuckets = async () => {
    if (!activeCalendar) return;
    setSavingMeta(true);
    const bucketNames = localBuckets.map((b) => b.name).filter((n) => n.trim());
    await fetch(`/api/clients/${activeCalendar.clientId}/calendars/${activeCalendar.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ buckets: bucketNames }),
    });
    setActiveCalendar((c) => c ? { ...c, buckets: bucketNames } : c);
    setSavingMeta(false);
  };

  // ── Add a copy: POST deliverable + draft ──
  const addCopy = async (form: CopyFormData) => {
    if (!activeCalendar) return;
    const delRes = await fetch(`/api/clients/${activeCalendar.clientId}/deliverables`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        calendarId:    activeCalendar.id,
        module:        activeCalendar.module,
        type:          form.mediaType,
        platforms:     form.platforms,
        title:         form.frames && form.frames.length > 0
                         ? form.frames[0].copy.trim().slice(0, 80) || `${form.mediaType} – ${form.platforms.join(", ")}`
                         : form.creativeCopy.trim().slice(0, 80) || `${form.mediaType} – ${form.platforms.join(", ")}`,
        buckets:       form.contentBucket ? [form.contentBucket] : [],
        scheduledDate: form.publishDate || new Date().toISOString(),
        notes:         "",
      }),
    });
    const del = await delRes.json();
    if (!delRes.ok) { toast({ title: del.error || "Failed to save copy" }); return; }

    const draftRes = await fetch(
      `/api/clients/${activeCalendar.clientId}/deliverables/${del.id}/drafts`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creativeCopy: form.creativeCopy,
          frames:       form.frames ?? [],
          caption:      form.caption,
          hashtags:     form.hashtags.split(/[\s,]+/).filter(Boolean),
          publishDate:  form.publishDate || null,
          publishTime:  form.publishTime || null,
          mediaType:    form.mediaType,
          referenceUrl: form.referenceUrl,
          videoType:    form.videoType,
          videoNotes:   form.videoNotes,
          articleMode:  form.articleMode,
          articleCopy:  form.articleCopy,
        }),
      }
    );
    const draft = await draftRes.json();

    setCopies((prev) => [...prev, { ...del, latestDraft: draftRes.ok ? draft : null }]);
    toast({ title: "Copy added to calendar" });
  };

  // ── Submit one copy for internal review ──
  const submitCopy = async (delId: string, draftId: string) => {
    if (!activeCalendar) return;
    setSubmitting(delId);
    try {
      await fetch(
        `/api/clients/${activeCalendar.clientId}/deliverables/${delId}/drafts/${draftId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "content_internal_review" }),
        }
      );
      setCopies((prev) =>
        prev.map((c) =>
          c.id === delId
            ? { ...c, status: "content_internal_review", latestDraft: c.latestDraft ? { ...c.latestDraft, status: "content_internal_review" } : null }
            : c
        )
      );
      toast({ title: "Copy sent for internal review" });
    } finally {
      setSubmitting(null);
    }
  };

  // ── Submit all draft copies ──
  const submitAll = async () => {
    if (!activeCalendar) return;
    const drafts = copies.filter(
      (c) => c.latestDraft && normalizeDraftStatus(c.latestDraft.status) === "draft"
    );
    for (const c of drafts) {
      if (c.latestDraft) await submitCopy(c.id, c.latestDraft.id);
    }
  };

  // ── Open the modal to edit an existing draft ──
  const openEditModal = (copy: WriterDeliverable) => {
    const draft = copy.latestDraft;
    if (!draft) return;
    setCopyModal({
      mode: "edit",
      delId: copy.id,
      draftId: draft.id,
      initialData: {
        mediaType:     copy.type,
        creativeCopy:  draft.creativeCopy,
        frames:        draft.frames,
        caption:       draft.caption,
        hashtags:      (draft.hashtags || []).join(" "),
        publishDate:   draft.publishDate ? draft.publishDate.slice(0, 10) : "",
        publishTime:   draft.publishTime ?? "",
        contentBucket: copy.buckets[0] ?? "",
        platforms:     copy.platforms,
        referenceUrl:  draft.referenceUrl ?? "",
        videoType:     draft.videoType ?? "",
        videoNotes:    draft.videoNotes ?? "",
        articleMode:   draft.articleMode ?? "",
        articleCopy:   draft.articleCopy ?? "",
      },
    });
  };

  // ── Handle modal save (create or edit) ──
  const handleModalSave = async (form: CopyFormData) => {
    if (!copyModal) return;
    if (copyModal.mode === "create") {
      await addCopy(form);
    } else {
      const { delId, draftId } = copyModal;
      if (!activeCalendar) return;
      const isCarousel = form.mediaType.toLowerCase() === "carousel";
      const res = await fetch(
        `/api/clients/${activeCalendar.clientId}/deliverables/${delId}/drafts/${draftId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            creativeCopy: isCarousel ? undefined : form.creativeCopy,
            frames:       isCarousel ? form.frames : undefined,
            caption:      form.caption,
            hashtags:     form.hashtags.split(/[\s,]+/).filter(Boolean),
            publishDate:  form.publishDate || null,
            publishTime:  form.publishTime || null,
            referenceUrl: form.referenceUrl,
            videoType:    form.videoType,
            videoNotes:   form.videoNotes,
            articleMode:  form.articleMode,
            articleCopy:  form.articleCopy,
          }),
        }
      );
      const updated = await res.json();
      if (!res.ok) { toast({ title: updated.error || "Failed to save" }); return; }
      setCopies((prev) =>
        prev.map((c) =>
          c.id === delId ? { ...c, latestDraft: { ...c.latestDraft!, ...updated } } : c
        )
      );
      toast({ title: "Copy updated" });
    }
    setCopyModal(null);
  };

  // ── Remove a copy (delete deliverable) ──
  const removeCopy = async (delId: string) => {
    if (!activeCalendar) return;
    await fetch(`/api/clients/${activeCalendar.clientId}/deliverables/${delId}`, { method: "DELETE" });
    setCopies((prev) => prev.filter((c) => c.id !== delId));
    toast({ title: "Copy removed" });
  };

  const filtered = (filter === "all" ? calendars : calendars.filter((c) => c.module === filter))
    .filter((c) => !clientFilter || c.clientId === clientFilter);

  const calPlannedItems = activeCalendar?.plannedItems ?? [];

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Writer's Workspace</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Multi-channel production hub — social, email, paid, SEO.
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <a href="/dashboard/approvals">
            <ShieldCheck className="h-4 w-4 mr-1.5" /> Approvals
          </a>
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="calendars">My Calendars</TabsTrigger>
          <TabsTrigger value="work" disabled={!activeCalendar}>
            {activeCalendar ? `Working: ${activeCalendar.name}` : "Workspace"}
          </TabsTrigger>
        </TabsList>

        {/* ─────────────────── CALENDARS TAB ─────────────────── */}
        <TabsContent value="calendars" className="mt-4 space-y-4">
          {calendarsView === "create" ? (
            <CalendarCreateView
              onBack={() => setCalendarsView("list")}
              onCreated={(cal) => {
                setCalendars((prev) => [cal, ...prev]);
                setCalendarsView("list");
                openCalendar(cal);
              }}
            />
          ) : (
            <>
              {/* Filters + New button */}
              <div className="flex items-center justify-between gap-3 flex-wrap bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    {(["all", "social", "email", "paid", "seo", "video", "design"] as ModuleFilter[]).map((k) => {
                      const m = k === "all" ? null : MODULES.find((x) => x.key === k)!;
                      const on = filter === k;
                      return (
                        <button
                          key={k}
                          onClick={() => setFilter(k)}
                          className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                            on ? "border-transparent" : "border-border text-muted-foreground hover:text-foreground"
                          }`}
                          style={
                            on && m
                              ? { background: `hsl(var(--mod-${m.tone}) / 0.12)`, color: `hsl(var(--mod-${m.tone}))` }
                              : on
                                ? { background: "hsl(var(--accent))" }
                                : undefined
                          }
                        >
                          {m?.label ?? "All"}
                        </button>
                      );
                    })}
                  </div>

                  <div className="relative">
                    <Building2 className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                    <select
                      className="pl-8 pr-7 py-1.5 rounded-lg border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white text-gray-900 min-w-[180px] appearance-none"
                      value={clientFilter}
                      onChange={(e) => setClientFilter(e.target.value)}
                      aria-label="Filter by client"
                    >
                      <option value="">All Clients</option>
                      {clients.map((c) => (
                        <option key={c.id} value={c.id}>{c.companyName}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                <Button size="sm" onClick={() => setCalendarsView("create")}>
                  <CalendarPlus className="h-4 w-4 mr-1.5" /> New Calendar
                </Button>
              </div>

              {/* Calendar list */}
              {loading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading calendars…
                </div>
              ) : filtered.length === 0 ? (
                <Card>
                  <CardContent className="p-10 text-center space-y-3">
                    <CalendarPlus className="h-10 w-10 text-muted-foreground/30 mx-auto" />
                    <p className="text-sm text-muted-foreground">
                      No calendars yet. Create your first one to get started.
                    </p>
                    <Button size="sm" onClick={() => setCalendarsView("create")}>
                      <CalendarPlus className="h-4 w-4 mr-1.5" /> Create Calendar
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                filtered.map((cal) => {
                  const m = MODULES.find((x) => x.key === cal.module);
                  const Icon = MODULE_ICONS[cal.module as ModuleKey] ?? FileText;
                  const { totalPlanned, totalCreated } = cal.progress;
                  const pct = totalPlanned > 0 ? Math.round((totalCreated / totalPlanned) * 100) : 0;

                  const STATUS_COLOR: Record<string, string> = {
                    draft:     "bg-muted text-muted-foreground",
                    active:    "bg-blue-100 text-blue-700",
                    completed: "bg-green-100 text-green-700",
                    paused:    "bg-amber-100 text-amber-700",
                  };

                  return (
                    <Card
                      key={cal.id}
                      className="cursor-pointer hover:shadow-md hover:border-primary/20 transition-all"
                      onClick={() => openCalendar(cal)}
                    >
                      <CardContent className="p-4 flex items-center gap-3">
                        <div
                          className="h-10 w-10 rounded-lg flex items-center justify-center shrink-0"
                          style={{ background: m ? `hsl(var(--mod-${m.tone}) / 0.12)` : "hsl(var(--accent))" }}
                        >
                          <Icon
                            className="h-5 w-5"
                            style={{ color: m ? `hsl(var(--mod-${m.tone}))` : "hsl(var(--muted-foreground))" }}
                          />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-semibold text-foreground truncate">{cal.name}</p>
                            <span
                              className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${STATUS_COLOR[cal.status] || "bg-muted text-muted-foreground"}`}
                            >
                              {cal.status}
                            </span>
                            {m && (
                              <span
                                className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                                style={{
                                  background: `hsl(var(--mod-${m.tone}) / 0.12)`,
                                  color:      `hsl(var(--mod-${m.tone}))`,
                                }}
                              >
                                {m.label}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
                            <span className="flex items-center gap-1">
                              <Building2 className="h-3 w-3" />
                              {cal.clientName}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {new Date(cal.startDate).toLocaleDateString()} – {new Date(cal.endDate).toLocaleDateString()}
                            </span>
                          </div>

                          {/* Progress bar */}
                          {totalPlanned > 0 && (
                            <div className="mt-2 flex items-center gap-2">
                              <Progress value={pct} className="h-1.5 flex-1" />
                              <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                                {totalCreated}/{totalPlanned} copies
                              </span>
                            </div>
                          )}
                        </div>

                        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </>
          )}
        </TabsContent>

        {/* ─────────────────── WORKSPACE TAB ─────────────────── */}
        <TabsContent value="work" className="mt-4 space-y-4">
          {activeCalendar && (
            <>
              {/* Back + breadcrumb */}
              <div className="flex items-center gap-2 text-xs">
                <Button variant="ghost" size="sm" className="h-7 px-2" onClick={exitWork}>
                  <ArrowLeft className="h-3 w-3 mr-1" /> My Calendars
                </Button>
                <span className="text-muted-foreground">|</span>
                <span className="font-medium text-foreground">{activeCalendar.clientName}</span>
                <span className="text-muted-foreground">·</span>
                <span className="text-foreground">{activeCalendar.name}</span>
              </div>

              {/* Calendar header card */}
              <Card className="bg-muted/30">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Calendar</p>
                      <p className="text-sm font-semibold text-foreground">{activeCalendar.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {new Date(activeCalendar.startDate).toLocaleDateString()} – {new Date(activeCalendar.endDate).toLocaleDateString()}
                        {" · "}{activeCalendar.clientName}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Progress</p>
                      <p className="text-sm font-semibold text-foreground">
                        {activeCalendar.progress.totalCreated} / {activeCalendar.progress.totalPlanned} copies
                      </p>
                    </div>
                  </div>

                  {/* Planned items chips */}
                  {activeCalendar.plannedItems.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {activeCalendar.plannedItems.map((item) => (
                        <span
                          key={item.scopeItemId}
                          className="text-[11px] px-2.5 py-1 rounded-full bg-primary/10 text-primary font-medium"
                        >
                          {item.label}: {item.plannedQty}/{item.totalInScope}
                        </span>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* ── Social module: full objective → buckets → copies flow ── */}
              {activeCalendar.module === "social" && (
                <>
                  {/* Step indicator */}
                  <div className="flex items-center gap-2 text-xs">
                    {(["objective", "buckets", "copies"] as FlowStep[]).map((s, i) => (
                      <span key={s} className="flex items-center gap-1.5">
                        <button
                          className={`${flowStep === s ? "text-primary font-semibold" : "text-muted-foreground hover:text-foreground"}`}
                          onClick={() => {
                            if (s === "copies" && activeCalendar) loadCopies(activeCalendar);
                            setFlowStep(s);
                          }}
                        >
                          {i + 1}. {s.charAt(0).toUpperCase() + s.slice(1)}
                        </button>
                        {i < 2 && <span className="text-muted-foreground">→</span>}
                      </span>
                    ))}
                  </div>

                  {/* Step 1: Objective */}
                  {flowStep === "objective" && (
                    <ObjectiveStep
                      objective={localObjective}
                      onChange={setLocalObjective}
                      onNext={async () => {
                        await saveObjective();
                        if (!localBuckets.length) {
                          setLocalBuckets([{ id: crypto.randomUUID(), name: "", description: "" }]);
                        }
                        setFlowStep("buckets");
                      }}
                    />
                  )}

                  {/* Step 2: Buckets */}
                  {flowStep === "buckets" && (
                    <BucketsStep
                      buckets={localBuckets}
                      onChange={setLocalBuckets}
                      onBack={() => setFlowStep("objective")}
                      onNext={async () => {
                        await saveBuckets();
                        await loadCopies(activeCalendar);
                        setFlowStep("copies");
                      }}
                    />
                  )}

                  {/* Step 3: Copies */}
                  {flowStep === "copies" && (
                    <div className="space-y-4">
                      {/* Objective + buckets summary */}
                      <Card>
                        <CardContent className="p-4 flex items-start justify-between gap-3">
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-1.5">
                              <Target className="h-3.5 w-3.5 text-muted-foreground" />
                              <p className="text-xs uppercase tracking-wide text-muted-foreground">Objective</p>
                            </div>
                            <p className="text-sm text-foreground">{activeCalendar.objective || localObjective || "—"}</p>
                            {(activeCalendar.buckets.length > 0 || localBuckets.some(b => b.name)) && (
                              <div className="flex flex-wrap gap-1.5 pt-1">
                                {(activeCalendar.buckets.length > 0 ? activeCalendar.buckets : localBuckets.map(b => b.name))
                                  .filter(Boolean)
                                  .map((name, i) => (
                                    <span key={i} className="text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-full font-medium">
                                      {name}
                                    </span>
                                  ))}
                              </div>
                            )}
                          </div>
                          <Button variant="outline" size="sm" onClick={() => setFlowStep("buckets")}>
                            <Layers className="h-3 w-3 mr-1" /> Edit
                          </Button>
                        </CardContent>
                      </Card>

                      {loadingCopies ? (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground py-4 justify-center">
                          <Loader2 className="h-4 w-4 animate-spin" /> Loading copies…
                        </div>
                      ) : (
                        <>
                          <div className="flex justify-end">
                            <Button onClick={() => setCopyModal({ mode: "create" })}>
                              <Plus className="h-4 w-4 mr-1.5" /> Add New Copy
                            </Button>
                          </div>
                          <CopyList
                            copies={copies}
                            onRemove={removeCopy}
                            onSubmitSingle={submitCopy}
                            onSubmitAll={submitAll}
                            onOpenEdit={openEditModal}
                            submitting={submitting}
                          />
                        </>
                      )}
                    </div>
                  )}
                </>
              )}

              {/* ── Email module ── */}
              {activeCalendar.module === "email" && (
                <EmailCampaignWizard
                  taskTitle={activeCalendar.name}
                  client={activeCalendar.clientName}
                  onCancel={exitWork}
                  onComplete={exitWork}
                />
              )}

              {/* ── Paid module ── */}
              {activeCalendar.module === "paid" && (
                <PaidMediaWizard
                  taskTitle={activeCalendar.name}
                  client={activeCalendar.clientName}
                  onCancel={exitWork}
                  onComplete={exitWork}
                />
              )}

              {/* ── SEO module ── */}
              {activeCalendar.module === "seo" && (
                <SeoWizard
                  taskTitle={activeCalendar.name}
                  client={activeCalendar.clientName}
                  onCancel={exitWork}
                  onComplete={exitWork}
                />
              )}

              {/* ── Other modules: show copies directly ── */}
              {!["social", "email", "paid", "seo"].includes(activeCalendar.module) && (
                <div className="space-y-4">
                  <Card className="bg-muted/30">
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground">
                        {activeCalendar.objective || "No objective set for this calendar."}
                      </p>
                    </CardContent>
                  </Card>
                  {loadingCopies ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground py-4 justify-center">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => loadCopies(activeCalendar)}
                        >
                          Load Copies
                        </Button>
                        <Button size="sm" onClick={() => setCopyModal({ mode: "create" })}>
                          <Plus className="h-4 w-4 mr-1.5" /> Add New Copy
                        </Button>
                      </div>
                      <CopyList
                        copies={copies}
                        onRemove={removeCopy}
                        onSubmitSingle={submitCopy}
                        onSubmitAll={submitAll}
                        onOpenEdit={openEditModal}
                        submitting={submitting}
                      />
                    </>
                  )}
                </div>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* ── Central Copy Modal (create / edit) ── */}
      {copyModal && (
        <CopyModal
          mode={copyModal.mode}
          initialData={copyModal.mode === "edit" ? copyModal.initialData : undefined}
          historyEndpoint={
            copyModal.mode === "edit" && activeCalendar
              ? `/api/clients/${activeCalendar.clientId}/deliverables/${copyModal.delId}/drafts/${copyModal.draftId}/history`
              : undefined
          }
          buckets={
            activeCalendar
              ? activeCalendar.buckets.length > 0
                ? activeCalendar.buckets
                : localBuckets.map((b) => b.name).filter(Boolean)
              : []
          }
          plannedItems={calPlannedItems}
          onClose={() => setCopyModal(null)}
          onSave={handleModalSave}
        />
      )}
    </div>
  );
}
