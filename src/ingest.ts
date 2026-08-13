// ingest.ts — walk a repo so every source file becomes a candidate memory.
// This is what makes the project's own body thought-fuel for its next direction.

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, extname } from "node:path";
import type { Memory } from "./types.js";

const SKIP_DIRS = new Set(["node_modules", ".git", "dist", ".vitest"]);
const CODE_EXT = new Set([".ts", ".js", ".mjs", ".md"]);

function walk(dir: string, root: string, out: string[]): void {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, root, out);
    else if (CODE_EXT.has(extname(name)) && !name.endsWith(".test.ts")) out.push(full);
  }
}

/** Pull a one-line essence from a file: its first block/line comment or first real line. */
function essence(content: string): string {
  const lines = content.split("\n");
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    const stripped = line.replace(/^\/\/+|^\/\*+|^\*+|^#+/g, "").replace(/\*\/$/, "").trim();
    if (stripped && !/^(import|export|const|let|function|\{|\}|})/.test(stripped)) {
      return stripped;
    }
    if (stripped) return stripped;
  }
  return "(no summary)";
}

function slug(s: string): string {
  return s.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase();
}

/** Ingest a repo directory into code-kind memories, one per file. */
export function ingestRepo(root: string): Memory[] {
  const files: string[] = [];
  walk(root, root, files);
  return files.map((full) => {
    const rel = relative(root, full);
    const content = readFileSync(full, "utf8");
    return {
      id: `code-${slug(rel)}`,
      kind: "code" as const,
      text: `${rel}: ${essence(content)}`,
      source: rel,
      tier: 0,
      status: "alive" as const,
    };
  });
}
