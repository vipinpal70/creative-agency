"use client";

import { useState } from "react";
import {
  X,
  Trash2,
  Clock,
  Plus,
  MessageSquare,
  Layout,
  User,
  ChevronDown,
  Loader2
} from "lucide-react";
import type { TaskStatus } from "@/lib/models/task.model";

type TaskSubTask = {
  id: string;
  title: string;
  status: TaskStatus;
};

type TaskDetails = {
  id: string;
  title: string;
  description?: string | null;
  status: TaskStatus;
  category?: string | null;
  assignedTo?: { id: string; name: string } | null;
  startDate?: string | Date | null;
  endDate?: string | Date | null;
  subTasks?: TaskSubTask[];
  feedbacks?: string[];
};

interface TaskDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: TaskDetails;
  onUpdate: (id: string, data: Record<string, unknown>) => void;
  onDelete: (id: string) => void;
  onCreateSubTask: (taskId: string, data: { title: string }) => void;
  isUpdating?: boolean;
  isDeleting?: boolean;
  readOnly?: boolean;
}

const STATUS_OPTIONS: { value: TaskStatus; label: string; color: string }[] = [
  { value: "OPEN", label: "Open", color: "text-gray-500 bg-gray-100" },
  { value: "IN_PROGRESS", label: "In Progress", color: "text-blue-600 bg-blue-50" },
  { value: "ON_HOLD", label: "On Hold", color: "text-orange-600 bg-orange-50" },
  { value: "COMPLETED", label: "Completed", color: "text-cyan-700 bg-cyan-50" },
  { value: "INTERNAL_REVIEW", label: "Internal Review", color: "text-violet-600 bg-violet-50" },
  { value: "CLIENT_REVIEW", label: "Client Review", color: "text-amber-600 bg-amber-50" },
  { value: "APPROVED", label: "Approved", color: "text-emerald-600 bg-emerald-50" },
  { value: "REJECTED", label: "Rejected", color: "text-red-600 bg-red-50" },
];

