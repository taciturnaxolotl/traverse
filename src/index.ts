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
  title: z.string().describe("Display name for the node"),
  description: z
    .string()
    .describe("Detailed markdown explanation of this component"),
  links: z
    .array(
      z.object({
        label: z.string().describe("Display text, e.g. src/auth.ts"),
        url: z.string().describe("File path or URL"),
      }),
    )
    .optional()
    .describe("Related files or documentation"),
  codeSnippet: z.string().optional().describe("Optional code example"),
  threadID: z
    .string()
    .optional()
    .describe("Optional link to deeper exploration thread"),
});

server.registerTool("walkthrough_diagram", {
  title: "Walkthrough Diagram",
  description:
    "Render an interactive Mermaid diagram where users can click nodes to see detailed information about each component. Use plain text labels in Mermaid code, no HTML tags or custom styling.",
  inputSchema: z.object({
    code: z
      .string()
      .describe(
        "Mermaid diagram code. Use plain text labels, no HTML tags. No custom styling/colors.",
      ),
    summary: z
      .string()
      .describe("One-sentence summary of what the diagram illustrates"),
    nodes: z
      .record(z.string(), nodeMetadataSchema)
      .describe(
        "Metadata for clickable nodes, keyed by node ID from mermaid code",
      ),
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
