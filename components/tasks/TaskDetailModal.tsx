"use client";

import { useState, useEffect } from "react";
import {
  X,
  Trash2,
  Clock,
  User,
  ChevronDown,
  Loader2,
  AlertCircle,
  Briefcase,
  Layers
} from "lucide-react";
import type { TaskStatus, TaskPriority } from "@/lib/task-status";
import { formatModuleLabel, MODULE_LABELS } from "@/components/tasks/KanbanBoard";

type TaskDetails = {
  id: string;
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority?: TaskPriority;
  category?: string | null;
  module?: string | null;
  assignedTo?: { id: string; name: string } | null;
  endDate?: string | Date | null;
  clientId?: string;
  client?: { companyName: string } | null;
};

type TeamMember = {
  userId: string;
  userName: string;
  userRole: string;
};

type ClientOption = {
  id: string;
  companyName: string;
  teamMembers?: TeamMember[];
};

type OrgMember = {
  id: string;
  name: string;
  roles?: string[];
};

interface TaskDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: TaskDetails;
  onUpdate: (id: string, data: Record<string, unknown>) => void;
  onDelete: (id: string) => void;
  isUpdating?: boolean;
  isDeleting?: boolean;
  isAdmin?: boolean;
  clients: ClientOption[];
  members: OrgMember[];
}

const STATUS_OPTIONS: { value: TaskStatus; label: string; color: string }[] = [
  { value: "OPEN", label: "Open", color: "text-gray-500 bg-gray-100" },
  { value: "IN_PROGRESS", label: "In Progress", color: "text-blue-600 bg-blue-50" },
  { value: "CLOSED", label: "Closed", color: "text-green-700 bg-green-50" },
];

const formatRoleLabel = (role: string) =>
  role.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());

const formatShortRoleLabel = (role: string) => {
  const normalized = role.replace(/_/g, " ").trim();
  const predefined: Record<string, string> = {
    ADMIN: "Admin",
    ADMIN_OWNER: "Admin",
    TEAM_LEAD: "Team L.",
    ACCOUNT_MANAGER: "Acct. M.",
    COPYWRITER: "Copy W.",
    CONTENT_WRITER: "Content W.",
    GRAPHIC_DESIGNER: "Graphic D.",
    CREATIVE_LEAD: "Creative L.",
    VIDEO_EDITOR: "Video E.",
    SOCIAL_MEDIA_MANAGER: "Social M.",
    SEO_SPECIALIST: "SEO S.",
    PERFORMANCE_MARKETING_SPECIALIST: "Perf. M.",
    EMAIL_MARKETING_SPECIALIST: "Email M.",
    WHATSAPP_MARKETING_SPECIALIST: "WhatsApp M.",
  };

  return predefined[role] ?? predefined[normalized.toUpperCase().replace(/\s+/g, "_")] ?? formatRoleLabel(role);
};

