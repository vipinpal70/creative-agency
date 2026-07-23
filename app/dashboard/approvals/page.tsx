"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Loader2, Building2, Calendar, Hash, Film, Check, X, User,
  ShieldCheck, FileText, ClipboardList, MessageSquare, Palette, Image as ImageIcon, ChevronDown,
} from "lucide-react";
import { toast, Toaster } from "sonner";
import { STATUS_LABEL, STATUS_COLOR } from "@/lib/status-flow";
import { ContentPreviewModal } from "@/components/calendar/ContentPreviewModal";
import { FeedbackModal } from "@/components/ui/feedback-modal";
import { toCalendarCopy } from "@/lib/adapt-copy";
import type { ApprovalCopy } from "@/lib/adapt-copy";

// Types


interface ApprovalTask {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  startDate?: string | null;
  endDate?: string | null;
  client: { companyName: string };
  clientId: string;
  assignedTo?: { id: string; name: string } | null;
  category?: string | null;
  feedbacks: string[];
}

// Constants 

const COPY_STAGES = [
  { key: "content_internal_review", label: "📄 Content · Internal Review", approveLabel: "Approve → Client Review" },
  { key: "content_client_review", label: "📄 Content · Client Review", approveLabel: "Client Approved" },
  { key: "design_internal_review", label: "🎨 Design · Internal Review", approveLabel: "Approve → Client Review" },
  { key: "design_client_review", label: "🎨 Design · Client Review", approveLabel: "Client Approved" },
] as const;

type CopyStageKey = (typeof COPY_STAGES)[number]["key"];

const PRIORITY_COLOR: Record<string, string> = {
  LOW: "bg-gray-100 text-gray-600",
  MEDIUM: "bg-yellow-100 text-yellow-700",
  HIGH: "bg-red-100 text-red-600",
  URGENT: "bg-red-200 text-red-700",
};

// Task statuses that count as "awaiting approval":
// a member marks a task COMPLETED, then it moves through the review stages.
const TASK_REVIEW_STATUSES = "COMPLETED,INTERNAL_REVIEW,CLIENT_REVIEW";

const TASK_STATUS_BADGE: Record<string, { label: string; color: string }> = {
  COMPLETED:       { label: "Completed",       color: "bg-cyan-50 text-cyan-700" },
  INTERNAL_REVIEW: { label: "Internal Review", color: "bg-violet-50 text-violet-700" },
  CLIENT_REVIEW:   { label: "Client Review",   color: "bg-amber-50 text-amber-700" },
};

// Reject-with-note inline form

