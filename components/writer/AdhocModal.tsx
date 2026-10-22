"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Zap, Loader2, X, Save } from "lucide-react";
import { ADHOC_DELIVERY_FORMATS, ADHOC_FLYER_CATEGORY } from "@/lib/types";

const LABEL = "text-xs font-semibold text-muted-foreground uppercase tracking-wider";

export interface AdhocFormData {
  clientId: string;
  title: string;
  category: string; // always "Flyer" for this modal
  copy: string;
  referenceUrl: string;
  deliveryDate: string; // YYYY-MM-DD
  deliveryFormat: "" | "digital" | "printable";
  note: string; // optional free-text note
}

export const EMPTY_ADHOC_FORM: AdhocFormData = {
  clientId: "",
  title: "",
  category: ADHOC_FLYER_CATEGORY,
  copy: "",
  referenceUrl: "",
  deliveryDate: "",
  deliveryFormat: "",
  note: "",
};

interface Props {
  mode: "create" | "edit";
  // Name of the client this flyer belongs to, shown read-only (chosen upstream).
  clientName?: string;
  initial?: Partial<AdhocFormData>;
  onClose: () => void;
  onSave: (form: AdhocFormData) => Promise<void>;
}

// The Flyer modal: a simple standalone request with a delivery date and
// digital/printable type. No platform, caption, hashtags, or buckets — every
// other adhoc category uses the full social CopyModal instead.
export function AdhocModal({ mode, clientName, initial, onClose, onSave }: Props) {
  const [form, setForm] = useState<AdhocFormData>({
    ...EMPTY_ADHOC_FORM,
    ...initial,
    category: ADHOC_FLYER_CATEGORY,
  });
  const [saving, setSaving] = useState(false);
  const today = new Date().toLocaleDateString("en-CA");

  const set = (patch: Partial<AdhocFormData>) => setForm((f) => ({ ...f, ...patch }));
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
              <Zap className="h-4 w-4 text-primary" />
            </div>
            <h2 className="text-base font-semibold text-foreground">
              {mode === "edit" ? "Edit Flyer" : "New Flyer"}
            </h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 rounded-full p-1 hover:bg-gray-100">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-5">
          {clientName && (
            <div className="space-y-2">
              <label className={LABEL}>Client</label>
              <p className="text-sm text-foreground">{clientName}</p>
            </div>
          )}

          {/* Title (optional) */}
          <div className="space-y-2">
            <label className={LABEL}>
              Title <span className="normal-case font-normal text-muted-foreground">(optional)</span>
            </label>
            <Input
              placeholder="Short label for this flyer…"
              value={form.title}
              onChange={(e) => set({ title: e.target.value })}
            />
          </div>

          {/* Copy (required) */}
          <div className="space-y-2">
            <label className={LABEL}>Copy *</label>
            <Textarea
              placeholder="The flyer copy / content…"
              className="min-h-[120px]"
              value={form.copy}
              onChange={(e) => set({ copy: e.target.value })}
            />
          </div>

          {/* Reference URL (optional) */}
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

          {/* Note (optional) */}
          <div className="space-y-2">
            <label className={LABEL}>
              Note <span className="normal-case font-normal text-muted-foreground">(optional)</span>
            </label>
            <Textarea
              placeholder="Any extra context or instructions…"
              className="min-h-[80px]"
              value={form.note}
              onChange={(e) => set({ note: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Delivery Date */}
            <div className="space-y-2">
              <label className={LABEL}>Delivery Date</label>
              <Input
                type="date"
                min={today}
                value={form.deliveryDate}
                onChange={(e) => set({ deliveryDate: e.target.value })}
              />
            </div>
            {/* Type: digital / printable */}
            <div className="space-y-2">
              <label className={LABEL}>Type</label>
              <div className="flex gap-2">
                {ADHOC_DELIVERY_FORMATS.map((f) => (
                  <button
                    key={f.value}
                    type="button"
                    onClick={() =>
                      set({ deliveryFormat: form.deliveryFormat === f.value ? "" : f.value })
                    }
                    className={`flex-1 text-xs font-medium px-3 py-2 rounded-lg border transition-colors ${
                      form.deliveryFormat === f.value
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-gray-200 text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
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
