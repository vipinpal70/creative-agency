"use client";

import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Plus, X } from "lucide-react";

const LABEL = "text-xs font-semibold text-muted-foreground uppercase tracking-wider";

// Meta lets an ad carry up to 5 primary texts / headlines / descriptions.
export const MAX_VARIANTS = 5;

// Repeatable multi-value field. Renders one input per value with a remove
// button, plus an "Add …" button capped at MAX_VARIANTS. Required lists keep at
// least one row; optional lists may be emptied entirely. Shared by the writer's
// VariantModal and the reviewer's PaidDetailsForm so both edit the same shape.
export function RepeatableList({
  label, addLabel, values, onChange, required, multiline, placeholder,
}: {
  label: string;
  addLabel: string;
  values: string[];
  onChange: (v: string[]) => void;
  required?: boolean;
  multiline?: boolean;
  placeholder?: string;
}) {
  const setAt    = (i: number, val: string) => onChange(values.map((v, idx) => (idx === i ? val : v)));
  const add      = () => { if (values.length < MAX_VARIANTS) onChange([...values, ""]); };
  const removeAt = (i: number) => onChange(values.filter((_, idx) => idx !== i));
  const canRemove = required ? values.length > 1 : values.length >= 1;

  return (
    <div className="space-y-2">
      <label className={LABEL}>
        {label}{" "}
        {required
          ? "*"
          : <span className="normal-case font-normal text-muted-foreground">(optional)</span>}
      </label>
      <div className="space-y-2">
        {values.map((val, i) => (
          <div key={i} className="flex items-start gap-2">
            {multiline ? (
              <Textarea
                className="min-h-[80px] flex-1"
                placeholder={placeholder}
                value={val}
                onChange={(e) => setAt(i, e.target.value)}
              />
            ) : (
              <Input
                className="flex-1"
                placeholder={placeholder}
                value={val}
                onChange={(e) => setAt(i, e.target.value)}
              />
            )}
            {canRemove && (
              <button
                type="button"
                onClick={() => removeAt(i)}
                title={`Remove ${label.toLowerCase()}`}
                className="mt-1 h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
      </div>
      {values.length < MAX_VARIANTS && (
        <button
          type="button"
          onClick={add}
          className="flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
        >
          <Plus className="h-3.5 w-3.5" /> {addLabel}
        </button>
      )}
    </div>
  );
}