function RejectNoteForm({
  onCancel,
  onConfirm,
  busy,
  placeholder,
}: {
  onCancel: () => void;
  onConfirm: (note: string) => void;
  busy: boolean;
  placeholder: string;
}) {
  const [note, setNote] = useState("");
  return (
    <div className="space-y-2 pt-2 border-t border-border">
      <Textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder={placeholder}
        rows={3}
        className="text-sm"
      />
      <div className="flex items-center gap-2">
        <Button
          variant="destructive"
          size="sm"
          disabled={busy || !note.trim()}
          onClick={() => onConfirm(note.trim())}
        >
          {busy ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <X className="h-3 w-3 mr-1" />}
          Confirm Reject
        </Button>
        <Button variant="ghost" size="sm" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

// Copy approval card

function CopyApprovalCard({
  copy,
  approveLabel,
  onDone,
  onPreview,
}: {
  copy: ApprovalCopy;
  approveLabel: string;
  onDone: () => void;
  onPreview: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [rejectMode, setRejectMode] = useState<"reject" | "request_changes" | null>(null);

  const isDesignStage = copy.status.startsWith("design_");
  const attachedUrl = copy.imageUrl || copy.videoUrl || "";
  const copyText =
    copy.creativeCopy ||
    copy.articleCopy ||
    (copy.frames.length > 0 ? `[Carousel · ${copy.frames.length} frames] ${copy.frames[0]?.copy || ""}` : "") ||
    copy.title ||
    "—";

  const act = async (action: "approve" | "reject" | "request_change", note?: string) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/approvals/copies/${copy.draftId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, note }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Action failed");
      toast.success(
        action === "approve"
          ? "Copy approved"
          : action === "reject"
          ? "Copy rejected"
          : "Change request sent"
      );
      onDone();
    } catch (err: any) {
      toast.error(err.message || "Action failed");
    } finally {
      setBusy(false);
      setRejectMode(null);
    }
  };

  return (
    <Card
      className="cursor-pointer hover:shadow-md hover:border-primary/20 transition-all"
      onClick={onPreview}
    >
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <p className="text-sm font-medium text-foreground line-clamp-3 flex-1 min-w-0">{copyText}</p>
          <span
            className={`text-[11px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${STATUS_COLOR[copy.status] || "bg-muted text-muted-foreground"}`}
          >
            {STATUS_LABEL[copy.status] || copy.status}
          </span>
        </div>

        {copy.caption && (
          <p className="text-xs text-muted-foreground line-clamp-1 italic">{copy.caption}</p>
        )}
        {copy.hashtags.length > 0 && (
          <p className="text-xs text-primary/70 line-clamp-1">{copy.hashtags.join(" ")}</p>
        )}

        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Building2 className="h-3 w-3" /> {copy.clientName}
          </span>
          <span className="flex items-center gap-1">
            <FileText className="h-3 w-3" /> {copy.calendarName}
          </span>
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {copy.publishDate ? new Date(copy.publishDate).toLocaleDateString() : "—"}
            {copy.publishTime ? ` at ${copy.publishTime}` : ""}
          </span>
          {copy.mediaType && (
            <span className="flex items-center gap-1">
              <Film className="h-3 w-3" /> {copy.mediaType}
            </span>
          )}
          {copy.platforms.length > 0 && <span>{copy.platforms.join(", ")}</span>}
          {copy.buckets.length > 0 && (
            <span className="flex items-center gap-1">
              <Hash className="h-3 w-3" /> {copy.buckets[0]}
            </span>
          )}
          <span className="flex items-center gap-1">
            <User className="h-3 w-3" /> {copy.writerName}
          </span>
          <span className="text-muted-foreground/60">v{copy.version}</span>
        </div>

        {/* Attached creative preview for design review stages */}
        {isDesignStage && attachedUrl && (
          <div className="flex items-center gap-3 bg-accent/20 border border-border rounded-lg p-2.5">
            {copy.imageUrl ? (
              <img
                src={copy.imageUrl}
                alt="Creative"
                className="h-14 w-14 rounded-md object-cover shrink-0"
              />
            ) : (
              <Film className="h-4 w-4 text-muted-foreground shrink-0" />
            )}
            <a
              href={attachedUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-primary hover:underline truncate"
              onClick={(e) => e.stopPropagation()}
            >
              View creative
            </a>
          </div>
        )}
        {isDesignStage && !attachedUrl && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 rounded-lg p-2.5">
            <ImageIcon className="h-3.5 w-3.5" /> No creative attached yet.
          </div>
        )}

        {/* Action area — clicks here must not open the preview modal */}
        <div onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-2 pt-1 flex-wrap">
            <Button
              size="sm"
              className="bg-green-600 hover:bg-green-700 text-white"
              disabled={busy}
              onClick={() => act("approve")}
            >
              {busy ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Check className="h-3 w-3 mr-1" />}
              {approveLabel}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
              disabled={busy}
              onClick={() => setRejectMode("reject")}
            >
              <X className="h-3 w-3 mr-1" /> Reject
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => setRejectMode("request_changes")}
            >
              <MessageSquare className="h-3 w-3 mr-1" /> Request Changes
            </Button>
          </div>
        </div>
      </CardContent>

      <FeedbackModal
        open={!!rejectMode}
        busy={busy}
        title={
          rejectMode === "reject"
            ? isDesignStage
              ? "Reject design"
              : "Reject copy"
            : isDesignStage
            ? "Request design changes"
            : "Request content changes"
        }
        description={
          rejectMode === "reject"
            ? isDesignStage
              ? "Explain why this design is being rejected…"
              : "Explain why this copy is being rejected…"
            : isDesignStage
            ? "Your feedback is sent to the designer, who will rework and resubmit the creative."
            : "Your feedback is sent to the writer, who will revise and resubmit the copy."
        }
        placeholder={
          rejectMode === "reject"
            ? isDesignStage
              ? "Reason for rejecting this design…"
              : "Reason for rejecting this copy…"
            : isDesignStage
            ? "Explain what needs to change in the design…"
            : "Explain what needs to change in the copy…"
        }
        onCancel={() => setRejectMode(null)}
        onConfirm={(feedback) => act(rejectMode === "reject" ? "reject" : "request_change", feedback)}
      />
    </Card>
  );
}

