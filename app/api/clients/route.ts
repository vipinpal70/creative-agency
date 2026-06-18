import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Client from "@/lib/models/client.model";
import ScopeOfWork from "@/lib/models/scope-of-work.model";
import CalendarDeliverable from "@/lib/models/calendar-deliverable.model";
import { logActivity } from "@/lib/activity";

// GET /api/clients - lists all clients with their overall progress computed for the current month
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const clients = await Client.find({}).sort({ createdAt: -1 }).lean();

    // Determine current month range for live statistics
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    // Fetch deliverables for the current month to calculate progress
    const deliverables = await CalendarDeliverable.find({
      scheduledDate: { $gte: startOfMonth, $lte: endOfMonth },
    }).lean();

    // Map deliverables progress
    const clientProgress = clients.map((c) => {
      const clientDels = deliverables.filter((d) => d.clientId.toString() === c._id.toString());
      const committed = clientDels.length;
      const delivered = clientDels.filter((d) => d.status === "delivered").length;
      const progressPercent = committed === 0 ? 0 : Math.round((delivered / committed) * 100);

      // Extract list of active module keys
      const activeModules: string[] = [];
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
    const sow = await ScopeOfWork.create({
      clientId: client._id,
      socialMedia: scope?.socialMedia || {},
      paidMedia: scope?.paidMedia || {},
      emailWhatsapp: scope?.emailWhatsapp || {
        transactional: { enabled: false, triggers: 0 },
        promotional: { enabled: false, emails: 0 },
      },
      seo: scope?.seo || { keywords: [], gaAccess: { type: "none" }, gtmAccess: { type: "none" }, gscAccess: { type: "none" } },
      influencer: scope?.influencer || { influencersCount: 0, commission: 0, budget: 0 },
    });

    // 3. Seed initial deliverables for the current calendar month
    const now = new Date();
    const deliverablesToCreate: any[] = [];

    // Social Media
    const sm = sow.socialMedia;
    if (sm) {
      // Instagram
      for (let i = 0; i < (sm.instagram?.reels || 0); i++) {
        deliverablesToCreate.push({ clientId: client._id, title: `Instagram Reel #${i + 1}`, platform: "instagram", type: "reel", status: "pending", scheduledDate: now });
      }
      for (let i = 0; i < (sm.instagram?.posts || 0); i++) {
        deliverablesToCreate.push({ clientId: client._id, title: `Instagram Post #${i + 1}`, platform: "instagram", type: "post", status: "pending", scheduledDate: now });
      }
      for (let i = 0; i < (sm.instagram?.stories || 0); i++) {
        deliverablesToCreate.push({ clientId: client._id, title: `Instagram Story #${i + 1}`, platform: "instagram", type: "story", status: "pending", scheduledDate: now });
      }
      for (let i = 0; i < (sm.instagram?.custom || 0); i++) {
        deliverablesToCreate.push({ clientId: client._id, title: `Instagram Deliverable #${i + 1}`, platform: "instagram", type: "custom", status: "pending", scheduledDate: now });
      }

      // Facebook
      for (let i = 0; i < (sm.facebook?.staticCount || 0); i++) {
        deliverablesToCreate.push({ clientId: client._id, title: `Facebook Static #${i + 1}`, platform: "facebook", type: "static", status: "pending", scheduledDate: now });
      }
      for (let i = 0; i < (sm.facebook?.reels || 0); i++) {
        deliverablesToCreate.push({ clientId: client._id, title: `Facebook Reel #${i + 1}`, platform: "facebook", type: "reel", status: "pending", scheduledDate: now });
      }
      for (let i = 0; i < (sm.facebook?.posts || 0); i++) {
        deliverablesToCreate.push({ clientId: client._id, title: `Facebook Post #${i + 1}`, platform: "facebook", type: "post", status: "pending", scheduledDate: now });
      }
      for (let i = 0; i < (sm.facebook?.stories || 0); i++) {
        deliverablesToCreate.push({ clientId: client._id, title: `Facebook Story #${i + 1}`, platform: "facebook", type: "story", status: "pending", scheduledDate: now });
      }
      for (let i = 0; i < (sm.facebook?.custom || 0); i++) {
        deliverablesToCreate.push({ clientId: client._id, title: `Facebook Deliverable #${i + 1}`, platform: "facebook", type: "custom", status: "pending", scheduledDate: now });
      }

      // YouTube
      for (let i = 0; i < (sm.youtube?.staticCount || 0); i++) {
        deliverablesToCreate.push({ clientId: client._id, title: `YouTube Post #${i + 1}`, platform: "youtube", type: "static", status: "pending", scheduledDate: now });
      }
      for (let i = 0; i < (sm.youtube?.reels || 0); i++) {
        deliverablesToCreate.push({ clientId: client._id, title: `YouTube Short #${i + 1}`, platform: "youtube", type: "reel", status: "pending", scheduledDate: now });
      }
      for (let i = 0; i < (sm.youtube?.posts || 0); i++) {
        deliverablesToCreate.push({ clientId: client._id, title: `YouTube Video #${i + 1}`, platform: "youtube", type: "post", status: "pending", scheduledDate: now });
      }
      for (let i = 0; i < (sm.youtube?.stories || 0); i++) {
        deliverablesToCreate.push({ clientId: client._id, title: `YouTube Story #${i + 1}`, platform: "youtube", type: "story", status: "pending", scheduledDate: now });
      }
      for (let i = 0; i < (sm.youtube?.custom || 0); i++) {
        deliverablesToCreate.push({ clientId: client._id, title: `YouTube Deliverable #${i + 1}`, platform: "youtube", type: "custom", status: "pending", scheduledDate: now });
      }

      // LinkedIn
      for (let i = 0; i < (sm.linkedin?.posts || 0); i++) {
        deliverablesToCreate.push({ clientId: client._id, title: `LinkedIn Post #${i + 1}`, platform: "linkedin", type: "post", status: "pending", scheduledDate: now });
      }
      for (let i = 0; i < (sm.linkedin?.custom || 0); i++) {
        deliverablesToCreate.push({ clientId: client._id, title: `LinkedIn Deliverable #${i + 1}`, platform: "linkedin", type: "custom", status: "pending", scheduledDate: now });
      }

      // X
      for (let i = 0; i < (sm.x?.posts || 0); i++) {
        deliverablesToCreate.push({ clientId: client._id, title: `X Post #${i + 1}`, platform: "x", type: "post", status: "pending", scheduledDate: now });
      }
      for (let i = 0; i < (sm.x?.custom || 0); i++) {
        deliverablesToCreate.push({ clientId: client._id, title: `X Deliverable #${i + 1}`, platform: "x", type: "custom", status: "pending", scheduledDate: now });
      }
    }

    // Paid Media
    const pm = sow.paidMedia;
    if (pm) {
      for (let i = 0; i < (pm.metaAds?.creatives || 0); i++) {
        deliverablesToCreate.push({ clientId: client._id, title: `Meta Ad Creative #${i + 1}`, platform: "meta-ads", type: "ad", status: "pending", scheduledDate: now });
      }
      for (let i = 0; i < (pm.googleAds?.creatives || 0); i++) {
        deliverablesToCreate.push({ clientId: client._id, title: `Google Ad Creative #${i + 1}`, platform: "google-ads", type: "ad", status: "pending", scheduledDate: now });
      }
      for (let i = 0; i < (pm.linkedinAds?.creatives || 0); i++) {
        deliverablesToCreate.push({ clientId: client._id, title: `LinkedIn Ad Creative #${i + 1}`, platform: "linkedin-ads", type: "ad", status: "pending", scheduledDate: now });
      }
    }

    // Email / Whatsapp
    const ew = sow.emailWhatsapp;
    if (ew) {
      if (ew.transactional?.enabled && ew.transactional.triggers > 0) {
        deliverablesToCreate.push({ clientId: client._id, title: `Transactional Triggers Setup (${ew.transactional.triggers} flows)`, platform: "email-whatsapp", type: "seo-task", status: "pending", scheduledDate: now });
      }
      for (let i = 0; i < (ew.promotional?.emails || 0); i++) {
        deliverablesToCreate.push({ clientId: client._id, title: `Promotional Blast #${i + 1}`, platform: "email-whatsapp", type: "email-blast", status: "pending", scheduledDate: now });
      }
    }

    // SEO
    const seo = sow.seo;
    if (seo && seo.keywords?.length > 0) {
      deliverablesToCreate.push({ clientId: client._id, title: `SEO Keywords Audit & Setup (${seo.keywords.length} keywords)`, platform: "seo", type: "seo-task", status: "pending", scheduledDate: now });
    }

    // Influencer
    const inf = sow.influencer;
    if (inf && inf.influencersCount > 0) {
      deliverablesToCreate.push({ clientId: client._id, title: `Influencer Coordination (${inf.influencersCount} influencers)`, platform: "influencer", type: "influencer-campaign", status: "pending", scheduledDate: now });
    }

    // Bulk insert deliverables
    if (deliverablesToCreate.length > 0) {
      await CalendarDeliverable.insertMany(deliverablesToCreate);
    }

    await logActivity({ req, action: "ONBOARD_CLIENT_SUCCESS", details: `Onboarded client: ${client.name} (Brand: ${client.brandName}). Seeded ${deliverablesToCreate.length} deliverables.`, status: 201 });

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
