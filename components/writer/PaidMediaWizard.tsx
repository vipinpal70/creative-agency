"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, Megaphone, Target, X, Pencil } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { CopyList } from "@/components/writer/CopyList";
import { VariantModal } from "@/components/writer/VariantModal";
import type { VariantModalInitialData } from "@/components/writer/VariantModal";
import { AdPreviewCard } from "@/components/writer/AdPreviewCard";
import { CAMPAIGN_PLATFORMS, FUNNEL_STAGES } from "@/components/writer/CampaignCreateView";
import type { WriterCalendar, WriterDeliverable, CopyFormData, DraftSnapshot } from "@/components/writer/types";
import { normalizeDraftStatus } from "@/lib/status-flow";

type VariantModalState =
  | null
  | { mode: "create"; index: number }
  | { mode: "edit"; index: number; delId: string; draftId: string; initialData: VariantModalInitialData };

interface Props {
  campaign: WriterCalendar;
  me: { id: string; role: string; roles: string[] } | null;
  onEditCampaign?: () => void;
}

const platformLabel = (id: string) =>
  CAMPAIGN_PLATFORMS.find((p) => p.id === id)?.label ?? id;

export function PaidCampaignWorkspace({ campaign, me, onEditCampaign }: Props) {
  const { toast } = useToast();

  const [variants, setVariants]     = useState<WriterDeliverable[]>([]);
  const [loading, setLoading]       = useState(true);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [modal, setModal]           = useState<VariantModalState>(null);
  const [previewVariant, setPreviewVariant] = useState<WriterDeliverable | null>(null);

  const clientId = campaign.clientId;

  // ── Load variants (deliverables + latest draft) ──
  const loadVariants = useCallback(async () => {
    setLoading(true);
    try {
      const dels: any[] = await fetch(
        `/api/clients/${clientId}/deliverables?calendarId=${campaign.id}`
      ).then((r) => r.json());

      const withDrafts = await Promise.all(
        (Array.isArray(dels) ? dels : []).map(async (d) => {
          const drafts: any[] = await fetch(
            `/api/clients/${clientId}/deliverables/${d.id}/drafts`
          ).then((r) => r.json());
          return { ...d, latestDraft: drafts[0] ?? null } as WriterDeliverable;
        })
      );
      setVariants(withDrafts);
    } finally {
      setLoading(false);
    }
  }, [clientId, campaign.id]);

  useEffect(() => { loadVariants(); }, [loadVariants]);

  // ── Add a variant: POST deliverable + draft ──
  const addVariant = async (form: CopyFormData) => {
    const delRes = await fetch(`/api/clients/${clientId}/deliverables`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        calendarId:    campaign.id,
        module:        "paid",
        type:          form.mediaType,
        // Paid variants inherit the campaign's platforms.
        platforms:     campaign.platforms ?? [],
        title:         form.headline?.trim().slice(0, 80)
                         || form.creativeCopy.trim().slice(0, 80)
                         || form.frames?.[0]?.copy.trim().slice(0, 80)
                         || `${form.mediaType} ad copy`,
        buckets:       [],
        scheduledDate: form.publishDate || new Date().toISOString(),
        notes:         "",
      }),
    });
    const del = await delRes.json();
    if (!delRes.ok) { toast({ title: del.error || "Failed to save ad copy" }); return; }

    const draftRes = await fetch(
      `/api/clients/${clientId}/deliverables/${del.id}/drafts`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mediaType:    form.mediaType,
          creativeCopy: form.creativeCopy,   // primary text
          frames:       form.frames ?? [],
          referenceUrl: form.referenceUrl,   // reference url
          publishDate:  form.publishDate || null,
          headline:     form.headline,
          description:  form.description,
          primaryTexts: form.primaryTexts,
          headlines:    form.headlines,
          descriptions: form.descriptions,
          cta:          form.cta,
          landingUrl:   form.landingUrl,
          adCopy:       form.adCopy,
          videoType:    form.videoType,
          videoNotes:   form.videoNotes,
        }),
      }
    );
    const draft = await draftRes.json();
    setVariants((prev) => [...prev, { ...del, latestDraft: draftRes.ok ? draft : null }]);
    toast({ title: "Ad copy added to campaign" });
  };

  // ── Submit a variant for internal review ──
  const submitVariant = async (delId: string, draftId: string) => {
    setSubmitting(delId);
    try {
      await fetch(`/api/clients/${clientId}/deliverables/${delId}/drafts/${draftId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "content_internal_review" }),
      });
      setVariants((prev) =>
        prev.map((c) =>
          c.id === delId
            ? { ...c, status: "content_internal_review", latestDraft: c.latestDraft ? { ...c.latestDraft, status: "content_internal_review" } : null }
            : c
        )
      );
      toast({ title: "Ad copy sent for internal review" });
    } finally {
      setSubmitting(null);
    }
  };

  const submitAll = async () => {
    const drafts = variants.filter(
      (c) => c.latestDraft && normalizeDraftStatus(c.latestDraft.status) === "draft"
    );
    for (const c of drafts) {
      if (c.latestDraft) await submitVariant(c.id, c.latestDraft.id);
    }
  };

  // ── Recall a variant one stage back ──
  const recallVariant = async (delId: string, draftId: string) => {
    setSubmitting(delId);
    try {
      const res = await fetch(`/api/approvals/copies/${draftId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "recall" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Recall failed");
      const newStatus = data.status as DraftSnapshot["status"];
      setVariants((prev) =>
        prev.map((c) =>
          c.id === delId
            ? { ...c, status: newStatus, latestDraft: c.latestDraft ? { ...c.latestDraft, status: newStatus } : null }
            : c
        )
      );
      toast({ title: "Ad copy recalled to the previous stage" });
    } catch (err: any) {
      toast({ title: err.message || "Failed to recall" });
    } finally {
      setSubmitting(null);
    }
  };

  const removeVariant = async (delId: string) => {
    await fetch(`/api/clients/${clientId}/deliverables/${delId}`, { method: "DELETE" });
    setVariants((prev) => prev.filter((c) => c.id !== delId));
    toast({ title: "Ad copy removed" });
  };

  // ── Open edit modal ──
  const openEditModal = (variant: WriterDeliverable) => {
    const draft = variant.latestDraft;
    if (!draft) return;
    const idx = variants.findIndex((v) => v.id === variant.id) + 1;
    setModal({
      mode: "edit",
      index: idx,
      delId: variant.id,
      draftId: draft.id,
      initialData: {
        mediaType:    variant.type,
        creativeCopy: draft.creativeCopy,
        frames:       draft.frames,
        referenceUrl: draft.referenceUrl ?? "",
        headline:     draft.headline ?? "",
        description:  draft.description ?? "",
        primaryTexts: draft.primaryTexts ?? [],
        headlines:    draft.headlines ?? [],
        descriptions: draft.descriptions ?? [],
        cta:          draft.cta ?? "Learn More",
        landingUrl:   draft.landingUrl ?? "",
        adCopy:       draft.adCopy ?? "",
        publishDate:  draft.publishDate ? draft.publishDate.slice(0, 10) : "",
        videoType:    draft.videoType ?? "",
        videoNotes:   draft.videoNotes ?? "",
      },
    });
  };

  // ── Handle modal save (create or edit) ──
  const handleModalSave = async (form: CopyFormData) => {
    if (!modal) return;
    if (modal.mode === "create") {
      await addVariant(form);
    } else {
      const { delId, draftId } = modal;
      const res = await fetch(
        `/api/clients/${clientId}/deliverables/${delId}/drafts/${draftId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            creativeCopy: form.creativeCopy,
            frames:       form.frames ?? [],
            referenceUrl: form.referenceUrl,
            publishDate:  form.publishDate || null,
            headline:     form.headline,
            description:  form.description,
            primaryTexts: form.primaryTexts,
            headlines:    form.headlines,
            descriptions: form.descriptions,
            cta:          form.cta,
            landingUrl:   form.landingUrl,
            adCopy:       form.adCopy,
            videoType:    form.videoType,
            videoNotes:   form.videoNotes,
          }),
        }
      );
      const updated = await res.json();
      if (!res.ok) { toast({ title: updated.error || "Failed to save" }); return; }
      setVariants((prev) =>
        prev.map((c) => (c.id === delId ? { ...c, latestDraft: { ...c.latestDraft!, ...updated } } : c))
      );
      toast({ title: "Ad copy updated" });
    }
    setModal(null);
  };

  const draftCount    = variants.filter((v) => v.latestDraft && normalizeDraftStatus(v.latestDraft.status) === "draft").length;
  const inReviewCount = variants.length - draftCount;

  return (
    <div className="space-y-4">
      {/* Campaign header */}
      <Card className="bg-muted/30">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2 min-w-0">
              <Target className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
              <div className="space-y-1 min-w-0">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Campaign Brief</p>
                <p className="text-sm text-foreground whitespace-pre-wrap">{campaign.objective || "—"}</p>
              </div>
            </div>
            {onEditCampaign && (
              <Button variant="outline" size="sm" className="shrink-0" onClick={onEditCampaign}>
                <Pencil className="h-3.5 w-3.5 mr-1.5" /> Edit Campaign
              </Button>
            )}
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            {(campaign.platforms ?? []).map((p) => (
              <span key={p} className="text-[11px] px-3 py-1 rounded-full bg-blue-100/90 text-blue-800 font-medium dark:bg-blue-950 dark:text-blue-300 border border-blue-200/50">
                {platformLabel(p)}
              </span>
            ))}
            {(campaign.funnelStages ?? []).map((f) => (
              <span key={f} className="text-[11px] px-3 py-1 rounded-full bg-purple-100/90 text-purple-800 font-medium dark:bg-purple-950 dark:text-purple-300 border border-purple-200/50">
                {FUNNEL_STAGES.find((s) => s.id === f)?.label ?? f}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-4 justify-center">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading ad copies…
        </div>
      ) : (
        <>
          <div className="flex justify-end">
            <Button onClick={() => setModal({ mode: "create", index: variants.length + 1 })}>
              <Plus className="h-4 w-4 mr-1.5" /> Add Ad Copy
            </Button>
          </div>

          <CopyList
            copies={variants}
            noun="ad copy"
            title="Campaign Ad Copies"
            module="paid"
            onRemove={removeVariant}
            onSubmitSingle={submitVariant}
            onSubmitAll={submitAll}
            onOpenEdit={openEditModal}
            onRecall={recallVariant}
            onPreview={setPreviewVariant}
            canRecallClientReview={me?.role === "admin" || !!me?.roles?.includes("ACCOUNT_MANAGER")}
            submitting={submitting}
          />

          {/* Complete Overview */}
          {variants.length > 0 && (
            <Card>
              <CardContent className="p-4 space-y-2 text-sm">
                <div className="flex items-center gap-2 mb-1">
                  <Megaphone className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm font-semibold text-foreground">Complete Overview</p>
                </div>
                <OverviewRow label="Client" value={campaign.clientName} />
                <OverviewRow label="Campaign" value={campaign.name} />
                <OverviewRow
                  label="Platforms"
                  value={(campaign.platforms ?? []).map(platformLabel).join(", ") || "—"}
                />
                <OverviewRow label="Funnel stages" value={(campaign.funnelStages ?? []).join(", ") || "—"} />
                <OverviewRow label="Ad copies" value={String(variants.length)} />
                <OverviewRow label="Drafts / In review" value={`${draftCount} draft · ${inReviewCount} submitted`} />
              </CardContent>
            </Card>
          )}
        </>
      )}

      {modal && (
        <VariantModal
          mode={modal.mode}
          index={modal.index}
          initialData={modal.mode === "edit" ? modal.initialData : undefined}
          historyEndpoint={
            modal.mode === "edit"
              ? `/api/clients/${clientId}/deliverables/${modal.delId}/drafts/${modal.draftId}/history`
              : undefined
          }
          onClose={() => setModal(null)}
          onSave={handleModalSave}
        />
      )}

      {previewVariant?.latestDraft && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 overflow-y-auto"
          onClick={() => setPreviewVariant(null)}
        >
          <div className="w-full max-w-sm space-y-3 my-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-white">Ad Preview</p>
              <button
                onClick={() => setPreviewVariant(null)}
                className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="h-4 w-4 text-white" />
              </button>
            </div>
            <AdPreviewCard
              mediaType={previewVariant.type}
              primaryTexts={previewVariant.latestDraft.primaryTexts}
              primaryText={previewVariant.latestDraft.creativeCopy}
              frames={previewVariant.latestDraft.frames}
              imageUrl={previewVariant.latestDraft.imageUrl}
              videoUrl={previewVariant.latestDraft.videoUrl}
              thumbnailUrl={previewVariant.latestDraft.thumbnailUrl}
              headlines={previewVariant.latestDraft.headlines}
              headline={previewVariant.latestDraft.headline}
              descriptions={previewVariant.latestDraft.descriptions}
              description={previewVariant.latestDraft.description}
              cta={previewVariant.latestDraft.cta}
              landingUrl={previewVariant.latestDraft.landingUrl}
              adCopy={previewVariant.latestDraft.adCopy}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function OverviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-border pb-2 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-foreground font-medium text-right">{value}</span>
    </div>
  );
}