// ─── Task approval card ───────────────────────────────────────────────────────

function TaskApprovalCard({ task, onDone }: { task: ApprovalTask; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const [rejecting, setRejecting] = useState(false);

  const act = async (status: "APPROVED" | "REJECTED", note?: string) => {
    setBusy(true);
    try {
      const body: Record<string, unknown> = { status };
      if (note) body.newFeedback = note;
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Action failed");
      toast.success(status === "APPROVED" ? "Task approved" : "Task rejected");
      onDone();
    } catch (err: any) {
      toast.error(err.message || "Action failed");
    } finally {
      setBusy(false);
      setRejecting(false);
    }
  };

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground">{task.title}</p>
            {task.description && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{task.description}</p>
            )}
          </div>
          <span
            className={`text-[11px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${
              TASK_STATUS_BADGE[task.status]?.color ?? "bg-muted text-muted-foreground"
            }`}
          >
            {TASK_STATUS_BADGE[task.status]?.label ?? task.status}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Building2 className="h-3 w-3" /> {task.client.companyName}
          </span>
          {task.assignedTo && (
            <span className="flex items-center gap-1">
              <User className="h-3 w-3" /> {task.assignedTo.name}
            </span>
          )}
          {task.endDate && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" /> Due {new Date(task.endDate).toLocaleDateString()}
            </span>
          )}
          {task.category && <span className="capitalize">{task.category.replaceAll("_", " ")}</span>}
          <span
            className={`px-2 py-0.5 rounded-full font-medium ${PRIORITY_COLOR[task.priority] || "bg-muted"}`}
          >
            {task.priority}
          </span>
        </div>

        {task.feedbacks.length > 0 && (
          <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/40 rounded-lg p-2.5">
            <MessageSquare className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            <span className="line-clamp-2">Last feedback: {task.feedbacks[task.feedbacks.length - 1]}</span>
          </div>
        )}

        {!rejecting ? (
          <div className="flex items-center gap-2 pt-1">
            <Button
              size="sm"
              className="bg-green-600 hover:bg-green-700 text-white"
              disabled={busy}
              onClick={() => act("APPROVED")}
            >
              {busy ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Check className="h-3 w-3 mr-1" />}
              Approve
            </Button>
            <Button variant="outline" size="sm" disabled={busy} onClick={() => setRejecting(true)}>
              <X className="h-3 w-3 mr-1" /> Reject
            </Button>
          </div>
        ) : (
          <RejectNoteForm
            busy={busy}
            onCancel={() => setRejecting(false)}
            onConfirm={(note) => act("REJECTED", note)}
            placeholder="Explain why this task is being rejected…"
          />
        )}
      </CardContent>
    </Card>
  );
}

function getTodayString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

interface MultiSelectOption {
  label: string;
  value: string;
}

interface MultiSelectDropdownProps {
  icon?: React.ReactNode;
  label: string;
  options: MultiSelectOption[];
  selectedValues: string[];
  onChange: (selected: string[]) => void;
}

