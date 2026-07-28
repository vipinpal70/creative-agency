"use client";

import { useEffect, useState } from "react";
import { Loader2, CalendarCog, Sliders } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import type { WriterCalendar } from "@/components/writer/types";

const STATUSES = ["draft", "active", "completed", "paused"] as const;

export interface CalendarEditDialogProps {
  calendar: WriterCalendar;
  onClose: () => void;
  /** Called with the patched fields after a successful save. */
  onSaved: (patch: Partial<WriterCalendar>) => void;
  /** Optional callback to open the scope of work editor */
  onOpenScopeEdit?: () => void;
}

/**
 * Lightweight edit modal for a calendar's core fields (name, dates, status).
 * Objective/buckets/copies are edited inside the workspace, not here.
 */
export function CalendarEditDialog({ calendar, onClose, onSaved, onOpenScopeEdit }: CalendarEditDialogProps) {
  const { toast } = useToast();
  const [name, setName]           = useState(calendar.name);
  const [startDate, setStartDate] = useState(calendar.startDate.slice(0, 10));
  const [endDate, setEndDate]     = useState(calendar.endDate.slice(0, 10));
  const [status, setStatus]       = useState(calendar.status);
  const [saving, setSaving]       = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !saving) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [saving, onClose]);

  const save = async () => {
    if (!name.trim()) {
      toast({ title: "Calendar name cannot be empty" });
      return;
    }
    if (new Date(startDate) > new Date(endDate)) {
      toast({ title: "Start date must be before end date" });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(
        `/api/clients/${calendar.clientId}/calendars/${calendar.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            startDate,
            endDate,
            status,
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        toast({ title: data.error || "Failed to update calendar" });
        return;
      }
      onSaved({
        name: name.trim(),
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        status,
      });
      toast({ title: "Calendar updated" });
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
      <div className="relative w-full max-w-md rounded-xl bg-white shadow-xl border border-gray-100 p-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <CalendarCog className="h-4.5 w-4.5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-gray-900">Edit calendar</h2>
              <p className="text-xs text-gray-500">Update calendar metadata or scope of work.</p>
            </div>
          </div>
          {onOpenScopeEdit && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 gap-1 text-xs text-primary border-primary/20 hover:bg-primary/5 shrink-0"
              onClick={() => {
                onClose();
                onOpenScopeEdit();
              }}
            >
              <Sliders className="h-3.5 w-3.5" />
              Edit Scope
            </Button>
          )}
        </div>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="cal-name" className="text-xs">Name</Label>
            <Input
              id="cal-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Calendar name"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="cal-start" className="text-xs">Start date</Label>
              <Input
                id="cal-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cal-end" className="text-xs">End date</Label>
              <Input
                id="cal-end"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cal-status" className="text-xs">Status</Label>
            <select
              id="cal-status"
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

        <div className="flex items-center justify-between gap-2 pt-1 border-t border-gray-100">
          {/* {onOpenScopeEdit ? (
            <button
              type="button"
              className="text-xs text-primary hover:underline font-medium flex items-center gap-1"
              onClick={() => {
                onClose();
                onOpenScopeEdit();
              }}
            >
              <Sliders className="h-3.5 w-3.5" /> Edit Scope of Work
            </button>
          ) : <div />} */}

          <div className="flex items-center gap-2">
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
    </div>
  );
}
