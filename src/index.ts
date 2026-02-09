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
        return new Response(generate404HTML("Diagram not found", "This diagram doesn't exist or may have expired."), {
          status: 404,
          headers: { "Content-Type": "text/html; charset=utf-8" },
        });
      }
      return new Response(generateViewerHTML(diagram), {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    // List available diagrams
    if (url.pathname === "/") {
      return new Response(generateIndexHTML(diagrams), {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    return new Response(generate404HTML("Page not found", "There's nothing at this URL."), {
      status: 404,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
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

function generate404HTML(title: string, message: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Traverse — ${escapeHTML(title)}</title>
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><circle cx='16' cy='16' r='14' fill='%232563eb'/><path d='M10 12h12M10 16h12M10 20h12' stroke='white' stroke-width='2' stroke-linecap='round'/></svg>" />
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --bg: #fafafa; --text: #1a1a1a; --text-muted: #666;
      --border: #e2e2e2; --code-bg: #f4f4f5;
    }
    @media (prefers-color-scheme: dark) {
      :root {
        --bg: #0a0a0a; --text: #e5e5e5; --text-muted: #a3a3a3;
        --border: #262626; --code-bg: #1c1c1e;
      }
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: var(--bg); color: var(--text); min-height: 100vh;
      display: flex; align-items: center; justify-content: center;
    }
    .container { text-align: center; padding: 20px; }
    .code { font-size: 64px; font-weight: 700; color: var(--text-muted); opacity: 0.3; }
    h1 { font-size: 20px; font-weight: 600; margin-top: 8px; }
    p { color: var(--text-muted); font-size: 14px; margin-top: 8px; }
    a {
      display: inline-block; margin-top: 24px; font-size: 13px;
      color: var(--text); text-decoration: none;
      border: 1px solid var(--border); border-radius: 6px;
      padding: 8px 16px; transition: all 0.15s;
    }
    a:hover { border-color: var(--text-muted); background: var(--code-bg); }
  </style>
</head>
<body>
  <div class="container">
    <div class="code">404</div>
    <h1>${escapeHTML(title)}</h1>
    <p>${escapeHTML(message)}</p>
    <a href="/">Back to diagrams</a>
  </div>
</body>
</html>`;
}

function generateIndexHTML(diagrams: Map<string, WalkthroughDiagram>): string {
  const items = [...diagrams.entries()]
    .map(
      ([id, d]) => {
        const nodeCount = Object.keys(d.nodes).length;
        return `<a href="/diagram/${id}" class="diagram-item">
          <span class="diagram-title">${escapeHTML(d.summary)}</span>
          <span class="diagram-meta">${nodeCount} node${nodeCount !== 1 ? "s" : ""}</span>
        </a>`;
      },
    )
    .join("\n");

  const content = diagrams.size === 0
    ? `<div class="empty">
        <div class="empty-icon">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <rect x="8" y="8" width="32" height="32" rx="4"/>
            <circle cx="20" cy="20" r="3"/><circle cx="28" cy="28" r="3"/>
            <path d="M22 21l4 5"/>
          </svg>
        </div>
        <p>No diagrams yet.</p>
        <p class="hint">Use the <code>walkthrough_diagram</code> MCP tool to create one.</p>
      </div>`
    : `<div class="diagram-list">${items}</div>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Traverse</title>
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><circle cx='16' cy='16' r='14' fill='%232563eb'/><path d='M10 12h12M10 16h12M10 20h12' stroke='white' stroke-width='2' stroke-linecap='round'/></svg>" />
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --bg: #fafafa; --bg-panel: #ffffff; --border: #e2e2e2;
      --text: #1a1a1a; --text-muted: #666; --accent: #2563eb;
      --code-bg: #f4f4f5;
    }
    @media (prefers-color-scheme: dark) {
      :root {
        --bg: #0a0a0a; --bg-panel: #141414; --border: #262626;
        --text: #e5e5e5; --text-muted: #a3a3a3; --accent: #3b82f6;
        --code-bg: #1c1c1e;
      }
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: var(--bg); color: var(--text); min-height: 100vh;
    }
    .header {
      padding: 48px 20px 32px;
      max-width: 520px; margin: 0 auto;
    }
    .header h1 {
      font-size: 24px; font-weight: 700;
      display: flex; align-items: center; gap: 10px;
    }
    .header h1 span {
      font-size: 11px; font-weight: 600; text-transform: uppercase;
      letter-spacing: 0.05em; color: var(--text-muted);
      background: var(--code-bg); padding: 3px 8px;
      border-radius: 4px;
    }
    .header p { color: var(--text-muted); font-size: 14px; margin-top: 8px; }
    .diagram-list {
      max-width: 520px; margin: 0 auto; padding: 0 20px 48px;
      display: flex; flex-direction: column; gap: 8px;
    }
    .diagram-item {
      display: flex; align-items: center; justify-content: space-between;
      padding: 14px 16px; border: 1px solid var(--border);
      border-radius: 8px; text-decoration: none; color: var(--text);
      transition: border-color 0.15s, background 0.15s;
    }
    .diagram-item:hover {
      border-color: var(--text-muted); background: var(--code-bg);
    }
    .diagram-title { font-size: 14px; font-weight: 500; }
    .diagram-meta {
      font-size: 12px; color: var(--text-muted);
      flex-shrink: 0; margin-left: 12px;
    }
    .empty {
      max-width: 520px; margin: 0 auto; padding: 60px 20px;
      text-align: center; color: var(--text-muted);
    }
    .empty-icon { margin-bottom: 16px; opacity: 0.4; }
    .empty p { font-size: 15px; }
    .empty .hint { font-size: 13px; margin-top: 8px; }
    .empty code {
      background: var(--code-bg); padding: 2px 6px;
      border-radius: 3px; font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Traverse <span>v0.1</span></h1>
    <p>Interactive code walkthrough diagrams</p>
  </div>
  ${content}
</body>
</html>`;
}

function escapeHTML(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
