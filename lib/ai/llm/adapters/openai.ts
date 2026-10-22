import { findTextModel } from "../catalog";
import {
  CredentialValidator,
  ImageProviderAdapter,
  LLMError,
  TextGenerationResult,
  TextProviderAdapter,
} from "../types";

/*
 * OpenAI over plain fetch (Responses API for text, Images API for images) —
 * no extra SDK dependency. Error messages are built from HTTP status and the
 * vendor's error *code* only, never the raw body, because OpenAI echoes a
 * partially-masked key in some auth errors.
 */

const BASE_URL = () => (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
const TEXT_TIMEOUT_MS = 180_000;
const IMAGE_TIMEOUT_MS = 240_000;
// Reasoning models spend output tokens thinking before they answer.
const REASONING_TOKEN_PADDING = 4000;

async function openaiFetch(apiKey: string, path: string, init: RequestInit & { timeoutMs?: number }) {
  let res: Response;
  try {
    res = await fetch(`${BASE_URL()}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        ...(init.headers ?? {}),
      },
      signal: AbortSignal.timeout(init.timeoutMs ?? TEXT_TIMEOUT_MS),
    });
  } catch {
    throw new LLMError("provider_unavailable", "Could not reach OpenAI. Please try again shortly.", "openai");
  }

  if (!res.ok) {
    let code: string | undefined;
    try {
      code = (await res.json())?.error?.code ?? undefined;
    } catch {
      /* non-JSON error body */
    }
    throw toOpenAIError(res.status, code);
  }
  return res.json();
}

export function toOpenAIError(status: number, code?: string): LLMError {
  if (code === "content_policy_violation" || code === "moderation_blocked") {
    return new LLMError("provider_error", "OpenAI's safety system rejected this prompt. Please rephrase it.", "openai");
  }
  if (code === "model_not_found") {
    return new LLMError("model_unavailable", "The selected OpenAI model is not available for this API key.", "openai");
  }
  if (code === "insufficient_quota") {
    return new LLMError("invalid_credentials", "This OpenAI API key has no remaining quota.", "openai");
  }
  switch (status) {
    case 401:
      return new LLMError("invalid_credentials", "OpenAI rejected the API key. Check that it is correct and active.", "openai");
    case 403:
    case 404:
      return new LLMError("model_unavailable", "The selected OpenAI model is not available for this API key.", "openai");
    case 429:
      return new LLMError("rate_limited", "OpenAI rate limit reached. Please wait a moment and retry.", "openai");
    case 500:
    case 502:
    case 503:
    case 504:
      return new LLMError("provider_unavailable", "OpenAI is temporarily unavailable. Please try again shortly.", "openai");
    default:
      return new LLMError("provider_error", `OpenAI request failed (HTTP ${status}).`, "openai");
  }
}

interface ResponsesOutputItem {
  type: string;
  role?: string;
  content?: Array<{ type: string; text?: string }>;
}

function extractOutputText(output: ResponsesOutputItem[] = []): string {
  return output
    .filter((item) => item.type === "message")
    .flatMap((item) => item.content ?? [])
    .filter((c) => c.type === "output_text" && typeof c.text === "string")
    .map((c) => c.text as string)
    .join("\n");
}

export const openaiTextAdapter: TextProviderAdapter = {
  async generateText(apiKey, configuredModel, req): Promise<TextGenerationResult> {
    const model = req.modelOverride || configuredModel;
    const reasoning = !!findTextModel("openai", model)?.reasoning;

    const body: Record<string, unknown> = {
      model,
      input: req.messages.map((m) => ({ role: m.role, content: m.content })),
      max_output_tokens: reasoning ? req.maxTokens + REASONING_TOKEN_PADDING : req.maxTokens,
      ...(req.system ? { instructions: req.system } : {}),
      ...(reasoning ? { reasoning: { effort: "low" } } : {}),
      ...(req.webSearch ? { tools: [{ type: "web_search" }] } : {}),
      ...(req.structuredOutput
        ? {
            text: {
              format: {
                type: "json_schema",
                name: req.structuredOutput.name,
                description: req.structuredOutput.description,
                schema: req.structuredOutput.schema,
                strict: false,
              },
            },
          }
        : {}),
    };

    const data = await openaiFetch(apiKey, "/responses", { method: "POST", body: JSON.stringify(body) });

    const output: ResponsesOutputItem[] = data.output ?? [];
    const text = extractOutputText(output);

    let structured: unknown;
    if (req.structuredOutput) {
      try {
        structured = JSON.parse(text);
      } catch {
        structured = undefined;
      }
    }

    return {
      text,
      structured,
      assistantMessage: { role: "assistant", content: text },
      inputTokens: data.usage?.input_tokens ?? 0,
      outputTokens: data.usage?.output_tokens ?? 0,
      webSearchCount: output.filter((item) => item.type === "web_search_call").length,
      provider: "openai",
      model,
    };
  },
};

export const openaiImageAdapter: ImageProviderAdapter = {
  async generateImages(apiKey, model, req) {
    const body: Record<string, unknown> = {
      model,
      prompt: req.prompt,
      n: req.n ?? 1,
      // gpt-image models always return base64 (no response_format param).
      ...(req.size && req.size !== "auto" ? { size: req.size } : {}),
    };

    const data = await openaiFetch(apiKey, "/images/generations", {
      method: "POST",
      body: JSON.stringify(body),
      timeoutMs: IMAGE_TIMEOUT_MS,
    });

    const images = ((data.data ?? []) as Array<{ b64_json?: string; revised_prompt?: string }>)
      .filter((img) => !!img.b64_json)
      .map((img) => ({
        dataUrl: `data:image/png;base64,${img.b64_json}`,
        revisedPrompt: img.revised_prompt,
      }));

    if (!images.length) {
      throw new LLMError("provider_error", "OpenAI returned no images for this prompt.", "openai");
    }

    return { images, provider: "openai", model };
  },
};

export const openaiValidator: CredentialValidator = {
  async validate(apiKey, model) {
    // Authenticated and model-specific, but costs no tokens.
    await openaiFetch(apiKey, `/models/${encodeURIComponent(model)}`, { method: "GET" });
  },
};
