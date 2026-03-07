/**
 * MCP (Model Context Protocol) framework for document contextualization.
 *
 * Exposes a set of tools that AI models can invoke to process PDFs and images,
 * extract structured study content, and contextualize materials against
 * a student's existing module knowledge.
 *
 * Tools:
 *   extract_text        – Extract raw text from a PDF buffer or text file
 *   extract_topics      – Derive study subtopics from text/image content
 *   contextualize       – Map extracted content to existing module subtopics
 *   summarize_material  – Generate a concise study summary from content
 */

// ── Types ────────────────────────────────────────────────────────────

export interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface McpToolCallRequest {
  tool: string;
  arguments: Record<string, unknown>;
}

export interface McpToolCallResult {
  tool: string;
  success: boolean;
  result?: unknown;
  error?: string;
}

export interface McpListToolsResponse {
  tools: McpToolDefinition[];
}

// ── Tool definitions ─────────────────────────────────────────────────

export const MCP_TOOLS: McpToolDefinition[] = [
  {
    name: "extract_text",
    description:
      "Extract raw text from a document attachment. Accepts a base64-encoded PDF data URL or plain text content string. Returns the extracted text.",
    inputSchema: {
      type: "object",
      properties: {
        content: { type: "string", description: "Plain text content of the file, if available" },
        dataUrl: { type: "string", description: "Base64 data URL of a PDF or image file" },
        mimeType: { type: "string", description: "MIME type of the attachment" },
        maxChars: { type: "number", description: "Maximum characters to return (default 8000)" },
      },
      required: [],
    },
  },
  {
    name: "extract_topics",
    description:
      "Derive study subtopics from document content (text or image). Returns an array of concise topic names suitable for a study plan.",
    inputSchema: {
      type: "object",
      properties: {
        content: { type: "string", description: "Text content to analyze" },
        dataUrl: { type: "string", description: "Image data URL for vision-based topic extraction" },
        moduleName: { type: "string", description: "Name of the parent module for context" },
        maxTopics: { type: "number", description: "Max topics to extract (default 8)" },
      },
      required: ["moduleName"],
    },
  },
  {
    name: "contextualize",
    description:
      "Map extracted content against existing module subtopics. Returns relevance scores, new subtopic suggestions, and gap analysis.",
    inputSchema: {
      type: "object",
      properties: {
        content: { type: "string", description: "Extracted text to contextualize" },
        existingSubtopics: {
          type: "array",
          items: { type: "object", properties: { name: { type: "string" }, mastery: { type: "number" } } },
          description: "Current subtopics in the module",
        },
        moduleName: { type: "string", description: "Name of the parent module" },
      },
      required: ["content", "moduleName"],
    },
  },
  {
    name: "summarize_material",
    description:
      "Generate a concise study summary from uploaded content. Returns key points, definitions, and formulas found in the material.",
    inputSchema: {
      type: "object",
      properties: {
        content: { type: "string", description: "Text content to summarize" },
        moduleName: { type: "string", description: "Module context for summary focus" },
        maxPoints: { type: "number", description: "Maximum key points to return (default 10)" },
      },
      required: ["content"],
    },
  },
];

// ── Tool implementations ─────────────────────────────────────────────

const STOPWORDS = new Set([
  "the", "and", "for", "that", "this", "with", "from", "are", "was",
  "were", "been", "have", "has", "had", "will", "would", "could",
  "should", "may", "might", "shall", "can", "each", "which", "their",
  "there", "than", "then", "also", "into", "about", "more", "some",
  "such", "only", "other", "page", "figure", "table", "chapter",
  "section", "note", "notes", "slide",
]);

