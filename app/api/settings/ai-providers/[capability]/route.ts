import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { forbidden, notFound, unauthorized } from "@/lib/authz";
import { parseCapability } from "@/lib/ai/llm/catalog";
import { canManageLLMSettings, deleteLLMConfig, saveLLMConfig } from "@/lib/ai/llm/config-service";
import { llmErrorResponse } from "@/lib/ai/llm/http";

type Ctx = { params: Promise<{ capability: string }> };

// PUT /api/settings/ai-providers/[text|image]   (admin only)
// Body: { provider, model, apiKey?, credentialSource?: "user" | "env", options? }
// Validates compatibility, live-tests the credentials, then saves (encrypted)
// the workspace-wide configuration used by every user's AI requests.
export async function PUT(req: NextRequest, { params }: Ctx) {
  const session = await getSession();
  if (!session) return unauthorized();
  if (!canManageLLMSettings(session)) return forbidden("Only admins can manage AI settings");

  const capability = parseCapability((await params).capability);
  if (!capability) return notFound();

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    const config = await saveLLMConfig(session, capability, {
      provider: body.provider,
      model: body.model,
      apiKey: body.apiKey,
      credentialSource: body.credentialSource,
      options: body.options,
    });
    return NextResponse.json({ config });
  } catch (err) {
    return (
      llmErrorResponse(err, "ai-providers PUT") ??
      NextResponse.json({ error: "Failed to save AI settings" }, { status: 500 })
    );
  }
}

// DELETE /api/settings/ai-providers/[text|image] — revert to the OpenAI defaults (admin only).
export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const session = await getSession();
  if (!session) return unauthorized();
  if (!canManageLLMSettings(session)) return forbidden("Only admins can manage AI settings");

  const capability = parseCapability((await params).capability);
  if (!capability) return notFound();

  try {
    await deleteLLMConfig(session, capability);
    return NextResponse.json({ success: true });
  } catch (err) {
    return (
      llmErrorResponse(err, "ai-providers DELETE") ??
      NextResponse.json({ error: "Failed to reset AI settings" }, { status: 500 })
    );
  }
}
