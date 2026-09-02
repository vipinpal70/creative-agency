"use client";

import { useState, useRef, useLayoutEffect } from "react";
import { ChevronLeft, ChevronRight, Play, ThumbsUp, MessageCircle, Share2, Globe } from "lucide-react";
import { isReelOrVideoType } from "@/lib/status-flow";

export interface AdPreviewFrame {
  frameNo: number;
  copy: string;
  imageUrl: string;
}

export interface AdPreviewCardProps {
  mediaType?: string;
  // Meta multi-value fields; scalar props below are legacy fallbacks.
  primaryTexts?: string[];
  headlines?: string[];
  descriptions?: string[];
  primaryText?: string;
  headline?: string;
  description?: string;
  frames?: AdPreviewFrame[];
  imageUrl?: string;
  videoUrl?: string;
  thumbnailUrl?: string;
  cta?: string;
  landingUrl?: string;
  adCopy?: string;
  className?: string;
}

// Primary text above the media, clamped to ~5 lines with a "See more" toggle
// when it overflows — mirrors the real Meta feed ad.
function PrimaryText({ text }: { text: string }) {
  const ref = useRef<HTMLParagraphElement | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [overflowing, setOverflowing] = useState(false);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Measure against the collapsed clamp height.
    setOverflowing(el.scrollHeight - el.clientHeight > 1);
  }, [text]);

  return (
    <div className="px-3 pt-2.5 pb-1">
      <p
        ref={ref}
        className={`text-xs text-foreground whitespace-pre-wrap leading-relaxed ${expanded ? "" : "line-clamp-5"}`}
      >
        {text}
      </p>
      {(overflowing || expanded) && (
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="mt-0.5 text-[11px] font-semibold text-muted-foreground hover:underline"
        >
          {expanded ? "See less" : "See more"}
        </button>
      )}
    </div>
  );
}

// Strips the protocol/path for the muted "display URL" line real ad units
// show under the CTA button (e.g. "https://aromaliving.in/diwali" -> "aromaliving.in").
function displayUrl(url?: string): string {
  if (!url) return "";
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return url.replace(/^https?:\/\//, "").split("/")[0];
  }
}

function CarouselMedia({ frames }: { frames: AdPreviewFrame[] }) {
  const [i, setI] = useState(0);
  const frame = frames[i];

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      {frame?.imageUrl ? (
        <img src={frame.imageUrl} alt={`Frame ${frame.frameNo}`} className="max-h-full max-w-full w-auto h-auto object-contain" />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-muted">
          <span className="text-3xl">🖼️</span>
        </div>
      )}

      {frames.length > 1 && (
        <>
          <button
            type="button"
            onClick={() => setI((n) => (n - 1 + frames.length) % frames.length)}
            className="absolute left-1.5 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center transition-colors"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setI((n) => (n + 1) % frames.length)}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center transition-colors"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
          <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 flex gap-1">
            {frames.map((f, idx) => (
              <span key={f.frameNo} className={`h-1.5 rounded-full transition-all ${idx === i ? "w-4 bg-white" : "w-1.5 bg-white/50"}`} />
            ))}
          </div>
        </>
      )}

      {frame?.copy && (
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/75 to-transparent px-3 pt-6 pb-2">
          <p className="text-[11px] text-white leading-snug line-clamp-2">{frame.copy}</p>
        </div>
      )}
    </div>
  );
}

