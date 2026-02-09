import { join } from "node:path";
import { homedir } from "node:os";
import type { TraverseConfig } from "./types.ts";

const DEFAULTS: TraverseConfig = {
  shareServerUrl: "https://traverse.dunkirk.sh",
  port: 4173,
  mode: "local",
};

function getConfigDir(): string {
  const platform = process.platform;
  if (platform === "darwin") {
    return join(homedir(), "Library", "Application Support", "traverse");
  }
  const xdg = process.env.XDG_CONFIG_HOME || join(homedir(), ".config");
  return join(xdg, "traverse");
}

export function loadConfig(): TraverseConfig {
  let fileConfig: Partial<TraverseConfig> = {};

  const configPath = join(getConfigDir(), "config.json");
  try {
    const text = require("node:fs").readFileSync(configPath, "utf-8");
    fileConfig = JSON.parse(text);
  } catch {
    // no config file, use defaults
  }

  // Env vars override config file, config file overrides defaults
  return {
    shareServerUrl: process.env.TRAVERSE_SHARE_URL || fileConfig.shareServerUrl || DEFAULTS.shareServerUrl,
    port: parseInt(process.env.TRAVERSE_PORT || String(fileConfig.port || DEFAULTS.port), 10),
    mode: (process.env.TRAVERSE_MODE || fileConfig.mode || DEFAULTS.mode) as "local" | "server",
  };
}
