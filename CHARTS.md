# Atlas Charts — the Cradle dashboard

Data is already live in Atlas: cluster `persist-sprint`, database `shell`, collections
`candidates` (19), `votes` (84), `champions` (1). Build these in **Atlas → Charts → Add
Dashboard → Add Chart**. Each chart names its data source and encodings exactly.

I can't click the Charts UI for you, but every chart below is ~2 minutes: pick the collection,
drop fields on the encoding shelves, apply the filter. ~15 minutes for the set.

---

## 1. Vote heatmap — the mechanism, with the recusal diagonal drawn

**This is the money chart.** Within one cell, every evaluator-lens ranks every other candidate,
so the only empty square is where a lens would rank *itself* — the blank diagonal *is* recusal.

- **Data source:** `shell.votes`
- **Chart type:** Heatmap
- **Filter:** `cellIndex = 2`  (a clean 5-memory cell; the champion `lesson-drift-verifier` wins it)
- **X axis:** `candidateId` (category)
- **Y axis:** `lensId` (category)
- **Intensity / color:** `points` — aggregate **Max** (each pair appears once, so Max = the value)
- **Color palette:** sequential (e.g. Blues). Empty cells stay uncolored — that's the point.

Read it out loud in the demo: "The bright column is the memory everyone ranked highest.
The blank diagonal is every evaluator refusing to vote for its own lens — recusal, drawn."

> Want the full tournament instead of one cell? Remove the filter. The matrix goes sparse
> (pairs from different cells never met), but the per-cell diagonals are still visible.

---

## 2. Champion timeline — memory changing what the system does next

Shows the elected development direction over time. One point now; each re-run adds another,
and when a new outcome unseats the champion the line steps to a new memory — the Meta Precedent,
visible.

- **Data source:** `shell.champions`
- **Chart type:** Column (or Discrete Line once there are ≥2 champions)
- **X axis:** `crownedAt` (binning: none / per second)
- **Y axis:** `poolSize` (aggregate Max)
- **Series / color:** `memoryId`  ← the label that changes when the direction changes
- **Label:** `text` (optional, as tooltip)

---

## 3. Pool by kind — the project's own body as memory

- **Data source:** `shell.candidates`
- **Chart type:** Donut (or Bar)
- **Label / category:** `kind`
- **Aggregate:** Count
- Result: `code` (13) vs `lesson` (6) — the code-as-memory ingest, visible.

---

## 4. Outcome-weighted standings — grounding pulling the winner

Why `lesson-drift-verifier` (0.9) rose and `lesson-big-model` (0.0, the Jul 8 refutation) sank.

- **Data source:** `shell.candidates`
- **Chart type:** Bar (horizontal)
- **Filter:** `kind = lesson`
- **X axis / value:** `outcome.score` (aggregate Max)
- **Y axis / category:** `id`, sorted by value descending
- Result: drift-verifier and null-marker at the top, big-model pinned at zero.

---

## Live-refresh for the demo

Set the dashboard refresh to 10s (dashboard settings). Then re-run `npm run dev` against
`MONGODB_URI` and the charts update as the election runs — the tournament happening inside
MongoDB's own UI, no external frontend.
