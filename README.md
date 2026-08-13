# The Cradle — an autonomous development director

> Identity isn't storage — it's the current winner of a never-ending election among experiences.
> We built the election.

An LLM agent starts every session from nothing. The Cradle is a persistent process a fresh
instance *wears*: the project's own memory — its code, its lessons, its outcomes — competes in a
recused evaluator tournament, and the champion sets what the project builds next. No human in the
loop.

## The mechanism

Every memory plays two roles at once: it is a **candidate** in the tournament and a **lens** an
evaluator wears. In a cell, N memories compete and N AI instances judge — each wearing one memory
as its relativity, ranking the *others* (never its own — recusal is structural). The value system
is endogenous: the memories judge each other through each other.

- **Election** — cells → tiers → one champion (`src/tournament.ts`, `src/voting.ts`).
- **Grounding at intake** — each memory carries an `outcome` score in `[0,1]`; the tally multiplies
  votes by `0.5 + score`. Reality's only lever, and it's enough: multiplicity defeats individual
  gaming, the outcome weight keeps a robust consensus from drifting into a confident echo.
- **Prioritization** — the champion is loaded first on boot and colors how everything else is read.
- **Reloadable** — a killed tournament resumes from `checkpoints`; a fresh instance boots from the
  champion + priority spine + tier structure (`src/boot.ts`). The election record *is* the training
  data for relaunch.
- **Vectors as a tool** — an evaluator may call `search_memories` (Atlas auto-embed `$vectorSearch`)
  to pull relative context before it rules.

## Run it

```bash
npm install
npm test          # voting.ts — the tallied heart, unit-tested
npm run dev       # in-memory, stub evaluators — no credentials needed
```

Persist to the live Atlas cluster and/or use real LLM evaluators:

```bash
MONGODB_URI="mongodb+srv://<user>:<pass>@persist-sprint.pc2cq36.mongodb.net/" \
ANTHROPIC_API_KEY="sk-ant-..." \
npm run dev
```

## MongoDB-shaped

- experiences (code / lessons / outcomes) = documents in `candidates`
- each cell's ballots and standings = documents in `cells`
- champion + lineage + tiers = a document in `champions` (materialized boot state)
- relaunch = one `find` at boot
- evaluator context tool = Atlas Vector Search (`cand_vec`, auto-embed, Voyage)

## Demoable on Atlas (native, no extra frontend)

- **Data Explorer** — watch `candidates`, `cells`, `champions` fill live during a run.
- **Atlas Charts**:
  1. *Champion timeline* (`champions`) — the development direction changing over time.
  2. *Vote heatmap* (`cells`) — evaluator-lens × candidate; the blank diagonal is recusal, the
     bright column is the winner. The mechanism, drawn.
  3. *Outcome-weighted standings* — grounding pulling the winner.

## Proof it works

Seeded with real cartridge.cafe memory, the election crowns **"build the drift verifier before the
transpiler"** (outcome 0.9) and sinks **"just make the model bigger"** (outcome 0.0) — the exact
Jul 8 refutation, reproduced by the mechanism rather than asserted.
