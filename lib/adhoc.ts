import mongoose from "mongoose";
import Calendar from "@/lib/models/calendar.model";
import ScopeOfWork from "@/lib/models/scope-of-work.model";

// Adhoc copies are created directly for a client without the writer building a
// calendar. The data model still requires every deliverable to hang off a
// Calendar + ScopeOfWork, so each client gets one hidden, reused "Adhoc" context:
//   • a dedicated ScopeOfWork (isActive: false, so it never displaces the
//     client's real active scope) holding a single "Adhoc Requests" item whose
//     planned count grows by one per adhoc copy — this is what keeps the scope /
//     analytics numbers consistent.
//   • a single calendar with module "adhoc" that every adhoc deliverable links to.
// Both are created on first use and reused thereafter.

export const ADHOC_MODULE = "adhoc";
export const ADHOC_SCOPE_LABEL = "Adhoc";
export const ADHOC_SCOPE_ITEM_ID = "adhoc-requests";
export const ADHOC_SCOPE_ITEM_LABEL = "Adhoc Requests";
export const ADHOC_CALENDAR_NAME = "Adhoc Requests";

export interface AdhocContext {
  scopeId: mongoose.Types.ObjectId;
  calendarId: mongoose.Types.ObjectId;
}

// Find (or lazily create) the client's Adhoc scope + calendar. Idempotent.
export async function getOrCreateAdhocContext(
  clientId: string,
  userId: string
): Promise<AdhocContext> {
  const clientObjId = new mongoose.Types.ObjectId(clientId);

  // ── Scope ──────────────────────────────────────────────────────────────
  let scope = await ScopeOfWork.findOne({ clientId: clientObjId, label: ADHOC_SCOPE_LABEL });
  if (!scope) {
    scope = await ScopeOfWork.create({
      clientId: clientObjId,
      label: ADHOC_SCOPE_LABEL,
      period: "",
      // Kept out of the active-scope rotation so it never displaces the
      // client's real scope of work.
      isActive: false,
      items: [
        {
          id: ADHOC_SCOPE_ITEM_ID,
          module: ADHOC_MODULE,
          label: ADHOC_SCOPE_ITEM_LABEL,
          unit: "0",
          delivered: 0,
          platforms: [],
        },
      ],
    });
  } else if (!(scope.items as any[]).some((i) => i.id === ADHOC_SCOPE_ITEM_ID)) {
    // Scope exists but the tracking item was removed — restore it.
    (scope.items as any[]).push({
      id: ADHOC_SCOPE_ITEM_ID,
      module: ADHOC_MODULE,
      label: ADHOC_SCOPE_ITEM_LABEL,
      unit: "0",
      delivered: 0,
      platforms: [],
    });
    await scope.save();
  }

  // ── Calendar ───────────────────────────────────────────────────────────
  let calendar = await Calendar.findOne({ clientId: clientObjId, module: ADHOC_MODULE });
  if (!calendar) {
    const now = new Date();
    // A far-future end date keeps the single rolling calendar permanently open.
    const farFuture = new Date(now.getFullYear() + 50, 0, 1);
    calendar = await Calendar.create({
      clientId: clientObjId,
      scopeId: scope._id,
      createdBy: new mongoose.Types.ObjectId(userId),
      module: ADHOC_MODULE,
      name: ADHOC_CALENDAR_NAME,
      objective: "One-off adhoc requests created outside a calendar.",
      startDate: now,
      endDate: farFuture,
      status: "active",
      plannedItems: [],
      buckets: [],
    });
  }

  return {
    scopeId: scope._id as mongoose.Types.ObjectId,
    calendarId: calendar._id as mongoose.Types.ObjectId,
  };
}

// Bump the shared "Adhoc Requests" scope item's planned count by one. `unit` is
// stored as a numeric string, so we parse → increment → write.
export async function incrementAdhocScopeCount(scopeId: mongoose.Types.ObjectId): Promise<void> {
  const scope = await ScopeOfWork.findById(scopeId);
  if (!scope) return;
  const item = (scope.items as any[]).find((i) => i.id === ADHOC_SCOPE_ITEM_ID);
  if (!item) return;
  const current = parseInt(item.unit, 10) || 0;
  item.unit = String(current + 1);
  await scope.save();
}
