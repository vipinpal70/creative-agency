import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Client from "@/lib/models/client.model";
import { isClient, resolveClientId, unauthorized, forbidden, notFound } from "@/lib/authz";

// GET /api/client/me
// Resolves the Client record linked to the logged-in client user (via
// User.clientId, falling back to the primary-contact email). Used by the
// client portal to scope every view to the caller's own client.
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
    const client = await Client.findById(clientId).select("name brandName").lean();

    return NextResponse.json({
      clientId,
      name: client?.name ?? "",
      brandName: client?.brandName ?? "",
    });
  } catch (err: any) {
    console.error("[client/me GET]", err);
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}
