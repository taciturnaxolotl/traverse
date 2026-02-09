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
      min-height: 100vh;
    }

    .summary-bar {
      padding: 12px 20px;
      background: var(--summary-bg);
      border-bottom: 1px solid var(--border);
      font-size: 14px;
      color: var(--text-muted);
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

    .diagram-section {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      border: 1px solid var(--border);
      border-radius: 8px;
    }

    .diagram-section pre.mermaid {
      width: 100%;
    }

    .diagram-section svg {
      max-height: none !important;
      height: auto !important;
      width: 100%;
    }

    /* ── Force theme colors on all Mermaid elements ── */

    /* Global mermaid label overrides */
    .diagram-section .label {
      font-family: inherit;
      color: var(--text) !important;
    }
    .diagram-section .label text,
    .diagram-section .label span {
      fill: var(--text) !important;
      color: var(--text) !important;
    }
    .diagram-section .cluster-label text,
    .diagram-section .cluster-label span,
    .diagram-section .cluster-label span p {
      fill: var(--text) !important;
      color: var(--text) !important;
      background-color: transparent !important;
    }

    /* Flowchart nodes */
    .diagram-section .node rect,
    .diagram-section .node circle,
    .diagram-section .node ellipse,
    .diagram-section .node polygon,
    .diagram-section .node path,
    .diagram-section .node .label-container,
    .diagram-section .node .label-container path,
    .diagram-section .node g path {
      fill: var(--bg) !important;
      stroke: var(--text) !important;
    }
    .diagram-section .node .label,
    .diagram-section .node .nodeLabel,
    .diagram-section .node text,
    .diagram-section .node foreignObject {
      color: var(--text) !important;
      fill: var(--text) !important;
    }
    .diagram-section .node foreignObject div,
    .diagram-section .node foreignObject span,
    .diagram-section .node foreignObject p {
      color: var(--text) !important;
    }

    /* Edge labels */
    .diagram-section .edgeLabel,
    .diagram-section .edgeLabel span,
    .diagram-section .edgeLabel div,
    .diagram-section .edgeLabel p,
    .diagram-section .edgeLabel foreignObject,
    .diagram-section .edgeLabel foreignObject *,
    .diagram-section .edgeLabel text,
    .diagram-section .edgeLabel tspan {
      color: var(--text) !important;
      fill: var(--text) !important;
    }
    .diagram-section .edgeLabel,
    .diagram-section .edgeLabel p,
    .diagram-section .edgeLabel span {
      background-color: var(--bg) !important;
    }
    .diagram-section .edgeLabel rect,
    .diagram-section .edgeLabel .labelBkg {
      fill: var(--bg) !important;
      opacity: 1 !important;
    }

    /* Edge paths and arrows */
    .diagram-section .edgePath path,
    .diagram-section .flowchart-link,
    .diagram-section path.path,
    .diagram-section .edge-pattern-solid,
    .diagram-section .edge-pattern-dotted,
    .diagram-section .edge-pattern-dashed {
      stroke: var(--text) !important;
    }
    .diagram-section marker path,
    .diagram-section .arrowheadPath,
    .diagram-section .arrowMarkerAbs path {
      fill: var(--text) !important;
      stroke: var(--text) !important;
    }

    /* Subgraph/cluster styling */
    .diagram-section .cluster rect,
    .diagram-section .cluster-label,
    .diagram-section g.cluster > rect {
      fill: var(--bg-panel) !important;
      stroke: var(--text) !important;
    }
    .diagram-section .cluster text,
    .diagram-section .cluster-label text,
    .diagram-section .cluster .nodeLabel {
      fill: var(--text) !important;
      color: var(--text) !important;
    }

    /* ── Sequence diagram overrides ── */
    .diagram-section rect.actor {
      fill: var(--bg) !important;
      stroke: var(--text) !important;
    }
    .diagram-section text.actor,
    .diagram-section text.actor tspan,
    .diagram-section .actor > tspan {
      fill: var(--text) !important;
      stroke: none !important;
    }
    .diagram-section .actor-man circle,
    .diagram-section .actor-man line {
      fill: var(--bg) !important;
      stroke: var(--text) !important;
    }
    .diagram-section line.actor-line,
    .diagram-section .actor-line {
      stroke: var(--text) !important;
    }
    .diagram-section .sequenceNumber {
      fill: var(--bg) !important;
    }
    .diagram-section .messageLine0,
    .diagram-section .messageLine1 {
      stroke: var(--text) !important;
    }
    .diagram-section .messageText {
      fill: var(--text) !important;
    }
    .diagram-section .activation0,
    .diagram-section .activation1,
    .diagram-section .activation2 {
      fill: var(--code-bg) !important;
      stroke: var(--text) !important;
    }
    .diagram-section .labelBox {
      fill: var(--bg-panel) !important;
      stroke: var(--text) !important;
    }
    .diagram-section .labelText,
    .diagram-section .loopText {
      fill: var(--text) !important;
    }

    /* ── ERD diagram overrides ── */
    .diagram-section .entityBox {
      fill: var(--bg-panel) !important;
    }
    .diagram-section .row-rect-odd path,
    .diagram-section .row-rect-even path {
      fill: var(--bg) !important;
    }
    .diagram-section .row-rect-even path {
      fill: var(--code-bg) !important;
    }
    .diagram-section .relationshipLine path {
      stroke: var(--text) !important;
    }
    .diagram-section .relationshipLabel {
      fill: var(--text) !important;
    }

    /* ── Node interaction ── */
    .diagram-section .node { cursor: pointer; }

    .diagram-section .node:hover :is(rect, circle, ellipse, polygon, path) {
      filter: brightness(1.12) !important;
    }

    .diagram-section .node.selected :is(rect, circle, ellipse, polygon, path) {
      filter: brightness(1.2) !important;
      stroke: var(--text-muted) !important;
      stroke-width: 1.5px !important;
    }

    /* Edge hover */
    .diagram-section .node:hover ~ .edgePath path,
    .diagram-section .edgePath:hover path {
      stroke-width: 3px;
      filter: brightness(1.2);
    }

    /* Highlight pulse animation */
    .diagram-section .node.highlighted :is(rect, circle, ellipse, polygon, path) {
      animation: node-highlight-pulse 0.5s ease-in-out 3;
    }
    @keyframes node-highlight-pulse {
      0%, 100% { filter: brightness(1); }
      50% { filter: brightness(1.3) drop-shadow(0 0 8px var(--text)); }
    }

    /* ERD: don't apply hover/selected effects to individual row cells */
    .diagram-section .erDiagram .node:hover :is(.row-rect-odd, .row-rect-even) :is(path, rect, polygon),
    .diagram-section .erDiagram .node.selected :is(.row-rect-odd, .row-rect-even) :is(path, rect, polygon) {
      filter: none !important;
      stroke: none !important;
      stroke-width: 0 !important;
    }

    /* ── Content wrap ── */
    .content-wrap {
      max-width: 720px;
      margin: 0 auto;
      padding: 32px 20px;
    }

    /* ── Detail section ── */
    .content-summary {
      font-size: 20px;
      font-weight: 600;
      padding: 24px 0 0;
    }

    .node-card {
      padding: 24px 0;
      border-top: 1px solid var(--border);
    }

    .node-card:first-child {
      border-top: none;
    }

    .node-card h3 {
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 12px;
    }

    .node-card .description {
      font-size: 14px;
      line-height: 1.65;
    }

    .node-card .description h1,
    .node-card .description h2,
    .node-card .description h3 {
      margin-top: 16px;
      margin-bottom: 8px;
    }

    .node-card .description h1 { font-size: 18px; }
    .node-card .description h2 { font-size: 16px; }
    .node-card .description h3 { font-size: 14px; }

    .node-card .description p { margin-bottom: 12px; }

    .node-card .description code {
      background: var(--code-bg);
      padding: 2px 5px;
      border-radius: 3px;
      font-size: 13px;
    }

    .node-card .description pre {
      background: var(--code-bg);
      padding: 12px;
      border-radius: 6px;
      overflow-x: auto;
      margin-bottom: 12px;
    }

    .node-card .description pre code {
      background: none;
      padding: 0;
      line-height: 1.625 !important;
    }

    .node-card .description ul,
    .node-card .description ol {
      margin-bottom: 12px;
      padding-left: 20px;
    }

    .node-card .description li { margin-bottom: 4px; }

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
  </style>
</head>
<body>
  <div class="summary-bar">
    <span class="label">Traverse</span>
    <span>${escapeHTML(diagram.summary)}</span>
  </div>

  <div class="content-wrap">
    <div class="diagram-section">
      <pre class="mermaid">${escapeHTML(diagram.code)}</pre>
    </div>

    <div id="detail-section"></div>
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
      await mermaid.initialize({
        startOnLoad: true,
        theme: "base",
        flowchart: { useMaxWidth: false, htmlLabels: true, curve: "monotoneY", nodeSpacing: 50, rankSpacing: 50 },
        securityLevel: "loose",
      });

      // Wait for mermaid to finish rendering
      await mermaid.run();

      // Set viewBox so the SVG scales to fit the container
      requestAnimationFrame(() => {
        fitDiagram();
        attachClickHandlers();
        renderAllNodes();
      });

      window.addEventListener("resize", fitDiagram);
    }

    function fitDiagram() {
      const svg = document.querySelector(".diagram-section svg");
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
      const svg = document.querySelector(".diagram-section svg");
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
        if (!e.target.closest(".detail-section") && !e.target.closest(".node")) {
          deselectAll();
        }
      });
    }

    let selectedEl = null;

    function renderNodeCard(nodeId, meta) {
      let html = '<div class="node-card" data-card-id="' + escapeAttr(nodeId) + '">';
      html += '<h3>' + escapeText(meta.title) + '</h3>';
      html += '<div class="description">' + marked.parse(meta.description) + "</div>";

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

      html += '</div>';
      return html;
    }

    function renderAllNodes() {
      const section = document.getElementById("detail-section");
      let html = '<h2 class="content-summary">' + escapeText(DIAGRAM_DATA.summary) + '</h2>';
      for (const [nodeId, meta] of Object.entries(DIAGRAM_DATA.nodes)) {
        html += renderNodeCard(nodeId, meta);
      }
      section.innerHTML = html;
      highlightAll(section);
    }

    function highlightAll(container) {
      container.querySelectorAll("pre code").forEach(block => {
        hljs.highlightElement(block);
      });
    }

    function selectNode(nodeId, el) {
      const meta = DIAGRAM_DATA.nodes[nodeId];
      if (!meta) return;

      if (selectedEl) selectedEl.classList.remove("selected");
      el.classList.add("selected");
      selectedEl = el;

      const section = document.getElementById("detail-section");
      section.innerHTML = renderNodeCard(nodeId, meta);
      highlightAll(section);

      section.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    function deselectAll() {
      if (selectedEl) {
        selectedEl.classList.remove("selected");
        selectedEl = null;
      }
      renderAllNodes();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }

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
