"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  LayoutGrid,
  CalendarDays,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MODULES } from "@/lib/types";
import type { ModuleKey } from "@/lib/types";
import { ContentPreviewModal } from "./ContentPreviewModal";
import type { CalendarCopy, CalendarDraft } from "./types";

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const CAL_VIEWS = ["Month", "Agenda"] as const;
type CalView = (typeof CAL_VIEWS)[number];

const DELIVERABLE_STATUSES = [
  { key: "pending",         label: "Draft",           color: "bg-muted/80" },
  { key: "in_progress",     label: "In Progress",     color: "bg-blue-500/10 border-blue-200" },
  { key: "internal_review", label: "Internal Review", color: "bg-amber-500/10 border-amber-200" },
  { key: "client_review",   label: "Client Review",   color: "bg-purple-500/10 border-purple-200" },
  { key: "approved",        label: "Approved",        color: "bg-green-500/10 border-green-200" },
  { key: "delivered",       label: "Delivered",       color: "bg-emerald-500/10 border-emerald-200" },
];

const DRAFT_DOT: Record<string, string> = {
  draft:     "bg-muted-foreground",
  submitted: "bg-amber-500",
  approved:  "bg-green-500",
  rejected:  "bg-red-500",
};

interface Client {
  id: string;
  name: string;
  brandName?: string;
}

interface Scope {
  id: string;
  label?: string;
  period?: string;
  isActive?: boolean;
}

function getMonthGrid(year: number, month: number) {
  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7; // Mon-first
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  return {
    offset,
    days: Array.from({ length: daysInMonth }, (_, i) => i + 1),
  };
}

function getDisplayDate(item: CalendarCopy): string | null {
  if (item.draft?.publishDate) {
    return item.draft.publishDate.slice(0, 10);
  }
  if (item.scheduledDate) {
    return item.scheduledDate.slice(0, 10);
  }
  return null;
}

// ── Kanban card ──────────────────────────────────────────────────────
function KanbanCard({
  item,
  onClick,
}: {
  item: CalendarCopy;
  onClick: () => void;
}) {
  const mod = MODULES.find((m) => m.key === item.module);
  const draftDot = DRAFT_DOT[item.draft?.status ?? ""] ?? "bg-muted-foreground";
  const previewText =
    item.draft?.caption ||
    item.draft?.creativeCopy ||
    item.title ||
    "";

  return (
    <button
      onClick={onClick}
      className="w-full text-left p-3 rounded-lg border border-border bg-card hover:shadow-md transition-shadow space-y-2"
    >
      <div className="flex items-start gap-2">
        {mod && (
          <span
            className="h-2 w-2 rounded-full mt-1 flex-shrink-0"
            style={{ background: `hsl(var(--mod-${mod.tone}))` }}
          />
        )}
        <p className="text-xs font-medium text-foreground line-clamp-2 flex-1">
          {previewText || item.type}
        </p>
      </div>
      <div className="flex items-center gap-1.5 flex-wrap">
        {item.platforms.slice(0, 2).map((p) => (
          <span
            key={p}
            className="text-[9px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground capitalize"
          >
            {p}
          </span>
        ))}
        <span className="text-[9px] px-1.5 py-0.5 rounded bg-muted/60 text-muted-foreground capitalize">
          {item.draft?.mediaType || item.type}
        </span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[9px] text-muted-foreground">
          {getDisplayDate(item)
            ? new Date(getDisplayDate(item)!).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })
            : "No date"}
        </span>
        {item.draft && (
          <div className="flex items-center gap-1">
            <span className={cn("h-1.5 w-1.5 rounded-full", draftDot)} />
            <span className="text-[9px] text-muted-foreground capitalize">
              {item.draft.status}
            </span>
          </div>
        )}
      </div>
    </button>
  );
}

