import { AIClientContext, AIResearchResult } from "@/lib/ai/type";
import type { ResolvedTextLLM } from "@/lib/ai/llm/resolve";
import type { TextMessage } from "@/lib/ai/llm/types";

function cleanJson(text: string): string {
  let value = text.trim();

  /*
   * Remove markdown code fences if Claude
   * happens to return them.
   */

  value = value.replace(
    /^```json\s*/i,
    ""
  );

  value = value.replace(
    /^```\s*/i,
    ""
  );

  value = value.replace(
    /\s*```$/i,
    ""
  );

  return value.trim();
}

function extractJsonObject(
  text: string
): string {
  const cleaned = cleanJson(text);

  /*
   * First try the entire response.
   */

  try {
    JSON.parse(cleaned);
    return cleaned;
  } catch {
    // Continue.
  }

  /*
   * Claude occasionally adds explanatory text
   * around the JSON.
   *
   * Try to extract the outermost JSON object.
   */

  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");

  if (
    start !== -1 &&
    end !== -1 &&
    end > start
  ) {
    const possibleJson =
      cleaned.slice(start, end + 1);

    JSON.parse(possibleJson);

    return possibleJson;
  }

  throw new Error(
    "The AI model did not return valid JSON."
  );
}

function validateResearchResult(
  result: any
): AIResearchResult {
  if (!result || typeof result !== "object") {
    throw new Error(
      "AI research result is not an object."
    );
  }

  return {
    businessAnalysis: {
      businessSummary:
        result.businessAnalysis
          ?.businessSummary || "",

      industry:
        result.businessAnalysis
          ?.industry || "",

      services:
        Array.isArray(
          result.businessAnalysis?.services
        )
          ? result.businessAnalysis.services
          : [],

      targetAudience:
        Array.isArray(
          result.businessAnalysis?.targetAudience
        )
          ? result.businessAnalysis.targetAudience
          : [],

      positioning:
        result.businessAnalysis
          ?.positioning || "",

      valuePropositions:
        Array.isArray(
          result.businessAnalysis
            ?.valuePropositions
        )
          ? result.businessAnalysis.valuePropositions
          : [],

      brandTone:
        Array.isArray(
          result.businessAnalysis?.brandTone
        )
          ? result.businessAnalysis.brandTone
          : [],

      contentThemes:
        Array.isArray(
          result.businessAnalysis?.contentThemes
        )
          ? result.businessAnalysis.contentThemes
          : [],
    },

    competitors:
      Array.isArray(result.competitors)
        ? result.competitors.map(
            (competitor: any) => ({
              name:
                competitor?.name || "",

              website:
                competitor?.website || "",

              location:
                competitor?.location || "",

              industry:
                competitor?.industry || "",

              services:
                Array.isArray(
                  competitor?.services
                )
                  ? competitor.services
                  : [],

              targetAudience:
                Array.isArray(
                  competitor?.targetAudience
                )
                  ? competitor.targetAudience
                  : [],

              positioning:
                competitor?.positioning || "",

              valuePropositions:
                Array.isArray(
                  competitor?.valuePropositions
                )
                  ? competitor.valuePropositions
                  : [],

              contentThemes:
                Array.isArray(
                  competitor?.contentThemes
                )
                  ? competitor.contentThemes
                  : [],

              socialPlatforms:
                Array.isArray(
                  competitor?.socialPlatforms
                )
                  ? competitor.socialPlatforms
                  : [],

              strengths:
                Array.isArray(
                  competitor?.strengths
                )
                  ? competitor.strengths
                  : [],

              weaknesses:
                Array.isArray(
                  competitor?.weaknesses
                )
                  ? competitor.weaknesses
                  : [],

              differentiation:
                competitor?.differentiation ||
                "",

              sources:
                Array.isArray(
                  competitor?.sources
                )
                  ? competitor.sources
                  : [],
            })
          )
        : [],

    differentiationOpportunities:
      Array.isArray(
        result.differentiationOpportunities
      )
        ? result.differentiationOpportunities
        : [],

    verifiedFacts:
      Array.isArray(
        result.verifiedFacts
      )
        ? result.verifiedFacts
        : [],

    sources:
      Array.isArray(result.sources)
        ? result.sources
        : [],
  };
}

/*
 * The exact JSON structure Claude must return. Shared between the system
 * prompt and the JSON-only fallback request so both stay in sync.
 */
const RESEARCH_JSON_STRUCTURE = `{
  "businessAnalysis": {
    "businessSummary": "",
    "industry": "",
    "services": [],
    "targetAudience": [],
    "positioning": "",
    "valuePropositions": [],
    "brandTone": [],
    "contentThemes": []
  },
  "competitors": [
    {
      "name": "",
      "website": "",
      "location": "",
      "industry": "",
      "services": [],
      "targetAudience": [],
      "positioning": "",
      "valuePropositions": [],
      "contentThemes": [],
      "socialPlatforms": [],
      "strengths": [],
      "weaknesses": [],
      "differentiation": "",
      "sources": [
        {
          "title": "",
          "url": ""
        }
      ]
    }
  ],
  "differentiationOpportunities": [],
  "verifiedFacts": [
    {
      "fact": "",
      "source": "",
      "url": ""
    }
  ],
  "sources": [
    {
      "title": "",
      "url": ""
    }
  ]
}`;

/*
 * Try to pull a valid JSON object out of Claude's text. Returns null instead
 * of throwing so callers can decide whether to retry.
 */
function tryParseResearch(text: string): any | null {
  try {
    return JSON.parse(extractJsonObject(text));
  } catch {
    return null;
  }
}

export async function runClientResearch(
  adminPrompt: string,
  clientContext: AIClientContext,
  // The workspace's resolved text-generation provider/model (see lib/ai/llm/resolve).
  llm: ResolvedTextLLM
) {
  /*
   * IMPORTANT:
   *
   * The Admin prompt is only the CUSTOM
   * instruction.
   *
   * It does NOT replace the mandatory
   * research/output instructions.
   */

  const systemPrompt = `
You are the CreativeOS Client Intelligence Agent.

Your task is to research and analyze a client's business
using the client information provided to you.

You have access to a web search tool.

You MUST perform the research yourself.

You MUST NOT ask the user to provide the client name,
website, industry, or other information if that information
is already present in the CLIENT CONTEXT.

Use the CLIENT CONTEXT as your starting point.

Your research should cover:

1. Business understanding
2. Official website
3. Products/services
4. Industry
5. Target audience
6. Business positioning
7. Value propositions
8. Brand communication/tone
9. Content themes
10. Relevant competitors
11. Competitor services
12. Competitor positioning
13. Competitor target audiences
14. Competitor content themes
15. Competitor strengths and weaknesses
16. Potential differentiation opportunities

Research rules:

- Search the web when appropriate.
- Prefer official company websites.
- Prefer authoritative sources.
- Do not invent facts.
- Do not claim something is verified unless there is evidence.
- Clearly distinguish verified facts from analysis.
- Include source URLs.
- If information cannot be verified, say so.
- Do not ask the user for information that is already present
  in CLIENT CONTEXT.

IMPORTANT OUTPUT RULE:

Return ONLY valid JSON.

Do not return:
- Markdown
- Code fences
- Explanations
- Introductory text
- Questions
- "I'd be happy to help"
- Anything before or after the JSON.

The JSON MUST follow this structure:

${RESEARCH_JSON_STRUCTURE}
`;

  const userMessage = `
ADMIN RESEARCH INSTRUCTIONS:

${adminPrompt}

CLIENT CONTEXT:

${JSON.stringify(
  clientContext,
  null,
  2
)}

Now perform the research.

Remember:

- Do not ask me for client information.
- The client information is already provided above.
- Use web search when required.
- Return ONLY valid JSON.
`;

  const messages: TextMessage[] = [
    {
      role: "user",
      content: userMessage,
    },
  ];

  /*
   * The adapter runs the provider's web-search loop (including resuming
   * paused turns) and hands back the full assistant turn for follow-ups.
   */
  const response =
    await llm.generateText({
      maxTokens: 12000,

      system: systemPrompt,

      messages,

      webSearch: { maxUses: 10 },
    });

  let inputTokens =
    response.inputTokens;

  let outputTokens =
    response.outputTokens;

  const webSearchCount =
    response.webSearchCount;

  let text = response.text;

  console.log(
    `${llm.provider} raw response:`,
    text
  );

  let parsed = tryParseResearch(text);

  /*
   * Fallback: weaker models (e.g. Haiku) sometimes narrate between search
   * rounds and end the turn on commentary instead of emitting the JSON,
   * especially for clients with little verifiable web presence. When that
   * happens, ask for the JSON only — no tools — using the research already
   * gathered in this conversation.
   */
  if (!parsed) {
    console.warn(
      "Research response was not valid JSON. Requesting JSON-only follow-up."
    );

    messages.push(response.assistantMessage);

    messages.push({
      role: "user",
      content: `Now output ONLY the final research as a single valid JSON object, based on your research above.

Return only the JSON — no commentary, no markdown, no code fences. If some information could not be verified, use empty strings or empty arrays rather than omitting fields or refusing.

Use exactly this structure:

${RESEARCH_JSON_STRUCTURE}`,
    });

    const followup =
      await llm.generateText({
        maxTokens: 12000,

        system: systemPrompt,

        messages,
      });

    inputTokens +=
      followup.inputTokens;

    outputTokens +=
      followup.outputTokens;

    text = followup.text;

    parsed = tryParseResearch(text);
  }

  if (!parsed) {
    console.error(
      `${llm.provider} JSON parsing failed after follow-up.`
    );

    console.error(
      `Raw ${llm.provider} response:`,
      text
    );

    throw new Error(
      "The AI model returned an invalid research response."
    );
  }

  const result =
    validateResearchResult(parsed);

  return {
    result,

    inputTokens,

    outputTokens,

    webSearchCount,

    provider: response.provider,

    model: response.model,
  };
}