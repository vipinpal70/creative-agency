import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Task from "@/lib/models/task.model";
import mongoose from "mongoose";

type Ctx = { params: Promise<{ id: string }> };

// POST /api/tasks/[id]/subtasks
export async function POST(req: NextRequest, { params }: Ctx) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid task ID" }, { status: 400 });
    }

    await connectDB();
    const { title } = await req.json();
    if (!title?.trim()) {
      return NextResponse.json({ error: "Subtask title is required" }, { status: 400 });
    }

    const task = await Task.findByIdAndUpdate(
      id,
      {
        $push: { subTasks: { title: title.trim(), status: "OPEN" } },
        $inc: { countSubTask: 1 },
      },
      { new: true }
    ).lean();

    if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });

    return NextResponse.json({ success: true, subTasks: task.subTasks });
  } catch (err: any) {
    console.error("[subtasks POST]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
