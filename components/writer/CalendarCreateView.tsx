"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, CalendarPlus, Loader2, Plus, Minus } from "lucide-react";
import type { WriterCalendar } from "./types";

interface Client { id: string; name: string; brandName?: string }
interface ScopeItem { id: string; module?: string; label: string; unit?: string; platforms?: string[] }
interface Scope { id: string; period?: string; label?: string; isActive?: boolean; createdAt?: string; items: ScopeItem[] }

function formatScopeLabel(s: Scope): string {
  const title = s.label || s.period || "";
  const modules = [...new Set((s.items ?? []).map((i) => i.module).filter(Boolean))]
    .map((m) => (m as string).charAt(0).toUpperCase() + (m as string).slice(1))
    .join(", ");
  const date = s.createdAt
    ? new Date(s.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : "";
  const parts = [title, modules, date].filter(Boolean);
  return parts.join("  ·  ");
}

interface Props {
  onBack: () => void;
  onCreated: (cal: WriterCalendar) => void;
}

export function CalendarCreateView({ onBack, onCreated }: Props) {
  // Step: 1=client+scope, 2=details, 3=planned items
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Step 1 state
  const [clients, setClients]           = useState<Client[]>([]);
  const [clientId, setClientId]         = useState("");
  const [scopes, setScopes]             = useState<Scope[]>([]);
  const [scopeId, setScopeId]           = useState("");
  const [loadingClients, setLoadingClients] = useState(true);
  const [loadingScopes, setLoadingScopes]   = useState(false);

  // Step 2 state
  const [module, setModule]       = useState("");
  const [name, setName]           = useState("");
  const [objective, setObjective] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate]     = useState("");

  // Step 3 state: scopeItemId → plannedQty
  const [plannedQtys, setPlannedQtys] = useState<Record<string, number>>({});

  // Load clients
  useEffect(() => {
    fetch("/api/clients")
      .then((r) => r.json())
      .then((data: Client[]) => setClients(data))
      .finally(() => setLoadingClients(false));
  }, []);

  // Load scopes when client changes
  useEffect(() => {
    if (!clientId) { setScopes([]); setScopeId(""); setModule(""); return; }
    setLoadingScopes(true);
    fetch(`/api/clients/${clientId}/scope`)
      .then((r) => r.json())
      .then((data: Scope[]) => {
        setScopes(data);
        setScopeId(data[0]?.id || "");
        setModule("");
      })
      .finally(() => setLoadingScopes(false));
  }, [clientId]);

  // Reset module + planned qtys when scope changes
  useEffect(() => { setModule(""); setPlannedQtys({}); }, [scopeId]);

  // Reset planned qtys when module changes
  useEffect(() => { setPlannedQtys({}); }, [module]);

  const selectedScope = scopes.find((s) => s.id === scopeId);

  // Unique modules present in the selected scope
  const scopeModules = [...new Set(
    (selectedScope?.items ?? []).map((i) => i.module).filter(Boolean) as string[]
  )];

  // Items filtered to the selected module
  const moduleItems = (selectedScope?.items ?? []).filter((i) => i.module === module);

  const setQty = (itemId: string, delta: number) => {
    setPlannedQtys((prev) => {
      const cur = prev[itemId] ?? 0;
      const next = Math.max(0, cur + delta);
      return { ...prev, [itemId]: next };
    });
  };

  const plannedItems = Object.entries(plannedQtys)
    .filter(([, qty]) => qty > 0)
    .map(([scopeItemId, plannedQty]) => ({ scopeItemId, plannedQty }));

  const canSubmit = plannedItems.length > 0;

  const handleSubmit = async () => {
    if (!canSubmit || saving) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/writer/calendars", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId, scopeId, module, name: name.trim(), objective: objective.trim(),
          startDate, endDate, plannedItems,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed to create calendar"); return; }
      onCreated({
        ...data,
        clientName: clients.find((c) => c.id === clientId)?.name || "—",
        progress: { totalPlanned: plannedItems.reduce((s, i) => s + i.plannedQty, 0), totalCreated: 0, totalDelivered: 0 },
      });
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Breadcrumb / step indicator */}
      <div className="flex items-center gap-2 text-xs">
        <Button variant="ghost" size="sm" className="h-7 px-2" onClick={onBack}>
          <ArrowLeft className="h-3 w-3 mr-1" /> Back
        </Button>
        <span className="text-muted-foreground">|</span>
        {(["Client & Scope", "Calendar Details", "Planned Items"] as const).map((label, i) => (
          <span key={label} className="flex items-center gap-1.5">
            <span className={step === i + 1 ? "text-primary font-semibold" : "text-muted-foreground"}>
              {i + 1}. {label}
            </span>
            {i < 2 && <span className="text-muted-foreground">→</span>}
          </span>
        ))}
      </div>

      <Card>
        <CardContent className="p-5 space-y-5">
          {/* ── Step 1: Client & Scope ── */}
          {step === 1 && (
            <>
              <p className="text-sm font-semibold text-foreground">Select client and scope of work</p>

              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Client</label>
                {loadingClients ? (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading clients…
                  </div>
                ) : (
                  <Select value={clientId} onValueChange={setClientId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a client" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}{c.brandName && c.brandName !== c.name ? ` (${c.brandName})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {clientId && (
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Scope of Work</label>
                  {loadingScopes ? (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading scopes…
                    </div>
                  ) : scopes.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No scope found for this client.</p>
                  ) : (
                    <Select value={scopeId} onValueChange={setScopeId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select scope" />
                      </SelectTrigger>
                      <SelectContent>
                        {scopes.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {formatScopeLabel(s)}
                            {s.isActive && (
                              <span className="ml-2 text-[10px] font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">
                                Active
                              </span>
                            )}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              )}

              <div className="flex justify-end pt-2">
                <Button disabled={!clientId || !scopeId} onClick={() => setStep(2)}>
                  Next: Calendar Details →
                </Button>
              </div>
            </>
          )}

          {/* ── Step 2: Calendar Details ── */}
          {step === 2 && (
            <>
              <p className="text-sm font-semibold text-foreground">Calendar details</p>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Module *</label>
                  <Select value={module} onValueChange={setModule}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select module" />
                    </SelectTrigger>
                    <SelectContent>
                      {scopeModules.map((m) => (
                        <SelectItem key={m} value={m}>
                          {m.charAt(0).toUpperCase() + m.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Calendar Name *</label>
                  <Input
                    placeholder="e.g. June Social Calendar"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Start Date *</label>
                  <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">End Date *</label>
                  <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Objective</label>
                <Textarea
                  placeholder="What's the main goal for this calendar period?"
                  className="min-h-[90px]"
                  value={objective}
                  onChange={(e) => setObjective(e.target.value)}
                />
              </div>

              <div className="flex justify-between pt-2">
                <Button variant="outline" onClick={() => setStep(1)}>← Back</Button>
                <Button disabled={!module || !name.trim() || !startDate || !endDate} onClick={() => setStep(3)}>
                  Next: Planned Items →
                </Button>
              </div>
            </>
          )}

          {/* ── Step 3: Planned Items ── */}
          {step === 3 && selectedScope && (
            <>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">How many of each item in this calendar?</p>
                <p className="text-xs text-muted-foreground">Set quantity for each scope item you'll deliver this period.</p>
              </div>

              <div className="space-y-3">
                {moduleItems.map((item) => {
                  const max = parseInt(item.unit || "0") || 0;
                  const qty = plannedQtys[item.id] ?? 0;
                  return (
                    <div
                      key={item.id}
                      className="flex items-center justify-between rounded-lg border border-border bg-accent/20 px-4 py-3"
                    >
                      <div>
                        <p className="text-sm font-medium text-foreground">{item.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.platforms?.length ? item.platforms.join(", ") : "—"} · max {parseInt(item.unit || "0") || 0}/scope
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => setQty(item.id, -1)}
                          disabled={qty === 0}
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </Button>
                        <span className="w-8 text-center text-sm font-semibold text-foreground">{qty}</span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => setQty(item.id, 1)}
                          disabled={false}
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {error && <p className="text-xs text-destructive">{error}</p>}

              <div className="flex justify-between pt-2">
                <Button variant="outline" onClick={() => setStep(2)}>← Back</Button>
                <Button onClick={handleSubmit} disabled={!canSubmit || saving}>
                  {saving
                    ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Creating…</>
                    : <><CalendarPlus className="h-4 w-4 mr-1" /> Create Calendar</>}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
