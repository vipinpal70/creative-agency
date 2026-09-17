"use client";

import { useEffect, useState } from "react";
import {
  X, Sparkles, RefreshCw, Save, AlertCircle, Check,
  Globe, ExternalLink, ChevronLeft,
} from "lucide-react";

import { DEFAULT_CLIENT_RESEARCH_PROMPT } from "@/lib/ai/prompts/client-prompt";
import type { AIResearchResult } from "@/lib/ai/type";

type Status = "idle" | "running" | "done" | "error";

interface AIResearchModalProps {
  open: boolean;
  clientId: string;
  onClose: () => void;
}

// ── Small presentational helpers ──────────────────────────────────────────────

function Chips({ items }: { items?: string[] }) {
  if (!items || items.length === 0) return <span className="text-gray-400 italic">—</span>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((v, i) => (
        <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
          {v}
        </span>
      ))}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{label}</p>
      <div className="text-xs text-gray-700">{children}</div>
    </div>
  );
}

// ── Main modal ────────────────────────────────────────────────────────────────

export default function AIResearchModal({ open, clientId, onClose }: AIResearchModalProps) {
  const [prompt, setPrompt] = useState(DEFAULT_CLIENT_RESEARCH_PROMPT.trim());
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<AIResearchResult | null>(null);
  const [researchId, setResearchId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Reset everything each time the modal is (re)opened so a new client/session
  // never shows a previous run's result.
  useEffect(() => {
    if (open) {
      setPrompt(DEFAULT_CLIENT_RESEARCH_PROMPT.trim());
      setStatus("idle");
      setResult(null);
      setResearchId(null);
      setError(null);
      setSaving(false);
      setSaved(false);
      setSaveError(null);
    }
  }, [open]);

  if (!open) return null;

  const runResearch = async () => {
    setStatus("running");
    setError(null);
    setSaved(false);
    setSaveError(null);
    try {
      const res = await fetch("/api/ai/research/client", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, customPrompt: prompt }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "AI research failed");
      }
      setResult(data.result as AIResearchResult);
      setResearchId(data.researchId);
      setStatus("done");
    } catch (err: any) {
      setError(err?.message || "Something went wrong while running research.");
      setStatus("error");
    }
  };

  const saveResult = async () => {
    if (!researchId || !result) return;
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch("/api/ai/research/client/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ researchId, result }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to save research");
      }
      setSaved(true);
    } catch (err: any) {
      setSaveError(err?.message || "Failed to save research.");
    } finally {
      setSaving(false);
    }
  };

  // Return to the prompt editor keeping the edited prompt, so the user can tweak
  // and re-run. This is the only "conversation" affordance — no free chat.
  const backToPrompt = () => {
    setStatus("idle");
    setError(null);
  };

  const ba = result?.businessAnalysis;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white border border-gray-100 shadow-xl rounded-2xl max-w-2xl w-full max-h-[88vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-sm">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900">AI Client Research</h3>
              <p className="text-[10px] text-gray-400">Business & competitor intelligence</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* ── PROMPT / ERROR view ─────────────────────────────────────────── */}
          {(status === "idle" || status === "error") && (
            <div className="space-y-3">
              <p className="text-xs text-gray-500">
                Review the research instructions below. You can tweak them a little before running —
                the AI will research this client's business and competitors, then return a structured report.
              </p>
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Research Prompt</label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={12}
                  className="w-full px-3 py-2 border border-gray-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none text-xs rounded-lg font-mono leading-relaxed text-gray-700 resize-y"
                />
              </div>
              {status === "error" && error && (
                <div className="flex items-start gap-2 text-xs bg-red-50 border border-red-100 text-red-700 rounded-lg p-3">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}
            </div>
          )}

          {/* ── RUNNING view ────────────────────────────────────────────────── */}
          {status === "running" && (
            <div className="flex flex-col items-center justify-center py-16 space-y-3 text-center">
              <div className="w-9 h-9 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm font-semibold text-gray-700">Researching…</p>
              <p className="text-xs text-gray-400 max-w-xs">
                The AI is searching the web and analyzing this client. This can take up to a minute — please keep this window open.
              </p>
            </div>
          )}

          {/* ── RESULT view ─────────────────────────────────────────────────── */}
          {status === "done" && result && (
            <div className="space-y-5">
              {/* Business analysis */}
              <section className="space-y-3">
                <h4 className="text-xs font-semibold text-gray-900 uppercase tracking-wider">Business Analysis</h4>
                <div className="bg-gray-50/60 border border-gray-100 rounded-xl p-4 space-y-3">
                  <Field label="Summary">
                    {ba?.businessSummary || <span className="text-gray-400 italic">—</span>}
                  </Field>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <Field label="Industry">{ba?.industry || <span className="text-gray-400 italic">—</span>}</Field>
                    <Field label="Positioning">{ba?.positioning || <span className="text-gray-400 italic">—</span>}</Field>
                  </div>
                  <Field label="Services"><Chips items={ba?.services} /></Field>
                  <Field label="Target Audience"><Chips items={ba?.targetAudience} /></Field>
                  <Field label="Value Propositions"><Chips items={ba?.valuePropositions} /></Field>
                  <Field label="Brand Tone"><Chips items={ba?.brandTone} /></Field>
                  <Field label="Content Themes"><Chips items={ba?.contentThemes} /></Field>
                </div>
              </section>

              {/* Competitors */}
              {result.competitors?.length > 0 && (
                <section className="space-y-3">
                  <h4 className="text-xs font-semibold text-gray-900 uppercase tracking-wider">
                    Competitors ({result.competitors.length})
                  </h4>
                  <div className="space-y-3">
                    {result.competitors.map((c, i) => (
                      <div key={i} className="border border-gray-100 rounded-xl p-4 space-y-2.5 bg-white shadow-sm">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-semibold text-gray-900">{c.name || "Unnamed competitor"}</p>
                          {c.website && (
                            <a href={c.website} target="_blank" rel="noreferrer" className="text-[10px] text-emerald-600 hover:underline inline-flex items-center gap-1 shrink-0">
                              <Globe className="w-3 h-3" /> Website
                            </a>
                          )}
                        </div>
                        {c.positioning && <p className="text-xs text-gray-600">{c.positioning}</p>}
                        {c.services?.length > 0 && <Field label="Services"><Chips items={c.services} /></Field>}
                        <div className="grid sm:grid-cols-2 gap-3">
                          {c.strengths?.length > 0 && <Field label="Strengths"><Chips items={c.strengths} /></Field>}
                          {c.weaknesses?.length > 0 && <Field label="Weaknesses"><Chips items={c.weaknesses} /></Field>}
                        </div>
                        {c.differentiation && (
                          <Field label="Differentiation"><span className="text-gray-600">{c.differentiation}</span></Field>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Differentiation opportunities */}
              {result.differentiationOpportunities?.length > 0 && (
                <section className="space-y-2">
                  <h4 className="text-xs font-semibold text-gray-900 uppercase tracking-wider">Differentiation Opportunities</h4>
                  <ul className="list-disc list-inside space-y-1 text-xs text-gray-700">
                    {result.differentiationOpportunities.map((d, i) => <li key={i}>{d}</li>)}
                  </ul>
                </section>
              )}

              {/* Verified facts */}
              {result.verifiedFacts?.length > 0 && (
                <section className="space-y-2">
                  <h4 className="text-xs font-semibold text-gray-900 uppercase tracking-wider">Verified Facts</h4>
                  <ul className="space-y-1.5 text-xs text-gray-700">
                    {result.verifiedFacts.map((f, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        <span>
                          {f.fact}
                          {f.url && (
                            <a href={f.url} target="_blank" rel="noreferrer" className="text-emerald-600 hover:underline ml-1 inline-flex items-center gap-0.5">
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {/* Sources */}
              {result.sources?.length > 0 && (
                <section className="space-y-2">
                  <h4 className="text-xs font-semibold text-gray-900 uppercase tracking-wider">Sources</h4>
                  <div className="space-y-1">
                    {result.sources.map((s, i) => (
                      <a key={i} href={s.url} target="_blank" rel="noreferrer" className="text-[11px] text-emerald-600 hover:underline flex items-center gap-1 truncate">
                        <ExternalLink className="w-3 h-3 shrink-0" /> {s.title || s.url}
                      </a>
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
        </div>

        {/* Footer / actions */}
        <div className="border-t border-gray-100 px-5 py-3 shrink-0">
          {saveError && (
            <div className="flex items-start gap-2 text-xs bg-red-50 border border-red-100 text-red-700 rounded-lg p-2 mb-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{saveError}</span>
            </div>
          )}
          <div className="flex items-center justify-between gap-2">
            {(status === "idle" || status === "error") && (
              <>
                <button onClick={onClose} className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50">
                  Cancel
                </button>
                <button
                  onClick={runResearch}
                  disabled={!prompt.trim()}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-semibold rounded-lg shadow-sm"
                >
                  <Sparkles className="w-3.5 h-3.5" /> {status === "error" ? "Retry Research" : "Run Research"}
                </button>
              </>
            )}

            {status === "running" && (
              <p className="text-xs text-gray-400 w-full text-center">Running… this may take a moment.</p>
            )}

            {status === "done" && (
              <>
                <button
                  onClick={backToPrompt}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50"
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> Edit prompt & Retry
                </button>
                {saved ? (
                  <span className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-100 text-xs font-semibold rounded-lg">
                    <Check className="w-3.5 h-3.5" /> Saved to Client Profile
                  </span>
                ) : (
                  <button
                    onClick={saveResult}
                    disabled={saving}
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60 text-xs font-semibold rounded-lg shadow-sm"
                  >
                    {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    {saving ? "Saving…" : "Save to Client Profile"}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
