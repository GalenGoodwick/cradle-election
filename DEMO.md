# Demo video — shot list (~90 seconds)

Record with macOS built-in capture: **⌘⇧5**, select region, "Record Selected Portion".
Terminal font ~18pt, dark theme. One take per shot is fine; cut in QuickTime or just
record straight through.

## Shot 1 — the claim (5s, title card or voiceover)
> "Every agent starts from nothing. This one doesn't — it boots from the winner of an
> election among its own memories."

## Shot 2 — the tested heart (10s)
```bash
npm test
```
9 green tests on `voting.ts` — recusal is structural (it *throws* if an evaluator ranks
its own lens), outcomes multiply votes.

## Shot 3 — the election, live (20s)
```bash
npm run dev -- --self
```
Say what's on screen: 13 memories = this repo's own files; cells → tiers → champion;
the boot seed prints. **The Cradle read its own body and elected its own entry point.**

## Shot 4 — real AI evaluators (15s, can time-lapse the ~50s)
```bash
CRADLE_EVALUATOR=agent npm run dev
```
Each evaluator is a live headless Claude agent, recused, spawned as a swarm. No API key —
it's the same machinery, with real judgment swapped in by one env var.

## Shot 5 — it's all in MongoDB (20s)
Atlas Data Explorer, db `shell`: click through `candidates` (13, `run:"pure-v1"`),
`votes` (52 — the lens×candidate grain), `champions` (the crowned doc with lineage +
tiers). If Charts are built: show the recusal heatmap — "the blank diagonal is every
evaluator refusing to vote for its own lens."

## Shot 6 — the champion flips, live (20s) — THE MONEY MOVE
```bash
mv outcomes.json /tmp/o.json && npm run dev -- --self   # champion: run.ts (self-reference)
mv /tmp/o.json outcomes.json  && npm run dev -- --self   # champion: the grounded outcome
```
> "Same code, same pool — the only difference is one memory of what actually happened.
> Without it the brain elects its own entry point. With it, reality takes the crown.
> Storage that changes what the system does next — live."
Deterministic stub evaluators: this flip works every time.

## Shot 7 — one line plugs the brain back in (15s)
```bash
claude --append-system-prompt "$(npm run -s boot)" -p "what should we build next, and why?"
```
A fresh Claude, zero context, answers with the elected direction and its reasons — because
it booted *wearing* the election. Close:
> "The tournament's standing structure IS the context window. No cold start."

## One-liner for the submission form
The Cradle: an agent whose identity is the current winner of a never-ending election
among its own memories — recused AI evaluators, outcome-grounded votes, checkpointed in
MongoDB, rebooted from the champion. It dogfoods itself: the repo's own files are the
electorate.