export function TaskDetailModal({
  isOpen,
  onClose,
  task,
  onUpdate,
  onDelete,
  onCreateSubTask,
  isUpdating,
  isDeleting,
  readOnly = false,
}: TaskDetailModalProps) {
  const [newFeedback, setNewFeedback] = useState("");
  const [showSubTaskForm, setShowSubTaskForm] = useState(false);
  const [subTaskTitle, setSubTaskTitle] = useState("");

  if (!isOpen || !task) return null;

  const currentStatus = STATUS_OPTIONS.find(s => s.value === task.status) || STATUS_OPTIONS[0];

  const handleStatusChange = (status: TaskStatus) => {
    onUpdate(task.id, { status });
  };

  const handleAddFeedback = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFeedback.trim()) return;
    onUpdate(task.id, { newFeedback: newFeedback.trim() });
    setNewFeedback("");
  };

  const handleCreateSubTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subTaskTitle.trim()) return;
    onCreateSubTask(task.id, { title: subTaskTitle.trim() });
    setSubTaskTitle("");
    setShowSubTaskForm(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end">
      <div className="fixed inset-0 bg-gray-900/20 backdrop-blur-[2px]" onClick={onClose} />

      <div className="relative bg-white w-full max-w-xl h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        <div className="flex items-center justify-between px-8 py-6 border-b border-gray-50">
          <div className="flex items-center gap-3">
            <div className={`px-3 py-1 rounded-full text-xs font-bold tracking-wider ${currentStatus.color}`}>
              {currentStatus.label}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!readOnly && (
              <button
                disabled={isDeleting}
                onClick={() => {
                  if (window.confirm("Delete this task?")) onDelete(task.id);
                }}
                className="p-2.5 hover:bg-red-50 text-gray-300 hover:text-red-500 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              </button>
            )}
            <button onClick={onClose} className="p-2.5 hover:bg-gray-100 rounded-xl transition-all">
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-8">
          {/* Header Info */}
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight leading-tight">{task.title}</h2>
            <p className="text-gray-500 leading-relaxed text-[14px]">{task.description || "No description provided."}</p>
          </div>

          <div className="grid grid-cols-2 gap-8 py-6 border-y border-gray-50">
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-sm">
                <User className="w-4 h-4 text-gray-400" />
                <span className="text-gray-400">Assigned to:</span>
                <span className="font-semibold text-gray-700">{task.assignedTo?.name || "Unassigned"}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Layout className="w-4 h-4 text-gray-400" />
                <span className="text-gray-400">Category:</span>
                <span className="font-semibold text-gray-700">
                  {task.category ? task.category.replace(/_/g, ' ') : 'No category'}
                </span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Clock className="w-4 h-4 text-gray-400" />
                <span className="text-gray-400">Timeline:</span>
                <span className="font-semibold text-xs text-gray-700">
                  {task.startDate ? new Date(task.startDate).toLocaleDateString() : "—"} → {task.endDate ? new Date(task.endDate).toLocaleDateString() : "—"}
                </span>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm text-gray-400">Update Status</label>
              <div className="relative group">
                <select
                  value={task.status}
                  onChange={(e) => handleStatusChange(e.target.value as TaskStatus)}
                  className="w-full pl-4 pr-10 py-2.5 rounded-xl border border-gray-100 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary/10 appearance-none bg-gray-50/50"
                >
                  {STATUS_OPTIONS
                    .filter(s => !readOnly || ['OPEN', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED'].includes(s.value))
                    .map(s => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              </div>
            </div>
          </div>

          {/* SubTasks Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layout className="w-5 h-5 text-primary" />
                <h3 className="font-bold text-sm text-gray-900">Subtasks ({task.subTasks?.length || 0})</h3>
              </div>
              {!readOnly && (
                <button
                  onClick={() => setShowSubTaskForm(true)}
                  className="text-primary hover:text-primary text-sm font-bold flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" />
                  <span className="text-sm">New Subtask</span>
                </button>
              )}
            </div>

            {!readOnly && showSubTaskForm && (
              <form onSubmit={handleCreateSubTask} className="bg-primary/50 p-4 rounded-2xl border border-primary/20 flex gap-2 animate-in fade-in slide-in-from-top-2">
                <input
                  autoFocus
                  placeholder="What needs to be done?"
                  className="flex-1 bg-white px-4 py-2 rounded-xl text-sm border border-primary/20 focus:outline-none focus:ring-2 focus:ring-primary/20"
                  value={subTaskTitle}
                  onChange={(e) => setSubTaskTitle(e.target.value)}
                />
                <button type="submit" className="bg-primary text-white px-4 py-2 rounded-xl text-sm font-bold">Add</button>
                <button type="button" onClick={() => setShowSubTaskForm(false)} className="text-gray-400 px-2 font-bold">Cancel</button>
              </form>
            )}

            <div className="space-y-3">
              {task.subTasks?.map((st) => (
                <div key={st.id} className="flex items-center justify-between p-4 rounded-2xl bg-white border border-gray-100 hover:border-gray-200 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-gray-300" />
                    <span className="text-sm font-medium text-gray-700">{st.title}</span>
                  </div>
                  <span className="text-[10px] font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded-lg">
                    {STATUS_OPTIONS.find(s => s.value === st.status)?.label || st.status}
                  </span>
                </div>
              ))}
              {(!task.subTasks || task.subTasks.length === 0) && !showSubTaskForm && (
                <div className="text-center py-6 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
                  <p className="text-xs text-gray-400 font-medium">No subtasks yet.</p>
                </div>
              )}
            </div>
          </div>

          {/* Feedback Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-amber-500" />
              <h3 className="font-bold text-sm text-gray-900">Feedback & Audit Log</h3>
            </div>

            <div className="space-y-3">
              {task.feedbacks?.map((f: string, i: number) => (
                <div key={i} className="bg-amber-50/50 border border-amber-100 p-4 rounded-2xl">
                  <p className="text-sm text-amber-900 leading-relaxed font-medium">{f}</p>
                </div>
              ))}
              {(!task.feedbacks || task.feedbacks.length === 0) && (
                <p className="text-xs text-gray-400 italic">No feedback yet.</p>
              )}
            </div>

            {!readOnly && (
              <form onSubmit={handleAddFeedback} className="flex flex-col gap-3">
                <textarea
                  placeholder="Add feedback or notes..."
                  rows={3}
                  className="w-full px-4 py-3 rounded-2xl border border-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/10 text-sm resize-none font-medium"
                  value={newFeedback}
                  onChange={(e) => setNewFeedback(e.target.value)}
                />
                <button
                  type="submit"
                  disabled={!newFeedback.trim() || isUpdating}
                  className="self-end bg-gray-900 text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-black disabled:opacity-50 transition-all flex items-center gap-2"
                >
                  {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageSquare className="w-4 h-4" />}
                  <span className="text-sm">Post Feedback</span>
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
