export type Pair = { santa: string; recipient: string };

export type DrawResult =
  | { ok: true; pairs: Pair[] }
  | { ok: false; error: string };

// Guards against very slow searches when exclusions make a draw (nearly) impossible.
const MAX_STEPS = 200_000;

function shuffle<T>(items: T[], random: () => number): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Randomly assigns every participant exactly one recipient so that nobody gets
 * themselves and no excluded pair (in either direction) is matched.
 */
export function drawPairs(
  ids: string[],
  exclusions: [string, string][],
  random: () => number = Math.random,
): DrawResult {
  if (new Set(ids).size !== ids.length) {
    return { ok: false, error: "Each participant can only be in the draw once." };
  }
  if (ids.length < 3) {
    return { ok: false, error: "You need at least 3 people for a draw." };
  }

  const blocked = new Map(ids.map((id) => [id, new Set([id])]));
  for (const [a, b] of exclusions) {
    blocked.get(a)?.add(b);
    blocked.get(b)?.add(a);
  }

  const options = new Map(
    ids.map((id) => [id, shuffle(ids.filter((r) => !blocked.get(id)!.has(r)), random)]),
  );
  // Placing the most constrained Santas first keeps the search fast.
  const santas = shuffle(ids, random).sort(
    (a, b) => options.get(a)!.length - options.get(b)!.length,
  );

  const taken = new Set<string>();
  const pairs: Pair[] = [];
  let steps = 0;

  function place(index: number): boolean {
    if (index === santas.length) return true;
    if (++steps > MAX_STEPS) return false;
    const santa = santas[index];
    for (const recipient of options.get(santa)!) {
      if (taken.has(recipient)) continue;
      taken.add(recipient);
      pairs.push({ santa, recipient });
      if (place(index + 1)) return true;
      taken.delete(recipient);
      pairs.pop();
    }
    return false;
  }

  if (!place(0)) {
    return {
      ok: false,
      error: "No valid draw is possible with these exclusions. Try removing some.",
    };
  }
  return { ok: true, pairs };
}
