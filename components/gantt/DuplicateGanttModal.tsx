"use client";

import { useState, useEffect } from "react";
import { X, Copy, Loader2 } from "lucide-react";

interface Client {
  id:        string;
  name:      string;
  brandName?: string;
}

interface DuplicateGanttModalProps {
  sourceClientId:   string;
  sourceClientName: string;
  onClose:          () => void;
  onSuccess:        (targetClientId: string) => void;
}

export function DuplicateGanttModal({
  sourceClientId,
  sourceClientName,
  onClose,
  onSuccess,
}: DuplicateGanttModalProps) {
  const [targetClientId, setTargetClientId] = useState("");
  const [isSubmitting, setIsSubmitting]     = useState(false);
  const [error, setError]                   = useState<string | null>(null);
  const [clients, setClients]               = useState<Client[]>([]);
  const [isLoading, setIsLoading]           = useState(true);

  useEffect(() => {
    setIsLoading(true);
    fetch("/api/clients")
      .then((r) => r.json())
      .then((data: Client[]) => setClients(Array.isArray(data) ? data : []))
      .catch(() => setError("Failed to load clients"))
      .finally(() => setIsLoading(false));
  }, []);

  const otherClients = clients.filter((c) => c.id !== sourceClientId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetClientId) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/gantt/${sourceClientId}/duplicate`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ targetClientId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to duplicate");
      }
      onSuccess(targetClientId);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-background rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-border">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Duplicate Gantt Chart</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Copy all tasks &amp; links from{" "}
              <span className="font-medium text-foreground">{sourceClientName}</span>
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-accent rounded-lg transition-colors">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-lg border border-destructive/20">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Copy into client</label>
            {isLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground h-10">
                <Loader2 className="w-4 h-4 animate-spin" /> Loading clients…
              </div>
            ) : otherClients.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">No other clients available.</p>
            ) : (
              <select
                required
                value={targetClientId}
                onChange={(e) => setTargetClientId(e.target.value)}
                className="w-full h-10 pl-3 pr-3 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
              >
                <option value="" disabled>Select target client…</option>
                {otherClients.map((c) => (
                  <option key={c.id} value={c.id}>{c.brandName || c.name}</option>
                ))}
              </select>
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            All tasks and dependency links will be copied into the selected client. Existing tasks will not be removed.
          </p>

          <div className="flex items-center gap-3 pt-2 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-10 text-sm font-medium text-foreground bg-background border border-border rounded-lg hover:bg-accent transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !targetClientId || otherClients.length === 0}
              className="flex-1 h-10 text-sm font-medium text-primary-foreground bg-primary rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Copying…</>
              ) : (
                <><Copy className="w-4 h-4" /> Duplicate</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
