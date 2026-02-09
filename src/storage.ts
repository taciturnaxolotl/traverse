import { Database } from "bun:sqlite";
import { mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import type { WalkthroughDiagram } from "./types.ts";

export function getDataDir(): string {
  if (process.env.TRAVERSE_DATA_DIR) return process.env.TRAVERSE_DATA_DIR;

  const platform = process.platform;
  if (platform === "darwin") {
    return join(homedir(), "Library", "Application Support", "traverse");
  }
  // Linux / other: XDG_DATA_HOME or fallback
  const xdg = process.env.XDG_DATA_HOME || join(homedir(), ".local", "share");
  return join(xdg, "traverse");
}

let db: Database;

export function initDb(): Database {
  const dataDir = getDataDir();
  if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true });
  }

  const dbPath = join(dataDir, "traverse.db");
  db = new Database(dbPath);
  db.run(`
    CREATE TABLE IF NOT EXISTS diagrams (
      id TEXT PRIMARY KEY,
      summary TEXT,
      data TEXT,
      created_at TEXT
    )
  `);
  return db;
}

export function loadAllDiagrams(): Map<string, WalkthroughDiagram> {
  const rows = db.query("SELECT id, data FROM diagrams").all() as { id: string; data: string }[];
  const map = new Map<string, WalkthroughDiagram>();
  for (const row of rows) {
    map.set(row.id, JSON.parse(row.data));
  }
  return map;
}

export function saveDiagram(id: string, diagram: WalkthroughDiagram): void {
  db.run(
    "INSERT OR REPLACE INTO diagrams (id, summary, data, created_at) VALUES (?, ?, ?, ?)",
    [id, diagram.summary, JSON.stringify(diagram), new Date().toISOString()]
  );
}

export function deleteDiagramFromDb(id: string): void {
  db.run("DELETE FROM diagrams WHERE id = ?", [id]);
}

export function generateId(): string {
  return crypto.randomUUID();
}
