import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { isClient, resolveClientId, forbidden } from "@/lib/authz";
import ContentDraft from "@/lib/models/content-draft.model";
import Deliverable from "@/lib/models/deliverable.model";
import Client from "@/lib/models/client.model";
import User from "@/lib/models/user.model";
import {
  countRedosForDeliverable,
  isApprovedCopy,
  shotBucketFor,
  activeDaysBetween,
  safeRate,
  type AnalyticsResponse,
  type AnalyticsPerUser,
} from "@/lib/analytics";

// GET /api/analytics?from=&to=&clientId=&memberId=&mediaType=
//
// Returns the full payload for the Analytics page: totals, redo rates, the
// shot-approval distribution, per-user throughput, and the option lists that
// populate the filter dropdowns. Client-portal callers are transparently scoped
// to their own client. See plan.md §5–6.
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await connectDB();

    const { searchParams } = new URL(req.url);

    // ── Date range (default: last 30 days, inclusive) ──────────────────────
    const now = new Date();
    const parseDate = (v: string | null, fallback: Date) => {
      if (!v) return fallback;
      const d = new Date(v);
      return isNaN(d.getTime()) ? fallback : d;
    };
    const defaultFrom = new Date(now);
    defaultFrom.setDate(defaultFrom.getDate() - 29);
    const from = parseDate(searchParams.get("from"), defaultFrom);
    from.setHours(0, 0, 0, 0);
    const to = parseDate(searchParams.get("to"), now);
    to.setHours(23, 59, 59, 999);

    const memberId = searchParams.get("memberId") || "";
    const mediaType = searchParams.get("mediaType") || "";

    // ── Scope by client ────────────────────────────────────────────────────
    // Staff may filter to any client (or all); a client user is locked to theirs.
    let scopedClientId = searchParams.get("clientId") || "";
    if (isClient(session)) {
      const own = await resolveClientId(session);
      if (!own) return forbidden("No client is associated with this account");
      scopedClientId = own;
    }

    // ── Base draft query ───────────────────────────────────────────────────
    // A copy = one ContentDraft, scoped by its creation date. Archived copies are
    // excluded (mirrors the active-list behaviour elsewhere).
    const draftQuery: Record<string, unknown> = {
      archivedAt: null,
      createdAt: { $gte: from, $lte: to },
    };
    if (scopedClientId) draftQuery.clientId = scopedClientId;
    if (memberId) {
      draftQuery.$or = [
        { createdBy: memberId },
        { "designStartedBy.userId": memberId },
      ];
    }

    const drafts = await ContentDraft.find(draftQuery)
      .select("clientId deliverableId createdBy designStartedBy mediaType status articleMode createdAt")
      .lean();

    // ── Join parent deliverables (timelines + media type fallback) ─────────
    const delIds = [...new Set(drafts.map((d) => d.deliverableId.toString()))];
    const deliverables = delIds.length
      ? await Deliverable.find({ _id: { $in: delIds } })
          .select("type statusTimeline")
          .lean()
      : [];
    const delMap = new Map(deliverables.map((d) => [d._id.toString(), d]));

    // Derive per-copy facts once: effective media type, redo counts, approved?
    type Row = {
      createdBy: string | null;
      designerId: string | null;
      effectiveMediaType: string;
      internalRedo: number;
      clientRedo: number;
      approved: boolean;
    };
    const rows: Row[] = drafts.map((d) => {
      const del = delMap.get(d.deliverableId.toString());
      const effectiveMediaType =
        (d.mediaType && d.mediaType.trim()) || del?.type || "";
      const redos = countRedosForDeliverable(del?.statusTimeline);
      const approved = isApprovedCopy({
        status: d.status,
        mediaType: effectiveMediaType,
        articleMode: (d as { articleMode?: string }).articleMode,
      });
      return {
        createdBy: d.createdBy ? d.createdBy.toString() : null,
        designerId: (d as { designStartedBy?: { userId?: string } }).designStartedBy?.userId ?? null,
        effectiveMediaType,
        internalRedo: redos.internal,
        clientRedo: redos.client,
        approved,
      };
    });

    // Media-type filter applies to the *effective* type (draft.mediaType with a
    // deliverable.type fallback), so it must run after the join.
    const filtered = mediaType
      ? rows.filter((r) => r.effectiveMediaType === mediaType)
      : rows;

    // ── Totals ─────────────────────────────────────────────────────────────
    const totalCopies = filtered.length;
    const approvedRows = filtered.filter((r) => r.approved);
    const approvedCopies = approvedRows.length;

    // ── Redo rates (share of copies that needed ≥1 redo of that type) ──────
    const internalCount = filtered.filter((r) => r.internalRedo >= 1).length;
    const clientCount = filtered.filter((r) => r.clientRedo >= 1).length;

    // ── Shot-approval distribution (over approved copies only) ─────────────
    let oneShot = 0;
    let twoShot = 0;
    let twoPlusShot = 0;
    for (const r of approvedRows) {
      const bucket = shotBucketFor(r.internalRedo + r.clientRedo);
      if (bucket === "one_shot") oneShot += 1;
      else if (bucket === "two_shot") twoShot += 1;
      else twoPlusShot += 1;
    }

    // ── Per-user throughput ────────────────────────────────────────────────
    const activeDays = activeDaysBetween(from, to);
    const tally = new Map<string, { copies: number; designs: number }>();
    const bump = (id: string | null, key: "copies" | "designs") => {
      if (!id) return;
      const cur = tally.get(id) ?? { copies: 0, designs: 0 };
      cur[key] += 1;
      tally.set(id, cur);
    };
    for (const r of filtered) {
      bump(r.createdBy, "copies");
      bump(r.designerId, "designs");
    }

    const perUserIds = [...tally.keys()];
    const perUserUsers = perUserIds.length
      ? await User.find({ _id: { $in: perUserIds } })
          .select("firstName lastName email")
          .lean()
      : [];
    const nameMap = new Map(
      perUserUsers.map((u) => [
        u._id.toString(),
        `${u.firstName} ${u.lastName || ""}`.trim() || u.email,
      ])
    );

    const perUser: AnalyticsPerUser[] = perUserIds
      .map((id) => {
        const t = tally.get(id)!;
        return {
          userId: id,
          name: nameMap.get(id) || "Unknown",
          copies: t.copies,
          designs: t.designs,
          avgCopiesPerDay: t.copies / activeDays,
          avgDesignsPerDay: t.designs / activeDays,
        };
      })
      .sort((a, b) => b.copies - a.copies || b.designs - a.designs);

    // ── Filter option lists (stable — independent of the active filters) ───
    const clientScopeForOptions = scopedClientId ? { _id: scopedClientId } : {};
    const [clientDocs, memberDocs, draftMediaTypes, delTypes] = await Promise.all([
      Client.find(clientScopeForOptions).select("name brandName").sort({ name: 1 }).lean(),
      isClient(session)
        ? Promise.resolve([])
        : User.find({ role: { $in: ["member", "admin"] } })
            .select("firstName lastName email")
            .sort({ firstName: 1 })
            .lean(),
      ContentDraft.distinct("mediaType", scopedClientId ? { clientId: scopedClientId } : {}),
      Deliverable.distinct("type", scopedClientId ? { clientId: scopedClientId } : {}),
    ]);

    const mediaTypes = [
      ...new Set(
        [...(draftMediaTypes as string[]), ...(delTypes as string[])]
          .map((t) => (t || "").trim())
          .filter(Boolean)
      ),
    ].sort((a, b) => a.localeCompare(b));

    const payload: AnalyticsResponse = {
      range: { from: from.toISOString(), to: to.toISOString(), activeDays },
      totals: {
        totalCopies,
        approvedCopies,
        inProgress: totalCopies - approvedCopies,
      },
      redo: {
        internalRate: safeRate(internalCount, totalCopies),
        clientRate: safeRate(clientCount, totalCopies),
        internalCount,
        clientCount,
      },
      shots: { oneShot, twoShot, twoPlusShot },
      perUser,
      filters: {
        clients: clientDocs.map((c) => ({
          id: c._id.toString(),
          label: (c as { brandName?: string; name?: string }).brandName || (c as { name?: string }).name || "—",
        })),
        members: (memberDocs as Array<{ _id: unknown; firstName?: string; lastName?: string; email?: string }>).map((m) => ({
          id: (m._id as { toString(): string }).toString(),
          label: `${m.firstName || ""} ${m.lastName || ""}`.trim() || m.email || "—",
        })),
        mediaTypes,
      },
    };

    return NextResponse.json(payload);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    console.error("[analytics GET]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
