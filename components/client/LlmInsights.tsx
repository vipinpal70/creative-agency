"use client";

import { useEffect, useState } from "react";
import { Sparkles, ExternalLink, Lightbulb, CheckCircle2 } from "lucide-react";

// Mirrors the saved client-research shape (AIResearchResult in lib/ai/type.ts).
// Everything is optional/defensive — the context is stored as free-form JSON.
interface Source {
  title?: string;
  url?: string;
}
interface BusinessAnalysis {
  businessSummary?: string;
  industry?: string;
  positioning?: string;
  services?: string[];
  targetAudience?: string[];
  valuePropositions?: string[];
  brandTone?: string[];
  contentThemes?: string[];
}
interface Competitor {
  name?: string;
  website?: string;
  location?: string;
  industry?: string;
  services?: string[];
  targetAudience?: string[];
  positioning?: string;
  valuePropositions?: string[];
  contentThemes?: string[];
  socialPlatforms?: string[];
  strengths?: string[];
  weaknesses?: string[];
  differentiation?: string;
  sources?: Source[];
}
interface VerifiedFact {
  fact?: string;
  source?: string;
  url?: string;
}
interface ResearchContext {
  businessAnalysis?: BusinessAnalysis;
  competitors?: Competitor[];
  differentiationOpportunities?: string[];
  verifiedFacts?: VerifiedFact[];
  sources?: Source[];
}

const CARD = "bg-white border border-gray-100 rounded-xl p-5 shadow-sm space-y-4";
const HEADING = "text-xs font-semibold text-gray-900 uppercase tracking-wider flex items-center gap-1.5";
const SUBLABEL = "text-[10px] font-semibold text-gray-400 uppercase tracking-wider";

