import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Eye, EyeOff, Copy, Plus, Trash2, ShieldAlert, KeyRound } from "lucide-react";
import { toast } from "sonner";
import {
  CREDENTIAL_CATEGORIES,
  type CredentialCategory,
  type CredentialEntry,
} from "@/lib/types";

interface Props {
  credentials: CredentialEntry[];
  onChange: (next: CredentialEntry[]) => void;
}

export function CredentialVault({ credentials, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<CredentialCategory>("social");
  const [label, setLabel] = useState("");
  const [values, setValues] = useState<Record<string, string>>({});
  const fields =
    CREDENTIAL_CATEGORIES.find((c) => c.key === category)?.fields ?? [];

  const reset = () => {
    setCategory("social");
    setLabel("");
    setValues({});
  };

  const handleAdd = () => {
    if (!label.trim()) {
      toast.error("Add a label for this credential");
      return;
    }
    onChange([
      ...credentials,
      {
        id: crypto.randomUUID(),
        category,
        label: label.trim(),
        values,
      },
    ]);
    toast.success("Credential saved (demo storage)");
    setOpen(false);
    reset();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-xl border border-warning/30 bg-warning/5 p-4">
        <ShieldAlert className="h-5 w-5 text-warning shrink-0 mt-0.5" />
        <div className="flex-1 text-sm">
          <p className="font-semibold text-foreground">Demo storage only</p>
          <p className="text-muted-foreground mt-0.5">
            Enable Lovable Cloud to encrypt credentials at rest, enforce role-based access,
            and capture audit logs of every view.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground">Access Control</p>
          <p className="text-xs text-muted-foreground">
            {credentials.length} credential{credentials.length === 1 ? "" : "s"} stored
          </p>
        </div>
        <Dialog
          open={open}
          onOpenChange={(o) => {
            setOpen(o);
            if (!o) reset();
          }}
        >
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-3.5 w-3.5 mr-1" /> Add credential
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Add credential</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Category</Label>
                <Select
                  value={category}
                  onValueChange={(v) => {
                    setCategory(v as CredentialCategory);
                    setValues({});
                  }}
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CREDENTIAL_CATEGORIES.map((c) => (
                      <SelectItem key={c.key} value={c.key}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Label</Label>
                <Input
                  className="mt-1.5"
                  placeholder="e.g. Instagram, Mailchimp, GoDaddy"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                />
              </div>
              {fields.map((f) => (
                <div key={f.key}>
                  <Label>{f.label}</Label>
                  {f.type === "textarea" ? (
                    <Textarea
                      className="mt-1.5"
                      value={values[f.key] ?? ""}
                      onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
                    />
                  ) : (
                    <Input
                      className="mt-1.5"
                      type={f.type === "password" ? "password" : "text"}
                      value={values[f.key] ?? ""}
                      onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
                    />
                  )}
                </div>
              ))}
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAdd}>Save credential</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Accordion type="multiple" defaultValue={CREDENTIAL_CATEGORIES.map((c) => c.key)}>
        {CREDENTIAL_CATEGORIES.map((cat) => {
          const inCat = credentials.filter((c) => c.category === cat.key);
          return (
            <AccordionItem key={cat.key} value={cat.key}>
              <AccordionTrigger className="text-sm">
                <span className="flex items-center gap-2">
                  <KeyRound className="h-3.5 w-3.5 text-muted-foreground" />
                  {cat.label}
                  <span className="text-xs text-muted-foreground">({inCat.length})</span>
                </span>
              </AccordionTrigger>
              <AccordionContent>
                {inCat.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-2 pl-6">
                    No credentials stored yet.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {inCat.map((entry) => (
                      <CredentialRow
                        key={entry.id}
                        entry={entry}
                        onRemove={() =>
                          onChange(credentials.filter((c) => c.id !== entry.id))
                        }
                      />
                    ))}
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
}

function CredentialRow({
  entry,
  onRemove,
}: {
  entry: CredentialEntry;
  onRemove: () => void;
}) {
  const [show, setShow] = useState(false);
  const fields =
    CREDENTIAL_CATEGORIES.find((c) => c.key === entry.category)?.fields ?? [];

  return (
    <div className="rounded-lg border border-border bg-background/40 p-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-semibold text-foreground">{entry.label}</p>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => setShow((s) => !s)}>
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={onRemove}>
            <Trash2 className="h-4 w-4 text-muted-foreground" />
          </Button>
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-2">
        {fields
          .filter((f) => entry.values[f.key])
          .map((f) => {
            const isSecret = f.type === "password";
            const val = entry.values[f.key];
            const display = isSecret && !show ? "•".repeat(Math.min(12, val.length)) : val;
            return (
              <div key={f.key} className="text-xs">
                <p className="text-muted-foreground uppercase tracking-wide text-[10px]">
                  {f.label}
                </p>
                <div className="flex items-center justify-between gap-2 mt-0.5">
                  <span className="font-mono text-foreground truncate">{display}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0"
                    onClick={() => {
                      navigator.clipboard.writeText(val);
                      toast.success(`${f.label} copied`);
                    }}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}
