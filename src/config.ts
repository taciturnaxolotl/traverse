import { join } from "node:path";
import { homedir } from "node:os";
import type { TraverseConfig } from "./types.ts";

const DEFAULT_SHARE_URL = "https://traverse.dunkirk.sh";

function getConfigDir(): string {
  const platform = process.platform;
  if (platform === "darwin") {
    return join(homedir(), "Library", "Application Support", "traverse");
  }
  const xdg = process.env.XDG_CONFIG_HOME || join(homedir(), ".config");
  return join(xdg, "traverse");
}

export function loadConfig(): TraverseConfig {
  if (process.env.TRAVERSE_SHARE_URL) {
    return { shareServerUrl: process.env.TRAVERSE_SHARE_URL };
  }

  const configPath = join(getConfigDir(), "config.json");

  try {
    const text = require("node:fs").readFileSync(configPath, "utf-8");
    const parsed = JSON.parse(text);
    return {
      shareServerUrl: parsed.shareServerUrl || DEFAULT_SHARE_URL,
    };
  } catch {
    return { shareServerUrl: DEFAULT_SHARE_URL };
  }
}
