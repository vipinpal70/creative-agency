"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, ChevronDown, Loader2, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { CopyList } from "@/components/writer/CopyList";
import { CopyModal } from "@/components/writer/CopyModal";
import type { CopyModalInitialData } from "@/components/writer/CopyModal";
import { AdhocModal, type AdhocFormData } from "@/components/writer/AdhocModal";
import type { WriterDeliverable, CopyFormData } from "@/components/writer/types";
import {
  ADHOC_CATEGORIES,
  ADHOC_FLYER_CATEGORY,
  ADHOC_SOCIAL_PLATFORMS,
} from "@/lib/types";

const PLATFORM_OPTIONS = [...ADHOC_SOCIAL_PLATFORMS];

type ModalState =
  | null
  | { kind: "flyer"; mode: "create" | "edit"; delId?: string; draftId?: string; initial: Partial<AdhocFormData> }
  | { kind: "social"; mode: "create" | "edit"; category: string; delId?: string; draftId?: string; initial: CopyModalInitialData };

interface Props {
  clients: { id: string; companyName: string }[];
  me: { id: string; role: string; roles: string[] } | null;
}

// The Adhoc tab: pick a client + category, then create a standalone copy.
// "Flyer" opens the simple flyer modal; every other category opens the full
// social copy modal (no buckets). Created copies run the normal review cycle
// and also appear in the status queue tabs.
export function AdhocTab({ clients, me }: Props) {
  const { toast } = useToast();

  const [clientId, setClientId] = useState("");
  const [category, setCategory] = useState("");
  const [copies, setCopies] = useState<WriterDeliverable[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState>(null);

  const clientName = clients.find((c) => c.id === clientId)?.companyName;
  const canRecallClientReview = me?.role === "admin" || !!me?.roles?.includes("ACCOUNT_MANAGER");

  const loadCopies = useCallback(async (cid: string) => {
    if (!cid) {
      setCopies([]);
      return;
    }
    setLoading(true);
    try {
      const data = await fetch(`/api/adhoc/copies?clientId=${cid}`).then((r) => r.json());
      setCopies(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCopies(clientId);
  }, [clientId, loadCopies]);

  // ── Open the create modal for the chosen category ──
  const openCreate = () => {
    if (!clientId || !category) return;
    if (category === ADHOC_FLYER_CATEGORY) {
      setModal({ kind: "flyer", mode: "create", initial: { clientId } });
    } else {
      setModal({
        kind: "social",
        mode: "create",
        category,
        initial: { mediaType: category, platforms: [] },
      });
    }
  };

  // ── Create handlers ──
  const createFlyer = async (form: AdhocFormData) => {
    const res = await fetch("/api/adhoc/copies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId,
        category: ADHOC_FLYER_CATEGORY,
        copy: form.copy,
        referenceUrl: form.referenceUrl,
        deliveryDate: form.deliveryDate || null,
        deliveryFormat: form.deliveryFormat,
        title: form.title,
        notes: form.note,
      }),
    });
    await afterWrite(res, "Flyer created");
  };

  const createSocial = async (cat: string, form: CopyFormData) => {
    const res = await fetch("/api/adhoc/copies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId,
        category: cat,
        creativeCopy: form.creativeCopy,
        frames: form.frames,
        caption: form.caption,
        hashtags: form.hashtags.split(/[\s,]+/).filter(Boolean),
        platforms: form.platforms,
        publishDate: form.publishDate || null,
        publishTime: form.publishTime || null,
        referenceUrl: form.referenceUrl,
        videoType: form.videoType,
        videoNotes: form.videoNotes,
        articleMode: form.articleMode,
        articleCopy: form.articleCopy,
        notes: form.note,
      }),
    });
    await afterWrite(res, `${cat} copy created`);
  };

  // ── Edit handlers (PATCH the draft) ──
  const editFlyer = async (delId: string, draftId: string, form: AdhocFormData) => {
    const res = await fetch(`/api/clients/${clientId}/deliverables/${delId}/drafts/${draftId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        creativeCopy: form.copy,
        referenceUrl: form.referenceUrl,
        deliveryFormat: form.deliveryFormat,
        publishDate: form.deliveryDate || null,
        notes: form.note,
      }),
    });
    await afterWrite(res, "Flyer updated");
  };

  const editSocial = async (delId: string, draftId: string, form: CopyFormData) => {
    const isCarousel = form.mediaType.toLowerCase() === "carousel";
    const res = await fetch(`/api/clients/${clientId}/deliverables/${delId}/drafts/${draftId}`, {
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
        notes: form.note,
      }),
    });
    await afterWrite(res, "Copy updated");
  };

  const afterWrite = async (res: Response, okMsg: string) => {
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast({ title: data.error || "Failed to save" });
      return;
    }
    setModal(null);
    toast({ title: okMsg });
    await loadCopies(clientId);
  };

  // ── Row actions ──
  const submitCopy = async (delId: string, draftId: string) => {
    setSubmitting(delId);
    try {
      await fetch(`/api/clients/${clientId}/deliverables/${delId}/drafts/${draftId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "content_internal_review" }),
      });
      toast({ title: "Copy sent for internal review" });
      await loadCopies(clientId);
    } finally {
      setSubmitting(null);
    }
  };

  const submitAll = async () => {
    const drafts = copies.filter((c) => c.latestDraft && c.latestDraft.status === "draft");
    for (const c of drafts) if (c.latestDraft) await submitCopy(c.id, c.latestDraft.id);
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
      await loadCopies(clientId);
    } catch (err: any) {
      toast({ title: err.message || "Failed to recall" });
    } finally {
      setSubmitting(null);
    }
  };

  const removeCopy = async (delId: string) => {
    await fetch(`/api/clients/${clientId}/deliverables/${delId}`, { method: "DELETE" });
    toast({ title: "Copy removed" });
    await loadCopies(clientId);
  };

  const openEdit = (copy: WriterDeliverable) => {
    const d = copy.latestDraft;
    if (!d) return;
    if (copy.type === ADHOC_FLYER_CATEGORY || d.mediaType === ADHOC_FLYER_CATEGORY) {
      setModal({
        kind: "flyer",
        mode: "edit",
        delId: copy.id,
        draftId: d.id,
        initial: {
          clientId,
          title: copy.title || "",
          copy: d.creativeCopy || "",
          referenceUrl: d.referenceUrl || "",
          deliveryDate: d.publishDate ? d.publishDate.slice(0, 10) : "",
          deliveryFormat: d.deliveryFormat ?? "",
          note: d.notes ?? "",
        },
      });
    } else {
      setModal({
        kind: "social",
        mode: "edit",
        category: d.mediaType,
        delId: copy.id,
        draftId: d.id,
        initial: {
          mediaType: d.mediaType,
          creativeCopy: d.creativeCopy,
          frames: d.frames,
          caption: d.caption,
          hashtags: (d.hashtags || []).join(" "),
          publishDate: d.publishDate ? d.publishDate.slice(0, 10) : "",
          publishTime: d.publishTime ?? "",
          platforms: copy.platforms,
          referenceUrl: d.referenceUrl ?? "",
          note: d.notes ?? "",
          videoType: d.videoType ?? "",
          videoNotes: d.videoNotes ?? "",
          articleMode: d.articleMode ?? "",
          articleCopy: d.articleCopy ?? "",
        },
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Client + category picker */}
      <div className="flex items-center gap-3 flex-wrap bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
        <div className="relative">
          <Building2 className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <select
            className="pl-8 pr-7 py-1.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white text-gray-900 min-w-[200px] appearance-none"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            aria-label="Select client"
          >
            <option value="">Select a client…</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.companyName}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
        </div>

        <div className="relative">
          <select
            className="pr-7 py-1.5 px-3 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white text-gray-900 min-w-[160px] appearance-none disabled:opacity-50"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            disabled={!clientId}
            aria-label="Select category"
          >
            <option value="">Select a category…</option>
            {ADHOC_CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
        </div>

        <Button
          disabled={!clientId || !category}
          className="bg-green-700 text-white hover:bg-green-800 transition-colors"
          onClick={openCreate}
        >
          <Plus className="h-4 w-4 mr-1.5" /> New Adhoc
        </Button>
      </div>

      {/* Copies */}
      {!clientId ? (
        <Card>
          <CardContent className="p-10 text-center space-y-2">
            <Building2 className="h-10 w-10 text-muted-foreground/30 mx-auto" />
            <p className="text-sm text-muted-foreground">
              Select a client to view and create adhoc copies.
            </p>
          </CardContent>
        </Card>
      ) : loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading copies…
        </div>
      ) : (
        <CopyList
          copies={copies}
          onRemove={removeCopy}
          onSubmitSingle={submitCopy}
          onSubmitAll={submitAll}
          onOpenEdit={openEdit}
          onRecall={recallCopy}
          canRecallClientReview={canRecallClientReview}
          submitting={submitting}
          module="adhoc"
          title="Adhoc Copies"
        />
      )}

      {/* Flyer modal */}
      {modal?.kind === "flyer" && (
        <AdhocModal
          mode={modal.mode}
          clientName={clientName}
          initial={modal.initial}
          onClose={() => setModal(null)}
          onSave={(form) =>
            modal.mode === "create"
              ? createFlyer(form)
              : editFlyer(modal.delId!, modal.draftId!, form)
          }
        />
      )}

      {/* Social copy modal (all non-flyer categories) */}
      {modal?.kind === "social" && (
        <CopyModal
          mode={modal.mode}
          heading={`${modal.mode === "edit" ? "Edit" : "New"} ${modal.category}`}
          initialData={modal.initial}
          buckets={[]}
          plannedItems={[]}
          platformOptions={PLATFORM_OPTIONS}
          lockMediaType
          showNotes
          historyEndpoint={
            modal.mode === "edit"
              ? `/api/clients/${clientId}/deliverables/${modal.delId}/drafts/${modal.draftId}/history`
              : undefined
          }
          onClose={() => setModal(null)}
          onSave={(form) =>
            modal.mode === "create"
              ? createSocial(modal.category, form)
              : editSocial(modal.delId!, modal.draftId!, form)
          }
        />
      )}
    </div>
  );
}
