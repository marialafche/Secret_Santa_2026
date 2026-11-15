import { describe, expect, it } from "vitest";
import { drawPairs, type Pair } from "./draw";

function expectValid(ids: string[], pairs: Pair[], exclusions: [string, string][] = []) {
  expect(pairs).toHaveLength(ids.length);
  expect(new Set(pairs.map((p) => p.santa))).toEqual(new Set(ids));
  expect(new Set(pairs.map((p) => p.recipient))).toEqual(new Set(ids));
  for (const { santa, recipient } of pairs) {
    expect(santa).not.toBe(recipient);
    for (const [a, b] of exclusions) {
      expect([santa, recipient].sort()).not.toEqual([a, b].sort());
    }
  }
}

const people = ["ana", "marko", "iva", "luka", "sara", "petar"];

describe("drawPairs", () => {
  it("gives everyone exactly one recipient who is not themselves", () => {
    for (let run = 0; run < 500; run++) {
      const result = drawPairs(people, []);
      expect(result.ok).toBe(true);
      if (result.ok) expectValid(people, result.pairs);
    }
  });

  it("respects exclusions in both directions", () => {
    const exclusions: [string, string][] = [
      ["ana", "marko"],
      ["iva", "luka"],
      ["sara", "petar"],
      ["ana", "iva"],
    ];
    for (let run = 0; run < 500; run++) {
      const result = drawPairs(people, exclusions);
      expect(result.ok).toBe(true);
      if (result.ok) expectValid(people, result.pairs, exclusions);
    }
  });

  it("reports impossibility when two people can only give to the same person", () => {
    // a and b can each only give to c.
    const result = drawPairs(["a", "b", "c"], [["a", "b"]]);
    expect(result.ok).toBe(false);
  });

  it("reports when someone is excluded from everyone", () => {
    const result = drawPairs(["a", "b", "c", "d"], [
      ["a", "b"],
      ["a", "c"],
      ["a", "d"],
    ]);
    expect(result).toEqual({ ok: false, error: expect.stringContaining("No valid draw") });
  });

  it("requires at least 3 people", () => {
    expect(drawPairs(["a", "b"], []).ok).toBe(false);
  });

  it("rejects duplicate participants", () => {
    expect(drawPairs(["a", "b", "b", "c"], []).ok).toBe(false);
  });

  it("produces different draws over many runs", () => {
    const seen = new Set<string>();
    for (let run = 0; run < 200; run++) {
      const result = drawPairs(people, []);
      if (result.ok) {
        seen.add(
          [...result.pairs]
            .sort((x, y) => x.santa.localeCompare(y.santa))
            .map((p) => p.recipient)
            .join(","),
        );
      }
    }
    expect(seen.size).toBeGreaterThan(50);
  });

  it("handles a large group quickly", () => {
    const many = Array.from({ length: 60 }, (_, i) => `p${i}`);
    const exclusions = Array.from(
      { length: 30 },
      (_, i) => [`p${2 * i}`, `p${2 * i + 1}`] as [string, string],
    );
    const result = drawPairs(many, exclusions);
    expect(result.ok).toBe(true);
    if (result.ok) expectValid(many, result.pairs, exclusions);
  });
});
