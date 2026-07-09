"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Loader2, Building2, Calendar, Hash, Film, User, Archive, ArchiveRestore,
  Trash2, Search, ChevronDown, ChevronLeft, ChevronRight, Eye,
} from "lucide-react";
import { toast, Toaster } from "sonner";
import { STATUS_LABEL, STATUS_COLOR } from "@/lib/status-flow";
import { ContentPreviewModal } from "@/components/calendar/ContentPreviewModal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { toCalendarCopy } from "@/lib/adapt-copy";
import type { ApprovalCopy } from "@/lib/adapt-copy";
import { useAuth } from "@/hooks/useAuth";

const ARCHIVE_RETENTION_DAYS = 14;
const PAGE_SIZE = 12;

function archiveDaysLeft(archivedAt: string): number {
  const elapsedDays = Math.floor((Date.now() - new Date(archivedAt).getTime()) / 86_400_000);
  return Math.max(0, ARCHIVE_RETENTION_DAYS - elapsedDays);
}

function copyText(copy: ApprovalCopy): string {
  return (
    copy.creativeCopy ||
    copy.articleCopy ||
    (copy.frames?.length > 0 ? `[Carousel · ${copy.frames.length} frames] ${copy.frames[0]?.copy || ""}` : "") ||
    copy.title ||
    "—"
  );
}

function ArchivedCard({
  copy,
  isAdmin,
  canManage,
  onPreview,
  onRestored,
  onDeleted,
}: {
  copy: ApprovalCopy;
  isAdmin: boolean;
  canManage: boolean;
  onPreview: (copy: ApprovalCopy) => void;
  onRestored: (draftId: string) => void;
  onDeleted: (draftId: string) => void;
}) {
  const [restoring, setRestoring] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const daysLeft = copy.archivedAt ? archiveDaysLeft(copy.archivedAt) : 0;

  const restore = async () => {
    setRestoring(true);
    try {
      const res = await fetch(`/api/approvals/copies/${copy.draftId}/archive`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "restore" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Restore failed");
      toast.success("Copy restored to active list");
      onRestored(copy.draftId);
    } catch (err: any) {
      toast.error(err.message || "Restore failed");
      setRestoring(false);
    }
  };

  const del = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/approvals/copies/${copy.draftId}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Delete failed");
      toast.success("Copy permanently deleted");
      setConfirmDelete(false);
      onDeleted(copy.draftId);
    } catch (err: any) {
      toast.error(err.message || "Delete failed");
      setDeleting(false);
    }
  };

  return (
    <Card
      className="cursor-pointer hover:shadow-md hover:border-primary/20 transition-all"
      onClick={() => onPreview(copy)}
    >
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm font-medium text-foreground line-clamp-2 flex-1 min-w-0">
            {copyText(copy)}
          </p>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <span
              className={`text-[11px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${STATUS_COLOR[copy.status] || "bg-muted text-muted-foreground"}`}
            >
              {STATUS_LABEL[copy.status] || copy.status}
            </span>
            <span className="flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap bg-zinc-200 text-zinc-700">
              <Archive className="h-3 w-3" /> Archived
            </span>
          </div>
        </div>

        {copy.caption && (
          <p className="text-xs text-muted-foreground line-clamp-1 italic">{copy.caption}</p>
        )}

        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Building2 className="h-3 w-3" /> {copy.clientName}
          </span>
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {copy.publishDate ? new Date(copy.publishDate).toLocaleDateString() : "—"}
          </span>
          {copy.mediaType && (
            <span className="flex items-center gap-1">
              <Film className="h-3 w-3" /> {copy.mediaType}
            </span>
          )}
          {copy.buckets.length > 0 && (
            <span className="flex items-center gap-1">
              <Hash className="h-3 w-3" /> {copy.buckets[0]}
            </span>
          )}
          <span className="flex items-center gap-1">
            <User className="h-3 w-3" /> {copy.writerName}
          </span>
        </div>

        {copy.archivedAt && (
          <div className="flex items-center gap-2 text-xs bg-zinc-100 text-zinc-600 rounded-lg p-2.5">
            <Archive className="h-3.5 w-3.5 shrink-0" />
            <span>
              Archived{copy.archivedBy ? ` by ${copy.archivedBy.name}` : ""} ·{" "}
              {new Date(copy.archivedAt).toLocaleDateString()} · auto-deletes in {daysLeft} day
              {daysLeft === 1 ? "" : "s"}
            </span>
          </div>
        )}

        <div onClick={(e) => e.stopPropagation()} className="flex items-center gap-2 flex-wrap pt-1 border-t border-border">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-[11px]"
            onClick={() => onPreview(copy)}
          >
            <Eye className="h-3 w-3 mr-1" /> View
          </Button>
          {canManage && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-[11px]"
              disabled={restoring}
              onClick={restore}
            >
              {restoring ? (
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              ) : (
                <ArchiveRestore className="h-3 w-3 mr-1" />
              )}
              Restore
            </Button>
          )}
          {isAdmin && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-[11px] text-red-600 hover:text-red-700 hover:bg-red-50"
              disabled={deleting}
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 className="h-3 w-3 mr-1" /> Delete
            </Button>
          )}
        </div>
      </CardContent>

      <ConfirmDialog
        open={confirmDelete}
        destructive
        busy={deleting}
        title="Permanently delete this copy?"
        description={
          <>
            This removes the copy, all attached files, and its history.{" "}
            <span className="font-medium text-red-600">This cannot be undone.</span>
          </>
        }
        confirmLabel="Delete permanently"
        onConfirm={del}
        onCancel={() => !deleting && setConfirmDelete(false)}
      />
    </Card>
  );
}

