// run.ts — end-to-end demo. Elects a champion from project memory and prints the boot seed.
//
//   npm run dev                 -> in-memory, stub evaluators (no credentials)
//   MONGODB_URI=... npm run dev  -> persists to Atlas
//   ANTHROPIC_API_KEY=... npm run dev -> real recused LLM evaluators with the vector tool

import "dotenv/config";
import { readFileSync } from "node:fs";
import { InMemoryStore, makeMongoStore } from "./store.js";
import { runTournament } from "./tournament.js";
import { boot } from "./boot.js";
import { SEED } from "./seed.js";
import { ingestRepo } from "./ingest.js";
import type { Memory, Store } from "./types.js";

/**
 * Dogfood: memories = this repo's own body + its real development outcomes
 * (outcomes.json — the flywheel write-back). No cross-project seeds, no invented
 * scores: every outcome in that file records something that actually happened.
 */
function selfMemories(): Memory[] {
  let outcomes: Memory[] = [];
  try {
    outcomes = JSON.parse(readFileSync("outcomes.json", "utf8"));
  } catch {
    // no outcomes yet — first revolution of the flywheel hasn't happened
  }
  return [...ingestRepo("."), ...outcomes];
}

async function makeStore(): Promise<{ store: Store; label: string }> {
  const uri = process.env.MONGODB_URI;
  if (uri && !uri.includes("<user>")) {
    return { store: await makeMongoStore(uri), label: "Atlas (persist-sprint/shell)" };
  }
  return { store: new InMemoryStore(), label: "in-memory" };
}

async function main() {
  const { store, label } = await makeStore();
  const self = process.argv.includes("--self");
  const evalMode =
    process.env.CRADLE_EVALUATOR === "agent"
      ? "agent swarm (headless Claude, no API key)"
      : process.env.ANTHROPIC_API_KEY
        ? "LLM (recused, vector tool)"
        : "stub";
  const memories = self ? selfMemories() : SEED;
  console.log(
    `\nCradle election — store: ${label} · evaluators: ${evalMode}` +
      `${self ? " · DOGFOOD (ingesting this repo)" : ""}\n`,
  );
  console.log(`  ${memories.length} memories in the pool\n`);

  await store.addMemories(memories);

  const runId = `run-${Date.now()}`;
  const champion = await runTournament(store, {
    runId,
    onTier: (tier, survivors) =>
      console.log(`  tier ${tier}: ${survivors.length} survivor(s) -> ${survivors.join(", ")}`),
  });

  console.log(`\n★ CHAMPION: ${champion.memoryId}`);
  console.log(`  ${champion.text}\n`);

  const seed = await boot(store);
  if (seed) {
    console.log("── relaunch seed (what a fresh instance wears) ──");
    console.log(seed.directive);
  }
  console.log("");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
