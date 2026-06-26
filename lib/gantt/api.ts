import type { GanttTaskClient, GanttLinkClient, GanttTaskRecord, GanttLinkRecord } from "./types";

function toDate(v: string | null | undefined): Date | undefined {
  if (!v) return undefined;
  return new Date(v);
}

function taskFromRecord(r: GanttTaskRecord): GanttTaskClient {
  return {
    id:       r.id,
    text:     r.text,
    start:    new Date(r.start),
    end:      toDate(r.end ?? undefined),
    duration: r.duration,
    progress: r.progress,
    type:     r.type,
    parent:   r.parent ?? undefined,
    clientId: r.clientId,
    orderId:  r.orderId,
  };
}

async function apiFetch<T>(url: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`[Gantt API] ${res.status} — ${text}`);
  }
  return res.json() as Promise<T>;
}

export async function fetchGanttTasks(clientId: string): Promise<GanttTaskClient[]> {
  const raw = await apiFetch<GanttTaskRecord[]>(
    `/api/gantt/${encodeURIComponent(clientId)}/tasks`
  );
  return raw.map(taskFromRecord);
}

export async function fetchGanttLinks(clientId: string): Promise<GanttLinkClient[]> {
  return apiFetch<GanttLinkClient[]>(
    `/api/gantt/${encodeURIComponent(clientId)}/links`
  );
}
