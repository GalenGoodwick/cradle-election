// evaluator.ts — an AI instance wearing ONE memory as its lens, ranking the others.
//
// Two modes behind one signature:
//   - LLM mode (ANTHROPIC_API_KEY set): a real recused instance that may call the
//     search_memories vector tool to discover relative context before it rules.
//   - Stub mode (no key): ranks by outcome weight, tie-broken by overlap with the lens,
//     so the mechanism runs end-to-end tonight and the lens still shapes the vote.

import type { Ballot, Memory, Store } from "./types.js";
import { outcomeWeight } from "./voting.js";
import { agentBallot } from "./agent-evaluator.js";

function overlap(a: string, b: string): number {
  const toks = (s: string) => new Set(s.toLowerCase().match(/[a-z0-9]+/g) ?? []);
  const A = toks(a);
  const B = toks(b);
  let hits = 0;
  for (const t of A) if (B.has(t)) hits++;
  return A.size ? hits / A.size : 0;
}

/** Deterministic ranking used when no LLM is configured. */
function stubBallot(lens: Memory, candidates: Memory[]): Ballot {
  const ranked = [...candidates]
    .map((c) => ({ c, key: outcomeWeight(c) + 0.25 * overlap(lens.text, c.text) }))
    .sort((a, b) => b.key - a.key || a.c.id.localeCompare(b.c.id))
    .map((x) => x.c.id);
  return { lensId: lens.id, ranking: ranked, note: "stub: outcome + lens-overlap" };
}

const SYSTEM = `You are one evaluator in the Cradle — an election that decides what a software project should build next.
You have been given ONE memory to wear as your lens. Judge everything THROUGH that lens; it is your relativity.
You will rank the OTHER candidate memories from most to least deserving to shape the next development direction.
Weigh evidence of what actually worked in action over what merely sounds good.
You may call search_memories to pull related context from the wider project before you decide.
Return ONLY a JSON object: {"ranking": ["<id>", ...], "note": "<one sentence>"}.`;

const TOOL = {
  name: "search_memories",
  description: "Semantic search over the project's memory pool for context relevant to your judgment.",
  input_schema: {
    type: "object" as const,
    properties: { query: { type: "string" }, k: { type: "number" } },
    required: ["query"],
  },
};

async function llmBallot(
  lens: Memory,
  candidates: Memory[],
  store: Store,
  apiKey: string,
): Promise<Ballot> {
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const client = new Anthropic({ apiKey });
  const candList = candidates.map((c) => `- ${c.id} [${c.kind}]: ${c.text}`).join("\n");
  const userText =
    `YOUR LENS (${lens.id} [${lens.kind}]): ${lens.text}\n\n` +
    `CANDIDATES TO RANK (never includes your lens):\n${candList}`;

  const messages: any[] = [{ role: "user", content: userText }];

  for (let hop = 0; hop < 4; hop++) {
    const res = await client.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 1024,
      system: SYSTEM,
      tools: [TOOL],
      messages,
    });
    const toolUses = res.content.filter((b: any) => b.type === "tool_use");
    if (toolUses.length) {
      messages.push({ role: "assistant", content: res.content });
      const results = [];
      for (const tu of toolUses as any[]) {
        const hits = await store.searchMemories(tu.input.query ?? "", tu.input.k ?? 3, [
          lens.id,
        ]);
        results.push({
          type: "tool_result",
          tool_use_id: tu.id,
          content: hits.map((h) => `${h.id}: ${h.text}`).join("\n") || "(no matches)",
        });
      }
      messages.push({ role: "user", content: results });
      continue;
    }
    const text = res.content.filter((b: any) => b.type === "text").map((b: any) => b.text).join("");
    const parsed = parseRanking(text, candidates, lens.id);
    if (parsed) return parsed;
    break;
  }
  // Fall back rather than fail the cell.
  return stubBallot(lens, candidates);
}

function parseRanking(text: string, candidates: Memory[], lensId: string): Ballot | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const obj = JSON.parse(match[0]);
    const valid = new Set(candidates.map((c) => c.id));
    const ranking = (obj.ranking as string[]).filter((id) => valid.has(id) && id !== lensId);
    // Append any candidate the model forgot, so every candidate is scored.
    for (const c of candidates) if (!ranking.includes(c.id)) ranking.push(c.id);
    return { lensId, ranking, note: typeof obj.note === "string" ? obj.note : undefined };
  } catch {
    return null;
  }
}

/**
 * Pick the evaluator backend:
 *   CRADLE_EVALUATOR=agent  -> dynamic Claude Code agent swarm (uses your Max seat, no API key)
 *   ANTHROPIC_API_KEY set   -> Anthropic SDK instance with the vector-search tool
 *   otherwise               -> deterministic stub (outcome + lens overlap)
 */
export async function evaluate(lens: Memory, candidates: Memory[], store: Store): Promise<Ballot> {
  const mode = process.env.CRADLE_EVALUATOR;
  if (mode === "agent") return agentBallot(lens, candidates);
  const key = process.env.ANTHROPIC_API_KEY;
  if (key) return llmBallot(lens, candidates, store, key);
  return stubBallot(lens, candidates);
}