function extractSubtopicCandidatesFromText(text: string, fallback: string, max: number): string[] {
  const lines = text
    .split(/\n+/)
    .map((l) => l.replace(/^\d+[.)-]?\s*/, "").replace(/[_*#>`~]/g, " ").replace(/\s+/g, " ").trim())
    .filter((l) => l.length >= 6 && l.length <= 80);

  const candidates = new Map<string, number>();
  for (const line of lines) {
    if (/^(page|figure|table|chapter|section)\b/i.test(line)) continue;
    const score = line.split(" ").filter((w) => w.length >= 4 && !STOPWORDS.has(w.toLowerCase())).length;
    if (score > 0) candidates.set(line, Math.max(candidates.get(line) || 0, score));
  }

  const tokens = text.toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length >= 4 && !STOPWORDS.has(t));
  for (let i = 0; i < tokens.length - 1; i++) {
    const phrase = `${tokens[i]} ${tokens[i + 1]}`;
    const label = phrase.replace(/\b\w/g, (c) => c.toUpperCase());
    candidates.set(label, (candidates.get(label) || 0) + 1);
  }

  const picked = [...candidates.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([c]) => c)
    .filter((c, i, arr) => arr.findIndex((o) => o.toLowerCase() === c.toLowerCase()) === i)
    .slice(0, max);

  return picked.length > 0 ? picked : [`Foundations of ${fallback}`];
}

function contextualizeContent(
  content: string,
  existingSubtopics: Array<{ name: string; mastery: number }>,
  moduleName: string,
): { matches: Array<{ subtopic: string; relevance: number }>; newSuggestions: string[]; gaps: string[] } {
  const contentLower = content.toLowerCase();
  const matches: Array<{ subtopic: string; relevance: number }> = [];

  for (const sub of existingSubtopics) {
    const words = sub.name.toLowerCase().split(/\s+/);
    const hitCount = words.filter((w) => w.length >= 3 && contentLower.includes(w)).length;
    const relevance = words.length > 0 ? Math.round((hitCount / words.length) * 100) : 0;
    if (relevance > 0) matches.push({ subtopic: sub.name, relevance });
  }
  matches.sort((a, b) => b.relevance - a.relevance);

  const existingNames = new Set(existingSubtopics.map((s) => s.name.toLowerCase()));
  const extracted = extractSubtopicCandidatesFromText(content, moduleName, 12);
  const newSuggestions = extracted.filter((t) => !existingNames.has(t.toLowerCase())).slice(0, 5);

  const gaps = existingSubtopics
    .filter((s) => s.mastery < 50)
    .filter((s) => !matches.some((m) => m.subtopic === s.name))
    .map((s) => s.name);

  return { matches, newSuggestions, gaps };
}

function summarizeContent(content: string, maxPoints: number): { keyPoints: string[]; definitions: string[]; formulas: string[] } {
  const sentences = content
    .split(/[.!?]\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 20 && s.length < 300);

  const definitionPatterns = /\b(?:is defined as|refers to|means|is the|describes)\b/i;
  const formulaPattern = /[=$\\∑∫∏]+/;

  const definitions: string[] = [];
  const formulas: string[] = [];
  const keyPoints: string[] = [];

  for (const sentence of sentences) {
    if (definitionPatterns.test(sentence) && definitions.length < maxPoints) {
      definitions.push(sentence);
    } else if (formulaPattern.test(sentence) && formulas.length < maxPoints) {
      formulas.push(sentence);
    } else if (keyPoints.length < maxPoints) {
      keyPoints.push(sentence);
    }
  }

  return {
    keyPoints: keyPoints.slice(0, maxPoints),
    definitions: definitions.slice(0, Math.ceil(maxPoints / 2)),
    formulas: formulas.slice(0, Math.ceil(maxPoints / 2)),
  };
}

// ── Dispatcher ───────────────────────────────────────────────────────

export async function handleToolCall(
  request: McpToolCallRequest,
  apiKey?: string,
): Promise<McpToolCallResult> {
  const args = request.arguments;

  switch (request.tool) {
    case "extract_text": {
      const content = typeof args.content === "string" ? args.content : "";
      const maxChars = typeof args.maxChars === "number" ? args.maxChars : 8000;
      if (content) {
        return { tool: request.tool, success: true, result: { text: content.slice(0, maxChars), length: content.length } };
      }
      // For PDF/image data URLs — the client already handles PDF extraction via pdfjs-dist
      // This tool echoes back content if the client pre-extracted it
      return { tool: request.tool, success: true, result: { text: "", length: 0, note: "Client should pre-extract PDF text using pdfjs-dist before calling this tool." } };
    }

    case "extract_topics": {
      const content = typeof args.content === "string" ? args.content : "";
      const moduleName = typeof args.moduleName === "string" ? args.moduleName : "Untitled";
      const maxTopics = typeof args.maxTopics === "number" ? args.maxTopics : 8;
      const dataUrl = typeof args.dataUrl === "string" ? args.dataUrl : "";

      if (content) {
        const topics = extractSubtopicCandidatesFromText(content, moduleName, maxTopics);
        return { tool: request.tool, success: true, result: { topics, source: "text" } };
      }

      if (dataUrl && apiKey) {
        // Vision-based extraction via OpenAI
        try {
          const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
            body: JSON.stringify({
              model: "gpt-4o-mini",
              temperature: 0.1,
              max_tokens: 180,
              messages: [
                {
                  role: "system",
                  content: 'Extract study topics from images of notes, worksheets, or textbook pages. Return JSON: {"topics":["..."]}. 3-8 concise items max.',
                },
                {
                  role: "user",
                  content: [
                    { type: "text", text: `Extract study subtopics from this image for the module "${moduleName}".` },
                    { type: "image_url", image_url: { url: dataUrl } },
                  ],
                },
              ],
            }),
          });

          if (!response.ok) return { tool: request.tool, success: false, error: `Vision API returned ${response.status}` };
          const data = await response.json();
          const text = data?.choices?.[0]?.message?.content;
          if (typeof text !== "string") return { tool: request.tool, success: false, error: "No content in vision response" };

          const match = text.match(/\{[\s\S]*\}/);
          if (!match) return { tool: request.tool, success: true, result: { topics: [], source: "vision", raw: text } };

          const parsed = JSON.parse(match[0]) as { topics?: string[] };
          const topics = Array.isArray(parsed.topics) ? parsed.topics.map(String).filter(Boolean).slice(0, maxTopics) : [];
          return { tool: request.tool, success: true, result: { topics, source: "vision" } };
        } catch (err) {
          return { tool: request.tool, success: false, error: `Vision extraction failed: ${String(err)}` };
        }
      }

      return { tool: request.tool, success: false, error: "No content or dataUrl provided" };
    }

    case "contextualize": {
      const content = typeof args.content === "string" ? args.content : "";
      const moduleName = typeof args.moduleName === "string" ? args.moduleName : "";
      const subs = Array.isArray(args.existingSubtopics) ? (args.existingSubtopics as Array<{ name: string; mastery: number }>) : [];

      if (!content) return { tool: request.tool, success: false, error: "No content provided" };

      const result = contextualizeContent(content, subs, moduleName);
      return { tool: request.tool, success: true, result };
    }

    case "summarize_material": {
      const content = typeof args.content === "string" ? args.content : "";
      const maxPoints = typeof args.maxPoints === "number" ? args.maxPoints : 10;

      if (!content) return { tool: request.tool, success: false, error: "No content provided" };

      const result = summarizeContent(content, maxPoints);
      return { tool: request.tool, success: true, result };
    }

    default:
      return { tool: request.tool, success: false, error: `Unknown tool: ${request.tool}` };
  }
}
