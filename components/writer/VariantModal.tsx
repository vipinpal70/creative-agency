"use client";

import { useState, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Save, X, History, ChevronDown } from "lucide-react";
import type { CopyFormData, HistoryEntry } from "./types";

// A "variant" is a paid-media copy inside a campaign — the paid-media
// counterpart of a social "copy". It reuses the ContentDraft data model:
// primary text → creativeCopy, helping URL → referenceUrl, launch date →
// publishDate, plus paid-only headline / description / cta / landingUrl.

export const VARIANT_MEDIA_TYPES = ["Static", "Carousel", "Video"] as const;
export const VARIANT_CTAS = ["Sign Up", "Learn More", "Shop Now", "Get Quote", "Download", "Book Demo"] as const;

export interface VariantModalInitialData {
  mediaType?: string;
  creativeCopy?: string;   // primary text
  referenceUrl?: string;   // helping url
  headline?: string;
  description?: string;
  cta?: string;
  landingUrl?: string;
  publishDate?: string;    // launch date
}

interface Props {
  mode: "create" | "edit";
  index: number;           // 1-based variant number, for the title
  initialData?: VariantModalInitialData;
  historyEndpoint?: string;
  onClose: () => void;
  onSave: (form: CopyFormData) => Promise<void>;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1)   return "just now";
  if (m < 60)  return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7)   return `${d}d ago`;
  return new Date(dateStr).toLocaleString();
}

const ACTION_LABEL: Record<string, string> = {
  created:   "Created variant",
  edited:    "Edited",
  submitted: "Submitted for review",
  approved:  "Approved",
  rejected:  "Rejected",
};
const ACTION_COLOR: Record<string, string> = {
  created:   "bg-blue-500",
  edited:    "bg-muted-foreground",
  submitted: "bg-amber-500",
  approved:  "bg-green-500",
  rejected:  "bg-destructive",
};

const LABEL = "text-xs font-semibold text-muted-foreground uppercase tracking-wider";

