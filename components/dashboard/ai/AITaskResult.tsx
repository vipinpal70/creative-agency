"use client";

import { Globe, ExternalLink, Check } from "lucide-react";

import type {
  AITaskType,
  AIOutputMode,
  AIResearchResult,
  BusinessAnalysisData,
  CompetitorResearchData,
  CompetitorAnalysisData,
  FinancialAnalysisData,
  SocialResearchData,
  MarketResearchData,
  Source,
} from "@/lib/ai/type";

/*
 * Single place the frontend branches on taskType/outputMode.
 *
 * The router decides the task BEFORE generation, so every response arrives
 * already shaped for exactly one task. This component maps each taskType to
 * the narrow view that matches its schema — instead of forcing every
 * response through the full "AI Client Research" panel.
 */
export interface AITaskResultProps {
  taskType?: AITaskType;
  outputMode?: AIOutputMode;
  text?: string;
  data?: unknown;
}

// ── Shared presentational helpers ─────────────────────────────────────────────

export function Chips({ items }: { items?: string[] }) {
  if (!items || items.length === 0)
    return <span className="text-gray-400 italic">—</span>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((v, i) => (
        <span
          key={i}
          className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100"
        >
          {v}
        </span>
      ))}
    </div>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
        {label}
      </p>
      <div className="text-xs text-gray-700">{children}</div>
    </div>
  );
}

export function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="text-xs font-semibold text-gray-900 uppercase tracking-wider">
      {children}
    </h4>
  );
}

export function SourceList({ sources }: { sources?: Source[] }) {
  if (!sources || sources.length === 0) return null;
  return (
    <section className="space-y-2">
      <SectionHeading>Sources</SectionHeading>
      <div className="space-y-1">
        {sources.map((s, i) => (
          <a
            key={i}
            href={s.url}
            target="_blank"
            rel="noreferrer"
            className="text-[11px] text-emerald-600 hover:underline flex items-center gap-1 truncate"
          >
            <ExternalLink className="w-3 h-3 shrink-0" /> {s.title || s.url}
          </a>
        ))}
      </div>
    </section>
  );
}

function WebsiteLink({ website }: { website?: string }) {
  if (!website) return null;
  return (
    <a
      href={website}
      target="_blank"
      rel="noreferrer"
      className="text-[10px] text-emerald-600 hover:underline inline-flex items-center gap-1 shrink-0"
    >
      <Globe className="w-3 h-3" /> Website
    </a>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <p className="text-xs text-gray-400 italic py-4 text-center">
      No {label} returned.
    </p>
  );
}

// ── Plain chat message (general_chat, copywriting, any text task) ─────────────

export function ChatMessage({ text }: { text?: string }) {
  if (!text?.trim()) return <EmptyState label="response" />;
  return (
    <div className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
      {text}
    </div>
  );
}

// ── client_research: the full onboarding panel (unchanged behavior) ───────────

