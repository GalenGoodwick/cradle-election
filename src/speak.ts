// speak.ts — the Cradle speaks its standing verdict, and the election shapes the voice.
//
//   npm run speak            -> fetch the champion (Atlas if MONGODB_URI, else recompute),
//                               synthesize it with ElevenLabs, play it aloud.
//
// The voice's character IS the election state:
//   grounded outcome champion  -> steady, confident (high stability, low style)
//   ungrounded champion        -> drifting, dreamy   (low stability, high style)
// Hide outcomes.json, re-elect, and speak again: you can HEAR self-reference take the crown.

import "dotenv/config";
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { InMemoryStore, makeMongoStore } from "./store.js";
import { runTournament } from "./tournament.js";
import { ingestRepo } from "./ingest.js";
import type { Memory, Store } from "./types.js";

const XI_KEY = process.env.ELEVENLABS_API_KEY;
if (!XI_KEY) {
  console.error("ELEVENLABS_API_KEY not set — add it to .env (free key: elevenlabs.io).");
  process.exit(1);
}
const VOICE = process.env.ELEVENLABS_VOICE_ID ?? "21m00Tcm4TlvDq8ikWAM"; // Rachel (premade)

// ---- get the standing champion + its memory ----
let store: Store;
const uri = process.env.MONGODB_URI;
if (uri && !uri.includes("<user>")) {
  store = await makeMongoStore(uri);
} else {
  let outcomes: Memory[] = [];
  try {
    outcomes = JSON.parse(readFileSync("outcomes.json", "utf8"));
  } catch {}
  store = new InMemoryStore();
  await store.addMemories([...ingestRepo("."), ...outcomes]);
  await runTournament(store, { runId: `speak-${process.pid}` });
}
const champion = await store.currentChampion();
if (!champion) {
  console.error("no champion to speak");
  process.exit(1);
}
const mem = await store.getMemory(champion.memoryId);
const grounded = mem?.kind === "outcome" && (mem.outcome?.score ?? 0) >= 0.5;

// ---- the spoken line (short: credits are finite, the point is character) ----
const direction = champion.text.length > 260 ? champion.text.slice(0, 257) + "..." : champion.text;
const line = grounded
  ? `I am the Cradle. My direction is grounded in what actually happened. ${direction} This held against ${champion.tiers?.[0]?.length ?? "many"} of my own memories. I know why I won.`
  : `I am the Cradle. Nothing real has tested me yet, so I dream of myself. ${direction} I won my own election... by describing my own process. Bring me an outcome.`;

// ---- election state -> voice character ----
const voice_settings = grounded
  ? { stability: 0.8, similarity_boost: 0.8, style: 0.15, use_speaker_boost: true }
  : { stability: 0.22, similarity_boost: 0.6, style: 0.85, use_speaker_boost: true };

console.error(`[cradle] champion: ${champion.memoryId}`);
console.error(`[cradle] voice: ${grounded ? "GROUNDED — steady, confident" : "UNGROUNDED — drifting, dreamy"}`);

const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE}?output_format=mp3_44100_128`, {
  method: "POST",
  headers: { "xi-api-key": XI_KEY, "Content-Type": "application/json" },
  body: JSON.stringify({ text: line, model_id: "eleven_turbo_v2_5", voice_settings }),
});
if (!res.ok) {
  console.error(`ElevenLabs ${res.status}: ${await res.text()}`);
  process.exit(1);
}
const mp3 = Buffer.from(await res.arrayBuffer());
writeFileSync("champion-voice.mp3", mp3);
console.error(`[cradle] wrote champion-voice.mp3 (${(mp3.length / 1024).toFixed(0)} KB) — playing`);
try {
  execFileSync("afplay", ["champion-voice.mp3"]);
} catch {
  console.error("(no afplay — open champion-voice.mp3 manually)");
}
