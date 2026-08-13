// tournament.ts — cells compose into tiers; the last survivor is the champion.
// Every candidate in a cell also serves as one evaluator's lens (recused), so the
// value system is endogenous: the memories judge each other through each other.

import type { Store, Memory, CellResult, Champion } from "./types.js";
import { evaluate } from "./evaluator.js";
import { tallyCell } from "./voting.js";

const CELL_SIZE = 5;

function chunk<T>(xs: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < xs.length; i += size) out.push(xs.slice(i, i + size));
  return out;
}

/** Run one cell: each member is a lens; its evaluator ranks the others; tally. */
export async function runCell(store: Store, members: Memory[]): Promise<CellResult> {
  if (members.length === 1) {
    const only = members[0]!;
    return {
      candidateIds: [only.id],
      ballots: [],
      standings: [{ memoryId: only.id, score: 0, bordaPoints: 0, outcomeWeight: 1 }],
      winnerId: only.id,
    };
  }
  const ballots = await Promise.all(
    members.map((lens) =>
      evaluate(
        lens,
        members.filter((m) => m.id !== lens.id), // recusal: never rank your own lens
        store,
      ),
    ),
  );
  return tallyCell(members, ballots);
}

export interface TournamentOptions {
  runId: string;
  cellSize?: number;
  onTier?: (tier: number, survivors: string[]) => void;
}

/** Elect a champion from all living memories. Checkpoints each tier so a crash resumes. */
export async function runTournament(store: Store, opts: TournamentOptions): Promise<Champion> {
  const cellSize = opts.cellSize ?? CELL_SIZE;
  const alive = await store.allAlive();
  if (alive.length === 0) throw new Error("no living memories to elect from");

  const byId = new Map(alive.map((m) => [m.id, m]));
  const tiers: string[][] = [alive.map((m) => m.id)];
  let survivors = alive;
  let tier = 0;
  let lastFinal: CellResult | null = null;

  while (survivors.length > 1) {
    const cells = chunk(survivors, cellSize);
    const winners: Memory[] = [];
    for (const cell of cells) {
      const result = await runCell(store, cell);
      await store.saveCell(opts.runId, tier, result);
      lastFinal = result;
      winners.push(byId.get(result.winnerId)!);
    }
    tier++;
    survivors = winners;
    const ids = survivors.map((m) => m.id);
    tiers.push(ids);
    await store.saveCheckpoint({
      runId: opts.runId,
      phase: survivors.length > 1 ? "running" : "final",
      tier,
      survivors: ids,
      updatedAt: new Date().toISOString(),
    });
    opts.onTier?.(tier, ids);
  }

  const champ = survivors[0]!;
  // Priority spine = the final cell's standings, champion first. Galen's "top priorities".
  const lineage = lastFinal ? lastFinal.standings.map((s) => s.memoryId) : [champ.id];
  const champion: Champion = {
    memoryId: champ.id,
    text: champ.text,
    crownedAt: new Date().toISOString(),
    lineage,
    tiers,
  };
  await store.crownChampion(champion);
  return champion;
}
