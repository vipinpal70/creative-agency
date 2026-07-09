import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Client from "@/lib/models/client.model";
import ScopeOfWork from "@/lib/models/scope-of-work.model";
import CalendarDeliverable from "@/lib/models/calendar-deliverable.model"; // legacy: used only for onboarding seed
import Deliverable from "@/lib/models/deliverable.model";
import User from "@/lib/models/user.model";
import { logActivity } from "@/lib/activity";
import { isClient, forbidden } from "@/lib/authz";
import bcrypt from "bcryptjs";

// GET /api/clients - lists all clients with their overall progress computed for the current month
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // Staff-only: the full client directory must never be exposed to a client user.
    if (isClient(session)) return forbidden();

    await connectDB();
    const clients = await Client.find({}).sort({ createdAt: -1 }).lean();

    // Determine current month range for live statistics
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    // Committed = scheduled this month. Delivered = delivery event this month
    // (a copy scheduled last month but approved this month counts for this
    // month), so fetch deliverables matching either window.
    const inMonth = (d?: Date | null) => !!d && d >= startOfMonth && d <= endOfMonth;
    const deliverables = await Deliverable.find(
      {
        $or: [
          { scheduledDate: { $gte: startOfMonth, $lte: endOfMonth } },
          { deliveredAt: { $gte: startOfMonth, $lte: endOfMonth } },
          {
            "statusTimeline.designerTimeline": {
              $elemMatch: {
                status: "design_approved",
                timestamp: { $gte: startOfMonth, $lte: endOfMonth },
              },
            },
          },
        ],
      },
      { clientId: 1, status: 1, scheduledDate: 1, deliveredAt: 1, statusTimeline: 1 }
    ).lean();

    // Active scopes drive the contracted monthly quantity (totalScope)
    const scopes = await ScopeOfWork.find(
      { isActive: true },
      { clientId: 1, items: 1 }
    ).lean();

    // The draft pipeline ends at design_approved — nothing sets "delivered"
    // automatically — so fully approved copies count as delivered here.
    const DELIVERED_STATUSES = new Set(["delivered", "design_approved"]);

    // When the delivery happened: explicit deliveredAt, else the timestamp of
    // the design_approved timeline entry. Legacy docs without either fall back
    // to the scheduled month.
    const deliveredThisMonth = (d: (typeof deliverables)[number]) => {
      if (!DELIVERED_STATUSES.has(d.status)) return false;
      if (d.deliveredAt) return inMonth(d.deliveredAt);
      const approvedEntries = (d.statusTimeline?.designerTimeline ?? []).filter(
        (e) => e.status === "design_approved"
      );
      if (approvedEntries.length > 0) {
        return approvedEntries.some((e) => inMonth(e.timestamp));
      }
      return inMonth(d.scheduledDate);
    };

    // Map deliverables progress
    const clientProgress = clients.map((c) => {
      const clientDels = deliverables.filter((d) => d.clientId.toString() === c._id.toString());
      const committed = clientDels.filter((d) => inMonth(d.scheduledDate)).length;
      const delivered = clientDels.filter(deliveredThisMonth).length;

      const totalScope = scopes
        .filter((s) => s.clientId.toString() === c._id.toString())
        .reduce(
          (sum, s) =>
            sum + s.items.reduce((acc, it) => acc + (parseInt(it.unit ?? "0") || 0), 0),
          0
        );

      const denominator = totalScope > 0 ? totalScope : committed;
      const progressPercent =
        denominator === 0
          ? 0
          : Math.min(100, Math.round((delivered / denominator) * 100));

      return {
        id: c._id.toString(),
        name: c.name,
        brandName: c.brandName,
        industry: c.industry,
        website: c.website,
        status: c.status,
        contractStart: c.contractStart,
        contractEnd: c.contractEnd,
        primaryContact: c.primaryContact,
        assignedTeam: c.assignedTeam,
        committed,
        totalScope,
        delivered,
        progressPercent,
      };
    });

    await logActivity({ req, action: "VIEW_CLIENTS_LIST", details: `Viewed client list. Count: ${clients.length}`, status: 200 });

    return NextResponse.json(clientProgress);
  } catch (err: any) {
    console.error("[clients GET]", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}

// POST /api/clients - Onboards a new client and creates their Scope of Work + seeds calendar deliverables
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // Staff-only: only agency staff may onboard clients.
    if (isClient(session)) return forbidden();

    const body = await req.json();
    const {
      name,
      brandName,
      industry,
      website,
      contractStart,
      contractEnd,
      primaryContact,
      aboutBrand,
      requirementNotes,
      competitors,
      socialMediaPresence,
      assignedTeam,
      scope, // Contains ScopeOfWork structure
    } = body;

    if (!name?.trim() || !brandName?.trim() || !industry?.trim() || !contractStart || !contractEnd || !primaryContact?.email) {
      return NextResponse.json({ error: "Required fields are missing" }, { status: 400 });
    }

    await connectDB();

    if (body.clientUser?.email && body.clientUser?.password) {
      const emailLower = body.clientUser.email.toLowerCase().trim();
      const existingUser = await User.findOne({ email: emailLower });
      if (existingUser) {
        return NextResponse.json({ error: `User with email "${emailLower}" is already registered` }, { status: 409 });
      }
    }

    // 1. Create the Client document
    const client = await Client.create({
      name: name.trim(),
      brandName: brandName.trim(),
      industry: industry.trim(),
      website: website?.trim(),
      status: "active",
      contractStart: new Date(contractStart),
      contractEnd: new Date(contractEnd),
      primaryContact: {
        name: primaryContact.name?.trim(),
        email: primaryContact.email.toLowerCase().trim(),
        phone: primaryContact.phone?.trim(),
      },
      aboutBrand: aboutBrand?.trim(),
      requirementNotes: requirementNotes?.trim(),
      competitors: competitors || [],
      socialMediaPresence: socialMediaPresence || [],
      assignedTeam: assignedTeam || [],
      credentials: [],
      documents: [],
      meetingLogs: [],
    });

    // 2. Create the Scope of Work document
    const sowItems = Array.isArray(scope) ? scope : (scope?.items || []);
    const sow = await ScopeOfWork.create({
      clientId: client._id,
      period: "Onboarding",
      label: brandName.trim() || name.trim(),
      items: sowItems,
      isActive: true,
    });

    // 3. Seed initial deliverables for the current calendar month
    const now = new Date();
    const deliverablesToCreate: any[] = [];

    for (const item of sowItems) {
      const count = parseInt(item.unit) || 0;
      if (count <= 0) continue;

      if (item.module === "social") {
        const platforms = item.platforms || [];
        let delType: "reel" | "post" | "story" | "static" | "custom" | "reel/story" | "image/carousel" = "post";
        const labelLower = item.label.toLowerCase();
        if (labelLower === "reel/story" || labelLower.includes("reel/story")) {
          delType = "reel/story";
        } else if (labelLower === "image/carousel" || labelLower.includes("image/carousel") || labelLower.includes("carousel")) {
          delType = "image/carousel";
        } else if (labelLower === "post") {
          delType = "post";
        } else if (labelLower === "static") {
          delType = "static";
        } else if (labelLower === "custom") {
          delType = "custom";
        } else {
          if (labelLower.includes("reel") || labelLower.includes("story") || labelLower.includes("stories")) {
            delType = "reel/story";
          } else if (labelLower.includes("post")) {
            delType = "post";
          } else if (labelLower.includes("static")) {
            delType = "static";
          } else {
            delType = "custom";
          }
        }

        // Loop platforms
        for (const plat of platforms) {
          const platLower = plat.toLowerCase().trim();
          if (!platLower) continue;
          
          const cleanPlat = ["instagram", "facebook", "youtube", "linkedin", "x"].includes(platLower)
            ? (platLower as "instagram" | "facebook" | "youtube" | "linkedin" | "x")
            : "instagram";

          const platformLabelMap: Record<string, string> = {
            instagram: "Instagram",
            facebook: "Facebook",
            youtube: "YouTube",
            linkedin: "LinkedIn",
            x: "X",
          };
          const readablePlat = platformLabelMap[cleanPlat] || cleanPlat;

          for (let i = 0; i < count; i++) {
            deliverablesToCreate.push({
              clientId: client._id,
              title: `${readablePlat} ${item.label} #${i + 1}`,
              platform: cleanPlat,
              type: delType,
              status: "pending",
              scheduledDate: now,
            });
          }
        }
      } else if (item.module === "paid" || item.module === "paid-ads") {
        let cleanPlat: "meta-ads" | "google-ads" | "linkedin-ads" = "meta-ads";
        const labelLower = item.label.toLowerCase();
        if (labelLower.includes("google")) {
          cleanPlat = "google-ads";
        } else if (labelLower.includes("linkedin") || labelLower.includes("li ")) {
          cleanPlat = "linkedin-ads";
        }

        const platformLabelMap: Record<string, string> = {
          "meta-ads": "Meta Ad",
          "google-ads": "Google Ad",
          "linkedin-ads": "LinkedIn Ad",
        };
        const readablePlat = platformLabelMap[cleanPlat] || "Meta Ad";

        for (let i = 0; i < count; i++) {
          deliverablesToCreate.push({
            clientId: client._id,
            title: `${readablePlat} Creative #${i + 1}`,
            platform: cleanPlat,
            type: "ad",
            status: "pending",
            scheduledDate: now,
          });
        }
      } else if (item.module === "email" || item.module === "emailWhatsapp") {
        const labelLower = item.label.toLowerCase();
        const isTrigger = labelLower.includes("trigger") || labelLower.includes("flow") || labelLower.includes("automation");
        if (isTrigger) {
          deliverablesToCreate.push({
            clientId: client._id,
            title: `Transactional Triggers Setup (${item.label})`,
            platform: "email-whatsapp",
            type: "seo-task",
            status: "pending",
            scheduledDate: now,
          });
        } else {
          for (let i = 0; i < count; i++) {
            deliverablesToCreate.push({
              clientId: client._id,
              title: `${item.label} #${i + 1}`,
              platform: "email-whatsapp",
              type: "email-blast",
              status: "pending",
              scheduledDate: now,
            });
          }
        }
      } else if (item.module === "seo") {
        deliverablesToCreate.push({
          clientId: client._id,
          title: `SEO Setup & Audit: ${item.label} (${count} keywords)`,
          platform: "seo",
          type: "seo-task",
          status: "pending",
          scheduledDate: now,
        });
      } else if (item.module === "influencer") {
        deliverablesToCreate.push({
          clientId: client._id,
          title: `${item.label} (${count} influencers)`,
          platform: "influencer",
          type: "influencer-campaign",
          status: "pending",
          scheduledDate: now,
        });
      } else {
        for (let i = 0; i < count; i++) {
          deliverablesToCreate.push({
            clientId: client._id,
            title: `${item.label} #${i + 1}`,
            platform: "custom",
            type: "custom",
            status: "pending",
            scheduledDate: now,
          });
        }
      }
    }

    // Bulk insert deliverables
    if (deliverablesToCreate.length > 0) {
      await CalendarDeliverable.insertMany(deliverablesToCreate);
    }

    // 4. Create client user login account if requested
    let hasCreatedUser = false;
    if (body.clientUser?.email && body.clientUser?.password) {
      const emailLower = body.clientUser.email.toLowerCase().trim();
      const hashed = await bcrypt.hash(body.clientUser.password, 12);
      await User.create({
        firstName: name.trim(),
        lastName: "Client",
        email: emailLower,
        password: hashed,
        role: "client",
        status: "active",
        clientId: client._id,
      });
      hasCreatedUser = true;
    }

    await logActivity({ req, action: "ONBOARD_CLIENT_SUCCESS", details: `Onboarded client: ${client.name} (Brand: ${client.brandName}). Seeded ${deliverablesToCreate.length} deliverables. User created: ${hasCreatedUser}`, status: 201 });

    return NextResponse.json({
      id: client._id.toString(),
      name: client.name,
      brandName: client.brandName,
      message: "Client onboarded successfully",
    }, { status: 201 });
  } catch (err: any) {
    console.error("[clients POST]", err);
    return NextResponse.json({ error: err.message || "Failed to onboard client" }, { status: 500 });
  }
}
