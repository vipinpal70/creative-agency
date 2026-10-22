import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { forbidden, notFound, unauthorized } from "@/lib/authz";
import { parseCapability } from "@/lib/ai/llm/catalog";
import { canManageLLMSettings, testLLMConfig } from "@/lib/ai/llm/config-service";
import { llmErrorResponse } from "@/lib/ai/llm/http";

type Ctx = { params: Promise<{ capability: string }> };

// POST /api/settings/ai-providers/[text|image]/test   (admin only)
// Same body as PUT. Runs compatibility + live credential checks without saving.
export async function POST(req: NextRequest, { params }: Ctx) {
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
    const result = await testLLMConfig(session, capability, {
      provider: body.provider,
      model: body.model,
      apiKey: body.apiKey,
      credentialSource: body.credentialSource,
      options: body.options,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return (
      llmErrorResponse(err, "ai-providers test") ??
      NextResponse.json({ error: "Connection test failed" }, { status: 500 })
    );
  }
}
