// boot-cli.ts — print ONLY the elected boot directive on stdout.
// This is the plug: `claude --append-system-prompt "$(npm run -s boot)"` starts a
// fresh instance already wearing the champion. Everything else goes to stderr.
//
// With MONGODB_URI set, this is a TRUE reload: one query against the persistent
// brain on Atlas — no re-election, the standing champion is simply worn.
// Without it, we fall back to recomputing the election in memory.

import "dotenv/config";
import { readFileSync } from "node:fs";
import { InMemoryStore, makeMongoStore } from "./store.js";
import { runTournament } from "./tournament.js";
import { ingestRepo } from "./ingest.js";
import { boot } from "./boot.js";
import type { Memory, Store } from "./types.js";

let store: Store;
let mode: string;

const uri = process.env.MONGODB_URI;
if (uri && !uri.includes("<user>")) {
  store = await makeMongoStore(uri);
  mode = "Atlas reload (one query, no re-election)";
} else {
  let outcomes: Memory[] = [];
  try {
    outcomes = JSON.parse(readFileSync("outcomes.json", "utf8"));
  } catch {}
  store = new InMemoryStore();
  await store.addMemories([...ingestRepo("."), ...outcomes]);
  await runTournament(store, { runId: `boot-${process.pid}` });
  mode = "in-memory recompute (set MONGODB_URI for a true reload)";
}

const seed = await boot(store);
if (!seed) {
  console.error("no champion found");
  process.exit(1);
}
console.error(`[cradle] ${mode}`);
console.error(`[cradle] champion: ${seed.champion.memoryId}`);
console.log(seed.directive);
process.exit(0);
