// boot.ts — what a fresh instance wears on relaunch.
// Not a context dump: the champion sets the direction, and the priority spine +
// tier structure are the training data that told the project who it currently is.

import type { Store, Champion } from "./types.js";

export interface BootSeed {
  champion: Champion;
  /** Human/agent-readable directive assembled from the election. */
  directive: string;
}

export async function boot(store: Store): Promise<BootSeed | null> {
  const champion = await store.currentChampion();
  if (!champion) return null;

  const priorities = await Promise.all(
    champion.lineage.slice(0, 5).map(async (id) => (await store.getMemory(id))?.text ?? id),
  );

  const directive =
    `# Current development direction (elected champion)\n${champion.text}\n\n` +
    `# Read everything else through this. Standing priorities, in order:\n` +
    priorities.map((p, i) => `${i + 1}. ${p}`).join("\n") +
    `\n\n# This direction won a ${champion.tiers.length}-tier election over ` +
    `${champion.tiers[0]?.length ?? 0} project memories. It holds until a new outcome unseats it.`;

  return { champion, directive };
}
