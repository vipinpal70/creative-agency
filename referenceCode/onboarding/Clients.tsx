import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { StatusBadge } from "@/components/StatusBadge";
import { Search, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { seedClients } from "@/lib/seed";
import { MODULES } from "@/lib/types";

export default function Clients() {
  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Clients</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {seedClients.length} total clients
          </p>
        </div>
        <Link to="/onboarding">
          <Button size="sm">
            <Plus className="h-4 w-4 mr-1" /> New Client
          </Button>
        </Link>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search clients..." className="pl-9" />
      </div>

      <div className="grid gap-3">
        {seedClients.map((c) => {
          const committed = c.scope.reduce((a, s) => a + s.committed, 0);
          const delivered = c.scope.reduce((a, s) => a + s.delivered, 0);
          const pct = committed === 0 ? 0 : Math.round((delivered / committed) * 100);
          return (
            <Link key={c.id} to={`/clients/${c.id}`}>
              <Card className="hover:shadow-md transition-all cursor-pointer hover:border-primary/20">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <span className="text-sm font-bold text-primary">
                          {c.brandName.slice(0, 2).toUpperCase()}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm text-foreground truncate">
                          {c.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {c.industry} · {c.primaryContact}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      <div className="hidden md:flex gap-1.5">
                        {c.activeModules.slice(0, 4).map((k) => {
                          const m = MODULES.find((x) => x.key === k)!;
                          return (
                            <span
                              key={k}
                              className="text-[10px] px-2 py-0.5 rounded-full"
                              style={{
                                background: `hsl(var(--mod-${m.tone}) / 0.12)`,
                                color: `hsl(var(--mod-${m.tone}))`,
                              }}
                            >
                              {m.label}
                            </span>
                          );
                        })}
                      </div>
                      <StatusBadge status="Active" />
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-3">
                    <Progress value={pct} className="h-1.5 flex-1" />
                    <span className="text-xs text-muted-foreground w-32 text-right">
                      {delivered}/{committed} delivered · {pct}%
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
