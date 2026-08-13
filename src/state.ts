// state.ts — one command into Atlas: the whole standing tournament, read back.
// Usage: npm run state   (requires MONGODB_URI)

import "dotenv/config";
import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
if (!uri || uri.includes("<user>")) {
  console.error("MONGODB_URI not set — the brain lives on Atlas; nothing to read.");
  process.exit(1);
}

const client = new MongoClient(uri);
await client.connect();
const db = client.db("shell");

const champs = await db.collection("champions").find().sort({ crownedAt: 1 }).toArray();
console.log("=== CHAMPION SUCCESSION ===");
for (const ch of champs) console.log(`${ch.crownedAt}  [${ch.run ?? "live"}]  ${ch.memoryId}`);

const cur = champs.at(-1);
if (cur) {
  console.log("\n=== STANDING CHAMPION ===\n" + cur.text);
  console.log("\n=== PRIORITY SPINE ===");
  for (const [i, id] of (cur.lineage ?? []).entries()) {
    const mem = await db.collection("candidates").findOne({ id }, { projection: { text: 1 } });
    console.log(`${i + 1}. ${id}${mem ? " — " + String(mem.text).slice(0, 90) : ""}`);
  }
}

const alive = await db.collection("candidates").countDocuments({ status: "alive" });
const total = await db.collection("candidates").countDocuments();
const votes = await db.collection("votes").countDocuments();
const outcomes = await db.collection("candidates").countDocuments({ kind: "outcome", status: "alive" });
console.log(
  `\n=== POOL ===\n${alive} alive (${outcomes} grounded outcomes) / ${total} total incl. archived epochs · ${votes} ballots on record`,
);

await client.close();