export function VariantModal({ mode, index, initialData, historyEndpoint, onClose, onSave }: Props) {
  const [mediaType,    setMediaType]    = useState(initialData?.mediaType ?? "");
  const [primaryText,  setPrimaryText]  = useState(initialData?.creativeCopy ?? "");
  const [helpingUrl,   setHelpingUrl]   = useState(initialData?.referenceUrl ?? "");
  const [headline,     setHeadline]     = useState(initialData?.headline ?? "");
  const [description,  setDescription]  = useState(initialData?.description ?? "");
  const [cta,          setCta]          = useState(initialData?.cta ?? "Learn More");
  const [landingUrl,   setLandingUrl]   = useState(initialData?.landingUrl ?? "");
  const [launchDate,   setLaunchDate]   = useState(initialData?.publishDate ?? "");
  const [saving,       setSaving]       = useState(false);

  const today = new Date().toLocaleDateString("en-CA");

  // ── History ──
  const [history,        setHistory]        = useState<HistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyOpen,    setHistoryOpen]    = useState(false);

  useEffect(() => {
    if (!historyEndpoint) return;
    setHistoryLoading(true);
    fetch(historyEndpoint)
      .then((r) => r.json())
      .then((data) => setHistory(Array.isArray(data) ? data : []))
      .catch(() => setHistory([]))
      .finally(() => setHistoryLoading(false));
  }, [historyEndpoint]);

  const isValid =
    mediaType.trim() &&
    primaryText.trim() &&
    headline.trim() &&
    landingUrl.trim() &&
    launchDate;

  const handleSave = async () => {
    if (!isValid || saving) return;
    setSaving(true);
    try {
      await onSave({
        mediaType,
        creativeCopy: primaryText,
        caption:      "",
        hashtags:     "",
        publishDate:  launchDate,
        publishTime:  "",
        contentBucket: "",
        platforms:    [],           // campaign platforms are injected by the workspace
        referenceUrl: helpingUrl.trim() || undefined,
        headline,
        description,
        cta,
        landingUrl:   landingUrl.trim(),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-background rounded-xl border border-border w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <div>
            <h2 className="text-base font-semibold text-foreground">
              {mode === "create" ? `Add Variant ${index}` : `Edit Variant ${index}`}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {mode === "create"
                ? "A variant is a single ad copy inside this campaign"
                : "Update this variant before submitting for review"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-accent transition-colors"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5 overflow-y-auto flex-1 min-h-0">

          {/* 1 — Media Type */}
          <div className="space-y-2">
            <label className={LABEL}>Media Type *</label>
            <div className="flex flex-wrap gap-2">
              {VARIANT_MEDIA_TYPES.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMediaType(m)}
                  disabled={mode === "edit"}
                  className={`text-sm px-3 py-1.5 rounded-full border transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${
                    mediaType === m
                      ? "border-primary bg-primary/10 text-primary font-medium"
                      : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
            {mode === "edit" && (
              <p className="text-[11px] text-muted-foreground">Media type cannot be changed after creation.</p>
            )}
          </div>

          {/* 2 — Helping URL */}
          <div className="space-y-2">
            <label className={LABEL}>Helping URL <span className="normal-case font-normal text-muted-foreground">(optional)</span></label>
            <Input
              type="url"
              placeholder="https://example.com/reference"
              value={helpingUrl}
              onChange={(e) => setHelpingUrl(e.target.value)}
            />
          </div>

          {/* 3 — Primary Text */}
          <div className="space-y-2">
            <label className={LABEL}>Primary Text *</label>
            <Textarea
              placeholder="The main body copy of the ad…"
              className="min-h-[100px]"
              value={primaryText}
              onChange={(e) => setPrimaryText(e.target.value)}
            />
          </div>

          {/* 4 — Headline */}
          <div className="space-y-2">
            <label className={LABEL}>Headline *</label>
            <Input
              placeholder="Short attention-grabbing headline"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
            />
          </div>

          {/* 5 — Description */}
          <div className="space-y-2">
            <label className={LABEL}>Description <span className="normal-case font-normal text-muted-foreground">(optional)</span></label>
            <Input
              placeholder="Supporting description line"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* 6+7 — CTA & Landing URL */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className={LABEL}>CTA</label>
              <Select value={cta} onValueChange={setCta}>
                <SelectTrigger><SelectValue placeholder="Select CTA" /></SelectTrigger>
                <SelectContent>
                  {VARIANT_CTAS.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className={LABEL}>Landing URL *</label>
              <Input
                type="url"
                placeholder="https://"
                value={landingUrl}
                onChange={(e) => setLandingUrl(e.target.value)}
              />
            </div>
          </div>

          {/* 8 — Launch Date */}
          <div className="space-y-2">
            <label className={LABEL}>Launch Date *</label>
            <Input
              type="date"
              min={mode === "create" ? today : undefined}
              value={launchDate}
              onChange={(e) => setLaunchDate(e.target.value)}
            />
          </div>

          {/* Change History (edit mode only) */}
          {mode === "edit" && (
            <div className="-mx-6 border-t border-border mt-2">
              <button
                type="button"
                onClick={() => setHistoryOpen((o) => !o)}
                className="w-full flex items-center justify-between px-6 py-3 hover:bg-accent/50 transition-colors"
              >
                <span className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <History className="h-3.5 w-3.5" />
                  Change History
                  {history.length > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground text-[10px] font-medium normal-case tracking-normal">
                      {history.length}
                    </span>
                  )}
                </span>
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${historyOpen ? "rotate-180" : ""}`} />
              </button>

              {historyOpen && (
                <div className="px-6 pb-4">
                  {historyLoading ? (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground py-3">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading history…
                    </div>
                  ) : history.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-3">No history recorded yet.</p>
                  ) : (
                    <div className="relative pl-4">
                      <div className="absolute left-[7px] top-2 bottom-2 w-px bg-border" />
                      {history.map((entry) => (
                        <div key={entry.id} className="relative flex gap-3 pb-4 last:pb-0">
                          <div className={`absolute -left-[1px] mt-1 h-3 w-3 rounded-full border-2 border-background ${ACTION_COLOR[entry.action] ?? "bg-muted-foreground"}`} />
                          <div className="pl-5 flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <span className="text-xs font-semibold text-foreground">
                                  {ACTION_LABEL[entry.action] ?? entry.action}
                                </span>
                                <span className="text-xs text-muted-foreground ml-1.5">by {entry.changedBy.name}</span>
                              </div>
                              <span className="text-[11px] text-muted-foreground/70 whitespace-nowrap shrink-0">
                                {timeAgo(entry.changedAt)}
                              </span>
                            </div>
                            {entry.changes.length > 0 && (
                              <div className="mt-1.5 space-y-1.5">
                                {entry.changes.map((c, ci) => (
                                  <div key={ci} className="text-[11px] text-muted-foreground bg-accent/40 rounded-md px-2.5 py-2 space-y-1">
                                    <span className="font-semibold text-foreground text-xs">{c.label}</span>
                                    {c.from ? (
                                      <div className="space-y-0.5">
                                        <p className="text-muted-foreground line-through opacity-70 break-words leading-relaxed">{c.from}</p>
                                        <p className="text-foreground break-words leading-relaxed">→ {c.to || "—"}</p>
                                      </div>
                                    ) : (
                                      <p className="text-foreground break-words leading-relaxed">{c.to || "—"}</p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-border flex-shrink-0">
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={!isValid || saving}>
            {saving
              ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              : mode === "create"
              ? <Plus className="h-4 w-4 mr-1.5" />
              : <Save className="h-4 w-4 mr-1.5" />}
            {mode === "create" ? "Add Variant to Campaign" : "Save Changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}
