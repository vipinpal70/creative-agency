import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import ActivityLog from "@/lib/models/activity-log.model";
import User from "@/lib/models/user.model";

// Helper to sanitize request data (remove passwords, bank accounts, etc.)
function sanitizeData(data: any): any {
  if (!data) return data;
  if (typeof data !== "object") return data;

  try {
    const cloned = JSON.parse(JSON.stringify(data));
    const keysToScrub = ["password", "accountNo", "ifscCode", "tempPassword", "secret", "token"];

    const scrub = (obj: any) => {
      for (const key in obj) {
        if (keysToScrub.some(k => key.toLowerCase().includes(k.toLowerCase()))) {
          obj[key] = "********";
        } else if (obj[key] && typeof obj[key] === "object") {
          scrub(obj[key]);
        }
      }
    };

    scrub(cloned);
    return cloned;
  } catch {
    return "[Unserializable Data]";
  }
}

interface LogOptions {
  req?: NextRequest;
  action: string;
  details?: string;
  status?: number;
  requestData?: any;
}

export async function logActivity({ req, action, details, status, requestData }: LogOptions) {
  try {
    await connectDB();

    // Get current session
    const session = await getSession();
    let userId = session?.userId || undefined;
    let userEmail = session?.email || undefined;
    let userName = undefined;

    if (userId) {
      const user = await User.findById(userId).lean();
      if (user) {
        userName = `${user.firstName} ${user.lastName || ""}`.trim();
        if (!userEmail) userEmail = user.email;
      }
    }

    // Capture request details if request object is passed
    let method = "SYSTEM";
    let url = "SYSTEM";
    let ip = undefined;
    let userAgent = undefined;

    if (req) {
      method = req.method;
      url = req.nextUrl.pathname;
      ip = req.headers.get("x-forwarded-for") || (req as any).ip || undefined;
      userAgent = req.headers.get("user-agent") || undefined;
    }

    const sanitizedData = sanitizeData(requestData);

    await ActivityLog.create({
      userId,
      userEmail,
      userName,
      action,
      method,
      url,
      ip,
      userAgent,
      status,
      requestData: sanitizedData,
      details,
    });
  } catch (err) {
    console.error("Error logging activity:", err);
  }
}
