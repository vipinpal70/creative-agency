// app/dashboard/page.tsx — Server Component
import Link from "next/link";
import { seedClients, seedCalendarItems } from "@/lib/seed";
import { MODULES } from "@/lib/types";
import type { ContentStatus } from "@/lib/types";

// ── helpers ──────────────────────────────────────────────────────────────────

const TODAY = new Date("2026-06-15");

function upcoming7() {
  return seedCalendarItems
    .filter((i) => {
      const d = new Date(i.date);
      const diff = (d.getTime() - TODAY.getTime()) / 86_400_000;
      return diff >= 0 && diff <= 7;
    })
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 6);
}

function overdueItems() {
  return seedCalendarItems.filter(
    (i) =>
      new Date(i.date) < TODAY &&
      i.contentStatus !== "Published" &&
      i.taskStatus !== "Approved",
  );
}

// ── design tokens ─────────────────────────────────────────────────────────────

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

const STATUS_STYLES: Record<ContentStatus, { bg: string; text: string; dot: string }> = {
  Draft: { bg: "bg-gray-100", text: "text-gray-500", dot: "bg-gray-400" },
  Approved: { bg: "bg-emerald-50", text: "text-emerald-600", dot: "bg-emerald-500" },
  Scheduled: { bg: "bg-indigo-50", text: "text-indigo-600", dot: "bg-indigo-500" },
  Published: { bg: "bg-violet-50", text: "text-violet-600", dot: "bg-violet-500" },
};

// ── sub-components ────────────────────────────────────────────────────────────

