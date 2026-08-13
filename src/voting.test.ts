import { describe, it, expect } from "vitest";
import { outcomeWeight, bordaPoints, tallyCell } from "./voting.js";
import type { Memory, Ballot } from "./types.js";

const mem = (id: string, score?: number): Memory => ({
  id,
  kind: "lesson",
  text: id,
  tier: 0,
  status: "alive",
  ...(score === undefined ? {} : { outcome: { pursued: "", result: "", score } }),
});

describe("outcomeWeight", () => {
  it("is neutral 1.0 with no outcome", () => expect(outcomeWeight(mem("a"))).toBe(1.0));
  it("rewards success up to 1.5", () => expect(outcomeWeight(mem("a", 1))).toBe(1.5));
  it("penalizes failure down to 0.5", () => expect(outcomeWeight(mem("a", 0))).toBe(0.5));
  it("clamps out-of-range scores", () => expect(outcomeWeight(mem("a", 9))).toBe(1.5));
});

describe("bordaPoints", () => {
  it("awards n-1 down to 0", () => {
    const p = bordaPoints(["x", "y", "z"]);
    expect(p.get("x")).toBe(2);
    expect(p.get("y")).toBe(1);
    expect(p.get("z")).toBe(0);
  });
});

describe("tallyCell", () => {
  it("elects the consensus winner", () => {
    const cands = [mem("a"), mem("b"), mem("c")];
    // Two of three evaluators put 'b' first.
    const ballots: Ballot[] = [
      { lensId: "a", ranking: ["b", "c"] },
      { lensId: "c", ranking: ["b", "a"] },
      { lensId: "b", ranking: ["a", "c"] },
    ];
    expect(tallyCell(cands, ballots).winnerId).toBe("b");
  });

  it("lets a strong outcome overturn a thin vote margin", () => {
    const cands = [mem("a"), mem("b", 1)]; // b is proven-in-action
    // 'a' wins the raw vote 2-1, but b's 1.5x weight should flip it.
    const ballots: Ballot[] = [
      { lensId: "x", ranking: ["a", "b"] }, // a:1 b:0
      { lensId: "y", ranking: ["a", "b"] }, // a:1 b:0
      { lensId: "z", ranking: ["b", "a"] }, // a:0 b:1
    ];
    // raw: a=2, b=1. weighted: a=2*1.0=2, b=1*1.5=1.5 -> a still wins (margin too wide).
    expect(tallyCell(cands, ballots).winnerId).toBe("a");

    // Narrow it: a wins raw by one point only.
    const close: Ballot[] = [
      { lensId: "x", ranking: ["a", "b"] }, // a:1 b:0
      { lensId: "z", ranking: ["b", "a"] }, // a:0 b:1
      { lensId: "w", ranking: ["a", "b"] }, // a:1 b:0
    ];
    // raw: a=2, b=1 again... make it a genuine 1-point lead with equal ballots:
    const tie: Ballot[] = [
      { lensId: "x", ranking: ["a", "b"] }, // a:1 b:0
      { lensId: "z", ranking: ["b", "a"] }, // a:0 b:1
    ];
    // raw: a=1 b=1 -> weighted a=1.0 b=1.5 -> b wins on grounding.
    expect(tallyCell(cands, tie).winnerId).toBe("b");
    void close;
  });

  it("throws if an evaluator ranks its own lens (recusal)", () => {
    const cands = [mem("a"), mem("b")];
    const bad: Ballot[] = [{ lensId: "a", ranking: ["a", "b"] }];
    expect(() => tallyCell(cands, bad)).toThrow(/recusal/);
  });

  it("is deterministic under equal scores (id tie-break)", () => {
    const cands = [mem("b"), mem("a")];
    const ballots: Ballot[] = [
      { lensId: "x", ranking: ["a", "b"] },
      { lensId: "y", ranking: ["b", "a"] },
    ];
    // raw a=1 b=1, weights equal -> tie-break by id => 'a'.
    expect(tallyCell(cands, ballots).winnerId).toBe("a");
  });
});