// ── Calendar chip (month grid) ───────────────────────────────────────
function CalendarChip({
  item,
  onClick,
}: {
  item: CalendarCopy;
  onClick: () => void;
}) {
  const mod = MODULES.find((m) => m.key === item.module);
  const draftDot = DRAFT_DOT[item.draft?.status ?? ""] ?? "bg-muted-foreground";
  const label =
    item.draft?.caption ||
    item.draft?.creativeCopy?.slice(0, 40) ||
    item.type;

  return (
    <button
      onClick={onClick}
      className="mt-1 p-1.5 rounded-md cursor-pointer hover:shadow-sm transition-shadow w-full text-left border"
      style={
        mod
          ? {
              background: `hsl(var(--mod-${mod.tone}) / 0.08)`,
              borderColor: `hsl(var(--mod-${mod.tone}) / 0.25)`,
            }
          : undefined
      }
    >
      <p
        className="text-[10px] font-semibold leading-tight truncate"
        style={
          mod ? { color: `hsl(var(--mod-${mod.tone}))` } : undefined
        }
      >
        {label}
      </p>
      <div className="flex items-center justify-between mt-0.5 gap-1">
        <span className="text-[9px] text-muted-foreground truncate">
          {item.platforms[0] ?? item.module}
        </span>
        {item.draft && (
          <span
            className={cn("h-1.5 w-1.5 rounded-full flex-shrink-0", draftDot)}
          />
        )}
      </div>
    </button>
  );
}

