// search-cli.ts — the swarm evaluator's research tool.
// Usage: npx tsx src/search-cli.ts "<query>"   -> top related memories, one per line.

import "dotenv/config";
import { makeMongoStore } from "./store.js";

const query = process.argv.slice(2).join(" ").trim();
if (!query) {
  console.log("(usage: search-cli <query>)");
  process.exit(0);
}
const uri = process.env.MONGODB_URI;
if (!uri || uri.includes("<user>")) {
  console.log("(no memory store connected)");
  process.exit(0);
}
const store = await makeMongoStore(uri);
const hits = await store.searchMemories(query, 3);
console.log(hits.map((h) => `${h.id}: ${h.text}`).join("\n") || "(no matches)");
process.exit(0);