function MultiSelectDropdown({
  icon,
  label,
  options,
  selectedValues,
  onChange,
}: MultiSelectDropdownProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredOptions = useMemo(() => {
    if (!search.trim()) return options;
    const q = search.toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(q));
  }, [options, search]);

  const toggleValue = (value: string) => {
    if (selectedValues.includes(value)) {
      onChange(selectedValues.filter((v) => v !== value));
    } else {
      onChange([...selectedValues, value]);
    }
  };

  const selectAll = () => {
    onChange(options.map((o) => o.value));
  };

  const clearAll = () => {
    onChange([]);
  };

  const getDisplayText = () => {
    if (selectedValues.length === 0) {
      return `All ${label}s`;
    }
    if (selectedValues.length === options.length && options.length > 0) {
      return `All ${label}s (${options.length})`;
    }
    if (selectedValues.length === 1) {
      const match = options.find((o) => o.value === selectedValues[0]);
      return match ? match.label : `1 ${label}`;
    }
    return `${selectedValues.length} ${label}s selected`;
  };

  const hasSelection = selectedValues.length > 0;

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen((prev) => !prev)}
        className={`h-9 text-xs justify-between gap-2 border-gray-200 bg-white font-normal hover:bg-gray-50 transition-colors ${
          hasSelection ? "border-primary/50 ring-1 ring-primary/20 text-primary font-medium" : "text-gray-700"
        }`}
      >
        <span className="flex items-center gap-1.5 truncate max-w-[160px]">
          {icon}
          <span className="truncate">{getDisplayText()}</span>
        </span>
        <div className="flex items-center gap-1 shrink-0">
          {hasSelection && (
            <span className="bg-primary text-primary-foreground text-[10px] rounded-full px-1.5 py-0.2 font-semibold">
              {selectedValues.length}
            </span>
          )}
          <ChevronDown className={`h-3.5 w-3.5 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} />
        </div>
      </Button>

      {open && (
        <div className="absolute left-0 mt-1 w-64 rounded-xl border border-gray-200 bg-white p-2 shadow-lg z-50 animate-in fade-in-50 zoom-in-95 duration-100">
          {options.length > 5 && (
            <div className="mb-2">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={`Search ${label.toLowerCase()}s...`}
                className="w-full px-2.5 py-1.5 text-xs rounded-md border border-gray-200 focus:outline-none focus:ring-1 focus:ring-primary text-gray-900 bg-white"
              />
            </div>
          )}

          <div className="flex items-center justify-between px-1 py-1 mb-1 border-b border-gray-100 text-[11px]">
            <button
              type="button"
              onClick={selectAll}
              className="text-primary hover:underline font-medium"
            >
              Select All
            </button>
            <button
              type="button"
              onClick={clearAll}
              className="text-gray-500 hover:text-gray-800 hover:underline"
            >
              Clear
            </button>
          </div>

          <div className="max-h-48 overflow-y-auto space-y-0.5 pr-1">
            {filteredOptions.length === 0 ? (
              <p className="text-xs text-gray-400 py-3 text-center">No options found</p>
            ) : (
              filteredOptions.map((opt: MultiSelectOption) => {
                const checked = selectedValues.includes(opt.value);
                return (
                  <label
                    key={opt.value}
                    onClick={(e) => e.stopPropagation()}
                    className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-xs cursor-pointer select-none transition-colors ${
                      checked ? "bg-primary/5 text-primary font-medium" : "hover:bg-gray-50 text-gray-700"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleValue(opt.value)}
                      className="h-3.5 w-3.5 rounded border-gray-300 text-primary focus:ring-primary accent-primary"
                    />
                    <span className="truncate">{opt.label}</span>
                  </label>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Page

export default function ApprovalsPage() {
  const [tab, setTab] = useState<"copies" | "tasks">("copies");
  const [copyStage, setCopyStage] = useState<CopyStageKey>("content_internal_review");
  const [copies, setCopies] = useState<ApprovalCopy[]>([]);
  const [tasks, setTasks] = useState<ApprovalTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewCopy, setPreviewCopy] = useState<ApprovalCopy | null>(null);
  const [clients, setClients] = useState<{ id: string; companyName: string }[]>([]);
  const [clientFilter, setClientFilter] = useState<string>("");
  const [selectedMediaTypes, setSelectedMediaTypes] = useState<string[]>([]);
  const [startDate, setStartDate] = useState<string>(getTodayString);
  const [endDate, setEndDate] = useState<string>("");

  const loadCopies = useCallback(async (stage: CopyStageKey) => {
    setLoading(true);
    try {
      const data = await fetch(`/api/approvals/copies?status=${stage}`).then((r) => r.json());
      setCopies(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetch(`/api/tasks?status=${TASK_REVIEW_STATUSES}`).then((r) => r.json());
      setTasks(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === "copies") loadCopies(copyStage);
    else loadTasks();
  }, [tab, copyStage, loadCopies, loadTasks]);

  // Silent auto-refresh every 30s so approvers see edits without refreshing.
  // Doesn't toggle the loading spinner to avoid flicker.
  useEffect(() => {
    const interval = setInterval(() => {
      if (tab === "copies") {
        fetch(`/api/approvals/copies?status=${copyStage}`)
          .then((r) => r.json())
          .then((d) => setCopies(Array.isArray(d) ? d : []))
          .catch(() => {});
      } else {
        fetch(`/api/tasks?status=${TASK_REVIEW_STATUSES}`)
          .then((r) => r.json())
          .then((d) => setTasks(Array.isArray(d) ? d : []))
          .catch(() => {});
      }
    }, 30_000);
    return () => clearInterval(interval);
  }, [tab, copyStage]);

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

  const availableMediaTypes = useMemo(() => {
    const defaultTypes = ["Image", "Video", "Carousel", "Reel", "GIF", "Story", "Article"];
    const fromCopies = copies.map((c) => c.mediaType).filter(Boolean);
    const set = new Set<string>();

    defaultTypes.forEach((t) => set.add(t));
    fromCopies.forEach((t) => {
      const formatted = t.charAt(0).toUpperCase() + t.slice(1);
      set.add(formatted);
    });

    return Array.from(set).map((t) => ({ label: t, value: t }));
  }, [copies]);

  const activeStage = COPY_STAGES.find((s) => s.key === copyStage)!;

  const filteredCopies = useMemo(() => {
    return copies.filter((copy) => {
      if (clientFilter && copy.clientId !== clientFilter) return false;

      if (selectedMediaTypes.length > 0) {
        const copyMedia = (copy.mediaType || "").toLowerCase();
        const match = selectedMediaTypes.some(
          (m) => m.toLowerCase() === copyMedia
        );
        if (!match) return false;
      }

      const rawDate = copy.publishDate || copy.scheduledDate || copy.updatedAt;
      if (rawDate) {
        const d = new Date(rawDate);
        if (!isNaN(d.getTime())) {
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, "0");
          const day = String(d.getDate()).padStart(2, "0");
          const copyYMD = `${y}-${m}-${day}`;

          if (startDate && copyYMD < startDate) return false;
          if (endDate && copyYMD > endDate) return false;
        }
      }

      return true;
    });
  }, [copies, clientFilter, selectedMediaTypes, startDate, endDate]);

  const filteredTasks = tasks.filter((t) => !clientFilter || t.clientId === clientFilter);

  const hasActiveFilters =
    clientFilter !== "" ||
    selectedMediaTypes.length > 0 ||
    startDate !== getTodayString() ||
    endDate !== "";

  const handleResetFilters = () => {
    setClientFilter("");
    setSelectedMediaTypes([]);
    setStartDate(getTodayString());
    setEndDate("");
  };

  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
          <ShieldCheck className="h-5 w-5" /> Approvals
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Review submitted copies and completed tasks.
        </p>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as "copies")}>
        <TabsList>
          <TabsTrigger value="copies">
            <FileText className="h-3.5 w-3.5 mr-1.5" /> Copies
          </TabsTrigger>
          {/* <TabsTrigger value="tasks">
            <ClipboardList className="h-3.5 w-3.5 mr-1.5" /> Tasks
          </TabsTrigger> */}
        </TabsList>
      </Tabs>

      {tab === "copies" && (
        <>
          {/* Review-stage filter + Client, Media Type, Date Range filters */}
          <div className="space-y-3 bg-white p-3.5 rounded-xl border border-gray-100 shadow-sm">
            <div className="flex items-center gap-2 flex-wrap">
              {COPY_STAGES.map((s) => {
                const on = copyStage === s.key;
                return (
                  <button
                    key={s.key}
                    onClick={() => setCopyStage(s.key)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                      on
                        ? "bg-primary text-primary-foreground border-transparent"
                        : "border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {s.label}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-gray-100">
              {/* Client filter */}
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

              {/* Multi-Select Media Type Filter */}
              <MultiSelectDropdown
                icon={<Film className="w-3.5 h-3.5 text-gray-400" />}
                label="Media Type"
                options={availableMediaTypes}
                selectedValues={selectedMediaTypes}
                onChange={setSelectedMediaTypes}
              />

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

              {/* Reset Filters button */}
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleResetFilters}
                  className="h-8 text-xs text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3 w-3 mr-1" /> Reset filters
                </Button>
              )}
            </div>
          </div>

          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading copies…
            </div>
          ) : filteredCopies.length === 0 ? (
            <Card>
              <CardContent className="p-10 text-center space-y-3">
                
                {copyStage === "design_internal_review" || copyStage === "design_client_review" ? (
                  <>
                    <Palette className="h-10 w-10 text-muted-foreground/30 mx-auto" />
                    <p className="text-sm text-muted-foreground">
                      No designs awaiting approval
                    </p>
                  </>
                ) : (
                  <>
                    <FileText className="h-10 w-10 text-muted-foreground/30 mx-auto" />
                    <p className="text-sm text-muted-foreground">
                      No copies awaiting approval
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredCopies.map((copy: ApprovalCopy) => (
                <CopyApprovalCard
                  key={copy.draftId}
                  copy={copy}
                  approveLabel={activeStage.approveLabel}
                  onDone={() => loadCopies(copyStage)}
                  onPreview={() => setPreviewCopy(copy)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* {tab === "tasks" && (
        <>
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading tasks…
            </div>
          ) : filteredTasks.length === 0 ? (
            <Card>
              <CardContent className="p-10 text-center space-y-3">
                <ClipboardList className="h-10 w-10 text-muted-foreground/30 mx-auto" />
                <p className="text-sm text-muted-foreground">
                  No tasks awaiting approval.
                </p>
                <p className="text-xs text-muted-foreground">
                  Tasks appear here once they are marked Completed or moved to
                  Internal / Client Review on the task board.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredTasks.map((task) => (
                <TaskApprovalCard key={task.id} task={task} onDone={loadTasks} />
              ))}
            </div>
          )}
        </>
      )} */}

      {/* Copy preview modal (same one the content calendar uses) */}
      <ContentPreviewModal
        item={previewCopy ? toCalendarCopy(previewCopy) : null}
        open={!!previewCopy}
        onClose={() => {
          setPreviewCopy(null);
          // A review action inside the modal may have moved the copy to
          // another stage — refresh the current list.
          if (tab === "copies") loadCopies(copyStage);
        }}
        onUpdate={(_deliverableId, updatedDraft) => {
          // Keep the open modal in sync with edits/actions made inside it
          setPreviewCopy((prev) =>
            prev
              ? {
                  ...prev,
                  ...updatedDraft,
                  draftId: prev.draftId,
                  status: updatedDraft.status ?? prev.status,
                  publishDate:
                    updatedDraft.publishDate !== undefined ? updatedDraft.publishDate : prev.publishDate,
                }
              : prev
          );
        }}
      />

      <Toaster position="top-right" richColors />
    </div>
  );
}
