import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, ArrowLeft, ArrowRight } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

type Step = "campaign" | "variants" | "schedule" | "review";
const ORDER: Step[] = ["campaign", "variants", "schedule", "review"];

interface AdVariant {
  id: string;
  primaryText: string;
  headline: string;
  description: string;
  cta: string;
  landingUrl: string;
}

interface Props {
  taskTitle: string;
  client: string;
  onCancel: () => void;
  onComplete: () => void;
}

const CTAS = ["Sign Up", "Learn More", "Shop Now", "Get Quote", "Download", "Book Demo"];

export function PaidMediaWizard({ taskTitle, client, onCancel, onComplete }: Props) {
  const [step, setStep] = useState<Step>("campaign");
  const [campaignName, setCampaignName] = useState(taskTitle);
  const [platform, setPlatform] = useState("Meta Ads");
  const [funnel, setFunnel] = useState("TOF");
  const [variants, setVariants] = useState<AdVariant[]>([
    {
      id: crypto.randomUUID(),
      primaryText: "",
      headline: "",
      description: "",
      cta: "Learn More",
      landingUrl: "",
    },
  ]);
  const [launchDate, setLaunchDate] = useState("");
  const [launchTime, setLaunchTime] = useState("09:00");

  const updateVariant = (id: string, patch: Partial<AdVariant>) =>
    setVariants(variants.map((v) => (v.id === id ? { ...v, ...patch } : v)));

  const next = () => {
    const i = ORDER.indexOf(step);
    if (i === ORDER.length - 1) {
      toast.success("Ads submitted for internal review");
      onComplete();
    } else setStep(ORDER[i + 1]);
  };
  const back = () => {
    const i = ORDER.indexOf(step);
    if (i === 0) onCancel();
    else setStep(ORDER[i - 1]);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-5 space-y-4">
          {step === "campaign" && (
            <>
              <div>
                <Label>Campaign name</Label>
                <Input
                  className="mt-1.5"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Platform</Label>
                  <Select value={platform} onValueChange={setPlatform}>
                    <SelectTrigger className="mt-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["Meta Ads", "Google Ads", "LinkedIn Ads"].map((p) => (
                        <SelectItem key={p} value={p}>
                          {p}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Funnel stage</Label>
                  <Select value={funnel} onValueChange={setFunnel}>
                    <SelectTrigger className="mt-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["TOF", "MOF", "BOF"].map((f) => (
                        <SelectItem key={f} value={f}>
                          {f}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </>
          )}

          {step === "variants" && (
            <>
              <div className="flex justify-between items-center">
                <p className="text-sm font-medium text-foreground">
                  Ad variants ({variants.length})
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setVariants([
                      ...variants,
                      {
                        id: crypto.randomUUID(),
                        primaryText: "",
                        headline: "",
                        description: "",
                        cta: "Learn More",
                        landingUrl: "",
                      },
                    ])
                  }
                >
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add variant
                </Button>
              </div>
              {variants.map((v, i) => (
                <Card key={v.id} className="bg-muted/30">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex justify-between items-center">
                      <p className="text-xs font-semibold text-foreground">
                        Variant {i + 1}
                      </p>
                      {variants.length > 1 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            setVariants(variants.filter((x) => x.id !== v.id))
                          }
                        >
                          <Trash2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      )}
                    </div>
                    <div>
                      <Label className="text-xs">Primary text</Label>
                      <Textarea
                        className="mt-1.5"
                        value={v.primaryText}
                        onChange={(e) =>
                          updateVariant(v.id, { primaryText: e.target.value })
                        }
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">Headline</Label>
                        <Input
                          className="mt-1.5"
                          value={v.headline}
                          onChange={(e) =>
                            updateVariant(v.id, { headline: e.target.value })
                          }
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Description</Label>
                        <Input
                          className="mt-1.5"
                          value={v.description}
                          onChange={(e) =>
                            updateVariant(v.id, { description: e.target.value })
                          }
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">CTA</Label>
                        <Select
                          value={v.cta}
                          onValueChange={(val) => updateVariant(v.id, { cta: val })}
                        >
                          <SelectTrigger className="mt-1.5">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {CTAS.map((c) => (
                              <SelectItem key={c} value={c}>
                                {c}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs">Landing URL</Label>
                        <Input
                          className="mt-1.5"
                          placeholder="https://"
                          value={v.landingUrl}
                          onChange={(e) =>
                            updateVariant(v.id, { landingUrl: e.target.value })
                          }
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </>
          )}

          {step === "schedule" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Launch date</Label>
                <Input
                  type="date"
                  className="mt-1.5"
                  value={launchDate}
                  onChange={(e) => setLaunchDate(e.target.value)}
                />
              </div>
              <div>
                <Label>Launch time</Label>
                <Input
                  type="time"
                  className="mt-1.5"
                  value={launchTime}
                  onChange={(e) => setLaunchTime(e.target.value)}
                />
              </div>
            </div>
          )}

          {step === "review" && (
            <div className="space-y-2 text-sm">
              <Row label="Client" value={client} />
              <Row label="Campaign" value={campaignName} />
              <Row label="Platform" value={`${platform} · ${funnel}`} />
              <Row label="Variants" value={String(variants.length)} />
              <Row label="Launch" value={`${launchDate || "—"} ${launchTime}`} />
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={back}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          {step === "campaign" ? "Cancel" : "Back"}
        </Button>
        <Button onClick={next}>
          {step === "review" ? "Submit for internal review" : "Next"}
          <ArrowRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-border pb-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-foreground font-medium text-right">{value}</span>
    </div>
  );
}