function Chips({ items, tone = "emerald" }: { items?: string[]; tone?: "emerald" | "gray" | "indigo" }) {
  if (!items?.length) return null;
  const cls =
    tone === "gray"
      ? "bg-gray-50 text-gray-600 border-gray-100"
      : tone === "indigo"
      ? "bg-indigo-50 text-indigo-700 border-indigo-100"
      : "bg-emerald-50 text-emerald-700 border-emerald-100";
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.filter(Boolean).map((it, i) => (
        <span key={i} className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${cls}`}>
          {it}
        </span>
      ))}
    </div>
  );
}

// A labelled block that renders either a paragraph or a chip row, hidden when empty.
function Field({ label, value, chips, tone }: { label: string; value?: string; chips?: string[]; tone?: "emerald" | "gray" | "indigo" }) {
  if (!value && !chips?.length) return null;
  return (
    <div className="space-y-1">
      <p className={SUBLABEL}>{label}</p>
      {value && <p className="text-xs text-gray-700 leading-relaxed">{value}</p>}
      <Chips items={chips} tone={tone} />
    </div>
  );
}

export function LlmInsights({ clientId }: { clientId: string }) {
  const [context, setContext] = useState<ResearchContext | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/clients/${clientId}/ai/research-context`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load insights");
        if (!active) return;
        setContext(data.context ?? null);
        setGeneratedAt(data.generatedAt ?? null);
      } catch (err: any) {
        if (active) setError(err.message || "Failed to load insights");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [clientId]);

  const ba = context?.businessAnalysis;
  const competitors = context?.competitors ?? [];
  const opportunities = context?.differentiationOpportunities ?? [];
  const facts = context?.verifiedFacts ?? [];
  const sources = context?.sources ?? [];

  // Only show tabs that actually have data — keeps the bar tight when research
  // returned partial results.
  const tabs = [
    { id: "business", label: "Business", available: !!ba },
    { id: "competitors", label: `Competitors${competitors.length ? ` (${competitors.length})` : ""}`, available: competitors.length > 0 },
    { id: "opportunities", label: "Opportunities", available: opportunities.length > 0 },
    { id: "facts", label: "Verified Facts", available: facts.length > 0 },
    { id: "sources", label: "Sources", available: sources.length > 0 },
  ].filter((t) => t.available);

  const hasAny = tabs.length > 0;

  const [activeTab, setActiveTab] = useState<string>("business");

  // Default to the first available tab once the context loads (or if the
  // current tab turns out to have no data).
  useEffect(() => {
    if (tabs.length && !tabs.some((t) => t.id === activeTab)) {
      setActiveTab(tabs[0].id);
    }
  }, [tabs, activeTab]);

  return (
    <div className={CARD}>
      <div className="flex items-center justify-between">
        <h3 className={HEADING}>
          <Sparkles className="w-3.5 h-3.5 text-emerald-600" /> LLM Insights
        </h3>
        {generatedAt && (
          <span className="text-[10px] text-gray-400">
            Researched {new Date(generatedAt).toLocaleDateString()}
          </span>
        )}
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-xs text-gray-400 py-6 justify-center">
          <span className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          Loading insights…
        </div>
      ) : error ? (
        <p className="text-xs text-red-500 py-4">{error}</p>
      ) : !hasAny ? (
        <div className="text-center py-8 border border-dashed border-gray-200 rounded-lg">
          <Sparkles className="w-7 h-7 text-gray-300 mx-auto" />
          <p className="text-xs text-gray-500 mt-2 font-medium">No client research on file yet.</p>
          <p className="text-[10px] text-gray-400">Run AI research for this client to populate insights.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Tab bar */}
          <div className="flex items-center gap-1 overflow-x-auto border-b border-gray-200 -mx-1 px-1">
            {tabs.map((t) => {
              const active = activeTab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={`px-2.5 py-1.5 border-b-2 text-[11px] font-semibold shrink-0 transition-all ${
                    active
                      ? "border-emerald-600 text-emerald-700"
                      : "border-transparent text-gray-500 hover:text-gray-900 hover:border-gray-200"
                  }`}
                >
                  {t.label}
                </button>
              );
            })}
          </div>

          {/* Tab content — capped height so no single tab dominates the page */}
          <div className="max-h-[22rem] overflow-y-auto pr-1">
            {/* Business analysis */}
            {activeTab === "business" && ba && (
              <div className="space-y-3">
                <Field label="Summary" value={ba.businessSummary} />
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Industry" value={ba.industry} />
                  <Field label="Positioning" value={ba.positioning} />
                </div>
                <Field label="Services" chips={ba.services} />
                <Field label="Target Audience" chips={ba.targetAudience} tone="indigo" />
                <Field label="Value Propositions" chips={ba.valuePropositions} />
                <Field label="Brand Tone" chips={ba.brandTone} tone="gray" />
                <Field label="Content Themes" chips={ba.contentThemes} tone="gray" />
              </div>
            )}

            {/* Competitors */}
            {activeTab === "competitors" && (
              <div className="space-y-3">
                {competitors.map((c, i) => (
                  <div key={i} className="rounded-lg border border-gray-100 bg-gray-50/40 p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-gray-900">{c.name || "Unnamed competitor"}</p>
                      {c.website && (
                        <a
                          href={c.website}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[10px] text-emerald-600 hover:underline inline-flex items-center gap-0.5 shrink-0"
                        >
                          Site <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                    <Field label="Positioning" value={c.positioning} />
                    <Field label="Differentiation" value={c.differentiation} />
                    <Field label="Services" chips={c.services} />
                    <Field label="Strengths" chips={c.strengths} />
                    <Field label="Weaknesses" chips={c.weaknesses} tone="gray" />
                    <Field label="Social Platforms" chips={c.socialPlatforms} tone="indigo" />
                  </div>
                ))}
              </div>
            )}

            {/* Differentiation opportunities */}
            {activeTab === "opportunities" && (
              <ul className="space-y-1.5">
                {opportunities.filter(Boolean).map((o, i) => (
                  <li key={i} className="text-xs text-gray-700 leading-relaxed flex gap-2">
                    <Lightbulb className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
                    <span>{o}</span>
                  </li>
                ))}
              </ul>
            )}

            {/* Verified facts */}
            {activeTab === "facts" && (
              <ul className="space-y-2">
                {facts.map((f, i) => (
                  <li key={i} className="text-xs text-gray-700 leading-relaxed flex gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                    <span>
                      {f.fact}
                      {f.url && (
                        <a
                          href={f.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-emerald-600 hover:underline inline-flex items-center gap-0.5 ml-1"
                        >
                          source <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            {/* Sources */}
            {activeTab === "sources" && (
              <ul className="space-y-1">
                {sources.filter((s) => s.url).map((s, i) => (
                  <li key={i}>
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] text-emerald-600 hover:underline inline-flex items-center gap-1 truncate max-w-full"
                    >
                      <ExternalLink className="w-3 h-3 shrink-0" />
                      <span className="truncate">{s.title || s.url}</span>
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
