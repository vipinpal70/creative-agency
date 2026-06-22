import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Trash2, ArrowDown, Clock } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface DripEmail {
  id: string;
  delayDays: number;
  subject: string;
  preview: string;
  body: string;
}

interface Props {
  emails: DripEmail[];
  onChange: (next: DripEmail[]) => void;
}

const delayOptions = [
  { v: 0, l: "Send immediately" },
  { v: 1, l: "After 1 day" },
  { v: 2, l: "After 2 days" },
  { v: 3, l: "After 3 days" },
  { v: 5, l: "After 5 days" },
  { v: 7, l: "After 1 week" },
  { v: 14, l: "After 2 weeks" },
];

export function DripBuilder({ emails, onChange }: Props) {
  const update = (id: string, patch: Partial<DripEmail>) =>
    onChange(emails.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  const remove = (id: string) => onChange(emails.filter((e) => e.id !== id));
  const add = () =>
    onChange([
      ...emails,
      {
        id: crypto.randomUUID(),
        delayDays: emails.length === 0 ? 0 : 2,
        subject: "",
        preview: "",
        body: "",
      },
    ]);

  return (
    <div className="space-y-3">
      {emails.map((email, i) => (
        <div key={email.id}>
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-foreground">
                  Email {i + 1}
                </p>
                <div className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  <Select
                    value={String(email.delayDays)}
                    onValueChange={(v) =>
                      update(email.id, { delayDays: Number(v) })
                    }
                  >
                    <SelectTrigger className="h-8 w-[180px] text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {delayOptions.map((o) => (
                        <SelectItem key={o.v} value={String(o.v)}>
                          {o.l}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => remove(email.id)}
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
              </div>
              <div>
                <Label className="text-xs">Subject line</Label>
                <Input
                  className="mt-1.5"
                  value={email.subject}
                  onChange={(e) => update(email.id, { subject: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-xs">Preview text</Label>
                <Input
                  className="mt-1.5"
                  value={email.preview}
                  onChange={(e) => update(email.id, { preview: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-xs">Body</Label>
                <Textarea
                  className="mt-1.5 min-h-[100px]"
                  value={email.body}
                  onChange={(e) => update(email.id, { body: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>
          {i < emails.length - 1 && (
            <div className="flex justify-center py-1.5">
              <ArrowDown className="h-4 w-4 text-muted-foreground" />
            </div>
          )}
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={add} className="w-full">
        <Plus className="h-3.5 w-3.5 mr-1" /> Add email to sequence
      </Button>
    </div>
  );
}
