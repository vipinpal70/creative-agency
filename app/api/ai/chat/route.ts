import { NextRequest, NextResponse } from "next/server";

import { connectDB } from "@/lib/db";
import { getSession } from "@/lib/auth";

import { classifyRequest } from "@/lib/ai/router";
import { buildProjectContext } from "@/lib/ai/context/build-project-context";
import { executeTask } from "@/lib/ai/executor";
import { getOrCreateAIProject } from "@/lib/ai/project/get-or-create-project";
import AIMessage from "@/lib/models/ai/ai-message";
import AIConversation from "@/lib/models/ai/ai-conversation";

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const { clientId, conversationId, prompt } = await req.json();

    if (!prompt || !clientId) {
      return NextResponse.json(
        { success: false, message: "clientId and prompt are required" },
        { status: 400 }
      );
    }

    const session = await getSession();

    if (!session?.userId) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    // 0. Resolve the project and conversation up front. AIMessage requires
    // BOTH projectId and conversationId, so we can't store anything until we
    // have them. A conversation is auto-created on the first prompt and its id
    // is returned so the client can thread follow-ups.
    const { project } = await getOrCreateAIProject(clientId, session.userId);

    let convoId = conversationId;
    if (!convoId) {
      const conversation = await AIConversation.create({
        projectId: project._id,
        title: prompt.slice(0, 80),
        type: "chat",
        createdBy: session.userId,
        lastMessageAt: new Date(),
      });
      convoId = conversation._id.toString();
    }

    // 1. Store the incoming message immediately — "store everything."
    await AIMessage.create({
      projectId: project._id,
      conversationId: convoId,
      role: "user",
      content: prompt,
    });

    // 2. Route: classify the free-form prompt into exactly one task.
    // (Classification still happens even on the first-ever prompt — the
    // bootstrap below decides whether it's actually used yet.)
    const classification = await classifyRequest(prompt);

    // 3. Get-or-create the project, and bootstrap the FIXED client_research
    // prompt if this is the first time this client has been used with the
    // LLM. On every later call, this just returns the already-saved
    // AIProject.context — no re-research.
    const { context, bootstrapped, bootstrapResult } = await buildProjectContext({
      clientId,
      userId: session.userId,
      task: classification.task,
    });

    // First-ever prompt for this client: return the freshly-generated,
    // fixed-structure research directly — this is the same shape/behavior
    // as the existing admin "Feed to LLM" flow, just triggered
    // automatically by the client's first chat message instead of a
    // manual button click.
    if (bootstrapped) {
      await AIMessage.create({
        projectId: project._id,
        conversationId: convoId,
        role: "assistant",
        content: JSON.stringify(bootstrapResult),
        taskType: "client_research",
      });

      return NextResponse.json({
        success: true,
        conversationId: convoId,
        taskType: "client_research",
        outputMode: "json",
        data: bootstrapResult,
      });
    }

    // 4. Every subsequent prompt: execute the classified task using the
    // already-saved project context — narrow schema, no re-research.
    const result = await executeTask(classification.task, prompt, context);

    await AIMessage.create({
      projectId: project._id,
      conversationId: convoId,
      role: "assistant",
      content: result.outputMode === "text" ? result.text : JSON.stringify(result.data),
      taskType: result.taskType,
    });

    // 5. Return a response shaped only for the task that actually ran.
    // The frontend switches on taskType/outputMode to pick which component
    // renders — a chat bubble, a narrow "Competitors" list, etc. — instead
    // of always rendering the full client-research panel.
    return NextResponse.json({
      success: true,
      conversationId: convoId,
      taskType: result.taskType,
      outputMode: result.outputMode,
      text: result.text,
      data: result.data,
    });
  } catch (error: any) {
    console.error("AI chat error:", error);

    return NextResponse.json(
      { success: false, message: error?.message || "AI request failed" },
      { status: 500 }
    );
  }
}