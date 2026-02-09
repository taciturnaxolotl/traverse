## [0.1.2] - 2026-02-09

### Added
- **Open Graph Images**: Rich preview cards when sharing diagram links
  - Auto-generated 1200x630 PNG with diagram title and node pills
  - Powered by satori + resvg-wasm with Inter font
  - In-memory caching for fast subsequent requests
  - OG and Twitter Card meta tags on diagram pages
- **Deploy Workflow**: GitHub Actions CI/CD via Tailscale SSH
  - Auto-deploy on push to main with health checks
- **Config File Support**: Centralized configuration via `config.json`
  - Configure port, mode, and share server URL
  - Supports `~/Library/Application Support/traverse/config.json` (macOS) and `~/.config/traverse/config.json` (Linux)
  - Environment variables override config file values

### Fixed
- **CommonJS bin entry**: Renamed `bin/traverse.js` to `bin/traverse.cjs` so `npx`/`bunx` work with `"type": "module"`
- **Version display**: Footer shows git hash in dev, falls back to package version via `bunx`
- **Smart footer links**: Links to `/commit/` for git hashes, `/releases/tag/` for version strings

### Changed
- Delete button repositioned on diagram list items
- Footer version link adapts based on runtime context

**Full Changelog**: https://github.com/taciturnaxolotl/traverse/compare/v0.1.1...v0.1.2
