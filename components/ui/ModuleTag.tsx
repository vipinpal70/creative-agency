import { MODULES } from "@/lib/types";

// Small colored pill labelling a deliverable's scope-of-work module
// (e.g. "Social Media" / "Paid Media"). Colors are driven by the
// --mod-<key> CSS tokens in globals.css so light/dark themes stay in sync.
const TONE: Record<string, string> = {
  social: "bg-[hsl(var(--mod-social)/0.12)] text-[hsl(var(--mod-social))]",
  paid: "bg-[hsl(var(--mod-paid)/0.12)] text-[hsl(var(--mod-paid))]",
  seo: "bg-[hsl(var(--mod-seo)/0.12)] text-[hsl(var(--mod-seo))]",
  email: "bg-[hsl(var(--mod-email)/0.12)] text-[hsl(var(--mod-email))]",
  whatsapp: "bg-[hsl(var(--mod-email)/0.12)] text-[hsl(var(--mod-email))]",
  website: "bg-[hsl(var(--mod-website)/0.12)] text-[hsl(var(--mod-website))]",
  orm: "bg-[hsl(var(--mod-orm)/0.12)] text-[hsl(var(--mod-orm))]",
  influencer: "bg-[hsl(var(--mod-influencer)/0.12)] text-[hsl(var(--mod-influencer))]",
  video: "bg-[hsl(var(--mod-video)/0.12)] text-[hsl(var(--mod-video))]",
  design: "bg-[hsl(var(--mod-design)/0.12)] text-[hsl(var(--mod-design))]",
  custom: "bg-[hsl(var(--mod-custom)/0.12)] text-[hsl(var(--mod-custom))]",
};

export function ModuleTag({ module, className = "" }: { module?: string; className?: string }) {
  if (!module) return null;
  const normalizedInput = module.trim().toLowerCase();
  const meta = MODULES.find(
    (m) => m.key.toLowerCase() === normalizedInput || m.label.toLowerCase() === normalizedInput
  );
  const label = meta?.label ?? module;
  const key =
    meta?.key ??
    (normalizedInput.includes("paid")
      ? "paid"
      : normalizedInput.includes("social")
      ? "social"
      : normalizedInput);
  const tone = TONE[key] ?? TONE[module] ?? "bg-muted text-muted-foreground";

  return (
    <span
      className={`inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${tone} ${className}`}
    >
      {label}
    </span>
  );
}
