"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Loader2, Building2, Calendar, Hash, Film, Check, X, User,
  ShieldCheck, FileText, ClipboardList, MessageSquare, Palette, Image as ImageIcon,
} from "lucide-react";
import { toast, Toaster } from "sonner";
import { STATUS_LABEL, STATUS_COLOR } from "@/lib/status-flow";
import { ContentPreviewModal } from "@/components/calendar/ContentPreviewModal";
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
  const [rejecting, setRejecting] = useState(false);

  const isDesignStage = copy.status.startsWith("design_");
  const attachedUrl = copy.imageUrl || copy.videoUrl || "";
  const copyText =
    copy.creativeCopy ||
    copy.articleCopy ||
    (copy.frames.length > 0 ? `[Carousel · ${copy.frames.length} frames] ${copy.frames[0]?.copy || ""}` : "") ||
    copy.title ||
    "—";

  const act = async (action: "approve" | "reject", note?: string) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/approvals/copies/${copy.draftId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, note }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Action failed");
      toast.success(action === "approve" ? "Copy approved" : "Copy rejected");
      onDone();
    } catch (err: any) {
      toast.error(err.message || "Action failed");
    } finally {
      setBusy(false);
      setRejecting(false);
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
          {!rejecting ? (
            <div className="flex items-center gap-2 pt-1">
              <Button
                size="sm"
                className="bg-green-600 hover:bg-green-700 text-white"
                disabled={busy}
                onClick={() => act("approve")}
              >
                {busy ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Check className="h-3 w-3 mr-1" />}
                {approveLabel}
              </Button>
              <Button variant="outline" size="sm" disabled={busy} onClick={() => setRejecting(true)}>
                <X className="h-3 w-3 mr-1" /> Reject
              </Button>
            </div>
          ) : (
            <RejectNoteForm
              busy={busy}
              onCancel={() => setRejecting(false)}
              onConfirm={(note) => act("reject", note)}
              placeholder={
                isDesignStage
                  ? "Explain what needs to change in the design…"
                  : "Explain why this copy is being rejected…"
              }
            />
          )}
        </div>
      </CardContent>
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

// Page

export default function ApprovalsPage() {
  const [tab, setTab] = useState<"copies" | "tasks">("copies");
  const [copyStage, setCopyStage] = useState<CopyStageKey>("content_internal_review");
  const [copies, setCopies] = useState<ApprovalCopy[]>([]);
  const [tasks, setTasks] = useState<ApprovalTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewCopy, setPreviewCopy] = useState<ApprovalCopy | null>(null);

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

  const activeStage = COPY_STAGES.find((s) => s.key === copyStage)!;

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

      <Tabs value={tab} onValueChange={(v) => setTab(v as "copies" | "tasks")}>
        <TabsList>
          <TabsTrigger value="copies">
            <FileText className="h-3.5 w-3.5 mr-1.5" /> Copies
          </TabsTrigger>
          <TabsTrigger value="tasks">
            <ClipboardList className="h-3.5 w-3.5 mr-1.5" /> Tasks
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {tab === "copies" && (
        <>
          {/* Review-stage filter */}
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

          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading copies…
            </div>
          ) : copies.length === 0 ? (
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
              {copies.map((copy) => (
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

      {tab === "tasks" && (
        <>
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading tasks…
            </div>
          ) : tasks.length === 0 ? (
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
              {tasks.map((task) => (
                <TaskApprovalCard key={task.id} task={task} onDone={loadTasks} />
              ))}
            </div>
          )}
        </>
      )}

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
