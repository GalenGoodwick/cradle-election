// agent-evaluator.ts — each evaluator is a REAL Claude agent, spawned dynamically.
//
// Instead of one API client, the Cradle shells out to headless Claude Code (`claude -p`)
// once per evaluator: a dynamic swarm of recused agents, each wearing one memory as its
// lens, judged on your Claude Max seat with no API key in the repo. Cells run their
// agents in parallel (see tournament.runCell), so a swarm lands per cell.

import { execFile } from "node:child_process";
import { tmpdir } from "node:os";
import { promisify } from "node:util";
import type { Ballot, Memory } from "./types.js";

const run = promisify(execFile);

const CLAUDE_BIN = process.env.CRADLE_CLAUDE_BIN ?? "claude";
const MODEL = process.env.CRADLE_AGENT_MODEL ?? "sonnet";

function prompt(lens: Memory, candidates: Memory[]): string {
  const list = candidates.map((c) => `- ${c.id} [${c.kind}]: ${c.text}`).join("\n");
  return (
    `You are ONE evaluator in the Cradle, an election deciding what a software project builds next.\n` +
    `Wear this memory as your lens and judge everything THROUGH it — it is your relativity:\n\n` +
    `LENS (${lens.id} [${lens.kind}]): ${lens.text}\n\n` +
    `Rank these OTHER candidate memories, most to least deserving to shape the next direction.\n` +
    `Weigh evidence of what actually worked in action over what merely sounds good.\n\n` +
    `CANDIDATES:\n${list}\n\n` +
    `Reply with ONLY this JSON, nothing else: {"ranking": ["<id>", ...], "note": "<one sentence why>"}`
  );
}

function parse(text: string, candidates: Memory[], lensId: string): Ballot | null {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    const obj = JSON.parse(m[0]);
    const valid = new Set(candidates.map((c) => c.id));
    const ranking = (obj.ranking as string[]).filter((id) => valid.has(id) && id !== lensId);
    for (const c of candidates) if (!ranking.includes(c.id)) ranking.push(c.id); // score every candidate
    return { lensId, ranking, note: typeof obj.note === "string" ? obj.note : undefined };
  } catch {
    return null;
  }
}

/** Spawn one headless Claude agent to produce this evaluator's recused ballot. */
export async function agentBallot(lens: Memory, candidates: Memory[]): Promise<Ballot> {
  const args = ["-p", prompt(lens, candidates), "--output-format", "text", "--model", MODEL];
  try {
    // Run from a neutral cwd so the child doesn't load this project's MCP/plugins.
    const { stdout } = await run(CLAUDE_BIN, args, {
      cwd: tmpdir(),
      maxBuffer: 1 << 20,
      timeout: 120_000,
    });
    const ballot = parse(stdout, candidates, lens.id);
    if (ballot) return ballot;
  } catch {
    // fall through to a safe ranking rather than dropping the whole cell
  }
  return { lensId: lens.id, ranking: candidates.map((c) => c.id), note: "agent fallback" };
}
