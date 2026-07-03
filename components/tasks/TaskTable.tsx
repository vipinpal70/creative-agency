"use client";

import { useMemo } from 'react';
import {
  MantineReactTable,
  useMantineReactTable,
  type MRT_ColumnDef,
} from 'mantine-react-table';
import { Clock, AlertCircle, CheckCircle2, Layout, FileText, Trash2, type LucideIcon } from "lucide-react";
import type { TaskStatus, TaskPriority } from "@/lib/models/task.model";

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
  countSubTask: number;
  client: { companyName: string };
  assignedTo?: { id: string; name: string };
  category?: string | null;
  feedbacks: string[];
  mediaUrls?: string[];
  _count?: { subTasks: number };
}

const STATUS_MAP: Record<TaskStatus, { label: string; color: string; icon: LucideIcon }> = {
  OPEN: { label: "Open", color: "text-green-600 bg-green-100", icon: Clock },
  OPENED: { label: "Opened", color: "text-teal-600 bg-teal-50", icon: Clock },
  IN_PROGRESS: { label: "In Progress", color: "text-blue-600 bg-blue-50", icon: Clock },
  ON_HOLD: { label: "On Hold", color: "text-yellow-600 bg-yellow-50", icon: Clock },
  COMPLETED: { label: "Completed", color: "text-cyan-700 bg-cyan-50", icon: CheckCircle2 },
  INTERNAL_REVIEW: { label: "Internal Review", color: "text-violet-600 bg-violet-50", icon: AlertCircle },
  CLIENT_REVIEW: { label: "Client Review", color: "text-amber-600 bg-amber-50", icon: AlertCircle },
  APPROVED: { label: "Approved", color: "text-emerald-600 bg-emerald-50", icon: CheckCircle2 },
  REJECTED: { label: "Rejected", color: "text-red-600 bg-red-50", icon: AlertCircle },
};

interface TaskTableProps {
  data: Task[];
  onRowClick: (task: Task) => void;
  onDeleteTask: (task: Task) => void;
  isLoading: boolean;
}