function VideoMedia({ videoUrl, thumbnailUrl }: { videoUrl?: string; thumbnailUrl?: string }) {
  if (videoUrl) {
    return <video src={videoUrl} controls poster={thumbnailUrl || undefined} className="w-full h-full object-contain" />;
  }
  if (thumbnailUrl) {
    return (
      <div className="relative w-full h-full flex items-center justify-center">
        <img src={thumbnailUrl} alt="Video thumbnail" className="max-h-full max-w-full w-auto h-auto object-contain" />
        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
          <div className="h-10 w-10 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
            <Play className="h-4 w-4 text-black fill-black ml-0.5" />
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 text-muted-foreground bg-gradient-to-br from-primary/10 to-muted">
      <Play className="h-6 w-6" />
      <p className="text-[11px] font-medium">Video creative pending</p>
    </div>
  );
}

// Presentational ad-mockup: renders the creative (carousel / video / static)
// plus the headline / description / CTA / landing-URL block that neither
// SocialMockup nor the plain caption fields ever surfaced for paid variants.
// Used both for the writer's pre-submit "Preview" and inside
// ContentPreviewModal for internal/client reviewers — same component, so
// what the writer previews is exactly what the reviewer sees.
export function AdPreviewCard({
  mediaType = "",
  primaryTexts,
  headlines,
  descriptions,
  primaryText = "",
  headline,
  description,
  frames = [],
  imageUrl,
  videoUrl,
  thumbnailUrl,
  cta,
  landingUrl,
  adCopy,
  className = "",
}: AdPreviewCardProps) {
  const isCarousel = mediaType.toLowerCase() === "carousel";
  const isVideo = isReelOrVideoType(mediaType);

  // Meta shows the first of each; fall back to the legacy scalar value.
  const firstPrimary     = primaryTexts?.find(Boolean) ?? primaryText ?? "";
  const firstHeadline    = headlines?.find(Boolean)    ?? headline     ?? "";
  const firstDescription = descriptions?.find(Boolean) ?? description  ?? "";

  return (
    <div className={`w-full max-w-sm rounded-xl border border-border bg-card shadow-xl overflow-hidden mx-auto ${className}`}>
      {/* Sponsored chrome, to read unmistakably as an ad, not an organic post */}
      <div className="flex items-center gap-2 px-3 py-2.5">
        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex-shrink-0" />
        <div className="min-w-0">
          <p className="text-xs font-semibold text-foreground truncate">Your Brand</p>
          <p className="text-[10px] text-muted-foreground flex items-center gap-1">
            Sponsored · <Globe className="h-2.5 w-2.5" />
          </p>
        </div>
      </div>

      {/* Primary text (1st) with See more/less */}
      {firstPrimary && <PrimaryText text={firstPrimary} />}

      {adCopy && (
        <p className="px-3 pb-1 text-[11px] text-muted-foreground whitespace-pre-wrap leading-relaxed line-clamp-2">{adCopy}</p>
      )}

      <div className="aspect-square bg-muted relative overflow-hidden flex items-center justify-center">
        {isCarousel && frames.length > 0 ? (
          <CarouselMedia frames={frames} />
        ) : isVideo ? (
          <VideoMedia videoUrl={videoUrl} thumbnailUrl={thumbnailUrl} />
        ) : imageUrl ? (
          <img src={imageUrl} alt="Creative" className="max-h-full max-w-full w-auto h-auto object-contain" />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 text-muted-foreground bg-gradient-to-br from-primary/10 to-muted">
            <span className="text-3xl">🖼️</span>
            <p className="text-[11px] font-medium">Creative pending — design phase</p>
          </div>
        )}
      </div>

      {/* Below the image: display URL + 1st headline (left), CTA button (right) */}
      <div className="flex items-center justify-between gap-3 px-3 py-2.5 bg-muted/40">
        <div className="min-w-0">
          {displayUrl(landingUrl) && (
            <p className="text-[10px] uppercase tracking-wide font-medium text-muted-foreground truncate mb-0.5">{displayUrl(landingUrl)}</p>
          )}
          <p className="text-xs font-semibold text-foreground truncate">{firstHeadline || "—"}</p>
          {firstDescription && <p className="text-[11px] text-muted-foreground truncate mt-0.5">{firstDescription}</p>}
        </div>
        {/* Dummy CTA button (Meta-style grey pill) */}
        <span className="shrink-0 text-[11px] font-semibold px-3 py-1.5 rounded-md bg-accent text-foreground border border-border whitespace-nowrap">
          {cta || "Get Offer"}
        </span>
      </div>

      {/* Engagement actions — non-interactive, for realism */}
      <div className="grid grid-cols-3 border-t border-border text-muted-foreground">
        <div className="flex items-center justify-center gap-1.5 py-2 text-[11px] font-medium">
          <ThumbsUp className="h-3.5 w-3.5" /> Like
        </div>
        <div className="flex items-center justify-center gap-1.5 py-2 text-[11px] font-medium border-x border-border">
          <MessageCircle className="h-3.5 w-3.5" /> Comment
        </div>
        <div className="flex items-center justify-center gap-1.5 py-2 text-[11px] font-medium">
          <Share2 className="h-3.5 w-3.5" /> Share
        </div>
      </div>
    </div>
  );
}
