"use client";

import type { AdPreviewFrame } from "./AdPreviewCard";

export interface GoogleAdPreviewCardProps {
  businessName?: string;
  headlines?: string[];
  longHeadline?: string;
  descriptions?: string[];
  frames?: AdPreviewFrame[];
  imageUrl?: string;
  cta?: string;
  landingUrl?: string;
  className?: string;
}

// Strips protocol/path for a muted display URL line (mirrors AdPreviewCard).
function displayUrl(url?: string): string {
  if (!url) return "";
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return url.replace(/^https?:\/\//, "").split("/")[0];
  }
}

// Presentational mockup of a Google Ads responsive display / app-promo unit,
// framed as a phone the way Google's ad preview shows it: a brand header, the
// creative, then a card with the (long) headline, description and a
// Close / CTA button pair. Google's assets are combinatorial — it mixes any
// headline with any description — so we surface the long headline (falling back
// to the first headline) and the first description as a representative render.
export function GoogleAdPreviewCard({
  businessName,
  headlines,
  longHeadline,
  descriptions,
  frames = [],
  imageUrl,
  cta,
  landingUrl,
  className = "",
}: GoogleAdPreviewCardProps) {
  const creative = imageUrl || frames.find((f) => f.imageUrl)?.imageUrl || "";
  const headline =
    (longHeadline && longHeadline.trim()) ||
    headlines?.find(Boolean) ||
    "Your headline here";
  const description =
    descriptions?.find(Boolean) || "Your description line shows here.";
  const brand = businessName?.trim() || "Business name";

  return (
    <div
      className={`w-full max-w-[350px] rounded-xl border border-gray-200 bg-card shadow-xl overflow-hidden mx-auto ${className}`}
    >
      {/* Brand header row */}
      <div className="flex items-center justify-between gap-2 px-3 py-2.5 bg-card">
        <div className="flex items-center gap-2 min-w-0">
          <div className="h-6 w-6 rounded bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
            {brand.charAt(0).toUpperCase()}
          </div>  
          <p className="text-xs font-semibold text-foreground truncate uppercase tracking-wide">
            {brand}
          </p>
        </div>
        {/* "Ad" chip — Google always badges the unit */}
        <span className="shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-400/90 text-amber-950">
          Ad
        </span>
      </div>

      {/* Creative */}
      <div className="aspect-[4/3] bg-muted relative overflow-hidden flex items-center justify-center">
        {creative ? (
          <img
            src={creative}
            alt="Creative"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 text-muted-foreground bg-gradient-to-br from-primary/10 to-muted">
            <span className="text-3xl">🖼️</span>
            <p className="text-[11px] font-medium">Creative pending — design phase</p>
          </div>
        )}
      </div>

      {/* Text card */}
      <div className="px-4 pt-4 pb-4 space-y-2 text-center bg-card">
        <h3 className="text-base font-bold text-foreground leading-snug">
          {headline}
        </h3>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {description}
        </p>
        {displayUrl(landingUrl) && (
          <p className="text-[10px] text-muted-foreground/80 truncate">
            {displayUrl(landingUrl)}
          </p>
        )}

        {/* Close / CTA button pair — Google's app-promo layout */}
        <div className="flex items-center gap-2 pt-2">
          <span className="flex-1 text-xs font-medium px-3 py-2 rounded-md border border-border text-muted-foreground whitespace-nowrap text-center">
            Close
          </span>
          <span className="flex-1 text-xs font-semibold px-3 py-2 rounded-md bg-neutral-800 text-white whitespace-nowrap text-center dark:bg-neutral-200 dark:text-neutral-900">
            {cta || "Learn more"}
          </span>
        </div>
      </div>
    </div>
  );
}
