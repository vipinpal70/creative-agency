"use client";

import { useState, useRef } from "react";
import type { IApi, ILink } from "@svar-ui/react-gantt";
import { Editor, Gantt, Toolbar, Willow } from "@svar-ui/react-gantt";
import { Button } from "@svar-ui/react-core";
import "@svar-ui/react-gantt/all.css";
import { GanttSkeleton } from "@/components/gantt/GanttSkeleton";
import { useGanttData } from "@/lib/gantt/hooks";

interface GanttChartProps {
  clientId:   string | null;
  onApiReady?: (api: IApi) => void;
  readOnly?:  boolean;
}

export default function GanttChart({ clientId, onApiReady, readOnly = false }: GanttChartProps) {
  const { tasks, links, isLoading, refetch } = useGanttData(clientId);
  const [api, setApi] = useState<IApi | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isDeletingRef = useRef(isDeleting);
  isDeletingRef.current = isDeleting;

  const CustomSaveButton: React.FC<any> = ({ onClick, disabled }) => (
    <Button
      type="primary"
      disabled={disabled || isSaving || isDeleting}
      onClick={onClick}
      css="flex items-center gap-1.5"
    >
      {isSaving && (
        <svg className="animate-spin h-3.5 w-3.5 text-white mr-1 inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )}
      <span>Save</span>
    </Button>
  );

  const CustomDeleteButton: React.FC<any> = ({ onClick, disabled }) => (
    <Button
      type="danger"
      disabled={disabled || isSaving || isDeleting}
      onClick={onClick}
      css="flex items-center gap-1.5"
    >
      {isDeleting && (
        <svg className="animate-spin h-3.5 w-3.5 text-white mr-1 inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )}
      <span>Delete</span>
    </Button>
  );

  const CustomCancelButton: React.FC<any> = ({ onClick, disabled }) => (
    <Button
      type="secondary"
      disabled={disabled || isSaving || isDeleting}
      onClick={onClick}
      css="flex items-center gap-1.5"
    >
      <span>Cancel</span>
    </Button>
  );

  const editorTopBar = {
    items: [
      { comp: "spacer" },
      {
        comp: CustomDeleteButton,
        id: "delete",
      },
      {
        comp: CustomCancelButton,
        id: "cancel",
      },
      {
        comp: CustomSaveButton,
        id: "save",
      }
    ]
  };

  const handleEditorAction = async (ev: any) => {
    const { item, values } = ev;
    if (item.id === "delete") {
      const taskId = values.id;
      if (!taskId) return;
      setIsDeleting(true);
      try {
        const base = `/api/gantt/${clientId}`;
        await fetch(`${base}/tasks/${taskId}`, { method: "DELETE" });
        api?.exec("delete-task", { id: taskId });
      } catch (err) {
        console.error(err);
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const handleInit = (ganttApi: IApi) => {
    setApi(ganttApi);
    onApiReady?.(ganttApi);

    const base = `/api/gantt/${clientId}`;

    ganttApi.on("add-task", async (ev) => {
      const { id, task, target, mode } = ev;
      await fetch(`${base}/tasks`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ id, task, target, mode }),
      });
      refetch();
    });

    ganttApi.on("update-task", async (ev) => {
      const { id, task } = ev;
      if (ev.inProgress) return; // skip interim drag events
      setIsSaving(true);
      try {
        await fetch(`${base}/tasks/${id}`, {
          method:  "PUT",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ task }),
        });
      } catch (err) {
        console.error(err);
      } finally {
        setIsSaving(false);
      }
    });

    ganttApi.on("delete-task", async (ev) => {
      const { id } = ev;
      if (isDeletingRef.current) return; // skip duplicate call if triggered from custom delete button
      await fetch(`${base}/tasks/${id}`, { method: "DELETE" });
    });

    ganttApi.on("add-link", async (ev) => {
      const { id, link } = ev;
      await fetch(`${base}/links`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ id, link }),
      });
      refetch();
    });

    ganttApi.on("update-link", async (ev) => {
      const { id, link } = ev;
      await fetch(`${base}/links/${id}`, {
        method:  "PUT",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ link }),
      });
    });

    ganttApi.on("delete-link", async (ev) => {
      const { id } = ev;
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
    type:   l.type as ILink["type"],
  }));

  return (
    <Willow>
      <div className="relative w-full h-full flex flex-col rounded-lg border border-border overflow-hidden bg-card">
        {/* Inject CSS override to constrain editor sidebar height and enable scrolling */}
        <style>{`
          .wx-side-panel, .wx-side-area, .wx-panel {
            max-height: 100% !important;
            height: 100% !important;
          }
          .wx-panel .wx-content {
            overflow-y: auto !important;
          }
        `}</style>

        {!readOnly && api && (
          <div className="shrink-0 border-b border-border">
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
        {/* The task editor is a standalone component in SVAR Gantt v2 —
            without it, double-clicking a task fires "show-editor" into the void */}
        {!readOnly && api && (
          <Editor
            api={api}
            autoSave={false}
            topBar={editorTopBar}
            onAction={handleEditorAction}
          />
        )}
      </div>
    </Willow>
  );
}
