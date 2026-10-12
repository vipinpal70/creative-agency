"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Zap, Building2, ChevronDown, Loader2, Plus, FileText, PenLine, X, Save,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { CopyList } from "@/components/writer/CopyList";
import type { WriterDeliverable } from "@/components/writer/types";

type AdhocType = "flyer" | "unstructured";

// Form fields for an adhoc copy. Flyer uses the full set; unstructured uses
// only title + copy (a freeform body the writer just writes).
interface AdhocForm {
  copy: string;
  caption: string;
  referenceUrl: string;
  publishDate: string;
  publishTime: string;
  title: string;
}

const EMPTY_FORM: AdhocForm = {
  copy: "", caption: "", referenceUrl: "", publishDate: "", publishTime: "", title: "",
};

type ModalState =
  | null
  | { mode: "create"; type: AdhocType }
  | { mode: "edit"; type: AdhocType; delId: string; draftId: string; initial: AdhocForm };

const LABEL = "text-xs font-semibold text-muted-foreground uppercase tracking-wider";

export default function AdhocWorkspace() {
  const { toast } = useToast();

  const [clients, setClients] = useState<{ id: string; companyName: string }[]>([]);
  const [clientId, setClientId] = useState<string>("");
  const [copies, setCopies] = useState<WriterDeliverable[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState>(null);
  const [me, setMe] = useState<{ id: string; role: string; roles: string[] } | null>(null);

  // ── Load clients + current user ──
  useEffect(() => {
    fetch("/api/clients")
      .then((res) => (res.ok ? res.json() : []))
      .then((data: any[]) =>
        setClients(
          data.map((c) => ({ id: c.id, companyName: c.brandName || c.name || "Unknown" }))
        )
      )
      .catch(console.error);
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user)
          setMe({ id: data.user.id, role: data.user.role, roles: data.user.roles ?? [] });
      })
      .catch(console.error);
  }, []);

  // ── Load adhoc copies for the selected client ──
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

  // ── Create (flyer / unstructured) ──
  const createCopy = async (type: AdhocType, form: AdhocForm) => {
    const res = await fetch("/api/adhoc/copies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId,
        type,
        copy: form.copy,
        caption: form.caption,
        referenceUrl: form.referenceUrl,
        publishDate: form.publishDate || null,
        publishTime: form.publishTime || null,
        title: form.title,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast({ title: data.error || "Failed to create copy" });
      return;
    }
    setCopies((prev) => [data, ...prev]);
    toast({ title: `${type === "flyer" ? "Flyer" : "Unstructured copy"} created` });
  };

  // ── Edit an existing draft ──
  const editCopy = async (delId: string, draftId: string, form: AdhocForm) => {
    const res = await fetch(
      `/api/clients/${clientId}/deliverables/${delId}/drafts/${draftId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creativeCopy: form.copy,
          caption: form.caption,
          referenceUrl: form.referenceUrl,
          publishDate: form.publishDate || null,
          publishTime: form.publishTime || null,
        }),
      }
    );
    const updated = await res.json();
    if (!res.ok) {
      toast({ title: updated.error || "Failed to save" });
      return;
    }
    setCopies((prev) =>
      prev.map((c) =>
        c.id === delId ? { ...c, latestDraft: { ...c.latestDraft!, ...updated } } : c
      )
    );
    toast({ title: "Copy updated" });
  };

  const handleModalSave = async (form: AdhocForm) => {
    if (!modal) return;
    if (modal.mode === "create") await createCopy(modal.type, form);
    else await editCopy(modal.delId, modal.draftId, form);
    setModal(null);
  };

  // ── Submit one copy for internal review ──
  const submitCopy = async (delId: string, draftId: string) => {
    setSubmitting(delId);
    try {
      await fetch(`/api/clients/${clientId}/deliverables/${delId}/drafts/${draftId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "content_internal_review" }),
      });
      setCopies((prev) =>
        prev.map((c) =>
          c.id === delId
            ? {
                ...c,
                status: "content_internal_review",
                latestDraft: c.latestDraft
                  ? { ...c.latestDraft, status: "content_internal_review" }
                  : null,
              }
            : c
        )
      );
      toast({ title: "Copy sent for internal review" });
    } finally {
      setSubmitting(null);
    }
  };

  const submitAll = async () => {
    const drafts = copies.filter((c) => c.latestDraft && c.latestDraft.status === "draft");
    for (const c of drafts) if (c.latestDraft) await submitCopy(c.id, c.latestDraft.id);
  };

  // ── Recall one stage back (enforced server-side) ──
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
      setCopies((prev) =>
        prev.map((c) =>
          c.id === delId
            ? {
                ...c,
                status: data.status,
                latestDraft: c.latestDraft ? { ...c.latestDraft, status: data.status } : null,
              }
            : c
        )
      );
      toast({ title: "Copy recalled to the previous stage" });
    } catch (err: any) {
      toast({ title: err.message || "Failed to recall" });
    } finally {
      setSubmitting(null);
    }
  };

  // ── Remove a draft copy ──
  const removeCopy = async (delId: string) => {
    await fetch(`/api/clients/${clientId}/deliverables/${delId}`, { method: "DELETE" });
    setCopies((prev) => prev.filter((c) => c.id !== delId));
    toast({ title: "Copy removed" });
  };

  const openEdit = (copy: WriterDeliverable) => {
    const d = copy.latestDraft;
    if (!d) return;
    const type: AdhocType = copy.type === "unstructured" ? "unstructured" : "flyer";
    setModal({
      mode: "edit",
      type,
      delId: copy.id,
      draftId: d.id,
      initial: {
        copy: d.creativeCopy || "",
        caption: d.caption || "",
        referenceUrl: d.referenceUrl || "",
        publishDate: d.publishDate ? d.publishDate.slice(0, 10) : "",
        publishTime: d.publishTime ?? "",
        title: copy.title || "",
      },
    });
  };

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <Zap className="w-5 h-5" /> Adhoc Workspace
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Create one-off flyers and freeform copies directly for a client — no calendar needed.
          </p>
        </div>
      </div>

      {/* Client selector + add actions */}
      <div className="flex items-center justify-between gap-3 flex-wrap bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
        <div className="relative">
          <Building2 className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <select
            className="pl-8 pr-7 py-1.5 rounded-lg border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white text-gray-900 min-w-[220px] appearance-none"
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

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            disabled={!clientId}
            onClick={() => setModal({ mode: "create", type: "unstructured" })}
          >
            <PenLine className="h-4 w-4 mr-1.5" /> Add Unstructured Copy
          </Button>
          <Button
            disabled={!clientId}
            className="bg-green-700 text-white hover:bg-green-800 transition-colors"
            onClick={() => setModal({ mode: "create", type: "flyer" })}
          >
            <Plus className="h-4 w-4 mr-1.5" /> Add Flyer
          </Button>
        </div>
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
          canRecallClientReview={me?.role === "admin" || !!me?.roles?.includes("ACCOUNT_MANAGER")}
          submitting={submitting}
          module="adhoc"
          title="Adhoc Copies"
        />
      )}

      {modal && (
        <AdhocCopyModal
          type={modal.type}
          initial={modal.mode === "edit" ? modal.initial : EMPTY_FORM}
          onClose={() => setModal(null)}
          onSave={handleModalSave}
        />
      )}
    </div>
  );
}