// ── Main Component ───────────────────────────────────────────────────
export default function ContentCalendar() {
  const [clients, setClients]             = useState<Client[]>([]);
  const [scopes, setScopes]               = useState<Scope[]>([]);
  const [items, setItems]                 = useState<CalendarCopy[]>([]);
  const [selectedClient, setSelectedClient] = useState("");
  const [selectedScope, setSelectedScope]   = useState("");
  const [loadingClients, setLoadingClients] = useState(true);
  const [loadingScopes, setLoadingScopes]   = useState(false);
  const [loadingItems, setLoadingItems]     = useState(false);

  const [mainTab, setMainTab]   = useState<"calendar" | "kanban">("calendar");
  const [calView, setCalView]   = useState<CalView>("Month");
  const [cursor, setCursor]     = useState(new Date());
  const [activeModules, setActiveModules] = useState<ModuleKey[]>([
    "social", "paid", "seo", "email", "website", "orm",
    "influencer", "video", "design", "custom",
  ]);
  const [selectedItem, setSelectedItem] = useState<CalendarCopy | null>(null);

  // Load clients on mount
  useEffect(() => {
    setLoadingClients(true);
    fetch("/api/clients")
      .then((r) => r.json())
      .then((data) => setClients(Array.isArray(data) ? data : []))
      .catch(() => setClients([]))
      .finally(() => setLoadingClients(false));
  }, []);

  // Load scopes when client changes
  useEffect(() => {
    if (!selectedClient) {
      setScopes([]);
      setSelectedScope("");
      setItems([]);
      return;
    }
    setLoadingScopes(true);
    setScopes([]);
    setSelectedScope("");
    setItems([]);
    fetch(`/api/clients/${selectedClient}/scope`)
      .then((r) => r.json())
      .then((data) => setScopes(Array.isArray(data) ? data : []))
      .catch(() => setScopes([]))
      .finally(() => setLoadingScopes(false));
  }, [selectedClient]);

  // Load calendar items when scope is selected
  const fetchItems = () => {
    if (!selectedClient) return;
    setLoadingItems(true);
    const url = selectedScope
      ? `/api/calendar?clientId=${selectedClient}&scopeId=${selectedScope}`
      : `/api/calendar?clientId=${selectedClient}`;
    fetch(url)
      .then((r) => r.json())
      .then((data) => setItems(Array.isArray(data) ? data : []))
      .catch(() => setItems([]))
      .finally(() => setLoadingItems(false));
  };

  useEffect(() => {
    fetchItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClient, selectedScope]);

  const toggleModule = (k: ModuleKey) =>
    setActiveModules((a) =>
      a.includes(k) ? a.filter((x) => x !== k) : [...a, k]
    );

  // Filter items by active modules
  const filtered = useMemo(
    () => items.filter((i) => activeModules.includes(i.module as ModuleKey)),
    [items, activeModules]
  );

  // Month-filtered items
  const monthFiltered = useMemo(() => {
    const y = cursor.getFullYear();
    const m = cursor.getMonth();
    return filtered.filter((i) => {
      const d = getDisplayDate(i);
      if (!d) return false;
      const date = new Date(d);
      return date.getFullYear() === y && date.getMonth() === m;
    });
  }, [filtered, cursor]);

  // Group by day for month view
  const byDay = useMemo(() => {
    const map = new Map<number, CalendarCopy[]>();
    monthFiltered.forEach((i) => {
      const d = getDisplayDate(i);
      if (!d) return;
      const day = new Date(d).getDate();
      map.set(day, [...(map.get(day) ?? []), i]);
    });
    return map;
  }, [monthFiltered]);

  // Group by status for kanban
  const byStatus = useMemo(() => {
    const map = new Map<string, CalendarCopy[]>();
    DELIVERABLE_STATUSES.forEach(({ key }) => map.set(key, []));
    filtered.forEach((i) => {
      const bucket = map.get(i.status) ?? [];
      bucket.push(i);
      map.set(i.status, bucket);
    });
    return map;
  }, [filtered]);

  const { offset, days } = getMonthGrid(cursor.getFullYear(), cursor.getMonth());
  const monthLabel = cursor.toLocaleString("en-US", {
    month: "long",
    year: "numeric",
  });

  const handleUpdate = (deliverableId: string, updatedDraft: CalendarDraft) => {
    setItems((prev) =>
      prev.map((i) =>
        i.deliverableId === deliverableId ? { ...i, draft: updatedDraft } : i
      )
    );
    // Also update the selected item if it's the same
    setSelectedItem((prev) =>
      prev?.deliverableId === deliverableId
        ? { ...prev, draft: updatedDraft }
        : prev
    );
  };

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-semibold text-foreground">Content Calendar</h1>
        <p className="text-sm text-muted-foreground mt-1">
          All channels in one view — click any item to preview, edit, or approve.
        </p>
      </div>

      {/* Client + Scope selectors */}
      <Card>
        <CardContent className="p-4 flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 min-w-[200px] flex-1 max-w-xs">
            <Select
              value={selectedClient}
              onValueChange={setSelectedClient}
              disabled={loadingClients}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    loadingClients ? "Loading clients…" : "Select client"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.brandName || c.name}
                  </SelectItem>
                ))}
                {clients.length === 0 && !loadingClients && (
                  <div className="px-3 py-2 text-xs text-muted-foreground">
                    No clients found
                  </div>
                )}
              </SelectContent>
            </Select>
          </div>

          {selectedClient && (
            <div className="flex items-center gap-2 min-w-[200px] flex-1 max-w-xs">
              <Select
                value={selectedScope}
                onValueChange={setSelectedScope}
                disabled={loadingScopes}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      loadingScopes ? "Loading scopes…" : "All scopes"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All scopes</SelectItem>
                  {scopes.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.label || s.period || s.id}
                    </SelectItem>
                  ))}
                  {scopes.length === 0 && !loadingScopes && (
                    <div className="px-3 py-2 text-xs text-muted-foreground">
                      No scopes found
                    </div>
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          {selectedClient && (
            <Button
              variant="ghost"
              size="icon"
              onClick={fetchItems}
              disabled={loadingItems}
              title="Refresh"
            >
              <RefreshCw
                className={cn("h-4 w-4", loadingItems && "animate-spin")}
              />
            </Button>
          )}

          <div className="text-xs text-muted-foreground ml-auto">
            {loadingItems ? (
              <span className="flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" /> Loading…
              </span>
            ) : selectedClient ? (
              `${filtered.length} item${filtered.length !== 1 ? "s" : ""}`
            ) : (
              "Select a client to begin"
            )}
          </div>
        </CardContent>
      </Card>

      {/* Main tabs: Calendar / Kanban */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Button
            variant={mainTab === "calendar" ? "default" : "outline"}
            size="sm"
            onClick={() => setMainTab("calendar")}
          >
            <CalendarDays className="h-3.5 w-3.5 mr-1.5" />
            Calendar
          </Button>
          <Button
            variant={mainTab === "kanban" ? "default" : "outline"}
            size="sm"
            onClick={() => setMainTab("kanban")}
          >
            <LayoutGrid className="h-3.5 w-3.5 mr-1.5" />
            Kanban
          </Button>
        </div>

        {mainTab === "calendar" && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() =>
                setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))
              }
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium text-foreground min-w-[140px] text-center">
              {monthLabel}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() =>
                setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))
              }
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Module filter chips */}
      <Card>
        <CardContent className="p-3 flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 rounded-lg bg-muted p-0.5">
            {mainTab === "calendar" &&
              CAL_VIEWS.map((v) => (
                <button
                  key={v}
                  onClick={() => setCalView(v)}
                  className={cn(
                    "text-xs px-3 py-1 rounded-md transition-colors",
                    calView === v
                      ? "bg-card shadow-sm text-foreground font-medium"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {v}
                </button>
              ))}
            {mainTab === "kanban" && (
              <span className="text-xs px-3 py-1 text-muted-foreground">
                Kanban
              </span>
            )}
          </div>

          <div className="h-5 w-px bg-border mx-1" />

          {MODULES.map((m) => {
            const on = activeModules.includes(m.key);
            return (
              <button
                key={m.key}
                onClick={() => toggleModule(m.key)}
                className={cn(
                  "text-xs px-2.5 py-1 rounded-full border transition-all flex items-center gap-1.5",
                  on
                    ? "border-transparent"
                    : "border-border text-muted-foreground opacity-50"
                )}
                style={
                  on
                    ? {
                        background: `hsl(var(--mod-${m.tone}) / 0.12)`,
                        color: `hsl(var(--mod-${m.tone}))`,
                        borderColor: `hsl(var(--mod-${m.tone}) / 0.3)`,
                      }
                    : undefined
                }
              >
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ background: `hsl(var(--mod-${m.tone}))` }}
                />
                {m.label}
              </button>
            );
          })}
        </CardContent>
      </Card>

      {/* Content */}
      {!selectedClient ? (
        <Card>
          <CardContent className="p-12 text-center">
            <CalendarDays className="h-12 w-12 text-muted-foreground/20 mx-auto mb-4" />
            <p className="text-sm font-medium text-foreground">
              Select a client to view their content calendar
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Choose a client from the dropdown above to get started.
            </p>
          </CardContent>
        </Card>
      ) : loadingItems ? (
        <Card>
          <CardContent className="p-12 flex items-center justify-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              Loading calendar…
            </span>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* ── Calendar Tab ────────────────────────────────── */}
          {mainTab === "calendar" && (
            <>
              {calView === "Month" && (
                <Card>
                  <CardContent className="p-4">
                    {monthFiltered.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-6">
                        No items scheduled in{" "}
                        {cursor.toLocaleString("en-US", { month: "long", year: "numeric" })}.
                      </p>
                    )}
                    <div className="grid grid-cols-7 gap-px">
                      {DAY_NAMES.map((d) => (
                        <div
                          key={d}
                          className="text-center text-xs font-semibold text-muted-foreground py-2"
                        >
                          {d}
                        </div>
                      ))}
                      {Array.from({ length: offset }).map((_, i) => (
                        <div
                          key={`b-${i}`}
                          className="min-h-[100px] bg-accent/20 rounded-lg"
                        />
                      ))}
                      {days.map((day) => {
                        const today = new Date();
                        const isToday =
                          today.getDate() === day &&
                          today.getMonth() === cursor.getMonth() &&
                          today.getFullYear() === cursor.getFullYear();

                        return (
                          <div
                            key={day}
                            className="min-h-[100px] border border-border/50 rounded-lg p-1.5 hover:bg-accent/20 transition-colors"
                          >
                            <span
                              className={cn(
                                "text-xs font-medium",
                                isToday
                                  ? "h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px]"
                                  : "text-muted-foreground"
                              )}
                            >
                              {day}
                            </span>
                            {(byDay.get(day) ?? []).map((ev, i) => (
                              <CalendarChip
                                key={ev.deliverableId}
                                item={ev}
                                onClick={() => setSelectedItem(ev)}
                              />
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}

              {calView === "Agenda" && (
                <Card>
                  <CardContent className="p-4 space-y-1">
                    {monthFiltered.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-8">
                        Nothing scheduled this month.
                      </p>
                    )}
                    {[...monthFiltered]
                      .sort((a, b) => {
                        const da = getDisplayDate(a) ?? "";
                        const db = getDisplayDate(b) ?? "";
                        return da.localeCompare(db);
                      })
                      .map((ev) => {
                        const mod = MODULES.find((m) => m.key === ev.module);
                        const draftDot =
                          DRAFT_DOT[ev.draft?.status ?? ""] ??
                          "bg-muted-foreground";
                        const label =
                          ev.draft?.caption ||
                          ev.draft?.creativeCopy?.slice(0, 60) ||
                          ev.title ||
                          ev.type;
                        const date = getDisplayDate(ev);

                        return (
                          <button
                            key={ev.deliverableId}
                            onClick={() => setSelectedItem(ev)}
                            className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-accent text-left transition-colors"
                          >
                            {mod && (
                              <span
                                className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                                style={{
                                  background: `hsl(var(--mod-${mod.tone}))`,
                                }}
                              />
                            )}
                            <div className="text-xs text-muted-foreground w-24 flex-shrink-0">
                              {date
                                ? new Date(date).toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                  })
                                : "No date"}
                              {ev.draft?.publishTime && (
                                <span className="ml-1">
                                  · {ev.draft.publishTime}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-foreground flex-1 truncate">
                              {label}
                            </p>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              {ev.draft && (
                                <span
                                  className={cn(
                                    "h-2 w-2 rounded-full",
                                    draftDot
                                  )}
                                />
                              )}
                              <span className="text-xs text-muted-foreground capitalize hidden sm:block">
                                {ev.draft?.mediaType || ev.type}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {/* ── Kanban Tab ──────────────────────────────────── */}
          {mainTab === "kanban" && (
            <div className="overflow-x-auto pb-4">
              <div
                className="grid gap-4"
                style={{
                  gridTemplateColumns: `repeat(${DELIVERABLE_STATUSES.length}, minmax(220px, 1fr))`,
                  minWidth: `${DELIVERABLE_STATUSES.length * 240}px`,
                }}
              >
                {DELIVERABLE_STATUSES.map(({ key, label, color }) => {
                  const col = byStatus.get(key) ?? [];
                  return (
                    <div key={key} className="flex flex-col gap-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-foreground">
                          {label}
                        </span>
                        <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">
                          {col.length}
                        </span>
                      </div>
                      <div
                        className={cn(
                          "rounded-xl border p-2 space-y-2 min-h-[160px]",
                          color
                        )}
                      >
                        {col.length === 0 && (
                          <p className="text-[10px] text-muted-foreground text-center py-4">
                            Empty
                          </p>
                        )}
                        {col.map((item) => (
                          <KanbanCard
                            key={item.deliverableId}
                            item={item}
                            onClick={() => setSelectedItem(item)}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* Preview Modal */}
      <ContentPreviewModal
        item={selectedItem}
        open={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        onUpdate={handleUpdate}
      />
    </div>
  );
}
