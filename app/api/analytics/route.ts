import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { isClient, resolveClientId, forbidden } from "@/lib/authz";
import ContentDraft from "@/lib/models/content-draft.model";
import Deliverable from "@/lib/models/deliverable.model";
import Client from "@/lib/models/client.model";
import User from "@/lib/models/user.model";
import {
  countRedosInTimeline,
  isApprovedCopy,
  isContentApproved,
  shotBucketFor,
  activeDaysBetween,
  safeRate,
  contentTurnaroundMs,
  designTurnaroundMs,
  meanMs,
  type Discipline,
  type AnalyticsResponse,
  type AnalyticsPerUser,
} from "@/lib/analytics";
import { classifyMediaType, type MediaCategory } from "@/lib/media-type-colors";
import { skipsDesignPhase } from "@/lib/status-flow";

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

    // ── Discipline (Copy vs Creative/Design) & module (Social vs Paid) ──────
    // Both are top-level tab filters. Discipline reshapes *which phase's* numbers
    // we report; module narrows the item set to a calendar module.
    const disciplineParam = searchParams.get("discipline") || "";
    const discipline: Discipline =
      disciplineParam === "copy" || disciplineParam === "design" ? disciplineParam : "";
    const moduleFilter = searchParams.get("module") || "";

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
          .select("type module statusTimeline")
          .lean()
      : [];
    const delMap = new Map(deliverables.map((d) => [d._id.toString(), d]));

    // Derive per-copy facts once. Redos are kept split per phase (writer =
    // content/copy, designer = design/creative) so the discipline tab can report
    // one phase in isolation or both combined.
    type Row = {
      createdBy: string | null;
      designerId: string | null;
      effectiveMediaType: string;
      mediaCategory: MediaCategory;
      module: string;
      copyInternal: number;
      copyClient: number;
      designInternal: number;
      designClient: number;
      contentApproved: boolean;
      designApproved: boolean;
      requiresDesign: boolean;
      // Phase durations in ms (null when the phase never reached approval).
      contentMs: number | null;
      designMs: number | null;
    };
    const rows: Row[] = drafts.map((d) => {
      const del = delMap.get(d.deliverableId.toString());
      const effectiveMediaType =
        (d.mediaType && d.mediaType.trim()) || del?.type || "";
      const articleMode = (d as { articleMode?: string }).articleMode;
      const writerTimeline = del?.statusTimeline?.writerTimeline ?? [];
      const designerTimeline = del?.statusTimeline?.designerTimeline ?? [];
      const w = countRedosInTimeline(writerTimeline);
      const design = countRedosInTimeline(designerTimeline);
      const designStartedAt = (d as { designStartedBy?: { startedAt?: string | Date } })
        .designStartedBy?.startedAt ?? null;
      return {
        createdBy: d.createdBy ? d.createdBy.toString() : null,
        designerId: (d as { designStartedBy?: { userId?: string } }).designStartedBy?.userId ?? null,
        effectiveMediaType,
        mediaCategory: classifyMediaType(effectiveMediaType),
        module: (del as { module?: string } | undefined)?.module || "",
        copyInternal: w.internal,
        copyClient: w.client,
        designInternal: design.internal,
        designClient: design.client,
        contentApproved: isContentApproved(d.status),
        designApproved: isApprovedCopy({ status: d.status, mediaType: effectiveMediaType, articleMode }),
        // A copy-only article (skips design) has no creative work; everything else
        // carries a design phase and belongs to the Creative/Design population.
        requiresDesign: !skipsDesignPhase({ mediaType: effectiveMediaType, articleMode }),
        contentMs: contentTurnaroundMs(d.createdAt, writerTimeline),
        designMs: designTurnaroundMs(designStartedAt, designerTimeline),
      };
    });

    // Media-type + module filters apply after the join (both derive from the
    // parent deliverable / effective media type).
    let filtered = mediaType
      ? rows.filter((r) => r.effectiveMediaType === mediaType)
      : rows;
    if (moduleFilter) filtered = filtered.filter((r) => r.module === moduleFilter);

    // ── Discipline lens ────────────────────────────────────────────────────
    // Population, approval, and redo readings all depend on the selected phase.
    //   copy   → every draft; content-phase redos; content approval.
    //   design → drafts that carry a design phase; design-phase redos; design approval.
    //   ""     → every draft; combined redos; final (design) approval.
    const population =
      discipline === "design" ? filtered.filter((r) => r.requiresDesign) : filtered;
    const internalOf = (r: Row) =>
      discipline === "copy" ? r.copyInternal
        : discipline === "design" ? r.designInternal
        : r.copyInternal + r.designInternal;
    const clientOf = (r: Row) =>
      discipline === "copy" ? r.copyClient
        : discipline === "design" ? r.designClient
        : r.copyClient + r.designClient;
    const isApproved = (r: Row) =>
      discipline === "copy" ? r.contentApproved : r.designApproved;

    // ── Totals ─────────────────────────────────────────────────────────────
    const totalCopies = population.length;
    const approvedRows = population.filter(isApproved);
    const approvedCopies = approvedRows.length;

    // ── Redo rates (share of items that needed ≥1 redo of that type) ───────
    const internalCount = population.filter((r) => internalOf(r) >= 1).length;
    const clientCount = population.filter((r) => clientOf(r) >= 1).length;

    // ── Shot-approval distribution (over approved items only) ──────────────
    let oneShot = 0;
    let twoShot = 0;
    let twoPlusShot = 0;
    for (const r of approvedRows) {
      const bucket = shotBucketFor(internalOf(r) + clientOf(r));
      if (bucket === "one_shot") oneShot += 1;
      else if (bucket === "two_shot") twoShot += 1;
      else twoPlusShot += 1;
    }

    // ── Per-user throughput ────────────────────────────────────────────────
    // Copy discipline tallies authored copies only; design tallies claimed
    // designs only; the combined view tallies both.
    const activeDays = activeDaysBetween(from, to);
    type Tally = {
      copies: number;
      designs: number;
      copiesByMedia: Record<string, number>;
      designsByMedia: Record<string, number>;
    };
    const tally = new Map<string, Tally>();
    const bump = (
      id: string | null,
      key: "copies" | "designs",
      category: MediaCategory
    ) => {
      if (!id) return;
      const cur =
        tally.get(id) ??
        ({ copies: 0, designs: 0, copiesByMedia: {}, designsByMedia: {} } as Tally);
      cur[key] += 1;
      const byMedia = key === "copies" ? cur.copiesByMedia : cur.designsByMedia;
      byMedia[category] = (byMedia[category] ?? 0) + 1;
      tally.set(id, cur);
    };
    for (const r of population) {
      if (discipline !== "design") bump(r.createdBy, "copies", r.mediaCategory);
      if (discipline !== "copy") bump(r.designerId, "designs", r.mediaCategory);
    }

    // ── Turnaround (per phase, over items that completed that phase) ────────
    // The discipline lens narrows which phases are reported: copy → content only,
    // design → design only, "" → both.
    const contentDurations =
      discipline === "design"
        ? []
        : population
            .filter((r) => r.contentApproved && r.contentMs != null)
            .map((r) => r.contentMs as number);
    const designDurations =
      discipline === "copy"
        ? []
        : population
            .filter((r) => r.requiresDesign && r.designApproved && r.designMs != null)
            .map((r) => r.designMs as number);

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
          copiesByMedia: t.copiesByMedia,
          designsByMedia: t.designsByMedia,
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
      turnaround: {
        contentAvgMs: meanMs(contentDurations),
        contentCount: contentDurations.length,
        designAvgMs: meanMs(designDurations),
        designCount: designDurations.length,
      },
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
