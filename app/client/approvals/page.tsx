"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, AlertCircle, ShieldCheck, Check, X, Eye, Calendar } from "lucide-react";
import { toast, Toaster } from "sonner";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { STATUS_LABEL, STATUS_COLOR } from "@/lib/status-flow";
import { ContentPreviewModal } from "@/components/calendar/ContentPreviewModal";
import { toCalendarCopy } from "@/lib/adapt-copy";
import type { ApprovalCopy } from "@/lib/adapt-copy";

type TabKey = "content" | "design" | "history";

const TABS: { key: TabKey; label: string }[] = [
  { key: "content", label: "📄 Content Review" },
  { key: "design", label: "🎨 Design Review" },
  { key: "history", label: "🗂 History" },
];

// Inline "request changes" note form.
function RejectForm({ onCancel, onConfirm, busy }: { onCancel: () => void; onConfirm: (note: string) => void; busy: boolean }) {
  const [note, setNote] = useState("");
  return (
    <div className="space-y-2 pt-2 border-t border-gray-100 mt-2">
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={2}
        placeholder="What changes would you like? (optional)"
        className="w-full text-xs border border-gray-200 rounded-lg p-2 outline-none focus:border-rose-400"
      />
      <div className="flex gap-2 justify-end">
        <button onClick={onCancel} disabled={busy} className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">Cancel</button>
        <button onClick={() => onConfirm(note)} disabled={busy} className="text-xs px-3 py-1.5 rounded-lg bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-60 inline-flex items-center gap-1">
          {busy && <Loader2 className="h-3 w-3 animate-spin" />} Send request
        </button>
      </div>
    </div>
  );
}

// Client portal Approvals — mirrors the staff approvals layout with three tabs
// (content client review, design client review, history). All data is
// backend-scoped to the caller's own client via /api/client/approvals.
export default function ClientApprovalsPage() {
  const [tab, setTab] = useState<TabKey>("content");
  const [copies, setCopies] = useState<ApprovalCopy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [preview, setPreview] = useState<ApprovalCopy | null>(null);

  const load = useCallback((which: TabKey) => {
    setLoading(true);
    fetch(`/api/client/approvals?tab=${which}`)
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || "Failed to load");
        setCopies(Array.isArray(data) ? data : []);
        setError(null);
      })
      .catch((e) => setError(e.message || "Unable to load your approvals."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(tab); }, [tab, load]);

  const act = async (draftId: string, action: "approve" | "reject", note?: string) => {
    setBusyId(draftId);
    try {
      const res = await fetch(`/api/approvals/copies/${draftId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, note }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Action failed");
      toast.success(action === "approve" ? "Approved" : "Change request sent");
      setRejectingId(null);
      load(tab);
    } catch (e: any) {
      toast.error(e.message || "Action failed");
    } finally {
      setBusyId(null);
    }
  };

  const showActions = tab !== "history";

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      <Toaster position="top-right" />
      <div>
        <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
          <ShieldCheck className="h-5 w-5" /> Approvals
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Review, approve, and track your content and designs.</p>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)}>
        <TabsList>
          {TABS.map((t) => (
            <TabsTrigger key={t.key} value={t.key}>{t.label}</TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-20 justify-center">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : error ? (
        <div className="flex flex-col items-center gap-3 py-20 text-center">
          <AlertCircle className="h-10 w-10 text-red-400" />
          <p className="text-sm text-red-600">{error}</p>
        </div>
      ) : copies.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20 text-center border-2 border-dashed border-gray-100 rounded-xl">
          <ShieldCheck className="h-10 w-10 text-gray-200" />
          <p className="text-sm text-gray-500">
            {tab === "history" ? "No approved or rejected items yet." : "Nothing awaiting your review right now ✨"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {copies.map((copy) => {
            const busy = busyId === copy.draftId;
            return (
              <div key={copy.draftId} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{copy.title || "Untitled"}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_COLOR[copy.status] ?? "bg-gray-100 text-gray-600"}`}>
                        {STATUS_LABEL[copy.status] ?? copy.status}
                      </span>
                      {copy.module && <span className="text-[10px] text-gray-400 capitalize">{copy.module}</span>}
                      {copy.scheduledDate && (
                        <span className="text-[10px] text-gray-400 inline-flex items-center gap-1">
                          <Calendar className="h-3 w-3" /> {new Date(copy.scheduledDate).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    {copy.rejectionNote && (
                      <p className="text-[11px] text-rose-600 mt-1">Note: {copy.rejectionNote}</p>
                    )}
                  </div>
                  <button
                    onClick={() => setPreview(copy)}
                    className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 inline-flex items-center gap-1 shrink-0"
                  >
                    <Eye className="h-3.5 w-3.5" /> Preview
                  </button>
                </div>

                {showActions && (
                  rejectingId === copy.draftId ? (
                    <RejectForm
                      busy={busy}
                      onCancel={() => setRejectingId(null)}
                      onConfirm={(note) => act(copy.draftId, "reject", note)}
                    />
                  ) : (
                    <div className="flex gap-2 justify-end mt-3">
                      <button
                        onClick={() => setRejectingId(copy.draftId)}
                        disabled={busy}
                        className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 inline-flex items-center gap-1 disabled:opacity-60"
                      >
                        <X className="h-3.5 w-3.5" /> Request changes
                      </button>
                      <button
                        onClick={() => act(copy.draftId, "approve")}
                        disabled={busy}
                        className="text-xs px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 inline-flex items-center gap-1 disabled:opacity-60"
                      >
                        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} Approve
                      </button>
                    </div>
                  )
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Read-only preview of the selected copy */}
      <ContentPreviewModal
        item={preview ? toCalendarCopy(preview) : null}
        open={!!preview}
        onClose={() => setPreview(null)}
        onUpdate={() => {}}
      />
    </div>
  );
}
