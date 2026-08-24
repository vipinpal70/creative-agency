"use client";

import { useEffect, useState } from "react";
import { Loader2, Megaphone, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { CAMPAIGN_PLATFORMS, FUNNEL_STAGES } from "@/components/writer/CampaignCreateView";
import type { WriterCalendar } from "@/components/writer/types";

const STATUSES = ["draft", "active", "completed", "paused"] as const;

export interface CampaignEditDialogProps {
  campaign: WriterCalendar;
  onClose: () => void;
  /** Called with the patched fields after a successful save. */
  onSaved: (patch: Partial<WriterCalendar>) => void;
}

/**
 * Edit modal for a paid campaign's core fields — name, dates, status, brief,
 * platforms and funnel stages. Client/scope/module stay fixed after
 * creation, same convention as CalendarEditDialog.
 */
export function CampaignEditDialog({ campaign, onClose, onSaved }: CampaignEditDialogProps) {
  const { toast } = useToast();
  const [name, setName]                 = useState(campaign.name);
  const [objective, setObjective]       = useState(campaign.objective || "");
  const [startDate, setStartDate]       = useState(campaign.startDate.slice(0, 10));
  const [endDate, setEndDate]           = useState(campaign.endDate.slice(0, 10));
  const [status, setStatus]             = useState(campaign.status);
  const [platforms, setPlatforms]       = useState<string[]>(campaign.platforms ?? []);
  const [funnelStages, setFunnelStages] = useState<string[]>(campaign.funnelStages ?? []);
  const [saving, setSaving]             = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !saving) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [saving, onClose]);

  const togglePlatform = (id: string) =>
    setPlatforms((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  const toggleFunnel = (id: string) =>
    setFunnelStages((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  const save = async () => {
    if (!name.trim()) {
      toast({ title: "Campaign name cannot be empty" });
      return;
    }
    if (new Date(startDate) > new Date(endDate)) {
      toast({ title: "Start date must be before end date" });
      return;
    }
    if (platforms.length === 0) {
      toast({ title: "Select at least one platform" });
      return;
    }
    if (funnelStages.length === 0) {
      toast({ title: "Select at least one funnel stage" });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(
        `/api/clients/${campaign.clientId}/calendars/${campaign.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            objective: objective.trim(),
            startDate,
            endDate,
            status,
            platforms,
            funnelStages,
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        toast({ title: data.error || "Failed to update campaign" });
        return;
      }
      onSaved({
        name: name.trim(),
        objective: objective.trim(),
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        status,
        platforms,
        funnelStages,
      });
      toast({ title: "Campaign updated" });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[1px]"
        onClick={() => !saving && onClose()}
      />
      <div className="relative w-full max-w-md rounded-xl bg-white shadow-xl border border-gray-100 p-5 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Megaphone className="h-4.5 w-4.5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-gray-900">Edit campaign</h2>
            <p className="text-xs text-gray-500">Update campaign name, brief, platforms or dates.</p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="camp-name" className="text-xs">Name</Label>
            <Input
              id="camp-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Campaign name"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="camp-brief" className="text-xs">Campaign Brief</Label>
            <Textarea
              id="camp-brief"
              className="min-h-[80px]"
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              placeholder="What's the main goal and message for this campaign?"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Platforms</Label>
            <div className="flex flex-wrap gap-1.5">
              {CAMPAIGN_PLATFORMS.map((p) => {
                const on = platforms.includes(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => togglePlatform(p.id)}
                    className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border transition-colors ${
                      on
                        ? "border-primary bg-primary/10 text-primary font-medium"
                        : "border-gray-200 text-gray-500 hover:border-primary/40 hover:text-gray-800"
                    }`}
                  >
                    {on && <Check className="h-3 w-3" />}
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Funnel Stages</Label>
            <div className="flex flex-wrap gap-1.5">
              {FUNNEL_STAGES.map((f) => {
                const on = funnelStages.includes(f.id);
                return (
                  <button
                    key={f.id}
                    type="button"
                    title={f.hint}
                    onClick={() => toggleFunnel(f.id)}
                    className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border transition-colors ${
                      on
                        ? "border-primary bg-primary/10 text-primary font-medium"
                        : "border-gray-200 text-gray-500 hover:border-primary/40 hover:text-gray-800"
                    }`}
                  >
                    {on && <Check className="h-3 w-3" />}
                    {f.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="camp-start" className="text-xs">Start date</Label>
              <Input
                id="camp-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="camp-end" className="text-xs">End date</Label>
              <Input
                id="camp-end"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="camp-status" className="text-xs">Status</Label>
            <select
              id="camp-status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm capitalize focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s} className="capitalize">{s}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-1 border-t border-gray-100">
          <Button variant="ghost" size="sm" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button size="sm" onClick={save} disabled={saving}>
            {saving && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
            Save changes
          </Button>
        </div>
      </div>
    </div>
  );
}
