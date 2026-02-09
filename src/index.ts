import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod/v4";
import { generateViewerHTML } from "./template.ts";
import type { WalkthroughDiagram } from "./types.ts";

const PORT = parseInt(process.env.TRAVERSE_PORT || "4173", 10);

// In-memory diagram store
const diagrams = new Map<string, WalkthroughDiagram>();
let diagramCounter = 0;

// --- Web server for serving interactive diagrams ---
Bun.serve({
  port: PORT,
  fetch(req) {
    const url = new URL(req.url);
    const match = url.pathname.match(/^\/diagram\/(\w+)$/);

    if (match) {
      const id = match[1]!;
      const diagram = diagrams.get(id);
      if (!diagram) {
        return new Response("Diagram not found", { status: 404 });
      }
      return new Response(generateViewerHTML(diagram), {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    // List available diagrams
    if (url.pathname === "/") {
      if (diagrams.size === 0) {
        return new Response(
          "<html><body style='font-family:system-ui;padding:40px;color:#666'><h2>Traverse</h2><p>No diagrams yet. Use the MCP tool to create one.</p></body></html>",
          { headers: { "Content-Type": "text/html" } },
        );
      }
      const links = [...diagrams.entries()]
        .map(
          ([id, d]) =>
            `<li><a href="/diagram/${id}">${escapeHTML(d.summary)}</a></li>`,
        )
        .join("\n");
      return new Response(
        `<html><body style='font-family:system-ui;padding:40px'><h2>Traverse</h2><ul>${links}</ul></body></html>`,
        { headers: { "Content-Type": "text/html" } },
      );
    }

    return new Response("Not found", { status: 404 });
  },
});

// --- MCP Server ---
const server = new McpServer({
  name: "traverse",
  version: "0.1.0",
});

const nodeMetadataSchema = z.object({
  title: z.string(),
  description: z.string(),
  links: z
    .array(z.object({ label: z.string(), url: z.string() }))
    .optional(),
  codeSnippet: z.string().optional(),
});

server.registerTool("walkthrough_diagram", {
  title: "Walkthrough Diagram",
  description: `Render an interactive Mermaid diagram where users can click nodes to see details.

BEFORE calling this tool, deeply explore the codebase:
1. Use search/read tools to find key files, entry points, and architecture patterns
2. Trace execution paths and data flow between components
3. Read source files — don't guess from filenames

Then build the diagram:
- Use \`flowchart TB\` with plain text labels, no HTML or custom styling
- 5-12 nodes at the right abstraction level (not too granular, not too high-level)
- Node keys must match Mermaid node IDs exactly
- Descriptions: 2-3 paragraphs of markdown per node. Write for someone who has never seen this codebase — explain what the component does, how it works, and why it matters. Use \`code spans\` for identifiers and markdown headers to organize longer explanations
- Links: include file:line references from your exploration
- Code snippets: key excerpts (under 15 lines) showing the most important or representative code`,
  inputSchema: z.object({
    code: z.string(),
    summary: z.string(),
    nodes: z.record(z.string(), nodeMetadataSchema),
  }),
}, async ({ code, summary, nodes }) => {
  const id = String(++diagramCounter);
  const diagram: WalkthroughDiagram = { code, summary, nodes };
  diagrams.set(id, diagram);

  const url = `http://localhost:${PORT}/diagram/${id}`;

  return {
    content: [
      {
        type: "text",
        text: `Interactive diagram ready.\n\nOpen in browser: ${url}\n\nClick nodes in the diagram to explore details about each component.`,
      },
    ],
  };
});

// Connect MCP server to stdio transport
const transport = new StdioServerTransport();
await server.connect(transport);

function escapeHTML(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
