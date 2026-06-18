import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2 } from "lucide-react";
import {
  MODULES,
  DEFAULT_SCOPE_TEMPLATES,
  type ModuleKey,
  type ScopeItem,
} from "@/lib/types";

interface Props {
  activeModules: ModuleKey[];
  scope: ScopeItem[];
  onChange: (scope: ScopeItem[]) => void;
}

export function ScopeBuilder({ activeModules, scope, onChange }: Props) {
  const ensureSeeded = (module: ModuleKey) => {
    if (scope.some((s) => s.module === module)) return;
    const tpl = DEFAULT_SCOPE_TEMPLATES[module] ?? [];
    const seeded: ScopeItem[] = tpl.map((t, i) => ({
      id: `${module}-${i}-${crypto.randomUUID().slice(0, 6)}`,
      module,
      label: t.label,
      unit: t.unit,
      committed: t.committed,
      delivered: 0,
    }));
    onChange([...scope, ...seeded]);
  };

  // Auto-seed on first render of each module
  activeModules.forEach(ensureSeeded);

  const update = (id: string, patch: Partial<ScopeItem>) => {
    onChange(scope.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  };
  const remove = (id: string) => onChange(scope.filter((s) => s.id !== id));
  const add = (module: ModuleKey) => {
    onChange([
      ...scope,
      {
        id: `${module}-${crypto.randomUUID().slice(0, 6)}`,
        module,
        label: "",
        committed: 1,
        delivered: 0,
      },
    ]);
  };

  return (
    <div className="space-y-6">
      {activeModules.map((m) => {
        const meta = MODULES.find((x) => x.key === m)!;
        const items = scope.filter((s) => s.module === m);
        return (
          <div key={m} className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ background: `hsl(var(--mod-${meta.tone}))` }}
                />
                <p className="text-sm font-semibold text-foreground">{meta.label}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => add(m)}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Add item
              </Button>
            </div>
            {items.length === 0 && (
              <p className="text-xs text-muted-foreground">No scope items yet.</p>
            )}
            <div className="space-y-2">
              {items.map((s) => (
                <div key={s.id} className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-6">
                    <Label className="text-xs">Deliverable</Label>
                    <Input
                      value={s.label}
                      placeholder="e.g. Posts per month"
                      onChange={(e) => update(s.id, { label: e.target.value })}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs">Unit</Label>
                    <Input
                      value={s.unit ?? ""}
                      placeholder="qty"
                      onChange={(e) => update(s.id, { unit: e.target.value })}
                    />
                  </div>
                  <div className="col-span-3">
                    <Label className="text-xs">Committed / mo</Label>
                    <Input
                      type="number"
                      min={0}
                      value={s.committed}
                      onChange={(e) =>
                        update(s.id, { committed: Number(e.target.value) || 0 })
                      }
                    />
                  </div>
                  <div className="col-span-1 flex justify-end">
                    <Button variant="ghost" size="icon" onClick={() => remove(s.id)}>
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
      {activeModules.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Select at least one module to start defining scope.
        </p>
      )}
    </div>
  );
}
