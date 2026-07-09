import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { isClient, forbidden } from "@/lib/authz";
import { connectDB } from "@/lib/db";
import ActivityLog from "@/lib/models/activity-log.model";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (isClient(session)) return forbidden();

    // Connect to Database
    await connectDB();

    // Parse query parameters
    const url = new URL(req.url);
    const search = url.searchParams.get("search") || "";
    const actionFilter = url.searchParams.get("action") || "";
    const methodFilter = url.searchParams.get("method") || "";
    const limit = parseInt(url.searchParams.get("limit") || "100", 10);
    const page = parseInt(url.searchParams.get("page") || "1", 10);

    // Build query
    const query: any = {};

    if (search) {
      query.$or = [
        { userEmail: { $regex: search, $options: "i" } },
        { userName: { $regex: search, $options: "i" } },
        { details: { $regex: search, $options: "i" } },
        { url: { $regex: search, $options: "i" } },
      ];
    }

    if (actionFilter) {
      query.action = actionFilter;
    }

    if (methodFilter) {
      query.method = methodFilter.toUpperCase();
    }

    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      ActivityLog.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      ActivityLog.countDocuments(query),
    ]);

    return NextResponse.json({
      logs,
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (err: any) {
    console.error("[activity-logs-api]", err);
    return NextResponse.json({ error: err.message || "Failed to fetch activity logs" }, { status: 500 });
  }
}
