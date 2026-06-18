"use client";
import { useState, useEffect, useCallback } from "react";

interface ActivityLog {
  _id: string;
  userId?: string;
  userEmail?: string;
  userName?: string;
  action: string;
  method: string;
  url: string;
  ip?: string;
  userAgent?: string;
  status?: number;
  requestData?: any;
  details?: string;
  createdAt: string;
}

export default function ActivityLogsPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [methodFilter, setMethodFilter] = useState("");
  const [selectedLog, setSelectedLog] = useState<ActivityLog | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams({
        search,
        action: actionFilter,
        method: methodFilter,
        page: page.toString(),
        limit: "20",
      });
      const res = await fetch(`/api/activity?${q.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs);
        setTotal(data.total);
        setPages(data.pages);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [search, actionFilter, methodFilter, page]);

  useEffect(() => {
    // Debounce/reset to page 1 on filter change
    setPage(1);
  }, [search, actionFilter, methodFilter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs, page]);

  // Method Badge Colorizer
  const getMethodBadge = (m: string) => {
    switch (m.toUpperCase()) {
      case "POST":
        return "bg-emerald-50 text-emerald-600 border-emerald-100/50";
      case "PATCH":
      case "PUT":
        return "bg-amber-50 text-amber-600 border-amber-100/50";
      case "DELETE":
        return "bg-rose-50 text-rose-600 border-rose-100/50";
      case "GET":
        return "bg-sky-50 text-sky-600 border-sky-100/50";
      default:
        return "bg-gray-50 text-gray-500 border-gray-100/50";
    }
  };

  // Action Badge Colorizer
  const getActionBadge = (action: string) => {
    if (action.includes("SUCCESS") || action === "LOGIN_SUCCESS" || action === "LOGOUT") {
      return "bg-emerald-50 text-emerald-700 border-emerald-100";
    }
    if (action.includes("FAILED") || action.includes("ERROR") || action.includes("UNAUTHORIZED")) {
      return "bg-rose-50 text-rose-700 border-rose-100";
    }
    return "bg-indigo-50 text-indigo-700 border-indigo-100";
  };

  return (
    <div className="max-w-7xl space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-gray-900">Activity Logs</h1>
          <p className="text-[11px] text-gray-400 mt-0.5">
            Audit trail of request payloads, actions, timestamps, and user information across the application.
          </p>
        </div>
        <button onClick={fetchLogs} className="text-[10px] font-semibold text-gray-500 hover:text-indigo-600 transition-colors px-3 py-1.5 rounded-lg border border-gray-200 hover:border-indigo-300">
          ↻ Refresh Logs
        </button>
      </div>

      {/* Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white p-3.5 rounded-xl border border-gray-100 shadow-sm">
        <div>
          <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Search Logs</label>
          <input
            type="text"
            placeholder="Search by email, name, path, description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-[11px] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>

        <div>
          <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block mb-1">Action Type</label>
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="w-full px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-[11px] text-gray-600 focus:outline-none"
          >
            <option value="">All Actions</option>
            <option value="LOGIN_SUCCESS">LOGIN_SUCCESS</option>
            <option value="LOGIN_FAILED">LOGIN_FAILED</option>
            <option value="LOGOUT">LOGOUT</option>
            <option value="CREATE_TEAM_MEMBER_SUCCESS">CREATE_TEAM_MEMBER_SUCCESS</option>
            <option value="UPDATE_TEAM_MEMBER_SUCCESS">UPDATE_TEAM_MEMBER_SUCCESS</option>
            <option value="DELETE_TEAM_MEMBER_SUCCESS">DELETE_TEAM_MEMBER_SUCCESS</option>
            <option value="RESET_MEMBER_PASSWORD">RESET_MEMBER_PASSWORD</option>
            <option value="VIEW_TEAM_MEMBERS">VIEW_TEAM_MEMBERS</option>
          </select>
        </div>

        <div>
          <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block mb-1">HTTP Method</label>
          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            className="w-full px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-[11px] text-gray-600 focus:outline-none"
          >
            <option value="">All Methods</option>
            <option value="GET">GET</option>
            <option value="POST">POST</option>
            <option value="PATCH">PATCH</option>
            <option value="DELETE">DELETE</option>
            <option value="SYSTEM">SYSTEM</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="grid grid-cols-[1.5fr_1.8fr_1fr_2.5fr_0.8fr] gap-4 px-5 py-2.5 bg-gray-50 border-b border-gray-100 text-[9px] font-bold text-gray-400 uppercase tracking-wider">
          <span>Timestamp</span>
          <span>User Info</span>
          <span>Method / Path</span>
          <span>Action & Details</span>
          <span>Actions</span>
        </div>

        {loading ? (
          <div className="p-8 space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-10 bg-gray-50 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12 text-[11px] text-gray-400">No activity logs found.</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {logs.map((log) => (
              <div key={log._id} className="grid grid-cols-[1.5fr_1.8fr_1fr_2.5fr_0.8fr] gap-4 px-5 py-3 items-center text-[11px] hover:bg-gray-50/50 transition-colors">
                {/* Timestamp */}
                <div className="text-gray-500">
                  <p className="font-semibold">{new Date(log.createdAt).toLocaleDateString()}</p>
                  <p className="text-[9px] text-gray-400 mt-0.5">{new Date(log.createdAt).toLocaleTimeString()}</p>
                </div>

                {/* User Info */}
                <div className="min-w-0">
                  {log.userName ? (
                    <>
                      <p className="font-semibold text-gray-800 truncate">{log.userName}</p>
                      <p className="text-[9px] text-gray-400 truncate">{log.userEmail}</p>
                    </>
                  ) : log.userEmail ? (
                    <p className="font-semibold text-gray-800 truncate">{log.userEmail}</p>
                  ) : (
                    <p className="text-gray-400 italic">Anonymous / System</p>
                  )}
                </div>

                {/* Method / Path */}
                <div className="space-y-1">
                  <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase border ${getMethodBadge(log.method)}`}>
                    {log.method}
                  </span>
                  <p className="text-[9px] text-gray-400 truncate font-mono mt-0.5" title={log.url}>{log.url}</p>
                </div>

                {/* Action & Details */}
                <div className="min-w-0 pr-2 space-y-1">
                  <span className={`px-1.5 py-0.5 rounded-full text-[8px] font-bold border ${getActionBadge(log.action)}`}>
                    {log.action}
                  </span>
                  <p className="text-gray-600 truncate text-[10px] mt-0.5" title={log.details}>{log.details}</p>
                </div>

                {/* Inspect Button */}
                <div>
                  <button
                    onClick={() => setSelectedLog(log)}
                    className="px-2.5 py-1 text-indigo-600 border border-indigo-100 bg-indigo-50/50 hover:bg-indigo-50 rounded-lg text-[9px] font-bold transition-all"
                  >
                    Inspect
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {!loading && pages > 1 && (
        <div className="flex items-center justify-between px-1">
          <p className="text-[10px] text-gray-400">
            Showing page <span className="font-bold text-gray-700">{page}</span> of <span className="font-bold text-gray-700">{pages}</span> ({total} logs total)
          </p>
          <div className="flex gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-2.5 py-1.5 text-[10px] font-bold border border-gray-200 hover:bg-gray-50 rounded-lg disabled:opacity-50 disabled:pointer-events-none transition-all"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
              disabled={page === pages}
              className="px-2.5 py-1.5 text-[10px] font-bold border border-gray-200 hover:bg-gray-50 rounded-lg disabled:opacity-50 disabled:pointer-events-none transition-all"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Detail Inspector Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm" onClick={() => setSelectedLog(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[85vh] flex flex-col">
            <div className="flex items-start justify-between px-5 py-4 border-b border-gray-100 shrink-0">
              <div>
                <h2 className="text-sm font-bold text-gray-900">Log Inspector</h2>
                <p className="text-[10px] text-gray-400 mt-0.5">ID: {selectedLog._id}</p>
              </div>
              <button onClick={() => setSelectedLog(null)} className="text-gray-300 hover:text-gray-600 text-lg leading-none">×</button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-[11px] flex-1">
              <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl">
                <div>
                  <p className="text-[9px] text-gray-400 font-bold uppercase">Timestamp</p>
                  <p className="font-semibold text-gray-800 mt-0.5">{new Date(selectedLog.createdAt).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[9px] text-gray-400 font-bold uppercase">Action</p>
                  <p className="font-semibold text-indigo-600 mt-0.5">{selectedLog.action}</p>
                </div>
                <div>
                  <p className="text-[9px] text-gray-400 font-bold uppercase">User Account</p>
                  <p className="font-semibold text-gray-800 mt-0.5">{selectedLog.userEmail || "Anonymous"}</p>
                </div>
                <div>
                  <p className="text-[9px] text-gray-400 font-bold uppercase">IP Address</p>
                  <p className="font-semibold text-gray-800 mt-0.5">{selectedLog.ip || "—"}</p>
                </div>
                <div>
                  <p className="text-[9px] text-gray-400 font-bold uppercase">URL Path</p>
                  <p className="font-semibold text-gray-800 mt-0.5 font-mono">{selectedLog.method} {selectedLog.url}</p>
                </div>
                <div>
                  <p className="text-[9px] text-gray-400 font-bold uppercase">Status Code</p>
                  <p className="font-semibold text-gray-800 mt-0.5">{selectedLog.status || "—"}</p>
                </div>
              </div>

              {selectedLog.details && (
                <div className="space-y-1">
                  <p className="text-[9px] text-gray-400 font-bold uppercase">Description</p>
                  <p className="bg-gray-50 p-3 rounded-lg text-gray-700 font-medium">{selectedLog.details}</p>
                </div>
              )}

              {selectedLog.userAgent && (
                <div className="space-y-1">
                  <p className="text-[9px] text-gray-400 font-bold uppercase">User Agent</p>
                  <p className="bg-gray-50 p-2.5 rounded-lg text-gray-600 font-mono text-[10px] break-all">{selectedLog.userAgent}</p>
                </div>
              )}

              {selectedLog.requestData && (
                <div className="space-y-1">
                  <p className="text-[9px] text-gray-400 font-bold uppercase">Request Data (Sanitized)</p>
                  <pre className="bg-gray-900 text-gray-100 p-4 rounded-xl text-[10px] font-mono overflow-x-auto max-h-48 whitespace-pre-wrap break-all">
                    {JSON.stringify(selectedLog.requestData, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-50 bg-gray-50/50 shrink-0">
              <button
                onClick={() => setSelectedLog(null)}
                className="w-full py-2 rounded-lg text-gray-600 hover:bg-gray-100 border border-gray-200 text-[11px] font-bold transition-all"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
