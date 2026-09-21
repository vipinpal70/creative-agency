"use client";

import { useEffect, useState } from "react";
import { X, Sparkles, AlertCircle, ChevronLeft } from "lucide-react";

import { DEFAULT_CLIENT_RESEARCH_PROMPT } from "@/lib/ai/prompts/client-prompt";
import type { AITaskType, AIOutputMode, ChatApiResponse } from "@/lib/ai/type";
import AITaskResult from "@/components/dashboard/ai/AITaskResult";
import { TextShimmerWave } from "../ui/aiLoading";

type Status = "idle" | "running" | "done" | "error";

interface AIResearchModalProps {
  open: boolean;
  clientId: string;
  onClose: () => void;
}

interface TaskResponse {
  taskType?: AITaskType;
  outputMode?: AIOutputMode;
  text?: string;
  data?: unknown;
}

// Human-readable labels for the result header. The router picks the task
// BEFORE generation, so by the time we render we already know exactly which
// kind of answer came back — no need to always say "Client Research".
const TASK_LABELS: Record<AITaskType, string> = {
  general_chat: "Answer",
  business_analysis: "Business Analysis",
  competitor_research: "Competitors",
  competitor_analysis: "Competitor Analysis",
  financial_analysis: "Financial Analysis",
  social_research: "Social Presence",
  market_research: "Market Research",
  copywriting: "Copy",
  client_research: "Client Research",
};

export default function AIResearchModal({ open, clientId, onClose }: AIResearchModalProps) {
  const [prompt, setPrompt] = useState(DEFAULT_CLIENT_RESEARCH_PROMPT.trim());
  const [status, setStatus] = useState<Status>("idle");
  const [response, setResponse] = useState<TaskResponse | null>(null);
  const [conversationId, setConversationId] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  // Reset everything each time the modal is (re)opened so a new client/session
  // never shows a previous run's result.
  useEffect(() => {
    if (open) {
      setPrompt(DEFAULT_CLIENT_RESEARCH_PROMPT.trim());
      setStatus("idle");
      setResponse(null);
      setConversationId(undefined);
      setError(null);
    }
  }, [open]);

  if (!open) return null;

  const runPrompt = async () => {
    setStatus("running");
    setError(null);
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, conversationId, prompt }),
      });
      const data: ChatApiResponse = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "AI request failed");
      }
      // Reuse the conversation on subsequent runs so context is threaded.
      if (data.conversationId) setConversationId(data.conversationId);
      setResponse({
        taskType: data.taskType,
        outputMode: data.outputMode,
        text: data.text,
        data: data.data,
      });
      setStatus("done");
    } catch (err: any) {
      setError(err?.message || "Something went wrong while running the request.");
      setStatus("error");
    }
  };

  // Return to the prompt editor keeping the edited prompt, so the user can tweak
  // and re-run.
  const backToPrompt = () => {
    setStatus("idle");
    setError(null);
  };

  const resultLabel =
    response?.taskType ? TASK_LABELS[response.taskType] : "Result";

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
              <h3 className="text-sm font-semibold text-gray-900">
                {status === "done" ? resultLabel : "AI Assistant"}
              </h3>
              <p className="text-[10px] text-gray-400">
                Ask anything — research, competitors, copy & more
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* ── PROMPT / ERROR view ─────────────────────────────────────────── */}
          {(status === "idle" || status === "error") && (
            <div className="space-y-3">
              <p className="text-xs text-gray-500">
                Describe what you need. The assistant figures out the task on its
                own — a full research audit, just a competitor list, ad copy, or a
                plain answer — and returns only what you asked for.
              </p>
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                  Prompt
                </label>
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
            <div className="flex flex-col items-center justify-center py-16 space-y-4 text-center">
              <div className="space-y-1.5">
                <TextShimmerWave
                  className="text-sm font-semibold text-gray-800"
                  duration={1.2}
                  spread={1.2}
                  zDistance={12}
                  scaleDistance={1.08}
                  rotateYDistance={15}
                >
                  Generating AI insights…
                </TextShimmerWave>
                <p className="text-xs text-gray-400 max-w-xs mx-auto leading-relaxed">
                  The AI may search the web and synthesize client data. This can
                  take a moment — please keep this window open.
                </p>
              </div>
            </div>
          )}

          {/* ── RESULT view: branches on taskType ───────────────────────────── */}
          {status === "done" && response && (
            <AITaskResult
              taskType={response.taskType}
              outputMode={response.outputMode}
              text={response.text}
              data={response.data}
            />
          )}
        </div>

        {/* Footer / actions */}
        <div className="border-t border-gray-100 px-5 py-3 shrink-0">
          <div className="flex items-center justify-between gap-2">
            {(status === "idle" || status === "error") && (
              <>
                <button
                  onClick={onClose}
                  className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={runPrompt}
                  disabled={!prompt.trim()}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-semibold rounded-lg shadow-sm"
                >
                  <Sparkles className="w-3.5 h-3.5" />{" "}
                  {status === "error" ? "Retry" : "Run"}
                </button>
              </>
            )}

            {status === "running" && (
              <p className="text-xs text-gray-400 w-full text-center">
                Running… this may take a moment.
              </p>
            )}

            {status === "done" && (
              <button
                onClick={backToPrompt}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> New prompt
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
