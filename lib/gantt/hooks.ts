import { useState, useEffect, useCallback } from "react";
import { fetchGanttTasks, fetchGanttLinks } from "./api";
import type { GanttTaskClient, GanttLinkClient } from "./types";

export function useGanttTasks(clientId: string | null) {
  const [data, setData]       = useState<GanttTaskClient[]>([]);
  const [isLoading, setLoading] = useState(false);
  const [isError, setError]   = useState(false);

  const load = useCallback(async () => {
    if (!clientId) { setData([]); return; }
    setLoading(true);
    setError(false);
    try {
      setData(await fetchGanttTasks(clientId));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => { load(); }, [load]);

  return { data, isLoading, isError, refetch: load };
}

export function useGanttLinks(clientId: string | null) {
  const [data, setData]         = useState<GanttLinkClient[]>([]);
  const [isLoading, setLoading] = useState(false);
  const [isError, setError]     = useState(false);

  const load = useCallback(async () => {
    if (!clientId) { setData([]); return; }
    setLoading(true);
    setError(false);
    try {
      setData(await fetchGanttLinks(clientId));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => { load(); }, [load]);

  return { data, isLoading, isError, refetch: load };
}

export function useGanttData(clientId: string | null) {
  const tasks = useGanttTasks(clientId);
  const links = useGanttLinks(clientId);

  const isLoading = tasks.isLoading || links.isLoading;
  const isError   = tasks.isError   || links.isError;

  const refetch = useCallback(() => {
    tasks.refetch();
    links.refetch();
  }, [tasks, links]);

  return { tasks, links, isLoading, isError, refetch };
}
