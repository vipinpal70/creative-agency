"use client";

import { useState } from "react";

type ContentCategory = "reel" | "static_image" | "carousel";

type ContextKey =
  | "businessAnalysis"
  | "competitors"
  | "sources"
  | "differentiationOpportunities"
  | "verifiedFacts";

const CATEGORY_OPTIONS: { value: ContentCategory; label: string }[] = [
  { value: "reel", label: "Reel" },
  { value: "static_image", label: "Static / Image" },
  { value: "carousel", label: "Carousel" },
];

const CONTEXT_OPTIONS: { value: ContextKey; label: string }[] = [
  { value: "businessAnalysis", label: "Business analysis" },
  { value: "competitors", label: "Competitor analysis" },
  { value: "sources", label: "Sources" },
  { value: "differentiationOpportunities", label: "Differentiation opportunities" },
  { value: "verifiedFacts", label: "Verified facts" },
];

interface WriteWithAIProps {
  clientId: string;
  // Required: ContentDraft.deliverableId is a required, uniquely-indexed
  // field (together with version) — a draft can't be created without it.
  deliverableId: string;
  onCopyCreated?: (contentDraftId: string) => void;
}

export default function WriteWithAI({
  clientId,
  deliverableId,
  onCopyCreated,
}: WriteWithAIProps) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<ContentCategory>("reel");
  const [selectedContext, setSelectedContext] = useState<ContextKey[]>([
    "businessAnalysis",
  ]);
  const [customPrompt, setCustomPrompt] = useState("");

  const [copy, setCopy] = useState("");
  const [caption, setCaption] = useState("");
  const [hashtags, setHashtags] = useState<string[]>([]);

  const [generating, setGenerating] = useState(false);
  const [pushing, setPushing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleContext(key: ContextKey) {
    setSelectedContext((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  }

  async function handleGenerate() {
    if (!customPrompt.trim()) {
      setError("Describe what you want the AI to create first.");
      return;
    }

    setError(null);
    setGenerating(true);

    try {
      const res = await fetch(`/api/clients/${clientId}/ai/copywriting`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, selectedContext, customPrompt }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Generation failed");
      }

      setCopy(data.copy || "");
      setCaption(data.caption || "");
      setHashtags(Array.isArray(data.hashtags) ? data.hashtags : []);
    } catch (err: any) {
      setError(err.message || "Something went wrong generating content.");
    } finally {
      setGenerating(false);
    }
  }

  async function handlePush() {
    setError(null);
    setPushing(true);

    try {
      const res = await fetch(`/api/clients/${clientId}/copies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deliverableId,
          category,
          copy,
          caption,
          hashtags,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create copy record");
      }

      onCopyCreated?.(data.id);
      setOpen(false);
    } catch (err: any) {
      setError(err.message || "Something went wrong saving the copy.");
    } finally {
      setPushing(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
      >
        Write with AI
      </button>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 p-5 space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Write with AI</h3>
        <button onClick={() => setOpen(false)} className="text-sm text-gray-500 hover:text-gray-700">
          Close
        </button>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-2">Content type</label>
        <div className="flex gap-2">
          {CATEGORY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setCategory(opt.value)}
              className={`rounded-md border px-3 py-1.5 text-sm ${
                category === opt.value
                  ? "border-black bg-black text-white"
                  : "border-gray-300 text-gray-700 hover:border-gray-400"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-2">
          Context to include
        </label>
        <div className="flex flex-wrap gap-3">
          {CONTEXT_OPTIONS.map((opt) => (
            <label key={opt.value} className="flex items-center gap-1.5 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={selectedContext.includes(opt.value)}
                onChange={() => toggleContext(opt.value)}
              />
              {opt.label}
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-2">Your instructions</label>
        <textarea
          value={customPrompt}
          onChange={(e) => setCustomPrompt(e.target.value)}
          rows={3}
          placeholder='e.g. "Create an engaging Instagram reel about the benefits of digital dentistry for dental practices."'
          className="w-full rounded-md border border-gray-300 p-2 text-sm"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        onClick={handleGenerate}
        disabled={generating}
        className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
      >
        {generating ? "Generating…" : "Generate with AI"}
      </button>

      {(copy || caption || hashtags.length > 0) && (
        <div className="space-y-4 border-t border-gray-200 pt-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Copy</label>
            <textarea
              value={copy}
              onChange={(e) => setCopy(e.target.value)}
              rows={4}
              className="w-full rounded-md border border-gray-300 p-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Caption</label>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={3}
              className="w-full rounded-md border border-gray-300 p-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Hashtags</label>
            <input
              value={hashtags.join(" ")}
              onChange={(e) => setHashtags(e.target.value.split(/\s+/).filter(Boolean))}
              className="w-full rounded-md border border-gray-300 p-2 text-sm"
            />
          </div>

          <button
            onClick={handlePush}
            disabled={pushing}
            className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            {pushing ? "Saving…" : "Create New Copy & Push Data"}
          </button>
        </div>
      )}
    </div>
  );
}