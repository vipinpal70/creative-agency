import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { purgeExpiredArchived, ARCHIVE_RETENTION_DAYS } from "@/lib/copy-cleanup";

// Long-running cleanup that scans and deletes files — never statically cached.
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Permanently deletes archived copies older than the retention window
 * (ARCHIVE_RETENTION_DAYS). Intended to run on a schedule.
 *
 * Auth (either):
 *   - Header `Authorization: Bearer <CRON_SECRET>` or `?secret=<CRON_SECRET>`
 *     (for external cron / Vercel Cron), OR
 *   - a logged-in admin session (manual trigger from the dashboard).
 *
 * Idempotent: safe to invoke repeatedly. Wire up e.g. a daily Vercel Cron:
 *   { "crons": [{ "path": "/api/cron/purge-archived", "schedule": "0 3 * * *" }] }
 */
async function run(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const url = new URL(req.url);
  const provided =
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
    url.searchParams.get("secret") ||
    "";

  let authorized = false;
  if (secret && provided && provided === secret) {
    authorized = true;
  } else {
    // Fall back to an admin session for manual runs from the UI.
    const session = await getSession();
    if (session?.role === "admin") authorized = true;
  }

  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const started = Date.now();
  const summary = await purgeExpiredArchived();
  return NextResponse.json({
    ok: true,
    retentionDays: ARCHIVE_RETENTION_DAYS,
    ...summary,
    durationMs: Date.now() - started,
  });
}

export async function GET(req: NextRequest) {
  return run(req);
}

export async function POST(req: NextRequest) {
  return run(req);
}
