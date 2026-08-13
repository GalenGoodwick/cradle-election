// boot-cli.ts — print ONLY the elected boot directive on stdout.
// This is the plug: `claude --append-system-prompt "$(npm run -s boot)"` starts a
// fresh instance already wearing the champion. Everything else goes to stderr.

import { readFileSync } from "node:fs";
import { InMemoryStore } from "./store.js";
import { runTournament } from "./tournament.js";
import { ingestRepo } from "./ingest.js";
import { boot } from "./boot.js";
import type { Memory } from "./types.js";

let outcomes: Memory[] = [];
try {
  outcomes = JSON.parse(readFileSync("outcomes.json", "utf8"));
} catch {}

const store = new InMemoryStore();
await store.addMemories([...ingestRepo("."), ...outcomes]);
await runTournament(store, { runId: `boot-${process.pid}` });
const seed = await boot(store);
if (!seed) {
  console.error("no champion elected");
  process.exit(1);
}
console.error(`[cradle] champion: ${seed.champion.memoryId}`);
console.log(seed.directive);
