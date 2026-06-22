import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/StatusBadge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FileText,
  Clock,
  Building2,
  ChevronRight,
  CalendarPlus,
  ArrowLeft,
  Mail,
  Megaphone,
  Search,
} from "lucide-react";

const Instagram = (props: React.ComponentProps<"svg">) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
  </svg>
);

import { useToast } from "@/hooks/use-toast";
import { ObjectiveStep } from "@/components/writer/ObjectiveStep";
import { BucketsStep } from "@/components/writer/BucketsStep";
import { CopyEntryForm } from "@/components/writer/CopyEntryForm";
import { CopyList } from "@/components/writer/CopyList";
import { EmailCampaignWizard } from "@/components/writer/EmailCampaignWizard";
import { PaidMediaWizard } from "@/components/writer/PaidMediaWizard";
import { SeoWizard } from "@/components/writer/SeoWizard";
import type { CalendarData, CopyEntry } from "@/components/writer/types";
import { MEDIA_TYPES } from "@/components/writer/types";
import type { ModuleKey } from "@/lib/types";
import { MODULES } from "@/lib/types";

type WriterTask = {
  id: number;
  title: string;
  client: string;
  dueDate: string;
  status: string;
  module: ModuleKey;
  brief: string;
  platforms: string[];
};

const tasks: WriterTask[] = [
  {
    id: 1,
    title: "April Social Media Calendar",
    client: "TechFlow",
    dueDate: "Apr 15",
    status: "Open Task",
    module: "social",
    brief:
      "Build the April social media calendar. Focus on product launch & thought leadership. 12-15 posts.",
    platforms: ["Instagram", "LinkedIn", "Twitter / X"],
  },
  {
    id: 2,
    title: "June Newsletter",
    client: "Acme Corp",
    dueDate: "Jun 14",
    status: "Open Task",
    module: "email",
    brief:
      "Monthly newsletter to active customers. Highlight 3 new features and tease the June launch.",
    platforms: ["Email"],
  },
  {
    id: 3,
    title: "Retargeting ad — Free trial",
    client: "Acme Corp",
    dueDate: "Jun 13",
    status: "In Progress",
    module: "paid",
    brief:
      "BOF retargeting creatives for Meta Ads. 3 variants of copy needed. Drive trial signups.",
    platforms: ["Meta Ads"],
  },
  {
    id: 4,
    title: "Blog: Automate client onboarding",
    client: "Acme Corp",
    dueDate: "Jun 16",
    status: "In Progress",
    module: "seo",
    brief:
      "1500+ word blog targeting 'automate client onboarding'. Informational intent, B2B SaaS readers.",
    platforms: ["Blog"],
  },
  {
    id: 5,
    title: "Earth Month Calendar",
    client: "GreenLeaf",
    dueDate: "Apr 12",
    status: "In Progress",
    module: "social",
    brief: "Sustainability focused. Heavy on Reels + Stories.",
    platforms: ["Instagram", "TikTok"],
  },
];

type ModuleFilter = "all" | ModuleKey;
const MODULE_ICONS: Partial<Record<ModuleKey, React.ComponentType<any>>> = {
  social: Instagram,
  email: Mail,
  paid: Megaphone,
  seo: Search,
};

