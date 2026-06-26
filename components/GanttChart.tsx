"use client";

import { useState } from "react";
import type { IApi } from "@svar-ui/react-gantt";
import { Gantt, Toolbar } from "@svar-ui/react-gantt";
import "@svar-ui/react-gantt/style.css";
import { GanttSkeleton } from "@/components/gantt/GanttSkeleton";
import { useGanttData } from "@/lib/gantt/hooks";

interface GanttChartProps {
  clientId:   string | null;
  onApiReady?: (api: IApi) => void;
  readOnly?:  boolean;
}

export default function GanttChart({ clientId, onApiReady, readOnly = false }: GanttChartProps) {
  const { tasks, links, isLoading } = useGanttData(clientId);
  const [api, setApi] = useState<IApi | null>(null);

  const handleInit = (ganttApi: IApi) => {
    setApi(ganttApi);
    onApiReady?.(ganttApi);

    const base = `/api/gantt/${clientId}`;

    ganttApi.on("add-task", async (ev) => {
      const { id, task, target, mode } = ev as any;
      await fetch(`${base}/tasks`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ id, task, target, mode }),
      });
    });

    ganttApi.on("update-task", async (ev) => {
      const { id, task } = ev as any;
      if (ev.inProgress) return; // skip interim drag events
      await fetch(`${base}/tasks/${id}`, {
        method:  "PUT",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ task }),
      });
    });

    ganttApi.on("delete-task", async (ev) => {
      const { id } = ev as any;
      await fetch(`${base}/tasks/${id}`, { method: "DELETE" });
    });

    ganttApi.on("add-link", async (ev) => {
      const { id, link } = ev as any;
      await fetch(`${base}/links`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ id, link }),
      });
    });

    ganttApi.on("update-link", async (ev) => {
      const { id, link } = ev as any;
      await fetch(`${base}/links/${id}`, {
        method:  "PUT",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ link }),
      });
    });

    ganttApi.on("delete-link", async (ev) => {
      const { id } = ev as any;
      await fetch(`${base}/links/${id}`, { method: "DELETE" });
    });
  };

  if (!clientId) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
        Select a client to view their Gantt chart.
      </div>
    );
  }

  if (isLoading) return <GanttSkeleton />;

  const ganttTasks = tasks.data.map((t) => ({
    id:       t.id,
    text:     t.text,
    start:    t.start ? new Date(t.start) : undefined,
    end:      t.end   ? new Date(t.end)   : undefined,
    duration: t.duration,
    progress: t.progress,
    type:     t.type,
    parent:   t.parent ?? 0,
  }));

  const ganttLinks = links.data.map((l) => ({
    id:     l.id,
    source: l.source,
    target: l.target,
    type:   l.type as any,
  }));

  return (
    <div className="w-full h-full flex flex-col">
      {!readOnly && api && (
        <div className="shrink-0">
          <Toolbar api={api} />
        </div>
      )}
      <div className="flex-1 min-h-0">
        <Gantt
          tasks={ganttTasks}
          links={ganttLinks}
          readonly={readOnly}
          init={handleInit}
        />
      </div>
    </div>
  );
}
