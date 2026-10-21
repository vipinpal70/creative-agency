import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { forbidden, unauthorized } from "@/lib/authz";
import { getPublicCatalog, IMAGE_COMPATIBILITY_WARNING } from "@/lib/ai/llm/catalog";
import { canManageLLMSettings, getLLMSettings } from "@/lib/ai/llm/config-service";
import { llmErrorResponse } from "@/lib/ai/llm/http";

// GET /api/settings/ai-providers   (admin only)
// The workspace text + image configuration, the supported catalog, and what
// each capability will actually resolve to at runtime. Never returns keys.
export async function GET() {
  const session = await getSession();
  if (!session) return unauthorized();
  if (!canManageLLMSettings(session)) return forbidden("Only admins can manage AI settings");

  try {
    const settings = await getLLMSettings(session);
    return NextResponse.json({
      catalog: getPublicCatalog(),
      imageCompatibilityWarning: IMAGE_COMPATIBILITY_WARNING,
      ...settings,
    });
  } catch (err) {
    return (
      llmErrorResponse(err, "ai-providers GET") ??
      NextResponse.json({ error: "Failed to load AI settings" }, { status: 500 })
    );
  }
}