export default function WriterDashboard() {
  const { toast } = useToast();
  const [filter, setFilter] = useState<ModuleFilter>("all");
  const [active, setActive] = useState<WriterTask | null>(null);
  const [activeTab, setActiveTab] = useState("tasks");

  // social flow state
  type FlowStep = "objective" | "buckets" | "copies";
  const [flowStep, setFlowStep] = useState<FlowStep>("objective");
  const [calendars, setCalendars] = useState<Record<number, CalendarData>>({});

  const getCal = (): CalendarData =>
    active ? calendars[active.id] ?? { objective: "", buckets: [], copies: [] } : {
      objective: "",
      buckets: [],
      copies: [],
    };
  const updateCal = (patch: Partial<CalendarData>) =>
    active &&
    setCalendars((prev) => ({
      ...prev,
      [active.id]: { ...getCal(), ...patch },
    }));

  const filtered = filter === "all" ? tasks : tasks.filter((t) => t.module === filter);

  const openTask = (t: WriterTask) => {
    setActive(t);
    setActiveTab("work");
    setFlowStep("objective");
  };
  const exitWork = () => {
    setActiveTab("tasks");
    setActive(null);
  };

  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Writer's Workspace</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Multi-channel production hub — social, email, paid, SEO.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="tasks">Allocated tasks</TabsTrigger>
          <TabsTrigger value="work" disabled={!active}>
            {active ? `Working: ${active.title}` : "Workspace"}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tasks" className="space-y-3 mt-4">
          <div className="flex items-center gap-2 flex-wrap">
            {(["all", "social", "email", "paid", "seo"] as ModuleFilter[]).map(
              (k) => {
                const m = k === "all" ? null : MODULES.find((x) => x.key === k)!;
                const on = filter === k;
                return (
                  <button
                    key={k}
                    onClick={() => setFilter(k)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                      on
                        ? "border-transparent text-foreground"
                        : "border-border text-muted-foreground hover:text-foreground"
                    }`}
                    style={
                      on && m
                        ? {
                            background: `hsl(var(--mod-${m.tone}) / 0.12)`,
                            color: `hsl(var(--mod-${m.tone}))`,
                          }
                        : on
                          ? { background: "hsl(var(--accent))" }
                          : undefined
                    }
                  >
                    {m?.label ?? "All"}
                  </button>
                );
              },
            )}
          </div>

          {filtered.map((task) => {
            const m = MODULES.find((x) => x.key === task.module)!;
            const Icon = MODULE_ICONS[task.module] ?? FileText;
            return (
              <Card
                key={task.id}
                className="cursor-pointer hover:shadow-md hover:border-primary/20 transition-all"
                onClick={() => openTask(task)}
              >
                <CardContent className="p-4 flex items-center gap-3">
                  <div
                    className="h-10 w-10 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: `hsl(var(--mod-${m.tone}) / 0.12)` }}
                  >
                    <Icon
                      className="h-5 w-5"
                      style={{ color: `hsl(var(--mod-${m.tone}))` }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {task.title}
                      </p>
                      <StatusBadge status={task.status} />
                      <span
                        className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                        style={{
                          background: `hsl(var(--mod-${m.tone}) / 0.12)`,
                          color: `hsl(var(--mod-${m.tone}))`,
                        }}
                      >
                        {m.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                      <span className="flex items-center gap-1">
                        <Building2 className="h-3 w-3" />
                        {task.client}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Due {task.dueDate}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="work" className="mt-4 space-y-4">
          {active && (
            <>
              <div className="flex items-center gap-2 text-xs">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2"
                  onClick={exitWork}
                >
                  <ArrowLeft className="h-3 w-3 mr-1" /> Back to tasks
                </Button>
                <span className="text-muted-foreground">|</span>
                <span className="font-medium text-foreground">{active.client}</span>
                <span className="text-muted-foreground">·</span>
                <span className="text-foreground">{active.title}</span>
              </div>

              <Card className="bg-muted/30">
                <CardContent className="p-4 space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Client brief
                  </p>
                  <p className="text-sm text-foreground">{active.brief}</p>
                </CardContent>
              </Card>

              {active.module === "social" && (
                <SocialFlow
                  task={active}
                  step={flowStep}
                  setStep={setFlowStep}
                  cal={getCal()}
                  updateCal={updateCal}
                  onSubmit={(msg) => {
                    toast({ title: msg });
                  }}
                />
              )}
              {active.module === "email" && (
                <EmailCampaignWizard
                  taskTitle={active.title}
                  client={active.client}
                  onCancel={exitWork}
                  onComplete={exitWork}
                />
              )}
              {active.module === "paid" && (
                <PaidMediaWizard
                  taskTitle={active.title}
                  client={active.client}
                  onCancel={exitWork}
                  onComplete={exitWork}
                />
              )}
              {active.module === "seo" && (
                <SeoWizard
                  taskTitle={active.title}
                  client={active.client}
                  onCancel={exitWork}
                  onComplete={exitWork}
                />
              )}
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SocialFlow({
  task,
  step,
  setStep,
  cal,
  updateCal,
  onSubmit,
}: {
  task: WriterTask;
  step: "objective" | "buckets" | "copies";
  setStep: (s: "objective" | "buckets" | "copies") => void;
  cal: CalendarData;
  updateCal: (patch: Partial<CalendarData>) => void;
  onSubmit: (msg: string) => void;
}) {
  const addCopy = (copy: CopyEntry) => {
    updateCal({ copies: [...cal.copies, copy] });
    onSubmit("Copy added");
  };
  const removeCopy = (id: string) =>
    updateCal({ copies: cal.copies.filter((c) => c.id !== id) });
  const submitOne = (id: string) => {
    updateCal({
      copies: cal.copies.map((c) =>
        c.id === id ? { ...c, status: "Internal Review" as const } : c,
      ),
    });
    onSubmit("Copy sent for internal review");
  };
  const submitAll = () => {
    updateCal({
      copies: cal.copies.map((c) =>
        c.status === "Draft" ? { ...c, status: "Internal Review" as const } : c,
      ),
    });
    onSubmit("All drafts submitted for review");
  };

  return (
    <>
      <div className="flex items-center gap-2 text-xs">
        <span className={step === "objective" ? "text-primary font-semibold" : "text-muted-foreground"}>
          1. Objective
        </span>
        <span className="text-muted-foreground">→</span>
        <span className={step === "buckets" ? "text-primary font-semibold" : "text-muted-foreground"}>
          2. Buckets
        </span>
        <span className="text-muted-foreground">→</span>
        <span className={step === "copies" ? "text-primary font-semibold" : "text-muted-foreground"}>
          3. Copies
        </span>
      </div>

      {step === "objective" && (
        <ObjectiveStep
          objective={cal.objective}
          onChange={(v) => updateCal({ objective: v })}
          onNext={() => {
            if (!cal.buckets.length)
              updateCal({
                buckets: [{ id: crypto.randomUUID(), name: "", description: "" }],
              });
            setStep("buckets");
          }}
        />
      )}

      {step === "buckets" && (
        <BucketsStep
          buckets={cal.buckets}
          onChange={(b) => updateCal({ buckets: b })}
          onBack={() => setStep("objective")}
          onNext={() => setStep("copies")}
        />
      )}

      {step === "copies" && (
        <div className="space-y-4">
          <Card>
            <CardContent className="p-4 flex items-center justify-between gap-3">
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Objective</p>
                <p className="text-sm text-foreground">{cal.objective}</p>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {cal.buckets.map((b) => (
                    <span
                      key={b.id}
                      className="text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-full font-medium"
                    >
                      {b.name || "Untitled bucket"}
                    </span>
                  ))}
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => setStep("buckets")}>
                Edit
              </Button>
            </CardContent>
          </Card>

          <CopyEntryForm
            buckets={cal.buckets}
            platforms={task.platforms}
            mediaTypes={MEDIA_TYPES}
            onAddCopy={addCopy}
          />

          <CopyList
            copies={cal.copies}
            buckets={cal.buckets}
            onRemove={removeCopy}
            onSubmitSingle={submitOne}
            onSubmitAll={submitAll}
          />
        </div>
      )}
    </>
  );
}
