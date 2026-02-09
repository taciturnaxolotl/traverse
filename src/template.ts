import type { WalkthroughDiagram } from "./types.ts";

export function generateViewerHTML(diagram: WalkthroughDiagram): string {
  const diagramJSON = JSON.stringify(diagram);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Traverse — ${escapeHTML(diagram.summary)}</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/highlight.js@11/styles/github-dark.min.css" id="hljs-dark" disabled />
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/highlight.js@11/styles/github.min.css" id="hljs-light" />
  <script src="https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11/build/highlight.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/marked@15/marked.min.js"></script>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --bg: #fafafa;
      --bg-panel: #ffffff;
      --border: #e2e2e2;
      --text: #1a1a1a;
      --text-muted: #666;
      --accent: #2563eb;
      --accent-hover: #1d4ed8;
      --node-hover: rgba(37, 99, 235, 0.08);
      --code-bg: #f4f4f5;
      --summary-bg: #f0f4ff;
      --shadow: 0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04);
      --shadow-lg: 0 4px 12px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04);
    }

    @media (prefers-color-scheme: dark) {
      :root {
        --bg: #0a0a0a;
        --bg-panel: #141414;
        --border: #262626;
        --text: #e5e5e5;
        --text-muted: #a3a3a3;
        --accent: #3b82f6;
        --accent-hover: #60a5fa;
        --node-hover: rgba(59, 130, 246, 0.12);
        --code-bg: #1c1c1e;
        --summary-bg: #111827;
        --shadow: 0 1px 3px rgba(0,0,0,0.3);
        --shadow-lg: 0 4px 12px rgba(0,0,0,0.4);
      }
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: var(--bg);
      color: var(--text);
      height: 100vh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .summary-bar {
      padding: 12px 20px;
      background: var(--summary-bg);
      border-bottom: 1px solid var(--border);
      font-size: 14px;
      color: var(--text-muted);
      flex-shrink: 0;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .summary-bar .label {
      font-weight: 600;
      color: var(--accent);
      text-transform: uppercase;
      font-size: 11px;
      letter-spacing: 0.05em;
    }

    .main {
      display: flex;
      flex: 1;
      overflow: hidden;
    }

    .diagram-container {
      flex: 1;
      overflow: auto;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 32px;
      min-width: 0;
    }

    .diagram-container pre.mermaid {
      width: 100%;
    }

    .diagram-container svg {
      width: 100%;
      height: auto;
    }

    /* Make clickable nodes interactive */
    .diagram-container .node { cursor: pointer; }
    .diagram-container .node:hover rect,
    .diagram-container .node:hover polygon,
    .diagram-container .node:hover circle,
    .diagram-container .node:hover .basic {
      filter: brightness(0.92);
    }

    .node.selected rect,
    .node.selected polygon,
    .node.selected circle,
    .node.selected .basic {
      stroke: var(--accent) !important;
      stroke-width: 2.5px !important;
    }

    .detail-panel {
      width: 420px;
      flex-shrink: 0;
      border-left: 1px solid var(--border);
      background: var(--bg-panel);
      display: none;
      flex-direction: column;
      overflow: hidden;
    }

    .detail-panel.open {
      display: flex;
    }

    @media (max-width: 1300px) {
      .main {
        flex-direction: column;
      }

      .detail-panel {
        width: 100%;
        border-left: none;
        border-top: 1px solid var(--border);
        max-height: 50vh;
      }
    }

    .detail-header {
      padding: 16px 20px;
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-shrink: 0;
    }

    .detail-header h2 {
      font-size: 16px;
      font-weight: 600;
    }

    .close-btn {
      background: none;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      padding: 4px;
      border-radius: 4px;
      font-size: 18px;
      line-height: 1;
      transition: color 0.15s;
    }

    .close-btn:hover { color: var(--text); }

    .detail-body {
      flex: 1;
      overflow-y: auto;
      padding: 20px;
    }

    .detail-body .description {
      font-size: 14px;
      line-height: 1.65;
    }

    .detail-body .description h1,
    .detail-body .description h2,
    .detail-body .description h3 {
      margin-top: 16px;
      margin-bottom: 8px;
    }

    .detail-body .description h1 { font-size: 18px; }
    .detail-body .description h2 { font-size: 16px; }
    .detail-body .description h3 { font-size: 14px; }

    .detail-body .description p { margin-bottom: 12px; }

    .detail-body .description code {
      background: var(--code-bg);
      padding: 2px 5px;
      border-radius: 3px;
      font-size: 13px;
    }

    .detail-body .description pre {
      background: var(--code-bg);
      padding: 12px;
      border-radius: 6px;
      overflow-x: auto;
      margin-bottom: 12px;
    }

    .detail-body .description pre code {
      background: none;
      padding: 0;
    }

    .detail-body .description ul,
    .detail-body .description ol {
      margin-bottom: 12px;
      padding-left: 20px;
    }

    .detail-body .description li { margin-bottom: 4px; }

    .section-label {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-muted);
      margin-top: 20px;
      margin-bottom: 8px;
    }

    .links-list {
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .links-list a {
      color: var(--accent);
      text-decoration: none;
      font-size: 13px;
      font-family: "SF Mono", "Fira Code", monospace;
      padding: 4px 0;
      transition: color 0.15s;
    }

    .links-list a:hover { color: var(--accent-hover); text-decoration: underline; }

    .code-snippet {
      margin-top: 12px;
    }

    .code-snippet pre {
      background: var(--code-bg);
      border-radius: 6px;
      padding: 12px;
      overflow-x: auto;
      font-size: 13px;
      line-height: 1.5;
    }

    /* empty state */
    .empty-hint {
      color: var(--text-muted);
      font-size: 13px;
      text-align: center;
      padding: 40px 20px;
    }
  </style>
</head>
<body>
  <div class="summary-bar">
    <span class="label">Traverse</span>
    <span>${escapeHTML(diagram.summary)}</span>
  </div>

  <div class="main">
    <div class="diagram-container">
      <pre class="mermaid">${escapeHTML(diagram.code)}</pre>
    </div>

    <div class="detail-panel" id="detail-panel">
      <div class="detail-header">
        <h2 id="detail-title">Select a node</h2>
        <button class="close-btn" id="close-btn" aria-label="Close panel">&times;</button>
      </div>
      <div class="detail-body" id="detail-body">
        <div class="empty-hint">Click a node in the diagram to view details.</div>
      </div>
    </div>
  </div>

  <script type="module">
    import mermaid from "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs";

    const DIAGRAM_DATA = ${diagramJSON};

    function initTheme() {
      const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      document.getElementById("hljs-dark").disabled = !dark;
      document.getElementById("hljs-light").disabled = dark;
    }
    initTheme();
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", initTheme);

    async function init() {
      const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      await mermaid.initialize({
        startOnLoad: true,
        theme: dark ? "dark" : "default",
        flowchart: { useMaxWidth: false, htmlLabels: true, curve: "basis" },
        securityLevel: "loose",
      });

      // Wait for mermaid to finish rendering
      await mermaid.run();

      // Set viewBox so the SVG scales to fit the container
      requestAnimationFrame(() => {
        fitDiagram();
        attachClickHandlers();
      });

      window.addEventListener("resize", fitDiagram);
    }

    function fitDiagram() {
      const svg = document.querySelector(".diagram-container svg");
      if (!svg) return;

      // Read the intrinsic size mermaid rendered
      const bbox = svg.getBBox();
      const pad = 20;
      const vb = \`\${bbox.x - pad} \${bbox.y - pad} \${bbox.width + pad * 2} \${bbox.height + pad * 2}\`;
      svg.setAttribute("viewBox", vb);
      svg.removeAttribute("width");
      svg.removeAttribute("height");
    }

    function attachClickHandlers() {
      const svg = document.querySelector(".diagram-container svg");
      if (!svg) return;

      const nodeIds = Object.keys(DIAGRAM_DATA.nodes);

      // Find all node groups in the SVG
      const allNodes = svg.querySelectorAll(".node");

      allNodes.forEach(nodeEl => {
        // Extract node ID from the element
        const id = nodeEl.id;
        if (!id) return;

        // Match against our known node IDs
        const matchedId = nodeIds.find(nid =>
          id === nid ||
          id.endsWith("-" + nid) ||
          id.startsWith("flowchart-" + nid + "-") ||
          id.includes("-" + nid + "-")
        );

        if (matchedId) {
          nodeEl.style.cursor = "pointer";
          nodeEl.dataset.nodeId = matchedId;
          nodeEl.addEventListener("click", (e) => {
            e.stopPropagation();
            selectNode(matchedId, nodeEl);
          });
        }
      });

      // Click outside to deselect
      document.addEventListener("click", (e) => {
        if (!e.target.closest(".detail-panel") && !e.target.closest(".node")) {
          deselectAll();
        }
      });
    }

    let selectedEl = null;

    function selectNode(nodeId, el) {
      const meta = DIAGRAM_DATA.nodes[nodeId];
      if (!meta) return;

      // Update selection styling
      if (selectedEl) selectedEl.classList.remove("selected");
      el.classList.add("selected");
      selectedEl = el;

      // Update panel
      const panel = document.getElementById("detail-panel");
      const title = document.getElementById("detail-title");
      const body = document.getElementById("detail-body");

      title.textContent = meta.title;

      let html = '<div class="description">' + marked.parse(meta.description) + "</div>";

      if (meta.links && meta.links.length > 0) {
        html += '<div class="section-label">Related Files</div>';
        html += '<ul class="links-list">';
        meta.links.forEach(link => {
          html += '<li><a href="' + escapeAttr(link.url) + '">' + escapeText(link.label) + "</a></li>";
        });
        html += "</ul>";
      }

      if (meta.codeSnippet) {
        html += '<div class="section-label">Code</div>';
        html += '<div class="code-snippet"><pre><code>' + escapeText(meta.codeSnippet) + "</code></pre></div>";
      }

      body.innerHTML = html;

      // Highlight code blocks
      body.querySelectorAll("pre code").forEach(block => {
        hljs.highlightElement(block);
      });

      panel.classList.add("open");
    }

    function deselectAll() {
      if (selectedEl) {
        selectedEl.classList.remove("selected");
        selectedEl = null;
      }
      document.getElementById("detail-panel").classList.remove("open");
    }

    document.getElementById("close-btn").addEventListener("click", deselectAll);

    function escapeText(s) {
      const d = document.createElement("div");
      d.textContent = s;
      return d.innerHTML;
    }

    function escapeAttr(s) {
      return s.replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/'/g,"&#39;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
    }

    init();
  </script>
</body>
</html>`;
}

function escapeHTML(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