export default function ArchivedCopiesPage() {
  const { user } = useAuth();
  const [copies, setCopies] = useState<ApprovalCopy[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sort, setSort] = useState<"recent" | "oldest">("recent");
  const [clientFilter, setClientFilter] = useState("");
  const [clients, setClients] = useState<{ id: string; companyName: string }[]>([]);
  const [previewCopy, setPreviewCopy] = useState<ApprovalCopy | null>(null);

  const isAdmin = user?.role === "admin";
  const canManage = user?.role === "admin" || user?.role === "member";

  // Ignore stale responses when filters change quickly.
  const reqRef = useRef(0);

  const load = useCallback(async () => {
    const reqId = ++reqRef.current;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_SIZE),
        sort,
      });
      if (debouncedSearch) params.set("q", debouncedSearch);
      if (clientFilter) params.set("clientId", clientFilter);
      const res = await fetch(`/api/copies/archived?${params.toString()}`);
      const data = await res.json();
      if (reqRef.current !== reqId) return; // superseded
      setCopies(Array.isArray(data.items) ? data.items : []);
      setTotal(data.total ?? 0);
      setTotalPages(data.totalPages ?? 1);
    } finally {
      if (reqRef.current === reqId) setLoading(false);
    }
  }, [page, sort, debouncedSearch, clientFilter]);

  useEffect(() => { load(); }, [load]);

  // Debounce the search box.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Reset to first page whenever the filters change.
  useEffect(() => { setPage(1); }, [debouncedSearch, clientFilter, sort]);

  useEffect(() => {
    fetch("/api/clients")
      .then((res) => (res.ok ? res.json() : []))
      .then((data: any[]) =>
        setClients(data.map((c) => ({ id: c.id, companyName: c.brandName || c.name || "Unknown" })))
      )
      .catch(console.error);
  }, []);

  // Remove a card from the current page immediately; keep the count in sync.
  const removeFromView = useCallback((draftId: string) => {
    setCopies((prev) => prev.filter((c) => c.draftId !== draftId));
    setTotal((t) => Math.max(0, t - 1));
    setPreviewCopy((prev) => (prev && prev.draftId === draftId ? null : prev));
  }, []);

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <Archive className="h-5 w-5" /> Archived Copies
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Archived copies are kept for {ARCHIVE_RETENTION_DAYS} days, then permanently deleted.
            Restore one to return it to the active list.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row md:items-center gap-3 flex-wrap bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search copy, caption, hashtags…"
            className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white text-gray-900"
          />
        </div>

        <div className="relative">
          <Building2 className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <select
            className="pl-8 pr-7 py-1.5 rounded-lg border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white text-gray-900 min-w-[160px] appearance-none"
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

        <div className="relative">
          <select
            className="pl-3 pr-7 py-1.5 rounded-lg border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white text-gray-900 appearance-none"
            value={sort}
            onChange={(e) => setSort(e.target.value as "recent" | "oldest")}
            aria-label="Sort order"
          >
            <option value="recent">Recently archived</option>
            <option value="oldest">Oldest archived</option>
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading archived copies…
        </div>
      ) : copies.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center space-y-3">
            <Archive className="h-10 w-10 text-muted-foreground/30 mx-auto" />
            <p className="text-sm text-muted-foreground">
              {debouncedSearch || clientFilter ? "No archived copies match your filters." : "No archived copies."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {copies.map((copy) => (
              <ArchivedCard
                key={copy.draftId}
                copy={copy}
                isAdmin={isAdmin}
                canManage={canManage}
                onPreview={setPreviewCopy}
                onRestored={removeFromView}
                onDeleted={removeFromView}
              />
            ))}
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <p className="text-xs text-muted-foreground">
              {total} archived {total === 1 ? "copy" : "copies"} · page {page} of {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Prev
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next <ChevronRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </div>
          </div>
        </>
      )}

      <ContentPreviewModal
        item={previewCopy ? toCalendarCopy(previewCopy) : null}
        open={!!previewCopy}
        onClose={() => setPreviewCopy(null)}
        onUpdate={() => { /* archived copies are read-only here */ }}
      />

      <Toaster position="top-right" richColors />
    </div>
  );
}
