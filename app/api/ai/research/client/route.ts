import { NextRequest, NextResponse } from "next/server";

import { connectDB } from "@/lib/db";
import { getSession } from "@/lib/auth";

import Client from "@/lib/models/client.model";
import { AIPrompt } from "@/lib/models/ai/ai-prompt";
import { AIResearch } from "@/lib/models/ai/ai-research";
import { AIUsage } from "@/lib/models/ai/ai-usage";
import AIProject from "@/lib/models/ai/ai-project";

import { buildClientAIContext } from "@/lib/ai/context/client-context";
import {
  DEFAULT_CLIENT_RESEARCH_PROMPT,
} from "@/lib/ai/prompts/client-prompt";
import { runClientResearch } from "@/lib/ai/research/client-research";


function createSlug(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();

    const {
      clientId,
      promptId,
      customPrompt,
    } = body;

    // --------------------------------------------------
    // 1. Validate clientId
    // --------------------------------------------------

    if (!clientId) {
      return NextResponse.json(
        {
          success: false,
          message: "clientId is required",
        },
        { status: 400 }
      );
    }

    // --------------------------------------------------
    // 2. Authenticate user
    // --------------------------------------------------

    const session = await getSession();

    if (!session?.userId) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized",
        },
        { status: 401 }
      );
    }

    const currentUserId = session.userId;

    // --------------------------------------------------
    // 3. Load client
    // --------------------------------------------------

    const client = await Client.findById(clientId).lean();

    if (!client) {
      return NextResponse.json(
        {
          success: false,
          message: "Client not found",
        },
        { status: 404 }
      );
    }

    // --------------------------------------------------
    // 4. Find or create AI Project
    // --------------------------------------------------

    let project = await AIProject.findOne({
      clientId: client._id,
      status: "active",
    });

    if (!project) {
      const projectName =
        `${client.brandName || client.name} - AI Project`;

      project = await AIProject.create({
        clientId: client._id,

        name: projectName,

        slug: createSlug(
          client.brandName || client.name
        ),

        createdBy: currentUserId,

        status: "active",

        lastActivityAt: new Date(),
      });
    } else {
      // Update activity when the existing project is used
      project.lastActivityAt = new Date();
      await project.save();
    }

    // --------------------------------------------------
    // 5. Load prompt
    // --------------------------------------------------

    let prompt = DEFAULT_CLIENT_RESEARCH_PROMPT;
    let promptVersion = 1;

    if (promptId) {
      const savedPrompt = await AIPrompt.findById(
        promptId
      ).lean();

      if (!savedPrompt) {
        return NextResponse.json(
          {
            success: false,
            message: "Prompt not found",
          },
          { status: 404 }
        );
      }

      prompt = savedPrompt.prompt;
      promptVersion = savedPrompt.version;
    }

    // --------------------------------------------------
    // 6. Admin's prompt
    // --------------------------------------------------

    const adminPrompt =
      customPrompt?.trim() || prompt;

    // --------------------------------------------------
    // 7. Build safe client context
    // --------------------------------------------------

    const clientContext =
      buildClientAIContext(client);

    console.log(
      "CLIENT AI CONTEXT:",
      JSON.stringify(
        clientContext,
        null,
        2
      )
    );

    // --------------------------------------------------
    // 8. Create research record
    // --------------------------------------------------

    const research = await AIResearch.create({
      projectId: project._id,

      clientId: client._id,

      initiatedBy: currentUserId,

      type: "client_onboarding",

      status: "researching",

      promptId:
        promptId || undefined,

      promptVersion,

      promptUsed: adminPrompt,

      inputSnapshot: {
        client: clientContext,
      },
    });

    // --------------------------------------------------
    // 9. Run AI research
    // --------------------------------------------------

    try {
      const aiResponse =
        await runClientResearch(
          adminPrompt,
          clientContext
        );

      // ------------------------------------------------
      // 10. Save research result
      // ------------------------------------------------

      await AIResearch.findByIdAndUpdate(
        research._id,
        {
          status: "completed",

          businessSearch: {
            queries: [],
            results: [],
          },

          competitorSearch: {
            queries: [],
            results: [],
          },

          businessAnalysis:
            aiResponse.result
              .businessAnalysis,

          competitorAnalysis:
            aiResponse.result
              .competitors,

          finalAnalysis:
            aiResponse.result,

          sources:
            aiResponse.result.sources || [],
        }
      );

      // ------------------------------------------------
      // 11. Track AI usage
      // ------------------------------------------------

      await AIUsage.create({
        userId: currentUserId,

        clientId: client._id,

        researchId: research._id,

        provider: "anthropic",

        model:
          process.env.AI_ANTHROPIC_MODEL ||
          "claude-sonnet-5",

        operation: "client_research",

        inputTokens:
          aiResponse.inputTokens,

        outputTokens:
          aiResponse.outputTokens,

        webSearchCount:
          aiResponse.webSearchCount,

        estimatedCost: 0,
      });

      // ------------------------------------------------
      // 12. Update project activity
      // ------------------------------------------------

      // Persist the structured result onto the project itself — not just the
      // AIResearch audit record — so it becomes reusable project memory. This
      // is what the copywriting / chat flows read (contextStatus "ready").
      await AIProject.findByIdAndUpdate(
        project._id,
        {
          context: aiResponse.result,
          contextStatus: "ready",
          contextGeneratedAt: new Date(),
          lastActivityAt: new Date(),
        }
      );

      // ------------------------------------------------
      // 13. Return response
      // ------------------------------------------------

      return NextResponse.json({
        success: true,

        projectId: project._id,

        researchId: research._id,

        result: aiResponse.result,

        usage: {
          inputTokens:
            aiResponse.inputTokens,

          outputTokens:
            aiResponse.outputTokens,

          webSearchCount:
            aiResponse.webSearchCount,
        },
      });
    } catch (error: any) {
      // ----------------------------------------------
      // AI failed
      // ----------------------------------------------

      await AIResearch.findByIdAndUpdate(
        research._id,
        {
          status: "failed",

          error:
            error?.message ||
            "AI research failed",
        }
      );

      throw error;
    }
  } catch (error: any) {
    console.error(
      "Client AI research error:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        message:
          error?.message ||
          "Failed to perform AI research",
      },
      { status: 500 }
    );
  }
}