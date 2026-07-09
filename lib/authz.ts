import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/lib/models/user.model";
import Client from "@/lib/models/client.model";
import type { JWTPayload } from "@/lib/auth";

// ─── Role predicates ──────────────────────────────────────────────────────────
// "Staff" is everyone internal to the agency: admins, members and sub-users.
// "Client" is the external portal user, scoped to a single Client record.

export function isClient(session: JWTPayload): boolean {
  return session.role === "client";
}

export function isStaff(session: JWTPayload): boolean {
  return session.role !== "client";
}

// ─── User ↔ Client resolution ─────────────────────────────────────────────────
// The link is stored on User.clientId (set at onboarding). For accounts created
// before that field existed we fall back to matching the login email against the
// Client's primary contact, then backfill so subsequent calls are a single read.

export async function resolveClientId(session: JWTPayload): Promise<string | null> {
  if (!isClient(session)) return null;

  await connectDB();

  const user = await User.findById(session.userId).select("clientId").lean();
  if (user?.clientId) return user.clientId.toString();

  // Legacy fallback: match on the Client's primary contact email, then backfill.
  const client = await Client.findOne({
    "primaryContact.email": session.email.toLowerCase(),
  })
    .select("_id")
    .lean();
  if (!client) return null;

  const clientId = (client._id as { toString(): string }).toString();
  await User.findByIdAndUpdate(session.userId, { clientId: client._id });
  return clientId;
}

// Returns true when `session` may access data belonging to `targetClientId`.
// Staff can access any client; a client user only their own.
export async function assertClientAccess(
  session: JWTPayload,
  targetClientId: string | null | undefined
): Promise<boolean> {
  if (isStaff(session)) return true;
  if (!targetClientId) return false;
  const own = await resolveClientId(session);
  return !!own && own === targetClientId.toString();
}

// ─── Standard error responses ─────────────────────────────────────────────────

export function unauthorized(message = "Unauthorized") {
  return NextResponse.json({ error: message }, { status: 401 });
}

export function forbidden(message = "Forbidden") {
  return NextResponse.json({ error: message }, { status: 403 });
}

export function notFound(message = "Not found") {
  return NextResponse.json({ error: message }, { status: 404 });
}
