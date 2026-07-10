import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Client from "@/lib/models/client.model";
import ScopeOfWork from "@/lib/models/scope-of-work.model";
import CalendarDeliverable from "@/lib/models/calendar-deliverable.model";
import ClientTaskRequest from "@/lib/models/client-task-request.model";
import User from "@/lib/models/user.model";
import { logActivity } from "@/lib/activity";
import { isClient, forbidden, assertClientAccess, notFound } from "@/lib/authz";
import bcrypt from "bcryptjs";

type Ctx = { params: Promise<{ id: string }> };

// GET /api/clients/[id] - Gets full client details including SOW and populates assigned team
export async function GET(req: NextRequest, { params }: Ctx) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    // Owner-scoped: staff may read any client; a client only their own.
    if (!(await assertClientAccess(session, id))) return notFound("Client not found");
    await connectDB();

    const client = await Client.findById(id)
      .populate("assignedTeam", "firstName lastName email roles status avatarColor phone")
      .lean();

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const scope = await ScopeOfWork.findOne({ clientId: id }).lean();

    await logActivity({ req, action: "VIEW_CLIENT_DETAIL", details: `Viewed details for client: ${client.name}`, status: 200 });

    return NextResponse.json({
      ...client,
      id: client._id.toString(),
      scope,
    });
  } catch (err: any) {
    console.error("[clients detail GET]", err);
    return NextResponse.json({ error: err.message || "Failed to fetch client details" }, { status: 500 });
  }
}

// PATCH /api/clients/[id] - Updates client info, assigned team, credentials, documents, meeting logs, etc.
export async function PATCH(req: NextRequest, { params }: Ctx) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    // Owner-scoped: staff may edit any client; a client only their own.
    if (!(await assertClientAccess(session, id))) return notFound("Client not found");
    const body = await req.json();
    await connectDB();

    const client = await Client.findById(id);
    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    // Direct updates
    if (body.name !== undefined) client.name = body.name.trim();
    if (body.brandName !== undefined) client.brandName = body.brandName.trim();
    if (body.industry !== undefined) client.industry = body.industry.trim();
    if (body.website !== undefined) client.website = body.website.trim();
    if (body.status !== undefined) client.status = body.status;
    if (body.aboutBrand !== undefined) client.aboutBrand = body.aboutBrand;
    if (body.requirementNotes !== undefined) client.requirementNotes = body.requirementNotes;
    if (body.contractStart !== undefined) client.contractStart = new Date(body.contractStart);
    if (body.contractEnd !== undefined) client.contractEnd = new Date(body.contractEnd);

    if (body.primaryContact !== undefined) {
      client.primaryContact = {
        name: body.primaryContact.name?.trim() || client.primaryContact.name,
        email: body.primaryContact.email?.toLowerCase().trim() || client.primaryContact.email,
        phone: body.primaryContact.phone?.trim() || client.primaryContact.phone,
      };
    }

    // Array / nested updates
    if (body.competitors !== undefined) client.competitors = body.competitors;
    if (body.socialMediaPresence !== undefined) client.socialMediaPresence = body.socialMediaPresence;
    if (body.assignedTeam !== undefined) client.assignedTeam = body.assignedTeam;
    if (body.credentials !== undefined) client.credentials = body.credentials;
    if (body.documents !== undefined) client.documents = body.documents;
    if (body.meetingLogs !== undefined) client.meetingLogs = body.meetingLogs;

    // Client portal password: store the readable copy and keep the linked
    // client User's hashed login in sync (creating the account if needed).
    if (body.clientPortalPassword !== undefined && body.clientPortalPassword !== "") {
      // Staff-only: a client must not be able to silently reset their own login here.
      if (isClient(session)) return forbidden();
      client.clientPortalPassword = body.clientPortalPassword;
      const hashed = await bcrypt.hash(body.clientPortalPassword, 12);
      let user = await User.findOne({ clientId: id, role: "client" });
      if (user) {
        user.password = hashed;
        await user.save();
      } else if (client.primaryContact?.email) {
        await User.create({
          firstName: client.name,
          lastName: "Client",
          email: client.primaryContact.email.toLowerCase().trim(),
          password: hashed,
          role: "client",
          status: "active",
          clientId: client._id,
        });
      }
    }

    await client.save();

    // If scope template is edited, update the ScopeOfWork document as well
    if (body.scope !== undefined) {
      await ScopeOfWork.findOneAndUpdate(
        { clientId: id },
        {
          socialMedia: body.scope.socialMedia,
          paidMedia: body.scope.paidMedia,
          emailWhatsapp: body.scope.emailWhatsapp,
          seo: body.scope.seo,
          influencer: body.scope.influencer,
        },
        { upsert: true }
      );
    }

    await logActivity({ req, action: "UPDATE_CLIENT_SUCCESS", details: `Updated client: ${client.name}`, status: 200 });

    return NextResponse.json({ message: "Client updated successfully" });
  } catch (err: any) {
    console.error("[clients detail PATCH]", err);
    return NextResponse.json({ error: err.message || "Failed to update client" }, { status: 500 });
  }
}

// DELETE /api/clients/[id] - Deletes the client and all associated tables
export async function DELETE(req: NextRequest, { params }: Ctx) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Staff-only: clients can never delete a client record.
    if (isClient(session)) return forbidden();

    const { id } = await params;
    await connectDB();

    const client = await Client.findByIdAndDelete(id);
    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    // Delete associated data
    await ScopeOfWork.deleteOne({ clientId: id });
    await CalendarDeliverable.deleteMany({ clientId: id });
    await ClientTaskRequest.deleteMany({ clientId: id });

    await logActivity({ req, action: "DELETE_CLIENT_SUCCESS", details: `Deleted client: ${client.name}`, status: 200 });

    return NextResponse.json({ message: "Client and all associated records deleted successfully" });
  } catch (err: any) {
    console.error("[clients detail DELETE]", err);
    return NextResponse.json({ error: err.message || "Failed to delete client" }, { status: 500 });
  }
}
