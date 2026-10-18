"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Building2, ChevronDown, Calendar, X } from "lucide-react";
import { MODULES } from "@/lib/types";
import { CopyList } from "@/components/writer/CopyList";
import { CopyModal } from "@/components/writer/CopyModal";
import { AdhocModal, type AdhocFormData } from "@/components/writer/AdhocModal";
import { ADHOC_FLYER_CATEGORY, ADHOC_SOCIAL_PLATFORMS } from "@/lib/types";
import { ContentPreviewModal } from "@/components/calendar/ContentPreviewModal";
import { toCalendarCopy } from "@/lib/adapt-copy";
import type { ApprovalCopy } from "@/lib/adapt-copy";
import type { WriterDeliverable, CopyFormData } from "@/components/writer/types";
import { normalizeDraftStatus } from "@/lib/status-flow";
import type { DraftStatus } from "@/lib/status-flow";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

// Local YYYY-MM-DD for the date-range filter default (mirrors the designer
// workspace helper so the two workspaces behave identically).
function getTodayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Default "from" date: one month before today, so the queue opens on at least
// a 1-month window (e.g. 14 Sep → 14 Oct).
function getDefaultStartDate(): string {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// Writer status tabs. Each maps to the DB status(es) listed via
// /api/approvals/copies?mine=1. "Approved" surfaces content_approved and
// everything downstream so the writer keeps visibility of their work as it
// flows through the design/publish pipeline (read-only — no actions render).
export const WRITER_STAGES = [
  { key: "draft",                    label: "Draft",           statuses: "draft" },
  { key: "content_internal_review",  label: "Internal Review", statuses: "content_internal_review" },
  { key: "content_client_review",    label: "Client Review",   statuses: "content_client_review" },
  {
    key: "approved",
    label: "Approved",
    statuses:
      "content_approved,design_in_progress,design_internal_review,design_client_review,design_approved,design_req_change,design_rejected,scheduled,published",
  },
  { key: "rework", label: "Rework", statuses: "content_req_change,rejected" },
] as const;

export type WriterStageKey = (typeof WRITER_STAGES)[number]["key"];

// Flatten an approvals-API copy into the WriterDeliverable shape CopyList
// consumes. module is carried per-row so a mixed-calendar list tags each card
// with its own scope-of-work module.
function toWriterDeliverable(c: ApprovalCopy): WriterDeliverable {
  return {
    id: c.deliverableId,
    type: c.mediaType,
    platforms: c.platforms ?? [],
    title: c.title,
    buckets: c.buckets ?? [],
    status: c.status,
    scheduledDate: c.scheduledDate ?? "",
    module: c.module,
    latestDraft: {
      id: c.draftId,
      version: c.version,
      creativeCopy: c.creativeCopy,
      frames: c.frames ?? [],
      imageUrl: c.imageUrl,
      videoUrl: c.videoUrl,
      thumbnailUrl: c.thumbnailUrl,
      caption: c.caption,
      hashtags: c.hashtags ?? [],
      publishDate: c.publishDate,
      publishTime: c.publishTime,
      mediaType: c.mediaType,
      referenceUrl: c.referenceUrl,
      videoType: c.videoType,
      videoNotes: c.videoNotes,
      articleMode: c.articleMode,
      articleCopy: c.articleCopy,
      headline: c.headline,
      description: c.description,
      cta: c.cta,
      landingUrl: c.landingUrl,
      adCopy: c.adCopy,
      primaryTexts: c.primaryTexts,
      headlines: c.headlines,
      descriptions: c.descriptions,
      adPlatform: c.adPlatform,
      businessName: c.businessName,
      longHeadline: c.longHeadline,
      trackingTemplate: c.trackingTemplate,
      finalUrlSuffix: c.finalUrlSuffix,
      customParameters: c.customParameters,
      status: c.status as DraftStatus,
      rejectionNote: c.rejectionNote,
      highPriority: c.highPriority,
      lastChangedBy: c.lastChangedBy,
    },
  };
}

type EditState = { copy: ApprovalCopy } | null;

// The writer's status queue: a cross-calendar view (all writers' copies) that
// mirrors the designer workspace's tab structure. Creation still lives in the
// "My Calendars" tab; this surface is for tracking and acting on copies that
// are already in the pipeline.
export function WriterCopyQueue({ stage }: { stage: WriterStageKey }) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [copies, setCopies] = useState<ApprovalCopy[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<string | null>(null);

  const [previewCopy, setPreviewCopy] = useState<ApprovalCopy | null>(null);
  const [editState, setEditState] = useState<EditState>(null);

  const [clients, setClients] = useState<{ id: string; companyName: string }[]>([]);
  const [moduleFilter, setModuleFilter] = useState<"all" | "social" | "paid">("all");
  const [clientFilter, setClientFilter] = useState("");
  const [startDate, setStartDate] = useState<string>(getDefaultStartDate);
  const [endDate, setEndDate] = useState<string>("");

  const canRecallClientReview =
    user?.role === "admin" || !!user?.roles?.includes("ACCOUNT_MANAGER");

  const activeStatuses = WRITER_STAGES.find((s) => s.key === stage)!.statuses;

  // Guards against out-of-order responses when switching tabs quickly.
  const reqRef = useRef<string>("");

  const loadCopies = useCallback(async () => {
    const token = `${stage}`;
    reqRef.current = token;
    setLoading(true);
    try {
      const data = await fetch(
        `/api/approvals/copies?status=${activeStatuses}`
      ).then((r) => (r.ok ? r.json() : []));
      const list: ApprovalCopy[] = Array.isArray(data) ? data : [];
      if (reqRef.current === token) setCopies(list);
    } finally {
      if (reqRef.current === token) setLoading(false);
    }
  }, [stage, activeStatuses]);

  useEffect(() => {
    loadCopies();
  }, [loadCopies]);

  useEffect(() => {
    fetch("/api/clients")
      .then((res) => (res.ok ? res.json() : []))
      .then((data: any[]) =>
        setClients(
          data.map((c) => ({ id: c.id, companyName: c.brandName || c.name || "Unknown" }))
        )
      )
      .catch(console.error);
  }, []);

  // Resolve the owning client for a deliverable in the current list — needed
  // because CopyList's row callbacks only pass the deliverable/draft ids.
  const clientForDel = useCallback(
    (delId: string) => copies.find((c) => c.deliverableId === delId)?.clientId,
    [copies]
  );

  // ── Row actions ───────────────────────────────────────────────────
  const submitCopy = async (delId: string, draftId: string) => {
    const clientId = clientForDel(delId);
    if (!clientId) return;
    setSubmitting(delId);
    try {
      const res = await fetch(
        `/api/clients/${clientId}/deliverables/${delId}/drafts/${draftId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "content_internal_review" }),
        }
      );
      if (!res.ok) throw new Error((await res.json()).error || "Failed to submit");
      toast({ title: "Copy sent for internal review" });
      await loadCopies();
    } catch (err: any) {
      toast({ title: err.message || "Failed to submit" });
    } finally {
      setSubmitting(null);
    }
  };

  const submitAll = async () => {
    const drafts = copies.filter(
      (c) => normalizeDraftStatus(c.status) === "draft"
    );
    for (const c of drafts) {
      await submitCopy(c.deliverableId, c.draftId);
    }
  };

  const recallCopy = async (delId: string, draftId: string) => {
    setSubmitting(delId);
    try {
      const res = await fetch(`/api/approvals/copies/${draftId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "recall" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Recall failed");
      toast({ title: "Copy recalled to the previous stage" });
      await loadCopies();
    } catch (err: any) {
      toast({ title: err.message || "Failed to recall" });
    } finally {
      setSubmitting(null);
    }
  };

  const removeCopy = async (delId: string) => {
    const clientId = clientForDel(delId);
    if (!clientId) return;
    try {
      const res = await fetch(`/api/clients/${clientId}/deliverables/${delId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed to remove");
      toast({ title: "Copy removed" });
      await loadCopies();
    } catch (err: any) {
      toast({ title: err.message || "Failed to remove" });
    }
  };

  // ── Edit (drafts / rework only — CopyList gates the button) ─────────
  const openEditModal = (copy: WriterDeliverable) => {
    const raw = copies.find((c) => c.draftId === copy.latestDraft?.id);
    if (raw) setEditState({ copy: raw });
  };

  const handleEditSave = async (form: CopyFormData) => {
    if (!editState) return;
    const { clientId, deliverableId, draftId } = editState.copy;
    const isCarousel = form.mediaType.toLowerCase() === "carousel";
    const res = await fetch(
      `/api/clients/${clientId}/deliverables/${deliverableId}/drafts/${draftId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creativeCopy: isCarousel ? undefined : form.creativeCopy,
          frames: isCarousel ? form.frames : undefined,
          caption: form.caption,
          hashtags: form.hashtags.split(/[\s,]+/).filter(Boolean),
          publishDate: form.publishDate || null,
          publishTime: form.publishTime || null,
          referenceUrl: form.referenceUrl,
          videoType: form.videoType,
          videoNotes: form.videoNotes,
          articleMode: form.articleMode,
          articleCopy: form.articleCopy,
        }),
      }
    );
    const updated = await res.json();
    if (!res.ok) {
      toast({ title: updated.error || "Failed to save" });
      return;
    }
    toast({ title: "Copy updated" });
    setEditState(null);
    await loadCopies();
  };

  // Adhoc copies edit through the adhoc modal (category / delivery date /
  // format), not the social copy modal.
  const handleAdhocEditSave = async (form: AdhocFormData) => {
    if (!editState) return;
    const { clientId, deliverableId, draftId } = editState.copy;
    const res = await fetch(
      `/api/clients/${clientId}/deliverables/${deliverableId}/drafts/${draftId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creativeCopy:   form.copy,
          referenceUrl:   form.referenceUrl,
          mediaType:      form.category,
          deliveryFormat: form.deliveryFormat,
          publishDate:    form.deliveryDate || null,
        }),
      }
    );
    const updated = await res.json();
    if (!res.ok) {
      toast({ title: updated.error || "Failed to save" });
      return;
    }
    toast({ title: "Adhoc request updated" });
    setEditState(null);
    await loadCopies();
  };

  // ── Filters ─────────────────────────────────────────────────────────
  const filteredCopies = useMemo(() => {
    return copies.filter((copy) => {
      if (moduleFilter !== "all" && copy.module !== moduleFilter) return false;
      if (clientFilter && copy.clientId !== clientFilter) return false;
      const rawDate = copy.publishDate || copy.scheduledDate || copy.updatedAt;
      if (rawDate) {
        const d = new Date(rawDate);
        if (!isNaN(d.getTime())) {
          const ymd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
          if (startDate && ymd < startDate) return false;
          if (endDate && ymd > endDate) return false;
        }
      }
      return true;
    });
  }, [copies, moduleFilter, clientFilter, startDate, endDate]);

  const deliverables = useMemo(
    () => filteredCopies.map(toWriterDeliverable),
    [filteredCopies]
  );

  const hasActiveFilters =
    moduleFilter !== "all" ||
    clientFilter !== "" ||
    startDate !== getDefaultStartDate() ||
    endDate !== "";

  const resetFilters = () => {
    setModuleFilter("all");
    setClientFilter("");
    setStartDate(getDefaultStartDate());
    setEndDate("");
  };

  const previewIndex = previewCopy
    ? filteredCopies.findIndex((c) => c.draftId === previewCopy.draftId)
    : -1;
  const hasPrev = previewIndex > 0;
  const hasNext = previewIndex >= 0 && previewIndex < filteredCopies.length - 1;

  return (
    <div className="space-y-4">
      {/* Filters — identical to the My Calendars tab */}
      <div className="flex items-center justify-between gap-3 flex-wrap bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Module pills */}
          <div className="flex items-center gap-2 flex-wrap">
            {(["all", "social", "paid"] as const).map((k) => {
              const m = k === "all" ? null : MODULES.find((x) => x.key === k)!;
              const on = moduleFilter === k;
              return (
                <button
                  key={k}
                  onClick={() => setModuleFilter(k)}
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

          {/* Client select */}
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

          {/* Date Range Filter */}
          <div className="flex items-center gap-1.5 bg-gray-50/80 border border-gray-200 rounded-lg px-2.5 py-1">
            <Calendar className="h-3.5 w-3.5 text-gray-400 shrink-0" />
            <div className="flex items-center gap-1">
              <span className="text-[11px] font-medium text-gray-500">From:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="text-xs bg-transparent border-0 focus:outline-none focus:ring-0 text-gray-800 font-medium p-0"
                title="Start Date"
              />
            </div>
            <span className="text-gray-300 text-xs px-0.5">-</span>
            <div className="flex items-center gap-1">
              <span className="text-[11px] font-medium text-gray-500">To:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="text-xs bg-transparent border-0 focus:outline-none focus:ring-0 text-gray-800 font-medium p-0"
                title="End Date"
              />
            </div>
            {(startDate || endDate) && (
              <button
                type="button"
                onClick={() => {
                  setStartDate("");
                  setEndDate("");
                }}
                className="ml-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-200 p-0.5 transition-colors"
                title="Clear dates"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              className="h-8 text-xs text-red-500 hover:text-red-700 border bg-red-100 hover:bg-red-200 rounded-lg"
            >
              Clear
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading copies…
        </div>
      ) : (
        <CopyList
          copies={deliverables}
          onRemove={removeCopy}
          onSubmitSingle={submitCopy}
          onSubmitAll={submitAll}
          onOpenEdit={openEditModal}
          onRecall={recallCopy}
          onPreview={(copy) => {
            const raw = copies.find((c) => c.draftId === copy.latestDraft?.id);
            if (raw) setPreviewCopy(raw);
          }}
          canRecallClientReview={canRecallClientReview}
          submitting={submitting}
          title={WRITER_STAGES.find((s) => s.key === stage)!.label}
        />
      )}

      {/* Preview — read-only so the writer tracks progress without the
          approve/request-changes controls (approvals belong to AM/Admin). */}
      <ContentPreviewModal
        item={previewCopy ? toCalendarCopy(previewCopy) : null}
        open={!!previewCopy}
        onClose={() => setPreviewCopy(null)}
        onUpdate={() => {}}
        readOnly
        hasPrev={hasPrev}
        hasNext={hasNext}
        onNavigatePrev={() => hasPrev && setPreviewCopy(filteredCopies[previewIndex - 1])}
        onNavigateNext={() => hasNext && setPreviewCopy(filteredCopies[previewIndex + 1])}
      />

      {/* Edit modal. Adhoc flyers use the flyer modal; everything else
          (incl. non-flyer adhoc) uses the social copy modal. */}
      {editState && editState.copy.module === "adhoc" && editState.copy.mediaType === ADHOC_FLYER_CATEGORY && (
        <AdhocModal
          mode="edit"
          clientName={editState.copy.clientName}
          initial={{
            clientId: editState.copy.clientId,
            title: editState.copy.title,
            category: editState.copy.mediaType,
            copy: editState.copy.creativeCopy,
            referenceUrl: editState.copy.referenceUrl ?? "",
            deliveryDate: editState.copy.publishDate
              ? editState.copy.publishDate.slice(0, 10)
              : "",
            deliveryFormat: editState.copy.deliveryFormat ?? "",
          }}
          onClose={() => setEditState(null)}
          onSave={handleAdhocEditSave}
        />
      )}
      {editState && !(editState.copy.module === "adhoc" && editState.copy.mediaType === ADHOC_FLYER_CATEGORY) && (
        <CopyModal
          mode="edit"
          lockMediaType={editState.copy.module === "adhoc"}
          platformOptions={editState.copy.module === "adhoc" ? [...ADHOC_SOCIAL_PLATFORMS] : undefined}
          initialData={{
            mediaType: editState.copy.mediaType,
            creativeCopy: editState.copy.creativeCopy,
            frames: editState.copy.frames,
            caption: editState.copy.caption,
            hashtags: (editState.copy.hashtags || []).join(" "),
            publishDate: editState.copy.publishDate
              ? editState.copy.publishDate.slice(0, 10)
              : "",
            publishTime: editState.copy.publishTime ?? "",
            contentBucket: editState.copy.buckets[0] ?? "",
            platforms: editState.copy.platforms,
            referenceUrl: editState.copy.referenceUrl ?? "",
            videoType: editState.copy.videoType ?? "",
            videoNotes: editState.copy.videoNotes ?? "",
            articleMode: editState.copy.articleMode ?? "",
            articleCopy: editState.copy.articleCopy ?? "",
          }}
          historyEndpoint={`/api/clients/${editState.copy.clientId}/deliverables/${editState.copy.deliverableId}/drafts/${editState.copy.draftId}/history`}
          buckets={editState.copy.buckets ?? []}
          plannedItems={[]}
          onClose={() => setEditState(null)}
          onSave={handleEditSave}
        />
      )}
    </div>
  );
}
