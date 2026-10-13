"use client";

import { useEffect, useState } from "react";
import { Loader2, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

/** Which part of the copy a change request concerns. */
export type FeedbackCategory = "copy" | "creative" | "both";

const CATEGORY_OPTIONS: { value: FeedbackCategory; label: string; hint: string }[] = [
  { value: "copy",     label: "Copy",     hint: "Writer reworks the text" },
  { value: "creative", label: "Creative", hint: "Designer reworks the creative" },
  { value: "both",     label: "Both",     hint: "Copy first, then design" },
];

export interface FeedbackModalProps {
  open: boolean;
  /** Dialog title, e.g. "Request content changes". */
  title: string;
  /** Short helper text under the title. */
  description?: React.ReactNode;
  placeholder?: string;
  confirmLabel?: string;
  busy?: boolean;
  /**
   * When true, the approver must first pick which part of the copy the
   * feedback concerns (copy / creative / both). Used at design review stages
   * where both a creative and copy exist; the choice routes the rework.
   */
  showCategory?: boolean;
  onConfirm: (feedback: string, category?: FeedbackCategory) => void;
  onCancel: () => void;
}

/**
 * Feedback modal shown when an approver requests changes. The feedback is
 * required — it is delivered to the writer (content) or designer (design) as
 * the copy's rejectionNote. Renders nothing when closed and resets its input
 * each time it opens.
 */
export function FeedbackModal({
  open,
  title,
  description,
  placeholder = "Describe the changes you'd like…",
  confirmLabel = "Send request",
  busy = false,
  showCategory = false,
  onConfirm,
  onCancel,
}: FeedbackModalProps) {
  const [feedback, setFeedback] = useState("");
  const [category, setCategory] = useState<FeedbackCategory | null>(null);

  // Reset the input whenever the modal opens.
  useEffect(() => {
    if (open) {
      setFeedback("");
      setCategory(null);
    }
  }, [open]);

  // Close on Escape (ignored while an action is in flight).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, busy, onCancel]);

  if (!open) return null;

  const canSend =
    feedback.trim().length > 0 && !busy && (!showCategory || category !== null);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[1px]"
        onClick={() => !busy && onCancel()}
      />
      <div className="relative w-full max-w-md rounded-xl bg-white shadow-xl border border-gray-100 p-5 space-y-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-600">
            <MessageSquare className="h-4 w-4" />
          </div>
          <div className="space-y-1 min-w-0">
            <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
            {description && (
              <div className="text-xs text-gray-500 leading-relaxed">{description}</div>
            )}
          </div>
        </div>

        {showCategory && (
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-gray-700">
              What needs changing?
            </p>
            <div className="grid grid-cols-3 gap-2">
              {CATEGORY_OPTIONS.map((opt) => {
                const on = category === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    disabled={busy}
                    onClick={() => setCategory(opt.value)}
                    className={`rounded-lg border px-2 py-2 text-left transition-colors ${
                      on
                        ? "border-rose-500 bg-rose-50 ring-1 ring-rose-500"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <span className="block text-xs font-semibold text-gray-900">
                      {opt.label}
                    </span>
                    <span className="block text-[10px] text-gray-500 leading-tight mt-0.5">
                      {opt.hint}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <Textarea
          autoFocus
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder={placeholder}
          rows={4}
          className="text-sm"
        />

        <div className="flex items-center justify-end gap-2 pt-1">
          <Button variant="ghost" size="sm" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
          <Button
            size="sm"
            className="bg-rose-600 hover:bg-rose-700 text-white"
            onClick={() => onConfirm(feedback.trim(), category ?? undefined)}
            disabled={!canSend}
          >
            {busy && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
