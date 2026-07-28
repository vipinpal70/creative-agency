"use client";

import { useState, useEffect } from "react";
import { Loader2, Pencil, Plus, Trash2, Sliders, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import type { WriterCalendar, PlannedItem } from "@/components/writer/types";

export interface CalendarScopeEditModalProps {
  calendar: WriterCalendar;
  onClose: () => void;
  /** Called with updated plannedItems and progress after a successful save. */
  onSaved: (patch: { plannedItems: PlannedItem[]; progress?: { totalPlanned: number; totalCreated: number; totalDelivered: number } }) => void;
}

export function CalendarScopeEditModal({ calendar, onClose, onSaved }: CalendarScopeEditModalProps) {
  const { toast } = useToast();
  const [items, setItems] = useState<PlannedItem[]>(() => {
    return (calendar.plannedItems || []).map((item) => ({
      scopeItemId: item.scopeItemId || item.label.toLowerCase().replace(/[^a-z0-9]/g, "-"),
      label: item.label,
      type: item.type || item.label,
      platforms: item.platforms || [],
      plannedQty: item.plannedQty,
      totalInScope: item.totalInScope,
      createdQty: item.createdQty || 0,
      deliveredQty: item.deliveredQty || 0,
    }));
  });

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !saving) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [saving, onClose]);

  const updateItemQty = (index: number, field: "plannedQty" | "totalInScope", value: number) => {
    const nextVal = Math.max(0, isNaN(value) ? 0 : value);
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: nextVal } : item))
    );
  };

  const updateItemLabel = (index: number, label: string) => {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, label, type: label } : item))
    );
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const addItem = () => {
    const newItem: PlannedItem = {
      scopeItemId: `item-${Date.now()}`,
      label: "custom item",
      type: "custom item",
      platforms: [],
      plannedQty: 1,
      totalInScope: 1,
      createdQty: 0,
      deliveredQty: 0,
    };
    setItems((prev) => [...prev, newItem]);
  };

  const totalPlanned = items.reduce((sum, item) => sum + (Number(item.plannedQty) || 0), 0);

  const handleSave = async () => {
    if (items.length === 0) {
      toast({ title: "Please keep at least one scope item" });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(
        `/api/clients/${calendar.clientId}/calendars/${calendar.id}/scope`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            plannedItems: items.map((i) => ({
              scopeItemId: i.scopeItemId,
              label: i.label,
              type: i.type,
              platforms: i.platforms,
              plannedQty: Number(i.plannedQty) || 0,
              totalInScope: Number(i.totalInScope) || 0,
            })),
          }),
        }
      );

      const data = await res.json();
      if (!res.ok) {
        toast({ title: data.error || "Failed to update scope of work" });
        return;
      }

      onSaved({
        plannedItems: data.plannedItems || items,
        progress: data.progress,
      });

      toast({ title: "Scope of work updated successfully" });
      onClose();
    } catch (err) {
      toast({ title: "Network error saving scope of work" });
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
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
        onClick={() => !saving && onClose()}
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-gray-100 p-6 space-y-5 max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-start justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Sliders className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">Edit Scope of Work</h2>
              <p className="text-xs text-gray-500 line-clamp-1">{calendar.name}</p>
            </div>
          </div>
          <button
            type="button"
            className="text-gray-400 hover:text-gray-600 rounded-lg p-1 transition-colors"
            onClick={onClose}
            disabled={saving}
          >
            ✕
          </button>
        </div>

        {/* Live Preview Chips */}
        <div className="bg-emerald-50/70 border border-emerald-100 rounded-xl p-3 shrink-0 space-y-1.5">
          <p className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider">Preview Badges</p>
          <div className="flex flex-wrap gap-1.5">
            {items.map((item, idx) => (
              <span
                key={item.scopeItemId || idx}
                className="text-[11px] px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-medium"
              >
                {item.label || "item"}: {item.plannedQty}/{item.totalInScope}
              </span>
            ))}
          </div>
        </div>

        {/* Editable Items List */}
        <div className="overflow-y-auto flex-1 space-y-3 pr-1">
          {items.map((item, index) => (
            <div
              key={item.scopeItemId || index}
              className="p-3.5 rounded-xl border border-gray-200 bg-gray-50/50 space-y-3"
            >
              <div className="flex items-center justify-between gap-2">
                <Input
                  className="h-8 text-xs font-semibold text-gray-900 bg-white"
                  value={item.label}
                  onChange={(e) => updateItemLabel(index, e.target.value)}
                  placeholder="e.g. reel, story, static/image, carousel"
                />
                <button
                  type="button"
                  title="Remove item"
                  className="h-8 w-8 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg flex items-center justify-center transition-colors shrink-0"
                  onClick={() => removeItem(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                {/* Planned Copies in Calendar */}
                <div className="space-y-1">
                  <Label className="text-[11px] text-gray-600 font-medium">Planned Copies</Label>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      className="h-7 w-7 rounded bg-white border border-gray-200 text-gray-700 flex items-center justify-center font-bold hover:bg-gray-100 active:scale-95 transition-transform"
                      onClick={() => updateItemQty(index, "plannedQty", item.plannedQty - 1)}
                    >
                      -
                    </button>
                    <Input
                      type="number"
                      min={0}
                      className="h-7 text-xs text-center font-bold bg-white"
                      value={item.plannedQty}
                      onChange={(e) => updateItemQty(index, "plannedQty", parseInt(e.target.value) || 0)}
                    />
                    <button
                      type="button"
                      className="h-7 w-7 rounded bg-white border border-gray-200 text-gray-700 flex items-center justify-center font-bold hover:bg-gray-100 active:scale-95 transition-transform"
                      onClick={() => updateItemQty(index, "plannedQty", item.plannedQty + 1)}
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Total Agreed Scope */}
                <div className="space-y-1">
                  <Label className="text-[11px] text-gray-600 font-medium">Total in Scope</Label>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      className="h-7 w-7 rounded bg-white border border-gray-200 text-gray-700 flex items-center justify-center font-bold hover:bg-gray-100 active:scale-95 transition-transform"
                      onClick={() => updateItemQty(index, "totalInScope", item.totalInScope - 1)}
                    >
                      -
                    </button>
                    <Input
                      type="number"
                      min={0}
                      className="h-7 text-xs text-center font-bold bg-white"
                      value={item.totalInScope}
                      onChange={(e) => updateItemQty(index, "totalInScope", parseInt(e.target.value) || 0)}
                    />
                    <button
                      type="button"
                      className="h-7 w-7 rounded bg-white border border-gray-200 text-gray-700 flex items-center justify-center font-bold hover:bg-gray-100 active:scale-95 transition-transform"
                      onClick={() => updateItemQty(index, "totalInScope", item.totalInScope + 1)}
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full text-xs border-dashed text-primary hover:bg-primary/5"
            onClick={addItem}
          >
            <Plus className="h-3.5 w-3.5 mr-1" /> Add Scope Item
          </Button>
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-gray-100 flex items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-gray-500 font-medium">
            Total Planned: <span className="font-semibold text-gray-900">{totalPlanned} copies</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="h-3.5 w-3.5 mr-1" />
                  Save Scope
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
