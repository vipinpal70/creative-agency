// app/dashboard/page.tsx — Admin/Member dashboard (dynamic Server Component)
import Link from "next/link";
import { redirect } from "next/navigation";
import { connectDB } from "@/lib/db";
import { getSession } from "@/lib/auth";
import Client from "@/lib/models/client.model";
import ScopeOfWork from "@/lib/models/scope-of-work.model";
import Deliverable from "@/lib/models/deliverable.model";
import Task from "@/lib/models/task.model";
import ContentDraft from "@/lib/models/content-draft.model";
import User from "@/lib/models/user.model";
import { MODULES } from "@/lib/types";
import { normalizeTaskStatus } from "@/lib/task-status";
import {
  normalizeDraftStatus,
  normalizeDeliverableStatus,
  STATUS_LABEL,
  STATUS_COLOR,
} from "@/lib/status-flow";
import { Users, CheckCircle, Clock, FileText } from "lucide-react";

// Always render with fresh data — this reads live collections on each request.
export const dynamic = "force-dynamic";

// ── design tokens ───────────────────────────────────────────────────────────

const MODULE_COLORS: Record<string, string> = {
  social: "#6366f1",
  paid: "#f59e0b",
  seo: "#22c55e",
  email: "#3b82f6",
  website: "#8b5cf6",
  orm: "#ec4899",
  influencer: "#14b8a6",
  video: "#f97316",
  design: "#a855f7",
  custom: "#64748b",
};

// Deliverable delivery is considered complete at design_approved (nothing sets
// "delivered" automatically) — matches the clients list computation.
const DELIVERED_STATUSES = new Set(["delivered", "design_approved"]);

const moduleLabel = (key: string) => MODULES.find((m) => m.key === key)?.label ?? key;

// ── data ────────────────────────────────────────────────────────────────────