function ContentBadge({ status }: { status: ContentStatus }) {
  const s = STATUS_STYLES[status];
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide ${s.bg} ${s.text}`}>
      <span className={`w-1 h-1 rounded-full ${s.dot}`} />
      {status}
    </span>
  );
}

function KpiCard({ label, value, change, icon, accent }: {
  label: string; value: string; change: string; icon: string; accent: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{label}</p>
          <p className="text-2xl font-extrabold mt-1 text-gray-900 tracking-tight">{value}</p>
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

// ── bar chart (pure CSS, no recharts) ─────────────────────────────────────────

const PRODUCTIVITY = [
  { name: "Sarah", tasks: 28 },
  { name: "James", tasks: 22 },
  { name: "Maya", tasks: 35 },
  { name: "Alex", tasks: 18 },
  { name: "Chen", tasks: 31 },
  { name: "Priya", tasks: 25 },
];
const MAX_TASKS = Math.max(...PRODUCTIVITY.map((p) => p.tasks));

function ProductivityChart() {
  return (
    <div className="flex items-end gap-2 h-36 pt-3">
      {PRODUCTIVITY.map((p, i) => {
        const pct = Math.round((p.tasks / MAX_TASKS) * 100);
        const hue = 234 + i * 10;
        return (
          <div key={p.name} className="flex flex-col items-center gap-1 flex-1">
            <span className="text-[9px] font-bold text-gray-400">{p.tasks}</span>
            <div
              className="w-full rounded-t-md hover:opacity-75 transition-opacity cursor-default"
              style={{ height: `${pct}%`, background: `hsl(${hue}, 78%, 62%)` }}
              title={`${p.name}: ${p.tasks} tasks`}
            />
            <span className="text-[9px] text-gray-400">{p.name}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── donut chart (pure SVG) ────────────────────────────────────────────────────

const APPROVAL_DATA = [
  { label: "Approved", value: 68, color: "#22c55e" },
  { label: "Feedback", value: 22, color: "#f59e0b" },
  { label: "Rejected", value: 10, color: "#f43f5e" },
];

function DonutChart() {
  const r = 52, cx = 68, cy = 68, sw = 18;
  const circ = 2 * Math.PI * r;
  let offset = 0;
  const slices = APPROVAL_DATA.map((d) => {
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
        <text x={cx} y={cy - 4} textAnchor="middle" fontSize="18" fontWeight="800" fill="#1e293b">68%</text>
        <text x={cx} y={cy + 13} textAnchor="middle" fontSize="9" fill="#94a3b8">Approved</text>
      </svg>
      <div className="flex flex-col gap-1.5 w-full px-1">
        {APPROVAL_DATA.map((d) => (
          <div key={d.label} className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-sm" style={{ background: d.color }} />
              <span className="text-[10px] text-gray-500">{d.label}</span>
            </div>
            <span className="text-[10px] font-bold text-gray-700">{d.value}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── page ──────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const upcomingList = upcoming7();
  const overdueList = overdueItems();

  const kpis = [
    { label: "Active Clients", value: String(seedClients.length), change: "+1 this month", icon: "👥", accent: "bg-indigo-50 text-indigo-600" },
    { label: "Open Tasks", value: "67", change: "12 due today", icon: "✅", accent: "bg-blue-50 text-blue-600" },
    { label: "Pending Approvals", value: "18", change: "5 overdue", icon: "⏳", accent: "bg-amber-50 text-amber-600" },
    { label: "Delayed Projects", value: "4", change: "-2 from last week", icon: "⚠️", accent: "bg-rose-50 text-rose-600" },
  ];

  return (
    <div className="max-w-7xl space-y-5">

      {/* Page header */}
      <div>
        <h1 className="text-xl font-extrabold tracking-tight text-gray-900">Dashboard</h1>
        <p className="text-[11px] text-gray-400 mt-0.5">Welcome back, here&apos;s what&apos;s happening today.</p>
      </div>

      {/* ── KPI cards ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map((kpi) => <KpiCard key={kpi.label} {...kpi} />)}
      </div>

      {/* ── Scope delivery ────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 flex items-center justify-between border-b border-gray-50">
          <div>
            <h2 className="text-[12px] font-bold text-gray-900">Scope delivery — target vs delivered</h2>
          </div>
          <Link href="/dashboard/clients" className="text-[10px] font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 transition-colors">
            All clients →
          </Link>
        </div>
        <div className="divide-y divide-gray-50">
          {seedClients.map((c) => (
            <div key={c.id} className="px-5 py-3.5 hover:bg-gray-50/40 transition-colors">
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-[10px] font-bold shadow-sm">
                    {c.name.charAt(0)}
                  </div>
                  <span className="text-[12px] font-semibold text-gray-900">{c.name}</span>
                </div>
                <div className="flex flex-wrap gap-1 justify-end">
                  {c.activeModules.map((k) => {
                    const m = MODULES.find((x) => x.key === k)!;
                    const items = c.scope.filter((s) => s.module === k);
                    const com = items.reduce((a, s) => a + (parseInt(s.unit || "0") || 0), 0);
                    const del = items.reduce((a, s) => a + s.delivered, 0);
                    const p = com === 0 ? 0 : Math.round((del / com) * 100);
                    const color = MODULE_COLORS[k] ?? "#6366f1";
                    return (
                      <span key={k} className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold" style={{ background: `${color}18`, color }}>
                        {m.label} · {p}%
                      </span>
                    );
                  })}
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                {c.activeModules.map((k) => {
                  const m = MODULES.find((x) => x.key === k)!;
                  const items = c.scope.filter((s) => s.module === k);
                  const com = items.reduce((a, s) => a + (parseInt(s.unit || "0") || 0), 0);
                  const del = items.reduce((a, s) => a + s.delivered, 0);
                  const p = com === 0 ? 0 : Math.round((del / com) * 100);
                  return (
                    <div key={k}>
                      <div className="flex justify-between text-[9px] text-gray-400 mb-1">
                        <span className="font-medium">{m.label}</span>
                        <span>{del}/{com}</span>
                      </div>
                      <ProgressBar value={p} color={MODULE_COLORS[k] ?? "#6366f1"} />
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Charts row ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-[12px] font-bold text-gray-900">Productivity per Team Member</h2>
          <p className="text-[10px] text-gray-400 mt-0.5 mb-1">Tasks completed this month</p>
          <ProductivityChart />
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-[12px] font-bold text-gray-900">Approval Rate</h2>
          <p className="text-[10px] text-gray-400 mt-0.5 mb-3">Across all client content</p>
          <DonutChart />
        </div>
      </div>

      {/* ── Upcoming & Overdue ───────────────────────────────────────── */}
      <div className="grid md:grid-cols-2 gap-3">

        {/* Upcoming */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 flex items-center justify-between border-b border-gray-50">
            <div>
              <h2 className="text-[12px] font-bold text-gray-900">Upcoming deliverables</h2>
              <p className="text-[9px] text-gray-400 mt-0.5">Next 7 days</p>
            </div>
            <Link href="/dashboard/calendar" className="text-[10px] font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
              Calendar →
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {upcomingList.length === 0 && (
              <p className="px-5 py-6 text-[10px] text-gray-400 text-center">Nothing in the next 7 days ✨</p>
            )}
            {upcomingList.map((i) => {
              const m = MODULES.find((x) => x.key === i.module)!;
              const color = MODULE_COLORS[m.key] ?? "#6366f1";
              return (
                <div key={i.id} className="flex items-center gap-2.5 px-5 py-2.5 hover:bg-gray-50/50 transition-colors group">
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: color }} />
                  <span className="text-[9px] text-gray-400 w-14 shrink-0">{i.date}</span>
                  <p className="text-[11px] text-gray-700 flex-1 truncate group-hover:text-indigo-600 transition-colors">{i.title}</p>
                  <ContentBadge status={i.contentStatus} />
                </div>
              );
            })}
          </div>
        </div>

        {/* Overdue */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-50 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
            <h2 className="text-[12px] font-bold text-rose-500">Overdue</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {overdueList.length === 0 && (
              <p className="px-5 py-6 text-[10px] text-gray-400 text-center">All clear ✨</p>
            )}
            {overdueList.map((i) => {
              const m = MODULES.find((x) => x.key === i.module)!;
              const color = MODULE_COLORS[m.key] ?? "#6366f1";
              return (
                <div key={i.id} className="flex items-center gap-2.5 px-5 py-2.5 hover:bg-rose-50/30 transition-colors">
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: color }} />
                  <span className="text-[9px] text-rose-400 w-14 shrink-0">{i.date}</span>
                  <p className="text-[11px] text-gray-700 flex-1 truncate">{i.title}</p>
                  <ContentBadge status={i.contentStatus} />
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
            <h3 className="text-sm font-bold tracking-tight">Everything under control?</h3>
            <p className="text-[11px] text-indigo-100 mt-0.5">
              {overdueList.length > 0
                ? `${overdueList.length} overdue item${overdueList.length > 1 ? "s" : ""} need attention.`
                : "No overdue items — great work! 🎉"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            <Link href="/dashboard/tasks" className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[11px] font-bold text-indigo-600 bg-white hover:bg-indigo-50 shadow hover:-translate-y-0.5 transition-all duration-200">
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
