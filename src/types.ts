// The Cradle — core types.
// A memory is BOTH a candidate in the tournament AND a lens an evaluator can wear.

export type MemoryKind = "code" | "lesson" | "outcome";

export interface Outcome {
  /** What was pursued when this memory shaped a direction. */
  pursued: string;
  /** Free-text result of pursuing it. */
  result: string;
  /**
   * Grounding at intake, in [0,1]:
   *   1   = acting on this clearly worked
   *   0.5 = neutral / unknown (default when no outcome is attached)
   *   0   = acting on this failed
   * This is reality's only entry point. Multiplicity handles the rest.
   */
  score: number;
}

export interface Memory {
  id: string;
  kind: MemoryKind;
  /** The text an evaluator reads, and the lens an evaluator wears. */
  text: string;
  /** Optional provenance for code memories. */
  source?: string;
  /** Present when this memory has been grounded by a real action. */
  outcome?: Outcome;
  /** Tournament bookkeeping. */
  tier: number;
  status: "alive" | "champion";
}

/** One evaluator's ranked vote within a cell (best first). Its own lens memory is never present (recusal). */
export interface Ballot {
  /** The memory this evaluator wore as its lens. */
  lensId: string;
  /** Candidate ids, best-first. */
  ranking: string[];
  /** Optional one-line rationale (from the LLM, for the demo). */
  note?: string;
}

export interface Standing {
  memoryId: string;
  /** Borda points summed across ballots, then multiplied by the outcome weight. */
  score: number;
  /** Raw Borda points before grounding, for transparency. */
  bordaPoints: number;
  outcomeWeight: number;
}

export interface CellResult {
  candidateIds: string[];
  ballots: Ballot[];
  standings: Standing[];
  winnerId: string;
}

export interface Champion {
  memoryId: string;
  text: string;
  crownedAt: string;
  /** The path of cell-winners that produced this champion — the priority spine. */
  lineage: string[];
  /** Full tier structure of the electing tournament — the relaunch training data. */
  tiers: string[][];
}

/** Persisted between reloads so a killed tournament resumes. */
export interface Checkpoint {
  runId: string;
  phase: string;
  tier: number;
  survivors: string[];
  updatedAt: string;
}

/** Storage seam: InMemoryStore runs tonight, MongoStore runs on Atlas. */
export interface Store {
  addMemories(mems: Memory[]): Promise<void>;
  allAlive(): Promise<Memory[]>;
  getMemory(id: string): Promise<Memory | null>;
  /** Semantic retrieval — the tool an evaluator calls to discover relative context. */
  searchMemories(query: string, k: number, excludeIds?: string[]): Promise<Memory[]>;
  saveCell(runId: string, tier: number, cell: CellResult): Promise<void>;
  saveCheckpoint(cp: Checkpoint): Promise<void>;
  loadCheckpoint(runId: string): Promise<Checkpoint | null>;
  crownChampion(c: Champion): Promise<void>;
  currentChampion(): Promise<Champion | null>;
}
