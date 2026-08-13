// tournament.test.ts — protects the demo path end-to-end (pursuing the elected
// directive: "run.ts — the demo IS the product; protect it first").

import { describe, it, expect } from "vitest";
import { InMemoryStore } from "./store.js";
import { runTournament } from "./tournament.js";
import { boot } from "./boot.js";
import type { Memory } from "./types.js";

const mem = (id: string, score?: number): Memory => ({
  id,
  kind: "lesson",
  text: `memory ${id}`,
  tier: 0,
  status: "alive",
  ...(score === undefined ? {} : { outcome: { pursued: "", result: "", score } }),
});

const pool = (n: number) => Array.from({ length: n }, (_, i) => mem(`m${String(i).padStart(2, "0")}`));

describe("end-to-end election (the demo path)", () => {
  it("elects one champion from a multi-cell pool and persists it", async () => {
    const store = new InMemoryStore();
    await store.addMemories(pool(13));
    const champion = await runTournament(store, { runId: "t1" });
    expect(champion.tiers[0]).toHaveLength(13);
    expect(champion.tiers.at(-1)).toEqual([champion.memoryId]);
    expect(await store.currentChampion()).toEqual(champion);
  });

  it("checkpoints every tier so a killed run is resumable", async () => {
    const store = new InMemoryStore();
    await store.addMemories(pool(13));
    await runTournament(store, { runId: "t2" });
    const cp = await store.loadCheckpoint("t2");
    expect(cp).not.toBeNull();
    expect(cp!.phase).toBe("final");
    expect(cp!.survivors).toHaveLength(1);
  });

  it("boot() wears the champion: directive leads with it, priorities in lineage order", async () => {
    const store = new InMemoryStore();
    await store.addMemories(pool(6));
    const champion = await runTournament(store, { runId: "t3" });
    const seed = await boot(store);
    expect(seed).not.toBeNull();
    expect(seed!.champion.memoryId).toBe(champion.memoryId);
    expect(seed!.directive).toContain(champion.text);
    expect(seed!.directive.indexOf(champion.text)).toBeLessThan(
      seed!.directive.indexOf("Standing priorities"),
    );
  });

  it("a grounded outcome can unseat an ungrounded favorite (the flywheel edge)", async () => {
    const store = new InMemoryStore();
    // Two memories: identical standing, one carries a real success outcome.
    await store.addMemories([mem("plain"), mem("proven", 1)]);
    const champion = await runTournament(store, { runId: "t4" });
    expect(champion.memoryId).toBe("proven");
  });
});
