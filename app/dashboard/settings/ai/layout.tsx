import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { canManageLLMSettings } from "@/lib/ai/llm/config-service";

// AI Settings are workspace-wide, so only admins may open the page. The API
// routes enforce the same rule; this just keeps everyone else off the screen.
export default async function AISettingsLayout({ children }: { children: ReactNode }) {
  const session = await getSession();
  if (!canManageLLMSettings(session)) redirect("/dashboard");
  return children;
}
