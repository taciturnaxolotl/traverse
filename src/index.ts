import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod/v4";
import { generateViewerHTML } from "./template.ts";
import type { WalkthroughDiagram } from "./types.ts";
import { initDb, loadAllDiagrams, saveDiagram, deleteDiagramFromDb, generateId, getSharedUrl, saveSharedUrl } from "./storage.ts";
import { loadConfig } from "./config.ts";

const PORT = parseInt(process.env.TRAVERSE_PORT || "4173", 10);
const MODE = (process.env.TRAVERSE_MODE || "local") as "local" | "server";
const GIT_HASH = await Bun.$`git rev-parse --short HEAD`.text().then(s => s.trim()).catch(() => "dev");

// Load config and init persistence
const config = loadConfig();
initDb();

// Load persisted diagrams
const diagrams = loadAllDiagrams();

// --- Web server for serving interactive diagrams ---
let isClient = false;

try {
  Bun.serve({
    port: PORT,
    async fetch(req) {
      const url = new URL(req.url);
      const diagramMatch = url.pathname.match(/^\/diagram\/([\w-]+)$/);

      if (diagramMatch) {
        const id = diagramMatch[1]!;
        const diagram = diagrams.get(id);
        if (!diagram) {
          return new Response(generate404HTML("Diagram not found", "This diagram doesn't exist or may have expired."), {
            status: 404,
            headers: { "Content-Type": "text/html; charset=utf-8" },
          });
        }
        const existingShareUrl = getSharedUrl(id);
        return new Response(generateViewerHTML(diagram, GIT_HASH, process.cwd(), {
          mode: MODE,
          shareServerUrl: config.shareServerUrl,
          diagramId: id,
          existingShareUrl: existingShareUrl ?? undefined,
        }), {
          headers: { "Content-Type": "text/html; charset=utf-8" },
        });
      }

      // DELETE /api/diagrams/:id
      const apiMatch = url.pathname.match(/^\/api\/diagrams\/([\w-]+)$/);
      if (apiMatch && req.method === "DELETE") {
        const id = apiMatch[1]!;
        if (!diagrams.has(id)) {
          return Response.json({ error: "not found" }, { status: 404 });
        }
        diagrams.delete(id);
        deleteDiagramFromDb(id);
        return Response.json({ ok: true, id });
      }

      // POST /api/diagrams/:id/shared-url — save a shared URL for a local diagram
      const sharedUrlMatch = url.pathname.match(/^\/api\/diagrams\/([\w-]+)\/shared-url$/);
      if (sharedUrlMatch && req.method === "POST") {
        const id = sharedUrlMatch[1]!;
        try {
          const body = await req.json() as { url: string };
          if (!body.url) {
            return Response.json({ error: "missing required field: url" }, { status: 400 });
          }
          saveSharedUrl(id, body.url);
          return Response.json({ ok: true, id, url: body.url });
        } catch {
          return Response.json({ error: "invalid JSON body" }, { status: 400 });
        }
      }

      // GET /api/diagrams/:id/shared-url — retrieve a stored shared URL
      if (sharedUrlMatch && req.method === "GET") {
        const id = sharedUrlMatch[1]!;
        const sharedUrl = getSharedUrl(id);
        if (!sharedUrl) {
          return Response.json({ url: null });
        }
        return Response.json({ url: sharedUrl });
      }

      // POST /api/diagrams — accept diagrams from remote or sibling instances
      if (url.pathname === "/api/diagrams" && req.method === "POST") {
        try {
          const body = await req.json() as WalkthroughDiagram;
          if (!body.code || !body.summary || !body.nodes) {
            return Response.json({ error: "missing required fields: code, summary, nodes" }, { status: 400 });
          }
          const id = generateId();
          const diagram: WalkthroughDiagram = {
            code: body.code,
            summary: body.summary,
            nodes: body.nodes,
            createdAt: new Date().toISOString(),
          };
          diagrams.set(id, diagram);
          saveDiagram(id, diagram);
          const diagramUrl = `${url.origin}/diagram/${id}`;
          return Response.json({ id, url: diagramUrl }, {
            status: 201,
            headers: {
              "Access-Control-Allow-Origin": "*",
            },
          });
        } catch {
          return Response.json({ error: "invalid JSON body" }, { status: 400 });
        }
      }

      // OPTIONS /api/diagrams — CORS preflight
      if (url.pathname === "/api/diagrams" && req.method === "OPTIONS") {
        return new Response(null, {
          status: 204,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
          },
        });
      }

      if (url.pathname === "/icon.svg") {
        return new Response(Bun.file(import.meta.dir + "/../icon.svg"), {
          headers: { "Content-Type": "image/svg+xml" },
        });
      }

      // List available diagrams
      if (url.pathname === "/") {
        const html = MODE === "server"
          ? generateServerIndexHTML(diagrams.size, GIT_HASH)
          : generateLocalIndexHTML(diagrams, GIT_HASH);
        return new Response(html, {
          headers: { "Content-Type": "text/html; charset=utf-8" },
        });
      }

      return new Response(generate404HTML("Page not found", "There's nothing at this URL."), {
        status: 404,
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    },
  });
} catch {
  isClient = true;
  console.error(`Web server already running on port ${PORT}, running in client mode`);
}

// --- MCP Server (local mode only) ---
if (MODE === "local") {
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
    let diagramUrl: string;

    if (isClient) {
      // POST diagram to the existing web server instance
      const res = await fetch(`http://localhost:${PORT}/api/diagrams`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, summary, nodes }),
      });
      if (!res.ok) {
        return {
          content: [{ type: "text", text: `Failed to send diagram to server: ${res.statusText}` }],
        };
      }
      const data = await res.json() as { id: string; url: string };
      diagramUrl = data.url;
    } else {
      const id = generateId();
      const diagram: WalkthroughDiagram = {
        code,
        summary,
        nodes,
        createdAt: new Date().toISOString(),
      };
      diagrams.set(id, diagram);
      saveDiagram(id, diagram);
      diagramUrl = `http://localhost:${PORT}/diagram/${id}`;
    }

    return {
      content: [
        {
          type: "text",
          text: `Interactive diagram ready.\n\nOpen in browser: ${diagramUrl}\n\nClick nodes in the diagram to explore details about each component.`,
        },
      ],
    };
  });

  // Connect MCP server to stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

