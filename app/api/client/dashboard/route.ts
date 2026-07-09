import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import ContentDraft from "@/lib/models/content-draft.model";
import Deliverable from "@/lib/models/deliverable.model";
import ScopeOfWork from "@/lib/models/scope-of-work.model";
import Client from "@/lib/models/client.model";
import { isClient, resolveClientId, unauthorized, forbidden, notFound } from "@/lib/authz";
import { dbStatusesFor } from "@/lib/serialize-copy";

// GET /api/client/dashboard
// Aggregated, backend-scoped stats for the authenticated client's overview.
export async function GET() {
  try {
    const session = await getSession();
    if (!session) return unauthorized();
    if (!isClient(session)) return forbidden("Not a client account");

    const clientId = await resolveClientId(session);
    if (!clientId) return notFound("No client profile is linked to your account.");

    await connectDB();

    const REVIEW = [
      ...dbStatusesFor("content_internal_review"),
      ...dbStatusesFor("content_client_review"),
      ...dbStatusesFor("design_internal_review"),
      ...dbStatusesFor("design_client_review"),
    ];
    const APPROVED = [...dbStatusesFor("content_approved"), ...dbStatusesFor("design_approved")];
    const REJECTED = [...dbStatusesFor("rejected")];

    const [totalCopies, pending, approved, rejected] = await Promise.all([
      ContentDraft.countDocuments({ clientId, archivedAt: null }),
      ContentDraft.countDocuments({ clientId, archivedAt: null, status: { $in: REVIEW } }),
      ContentDraft.countDocuments({ clientId, archivedAt: null, status: { $in: APPROVED } }),
      ContentDraft.countDocuments({ clientId, archivedAt: null, status: { $in: REJECTED } }),
    ]);

    // Monthly progress: contracted scope vs delivered deliverables.
    const scopes = await ScopeOfWork.find({ clientId, isActive: true }, { items: 1 }).lean();
    const totalScope = scopes.reduce(
      (sum, s) => sum + (s.items ?? []).reduce((a: number, it: any) => a + (parseInt(it.unit ?? "0") || 0), 0),
      0
    );
    const delivered = await Deliverable.countDocuments({
      clientId,
      status: { $in: ["delivered", "design_approved"] },
    });

    // Assigned team (safe fields only).
    const client = await Client.findById(clientId)
      .populate("assignedTeam", "firstName lastName email roles avatarColor")
      .select("assignedTeam name brandName")
      .lean();

    const team = ((client?.assignedTeam as any[]) ?? []).map((u) => ({
      id: u._id?.toString(),
      name: `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || u.email,
      email: u.email,
      roles: u.roles ?? [],
      avatarColor: u.avatarColor ?? "#6366f1",
    }));

    return NextResponse.json({
      name: client?.name ?? "",
      brandName: client?.brandName ?? "",
      kpis: { totalCopies, pending, approved, rejected },
      approval: { approved, rejected, pending },
      progress: { totalScope, delivered },
      team,
    });
  } catch (err: any) {
    console.error("[client/dashboard GET]", err);
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}
