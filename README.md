# traverse

[![the diagram view](https://l4.dunkirk.sh/i/eAqE3K4HnppN.webp)](https://traverse.dunkirk.sh/diagram/6121f05c-a5ef-4ecf-8ffc-02534c5e767c)

One of my favorite features about [amp](https://ampcode.com) is their walkthrough feature. It runs a sub agent which goes and breaks your repo into parts and then sends it up to amp's services to get rendered into a nice web page! I got curious and ended up dumping the tool prompt for both the walkthrough subagent and the tool prompt that generates the diagram.

Turns out they are using mermaid syntax with ids on each node that are linked to a json object that has the summary in md of each section. Looking into their web ui rendering they have actually designed their own mermaid renderer likely to get better routing with the paths. We can get amazingly close to that with regular mermaid still and that is what this project is!

This is a mcp server that also launches a web server in the background. You can hook this into whatever ai tool that you want that supports mcp (which is north of 80% of coding tools at this point if not nearing 100%) and start generating walkthroughs! It will initally give you a local url but if you want to share it with others then you can use the share button in the top corner of the page and it will by default share it to my hosted instance at [`traverse.dunkirk.sh`](https://traverse.dunkirk.sh) but if you configure the json settings or add an env variable you can point it to your own selfhosted instance!

## let's try it!

The mcp server must be run with bun since it uses the `Bun.serve` api extensively. If you haven't tried bun yet I would highly recommend it!

```sh
bunx @taciturnaxolotl/traverse@latest
```

By default this runs an MCP server on stdio and a web server on `localhost:4173`.

### I want this in my agent of choice!

For claude code they have made this fairly easy:

```sh
claude mcp add traverse -- bunx @taciturnaxolotl/traverse@latest
```

For claude desktop (on mac) you can add the following to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "traverse": {
      "command": "bunx",
      "args": ["@taciturnaxolotl/traverse@latest"]
    }
  }
}
```

For other agents its the same JSON config typically.

## Config

### json config

On macos edit/create `~/Library/Application Support/traverse/config.json`. If you are on Linux then `~/.config/traverse/config.json` (or `$XDG_CONFIG_HOME/traverse/config.json`)

```json
{
  "shareServerUrl": "https://traverse.dunkirk.sh",
  "port": 4173,
  "mode": "local"
}
```

### env vars

| var                  | default                       | description                                |
| -------------------- | ----------------------------- | ------------------------------------------ |
| `TRAVERSE_PORT`      | `4173`                        | web server port                            |
| `TRAVERSE_MODE`      | `local`                       | `local` (mcp + web) or `server` (web only) |
| `TRAVERSE_SHARE_URL` | `https://traverse.dunkirk.sh` | share server url                           |
| `TRAVERSE_DATA_DIR`  | platform default              | sqlite db location                         |

The canonical repo for this is hosted on tangled over at [`dunkirk.sh/traverse`](https://tangled.org/@dunkirk.sh/traverse)

<p align="center">
    <img src="https://raw.githubusercontent.com/taciturnaxolotl/carriage/main/.github/images/line-break.svg" />
</p>

<p align="center">
    <i><code>&copy 2026-present <a href="https://dunkirk.sh">Kieran Klukas</a></code></i>
</p>

<p align="center">
    <a href="https://tangled.org/dunkirk.sh/traverse/blob/main/LICENSE.md"><img src="https://img.shields.io/static/v1.svg?style=for-the-badge&label=License&message=O'Saasy&logoColor=d9e0ee&colorA=363a4f&colorB=b7bdf8"/></a>
</p>