export function TaskDetailModal({
  isOpen,
  onClose,
  task,
  onUpdate,
  onDelete,
  isUpdating,
  isDeleting,
  isAdmin = false,
  clients,
  members,
}: TaskDetailModalProps) {
  // Edit states for admin
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editClientId, setEditClientId] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editModule, setEditModule] = useState("");
  const [editAssignedToId, setEditAssignedToId] = useState("");
  const [editPriority, setEditPriority] = useState<TaskPriority>("MEDIUM");
  const [editEndDate, setEditEndDate] = useState("");

  // Sync state with task details
  useEffect(() => {
    if (task) {
      setEditTitle(task.title || "");
      setEditDescription(task.description || "");
      setEditClientId(task.clientId || "");
      setEditCategory(task.category || "");
      setEditModule(task.module || "");
      setEditAssignedToId(task.assignedTo?.id || "");
      setEditPriority(task.priority || "MEDIUM");
      setEditEndDate(
        task.endDate ? new Date(task.endDate).toISOString().split("T")[0] : ""
      );
    }
  }, [task]);

  if (!isOpen || !task) return null;

  const currentStatus = STATUS_OPTIONS.find((s) => s.value === task.status) || STATUS_OPTIONS[0];

  // Resolve options based on client selection
  const selectedClient = clients.find((client) => client.id === editClientId);
  const clientTeamMembers = selectedClient?.teamMembers ?? [];

  const availableCategories = Array.from(
    new Set([
      ...clientTeamMembers.map((member) => member.userRole).filter(Boolean),
      "Copywriter",
      "Graphic Designer",
      "Video Editor",
      "SEO Specialist",
      "Performance Marketing Specialist",
      "Email Marketing Specialist",
      "Whatsapp Marketing Specialist",
    ])
  ).sort();

  const teamMemberIds = new Set(clientTeamMembers.map((member) => member.userId));
  const matchingOrgMembers = members.filter((member) => !teamMemberIds.has(member.id));

  const assigneeGroups = [
    {
      label: selectedClient?.companyName ? `${selectedClient.companyName} Team` : 'Client Team',
      options: clientTeamMembers.map((m) => ({
        id: m.userId,
        name: m.userName,
        role: m.userRole,
      })),
    },
    {
      label: 'Organization Members',
      options: matchingOrgMembers.map((m) => ({
        id: m.id,
        name: m.name,
        role: (m.roles ?? [])[0] ?? "",
      })),
    },
  ].filter((group) => group.options.length > 0);

  const moduleOptions = Object.keys(MODULE_LABELS);

  const handleStatusChange = (status: TaskStatus) => {
    onUpdate(task.id, { status });
  };

  const handleSaveChanges = () => {
    if (!editTitle.trim()) return;
    onUpdate(task.id, {
      title: editTitle,
      description: editDescription,
      clientId: editClientId || undefined,
      category: editCategory || undefined,
      module: editModule || undefined,
      assignedToId: editAssignedToId || undefined,
      priority: editPriority,
      endDate: editEndDate || undefined,
    });
  };

  const handleDeleteClick = () => {
    if (window.confirm("Are you sure you want to delete this task?")) {
      onDelete(task.id);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50 flex-shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="text-md font-semibold text-gray-900">
              {isAdmin ? "Edit Task" : "Task Details"}
            </h2>
            <div className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider ${currentStatus.color}`}>
              {currentStatus.label}
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-50 rounded-xl transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Scrollable Body Container */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            {/* Left Column (60%) - Details */}
            <div className="lg:col-span-3 space-y-6">
              {isAdmin ? (
                // Admin Editable Inputs
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-medium text-gray-500 uppercase -tracking-tighter px-1">Task Title</label>
                    <input
                      required
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      placeholder="e.g., Design homepage banner"
                      className="w-full px-4 py-3 rounded-lg border border-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/60 transition-all font-semibold text-sm text-gray-900"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-medium text-gray-500 uppercase -tracking-tighter px-1">Description</label>
                    <textarea
                      rows={6}
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      placeholder="Add details about the task..."
                      className="w-full px-4 py-3 rounded-lg border border-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/60 transition-all font-normal text-xs resize-none text-gray-700"
                    />
                  </div>
                </div>
              ) : (
                // Non-Admin Read-Only Details
                <div className="space-y-3">
                  <h2 className="text-xl font-bold text-gray-900 tracking-tight leading-tight">
                    {task.title}
                  </h2>
                  <p className="text-gray-500 leading-relaxed text-[13px] whitespace-pre-wrap">
                    {task.description || "No description provided."}
                  </p>
                </div>
              )}
            </div>

            {/* Right Column (40%) - Metadata details or editing controls */}
            <div className="lg:col-span-2 space-y-5 bg-gray-50/40 p-4 rounded-xl border border-gray-100 flex flex-col justify-between">
              <div className="space-y-4">
                {/* Status selector (Visible/editable by all users) */}
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-1">Status</label>
                  <div className="relative">
                    <select
                      value={task.status}
                      onChange={(e) => handleStatusChange(e.target.value as TaskStatus)}
                      className="w-full pl-3 pr-10 py-2 rounded-lg border border-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white text-xs font-semibold appearance-none transition-all cursor-pointer"
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                  </div>
                </div>

                {isAdmin ? (
                  // Admin Editable Metadata Fields
                  <div className="space-y-4">
                    {/* Client select */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-1">Client</label>
                      <div className="relative">
                        <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                        <select
                          value={editClientId}
                          onChange={(e) => {
                            setEditClientId(e.target.value);
                            setEditAssignedToId("");
                            setEditCategory("");
                          }}
                          className="w-full pl-9 pr-10 py-2 rounded-lg border border-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white text-xs font-normal appearance-none transition-all cursor-pointer text-gray-700"
                        >
                          <option value="">Select Client</option>
                          {clients.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.companyName}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                      </div>
                    </div>

                    {/* Priority select */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-1">Priority</label>
                      <div className="relative">
                        <AlertCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                        <select
                          value={editPriority}
                          onChange={(e) => setEditPriority(e.target.value as TaskPriority)}
                          className="w-full pl-9 pr-10 py-2 rounded-lg border border-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white text-xs font-normal appearance-none transition-all cursor-pointer text-gray-700"
                        >
                          <option value="LOW">Low</option>
                          <option value="MEDIUM">Medium</option>
                          <option value="HIGH">High</option>
                          <option value="URGENT">Urgent</option>
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                      </div>
                    </div>

                    {/* Task Category select */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-1">Task Category</label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                        <select
                          value={editCategory}
                          onChange={(e) => setEditCategory(e.target.value)}
                          className="w-full pl-9 pr-10 py-2 rounded-lg border border-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white text-xs font-normal appearance-none transition-all cursor-pointer text-gray-700"
                        >
                          <option value="">Select Category</option>
                          {availableCategories.map((role) => (
                            <option key={role} value={role}>
                              {formatRoleLabel(role)}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                      </div>
                    </div>

                    {/* Module select */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-1">Module</label>
                      <div className="relative">
                        <Layers className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                        <select
                          value={editModule}
                          onChange={(e) => setEditModule(e.target.value)}
                          className="w-full pl-9 pr-10 py-2 rounded-lg border border-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white text-xs font-normal appearance-none transition-all cursor-pointer text-gray-700"
                        >
                          <option value="">Select Module</option>
                          {moduleOptions.map((m) => (
                            <option key={m} value={m}>
                              {formatModuleLabel(m)}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                      </div>
                    </div>

                    {/* Assignee select */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-1">Assignee</label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                        <select
                          value={editAssignedToId}
                          onChange={(e) => setEditAssignedToId(e.target.value)}
                          className="w-full pl-9 pr-10 py-2 rounded-lg border border-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white text-xs font-normal appearance-none transition-all cursor-pointer text-gray-700"
                        >
                          <option value="">Unassigned</option>
                          {assigneeGroups.map((group) => (
                            <optgroup key={group.label} label={group.label}>
                              {group.options.map((member) => (
                                <option key={member.id} value={member.id}>
                                  {member.name} ({formatShortRoleLabel(member.role)})
                                </option>
                              ))}
                            </optgroup>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                      </div>
                    </div>

                    {/* Deadline select */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-1">Deadline</label>
                      <div className="relative">
                        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                        <input
                          type="date"
                          value={editEndDate}
                          onChange={(e) => setEditEndDate(e.target.value)}
                          className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white text-xs font-normal appearance-none transition-all text-gray-700"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  // Non-Admin Read-Only Metadata Display
                  <div className="space-y-3 pt-3 border-t border-gray-100">
                    <div className="flex items-center gap-3 text-xs">
                      <Briefcase className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <span className="text-gray-400 w-20">Client:</span>
                      <span className="font-semibold text-gray-700">{task.client?.companyName || "—"}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <AlertCircle className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <span className="text-gray-400 w-20">Priority:</span>
                      <span className="font-semibold text-gray-700">
                        {task.priority ? task.priority.charAt(0) + task.priority.slice(1).toLowerCase() : "Medium"}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <span className="text-gray-400 w-20">Category:</span>
                      <span className="font-semibold text-gray-700">
                        {task.category ? formatRoleLabel(task.category) : "—"}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <Layers className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <span className="text-gray-400 w-20">Module:</span>
                      <span className="font-semibold text-gray-700">
                        {task.module ? formatModuleLabel(task.module) : "—"}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <span className="text-gray-400 w-20">Assignee:</span>
                      <span className="font-semibold text-gray-700">{task.assignedTo?.name || "Unassigned"}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <span className="text-gray-400 w-20">Deadline:</span>
                      <span className="font-semibold text-gray-700">
                        {task.endDate ? new Date(task.endDate).toLocaleDateString() : "—"}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {isAdmin && (
                <div className="pt-5 border-t border-gray-100/60 flex flex-col gap-2">
                  <button
                    type="button"
                    disabled={isUpdating || !editTitle.trim()}
                    onClick={handleSaveChanges}
                    className="w-full bg-black text-white py-2 rounded-lg font-bold text-xs hover:bg-black/90 disabled:opacity-50 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {isUpdating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                    Save Changes
                  </button>

                  <button
                    type="button"
                    disabled={isDeleting}
                    onClick={handleDeleteClick}
                    className="w-full border border-red-200 text-red-600 hover:bg-red-50 py-2 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {isDeleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    Delete Task
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
