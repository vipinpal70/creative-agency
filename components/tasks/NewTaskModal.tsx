"use client";

import { useState } from "react";
import { X, User, Briefcase, Layers, AlertCircle, Loader2, ClipboardCheck } from "lucide-react";
import type { TaskPriority } from "@/lib/task-status";
import { formatModuleLabel, MODULE_LABELS } from "@/components/tasks/KanbanBoard";

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

type TaskPayload = {
  title: string;
  description: string;
  clientId: string;
  assignedToId: string;
  taskCategory?: string;
  module?: string;
  priority: TaskPriority;
  endDate?: string;
};

interface NewTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: TaskPayload) => void;
  clients: ClientOption[];
  members: OrgMember[];
  isLoading?: boolean;
}

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

export function NewTaskModal({
  isOpen,
  onClose,
  onSubmit,
  clients,
  members,
  isLoading,
}: NewTaskModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [clientId, setClientId] = useState("");
  const [taskCategory, setTaskCategory] = useState("");
  const [module, setModule] = useState("");
  const [assignedToId, setAssignedToId] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("MEDIUM");
  const [endDate, setEndDate] = useState("");

  if (!isOpen) return null;

  const moduleOptions = Object.keys(MODULE_LABELS);

  const selectedClient = clients.find((client) => client.id === clientId);
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
  const matchingOrgMembers = members.filter((member) =>
    !teamMemberIds.has(member.id)
  );
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      title,
      description,
      clientId,
      assignedToId,
      taskCategory: taskCategory || undefined,
      module: module || undefined,
      priority,
      endDate: endDate || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white w-full max-w-lg rounded-2xl shadow-2xl shadow-primary/10 overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
          <h2 className="text-md font-semibold text-gray-900">Create New Task</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-50 rounded-xl transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          <div className="space-y-1.5">
            <label className="text-[10px] font-medium text-gray-500 uppercase -tracking-tighter px-1">Task Title</label>
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Design homepage banner"
              className="w-full px-4 py-3 rounded-lg border border-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/60 transition-all font-medium text-xs"
            />
          </div>

          {/* client name */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wider px-1">Client</label>
            <div className="relative">
              <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"/>
              <select
                required
                value={clientId}
                onChange={(e) => {
                  setClientId(e.target.value);
                  setTaskCategory("");
                  setModule("");
                  setAssignedToId("");
                }}
                className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/60 appearance-none bg-gray-50/30 transition-all font-normal text-xs text-gray-800"
              >
                <option value="">Select Client</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.companyName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* module */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-medium text-gray-500 uppercase -tracking-tighter px-1">Module</label>
              <div className="relative">
                <Layers className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <select
                  value={module}
                  disabled={!clientId}
                  onChange={(e) => setModule(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/60 appearance-none bg-gray-50/30 transition-all font-normal text-xs disabled:opacity-50"
                >
                  <option value="">
                    {!clientId ? "Select client first" : "Select Module"}
                  </option>
                  {moduleOptions.map((m) => (
                    <option key={m} value={m}>
                      {formatModuleLabel(m)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-medium text-gray-500 uppercase -tracking-tighter px-1">Priority</label>
              <div className="relative">
                <AlertCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as TaskPriority)}
                  className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/60 appearance-none bg-gray-50/30 transition-all font-normal text-xs"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>
            </div>
          </div>

          {/* task category */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-medium text-gray-500 uppercase -tracking-tighter px-1">Task Category</label>
              <div className="relative">
                <ClipboardCheck  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <select
                  value={taskCategory}
                  disabled={!clientId || availableCategories.length === 0}
                  onChange={(e) => {
                    setTaskCategory(e.target.value);
                  }}
                  className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/60 appearance-none bg-gray-50/30 transition-all font-normal text-xs disabled:opacity-50"
                >
                  <option value="">Select Category</option>
                  {availableCategories.map((role) => (
                    <option key={role} value={role}>
                      {formatRoleLabel(role)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* assignee */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-medium text-gray-500 uppercase -tracking-tighter px-1">Assignee</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <select
                  value={assignedToId}
                  disabled={!clientId || assigneeGroups.length === 0}
                  onChange={(e) => setAssignedToId(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/60 appearance-none bg-gray-50/30 transition-all font-normal text-xs disabled:opacity-50"
                >
                  <option value="">
                    {assigneeGroups.length === 0 ? "No members available" : "Unassigned"}
                  </option>
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
              </div>
            </div>
          </div>

          {/* deadline */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-medium text-gray-500 uppercase -tracking-tighter px-1">Deadline</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/60 transition-all font-normal text-xs"
            />
          </div>

          {/* description */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-medium text-gray-500 uppercase -tracking-tighter px-1">Description</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add details about the task..."
              className="w-full px-4 py-3 rounded-lg border border-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/60 transition-all font-normal text-xs resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-primary text-white py-2 rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-primary/80 disabled:opacity-50 transition-all mt-4 cursor-pointer"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              "Create Task"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
