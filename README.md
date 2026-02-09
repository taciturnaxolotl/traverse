# traverse

interactive code walkthrough diagrams via MCP. share them with anyone.

The canonical repo for this is hosted on tangled over at [`dunkirk.sh/traverse`](https://tangled.org/@dunkirk.sh/traverse)

## try it now

```sh
bunx @taciturnaxolotl/traverse
```

requires [bun](https://bun.sh). runs an MCP server on stdio and a web server on `localhost:4173`.

## setup

add to your MCP client:

**claude code:**

```sh
claude mcp add traverse -- bunx @taciturnaxolotl/traverse
```

**claude desktop** — add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "traverse": {
      "command": "bunx",
      "args": ["@taciturnaxolotl/traverse"]
    }
  }
}
```

**other MCP clients** — same JSON config, wherever your client reads `.mcp.json` or equivalent.

your AI calls the `walkthrough_diagram` tool with mermaid code + node descriptions, and you get a clickable diagram in your browser.

diagrams persist to sqlite at `~/Library/Application Support/traverse/traverse.db` (macOS) or `$XDG_DATA_HOME/traverse/traverse.db` (linux). override with `TRAVERSE_DATA_DIR`.

## sharing

click the share button on any diagram to upload it to `traverse.dunkirk.sh` and copy a public link.

configure the share server in `~/Library/Application Support/traverse/config.json`:

```json
{
  "shareServerUrl": "https://traverse.dunkirk.sh"
}
```

or set `TRAVERSE_SHARE_URL`.

## server mode

run your own share server:

```sh
TRAVERSE_MODE=server bun run src/index.ts
```

accepts `POST /api/diagrams` with a diagram JSON body, returns `{ id, url }`.

## env vars

| var | default | description |
|-----|---------|-------------|
| `TRAVERSE_PORT` | `4173` | web server port |
| `TRAVERSE_MODE` | `local` | `local` (mcp + web) or `server` (web only) |
| `TRAVERSE_SHARE_URL` | `https://traverse.dunkirk.sh` | share server url |
| `TRAVERSE_DATA_DIR` | platform default | sqlite db location |

<p align="center">
    <img src="https://raw.githubusercontent.com/taciturnaxolotl/carriage/main/.github/images/line-break.svg" />
</p>

<p align="center">
    <i><code>&copy 2026-present <a href="https://dunkirk.sh">Kieran Klukas</a></code></i>
</p>

<p align="center">
    <a href="https://tangled.org/dunkirk.sh/traverse/blob/main/LICENSE.md"><img src="https://img.shields.io/static/v1.svg?style=for-the-badge&label=License&message=O'Saasy&logoColor=d9e0ee&colorA=363a4f&colorB=b7bdf8"/></a>
</p>
