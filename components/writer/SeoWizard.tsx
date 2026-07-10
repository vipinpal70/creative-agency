import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, ArrowRight, Plus, X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

type Step = "brief" | "outline" | "draft" | "links" | "review";
const ORDER: Step[] = ["brief", "outline", "draft", "links", "review"];

interface Props {
  taskTitle: string;
  client: string;
  onCancel: () => void;
  onComplete: () => void;
}

const TYPES = ["Blog Article", "Landing Page", "Website Content", "Guest Post"];
const INTENTS = ["Informational", "Commercial", "Transactional", "Navigational"];

export function SeoWizard({ taskTitle, client, onCancel, onComplete }: Props) {
  const [step, setStep] = useState<Step>("brief");
  const [type, setType] = useState("Blog Article");
  const [target, setTarget] = useState("");
  const [secondary, setSecondary] = useState<string[]>([]);
  const [secondaryInput, setSecondaryInput] = useState("");
  const [intent, setIntent] = useState("Informational");
  const [title, setTitle] = useState(taskTitle);
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDesc, setMetaDesc] = useState("");
  const [outline, setOutline] = useState("H1: …\nH2: …\nH2: …\nH3: …");
  const [body, setBody] = useState("");
  const [internalLinks, setInternalLinks] = useState<string[]>([]);
  const [externalLinks, setExternalLinks] = useState<string[]>([]);
  const [linkInput, setLinkInput] = useState("");
  const [externalInput, setExternalInput] = useState("");
  const [publishDate, setPublishDate] = useState("");

  const next = () => {
    const i = ORDER.indexOf(step);
    if (i === ORDER.length - 1) {
      toast.success("SEO content submitted for internal review");
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
          {step === "brief" && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Content type</Label>
                  <Select value={type} onValueChange={setType}>
                    <SelectTrigger className="mt-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Search intent</Label>
                  <Select value={intent} onValueChange={setIntent}>
                    <SelectTrigger className="mt-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {INTENTS.map((i) => (
                        <SelectItem key={i} value={i}>
                          {i}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Target keyword</Label>
                <Input
                  className="mt-1.5"
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                />
              </div>
              <div>
                <Label>Secondary keywords</Label>
                <div className="flex items-center gap-2 mt-1.5">
                  <Input
                    placeholder="Add keyword and press Enter"
                    value={secondaryInput}
                    onChange={(e) => setSecondaryInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && secondaryInput.trim()) {
                        e.preventDefault();
                        setSecondary([...secondary, secondaryInput.trim()]);
                        setSecondaryInput("");
                      }
                    }}
                  />
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {secondary.map((s) => (
                    <span
                      key={s}
                      className="text-xs px-2 py-0.5 rounded-full bg-[hsl(var(--mod-seo)/0.12)] text-[hsl(var(--mod-seo))] flex items-center gap-1"
                    >
                      {s}
                      <button
                        onClick={() =>
                          setSecondary(secondary.filter((x) => x !== s))
                        }
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </>
          )}

          {step === "outline" && (
            <>
              <div>
                <Label>Title</Label>
                <Input
                  className="mt-1.5"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <Label>
                    Meta title{" "}
                    <span className="text-xs text-muted-foreground ml-1">
                      ({metaTitle.length}/60)
                    </span>
                  </Label>
                  <Input
                    className="mt-1.5"
                    value={metaTitle}
                    onChange={(e) => setMetaTitle(e.target.value)}
                  />
                </div>
                <div>
                  <Label>
                    Meta description{" "}
                    <span className="text-xs text-muted-foreground ml-1">
                      ({metaDesc.length}/160)
                    </span>
                  </Label>
                  <Textarea
                    className="mt-1.5"
                    value={metaDesc}
                    onChange={(e) => setMetaDesc(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <Label>Outline</Label>
                <Textarea
                  className="mt-1.5 min-h-[140px] font-mono text-xs"
                  value={outline}
                  onChange={(e) => setOutline(e.target.value)}
                />
              </div>
              {/* SERP preview */}
              <div className="rounded-lg border border-border p-3 bg-muted/30">
                <p className="text-[10px] uppercase text-muted-foreground mb-1">
                  SERP preview
                </p>
                <p className="text-xs text-muted-foreground">acme.com › blog</p>
                <p className="text-base text-[hsl(var(--mod-seo))] font-medium leading-snug">
                  {metaTitle || title || "Your title here"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {metaDesc || "Your meta description will appear here…"}
                </p>
              </div>
            </>
          )}

          {step === "draft" && (
            <div>
              <Label>Article body</Label>
              <Textarea
                className="mt-1.5 min-h-[260px]"
                value={body}
                onChange={(e) => setBody(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {body.split(/\s+/).filter(Boolean).length} words
              </p>
            </div>
          )}

          {step === "links" && (
            <>
              <LinkList
                label="Internal links"
                input={linkInput}
                onInput={setLinkInput}
                values={internalLinks}
                onAdd={(v) => setInternalLinks([...internalLinks, v])}
                onRemove={(v) =>
                  setInternalLinks(internalLinks.filter((x) => x !== v))
                }
              />
              <LinkList
                label="External links"
                input={externalInput}
                onInput={setExternalInput}
                values={externalLinks}
                onAdd={(v) => setExternalLinks([...externalLinks, v])}
                onRemove={(v) =>
                  setExternalLinks(externalLinks.filter((x) => x !== v))
                }
              />
              <div>
                <Label>Publish date</Label>
                <Input
                  type="date"
                  className="mt-1.5"
                  min={new Date().toLocaleDateString("en-CA")}
                  value={publishDate}
                  onChange={(e) => setPublishDate(e.target.value)}
                />
              </div>
            </>
          )}

          {step === "review" && (
            <div className="space-y-2 text-sm">
              <Row label="Client" value={client} />
              <Row label="Type" value={type} />
              <Row label="Target keyword" value={target} />
              <Row label="Intent" value={intent} />
              <Row label="Words" value={String(body.split(/\s+/).filter(Boolean).length)} />
              <Row
                label="Internal / External links"
                value={`${internalLinks.length} / ${externalLinks.length}`}
              />
              <Row label="Publish" value={publishDate || "—"} />
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={back}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          {step === "brief" ? "Cancel" : "Back"}
        </Button>
        <Button onClick={next}>
          {step === "review" ? "Submit for internal review" : "Next"}
          <ArrowRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}

function LinkList({
  label,
  values,
  input,
  onInput,
  onAdd,
  onRemove,
}: {
  label: string;
  values: string[];
  input: string;
  onInput: (v: string) => void;
  onAdd: (v: string) => void;
  onRemove: (v: string) => void;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="flex items-center gap-2 mt-1.5">
        <Input
          placeholder="https://…"
          value={input}
          onChange={(e) => onInput(e.target.value)}
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            if (!input.trim()) return;
            onAdd(input.trim());
            onInput("");
          }}
        >
          <Plus className="h-3.5 w-3.5 mr-1" /> Add
        </Button>
      </div>
      <div className="space-y-1 mt-2">
        {values.map((v) => (
          <div
            key={v}
            className="flex items-center justify-between rounded-md bg-muted/40 px-2 py-1 text-xs"
          >
            <span className="text-foreground truncate">{v}</span>
            <button onClick={() => onRemove(v)} className="text-muted-foreground hover:text-destructive">
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
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