export function TaskTable({ data, onRowClick, onDeleteTask, isLoading }: TaskTableProps) {
  const columns = useMemo<MRT_ColumnDef<Task>[]>(
    () => [
      {
        accessorKey: 'title',
        header: 'Task',
        size: 250,
        Cell: ({ row }) => {
          const task = row.original;
          return (
            <div className="flex flex-col gap-1">
              <span className="font-semibold text-gray-900 group-hover:text-primary transition-colors text-xs">
                {task.title}
              </span>
              <div className="flex items-center gap-2">
                {task.countSubTask > 0 && (
                  <div className="flex items-center gap-1 text-[11px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-lg">
                    <Layout className="w-3 h-3" />
                    {task.countSubTask}
                  </div>
                )}
                {task.feedbacks && task.feedbacks.length > 0 && (
                  <div className="flex items-center gap-1 text-[10px] font-bold text-amber-500 bg-amber-50 px-1.5 py-0.5 rounded-lg">
                    <FileText className="w-3 h-3" />
                    {task.feedbacks.length}
                  </div>
                )}
              </div>
            </div>
          );
        }
      },
      {
        accessorKey: 'status',
        header: 'Status',
        size: 140,
        Cell: ({ cell }) => {
          const statusVal = cell.getValue<TaskStatus>();
          const status = STATUS_MAP[statusVal] || STATUS_MAP.OPEN;
          const StatusIcon = status.icon;
          return (
            <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-wider px-2.5 py-1 rounded-full ${status.color}`}>
              <StatusIcon className="w-3.5 h-3.5" />
              {status.label}
            </span>
          );
        }
      },

      {
        id: 'assignedToName',
        accessorFn: (row) => row.assignedTo?.name,
        header: 'Assignee',
        size: 150,
        Cell: ({ cell }) => {
          const val = cell.getValue<string | undefined>();
          return val ? (
            <div className="flex items-center gap-2 text-gray-700 font-medium text-xs">
              {val}
            </div>
          ) : (
            <span className="text-gray-400 text-sm italic">Unassigned</span>
          );
        }
      },
      {
        id: 'categoryName',
        accessorFn: (row) => row.category,
        header: 'Category',
        size: 150,
        Cell: ({ cell }) => {
          const val = cell.getValue<string | undefined>();
          return val ? (
            <div className="flex items-center gap-2 text-gray-700 font-medium text-xs">
              {val.replace(/_/g, ' ')}
            </div>
          ) : (
            <span className="text-gray-400 text-sm italic">No category</span>
          );
        }
      },
      {
        accessorFn: (row) => row.startDate ? new Date(row.startDate).toLocaleDateString() : '—',
        id: 'assignedDate',
        header: 'Assigned Date',
        size: 120,
        Cell: ({ cell }) => {
          const val = cell.getValue<string | undefined>();
          return val ? (
            <div className="flex items-center gap-2 text-gray-700 font-medium text-xs">
              {val}
            </div>
          ) : (
            <span className="text-gray-400 text-sm italic">-</span>
          );
        }
      },
      {
        accessorFn: (row) => row.endDate ? new Date(row.endDate).toLocaleDateString() : '—',
        id: 'dueDate',
        header: 'Due Date',
        size: 120,
        Cell: ({ cell }) => {
          const val = cell.getValue<string | undefined>();
          return val ? (
            <div className="flex items-center gap-2 text-gray-700 font-medium text-xs">
              {val}
            </div>
          ) : (
            <span className="text-gray-400 text-sm italic">-</span>
          );
        }
      },
      {
        id: 'clientCompanyName',
        accessorFn: (row) => row.client?.companyName,
        header: 'Client',
        size: 150,
        Cell: ({ cell }) => {
          const val = cell.getValue<string | undefined>();
          return val ? (
            <div className="flex items-center gap-2 text-gray-700 font-medium text-xs">
              {val}
            </div>
          ) : (
            <span className="text-gray-400 text-sm italic">-</span>
          );
        }
      },
      {
        accessorKey: 'feedbacks',
        header: 'Feedback',
        size: 150,
        Cell: ({ cell }) => {
          const feedbacks = cell.getValue<string[]>();
          return feedbacks && feedbacks.length > 0 ? (
            <div
              className="flex items-center gap-2 text-xs text-gray-700 font-medium truncate max-w-150px"
              title={feedbacks[0]}
            >
              {feedbacks[0]}
            </div>
          ) : (
            <span className="text-gray-400 text-sm italic">No feedback</span>
          );
        }
      },
      {
        id: 'actions',
        header: '',
        size: 72,
        enableSorting: false,
        enableColumnFilter: false,
        Cell: ({ row }) => {
          const task = row.original;
          return (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (window.confirm(`Delete task "${task.title}"?`)) {
                    onDeleteTask(task);
                  }
                }}
                className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all"
                aria-label={`Delete task ${task.title}`}
                title="Delete task"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          );
        }
      }
    ],
    [onDeleteTask],
  );

  const table = useMantineReactTable({
    columns,
    data,
    // isLoading is handled outside the table to avoid mantine-react-table beta
    // passing in={true} (boolean) to a DOM element, which React 19 rejects.
    enableFullScreenToggle: false,
    enableDensityToggle: false,
    mantineTableBodyRowProps: ({ row }) => ({
      onClick: () => onRowClick(row.original),
      style: { cursor: 'pointer' },
    }),
    mantinePaperProps: {
      // shadow: 'xs',
      radius: 'md',
      withBorder: false,
      // style: { border: '1px solid #f3f4f6' },
    },
    initialState: {
      showGlobalFilter: true,
      pagination: { pageSize: 10, pageIndex: 0 },
    },
    positionGlobalFilter: 'left',
  });

  if (isLoading) {
    return (
      <div className="w-full space-y-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-12 bg-gray-100 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="w-full">
      <MantineReactTable table={table} />
    </div>
  );
}
