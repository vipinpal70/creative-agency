"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Plus,
  AlertCircle,
  Clock,
  CheckCircle2
} from "lucide-react";
import { NewTaskModal } from "@/components/tasks/NewTaskModal";
import { TaskDetailModal } from "@/components/tasks/TaskDetailModal";
import { TaskTable } from "@/components/tasks/TaskTable";
import { KanbanBoard } from "@/components/tasks/KanbanBoard";
import { useAuth } from "@/hooks/useAuth";
import type { TaskStatus, TaskPriority } from "@/lib/models/task.model";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  startDate?: string;
  endDate?: string;
  clientId: string;
  organizationId: string;
  mediaUrls?: string[];
  feedbacks: string[];
  countSubTask: number;
  client: { companyName: string };
  assignedTo?: { id: string; name: string; roles?: string[] };
  category?: string | null;
  _count?: any;
}

interface Client {
  id: string;
  companyName: string;
}

// ─── API Helpers ──────────────────────────────────────────────────────────────

const fetchTasks = async (filters: {
  clientId?: string;
  organizationId?: string
}) => {
  const params = new URLSearchParams();
  if (filters.clientId) params.append("clientId", filters.clientId);
  const res = await fetch(`/api/tasks?${params.toString()}`);
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
  // Map to a simpler structure for the form
  return data.map((m: MemberResponse) => ({
    id: m.user.id,
    name: m.user.name,
    roles: m.roles ?? [],
  }));
};


// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_MAP: Record<TaskStatus, { label: string; color: string; icon: any }> = {
  OPEN: { label: "Open", color: "text-green-600 bg-green-100", icon: Clock },
  OPENED: { label: "Opened", color: "text-teal-600 bg-teal-50", icon: Clock },
  IN_PROGRESS: { label: "In Progress", color: "text-blue-600 bg-blue-50", icon: Clock },
  ON_HOLD: { label: "On Hold", color: "text-orange-600 bg-orange-50", icon: AlertCircle },
  COMPLETED: { label: "Completed", color: "text-cyan-700 bg-cyan-50", icon: CheckCircle2 },
  INTERNAL_REVIEW: { label: "Internal Review", color: "text-violet-600 bg-violet-50", icon: AlertCircle },
  CLIENT_REVIEW: { label: "Client Review", color: "text-amber-600 bg-amber-50", icon: AlertCircle },
  APPROVED: { label: "Approved", color: "text-emerald-600 bg-emerald-50", icon: CheckCircle2 },
  REJECTED: { label: "Rejected", color: "text-red-600 bg-red-50", icon: AlertCircle },
};

// ─── Main Component ───────────────────────────────────────────────────────────

const PRIVILEGED_ROLES = new Set(['ADMIN', 'TEAM_LEAD', 'ACCOUNT_MANAGER']);

export default function TasksPage() {
  const { user } = useAuth();

  const canEdit =
    user?.role === 'admin' ||
    (user?.roles ?? []).some((r: string) => PRIVILEGED_ROLES.has(r));

  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const [tasks, setTasks] = useState<Task[]>([]);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadTasks = async () => {
    setIsLoadingTasks(true);
    try {
      const data = await fetchTasks({ clientId: selectedClientId });
      setTasks(data);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load tasks");
    } finally {
      setIsLoadingTasks(false);
    }
  };

  const loadAllTasks = async () => {
    try {
      const data = await fetchTasks({});
      setAllTasks(data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadClients = async () => {
    try {
      const res = await fetch("/api/clients");
      if (res.ok) {
        const data = await res.json();
        // Map to the shape the modal expects (companyName)
        setClients(
          data.map((c: any) => ({
            id: c.id,
            companyName: c.brandName || c.name || "Unknown",
          }))
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  const loadMembers = async () => {
    try {
      const data = await fetchMembers();
      setMembers(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadClients();
    loadMembers();
  }, []);

  useEffect(() => {
    loadTasks();
  }, [selectedClientId]);

  useEffect(() => {
    loadAllTasks();
  }, []);

  const handleCreate = async (data: any) => {
    setIsCreating(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          organizationId: "default-org",
          createdById: user?.id
        })
      });
      if (res.ok) {
        toast.success("Task created successfully!");
        setIsNewModalOpen(false);
        loadTasks();
        loadAllTasks();
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

  const handleUpdate = async (id: string, data: any) => {
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      if (res.ok) {
        const updated = await res.json();
        setSelectedTask(prev => prev?.id === updated.id ? { ...prev, ...updated } : prev);
        toast.success("Task updated");
        loadTasks();
        loadAllTasks();
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

  const handleDelete = async (id: string) => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/tasks/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Task deleted");
        setSelectedTask(null);
        loadTasks();
        loadAllTasks();
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

  const handleCreateSubTask = async (id: string, data: any) => {
    try {
      const res = await fetch(`/api/tasks/${id}/subtasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      if (res.ok) {
        if (selectedTask) {
          const detailRes = await fetch(`/api/tasks/${selectedTask.id}`);
          if (detailRes.ok) {
            const detailData = await detailRes.json();
            setSelectedTask(detailData);
          }
        }
        toast.success("Subtask added");
        loadTasks();
        loadAllTasks();
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
    fetch(`/api/tasks/${task.id}`).then(res => res.json()).then(data => {
      setSelectedTask(data);
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 mb-1">Task Board</h1>
          <p className="text-gray-500 text-sm">Kanban view of all tasks.</p>
        </div>
      </div>
      <div>
      </div>
      {/* Kanban Board */}
      <KanbanBoard
        tasks={allTasks}
        onTaskClick={handleOpenDetail}
      />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mt-8">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 mb-1">Tasks List</h1>
          <p className="text-gray-500 text-sm">Manage all tasks in a list view.</p>
        </div>

        {canEdit && (
          <button
            onClick={() => setIsNewModalOpen(true)}
            className="inline-flex items-center gap-2 bg-black text-white px-4 py-2.5 rounded-lg font-semibold text-sm hover:bg-black/90 transition-all"
          >
            <Plus className="w-4 h-4" />
            New Task
          </button>
        )}
      </div>
      {/* Filters */}
      <div className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-3 w-full justify-start">
          <select
            className="pl-3 pr-8 py-2 rounded-lg border border-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all appearance-none bg-gray-50/50 text-gray-900"
            value={selectedClientId}
            onChange={(e) => setSelectedClientId(e.target.value)}
          >
            <option value="">All Clients</option>
            {clients.map((c: any) => (
              <option key={c.id} value={c.id}>{c.companyName}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Content */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
      <TaskTable
          data={tasks}
          onRowClick={handleOpenDetail}
          onDeleteTask={(task) => handleDelete(task.id)}
          isLoading={isLoadingTasks}
        />
      </div>

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
          onCreateSubTask={handleCreateSubTask}
          isUpdating={isUpdating}
          isDeleting={isDeleting}
          readOnly={!canEdit}
        />
      )}
    </div>
  );
}
