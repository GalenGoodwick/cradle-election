# The Cradle — an autonomous development director

> A persistent, reloadable project brain, where memories are both the candidates and the
> lenses of self-evaluation, and the tournament's standing structure is the priority
> architecture every relaunch trains on.

An LLM agent starts every session from nothing. The Cradle is a persistent process a fresh
instance *wears*: the project's own memory — its code, its lessons, its outcomes — competes in a
recused evaluator tournament, and the champion sets what the project builds next. The brain lives
in MongoDB Atlas; the instance is disposable.

## Plug in

```bash
claude --append-system-prompt "$(npm run -s boot)" -p "what should we build next, and why?"
```

One query fetches the standing champion from Atlas — no re-election — and a fresh Claude boots
already wearing the project's elected direction, its priority spine, and the tier structure that
produced them. Drop the `-p` flag for a full interactive session. Kill the laptop, reclone the
repo: as long as the cluster is up, this line resurrects the identity.

(No `MONGODB_URI`? `boot` falls back to recomputing the election in memory and says so on stderr —
the demo works credential-free; the true reload needs the cluster.)

## The mechanism

Every memory plays two roles at once: it is a **candidate** in the tournament and a **lens** an
evaluator wears. In a cell, N memories compete and N AI instances judge — each wearing one memory
as its relativity, ranking the *others* (never its own — recusal is structural: the tally throws
if violated). The value system is endogenous: the memories judge each other through each other.

- **Election** — cells → tiers → one champion (`src/tournament.ts`, `src/voting.ts`).
- **Grounding at intake** — an `outcome` score in `[0,1]` multiplies a memory's votes by
  `0.5 + score` (with +1 Borda smoothing so grounding grips every candidate — a bug the system's
  own flywheel caught). Reality's only lever, and it's enough: multiplicity defeats individual
  gaming; the outcome weight keeps a robust consensus from drifting into a confident echo.
- **Prioritization** — the champion is loaded first on boot and colors how everything else is read.
- **Reloadable** — a killed tournament resumes from `checkpoints`; a fresh instance boots from the
  champion + spine + tiers. The election record *is* the training data for relaunch.
- **Evaluator backends** — deterministic stub (default, offline), Anthropic SDK with the
  `search_memories` vector tool, or `CRADLE_EVALUATOR=agent`: a dynamic swarm of headless
  Claude Code agents, one per evaluator, no API key.

## Operating manual — three verbs

### 1. Write memory
Code memories write themselves — every source file is ingested fresh each run, so *editing the
repo is editing its memory*. What you write explicitly are **outcomes**, appended to
`outcomes.json` after a direction has actually been pursued:

```json
{
  "id": "outcome-<what>-<YYYY-MM-DD>",
  "kind": "outcome",
  "text": "Pursued X: what actually happened, one honest paragraph.",
  "tier": 0, "status": "alive",
  "outcome": { "pursued": "<the directive>", "result": "<what happened>", "score": 0.8 }
}
```

The discipline that keeps the brain honest: **only real events, dated, scores earned** —
1.0 worked, 0.5 neutral, 0.0 failed. No invented histories.

### 2. Run a tournament
```bash
npm run dev -- --self                          # stub evaluators, deterministic
CRADLE_EVALUATOR=agent npm run dev -- --self   # real Claude agents as the judges
```
With `MONGODB_URI` set this is fully persisted: the pool upserts to Atlas (refresh, never
duplicate), every cell's ballots are recorded, and a new champion document is appended — the
champion timeline grows one entry per election. Run one whenever memory changes.

### 3. Reboot into it
The plug-in line above. The rhythm: **work → append the outcome → elect → next session boots
wearing whatever the election now says.** Close the loop fully by having the booted instance
append the outcome of its own work before it exits — then the Cradle writes its own history and
the human's job reduces to auditing `outcomes.json` for honesty.

## MongoDB-shaped

- experiences (code / outcomes) = documents in `candidates` (one living doc per id; losing an
  epoch archives a memory, never deletes it)
- every ballot = a row in `votes` (the lens × candidate heatmap grain); cells in `cells`
- champion + lineage + tiers = a document in `champions` — the materialized boot state; the
  collection is the succession record
- relaunch = one `find` at boot; crash-resume = `checkpoints`
- evaluator context tool = Atlas Vector Search (`cand_vec`, auto-embed, Voyage)
- Atlas Charts: recusal heatmap (`votes`: X=`candidateId`, Y=`lensId`, color=max `points` — the
  blank diagonal is the no-self-votes law) and the champion succession (`champions`)

## Proof it works — the flywheel, one full revolution

Dogfooded on this very repo, ungrounded, the election crowned `run.ts` — the file that runs
elections. A self-reinforcing system's deepest attractor is self-reference, on schedule.

Then the loop turned once: the elected directive ("protect the demo") was pursued; the pursuit
added end-to-end tests; **the tests caught a real bug** (the outcome weight had zero grip on
zero-Borda candidates); the fix shipped; the result was written back as a dated outcome memory;
the re-election **crowned it, unseating self-reference**. Hide `outcomes.json` and re-run: the
crown reverts. One memory of what actually happened is the entire difference — storage that
changes what the system does next.

`npm test` — 13 green, covering the tally, recusal, checkpoint resume, boot, and the
grounded-unseats-ungrounded property. Demo script: `DEMO.md`. Charts spec: `CHARTS.md`.

## Honest limits

The reloadable brain is not a continuous mind: the process persists, the reader is new each boot.
Reloaded identity = the election record, not conversation history — by design. And the champion
tracks reality only as long as outcome scores stay earned; the audit of `outcomes.json` is where
a human still holds the gate.
