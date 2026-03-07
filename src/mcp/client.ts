/**
 * Client-side MCP helper to call the document-context MCP tools via the dev server.
 */

import type { McpToolCallResult, McpToolDefinition } from "./document-context";

const MCP_BASE = "/api/mcp";

export async function listMcpTools(): Promise<McpToolDefinition[]> {
  const res = await fetch(`${MCP_BASE}/tools`);
  if (!res.ok) return [];
  const data = (await res.json()) as { tools: McpToolDefinition[] };
  return data.tools ?? [];
}

export async function callMcpTool(
  tool: string,
  args: Record<string, unknown>,
): Promise<McpToolCallResult> {
  const res = await fetch(`${MCP_BASE}/call`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tool, arguments: args }),
  });
  if (!res.ok) {
    return { tool, success: false, error: `HTTP ${res.status}` };
  }
  return (await res.json()) as McpToolCallResult;
}

/** Convenience: extract topics from text content via MCP */
export async function mcpExtractTopics(
  content: string,
  moduleName: string,
): Promise<string[]> {
  const result = await callMcpTool("extract_topics", { content, moduleName });
  if (result.success && result.result) {
    const data = result.result as { topics?: string[] };
    return data.topics ?? [];
  }
  return [];
}

/** Convenience: contextualize content against existing subtopics via MCP */
export async function mcpContextualize(
  content: string,
  moduleName: string,
  existingSubtopics: Array<{ name: string; mastery: number }>,
): Promise<{
  matches: Array<{ subtopic: string; relevance: number }>;
  newSuggestions: string[];
  gaps: string[];
}> {
  const result = await callMcpTool("contextualize", { content, moduleName, existingSubtopics });
  if (result.success && result.result) {
    return result.result as { matches: Array<{ subtopic: string; relevance: number }>; newSuggestions: string[]; gaps: string[] };
  }
  return { matches: [], newSuggestions: [], gaps: [] };
}

/** Convenience: summarize uploaded material via MCP */
export async function mcpSummarize(
  content: string,
  moduleName?: string,
): Promise<{ keyPoints: string[]; definitions: string[]; formulas: string[] }> {
  const result = await callMcpTool("summarize_material", { content, moduleName });
  if (result.success && result.result) {
    return result.result as { keyPoints: string[]; definitions: string[]; formulas: string[] };
  }
  return { keyPoints: [], definitions: [], formulas: [] };
}