async function getDashboardData() {
  await connectDB();

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  const in7Days = new Date(startOfToday.getTime() + 7 * 86_400_000);

  const [clients, scopes, deliverables, tasks, drafts, users] = await Promise.all([
    Client.find({}, { name: 1, brandName: 1, status: 1 }).lean(),
    ScopeOfWork.find({ isActive: true }, { clientId: 1, items: 1 }).lean(),
    Deliverable.find({}, { clientId: 1, module: 1, status: 1, scheduledDate: 1, title: 1 }).lean(),
    Task.find({}, { status: 1, assignedToId: 1, endDate: 1, updatedAt: 1 }).lean(),
    ContentDraft.find({ archivedAt: null }, { status: 1 }).lean(),
    User.find({}, { firstName: 1, lastName: 1 }).lean(),
  ]);

  const inMonth = (d?: Date | null) => !!d && d >= startOfMonth && d <= endOfMonth;
  const isDelivered = (status: string) => DELIVERED_STATUSES.has(normalizeDeliverableStatus(status));

  const clientMap = new Map(clients.map((c) => [String(c._id), c.name]));
  const userMap = new Map(
    users.map((u) => [String(u._id), [u.firstName, u.lastName].filter(Boolean).join(" ")])
  );

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const totalClients = clients.length;
  const activeClients = clients.filter((c) => c.status === "active").length;

  const openTasks = tasks.filter((t) => normalizeTaskStatus(t.status) !== "CLOSED").length;
  const dueToday = tasks.filter(
    (t) =>
      normalizeTaskStatus(t.status) !== "CLOSED" &&
      t.endDate &&
      new Date(t.endDate) >= startOfToday &&
      new Date(t.endDate) <= endOfToday
  ).length;

  let contentReview = 0;
  let designReview = 0;
  let approved = 0;
  let rejected = 0;
  for (const d of drafts) {
    const st = normalizeDraftStatus(d.status) ?? d.status;
    if (st === "content_internal_review" || st === "content_client_review") contentReview++;
    else if (st === "design_internal_review" || st === "design_client_review") designReview++;
    if (st === "design_approved") approved++;
    else if (st === "rejected") rejected++;
  }
  const pendingApprovals = contentReview + designReview;

  const overdueDeliverables = deliverables.filter(
    (d) => d.scheduledDate && new Date(d.scheduledDate) < startOfToday && !isDelivered(d.status)
  ).length;

  const kpis = [
    {
      label: "Active Clients",
      value: String(activeClients),
      change: `${totalClients} total`,
      accent: "bg-indigo-50 text-indigo-600",
      icon: "users" as const,
    },
    {
      label: "Open Tasks",
      value: String(openTasks),
      change: `${dueToday} due today`,
      accent: "bg-blue-50 text-blue-600",
      icon: "check" as const,
    },
    {
      label: "Pending Approvals",
      value: String(pendingApprovals),
      change: `${contentReview} content · ${designReview} design`,
      accent: "bg-amber-50 text-amber-600",
      icon: "clock" as const,
    },
    {
      label: "Overdue",
      value: String(overdueDeliverables),
      change: "past scheduled date",
      accent: "bg-rose-50 text-rose-600",
      icon: "file" as const,
    },
  ];

  // ── Scope delivery per active client (monthly target vs delivered) ─────────
  const deliveredByClientModule = new Map<string, number>();
  for (const d of deliverables) {
    if (!isDelivered(d.status) || !inMonth(d.scheduledDate ? new Date(d.scheduledDate) : null)) continue;
    const key = `${String(d.clientId)}|${d.module}`;
    deliveredByClientModule.set(key, (deliveredByClientModule.get(key) ?? 0) + 1);
  }

  const committedByClient = new Map<string, Map<string, number>>();
  for (const s of scopes) {
    const cid = String(s.clientId);
    let mods = committedByClient.get(cid);
    if (!mods) {
      mods = new Map();
      committedByClient.set(cid, mods);
    }
    for (const item of s.items ?? []) {
      const committed = parseInt(item.unit ?? "0") || 0;
      if (committed <= 0) continue;
      mods.set(item.module, (mods.get(item.module) ?? 0) + committed);
    }
  }

  const scopeDelivery = clients
    .filter((c) => c.status === "active")
    .map((c) => {
      const cid = String(c._id);
      const mods = committedByClient.get(cid) ?? new Map<string, number>();
      const modules = Array.from(mods.entries()).map(([key, committed]) => {
        const delivered = deliveredByClientModule.get(`${cid}|${key}`) ?? 0;
        return {
          key,
          committed,
          delivered,
          pct: committed === 0 ? 0 : Math.round((delivered / committed) * 100),
        };
      });
      return { id: cid, name: c.name, modules };
    });

  // ── Productivity: tasks closed this month, per assignee ────────────────────
  const closedByUser = new Map<string, number>();
  for (const t of tasks) {
    if (normalizeTaskStatus(t.status) !== "CLOSED") continue;
    if (!t.assignedToId || !inMonth(t.updatedAt ? new Date(t.updatedAt) : null)) continue;
    const uid = String(t.assignedToId);
    closedByUser.set(uid, (closedByUser.get(uid) ?? 0) + 1);
  }
  const productivity = Array.from(closedByUser.entries())
    .map(([uid, count]) => ({ name: (userMap.get(uid) || "Unknown").split(" ")[0], tasks: count }))
    .sort((a, b) => b.tasks - a.tasks)
    .slice(0, 6);

  // ── Approval rate (all non-archived copies) ────────────────────────────────
  const totalDrafts = drafts.length;
  const inReview = totalDrafts - approved - rejected;
  const pct = (n: number) => (totalDrafts === 0 ? 0 : Math.round((n / totalDrafts) * 100));
  const approval = {
    approvedPct: pct(approved),
    data: [
      { label: "Approved", value: pct(approved), color: "#22c55e" },
      { label: "In Review", value: pct(inReview), color: "#f59e0b" },
      { label: "Rejected", value: pct(rejected), color: "#f43f5e" },
    ],
  };

  // ── Upcoming (next 7 days) & Overdue deliverables ──────────────────────────
  const fmt = (d: Date) =>
    new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });

  const upcoming = deliverables
    .filter((d) => {
      if (!d.scheduledDate) return false;
      const sd = new Date(d.scheduledDate);
      return sd >= startOfToday && sd <= in7Days && !isDelivered(d.status);
    })
    .sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime())
    .slice(0, 6)
    .map((d) => ({
      id: String(d._id),
      title: d.title,
      client: clientMap.get(String(d.clientId)) ?? "",
      module: d.module,
      date: fmt(d.scheduledDate),
      status: normalizeDeliverableStatus(d.status),
    }));

  const overdue = deliverables
    .filter((d) => d.scheduledDate && new Date(d.scheduledDate) < startOfToday && !isDelivered(d.status))
    .sort((a, b) => new Date(b.scheduledDate).getTime() - new Date(a.scheduledDate).getTime())
    .slice(0, 6)
    .map((d) => ({
      id: String(d._id),
      title: d.title,
      client: clientMap.get(String(d.clientId)) ?? "",
      module: d.module,
      date: fmt(d.scheduledDate),
      status: normalizeDeliverableStatus(d.status),
    }));

  return { kpis, scopeDelivery, productivity, approval, upcoming, overdue };
}

