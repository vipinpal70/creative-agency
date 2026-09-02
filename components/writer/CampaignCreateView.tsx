"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Megaphone, Loader2, Check } from "lucide-react";
import type { WriterCalendar } from "./types";

// Paid-media campaign platforms & funnel stages (both multi-select).
export const CAMPAIGN_PLATFORMS = [
  { id: "meta",     label: "Meta" },
  { id: "google",   label: "Google" },
  { id: "linkedin", label: "LinkedIn" },
] as const;

export const FUNNEL_STAGES = [
  { id: "TOF", label: "TOF", hint: "Top of funnel" },
  { id: "MOF", label: "MOF", hint: "Middle of funnel" },
  { id: "BOF", label: "BOF", hint: "Bottom of funnel" },
] as const;

interface Client { id: string; name: string; brandName?: string }
interface ScopeItem { id: string; module?: string; label: string; unit?: string; platforms?: string[] }
interface Scope { id: string; period?: string; label?: string; isActive?: boolean; createdAt?: string; items: ScopeItem[] }

function formatScopeLabel(s: Scope): string {
  const title = s.label || s.period || "";
  const date = s.createdAt
    ? new Date(s.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : "";
  return [title, date].filter(Boolean).join("  ·  ");
}

interface Props {
  onBack: () => void;
  onCreated: (cal: WriterCalendar) => void;
}

export function CampaignCreateView({ onBack, onCreated }: Props) {
  // Step: 1=client+scope, 2=campaign details
  const [step, setStep] = useState<1 | 2>(1);
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
  const [name, setName]                 = useState("");
  const [brief, setBrief]               = useState("");
  const [platforms, setPlatforms]       = useState<string[]>([]);
  const [funnelStages, setFunnelStages] = useState<string[]>([]);
  const [startDate, setStartDate]       = useState("");
  const [endDate, setEndDate]           = useState("");

  // Load clients
  useEffect(() => {
    fetch("/api/clients")
      .then((r) => r.json())
      .then((data: Client[]) => setClients(data))
      .finally(() => setLoadingClients(false));
  }, []);

  // Load scopes when client changes
  useEffect(() => {
    if (!clientId) { setScopes([]); setScopeId(""); return; }
    setLoadingScopes(true);
    fetch(`/api/clients/${clientId}/scope`)
      .then((r) => r.json())
      .then((data: Scope[]) => {
        setScopes(data);
        setScopeId(data[0]?.id || "");
      })
      .finally(() => setLoadingScopes(false));
  }, [clientId]);

  const togglePlatform = (id: string) =>
    setPlatforms((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  const toggleFunnel = (id: string) =>
    setFunnelStages((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

  const canSubmit =
    name.trim() && platforms.length > 0 && funnelStages.length > 0 &&
    startDate && endDate && endDate >= startDate;

  const handleSubmit = async () => {
    if (!canSubmit || saving) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/writer/calendars", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId, scopeId, module: "paid",
          name: name.trim(), objective: brief.trim(),
          startDate, endDate,
          platforms, funnelStages,
          plannedItems: [],
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed to create campaign"); return; }
      onCreated({
        ...data,
        clientName: clients.find((c) => c.id === clientId)?.name || "—",
        platforms,
        funnelStages,
        progress: { totalPlanned: 0, totalCreated: 0, totalDelivered: 0 },
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
        {(["Client & Scope", "Campaign Details"] as const).map((label, i) => (
          <span key={label} className="flex items-center gap-1.5">
            <span className={step === i + 1 ? "text-primary font-semibold" : "text-muted-foreground"}>
              {i + 1}. {label}
            </span>
            {i < 1 && <span className="text-muted-foreground">→</span>}
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
                  Next: Campaign Details →
                </Button>
              </div>
            </>
          )}

          {/* ── Step 2: Campaign Details ── */}
          {step === 2 && (
            <>
              <p className="text-sm font-semibold text-foreground">Campaign details</p>

              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Campaign Name *</label>
                <Input
                  placeholder="e.g. Q3 Lead-Gen Push"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Campaign Brief</label>
                <Textarea
                  placeholder="What's the main goal and message for this campaign?"
                  className="min-h-[90px]"
                  value={brief}
                  onChange={(e) => setBrief(e.target.value)}
                />
              </div>

              {/* Platforms — multi-select */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Platform * <span className="normal-case font-normal text-muted-foreground">— select all that apply</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {CAMPAIGN_PLATFORMS.map((p) => {
                    const on = platforms.includes(p.id);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => togglePlatform(p.id)}
                        className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full border transition-colors ${
                          on
                            ? "border-primary bg-primary/10 text-primary font-medium"
                            : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                        }`}
                      >
                        {on && <Check className="h-3.5 w-3.5" />}
                        {p.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Funnel stages — multi-select */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Funnel Stage * <span className="normal-case font-normal text-muted-foreground">— select all that apply</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {FUNNEL_STAGES.map((f) => {
                    const on = funnelStages.includes(f.id);
                    return (
                      <button
                        key={f.id}
                        type="button"
                        title={f.hint}
                        onClick={() => toggleFunnel(f.id)}
                        className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full border transition-colors ${
                          on
                            ? "border-primary bg-primary/10 text-primary font-medium"
                            : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                        }`}
                      >
                        {on && <Check className="h-3.5 w-3.5" />}
                        {f.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Start Date *</label>
                  <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">End Date *</label>
                  <Input
                    type="date"
                    value={endDate}
                    min={startDate || undefined}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>

              {startDate && endDate && endDate < startDate && (
                <p className="text-xs text-destructive">End date can&apos;t be before the start date.</p>
              )}
              {error && <p className="text-xs text-destructive">{error}</p>}

              <div className="flex justify-between pt-2">
                <Button variant="outline" onClick={() => setStep(1)}>← Back</Button>
                <Button onClick={handleSubmit} disabled={!canSubmit || saving}>
                  {saving
                    ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Creating…</>
                    : <><Megaphone className="h-4 w-4 mr-1" /> Create Campaign</>}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
