"use client";

import { useEffect, useState } from "react";
import { Loader2, FileText, Clock, CheckCircle, XCircle, Users } from "lucide-react";

interface TeamMember { id: string; name: string; email: string; roles: string[]; avatarColor: string }
interface DashboardData {
  name: string;
  brandName: string;
  kpis: { totalCopies: number; pending: number; approved: number; rejected: number };
  approval: { approved: number; rejected: number; pending: number };
  progress: { totalScope: number; delivered: number };
  team: TeamMember[];
}

function KpiCard({ label, value, icon, accent }: { label: string; value: number; icon: React.ReactNode; accent: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-widest">{label}</p>
          <p className="text-2xl font-semibold mt-1 text-gray-900 tracking-tight">{value}</p>
        </div>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${accent}`}>{icon}</div>
      </div>
    </div>
  );
}

// Donut chart (pure SVG) for the approval breakdown.
function ApprovalDonut({ approved, rejected, pending }: { approved: number; rejected: number; pending: number }) {
  const total = approved + rejected + pending;
  const data = [
    { label: "Approved", value: approved, color: "#22c55e" },
    { label: "In review", value: pending, color: "#f59e0b" },
    { label: "Rejected", value: rejected, color: "#f43f5e" },
  ];
  const r = 52, cx = 68, cy = 68, sw = 18;
  const circ = 2 * Math.PI * r;
  let offset = 0;
  const rate = total === 0 ? 0 : Math.round((approved / total) * 100);

  return (
    <div className="flex flex-col items-center gap-3">
      <svg width="136" height="136" viewBox="0 0 136 136">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f1f5f9" strokeWidth={sw} />
        {total > 0 && data.map((d) => {
          const dash = (d.value / total) * circ;
          const el = (
            <circle
              key={d.label}
              cx={cx} cy={cy} r={r} fill="none"
              stroke={d.color} strokeWidth={sw}
              strokeDasharray={`${dash} ${circ - dash}`}
              strokeDashoffset={-offset}
              transform={`rotate(-90 ${cx} ${cy})`}
            />
          );
          offset += dash;
          return el;
        })}
        <text x={cx} y={cy - 2} textAnchor="middle" fontSize="18" fontWeight="800" fill="#1e293b">{rate}%</text>
        <text x={cx} y={cy + 14} textAnchor="middle" fontSize="9" fill="#94a3b8">Approved</text>
      </svg>
      <div className="flex flex-col gap-1.5 w-full px-1">
        {data.map((d) => (
          <div key={d.label} className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-sm" style={{ background: d.color }} />
              <span className="text-[10px] text-gray-500">{d.label}</span>
            </div>
            <span className="text-[10px] font-semibold text-gray-700">{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ClientHomePage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/client/dashboard")
      .then(async (r) => {
        const d = await r.json();
        if (!active) return;
        if (r.ok) setData(d);
        else setError(d.error || "Unable to load your dashboard.");
      })
      .catch(() => active && setError("Unable to load your dashboard."));
    return () => { active = false; };
  }, []);

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 py-20 text-center">
        <p className="text-sm text-red-600">{error}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-20 justify-center">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading your dashboard…
      </div>
    );
  }

  const { kpis, approval, progress, team } = data;
  const progressPct = progress.totalScope === 0 ? 0 : Math.min(100, Math.round((progress.delivered / progress.totalScope) * 100));

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-gray-900">Welcome back{data.brandName ? `, ${data.brandName}` : ""}</h1>
        <p className="text-[11px] text-gray-400 mt-0.5">Here&apos;s an overview of your content and progress.</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Total Copies" value={kpis.totalCopies} icon={<FileText className="w-5 h-5" />} accent="bg-indigo-50 text-indigo-600" />
        <KpiCard label="Pending Approvals" value={kpis.pending} icon={<Clock className="w-5 h-5" />} accent="bg-amber-50 text-amber-600" />
        <KpiCard label="Approved Copies" value={kpis.approved} icon={<CheckCircle className="w-5 h-5" />} accent="bg-emerald-50 text-emerald-600" />
        <KpiCard label="Rejected Copies" value={kpis.rejected} icon={<XCircle className="w-5 h-5" />} accent="bg-rose-50 text-rose-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Approval rate */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-[12px] font-semibold text-gray-900">Approval Rate</h2>
          <p className="text-[10px] text-gray-400 mt-0.5 mb-3">Across all your content</p>
          <ApprovalDonut approved={approval.approved} rejected={approval.rejected} pending={approval.pending} />
        </div>

        {/* Monthly progress */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex flex-col">
          <h2 className="text-[12px] font-semibold text-gray-900">Monthly Progress</h2>
          <p className="text-[10px] text-gray-400 mt-0.5 mb-4">Delivered vs contracted scope</p>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="rounded-xl border border-gray-100 p-4">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Total Scope</p>
              <p className="text-2xl font-semibold mt-1 text-gray-900">{progress.totalScope}</p>
            </div>
            <div className="rounded-xl border border-gray-100 p-4">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Delivered</p>
              <p className="text-2xl font-semibold mt-1 text-emerald-600">{progress.delivered}</p>
            </div>
          </div>
          <div className="mt-auto">
            <div className="flex justify-between text-[10px] text-gray-400 mb-1">
              <span>Progress</span>
              <span>{progressPct}%</span>
            </div>
            <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-emerald-500" style={{ width: `${progressPct}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Assigned team */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h2 className="text-[12px] font-semibold text-gray-900 flex items-center gap-1.5">
          <Users className="w-4 h-4 text-gray-400" /> Your Assigned Team
        </h2>
        {team.length === 0 ? (
          <p className="text-xs text-gray-400 italic mt-3">No team members assigned yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
            {team.map((m) => (
              <div key={m.id} className="flex items-center gap-3 rounded-xl border border-gray-100 p-3">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-semibold text-[11px] shrink-0"
                  style={{ background: m.avatarColor }}
                >
                  {m.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-gray-900 truncate">{m.name}</p>
                  <p className="text-[10px] text-gray-400 truncate">{m.roles.join(", ") || m.email}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