// ── sub-components ──────────────────────────────────────────────────────────

const KPI_ICONS = {
  users: <Users className="w-5 h-5" />,
  check: <CheckCircle className="w-5 h-5" />,
  clock: <Clock className="w-5 h-5" />,
  file: <FileText className="w-5 h-5" />,
};

function StatusBadge({ status }: { status: string }) {
  const label = STATUS_LABEL[status] ?? status;
  const color = STATUS_COLOR[status] ?? "bg-gray-100 text-gray-600";
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-semibold whitespace-nowrap ${color}`}>
      {label}
    </span>
  );
}

function KpiCard({ label, value, change, icon, accent }: {
  label: string; value: string; change: string; icon: React.ReactNode; accent: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-widest">{label}</p>
          <p className="text-2xl font-semibold mt-1 text-gray-900 tracking-tight">{value}</p>
          <p className="text-[10px] text-gray-400 mt-0.5">{change}</p>
        </div>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg shadow-sm ${accent}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function ProgressBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="relative h-1 w-full rounded-full bg-gray-100 overflow-hidden">
      <div
        className="absolute left-0 top-0 h-full rounded-full"
        style={{ width: `${Math.min(value, 100)}%`, background: color }}
      />
    </div>
  );
}

function ProductivityChart({ data }: { data: { name: string; tasks: number }[] }) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-36 text-[10px] text-gray-400">
        No tasks completed yet this month.
      </div>
    );
  }
  const max = Math.max(...data.map((p) => p.tasks), 1);
  return (
    <div className="flex items-end gap-2 h-36 pt-3">
      {data.map((p, i) => {
        const pct = Math.round((p.tasks / max) * 100);
        const hue = 234 + i * 10;
        return (
          <div key={p.name + i} className="flex flex-col items-center gap-1 flex-1">
            <span className="text-[9px] font-semibold text-gray-400">{p.tasks}</span>
            <div
              className="w-full rounded-t-md hover:opacity-75 transition-opacity cursor-default"
              style={{ height: `${Math.max(pct, 4)}%`, background: `hsl(${hue}, 78%, 62%)` }}
              title={`${p.name}: ${p.tasks} tasks`}
            />
            <span className="text-[9px] text-gray-400 truncate max-w-full">{p.name}</span>
          </div>
        );
      })}
    </div>
  );
}

function DonutChart({ data, centerPct }: { data: { label: string; value: number; color: string }[]; centerPct: number }) {
  const r = 52, cx = 68, cy = 68, sw = 18;
  const circ = 2 * Math.PI * r;
  let offset = 0;
  const slices = data.map((d) => {
    const dash = (d.value / 100) * circ;
    const gap = circ - dash;
    const el = (
      <circle
        key={d.label}
        cx={cx} cy={cy} r={r}
        fill="none"
        stroke={d.color}
        strokeWidth={sw}
        strokeDasharray={`${dash} ${gap}`}
        strokeDashoffset={-offset}
        transform={`rotate(-90 ${cx} ${cy})`}
      />
    );
    offset += dash;
    return el;
  });
  return (
    <div className="flex flex-col items-center gap-3">
      <svg width="136" height="136" viewBox="0 0 136 136">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f1f5f9" strokeWidth={sw} />
        {slices}
        <text x={cx} y={cy - 4} textAnchor="middle" fontSize="18" fontWeight="800" fill="#1e293b">{centerPct}%</text>
        <text x={cx} y={cy + 13} textAnchor="middle" fontSize="9" fill="#94a3b8">Approved</text>
      </svg>
      <div className="flex flex-col gap-1.5 w-full px-1">
        {data.map((d) => (
          <div key={d.label} className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-sm" style={{ background: d.color }} />
              <span className="text-[10px] text-gray-500">{d.label}</span>
            </div>
            <span className="text-[10px] font-semibold text-gray-700">{d.value}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── page ────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect("/sign-in");

  await connectDB();
  const me = await User.findById(session.userId, { firstName: 1 }).lean();
  const firstName = (me as { firstName?: string } | null)?.firstName ?? "";

  const { kpis, scopeDelivery, productivity, approval, upcoming, overdue } = await getDashboardData();

  return (
    <div className="max-w-7xl space-y-5">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-gray-900">Dashboard</h1>
        <p className="text-[11px] text-gray-400 mt-0.5">
          Welcome back{firstName ? `, ${firstName}` : ""} — here&apos;s what&apos;s happening today.
        </p>
      </div>

      {/* ── KPI cards ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map((kpi) => (
          <KpiCard key={kpi.label} label={kpi.label} value={kpi.value} change={kpi.change} accent={kpi.accent} icon={KPI_ICONS[kpi.icon]} />
        ))}
      </div>

      {/* ── Scope delivery ────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 flex items-center justify-between border-b border-gray-50">
          <div>
            <h2 className="text-[12px] font-semibold text-gray-900">Scope delivery — target vs delivered (this month)</h2>
          </div>
          <Link href="/dashboard/clients" className="text-[10px] font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 transition-colors">
            All clients →
          </Link>
        </div>
        <div className="divide-y divide-gray-50">
          {scopeDelivery.length === 0 && (
            <p className="px-5 py-6 text-[10px] text-gray-400 text-center">No active clients yet.</p>
          )}
          {scopeDelivery.map((c) => (
            <div key={c.id} className="px-5 py-3.5 hover:bg-gray-50/40 transition-colors">
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-[10px] font-semibold shadow-sm">
                    {c.name.charAt(0)}
                  </div>
                  <Link href={`/dashboard/clients/${c.id}`} className="text-[12px] font-semibold text-gray-900 hover:text-indigo-600 transition-colors">
                    {c.name}
                  </Link>
                </div>
                <div className="flex flex-wrap gap-1 justify-end">
                  {c.modules.map((m) => {
                    const color = MODULE_COLORS[m.key] ?? "#6366f1";
                    return (
                      <span key={m.key} className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold" style={{ background: `${color}18`, color }}>
                        {moduleLabel(m.key)} · {m.pct}%
                      </span>
                    );
                  })}
                </div>
              </div>
              {c.modules.length === 0 ? (
                <p className="text-[10px] text-gray-400 italic">No active scope of work.</p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                  {c.modules.map((m) => (
                    <div key={m.key}>
                      <div className="flex justify-between text-[9px] text-gray-400 mb-1">
                        <span className="font-medium">{moduleLabel(m.key)}</span>
                        <span>{m.delivered}/{m.committed}</span>
                      </div>
                      <ProgressBar value={m.pct} color={MODULE_COLORS[m.key] ?? "#6366f1"} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Charts row ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-[12px] font-semibold text-gray-900">Productivity per Team Member</h2>
          <p className="text-[10px] text-gray-400 mt-0.5 mb-1">Tasks completed this month</p>
          <ProductivityChart data={productivity} />
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-[12px] font-semibold text-gray-900">Approval Rate</h2>
          <p className="text-[10px] text-gray-400 mt-0.5 mb-3">Across all client content</p>
          <DonutChart data={approval.data} centerPct={approval.approvedPct} />
        </div>
      </div>

      {/* ── Upcoming & Overdue ───────────────────────────────────────── */}
      <div className="grid md:grid-cols-2 gap-3">
        {/* Upcoming */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 flex items-center justify-between border-b border-gray-50">
            <div>
              <h2 className="text-[12px] font-semibold text-gray-900">Upcoming deliverables</h2>
              <p className="text-[9px] text-gray-400 mt-0.5">Next 7 days</p>
            </div>
            <Link href="/dashboard/calendar" className="text-[10px] font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
              Calendar →
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {upcoming.length === 0 && (
              <p className="px-5 py-6 text-[10px] text-gray-400 text-center">Nothing in the next 7 days ✨</p>
            )}
            {upcoming.map((i) => {
              const color = MODULE_COLORS[i.module] ?? "#6366f1";
              return (
                <div key={i.id} className="flex items-center gap-2.5 px-5 py-2.5 hover:bg-gray-50/50 transition-colors group">
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: color }} />
                  <span className="text-[9px] text-gray-400 w-12 shrink-0">{i.date}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-gray-700 truncate group-hover:text-indigo-600 transition-colors">{i.title}</p>
                    {i.client && <p className="text-[9px] text-gray-400 truncate">{i.client}</p>}
                  </div>
                  <StatusBadge status={i.status} />
                </div>
              );
            })}
          </div>
        </div>

        {/* Overdue */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-50 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
            <h2 className="text-[12px] font-semibold text-rose-500">Overdue</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {overdue.length === 0 && (
              <p className="px-5 py-6 text-[10px] text-gray-400 text-center">All clear ✨</p>
            )}
            {overdue.map((i) => {
              const color = MODULE_COLORS[i.module] ?? "#6366f1";
              return (
                <div key={i.id} className="flex items-center gap-2.5 px-5 py-2.5 hover:bg-rose-50/30 transition-colors">
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: color }} />
                  <span className="text-[9px] text-rose-400 w-12 shrink-0">{i.date}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-gray-700 truncate">{i.title}</p>
                    {i.client && <p className="text-[9px] text-gray-400 truncate">{i.client}</p>}
                  </div>
                  <StatusBadge status={i.status} />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── CTA strip ───────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-violet-700 p-6 text-white shadow-lg shadow-indigo-500/20">
        <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/5 pointer-events-none" />
        <div className="absolute -bottom-5 -left-5 w-24 h-24 rounded-full bg-white/5 pointer-events-none" />
        <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold tracking-tight">Everything under control?</h3>
            <p className="text-[11px] text-indigo-100 mt-0.5">
              {overdue.length > 0
                ? `${overdue.length} overdue item${overdue.length > 1 ? "s" : ""} need attention.`
                : "No overdue items — great work! 🎉"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            <Link href="/dashboard/tasks" className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[11px] font-semibold text-indigo-600 bg-white hover:bg-indigo-50 shadow hover:-translate-y-0.5 transition-all duration-200">
              View Tasks
            </Link>
            <Link href="/dashboard/calendar" className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[11px] font-semibold text-white bg-white/10 border border-white/25 hover:bg-white/20 transition-all duration-200">
              Calendar
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
