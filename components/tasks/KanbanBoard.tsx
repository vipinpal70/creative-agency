import React from 'react';
import { Building2, User, Tag, CalendarClock, Layers } from 'lucide-react';
import type { TaskStatus, TaskPriority } from '@/lib/task-status';
import { TASK_STATUSES } from '@/lib/task-status';

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

interface KanbanBoardProps {
  tasks: Task[];
  onTaskClick?: (task: Task) => void;
  onStatusChange?: (task: Task, status: TaskStatus) => void;
}

const PRIORITY_CONFIG: Record<TaskPriority, { label: string; color: string }> = {
  LOW: { label: 'Low', color: 'text-gray-600 bg-gray-100' },
  MEDIUM: { label: 'Medium', color: 'text-yellow-600 bg-yellow-100' },
  HIGH: { label: 'High', color: 'text-red-600 bg-red-100' },
  URGENT: { label: 'Urgent', color: 'text-red-700 bg-red-200' },
};

const STATUS_CONFIG: Record<TaskStatus, { label: string; color: string; headerColor: string }> = {
  OPEN: {
    label: 'Open',
    color: 'border-gray-200 bg-gray-50',
    headerColor: 'bg-gray-100 text-gray-700',
  },
  IN_PROGRESS: {
    label: 'In Progress',
    color: 'border-blue-200 bg-blue-50',
    headerColor: 'bg-blue-100 text-blue-700',
  },
  CLOSED: {
    label: 'Closed',
    color: 'border-green-200 bg-green-50',
    headerColor: 'bg-green-100 text-green-700',
  },
};

export const MODULE_LABELS: Record<string, string> = {
  social: 'Social Media',
  paid: 'Paid Media',
  seo: 'SEO',
  email: 'Email Marketing',
  website: 'Website',
  influencer: 'Influencer',
  custom: 'Custom',
};

export const formatModuleLabel = (module: string) =>
  MODULE_LABELS[module] ?? module.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

const KanbanTaskCard: React.FC<{
  task: Task;
  onClick?: () => void;
  onStatusChange?: (status: TaskStatus) => void;
}> = ({ task, onClick, onStatusChange }) => {
  const priorityConfig = PRIORITY_CONFIG[task.priority];

  return (
    <div
      className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer mb-2"
      onClick={onClick}
    >
      {/* Task Title */}
      <div className="font-medium text-sm text-gray-900 mb-2 leading-tight">
        {task.title}
      </div>

      {/* Client Name */}
      <div className="text-xs text-gray-600 mb-2">
        <Building2 className="inline mr-1 w-4 h-4" />
        {task.client.companyName}
      </div>

      {/* Priority Badge */}
      {task.priority && (
        <div className="flex items-center justify-between mb-2">
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${priorityConfig.color}`}>
            {priorityConfig.label}
          </span>
        </div>
      )}

      {/* Module */}
      {task.module && (
        <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
          <Layers className="w-3 h-3 shrink-0 text-gray-400" />
          <span className="font-normal text-gray-400">Module:</span>
          <span className="font-medium text-gray-700">{formatModuleLabel(task.module)}</span>
        </div>
      )}

      {/* Category */}
      {task.category && (
        <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
          <Tag className="w-3 h-3 shrink-0 text-gray-400" />
          <span className="font-normal text-gray-400">Category:</span>
          <span className="font-medium text-gray-700 lowercase">{task.category.replaceAll('_', ' ')}</span>
        </div>
      )}

      {/* Deadline */}
      {task.endDate && (
        <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
          <CalendarClock className="w-3 h-3 shrink-0 text-gray-400" />
          <span className="font-normal text-gray-400">Deadline:</span>
          <span className="font-medium text-gray-700">{new Date(task.endDate).toLocaleDateString()}</span>
        </div>
      )}

      {/* Assignee */}
      {task.assignedTo && (
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <User className="w-3 h-3 shrink-0 text-gray-400" />
          <span className="font-normal text-gray-400">Assigned to:</span>
          <span className="font-medium text-gray-700 truncate">{task.assignedTo?.name ?? 'Unassigned'}</span>
        </div>
      )}

      {/* Status control */}
      {onStatusChange && (
        <select
          value={task.status}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => onStatusChange(e.target.value as TaskStatus)}
          className="mt-2 w-full px-2 py-1.5 rounded-md border border-gray-200 bg-gray-50 text-xs font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
          aria-label="Change task status"
        >
          {TASK_STATUSES.map((s) => (
            <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
          ))}
        </select>
      )}
    </div>
  );
};

export const KanbanBoard: React.FC<KanbanBoardProps> = ({ tasks, onTaskClick, onStatusChange }) => {
  const tasksByStatus = tasks.reduce((acc, task) => {
    (acc[task.status] ??= []).push(task);
    return acc;
  }, {} as Record<TaskStatus, Task[]>);

  return (
    <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-4 sm:p-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {TASK_STATUSES.map((status) => {
          const statusConfig = STATUS_CONFIG[status];
          const statusTasks = tasksByStatus[status] || [];

          return (
            <div
              key={status}
              className={`min-h-[400px] ${statusConfig.color} rounded-lg border flex flex-col`}
            >
              {/* Column Header */}
              <div className={`p-3 rounded-t-lg ${statusConfig.headerColor} font-medium text-xs shrink-0`}>
                <div className="flex items-center justify-between">
                  <span>{statusConfig.label}</span>
                  <span className="bg-white/40 px-2 py-0.5 rounded-full text-xs">
                    {statusTasks.length}
                  </span>
                </div>
              </div>

              {/* Tasks Container */}
              <div className="p-3 space-y-2 flex-1 max-h-[65vh] overflow-y-auto">
                {statusTasks.map((task) => (
                  <KanbanTaskCard
                    key={task.id}
                    task={task}
                    onClick={() => onTaskClick?.(task)}
                    onStatusChange={onStatusChange ? (s) => onStatusChange(task, s) : undefined}
                  />
                ))}

                {statusTasks.length === 0 && (
                  <div className="text-center text-gray-500 text-xs py-8">
                    No tasks in this column
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
