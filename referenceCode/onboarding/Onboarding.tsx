import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { MODULES, type ModuleKey, type ScopeItem } from "@/lib/types";
import { ScopeBuilder } from "@/components/clients/ScopeBuilder";
import { toast } from "sonner";

const steps = ["Client info", "Modules", "Scope", "Review"];

export default function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [info, setInfo] = useState({
    name: "",
    brand: "",
    industry: "",
    website: "",
    contact: "",
    email: "",
    phone: "",
    start: "",
    end: "",
  });
  const [active, setActive] = useState<ModuleKey[]>(["social"]);
  const [customModuleName, setCustomModuleName] = useState("");
  const [scope, setScope] = useState<ScopeItem[]>([]);

  const toggleModule = (key: ModuleKey) =>
    setActive((a) =>
      a.includes(key) ? a.filter((k) => k !== key) : [...a, key],
    );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Client Onboarding</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Set up modules and scope so you can track committed vs delivered from day one.
        </p>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {steps.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={cn(
                "h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors",
                i <= step
                  ? "bg-primary text-primary-foreground"
                  : "bg-accent text-muted-foreground",
              )}
            >
              {i + 1}
            </div>
            <span
              className={cn(
                "text-sm font-medium",
                i <= step ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {s}
            </span>
            {i < steps.length - 1 && (
              <div className={cn("w-8 h-0.5 mx-1", i < step ? "bg-primary" : "bg-border")} />
            )}
          </div>
        ))}
      </div>

      <Card>
        <CardContent className="p-6">
          {step === 0 && (
            <div className="space-y-4 animate-fade-in">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label>Client name</Label>
                  <Input
                    placeholder="Acme Corp"
                    value={info.name}
                    onChange={(e) => setInfo({ ...info, name: e.target.value })}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label>Brand name</Label>
                  <Input
                    placeholder="Acme"
                    value={info.brand}
                    onChange={(e) => setInfo({ ...info, brand: e.target.value })}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label>Industry</Label>
                  <Input
                    placeholder="SaaS, Retail, FinTech…"
                    value={info.industry}
                    onChange={(e) => setInfo({ ...info, industry: e.target.value })}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label>Website</Label>
                  <Input
                    placeholder="https://"
                    value={info.website}
                    onChange={(e) => setInfo({ ...info, website: e.target.value })}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label>Primary contact</Label>
                  <Input
                    placeholder="John Doe"
                    value={info.contact}
                    onChange={(e) => setInfo({ ...info, contact: e.target.value })}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label>Contact email</Label>
                  <Input
                    type="email"
                    placeholder="john@acme.com"
                    value={info.email}
                    onChange={(e) => setInfo({ ...info, email: e.target.value })}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label>Contact number</Label>
                  <Input
                    placeholder="+1 234 567 890"
                    value={info.phone}
                    onChange={(e) => setInfo({ ...info, phone: e.target.value })}
                    className="mt-1.5"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>Contract start</Label>
                    <Input
                      type="date"
                      value={info.start}
                      onChange={(e) => setInfo({ ...info, start: e.target.value })}
                      className="mt-1.5"
                    />
                  </div>
                  <div>
                    <Label>Contract end</Label>
                    <Input
                      type="date"
                      value={info.end}
                      onChange={(e) => setInfo({ ...info, end: e.target.value })}
                      className="mt-1.5"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4 animate-fade-in">
              <p className="text-sm font-medium text-foreground">
                Activate the service modules this client is signed up for.
              </p>
              <div className="grid sm:grid-cols-2 gap-2">
                {MODULES.filter((m) => m.key !== "custom").map((m) => {
                  const on = active.includes(m.key);
                  return (
                    <button
                      key={m.key}
                      type="button"
                      onClick={() => toggleModule(m.key)}
                      className={cn(
                        "flex items-start gap-3 rounded-xl border-2 p-3 text-left transition-all",
                        on
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/30",
                      )}
                    >
                      <span
                        className="h-2.5 w-2.5 rounded-full mt-1.5 shrink-0"
                        style={{ background: `hsl(var(--mod-${m.tone}))` }}
                      />
                      <div>
                        <p className="text-sm font-semibold text-foreground">{m.label}</p>
                        <p className="text-xs text-muted-foreground">{m.description}</p>
                      </div>
                      <Checkbox checked={on} className="ml-auto mt-0.5" />
                    </button>
                  );
                })}
              </div>
              <div className="rounded-xl border border-dashed border-border p-3 flex items-center gap-2">
                <Input
                  placeholder="Add a custom module (e.g. Podcast Production)"
                  value={customModuleName}
                  onChange={(e) => setCustomModuleName(e.target.value)}
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (!customModuleName.trim()) return;
                    if (!active.includes("custom")) setActive([...active, "custom"]);
                    toast.success(`Custom module "${customModuleName}" added`);
                    setCustomModuleName("");
                  }}
                >
                  Add
                </Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3 animate-fade-in">
              <p className="text-sm font-medium text-foreground">
                Define committed quantities per module. Delivered totals will fill in as work ships.
              </p>
              <ScopeBuilder activeModules={active} scope={scope} onChange={setScope} />
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4 animate-fade-in">
              <div className="rounded-xl border border-border p-4">
                <p className="text-sm font-semibold text-foreground mb-2">{info.name || "Unnamed client"}</p>
                <p className="text-xs text-muted-foreground">
                  {info.industry || "—"} · {info.website || "no site"} · Contact {info.contact || "—"} ({info.email || "—"})
                </p>
              </div>
              <div className="rounded-xl border border-border p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                  Active modules
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {active.map((k) => {
                    const meta = MODULES.find((m) => m.key === k)!;
                    return (
                      <span
                        key={k}
                        className="text-xs px-2 py-0.5 rounded-full"
                        style={{
                          background: `hsl(var(--mod-${meta.tone}) / 0.12)`,
                          color: `hsl(var(--mod-${meta.tone}))`,
                        }}
                      >
                        {meta.label}
                      </span>
                    );
                  })}
                </div>
              </div>
              <div className="rounded-xl border border-border p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                  Scope summary
                </p>
                <p className="text-sm text-foreground">
                  {scope.length} deliverable line items ·{" "}
                  {scope.reduce((a, s) => a + s.committed, 0)} units committed / month.
                </p>
              </div>
            </div>
          )}

          <div className="flex justify-between mt-8">
            <Button
              variant="outline"
              onClick={() => setStep(Math.max(0, step - 1))}
              disabled={step === 0}
            >
              Back
            </Button>
            <Button
              onClick={() => {
                if (step < steps.length - 1) setStep(step + 1);
                else {
                  toast.success("Client created (demo)");
                  navigate("/clients");
                }
              }}
            >
              {step === steps.length - 1 ? "Create client" : "Next"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
