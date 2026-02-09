#!/usr/bin/env node

const { execSync, execFileSync } = require("child_process");
const { resolve } = require("path");

try {
  execSync("bun --version", { stdio: "ignore" });
} catch {
  console.error("Traverse requires Bun to run.");
  console.error("");
  console.error("  Install it: curl -fsSL https://bun.sh/install | bash");
  console.error("  Learn more: https://bun.sh");
  process.exit(1);
}

const entry = resolve(__dirname, "..", "src", "index.ts");
try {
  execFileSync("bun", ["run", entry], { stdio: "inherit" });
} catch (e) {
  process.exit(e.status ?? 1);
}
