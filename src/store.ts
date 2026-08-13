// store.ts — one interface, two backends.
// InMemoryStore runs the whole election tonight with zero credentials.
// MongoStore persists to the live Atlas cluster and uses $vectorSearch for retrieval.

import type { Store, Memory, CellResult, Champion, Checkpoint } from "./types.js";

/** Cheap lexical overlap — stands in for vector search when running in-memory. */
function overlapScore(a: string, b: string): number {
  const toks = (s: string) => new Set(s.toLowerCase().match(/[a-z0-9]+/g) ?? []);
  const A = toks(a);
  const B = toks(b);
  if (A.size === 0 || B.size === 0) return 0;
  let hits = 0;
  for (const t of A) if (B.has(t)) hits++;
  return hits / Math.sqrt(A.size * B.size);
}

export class InMemoryStore implements Store {
  private mems = new Map<string, Memory>();
  private cells: { runId: string; tier: number; cell: CellResult }[] = [];
  private checkpoints = new Map<string, Checkpoint>();
  private champion: Champion | null = null;

  async addMemories(mems: Memory[]) {
    for (const m of mems) this.mems.set(m.id, { ...m });
  }
  async allAlive() {
    return [...this.mems.values()].filter((m) => m.status === "alive");
  }
  async getMemory(id: string) {
    return this.mems.get(id) ?? null;
  }
  async searchMemories(query: string, k: number, excludeIds: string[] = []) {
    const skip = new Set(excludeIds);
    return [...this.mems.values()]
      .filter((m) => !skip.has(m.id))
      .map((m) => ({ m, s: overlapScore(query, m.text) }))
      .sort((a, b) => b.s - a.s)
      .slice(0, k)
      .map((x) => x.m);
  }
  async saveCell(runId: string, tier: number, cell: CellResult) {
    this.cells.push({ runId, tier, cell });
  }
  async saveCheckpoint(cp: Checkpoint) {
    this.checkpoints.set(cp.runId, cp);
  }
  async loadCheckpoint(runId: string) {
    return this.checkpoints.get(runId) ?? null;
  }
  async crownChampion(c: Champion) {
    this.champion = c;
  }
  async currentChampion() {
    return this.champion;
  }

  /** Flatten the run for persistence / charting (used by the Atlas exporter). */
  dump() {
    return {
      candidates: [...this.mems.values()],
      cells: this.cells,
      champion: this.champion,
    };
  }
}

/**
 * MongoStore — persists to Atlas. Import lazily so the in-memory demo needs no driver.
 * Collections: candidates, cells, checkpoints, champions (db `shell`).
 */
export async function makeMongoStore(uri: string, dbName = "shell"): Promise<Store> {
  const { MongoClient } = await import("mongodb");
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(dbName);
  const candidates = db.collection<Memory>("candidates");
  const cells = db.collection("cells");
  const checkpoints = db.collection<Checkpoint>("checkpoints");
  const champions = db.collection<Champion & { crownedAt: string }>("champions");

  return {
    async addMemories(mems) {
      // Upsert by id: re-running a tournament refreshes the pool, never duplicates it.
      if (!mems.length) return;
      await candidates.bulkWrite(
        mems.map((m) => ({
          updateOne: { filter: { id: m.id }, update: { $set: m }, upsert: true },
        })),
        { ordered: false },
      );
    },
    async allAlive() {
      return candidates.find({ status: "alive" }).toArray();
    },
    async getMemory(id) {
      return candidates.findOne({ id });
    },
    async searchMemories(query, k, excludeIds = []) {
      // Auto-embed vector search (index `cand_vec`), pre-filtered to living memories.
      const pipeline = [
        {
          $vectorSearch: {
            index: "cand_vec",
            path: "text",
            query: { text: query },
            filter: { status: "alive" },
            numCandidates: Math.max(20, k * 5),
            limit: k + excludeIds.length,
          },
        },
        { $match: { id: { $nin: excludeIds } } },
        { $limit: k },
        { $project: { _id: 0 } },
      ];
      return candidates.aggregate<Memory>(pipeline).toArray();
    },
    async saveCell(runId, tier, cell) {
      await cells.insertOne({ runId, tier, ...cell, at: new Date().toISOString() });
    },
    async saveCheckpoint(cp) {
      await checkpoints.updateOne({ runId: cp.runId }, { $set: cp }, { upsert: true });
    },
    async loadCheckpoint(runId) {
      return checkpoints.findOne({ runId });
    },
    async crownChampion(c) {
      await champions.insertOne(c);
    },
    async currentChampion() {
      const [latest] = await champions.find().sort({ crownedAt: -1 }).limit(1).toArray();
      return latest ?? null;
    },
  };
}