export function ClientResearchPanel({ result }: { result: AIResearchResult }) {
  const ba = result?.businessAnalysis;

  return (
    <div className="space-y-5">
      {/* Business analysis */}
      <section className="space-y-3">
        <SectionHeading>Business Analysis</SectionHeading>
        <div className="bg-gray-50/60 border border-gray-100 rounded-xl p-4 space-y-3">
          <Field label="Summary">
            {ba?.businessSummary || <span className="text-gray-400 italic">—</span>}
          </Field>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Industry">
              {ba?.industry || <span className="text-gray-400 italic">—</span>}
            </Field>
            <Field label="Positioning">
              {ba?.positioning || <span className="text-gray-400 italic">—</span>}
            </Field>
          </div>
          <Field label="Services">
            <Chips items={ba?.services} />
          </Field>
          <Field label="Target Audience">
            <Chips items={ba?.targetAudience} />
          </Field>
          <Field label="Value Propositions">
            <Chips items={ba?.valuePropositions} />
          </Field>
          <Field label="Brand Tone">
            <Chips items={ba?.brandTone} />
          </Field>
          <Field label="Content Themes">
            <Chips items={ba?.contentThemes} />
          </Field>
        </div>
      </section>

      {/* Competitors */}
      {result.competitors?.length > 0 && (
        <section className="space-y-3">
          <SectionHeading>Competitors ({result.competitors.length})</SectionHeading>
          <div className="space-y-3">
            {result.competitors.map((c, i) => (
              <div
                key={i}
                className="border border-gray-100 rounded-xl p-4 space-y-2.5 bg-white shadow-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-gray-900">
                    {c.name || "Unnamed competitor"}
                  </p>
                  <WebsiteLink website={c.website} />
                </div>
                {c.positioning && (
                  <p className="text-xs text-gray-600">{c.positioning}</p>
                )}
                {c.services?.length > 0 && (
                  <Field label="Services">
                    <Chips items={c.services} />
                  </Field>
                )}
                <div className="grid sm:grid-cols-2 gap-3">
                  {c.strengths?.length > 0 && (
                    <Field label="Strengths">
                      <Chips items={c.strengths} />
                    </Field>
                  )}
                  {c.weaknesses?.length > 0 && (
                    <Field label="Weaknesses">
                      <Chips items={c.weaknesses} />
                    </Field>
                  )}
                </div>
                {c.differentiation && (
                  <Field label="Differentiation">
                    <span className="text-gray-600">{c.differentiation}</span>
                  </Field>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Differentiation opportunities */}
      {result.differentiationOpportunities?.length > 0 && (
        <section className="space-y-2">
          <SectionHeading>Differentiation Opportunities</SectionHeading>
          <ul className="list-disc list-inside space-y-1 text-xs text-gray-700">
            {result.differentiationOpportunities.map((d, i) => (
              <li key={i}>{d}</li>
            ))}
          </ul>
        </section>
      )}

      {/* Verified facts */}
      {result.verifiedFacts?.length > 0 && (
        <section className="space-y-2">
          <SectionHeading>Verified Facts</SectionHeading>
          <ul className="space-y-1.5 text-xs text-gray-700">
            {result.verifiedFacts.map((f, i) => (
              <li key={i} className="flex items-start gap-2">
                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  {f.fact}
                  {f.url && (
                    <a
                      href={f.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-emerald-600 hover:underline ml-1 inline-flex items-center gap-0.5"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <SourceList sources={result.sources} />
    </div>
  );
}

// ── business_analysis: client's own business only ─────────────────────────────

function BusinessAnalysisView({ data }: { data: BusinessAnalysisData }) {
  return (
    <section className="space-y-3">
      <SectionHeading>Business Analysis</SectionHeading>
      <div className="bg-gray-50/60 border border-gray-100 rounded-xl p-4 space-y-3">
        <Field label="Summary">
          {data.businessSummary || <span className="text-gray-400 italic">—</span>}
        </Field>
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Industry">
            {data.industry || <span className="text-gray-400 italic">—</span>}
          </Field>
          <Field label="Positioning">
            {data.positioning || <span className="text-gray-400 italic">—</span>}
          </Field>
        </div>
        {data.services && (
          <Field label="Services">
            <Chips items={data.services} />
          </Field>
        )}
        {data.targetAudience && (
          <Field label="Target Audience">
            <Chips items={data.targetAudience} />
          </Field>
        )}
        <Field label="Value Propositions">
          <Chips items={data.valuePropositions} />
        </Field>
        <Field label="Brand Tone">
          <Chips items={data.brandTone} />
        </Field>
        <Field label="Content Themes">
          <Chips items={data.contentThemes} />
        </Field>
      </div>
    </section>
  );
}

// ── competitor_research: just a competitors list ──────────────────────────────

function CompetitorResearchView({ data }: { data: CompetitorResearchData }) {
  const competitors = data.competitors ?? [];
  if (competitors.length === 0) return <EmptyState label="competitors" />;

  return (
    <section className="space-y-3">
      <SectionHeading>Competitors ({competitors.length})</SectionHeading>
      <div className="space-y-3">
        {competitors.map((c, i) => (
          <div
            key={i}
            className="border border-gray-100 rounded-xl p-4 space-y-2.5 bg-white shadow-sm"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold text-gray-900">
                {c.name || "Unnamed competitor"}
              </p>
              <WebsiteLink website={c.website} />
            </div>
            {c.services && c.services.length > 0 && (
              <Field label="Services">
                <Chips items={c.services} />
              </Field>
            )}
            <SourceList sources={c.sources} />
          </div>
        ))}
      </div>
    </section>
  );
}

// ── competitor_analysis: strengths / weaknesses / differentiation ─────────────

function CompetitorAnalysisView({ data }: { data: CompetitorAnalysisData }) {
  const competitors = data.competitors ?? [];
  if (competitors.length === 0) return <EmptyState label="competitors" />;

  return (
    <section className="space-y-3">
      <SectionHeading>Competitor Analysis ({competitors.length})</SectionHeading>
      <div className="space-y-3">
        {competitors.map((c, i) => (
          <div
            key={i}
            className="border border-gray-100 rounded-xl p-4 space-y-2.5 bg-white shadow-sm"
          >
            <p className="text-xs font-semibold text-gray-900">
              {c.name || "Unnamed competitor"}
            </p>
            <div className="grid sm:grid-cols-2 gap-3">
              {c.strengths && c.strengths.length > 0 && (
                <Field label="Strengths">
                  <Chips items={c.strengths} />
                </Field>
              )}
              {c.weaknesses && c.weaknesses.length > 0 && (
                <Field label="Weaknesses">
                  <Chips items={c.weaknesses} />
                </Field>
              )}
            </div>
            {c.differentiation && (
              <Field label="Differentiation">
                <span className="text-gray-600">{c.differentiation}</span>
              </Field>
            )}
            <SourceList sources={c.sources} />
          </div>
        ))}
      </div>
    </section>
  );
}

// ── financial_analysis ────────────────────────────────────────────────────────

function FinancialAnalysisView({ data }: { data: FinancialAnalysisData }) {
  return (
    <section className="space-y-3">
      <SectionHeading>Financial Analysis</SectionHeading>
      <div className="bg-gray-50/60 border border-gray-100 rounded-xl p-4 space-y-3">
        <Field label="Subject">
          {data.subject || <span className="text-gray-400 italic">—</span>}
        </Field>
        <Field label="Pricing Model">
          {data.pricingModel || <span className="text-gray-400 italic">—</span>}
        </Field>
        {data.notableFindings?.length > 0 && (
          <Field label="Notable Findings">
            <ul className="list-disc list-inside space-y-1">
              {data.notableFindings.map((f, i) => (
                <li key={i}>{f}</li>
              ))}
            </ul>
          </Field>
        )}
      </div>
      <SourceList sources={data.sources} />
    </section>
  );
}

// ── social_research ───────────────────────────────────────────────────────────

function SocialResearchView({ data }: { data: SocialResearchData }) {
  const platforms = data.platforms ?? [];
  return (
    <section className="space-y-3">
      <SectionHeading>Social Presence{data.subject ? ` — ${data.subject}` : ""}</SectionHeading>
      {platforms.length === 0 ? (
        <EmptyState label="platforms" />
      ) : (
        <div className="space-y-2">
          {platforms.map((p, i) => (
            <div
              key={i}
              className="border border-gray-100 rounded-xl p-3 bg-white shadow-sm space-y-1"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-gray-900">{p.platform}</p>
                <WebsiteLink website={p.url} />
              </div>
              {p.notes && <p className="text-xs text-gray-600">{p.notes}</p>}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

// ── market_research ───────────────────────────────────────────────────────────

function MarketResearchView({ data }: { data: MarketResearchData }) {
  return (
    <section className="space-y-3">
      <SectionHeading>Market Research</SectionHeading>
      <div className="bg-gray-50/60 border border-gray-100 rounded-xl p-4 space-y-3">
        <Field label="Market Overview">
          {data.marketOverview || <span className="text-gray-400 italic">—</span>}
        </Field>
        {data.trends?.length > 0 && (
          <Field label="Trends">
            <ul className="list-disc list-inside space-y-1">
              {data.trends.map((t, i) => (
                <li key={i}>{t}</li>
              ))}
            </ul>
          </Field>
        )}
        {data.opportunities?.length > 0 && (
          <Field label="Opportunities">
            <ul className="list-disc list-inside space-y-1">
              {data.opportunities.map((o, i) => (
                <li key={i}>{o}</li>
              ))}
            </ul>
          </Field>
        )}
      </div>
      <SourceList sources={data.sources} />
    </section>
  );
}

// ── Fallback for anything not explicitly handled ──────────────────────────────

function JsonFallback({ data }: { data: unknown }) {
  return (
    <pre className="text-[11px] text-gray-700 bg-gray-50 border border-gray-100 rounded-xl p-3 overflow-x-auto whitespace-pre-wrap">
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}

// ── The switch ────────────────────────────────────────────────────────────────

export default function AITaskResult({
  taskType,
  outputMode,
  text,
  data,
}: AITaskResultProps) {
  // A JSON task can degrade to a plain text answer server-side (e.g. the model
  // couldn't produce clean JSON and fell back to prose). Whenever there's no
  // structured data, render the text instead of feeding `undefined` into a
  // view that expects a schema — otherwise `data.subject` etc. would throw.
  if (outputMode === "text" || data === null || data === undefined) {
    return <ChatMessage text={text} />;
  }

  switch (taskType) {
    case "client_research":
      return <ClientResearchPanel result={data as AIResearchResult} />;

    case "business_analysis":
      return <BusinessAnalysisView data={data as BusinessAnalysisData} />;

    case "competitor_research":
      return <CompetitorResearchView data={data as CompetitorResearchData} />;

    case "competitor_analysis":
      return <CompetitorAnalysisView data={data as CompetitorAnalysisData} />;

    case "financial_analysis":
      return <FinancialAnalysisView data={data as FinancialAnalysisData} />;

    case "social_research":
      return <SocialResearchView data={data as SocialResearchData} />;

    case "market_research":
      return <MarketResearchView data={data as MarketResearchData} />;

    case "general_chat":
    case "copywriting":
      return <ChatMessage text={text} />;

    default:
      // Unknown/new JSON task (data is guaranteed present by the guard above):
      // show the raw structure so a freshly-added task still renders something
      // instead of a blank panel.
      return <JsonFallback data={data} />;
  }
}
