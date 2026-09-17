import Anthropic from "@anthropic-ai/sdk";
import { AIClientContext, AIResearchResult } from "@/lib/ai/type";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const MODEL =
  process.env.AI_ANTHROPIC_MODEL ||
  "claude-sonnet-5";

function extractText(response: Anthropic.Message) {
  return response.content
    .filter(
      (
        block
      ): block is Anthropic.TextBlock =>
        block.type === "text"
    )
    .map((block) => block.text)
    .join("\n");
}

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
    "Claude did not return valid JSON."
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
  clientContext: AIClientContext
) {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error(
      "ANTHROPIC_API_KEY is not configured."
    );
  }

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

  const messages: Anthropic.MessageParam[] = [
    {
      role: "user",
      content: userMessage,
    },
  ];

  let response =
    await anthropic.messages.create({
      model: MODEL,

      max_tokens: 12000,

      system: systemPrompt,

      messages,

      tools: [
        {
          type: "web_search_20250305",
          name: "web_search",

          max_uses: 10,
        },
      ],
    });

  /*
   * The web-search server tool runs its own loop. If it reaches the server's
   * iteration limit before Claude finishes, the turn ends with
   * "pause_turn" — re-send the conversation to let it resume. Bounded so a
   * misbehaving turn can't loop forever.
   */
  let resumeGuard = 0;

  while (
    response.stop_reason === "pause_turn" &&
    resumeGuard < 3
  ) {
    messages.push({
      role: "assistant",
      content: response.content,
    });

    response = await anthropic.messages.create({
      model: MODEL,

      max_tokens: 12000,

      system: systemPrompt,

      messages,

      tools: [
        {
          type: "web_search_20250305",
          name: "web_search",

          max_uses: 10,
        },
      ],
    });

    resumeGuard += 1;
  }

  let inputTokens =
    response.usage?.input_tokens ?? 0;

  let outputTokens =
    response.usage?.output_tokens ?? 0;

  const webSearchCount =
    response.usage?.server_tool_use
      ?.web_search_requests ?? 0;

  let text = extractText(response);

  console.log(
    "Claude raw response:",
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

    messages.push({
      role: "assistant",
      content: response.content,
    });

    messages.push({
      role: "user",
      content: `Now output ONLY the final research as a single valid JSON object, based on your research above.

Return only the JSON — no commentary, no markdown, no code fences. If some information could not be verified, use empty strings or empty arrays rather than omitting fields or refusing.

Use exactly this structure:

${RESEARCH_JSON_STRUCTURE}`,
    });

    const followup =
      await anthropic.messages.create({
        model: MODEL,

        max_tokens: 12000,

        system: systemPrompt,

        messages,
      });

    inputTokens +=
      followup.usage?.input_tokens ?? 0;

    outputTokens +=
      followup.usage?.output_tokens ?? 0;

    text = extractText(followup);

    parsed = tryParseResearch(text);
  }

  if (!parsed) {
    console.error(
      "Claude JSON parsing failed after follow-up."
    );

    console.error(
      "Raw Claude response:",
      text
    );

    throw new Error(
      "Claude returned an invalid research response."
    );
  }

  const result =
    validateResearchResult(parsed);

  return {
    result,

    inputTokens,

    outputTokens,

    webSearchCount,

    rawResponse: response,
  };
}