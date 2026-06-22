import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, X, ArrowLeft, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { DripBuilder, type DripEmail } from "./DripBuilder";
import { ContentStatusBadge } from "@/components/ContentStatusBadge";

const DEFAULT_SEGMENTS = [
  "Active customers",
  "Lost customers",
  "Prospects",
  "Leads",
  "Subscribers",
];

type Step = "segments" | "campaign" | "subjects" | "body" | "drip" | "review";
const ORDER: Step[] = ["segments", "campaign", "subjects", "body", "drip", "review"];

interface Props {
  taskTitle: string;
  client: string;
  onCancel: () => void;
  onComplete: () => void;
}

export function EmailCampaignWizard({ taskTitle, client, onCancel, onComplete }: Props) {
  const [step, setStep] = useState<Step>("segments");

  // state
  const [segments, setSegments] = useState<string[]>(["Active customers"]);
  const [customSegment, setCustomSegment] = useState("");

  const [campaignName, setCampaignName] = useState(taskTitle);
  const [objective, setObjective] = useState("");
  const [sendDate, setSendDate] = useState("");
  const [sendTime, setSendTime] = useState("09:00");

  const [subjectLines, setSubjectLines] = useState<string[]>([""]);
  const [previewText, setPreviewText] = useState("");

  const [body, setBody] = useState("");
  const [ctaLabel, setCtaLabel] = useState("");
  const [ctaUrl, setCtaUrl] = useState("");

  const [enableDrip, setEnableDrip] = useState(false);
  const [drip, setDrip] = useState<DripEmail[]>([]);

  const toggleSegment = (s: string) =>
    setSegments((arr) => (arr.includes(s) ? arr.filter((x) => x !== s) : [...arr, s]));

  const next = () => {
    const i = ORDER.indexOf(step);
    if (i === ORDER.length - 1) {
      toast.success("Email campaign submitted for internal review");
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
      <StepNav step={step} />

      <Card>
        <CardContent className="p-5 space-y-4">
          {step === "segments" && (
            <>
              <p className="text-sm font-medium text-foreground">
                Who is receiving this campaign?
              </p>
              <div className="grid sm:grid-cols-2 gap-2">
                {DEFAULT_SEGMENTS.map((s) => (
                  <label
                    key={s}
                    className="flex items-center gap-2 rounded-lg border border-border p-3 cursor-pointer hover:border-primary/30"
                  >
                    <Checkbox
                      checked={segments.includes(s)}
                      onCheckedChange={() => toggleSegment(s)}
                    />
                    <span className="text-sm text-foreground">{s}</span>
                  </label>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Add custom segment…"
                  value={customSegment}
                  onChange={(e) => setCustomSegment(e.target.value)}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (!customSegment.trim()) return;
                    setSegments([...segments, customSegment.trim()]);
                    setCustomSegment("");
                  }}
                >
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add
                </Button>
              </div>
            </>
          )}

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
              <div>
                <Label>Objective</Label>
                <Textarea
                  className="mt-1.5"
                  placeholder="What's the goal of this campaign?"
                  value={objective}
                  onChange={(e) => setObjective(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Send date</Label>
                  <Input
                    type="date"
                    className="mt-1.5"
                    value={sendDate}
                    onChange={(e) => setSendDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Send time</Label>
                  <Input
                    type="time"
                    className="mt-1.5"
                    value={sendTime}
                    onChange={(e) => setSendTime(e.target.value)}
                  />
                </div>
              </div>
            </>
          )}

          {step === "subjects" && (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-foreground">
                  Subject line variations
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSubjectLines([...subjectLines, ""])}
                >
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add variant
                </Button>
              </div>
              {subjectLines.map((s, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    placeholder={`Variant ${i + 1}`}
                    value={s}
                    onChange={(e) => {
                      const next = [...subjectLines];
                      next[i] = e.target.value;
                      setSubjectLines(next);
                    }}
                  />
                  <span className="text-[10px] text-muted-foreground w-12 text-right">
                    {s.length}/60
                  </span>
                  {subjectLines.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        setSubjectLines(subjectLines.filter((_, idx) => idx !== i))
                      }
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <div>
                <Label>Preview text</Label>
                <Input
                  className="mt-1.5"
                  value={previewText}
                  onChange={(e) => setPreviewText(e.target.value)}
                />
              </div>
            </>
          )}

          {step === "body" && (
            <>
              <div>
                <Label>Email body</Label>
                <Textarea
                  className="mt-1.5 min-h-[180px]"
                  placeholder="Hey {{first_name}}, …"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>CTA label</Label>
                  <Input
                    className="mt-1.5"
                    placeholder="See what's new"
                    value={ctaLabel}
                    onChange={(e) => setCtaLabel(e.target.value)}
                  />
                </div>
                <div>
                  <Label>CTA URL</Label>
                  <Input
                    className="mt-1.5"
                    placeholder="https://"
                    value={ctaUrl}
                    onChange={(e) => setCtaUrl(e.target.value)}
                  />
                </div>
              </div>
            </>
          )}

          {step === "drip" && (
            <>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={enableDrip}
                  onCheckedChange={(c) => {
                    setEnableDrip(!!c);
                    if (c && drip.length === 0) {
                      setDrip([
                        {
                          id: crypto.randomUUID(),
                          delayDays: 0,
                          subject: subjectLines[0] ?? "",
                          preview: previewText,
                          body,
                        },
                      ]);
                    }
                  }}
                />
                <span className="text-sm text-foreground">
                  Send this as part of a drip sequence
                </span>
              </label>
              {enableDrip ? (
                <DripBuilder emails={drip} onChange={setDrip} />
              ) : (
                <p className="text-xs text-muted-foreground">
                  Skip to send a single campaign on the scheduled date.
                </p>
              )}
            </>
          )}

          {step === "review" && (
            <div className="space-y-3 text-sm">
              <Row label="Client" value={client} />
              <Row label="Campaign" value={campaignName} />
              <Row label="Segments" value={segments.join(", ")} />
              <Row label="Send" value={`${sendDate || "—"} at ${sendTime}`} />
              <Row label="Subject lines" value={`${subjectLines.length} variant(s)`} />
              <Row
                label="Drip"
                value={enableDrip ? `${drip.length} emails` : "Single send"}
              />
              <div className="rounded-lg border border-border p-3 bg-muted/40">
                <p className="text-xs text-muted-foreground mb-1">Status on submit</p>
                <ContentStatusBadge status="Draft" />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={back}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          {step === "segments" ? "Cancel" : "Back"}
        </Button>
        <Button onClick={next}>
          {step === "review" ? "Submit for internal review" : "Next"}
          <ArrowRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}

function StepNav({ step }: { step: Step }) {
  const labels: Record<Step, string> = {
    segments: "Audience",
    campaign: "Campaign",
    subjects: "Subject lines",
    body: "Body & CTA",
    drip: "Drip sequence",
    review: "Review",
  };
  return (
    <div className="flex items-center gap-2 text-xs flex-wrap">
      {ORDER.map((s, i) => (
        <div key={s} className="flex items-center gap-1.5">
          <span
            className={
              s === step
                ? "text-primary font-semibold"
                : "text-muted-foreground"
            }
          >
            {i + 1}. {labels[s]}
          </span>
          {i < ORDER.length - 1 && <span className="text-muted-foreground">→</span>}
        </div>
      ))}
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