// ── Adhoc copy modal (create / edit) ─────────────────────────────────────────
function AdhocCopyModal({
  type,
  initial,
  onClose,
  onSave,
}: {
  type: AdhocType;
  initial: AdhocForm;
  onClose: () => void;
  onSave: (form: AdhocForm) => Promise<void>;
}) {
  const [form, setForm] = useState<AdhocForm>(initial);
  const [saving, setSaving] = useState(false);
  const isFlyer = type === "flyer";
  const today = new Date().toLocaleDateString("en-CA");

  const set = (patch: Partial<AdhocForm>) => setForm((f) => ({ ...f, ...patch }));
  const isValid = form.copy.trim().length > 0;

  const handleSave = async () => {
    if (!isValid || saving) return;
    setSaving(true);
    try {
      await onSave(form);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3.5">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
              {isFlyer ? <FileText className="h-4 w-4 text-primary" /> : <PenLine className="h-4 w-4 text-primary" />}
            </div>
            <h2 className="text-base font-semibold text-foreground">
              {isFlyer ? "Flyer Copy" : "Unstructured Copy"}
            </h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 rounded-full p-1 hover:bg-gray-100">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-5">
          {/* Title — primary handle for unstructured copies */}
          <div className="space-y-2">
            <label className={LABEL}>
              Title {isFlyer && <span className="normal-case font-normal text-muted-foreground">(optional)</span>}
            </label>
            <Input
              placeholder={isFlyer ? "Short label for this flyer…" : "Give this copy a title…"}
              value={form.title}
              onChange={(e) => set({ title: e.target.value })}
            />
          </div>

          {/* Copy — required for both */}
          <div className="space-y-2">
            <label className={LABEL}>Copy *</label>
            <Textarea
              placeholder={isFlyer ? "The flyer copy / content…" : "Write the copy…"}
              className={isFlyer ? "min-h-[120px]" : "min-h-[200px]"}
              value={form.copy}
              onChange={(e) => set({ copy: e.target.value })}
            />
          </div>

          {/* Flyer-only structured fields */}
          {isFlyer && (
            <>
              <div className="space-y-2">
                <label className={LABEL}>Caption</label>
                <Textarea
                  placeholder="Caption that accompanies the flyer…"
                  className="min-h-[80px]"
                  value={form.caption}
                  onChange={(e) => set({ caption: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <label className={LABEL}>
                  Reference URL <span className="normal-case font-normal text-muted-foreground">(optional)</span>
                </label>
                <Input
                  type="url"
                  placeholder="https://example.com/inspiration"
                  value={form.referenceUrl}
                  onChange={(e) => set({ referenceUrl: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className={LABEL}>Publish Date</label>
                  <Input
                    type="date"
                    min={today}
                    value={form.publishDate}
                    onChange={(e) => set({ publishDate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className={LABEL}>Publish Time</label>
                  <Input
                    type="time"
                    value={form.publishTime}
                    onChange={(e) => set({ publishTime: e.target.value })}
                  />
                </div>
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-100 px-5 py-3.5">
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={!isValid || saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}
