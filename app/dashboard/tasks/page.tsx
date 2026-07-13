"use client";

import { useState, useMemo, useEffect } from "react";
import { Plus, Building2, Tag, ListChecks } from "lucide-react";
import { NewTaskModal } from "@/components/tasks/NewTaskModal";
import { TaskDetailModal } from "@/components/tasks/TaskDetailModal";
import { KanbanBoard } from "@/components/tasks/KanbanBoard";
import { useAuth } from "@/hooks/useAuth";
import type { TaskStatus, TaskPriority } from "@/lib/task-status";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  endDate?: string;
  clientId: string;
  organizationId: string;
  mediaUrls?: string[];
  feedbacks: string[];
  countSubTask: number;
  client: { companyName: string };
  assignedTo?: { id: string; name: string; roles?: string[] } | null;
  category?: string | null;
  module?: string | null;
}

interface Client {
  id: string;
  companyName: string;
}

// ─── API Helpers ──────────────────────────────────────────────────────────────

const fetchTasks = async () => {
  const res = await fetch("/api/tasks");
  if (!res.ok) throw new Error("Failed to fetch tasks");
  return res.json();
};

type MemberResponse = {
  user: {
    id: string;
    name: string;
  };
  roles?: string[];
};

const fetchMembers = async () => {
  const res = await fetch("/api/members");
  if (!res.ok) throw new Error("Failed to fetch members");
  const data = await res.json();
  return data.map((m: MemberResponse) => ({
    id: m.user.id,
    name: m.user.name,
    roles: m.roles ?? [],
  }));
};

const formatCategoryLabel = (category: string) =>
  category.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

// ─── Main Component ───────────────────────────────────────────────────────────

const PRIVILEGED_ROLES = new Set(["ADMIN", "TEAM_LEAD", "ACCOUNT_MANAGER"]);

export default function TasksPage() {
  const { user } = useAuth();

  const isAdmin = user?.role === "admin";
  const canEdit =
    isAdmin || (user?.roles ?? []).some((r: string) => PRIVILEGED_ROLES.has(r));

  const [clientFilter, setClientFilter] = useState<string>("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [members, setMembers] = useState<{ id: string; name: string; roles: string[] }[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadTasks = () =>
    fetchTasks()
      .then(setTasks)
      .catch((err) => {
        console.error(err);
        toast.error("Failed to load tasks");
      });

  const loadClients = () =>
    fetch("/api/clients")
      .then((res) => (res.ok ? res.json() : []))
      .then((data: { id: string; brandName?: string; name?: string }[]) =>
        setClients(
          data.map((c) => ({
            id: c.id,
            companyName: c.brandName || c.name || "Unknown",
          }))
        )
      )
      .catch(console.error);

  const loadMembers = () => fetchMembers().then(setMembers).catch(console.error);

  useEffect(() => {
    loadTasks();
    loadClients();
    loadMembers();
  }, []);

  // All categories for the filter dropdown
  const categories = [
    "Copywriter",
    "Graphic Designer",
    "Video Editor",
    "SEO Specialist",
    "Performance Marketing Specialist",
    "Email Marketing Specialist",
    "Whatsapp Marketing Specialist",
  ];

  const visibleTasks = useMemo(
    () =>
      tasks.filter(
        (t) =>
          (!clientFilter || t.clientId === clientFilter) &&
          (!categoryFilter || t.category === categoryFilter)
      ),
    [tasks, clientFilter, categoryFilter]
  );

  const handleCreate = async (data: Record<string, unknown>) => {
    setIsCreating(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          organizationId: "default-org",
          createdById: user?.id,
        }),
      });
      if (res.ok) {
        toast.success("Task created successfully!");
        setIsNewModalOpen(false);
        loadTasks();
      } else {
        toast.error("Failed to create task");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error creating task");
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdate = async (id: string, data: Record<string, unknown>) => {
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const updated = await res.json();
        setSelectedTask((prev) => (prev?.id === updated.id ? { ...prev, ...updated } : prev));
        toast.success("Task updated");
        loadTasks();
      } else {
        toast.error("Failed to update task");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error updating task");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleStatusChange = (task: Task, status: TaskStatus) => {
    if (task.status === status) return;
    // Optimistic column move; loadTasks() inside handleUpdate reconciles
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status } : t)));
    handleUpdate(task.id, { status });
  };

  const handleDelete = async (id: string) => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/tasks/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Task deleted");
        setSelectedTask(null);
        loadTasks();
      } else {
        toast.error("Failed to delete task");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error deleting task");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCreateSubTask = async (id: string, data: { title: string }) => {
    try {
      const res = await fetch(`/api/tasks/${id}/subtasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        if (selectedTask) {
          const detailRes = await fetch(`/api/tasks/${selectedTask.id}`);
          if (detailRes.ok) setSelectedTask(await detailRes.json());
        }
        toast.success("Subtask added");
        loadTasks();
      } else {
        toast.error("Failed to add subtask");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error adding subtask");
    }
  };

  const handleOpenDetail = (task: Task) => {
    // Team members can only open tasks assigned to them
    if (!canEdit && task.assignedTo?.id !== user?.id) return;
    // Fetch full detail including subtasks
    fetch(`/api/tasks/${task.id}`)
      .then((res) => res.json())
      .then((data) => setSelectedTask(data));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 mb-1 flex items-center gap-2">
            <ListChecks className="w-5 h-5" />
            Task Board
          </h1>
          <p className="text-gray-500 text-sm">Kanban view of all tasks.</p>
        </div>

        {canEdit && (
          <button
            onClick={() => setIsNewModalOpen(true)}
            className="inline-flex items-center gap-2 bg-black text-white p-2 rounded-lg font-semibold text-xs hover:bg-black/90 transition-all"
          >
            <Plus className="w-4 h-4" />
            New Task
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm flex flex-wrap gap-3 items-center">
        <div className="relative">
          <Building2 className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <select
            className="pl-9 pr-8 py-2 rounded-lg border border-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all appearance-none bg-gray-50/50 text-gray-900 min-w-[180px]"
            value={clientFilter}
            onChange={(e) => setClientFilter(e.target.value)}
            aria-label="Filter by client"
          >
            <option value="">All Clients</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.companyName}</option>
            ))}
          </select>
        </div>

        <div className="relative">
          <Tag className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <select
            className="pl-9 pr-8 py-2 rounded-lg border border-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all appearance-none bg-gray-50/50 text-gray-900 min-w-[180px]"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            aria-label="Filter by category"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>{formatCategoryLabel(c)}</option>
            ))}
          </select>
        </div>

        {(clientFilter || categoryFilter) && (
          <button
            onClick={() => {
              setClientFilter("");
              setCategoryFilter("");
            }}
            className="text-xs text-gray-500 hover:text-red-500 underline underline-offset-2"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Kanban Board */}
      <KanbanBoard
        tasks={visibleTasks}
        onTaskClick={handleOpenDetail}
        onStatusChange={handleStatusChange}
      />

      {/* Modals */}
      <NewTaskModal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        onSubmit={handleCreate}
        clients={clients}
        members={members}
        isLoading={isCreating}
      />

      {selectedTask && (
        <TaskDetailModal
          isOpen={!!selectedTask}
          onClose={() => setSelectedTask(null)}
          task={selectedTask}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
          isUpdating={isUpdating}
          isDeleting={isDeleting}
          isAdmin={isAdmin}
          clients={clients}
          members={members}
        />
      )}
    </div>
  );
}
