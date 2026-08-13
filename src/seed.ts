// seed.ts — sample project memory: code chunks, lessons, and grounded outcomes.
// In production, `ingest` walks a repo so every file becomes a candidate.

import type { Memory } from "./types.js";

export const SEED: Memory[] = [
  {
    id: "code-engine-collide",
    kind: "code",
    text: "FieldEngine.collide() reads the WGSL shader's SDF at the player point; collision and render share one truth via mod_cf_h.",
    source: "src/engine/FieldEngine.ts",
    tier: 0,
    status: "alive",
  },
  {
    id: "code-deploy",
    kind: "code",
    text: "deploy-facepass.mjs ships shader and step-hook together; shipping geometry without its hook persists a render/collision mismatch.",
    source: "tools/deploy-facepass.mjs",
    tier: 0,
    status: "alive",
  },
  {
    id: "lesson-drift-verifier",
    kind: "lesson",
    text: "Build the drift verifier before the transpiler: sample both copies of a function at N points at deploy time, fail on |delta| > epsilon.",
    tier: 0,
    status: "alive",
    outcome: { pursued: "sampled f32/f64 copies at deploy", result: "caught 2 silent regressions", score: 0.9 },
  },
  {
    id: "lesson-null-marker",
    kind: "lesson",
    text: "Failed fetches that resolve to empty arrays prune worlds; use a null-marker before treating empty as real.",
    tier: 0,
    status: "alive",
    outcome: { pursued: "added null-marker gate", result: "stopped the button-flicker bug", score: 0.85 },
  },
  {
    id: "lesson-just-rewrite",
    kind: "lesson",
    text: "When collision feels off, rewrite the whole engine from scratch for a clean slate.",
    tier: 0,
    status: "alive",
    outcome: { pursued: "attempted full rewrite mid-sprint", result: "lost 3 days, reverted", score: 0.1 },
  },
  {
    id: "lesson-worktree",
    kind: "lesson",
    text: "Edit files in the worktree; never edit the shared checkout and copy over, it reverts other sessions' pushes.",
    tier: 0,
    status: "alive",
    outcome: { pursued: "moved edits into worktree", result: "clobbers stopped", score: 0.8 },
  },
  {
    id: "lesson-universal-core",
    kind: "lesson",
    text: "Make the node runtime the universal core: registry, declared order, owned state, provenance — ship it legacy-neutral and opt-in first.",
    tier: 0,
    status: "alive",
    outcome: { pursued: "shipped rungs 1-2 opt-in", result: "green on real veilfire, unshipped default", score: 0.7 },
  },
  {
    id: "lesson-big-model",
    kind: "lesson",
    text: "Just make the model bigger; scale solves the coherence problem on its own.",
    tier: 0,
    status: "alive",
    outcome: { pursued: '"just be big" objective', result: "refuted to zero against real margin (Jul 8)", score: 0.0 },
  },
];
