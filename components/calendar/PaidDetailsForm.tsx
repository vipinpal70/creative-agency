"use client";

import type { Dispatch, SetStateAction } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ExternalLink, Plus, X } from "lucide-react";
import { isReelOrVideoType } from "@/lib/status-flow";
import { RepeatableList } from "@/components/writer/RepeatableList";
import { VARIANT_CTAS, GOOGLE_CTAS } from "@/components/writer/VariantModal";
import { VIDEO_TYPE_OPTIONS } from "@/components/writer/types";
import type { CustomParameter } from "@/components/writer/types";
import type { CalendarCopy, CalendarDraft } from "./types";

// Paid-media counterpart of the calendar/social Details form inside
// ContentPreviewModal. Mirrors the writer's VariantModal field set — Copy,
// Primary Texts, Headlines, Descriptions, CTA, Landing URL — wired to the
// modal's shared `form`/`setForm` so what a reviewer edits saves back to the
// same ContentDraft the writer authored. Media type is fixed after creation
// (surfaced as a header tag), so it is not editable here.
export function PaidDetailsForm({
  form,
  setForm,
  draft,
  item,
}: {
  form: Partial<CalendarDraft>;
  setForm: Dispatch<SetStateAction<Partial<CalendarDraft>>>;
  draft: CalendarDraft;
  item: CalendarCopy;
}) {
  const mediaType = (draft.mediaType || item.type || "").toLowerCase();
  const isCarousel = mediaType === "carousel";
  const isVideo = isReelOrVideoType(draft.mediaType || item.type);

  const isGoogle = (form.adPlatform ?? draft.adPlatform ?? "meta") === "google";
  const primaryTexts = form.primaryTexts ?? [""];
  const headlines = form.headlines ?? [""];
  const descriptions = form.descriptions ?? [];
  const customParameters: CustomParameter[] = form.customParameters ?? [];

  const setCustomParameters = (rows: CustomParameter[]) =>
    setForm((f) => ({ ...f, customParameters: rows }));

  return (
    <div className="space-y-5">
      {/* Platform tag (fixed after creation) */}
      <div>
        <Label className="text-xs">Ad Platform</Label>
        <p className="mt-1.5 text-sm font-medium text-foreground">
          {isGoogle ? "Google" : "Meta"}
        </p>
      </div>

      {/* Google — Business Name */}
      {isGoogle && (
        <div>
          <Label className="text-xs">Business Name</Label>
          <Input
            className="mt-1.5 text-sm"
            placeholder="Your business name"
            value={form.businessName ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, businessName: e.target.value }))}
          />
        </div>
      )}

      {/* Copy (standalone, required) — shown for both Meta & Google */}
      <div>
        <Label className="text-xs">Copy</Label>
        <Textarea
          className="mt-1.5 min-h-[80px] text-sm"
          placeholder="Ad copy…"
          value={form.adCopy ?? ""}
          onChange={(e) => setForm((f) => ({ ...f, adCopy: e.target.value }))}
        />
      </div>

      {/* Meta — Primary Texts (up to 5; not used by Google) */}
      {!isGoogle && (
        <RepeatableList
          label="Primary Text"
          addLabel="Add primary text"
          values={primaryTexts}
          onChange={(v) => setForm((f) => ({ ...f, primaryTexts: v }))}
          required
          multiline
          placeholder="The main body copy of the ad…"
        />
      )}

      {/* Carousel frames — editable per-card copy */}
      {isCarousel && (form.frames ?? draft.frames).length > 0 && (
        <div className="space-y-3 p-3 rounded-lg bg-muted/40 border border-border">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Carousel Frames ({(form.frames ?? draft.frames).length})
          </p>
          <div className="space-y-3">
            {(form.frames ?? draft.frames).map((fr, i) => (
              <div key={i} className="space-y-1">
                <Label className="text-xs text-muted-foreground">Frame {fr.frameNo}</Label>
                <Textarea
                  className="min-h-[60px] text-sm"
                  placeholder={`Copy for frame ${fr.frameNo}…`}
                  value={fr.copy ?? ""}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      frames: (f.frames ?? draft.frames).map((frame, idx) =>
                        idx === i ? { ...frame, copy: e.target.value } : frame
                      ),
                    }))
                  }
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Headlines (up to 5) */}
      <RepeatableList
        label="Headline"
        addLabel="Add headline"
        values={headlines}
        onChange={(v) => setForm((f) => ({ ...f, headlines: v }))}
        required
        placeholder="Short attention-grabbing headline"
      />

      {/* Google — Long Headline */}
      {isGoogle && (
        <div>
          <Label className="text-xs">Long Headline</Label>
          <Textarea
            className="mt-1.5 min-h-[60px] text-sm"
            placeholder="A longer headline shown in larger placements…"
            value={form.longHeadline ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, longHeadline: e.target.value }))}
          />
        </div>
      )}

      {/* Descriptions (up to 5; required for Google) */}
      <RepeatableList
        label="Description"
        addLabel="Add description"
        values={descriptions}
        onChange={(v) => setForm((f) => ({ ...f, descriptions: v }))}
        required={isGoogle}
        placeholder="Supporting description line"
      />

      {/* Google — URL options */}
      {isGoogle && (
        <div className="space-y-3 p-3 rounded-lg bg-muted/40 border border-border">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            URL Options
          </p>
          <div>
            <Label className="text-xs">Tracking Template</Label>
            <Input
              className="mt-1.5 text-sm"
              placeholder="{lpurl}?utm_source=google"
              value={form.trackingTemplate ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, trackingTemplate: e.target.value }))}
            />
          </div>
          <div>
            <Label className="text-xs">Final URL Suffix</Label>
            <Input
              className="mt-1.5 text-sm"
              placeholder="key=value&key2=value2"
              value={form.finalUrlSuffix ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, finalUrlSuffix: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Custom Parameter</Label>
            {customParameters.map((row, i) => (
              <div key={i} className="flex items-center gap-2">
                <Input
                  className="text-sm"
                  placeholder="name"
                  value={row.name}
                  onChange={(e) =>
                    setCustomParameters(customParameters.map((r, idx) => (idx === i ? { ...r, name: e.target.value } : r)))
                  }
                />
                <Input
                  className="text-sm"
                  placeholder="value"
                  value={row.value}
                  onChange={(e) =>
                    setCustomParameters(customParameters.map((r, idx) => (idx === i ? { ...r, value: e.target.value } : r)))
                  }
                />
                <button
                  type="button"
                  onClick={() => setCustomParameters(customParameters.filter((_, idx) => idx !== i))}
                  title="Remove custom parameter"
                  className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setCustomParameters([...customParameters, { name: "", value: "" }])}
              className="flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
            >
              <Plus className="h-3.5 w-3.5" /> Add
            </button>
          </div>
        </div>
      )}

      {/* CTA & Landing URL */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">{isGoogle ? "Call to Action Text" : "CTA"}</Label>
          <Select
            value={form.cta ?? ""}
            onValueChange={(v) => setForm((f) => ({ ...f, cta: v }))}
          >
            <SelectTrigger className="mt-1.5">
              <SelectValue placeholder="Select CTA" />
            </SelectTrigger>
            <SelectContent>
              {(isGoogle ? GOOGLE_CTAS : VARIANT_CTAS).map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Landing URL</Label>
          <Input
            type="url"
            className="mt-1.5 text-xs"
            placeholder="https://"
            value={form.landingUrl ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, landingUrl: e.target.value }))}
          />
        </div>
      </div>

      {/* Reference URL */}
      <div>
        <Label className="text-xs">Reference URL</Label>
        <div className="mt-1.5 flex gap-2 items-center">
          <Input
            type="url"
            className="text-xs flex-1"
            placeholder="https://example.com/reference…"
            value={form.referenceUrl ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, referenceUrl: e.target.value }))}
          />
          {form.referenceUrl && (
            <a
              href={form.referenceUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-primary hover:underline flex items-center gap-1 flex-shrink-0"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Open
            </a>
          )}
        </div>
      </div>

      {/* Launch Date */}
      <div>
        <Label className="text-xs">Launch Date</Label>
        <Input
          type="date"
          className="mt-1.5 text-xs"
          value={form.publishDate ?? ""}
          onChange={(e) => setForm((f) => ({ ...f, publishDate: e.target.value }))}
        />
      </div>

      {/* Video Type / Notes (video media type only) */}
      {isVideo && (
        <div className="space-y-3 p-3 rounded-lg bg-muted/40 border border-border">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Video Details
          </p>
          <div className="flex flex-wrap gap-4">
            {VIDEO_TYPE_OPTIONS.map((opt) => (
              <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="paidVideoType"
                  value={opt.value}
                  checked={form.videoType === opt.value}
                  onChange={() => setForm((f) => ({ ...f, videoType: opt.value }))}
                  className="h-4 w-4 accent-primary"
                />
                <span className="text-sm text-foreground">{opt.label}</span>
              </label>
            ))}
          </div>
          <div>
            <Label className="text-xs">Video Notes</Label>
            <Input
              className="mt-1.5 text-sm"
              placeholder="Any notes about the video production…"
              value={form.videoNotes ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, videoNotes: e.target.value }))}
            />
          </div>
        </div>
      )}

      {/* Internal Notes */}
      <div>
        <Label className="text-xs">Internal Notes</Label>
        <Textarea
          className="mt-1.5 text-sm"
          placeholder="Notes for the team…"
          value={form.notes ?? ""}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
        />
      </div>
    </div>
  );
}
