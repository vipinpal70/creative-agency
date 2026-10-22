import Anthropic from "@anthropic-ai/sdk";
import {
  CredentialValidator,
  LLMError,
  TextGenerationRequest,
  TextGenerationResult,
  TextProviderAdapter,
} from "../types";

/*
 * Bounds the web-search server tool's own loop: when it hits the server's
 * iteration limit the turn ends with "pause_turn" and must be re-sent to
 * resume. Same guard the original client-research flow used.
 */
const MAX_PAUSE_RESUMES = 3;

function client(apiKey: string) {
  return new Anthropic({ apiKey });
}

export function toAnthropicError(err: unknown): LLMError {
  if (err instanceof LLMError) return err;
  if (err instanceof Anthropic.APIConnectionError) {
    return new LLMError("provider_unavailable", "Could not reach Anthropic. Please try again shortly.", "anthropic");
  }
  if (err instanceof Anthropic.APIError) {
    const vendorMessage = (err.error as { error?: { message?: string } } | undefined)?.error?.message ?? "";
    if (/credit balance/i.test(vendorMessage)) {
      return new LLMError(
        "invalid_credentials",
        "The Anthropic account for this API key has insufficient credits. Add credits in the Anthropic console or use a different key.",
        "anthropic"
      );
    }
    // Auth errors are never logged in detail; others are, to aid debugging.
    if (err.status !== 401 && err.status !== 403) {
      console.error(`[anthropic] HTTP ${err.status}: ${vendorMessage}`);
    }
    switch (err.status) {
      case 401:
      case 403:
        return new LLMError("invalid_credentials", "Anthropic rejected the API key. Check that it is correct and active.", "anthropic");
      case 404:
        return new LLMError("model_unavailable", "The selected Claude model is not available for this API key.", "anthropic");
      case 429:
        return new LLMError("rate_limited", "Anthropic rate limit reached. Please wait a moment and retry.", "anthropic");
      case 500:
      case 502:
      case 503:
      case 529:
        return new LLMError("provider_unavailable", "Anthropic is temporarily unavailable. Please try again shortly.", "anthropic");
      default:
        return new LLMError("provider_error", `Anthropic request failed (HTTP ${err.status ?? "unknown"}).`, "anthropic");
    }
  }
  return new LLMError("provider_error", "Anthropic request failed.", "anthropic");
}

function toAnthropicMessages(req: TextGenerationRequest): Anthropic.MessageParam[] {
  return req.messages.map((m) =>
    m.role === "assistant" && m.native?.provider === "anthropic"
      ? { role: "assistant", content: m.native.value as Anthropic.ContentBlockParam[] }
      : { role: m.role, content: m.content }
  );
}

function extractText(content: Anthropic.ContentBlock[]): string {
  return content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("\n");
}

export const anthropicTextAdapter: TextProviderAdapter = {
  async generateText(apiKey, configuredModel, req): Promise<TextGenerationResult> {
    const anthropic = client(apiKey);
    const model = req.modelOverride || configuredModel;
    const messages = toAnthropicMessages(req);

    const tools: Anthropic.Messages.ToolUnion[] = [];
    if (req.webSearch) {
      tools.push({ type: "web_search_20250305", name: "web_search", max_uses: req.webSearch.maxUses });
    }
    if (req.structuredOutput) {
      tools.push({
        name: req.structuredOutput.name,
        description: req.structuredOutput.description,
        input_schema: req.structuredOutput.schema as Anthropic.Tool.InputSchema,
      });
    }

    const params = {
      model,
      max_tokens: req.maxTokens,
      ...(req.system ? { system: req.system } : {}),
      ...(tools.length ? { tools } : {}),
      ...(req.structuredOutput
        ? { tool_choice: { type: "tool" as const, name: req.structuredOutput.name } }
        : {}),
    };

    let inputTokens = 0;
    let outputTokens = 0;
    let webSearchCount = 0;
    const assistantBlocks: Anthropic.ContentBlock[] = [];

    try {
      let response = await anthropic.messages.create({ ...params, messages });
      let resumes = 0;

      for (;;) {
        inputTokens += response.usage?.input_tokens ?? 0;
        outputTokens += response.usage?.output_tokens ?? 0;
        webSearchCount += response.usage?.server_tool_use?.web_search_requests ?? 0;
        assistantBlocks.push(...response.content);

        if (response.stop_reason !== "pause_turn" || resumes >= MAX_PAUSE_RESUMES) break;

        messages.push({ role: "assistant", content: response.content });
        response = await anthropic.messages.create({ ...params, messages });
        resumes += 1;
      }
    } catch (err) {
      throw toAnthropicError(err);
    }

    const toolUse = req.structuredOutput
      ? assistantBlocks.find(
          (b): b is Anthropic.ToolUseBlock => b.type === "tool_use" && b.name === req.structuredOutput!.name
        )
      : undefined;

    // A forced tool call leaves an unanswered tool_use block, which can't be
    // replayed as-is — so structured turns carry text only.
    const text = extractText(assistantBlocks);
    return {
      text,
      structured: toolUse?.input,
      assistantMessage: toolUse
        ? { role: "assistant", content: text || JSON.stringify(toolUse.input) }
        : { role: "assistant", content: text, native: { provider: "anthropic", value: assistantBlocks } },
      inputTokens,
      outputTokens,
      webSearchCount,
      provider: "anthropic",
      model,
    };
  },
};

export const anthropicValidator: CredentialValidator = {
  async validate(apiKey, model) {
    try {
      // Authenticated and model-specific, but costs no tokens.
      await client(apiKey).models.retrieve(model);
    } catch (err) {
      throw toAnthropicError(err);
    }
  },
};
