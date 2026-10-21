import { afterEach, describe, expect, it, vi } from "vitest";
import Anthropic from "@anthropic-ai/sdk";
import { openaiImageAdapter, openaiTextAdapter, openaiValidator, toOpenAIError } from "@/lib/ai/llm/adapters/openai";
import { toAnthropicError } from "@/lib/ai/llm/adapters/anthropic";

afterEach(() => vi.unstubAllGlobals());

function mockFetch(status: number, body: unknown) {
  const fetchMock = vi.fn(async () => new Response(JSON.stringify(body), { status }));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("OpenAI adapter", () => {
  it("parses Responses API output and usage", async () => {
    const fetchMock = mockFetch(200, {
      output: [
        { type: "web_search_call" },
        { type: "message", content: [{ type: "output_text", text: '{"task":"general_chat"}' }] },
      ],
      usage: { input_tokens: 12, output_tokens: 5 },
    });

    const result = await openaiTextAdapter.generateText("sk-test", "gpt-4.1", {
      system: "sys",
      messages: [{ role: "user", content: "hi" }],
      maxTokens: 100,
      webSearch: { maxUses: 3 },
      structuredOutput: { name: "x", description: "x", schema: { type: "object" } },
    });

    expect(result).toMatchObject({
      text: '{"task":"general_chat"}',
      structured: { task: "general_chat" },
      inputTokens: 12,
      outputTokens: 5,
      webSearchCount: 1,
      provider: "openai",
      model: "gpt-4.1",
    });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toMatch(/\/responses$/);
    const body = JSON.parse(init.body as string);
    expect(body).toMatchObject({ model: "gpt-4.1", instructions: "sys", max_output_tokens: 100, tools: [{ type: "web_search" }] });
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer sk-test");
  });

  it("pads the token budget for reasoning models", async () => {
    const fetchMock = mockFetch(200, { output: [], usage: {} });
    await openaiTextAdapter.generateText("sk", "gpt-5", { messages: [{ role: "user", content: "hi" }], maxTokens: 100 });
    const body = JSON.parse((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body as string);
    expect(body.max_output_tokens).toBeGreaterThan(100);
    expect(body.reasoning).toEqual({ effort: "low" });
  });

  it("returns base64 output as data URLs", async () => {
    const fetchMock = mockFetch(200, { data: [{ b64_json: "aGVsbG8=", revised_prompt: "rp" }] });
    const result = await openaiImageAdapter.generateImages("sk", "gpt-image-2", { prompt: "cat", size: "1536x1024", n: 2 });
    expect(result.images[0]).toEqual({ dataUrl: "data:image/png;base64,aGVsbG8=", revisedPrompt: "rp" });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toMatch(/\/images\/generations$/);
    expect(JSON.parse(init.body as string)).toEqual({ model: "gpt-image-2", prompt: "cat", n: 2, size: "1536x1024" });
  });

  it("omits size when set to auto", async () => {
    const fetchMock = mockFetch(200, { data: [{ b64_json: "eA==" }] });
    await openaiImageAdapter.generateImages("sk", "gpt-image-1", { prompt: "cat", size: "auto" });
    const body = JSON.parse((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body as string);
    expect(body.size).toBeUndefined();
    expect(body.response_format).toBeUndefined();
  });

  it("errors when the provider returns no images", async () => {
    mockFetch(200, { data: [] });
    await expect(openaiImageAdapter.generateImages("sk", "gpt-image-1", { prompt: "cat" })).rejects.toMatchObject({
      code: "provider_error",
    });
  });

  it("maps auth failures without echoing the provider's error body", async () => {
    mockFetch(401, { error: { message: "Incorrect API key provided: sk-abc***wxyz", code: "invalid_api_key" } });
    const err = await openaiValidator.validate("sk-abc-secret-wxyz", "gpt-4.1").catch((e) => e);
    expect(err.code).toBe("invalid_credentials");
    expect(err.message).not.toContain("sk-");
  });

  it("maps network failures to provider_unavailable", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("fetch failed"); }));
    await expect(openaiValidator.validate("sk", "gpt-4.1")).rejects.toMatchObject({ code: "provider_unavailable", status: 503 });
  });

  it("maps status codes and vendor codes", () => {
    expect(toOpenAIError(404).code).toBe("model_unavailable");
    expect(toOpenAIError(429).code).toBe("rate_limited");
    expect(toOpenAIError(400, "content_policy_violation").message).toMatch(/safety/);
  });
});

describe("Anthropic error mapping", () => {
  const apiError = (status: number) =>
    Anthropic.APIError.generate(status, { error: { message: "key sk-ant-xyz invalid" } }, undefined, new Headers());

  it("maps 401 to invalid_credentials without leaking details", () => {
    const err = toAnthropicError(apiError(401));
    expect(err.code).toBe("invalid_credentials");
    expect(err.message).not.toContain("sk-ant");
  });

  it("explains an exhausted credit balance", () => {
    const err = Anthropic.APIError.generate(
      400,
      { type: "error", error: { type: "invalid_request_error", message: "Your credit balance is too low to access the Anthropic API." } },
      undefined,
      new Headers()
    );
    expect(toAnthropicError(err).message).toMatch(/insufficient credits/);
  });

  it("maps 404 to model_unavailable and 529 to provider_unavailable", () => {
    expect(toAnthropicError(apiError(404)).code).toBe("model_unavailable");
    expect(toAnthropicError(apiError(529)).code).toBe("provider_unavailable");
  });
});
