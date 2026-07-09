import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Client from "@/lib/models/client.model";
import { isClient, resolveClientId, unauthorized, forbidden, notFound } from "@/lib/authz";

// GET /api/client/profile
// Returns a SAFE, read-only projection of the caller's own Client record for
// the client portal. Deliberately excludes sensitive/internal fields:
// credentials, assignedTeam, documents, meetingLogs and raw scope internals.
export async function GET() {
  try {
    const session = await getSession();
    if (!session) return unauthorized();
    if (!isClient(session)) return forbidden("Not a client account");

    const clientId = await resolveClientId(session);
    if (!clientId) {
      return notFound("No client profile is linked to your account.");
    }

    await connectDB();
    const client = await Client.findById(clientId)
      .select(
        "name brandName industry website status contractStart contractEnd primaryContact aboutBrand socialMediaPresence competitors"
      )
      .lean();

    if (!client) return notFound("Client profile not found.");

    return NextResponse.json({ ...client, id: clientId });
  } catch (err: any) {
    console.error("[client/profile GET]", err);
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}
