import type { WalkthroughDiagram } from "./types.ts";

export function generateViewerHTML(diagram: WalkthroughDiagram, gitHash: string = "dev", projectRoot: string = ""): string {
  const diagramJSON = JSON.stringify(diagram).replace(/<\//g, "<\\/");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Traverse — ${escapeHTML(diagram.summary)}</title>
  <link rel="icon" href="/icon.svg" type="image/svg+xml" />
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
      --accent-subtle: rgba(37, 99, 235, 0.08);
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
        --accent-subtle: rgba(59, 130, 246, 0.1);
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
      display: flex;
      flex-direction: column;
    }

    /* ── Summary bar with breadcrumb ── */
    .summary-bar {
      position: sticky;
      top: 0;
      z-index: 100;
      padding: 12px 20px;
      background: var(--summary-bg);
      border-bottom: 1px solid var(--border);
      font-size: 14px;
      color: var(--text-muted);
      display: flex;
      align-items: center;
      gap: 8px;
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
    }

    .summary-bar .label {
      font-weight: 600;
      color: var(--text-muted);
      text-transform: uppercase;
      font-size: 11px;
      letter-spacing: 0.05em;
      flex-shrink: 0;
      text-decoration: none;
      transition: color 0.15s;
    }

    .summary-bar .label:hover {
      color: var(--text);
    }

    .summary-bar .sep {
      color: var(--text-muted);
      flex-shrink: 0;
      font-size: 11px;
    }

    .summary-bar .breadcrumb-title {
      color: var(--text-muted);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    body.has-selection .summary-bar .breadcrumb-title {
      cursor: pointer;
    }

    body.has-selection .summary-bar .breadcrumb-title:hover {
      color: var(--text);
    }

    .summary-bar .header-sep,
    .summary-bar .header-node {
      display: none;
    }

    body.has-selection .summary-bar .header-sep,
    body.has-selection .summary-bar .header-node {
      display: inline;
    }

    .summary-bar .header-node {
      color: var(--text);
      font-weight: 500;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .diagram-wrap {
      padding: 32px 32px 0;
    }

    .diagram-section {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      border: 1px solid var(--border);
      border-radius: 8px;
      opacity: 0;
      transition: opacity 0.3s ease;
    }

    .diagram-section.ready {
      opacity: 1;
    }

    .diagram-section pre.mermaid {
      width: 100%;
    }

    .diagram-section svg {
      max-height: calc(100vh - 100px);
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
      transition: fill 0.15s, stroke 0.15s, stroke-width 0.15s;
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
      fill: var(--code-bg) !important;
      stroke-width: 2px !important;
    }

    .diagram-section .node.selected :is(rect, circle, ellipse, polygon, path) {
      fill: var(--text) !important;
      stroke: var(--text) !important;
      stroke-width: 2px !important;
    }
    .diagram-section .node.selected .label,
    .diagram-section .node.selected .nodeLabel,
    .diagram-section .node.selected text,
    .diagram-section .node.selected foreignObject,
    .diagram-section .node.selected foreignObject div,
    .diagram-section .node.selected foreignObject span,
    .diagram-section .node.selected foreignObject p {
      color: var(--bg) !important;
      fill: var(--bg) !important;
    }

    /* Edge hover */
    .diagram-section .node:hover ~ .edgePath path,
    .diagram-section .edgePath:hover path {
      stroke-width: 2.5px;
    }

    /* Highlight pulse animation */
    .diagram-section .node.highlighted :is(rect, circle, ellipse, polygon, path) {
      animation: node-highlight-pulse 0.5s ease-in-out 3;
    }
    @keyframes node-highlight-pulse {
      0%, 100% { stroke-width: 1px; }
      50% { stroke-width: 3px; }
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
      flex: 1;
    }

    /* ── Detail section ── */
    #detail-section {
      transition: opacity 0.15s ease;
    }

    #detail-section.fading { opacity: 0; }

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
      color: #5a7bc4;
      text-decoration: none;
      font-size: 13px;
      font-family: "SF Mono", "Fira Code", monospace;
      padding: 4px 0;
      transition: color 0.15s;
    }

    .links-list a:hover { color: #7b9ad8; text-decoration: underline; }

    .code-snippet {
      margin-top: 12px;
      position: relative;
    }

    .code-snippet pre {
      background: var(--code-bg);
      border-radius: 6px;
      padding: 12px;
      overflow-x: auto;
      font-size: 13px;
      line-height: 1.5;
    }

    .copy-btn {
      position: absolute;
      top: 8px;
      right: 8px;
      background: var(--bg-panel);
      border: 1px solid var(--border);
      border-radius: 5px;
      padding: 4px 6px;
      cursor: pointer;
      color: var(--text-muted);
      opacity: 0;
      transition: opacity 0.15s, color 0.15s, border-color 0.15s;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .copy-btn svg { width: 14px; height: 14px; }

    .code-snippet:hover .copy-btn { opacity: 1; }

    .copy-btn:hover {
      color: var(--accent);
      border-color: var(--accent);
    }

    .copy-btn.copied {
      color: #16a34a;
      border-color: #16a34a;
      opacity: 1;
    }

    .site-footer {
      padding: 32px 20px;
      font-size: 13px;
      color: var(--text-muted);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .site-footer .heart { color: #e25555; }

    .site-footer a {
      color: var(--text);
      text-decoration: none;
    }

    .site-footer a:hover { text-decoration: underline; }

    .site-footer .hash {
      font-family: "SF Mono", "Fira Code", monospace;
      font-size: 11px;
      color: var(--text-muted) !important;
      opacity: 0.6;
    }
  </style>
</head>
<body>
  <div class="summary-bar">
    <a class="label" href="/">Traverse</a>
    <span class="sep">&rsaquo;</span>
    <span class="breadcrumb-title" id="breadcrumb-title">${escapeHTML(diagram.summary)}</span>
    <span class="sep header-sep">&rsaquo;</span>
    <span class="header-node" id="header-node"></span>
  </div>

  <div class="diagram-wrap">
    <div class="diagram-section">
      <pre class="mermaid">${escapeHTML(diagram.code)}</pre>
    </div>
  </div>

  <div class="content-wrap">
    <div id="detail-section"></div>
  </div>

  <footer class="site-footer">
    <span>Made with &#x2764;&#xFE0F; by <a href="https://dunkirk.sh">Kieran Klukas</a></span>
    <a class="hash" href="https://github.com/taciturnaxolotl/traverse/commit/${escapeHTML(gitHash)}">${escapeHTML(gitHash)}</a>
  </footer>

  <script type="module">
    import mermaid from "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs";
    import elkLayouts from "https://cdn.jsdelivr.net/npm/@mermaid-js/layout-elk@0/dist/mermaid-layout-elk.esm.min.mjs";

    mermaid.registerLayoutLoaders(elkLayouts);

    const DIAGRAM_DATA = ${diagramJSON};
    const PROJECT_ROOT = ${JSON.stringify(projectRoot)};

    const COPY_ICON = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="5" width="8" height="8" rx="1.5"/><path d="M3 11V3a1.5 1.5 0 011.5-1.5H11"/></svg>';
    const CHECK_ICON = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8.5l3.5 3.5 6.5-7"/></svg>';

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
        layout: "elk",
        flowchart: { useMaxWidth: false, htmlLabels: true, nodeSpacing: 24, rankSpacing: 40 },
        securityLevel: "loose",
      });

      // Wait for mermaid to finish rendering
      await mermaid.run();

      // Set viewBox so the SVG scales to fit the container
      requestAnimationFrame(() => {
        fitDiagram();
        document.querySelector(".diagram-section").classList.add("ready");
        attachClickHandlers();

        // Check URL hash for deep link
        const hash = window.location.hash.slice(1);
        if (hash && DIAGRAM_DATA.nodes[hash]) {
          const svg = document.querySelector(".diagram-section svg");
          const nodeEl = svg && findNodeEl(svg, hash);
          if (nodeEl) {
            selectNode(hash, nodeEl, false);
          } else {
            renderAllNodes();
          }
        } else {
          renderAllNodes();
        }
      });

      window.addEventListener("resize", fitDiagram);

      // Header breadcrumb title click to deselect
      document.getElementById("breadcrumb-title").addEventListener("click", (e) => {
        if (selectedNodeId) {
          e.stopPropagation();
          deselectAll();
        }
      });

      // Escape key to deselect
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && selectedNodeId) deselectAll();
      });

      // Handle browser back/forward
      window.addEventListener("hashchange", () => {
        const hash = window.location.hash.slice(1);
        if (!hash) {
          deselectAll(true);
        } else if (DIAGRAM_DATA.nodes[hash]) {
          const svg = document.querySelector(".diagram-section svg");
          const nodeEl = svg && findNodeEl(svg, hash);
          if (nodeEl) selectNode(hash, nodeEl, false);
        }
      });
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

    function findNodeEl(svg, nodeId) {
      const nodeIds = Object.keys(DIAGRAM_DATA.nodes);
      const allNodes = svg.querySelectorAll(".node");
      for (const nodeEl of allNodes) {
        const id = nodeEl.id;
        if (!id) continue;
        const matchedId = nodeIds.find(nid =>
          id === nid ||
          id.endsWith("-" + nid) ||
          id.startsWith("flowchart-" + nid + "-") ||
          id.includes("-" + nid + "-")
        );
        if (matchedId === nodeId) return nodeEl;
      }
      return null;
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
        if (!e.target.closest("#detail-section") && !e.target.closest(".node") && !e.target.closest(".summary-bar")) {
          deselectAll();
        }
      });
    }

    let selectedEl = null;
    let selectedNodeId = null;

    function renderNodeCard(nodeId, meta) {
      let html = '<div class="node-card" data-card-id="' + escapeAttr(nodeId) + '">';
      html += '<h3>' + escapeText(meta.title) + '</h3>';
      html += '<div class="description">' + marked.parse(meta.description) + "</div>";

      if (meta.links && meta.links.length > 0) {
        html += '<div class="section-label">Related Files</div>';
        html += '<ul class="links-list">';
        meta.links.forEach(link => {
          const href = buildFileUrl(link.label, link.url);
          html += '<li><a href="' + escapeAttr(href) + '">' + escapeText(link.label) + "</a></li>";
        });
        html += "</ul>";
      }

      if (meta.codeSnippet) {
        html += '<div class="section-label">Code</div>';
        html += '<div class="code-snippet"><button class="copy-btn" title="Copy code">' + COPY_ICON + '</button><pre><code>' + escapeText(meta.codeSnippet) + "</code></pre></div>";
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
      attachCopyButtons(section);
    }

    function highlightAll(container) {
      container.querySelectorAll("pre code").forEach(block => {
        hljs.highlightElement(block);
      });
    }

    function attachCopyButtons(container) {
      container.querySelectorAll(".copy-btn").forEach(btn => {
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          const code = btn.closest(".code-snippet").querySelector("code").textContent;
          navigator.clipboard.writeText(code).then(() => {
            btn.innerHTML = CHECK_ICON;
            btn.classList.add("copied");
            setTimeout(() => {
              btn.innerHTML = COPY_ICON;
              btn.classList.remove("copied");
            }, 1500);
          });
        });
      });
    }

    function transitionContent(callback) {
      const section = document.getElementById("detail-section");
      section.classList.add("fading");
      setTimeout(() => {
        callback();
        section.classList.remove("fading");
      }, 150);
    }

    function selectNode(nodeId, el, pushState = true) {
      const meta = DIAGRAM_DATA.nodes[nodeId];
      if (!meta) return;

      if (selectedEl) selectedEl.classList.remove("selected");
      el.classList.add("selected");
      selectedEl = el;
      selectedNodeId = nodeId;

      // Update breadcrumbs
      document.body.classList.add("has-selection");
      document.getElementById("header-node").textContent = meta.title;

      // Update URL hash
      if (pushState) {
        history.pushState(null, "", "#" + nodeId);
      }

      transitionContent(() => {
        const section = document.getElementById("detail-section");
        section.innerHTML = renderNodeCard(nodeId, meta);
        highlightAll(section);
        attachCopyButtons(section);
      });

    }

    function deselectAll(skipHistory) {
      if (selectedEl) {
        selectedEl.classList.remove("selected");
        selectedEl = null;
      }
      selectedNodeId = null;

      // Update breadcrumbs
      document.body.classList.remove("has-selection");
      document.getElementById("header-node").textContent = "";

      // Clear hash
      if (!skipHistory) {
        history.pushState(null, "", window.location.pathname);
      }

      transitionContent(() => {
        renderAllNodes();
      });
    }

    function buildFileUrl(label, url) {
      // Parse line number from label like "src/index.ts:56-59" or "src/index.ts:56"
      const lineMatch = label.match(/:(\d+)/);
      const line = lineMatch ? lineMatch[1] : "1";
      const filePath = PROJECT_ROOT + "/" + url;
      return "vscode://file/" + filePath + ":" + line;
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
