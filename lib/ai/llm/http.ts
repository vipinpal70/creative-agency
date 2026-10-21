import { NextResponse } from "next/server";
import { isLLMError } from "./types";

/*
 * Turns LLM-layer errors into a JSON response. LLMError messages are written
 * for users and never contain credentials. Anything else is logged and null
 * is returned so the caller keeps its existing fallback response. Adapters
 * wrap every vendor/SDK failure in LLMError, so a non-LLMError here is an
 * application error, not a provider response.
 */
export function llmErrorResponse(err: unknown, logLabel: string) {
  if (isLLMError(err)) {
    const warning = (err as { warning?: unknown }).warning;
    return NextResponse.json(
      { error: err.message, code: err.code, ...(warning ? { warning } : {}) },
      { status: err.status }
    );
  }
  console.error(`[${logLabel}]`, err);
  return null;
}
