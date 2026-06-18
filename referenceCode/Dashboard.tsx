import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Users, ListTodo, Clock, AlertTriangle, ArrowRight } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Link } from "react-router-dom";
import { seedClients, seedCalendarItems } from "@/lib/seed";
import { MODULES } from "@/lib/types";
import { ContentStatusBadge } from "@/components/ContentStatusBadge";

const kpis = [
  { label: "Active Clients", value: String(seedClients.length), change: "+1 this month", icon: Users, color: "text-primary" },
  { label: "Open Tasks", value: "67", change: "12 due today", icon: ListTodo, color: "text-info" },
  { label: "Pending Approvals", value: "18", change: "5 overdue", icon: Clock, color: "text-warning" },
  { label: "Delayed Projects", value: "4", change: "-2 from last week", icon: AlertTriangle, color: "text-destructive" },
];

const productivity = [
  { name: "Sarah", tasks: 28 },
  { name: "James", tasks: 22 },
  { name: "Maya", tasks: 35 },
  { name: "Alex", tasks: 18 },
  { name: "Chen", tasks: 31 },
  { name: "Priya", tasks: 25 },
];

const approvalData = [
  { name: "Approved", value: 68 },
  { name: "Feedback", value: 22 },
  { name: "Rejected", value: 10 },
];
const pieColors = ["hsl(152, 69%, 40%)", "hsl(38, 92%, 50%)", "hsl(0, 84%, 60%)"];

export default function Dashboard() {
  const today = new Date("2026-06-12");
  const upcoming = seedCalendarItems
    .filter((i) => {
      const d = new Date(i.date);
      const diff = (d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
      return diff >= 0 && diff <= 7;
    })
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 6);

  const overdue = seedCalendarItems.filter(
    (i) =>
      new Date(i.date) < today &&
      i.contentStatus !== "Published" &&
      i.taskStatus !== "Approved",
  );

  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Welcome back, here's what's happening today.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {kpi.label}
                  </p>
                  <p className="text-3xl font-bold mt-1 text-foreground">{kpi.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{kpi.change}</p>
                </div>
                <div className={`p-2 rounded-lg bg-accent ${kpi.color}`}>
                  <kpi.icon className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Scope delivery per client */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold">Scope delivery — committed vs delivered</CardTitle>
          <Link to="/clients" className="text-xs text-primary hover:underline flex items-center gap-1">
            All clients <ArrowRight className="h-3 w-3" />
          </Link>
        </CardHeader>
        <CardContent className="space-y-4">
          {seedClients.map((c) => {
            return (
              <div key={c.id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <Link to={`/clients/${c.id}`} className="text-sm font-medium text-foreground hover:underline">
                    {c.name}
                  </Link>
                  <div className="flex flex-wrap gap-1.5">
                    {c.activeModules.map((k) => {
                      const m = MODULES.find((x) => x.key === k)!;
                      const items = c.scope.filter((s) => s.module === k);
                      const com = items.reduce((a, s) => a + s.committed, 0);
                      const del = items.reduce((a, s) => a + s.delivered, 0);
                      const p = com === 0 ? 0 : Math.round((del / com) * 100);
                      return (
                        <span
                          key={k}
                          className="text-[10px] px-2 py-0.5 rounded-full"
                          style={{
                            background: `hsl(var(--mod-${m.tone}) / 0.12)`,
                            color: `hsl(var(--mod-${m.tone}))`,
                          }}
                          title={`${m.label}: ${del}/${com}`}
                        >
                          {m.label} · {p}%
                        </span>
                      );
                    })}
                  </div>
                </div>
                <div className="grid md:grid-cols-4 gap-2">
                  {c.activeModules.map((k) => {
                    const m = MODULES.find((x) => x.key === k)!;
                    const items = c.scope.filter((s) => s.module === k);
                    const com = items.reduce((a, s) => a + s.committed, 0);
                    const del = items.reduce((a, s) => a + s.delivered, 0);
                    const p = com === 0 ? 0 : Math.round((del / com) * 100);
                    return (
                      <div key={k}>
                        <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                          <span>{m.label}</span>
                          <span>
                            {del}/{com}
                          </span>
                        </div>
                        <Progress value={p} className="h-1.5" />
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">
              Productivity per Team Member
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={productivity}>
                <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="hsl(220,9%,46%)" />
                <YAxis tick={{ fontSize: 12 }} stroke="hsl(220,9%,46%)" />
                <Tooltip
                  contentStyle={{
                    borderRadius: 8,
                    border: "none",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                  }}
                />
                <Bar dataKey="tasks" fill="hsl(234, 89%, 63%)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Approval Rate</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center">
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={approvalData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {approvalData.map((_, i) => (
                    <Cell key={i} fill={pieColors[i]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    borderRadius: 8,
                    border: "none",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold">Upcoming deliverables</CardTitle>
            <Link
              to="/calendar"
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              Calendar <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {upcoming.length === 0 && (
              <p className="text-xs text-muted-foreground">Nothing in the next 7 days.</p>
            )}
            {upcoming.map((i) => {
              const m = MODULES.find((x) => x.key === i.module)!;
              return (
                <div
                  key={i.id}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent transition-colors"
                >
                  <span
                    className="h-2.5 w-2.5 rounded-full shrink-0"
                    style={{ background: `hsl(var(--mod-${m.tone}))` }}
                  />
                  <div className="text-xs text-muted-foreground w-16 shrink-0">{i.date}</div>
                  <p className="text-sm text-foreground flex-1 truncate">{i.title}</p>
                  <ContentStatusBadge status={i.contentStatus} />
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-destructive">Overdue</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {overdue.length === 0 && (
              <p className="text-xs text-muted-foreground">All clear ✨</p>
            )}
            {overdue.map((i) => {
              const m = MODULES.find((x) => x.key === i.module)!;
              return (
                <div key={i.id} className="flex items-center gap-3 p-2 rounded-lg">
                  <span
                    className="h-2.5 w-2.5 rounded-full shrink-0"
                    style={{ background: `hsl(var(--mod-${m.tone}))` }}
                  />
                  <div className="text-xs text-destructive w-16 shrink-0">{i.date}</div>
                  <p className="text-sm text-foreground flex-1 truncate">{i.title}</p>
                  <ContentStatusBadge status={i.contentStatus} />
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
