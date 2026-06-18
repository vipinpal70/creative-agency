import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { MODULES, type ModuleKey, type ScopeItem } from "@/lib/types";

interface Props {
  activeModules: ModuleKey[];
  scope: ScopeItem[];
}

const pct = (d: number, c: number) => (c === 0 ? 0 : Math.min(100, Math.round((d / c) * 100)));

export function ScopeDashboard({ activeModules, scope }: Props) {
  const totalCommitted = scope.reduce((a, s) => a + s.committed, 0);
  const totalDelivered = scope.reduce((a, s) => a + s.delivered, 0);
  const overall = pct(totalDelivered, totalCommitted);

  const kpis = [
    { label: "Total scope", value: totalCommitted },
    { label: "Delivered", value: totalDelivered },
    { label: "Pending", value: Math.max(0, totalCommitted - totalDelivered) },
    { label: "Delivery %", value: `${overall}%` },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpis.map((k) => (
          <Card key={k.label}>
            <CardContent className="p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {k.label}
              </p>
              <p className="text-2xl font-bold mt-1 text-foreground">{k.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {activeModules.map((m) => {
          const meta = MODULES.find((x) => x.key === m)!;
          const items = scope.filter((s) => s.module === m);
          const c = items.reduce((a, s) => a + s.committed, 0);
          const d = items.reduce((a, s) => a + s.delivered, 0);
          const p = pct(d, c);
          return (
            <Card key={m}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ background: `hsl(var(--mod-${meta.tone}))` }}
                    />
                    <p className="text-sm font-semibold text-foreground">{meta.label}</p>
                  </div>
                  <span className="text-xs font-semibold text-foreground">{p}%</span>
                </div>
                <Progress value={p} className="h-1.5" />
                <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                  <span>
                    Committed: <span className="text-foreground font-medium">{c}</span>
                  </span>
                  <span>
                    Delivered: <span className="text-foreground font-medium">{d}</span>
                  </span>
                  <span>
                    Pending:{" "}
                    <span className="text-foreground font-medium">{Math.max(0, c - d)}</span>
                  </span>
                </div>
                <div className="space-y-1.5 pt-1">
                  {items.map((s) => {
                    const sp = pct(s.delivered, s.committed);
                    return (
                      <div key={s.id} className="text-xs">
                        <div className="flex justify-between mb-0.5">
                          <span className="text-foreground">{s.label}</span>
                          <span className="text-muted-foreground">
                            {s.delivered}/{s.committed}
                          </span>
                        </div>
                        <Progress value={sp} className="h-1" />
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
