import { NextRequest, NextResponse } from "next/server";

import { connectDB } from "@/lib/db";

import { AIResearch } from "@/lib/models/ai/ai-research";
import { AIClientProfile } from "@/lib/models/ai/ai-clientprofile";
import { AICompetitor } from "@/lib/models/ai/ai-competitor";

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();

    const {
      researchId,
      result,
    } = body;

    if (!researchId) {
      return NextResponse.json(
        {
          success: false,
          message: "researchId is required",
        },
        { status: 400 }
      );
    }

    if (!result) {
      return NextResponse.json(
        {
          success: false,
          message: "Research result is required",
        },
        { status: 400 }
      );
    }

    const research =
      await AIResearch.findById(researchId);

    if (!research) {
      return NextResponse.json(
        {
          success: false,
          message: "Research not found",
        },
        { status: 404 }
      );
    }

    if (research.status !== "completed") {
      return NextResponse.json(
        {
          success: false,
          message:
            "Only completed research can be saved",
        },
        { status: 400 }
      );
    }

    const clientId = research.clientId;

    /*
     * Create new profile version.
     */

    const previousProfile =
      await AIClientProfile.findOne({
        clientId,
      })
        .sort({ version: -1 })
        .lean();

    const newVersion =
      previousProfile
        ? previousProfile.version + 1
        : 1;

    /*
     * Mark all previous profiles as not current.
     */
    await AIClientProfile.updateMany(
      { clientId },
      { $set: { isCurrent: false } }
    );

    /*
     * Save client intelligence.
     */

    const profile =
      await AIClientProfile.create({
        clientId,

        researchId,

        businessSummary:
          result.businessAnalysis?.businessSummary,

        industry:
          result.businessAnalysis?.industry,

        services:
          result.businessAnalysis?.services || [],

        targetAudience:
          result.businessAnalysis?.targetAudience || [],

        positioning:
          result.businessAnalysis?.positioning,

        valuePropositions:
          result.businessAnalysis?.valuePropositions || [],

        brandTone:
          result.businessAnalysis?.brandTone || [],

        contentThemes:
          result.businessAnalysis?.contentThemes || [],

        differentiationOpportunities:
          result.differentiationOpportunities || [],

        verifiedFacts:
          result.verifiedFacts || [],

        version: newVersion,

        isCurrent: true,
      });

    /*
     * Save competitors.
     */

    const competitors =
      Array.isArray(result.competitors)
        ? result.competitors
        : [];

    const competitorDocuments =
      competitors.map((competitor: any) => ({
        clientId,

        researchId,

        name: competitor.name,

        website: competitor.website,

        location: competitor.location,

        industry: competitor.industry,

        services:
          competitor.services || [],

        targetAudience:
          competitor.targetAudience || [],

        positioning:
          competitor.positioning,

        valuePropositions:
          competitor.valuePropositions || [],

        contentThemes:
          competitor.contentThemes || [],

        socialPlatforms:
          competitor.socialPlatforms || [],

        strengths:
          competitor.strengths || [],

        weaknesses:
          competitor.weaknesses || [],

        differentiation:
          competitor.differentiation,

        sources:
          competitor.sources || [],

        verified: false,
      }));

    let savedCompetitors: any[] = [];

    if (competitorDocuments.length > 0) {
      savedCompetitors =
        await AICompetitor.insertMany(
          competitorDocuments
        );
    }

    return NextResponse.json({
      success: true,

      message:
        "AI research saved successfully",

      profileId: profile._id,

      competitorIds:
        savedCompetitors.map(
          (item) => item._id
        ),

      version: newVersion,
    });
  } catch (error: any) {
    console.error(
      "Save AI research error:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        message:
          error?.message ||
          "Failed to save AI research",
      },
      { status: 500 }
    );
  }
}