import { useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/StatusBadge";
import { ArrowLeft } from "lucide-react";
import { seedClients } from "@/lib/seed";
import { MODULES, type CredentialEntry, type ScopeItem } from "@/lib/types";
import { ScopeDashboard } from "@/components/clients/ScopeDashboard";
import { ScopeBuilder } from "@/components/clients/ScopeBuilder";
import { CredentialVault } from "@/components/clients/CredentialVault";

export default function ClientDetail() {
  const { id } = useParams();
  const initial = useMemo(
    () => seedClients.find((c) => c.id === id) ?? seedClients[0],
    [id],
  );
  const [scope, setScope] = useState<ScopeItem[]>(initial.scope);
  const [credentials, setCredentials] = useState<CredentialEntry[]>(initial.credentials);
  const [editScope, setEditScope] = useState(false);

  return (
    <div className="space-y-6 max-w-6xl">
      <Link
        to="/clients"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Clients
      </Link>
      <div className="flex items-center gap-4 flex-wrap">
        <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
          <span className="text-lg font-bold text-primary">
            {initial.brandName.slice(0, 2).toUpperCase()}
          </span>
        </div>
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-foreground">{initial.name}</h1>
          <p className="text-sm text-muted-foreground">
            {initial.industry} · Contract {initial.contractStart} → {initial.contractEnd}
          </p>
        </div>
        <StatusBadge status="Active" className="ml-auto" />
      </div>

      <div className="flex flex-wrap gap-1.5">
        {initial.activeModules.map((k) => {
          const m = MODULES.find((x) => x.key === k)!;
          return (
            <span
              key={k}
              className="text-xs px-2 py-0.5 rounded-full"
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

      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="scope">Scope Dashboard</TabsTrigger>
          <TabsTrigger value="access">Access Control</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Primary contact</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-1">
                <p>
                  <span className="text-foreground font-medium">{initial.primaryContact}</span>
                </p>
                <p>{initial.contactEmail}</p>
                <p>{initial.contactPhone}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Business</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-1">
                <p>
                  Industry: <span className="text-foreground">{initial.industry}</span>
                </p>
                <p>
                  Website:{" "}
                  <a
                    href={initial.website}
                    className="text-primary hover:underline"
                    target="_blank"
                    rel="noreferrer"
                  >
                    {initial.website}
                  </a>
                </p>
              </CardContent>
            </Card>
          </div>
          <ScopeDashboard activeModules={initial.activeModules} scope={scope} />
        </TabsContent>

        <TabsContent value="scope" className="mt-4 space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              Per-module commitment vs delivery, calculated live.
            </p>
            <button
              onClick={() => setEditScope((v) => !v)}
              className="text-xs font-medium text-primary hover:underline"
            >
              {editScope ? "Done editing" : "Edit scope"}
            </button>
          </div>
          {editScope ? (
            <ScopeBuilder
              activeModules={initial.activeModules}
              scope={scope}
              onChange={setScope}
            />
          ) : (
            <ScopeDashboard activeModules={initial.activeModules} scope={scope} />
          )}
        </TabsContent>

        <TabsContent value="access" className="mt-4">
          <CredentialVault credentials={credentials} onChange={setCredentials} />
        </TabsContent>

        <TabsContent value="team" className="mt-4">
          <Card>
            <CardContent className="p-4 space-y-3">
              {[
                { name: "Sarah K.", role: "Account Manager" },
                { name: "Maya P.", role: "Creative Lead" },
                { name: "James L.", role: "Copywriter" },
                { name: "Alex R.", role: "Designer" },
                { name: "Chen W.", role: "Video Editor" },
              ].map((t) => (
                <div
                  key={t.name}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent transition-colors"
                >
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                    {t.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.role}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="mt-4">
          <Card>
            <CardContent className="p-4 space-y-2">
              {[
                { name: "Brand Guidelines v3.2.pdf", date: "Mar 12, 2026" },
                { name: "Q1 Strategy Deck.pptx", date: "Jan 5, 2026" },
                { name: "Content Approval SOP.docx", date: "Feb 20, 2026" },
              ].map((d) => (
                <div
                  key={d.name}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-accent transition-colors"
                >
                  <p className="text-sm font-medium text-foreground">{d.name}</p>
                  <p className="text-xs text-muted-foreground">{d.date}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
