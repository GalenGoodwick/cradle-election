// export.ts — run the dogfood election and emit Atlas-ready collections as JSON.
// Produces a flat `votes` collection so Atlas Charts can draw the lens×candidate heatmap.

import { writeFileSync } from "node:fs";
import { InMemoryStore } from "./store.js";
import { runTournament } from "./tournament.js";
import { ingestRepo } from "./ingest.js";
import { bordaPoints } from "./voting.js";

import { readFileSync } from "node:fs";

// Dogfood pool: the repo's own body + its real development outcomes (the flywheel write-back).
const store = new InMemoryStore();
let outcomes = [];
try {
  outcomes = JSON.parse(readFileSync("outcomes.json", "utf8"));
} catch {}
await store.addMemories([...ingestRepo("."), ...outcomes]);
const champion = await runTournament(store, { runId: `export-${Date.now()}` });
const { candidates, cells } = store.dump();

const kindOf = new Map(candidates.map((c) => [c.id, c.kind]));

// One row per (evaluator lens, candidate) — the heatmap grain.
const votes = cells.flatMap(({ tier, cell }, cellIndex) =>
  cell.ballots.flatMap((b) =>
    [...bordaPoints(b.ranking)].map(([candidateId, points]) => ({
      tier,
      cellIndex,
      lensId: b.lensId,
      lensKind: kindOf.get(b.lensId) ?? "unknown",
      candidateId,
      candidateKind: kindOf.get(candidateId) ?? "unknown",
      points,
    })),
  ),
);

const standings = cells.flatMap(({ tier, cell }, cellIndex) =>
  cell.standings.map((s) => ({ tier, cellIndex, ...s })),
);

const out = { candidates, votes, standings, champion };
writeFileSync("run-export.json", JSON.stringify(out, null, 2));
console.log(
  `exported: ${candidates.length} candidates, ${votes.length} votes, ` +
    `${standings.length} standings, champion=${champion?.memoryId}`,
);