function generate404HTML(title: string, message: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Traverse — ${escapeHTML(title)}</title>
  <link rel="icon" href="/icon.svg" type="image/svg+xml" />
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

function generateLocalIndexHTML(diagrams: Map<string, WalkthroughDiagram>, gitHash: string): string {
  const items = [...diagrams.entries()]
    .map(
      ([id, d]) => {
        const nodes = Object.values(d.nodes);
        const nodeCount = nodes.length;
        const preview = nodes.slice(0, 4).map(n => escapeHTML(n.title));
        const extra = nodeCount > 4 ? ` <span class="more">+${nodeCount - 4}</span>` : "";
        const tags = preview.map(t => `<span class="tag">${t}</span>`).join("") + extra;
        return `<div class="diagram-item-wrap">
          <a href="/diagram/${id}" class="diagram-item">
            <div class="diagram-header">
              <span class="diagram-title">${escapeHTML(d.summary)}</span>
              <span class="diagram-meta">${nodeCount} node${nodeCount !== 1 ? "s" : ""}</span>
            </div>
            <div class="diagram-tags">${tags}</div>
          </a>
          <button class="delete-btn" onclick="deleteDiagram('${escapeHTML(id)}', this)" title="Delete diagram">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M2 4h12M5.333 4V2.667a1.333 1.333 0 011.334-1.334h2.666a1.333 1.333 0 011.334 1.334V4m2 0v9.333a1.333 1.333 0 01-1.334 1.334H4.667a1.333 1.333 0 01-1.334-1.334V4h9.334z"/>
            </svg>
          </button>
        </div>`;
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
  <link rel="icon" href="/icon.svg" type="image/svg+xml" />
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
      display: flex; flex-direction: column;
    }
    .main-content { flex: 1; }
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
      display: flex; flex-direction: column; gap: 12px;
    }
    .diagram-item-wrap {
      position: relative;
      display: flex;
      align-items: stretch;
      gap: 0;
    }
    .diagram-item {
      display: flex; flex-direction: column; gap: 10px;
      padding: 16px; border: 1px solid var(--border);
      border-radius: 8px; text-decoration: none; color: var(--text);
      transition: border-color 0.15s, background 0.15s;
      flex: 1;
      min-width: 0;
    }
    .diagram-item:hover {
      border-color: var(--text-muted); background: var(--code-bg);
    }
    .delete-btn {
      position: absolute;
      top: 8px;
      right: 8px;
      background: none;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      padding: 4px;
      border-radius: 4px;
      opacity: 0;
      transition: opacity 0.15s, color 0.15s, background 0.15s;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .diagram-item-wrap:hover .delete-btn {
      opacity: 1;
    }
    .delete-btn:hover {
      color: #ef4444;
      background: rgba(239, 68, 68, 0.1);
    }
    .diagram-header {
      display: flex; align-items: center; justify-content: space-between;
    }
    .diagram-title { font-size: 14px; font-weight: 500; }
    .diagram-meta {
      font-size: 12px; color: var(--text-muted);
      flex-shrink: 0; margin-left: 12px;
    }
    .diagram-tags {
      display: flex; flex-wrap: wrap; gap: 6px; align-items: center;
    }
    .diagram-tags .tag {
      font-size: 11px; color: var(--text-muted);
      background: var(--code-bg); padding: 2px 8px;
      border-radius: 4px;
    }
    .diagram-tags .more {
      font-size: 11px; color: var(--text-muted); opacity: 0.6;
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
    .site-footer {
      padding: 32px 20px;
      font-size: 13px; color: var(--text-muted);
      display: flex; justify-content: space-between; align-items: center;
    }
    .site-footer .heart { color: #e25555; }
    .site-footer a { color: var(--text); text-decoration: none; }
    .site-footer a:hover { text-decoration: underline; }
    .site-footer .hash {
      font-family: "SF Mono", "Fira Code", monospace;
      font-size: 11px; opacity: 0.6;
      color: var(--text-muted) !important;
    }
  </style>
</head>
<body>
  <div class="main-content">
    <div class="header">
      <h1>Traverse <span>v0.1</span></h1>
      <p>Interactive code walkthrough diagrams</p>
    </div>
    ${content}
  </div>
  <footer class="site-footer">
    <span>Made with &#x2764;&#xFE0F; by <a href="https://dunkirk.sh">Kieran Klukas</a></span>
    <a class="hash" href="https://github.com/taciturnaxolotl/traverse/commit/${escapeHTML(gitHash)}">${escapeHTML(gitHash)}</a>
  </footer>
  <script>
    async function deleteDiagram(id, btn) {
      if (!confirm('Delete this diagram?')) return;
      try {
        const res = await fetch('/api/diagrams/' + id, { method: 'DELETE' });
        if (res.ok) {
          const wrap = btn.closest('.diagram-item-wrap');
          wrap.remove();
          // If no diagrams left, reload to show empty state
          if (!document.querySelector('.diagram-item-wrap')) {
            location.reload();
          }
        }
      } catch (e) {
        console.error('Failed to delete diagram:', e);
      }
    }
  </script>
</body>
</html>`;
}

function generateServerIndexHTML(diagramCount: number, gitHash: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Traverse</title>
  <link rel="icon" href="/icon.svg" type="image/svg+xml" />
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
      display: flex; flex-direction: column; align-items: center; justify-content: center;
    }
    .landing {
      max-width: 480px; text-align: center; padding: 40px 20px;
    }
    .landing h1 {
      font-size: 32px; font-weight: 700; margin-bottom: 8px;
    }
    .landing .tagline {
      color: var(--text-muted); font-size: 16px; line-height: 1.5;
      margin-bottom: 32px;
    }
    .stat {
      display: inline-flex; align-items: center; gap: 8px;
      background: var(--code-bg); border: 1px solid var(--border);
      border-radius: 8px; padding: 10px 20px;
      font-size: 14px; color: var(--text-muted);
      margin-bottom: 32px;
    }
    .stat strong {
      font-size: 20px; font-weight: 700; color: var(--text);
      font-variant-numeric: tabular-nums;
    }
    .github-btn {
      display: inline-flex; align-items: center; gap: 8px;
      background: var(--text); color: var(--bg);
      border: none; border-radius: 8px;
      padding: 12px 24px; font-size: 15px; font-weight: 500;
      text-decoration: none; transition: opacity 0.15s;
      font-family: inherit;
    }
    .github-btn:hover { opacity: 0.85; }
    .github-btn svg { flex-shrink: 0; }
    .site-footer {
      position: fixed; bottom: 0; left: 0; right: 0;
      padding: 20px;
      font-size: 13px; color: var(--text-muted);
      display: flex; justify-content: space-between; align-items: center;
    }
    .site-footer a { color: var(--text); text-decoration: none; }
    .site-footer a:hover { text-decoration: underline; }
    .site-footer .hash {
      font-family: "SF Mono", "Fira Code", monospace;
      font-size: 11px; opacity: 0.6;
      color: var(--text-muted) !important;
    }
  </style>
</head>
<body>
  <div class="landing">
    <h1>Traverse</h1>
    <p class="tagline">Interactive code walkthrough diagrams, shareable with anyone. Powered by an MCP server you run locally.</p>
    <div class="stat">
      <strong>${diagramCount}</strong> diagram${diagramCount !== 1 ? "s" : ""} shared
    </div>
    <br /><br />
    <a class="github-btn" href="https://github.com/taciturnaxolotl/traverse">
      <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>
      View on GitHub
    </a>
  </div>
  <footer class="site-footer">
    <span>Made with &#x2764;&#xFE0F; by <a href="https://dunkirk.sh">Kieran Klukas</a></span>
    <a class="hash" href="https://github.com/taciturnaxolotl/traverse/commit/${escapeHTML(gitHash)}">${escapeHTML(gitHash)}</a>
  </footer>
</body>
</html>`;
}

function escapeHTML(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
