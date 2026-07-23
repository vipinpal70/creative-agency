import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import ContentDraft from "@/lib/models/content-draft.model";
import Deliverable from "@/lib/models/deliverable.model";
import Calendar from "@/lib/models/calendar.model";
import Client from "@/lib/models/client.model";
import User from "@/lib/models/user.model";
import { serializeCopy, dbStatusesFor } from "@/lib/serialize-copy";
import { isClient, resolveClientId, unauthorized, forbidden, notFound } from "@/lib/authz";

// Which DB statuses back each client-facing tab.
const TAB_STATUSES: Record<string, string[]> = {
  content: dbStatusesFor("content_client_review"),
  design: dbStatusesFor("design_client_review"),
  // History = everything the client has already actioned: approved copies/
  // designs, or items sent back with a change request (content_req_change /
  // design_req_change). Legacy rejected / design_in_progress are kept too.
  history: [
    ...dbStatusesFor("content_approved"),
    ...dbStatusesFor("design_approved"),
    ...dbStatusesFor("content_req_change"),
    ...dbStatusesFor("design_req_change"),
    ...dbStatusesFor("rejected"),
    ...dbStatusesFor("design_in_progress"),
  ],
};

// GET /api/client/approvals?tab=content|design|history
// Lists the caller's own copies for the requested tab, scoped entirely on the
// backend to the authenticated client. Defaults to both client-review stages.
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return unauthorized();
    if (!isClient(session)) return forbidden("Not a client account");

    const clientId = await resolveClientId(session);
    if (!clientId) {
      return notFound("No client profile is linked to your account.");
    }

    await connectDB();

    // Reference models so populate works even before they're registered elsewhere
    void Deliverable; void Calendar; void Client; void User;

    const tab = new URL(req.url).searchParams.get("tab");
    const dbStatuses =
      tab && TAB_STATUSES[tab]
        ? TAB_STATUSES[tab]
        : [...TAB_STATUSES.content, ...TAB_STATUSES.design];

    const filter: Record<string, any> = {
      clientId,
      status: { $in: dbStatuses },
      archivedAt: null,
    };

    const drafts = await ContentDraft.find(filter)
      .populate("clientId", "name brandName")
      .populate("deliverableId", "title platforms buckets type status module scheduledDate")
      .populate("calendarId", "name")
      .populate("createdBy", "firstName lastName email")
      .sort({ updatedAt: -1 })
      .lean();

    return NextResponse.json(drafts.map(serializeCopy));
  } catch (err: any) {
    console.error("[client/approvals GET]", err);
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}
