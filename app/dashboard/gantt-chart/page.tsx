"use client";

import { useState, useCallback, useEffect } from "react";
import type { IApi } from "@svar-ui/react-gantt";
import { Building2, ChevronDown, Copy } from "lucide-react";
import { toast } from "sonner";

import GanttChart from "@/components/GanttChart";
import { DuplicateGanttModal } from "@/components/gantt/DuplicateGanttModal";

interface Client {
  id:        string;
  name:      string;
  brandName?: string;
}

export default function GanttPage() {
  const [clients, setClients]                   = useState<Client[]>([]);
  const [loadingClients, setLoadingClients]     = useState(true);
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [ganttApi, setGanttApi]                 = useState<IApi | null>(null);
  const [isDuplicateOpen, setIsDuplicateOpen]   = useState(false);

  // Load client list on mount
  useEffect(() => {
    setLoadingClients(true);
    fetch("/api/clients")
      .then((r) => r.json())
      .then((data) => setClients(Array.isArray(data) ? data : []))
      .catch(() => toast.error("Failed to load clients"))
      .finally(() => setLoadingClients(false));
  }, []);

  const handleApiReady = useCallback((api: IApi) => {
    setGanttApi(api);
  }, []);

  const handleClientChange = (clientId: string) => {
    setSelectedClientId(clientId);
    setGanttApi(null);
  };

  const selectedClient = clients.find((c) => c.id === selectedClientId);

  const handleDuplicateSuccess = (targetClientId: string) => {
    toast.success("Gantt chart duplicated successfully!");
    setSelectedClientId(targetClientId);
  };

  return (
    <div className="flex flex-col h-full gap-4 max-w-[1600px] mx-auto w-full">
      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex items-start justify-between shrink-0">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Gantt Chart</h1>
          <p className="text-sm text-muted-foreground mt-1">Strategic planning and phase tracking</p>
        </div>

        {selectedClientId && (
          <button
            onClick={() => setIsDuplicateOpen(true)}
            className="h-9 px-4 text-sm font-medium text-foreground bg-background border border-border rounded-lg hover:bg-accent transition-colors flex items-center gap-2"
          >
            <Copy className="w-4 h-4" />
            Duplicate to client
          </button>
        )}
      </div>

      {/* ── Toolbar row ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3 px-4 py-3 bg-card border border-border rounded-lg shrink-0">
        <div className="flex items-center gap-3">
          {/* Client dropdown */}
          <div className="relative">
            <Building2 className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <select
              value={selectedClientId}
              onChange={(e) => handleClientChange(e.target.value)}
              disabled={loadingClients}
              className="appearance-none h-9 pl-8 pr-8 rounded-lg border border-border bg-background text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary min-w-[200px]"
              aria-label="Select client"
            >
              <option value="">
                {loadingClients ? "Loading clients…" : "Select a client…"}
              </option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.brandName || c.name}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-6 px-2">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-teal-500" />
            <span className="text-xs font-medium text-muted-foreground">Summary</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-blue-500" />
            <span className="text-xs font-medium text-muted-foreground">Task</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-pink-500" />
            <span className="text-xs font-medium text-muted-foreground">Milestone</span>
          </div>
        </div>
      </div>

      {/* ── Gantt Chart ─────────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden mb-2">
        <GanttChart
          clientId={selectedClientId || null}
          onApiReady={handleApiReady}
          readOnly={false}
        />
      </div>

      {/* ── Duplicate Modal ──────────────────────────────────────── */}
      {isDuplicateOpen && selectedClientId && (
        <DuplicateGanttModal
          sourceClientId={selectedClientId}
          sourceClientName={selectedClient?.brandName || selectedClient?.name || ""}
          onClose={() => setIsDuplicateOpen(false)}
          onSuccess={handleDuplicateSuccess}
        />
      )}
    </div>
  );
}
