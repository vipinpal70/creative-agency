# Analytics — Media-type colors, stacked throughput bars & turnaround time

This document covers three additions to the Analytics page
(`/dashboard/analytics` and `/client/analytics`):

1. A consistent **media-type color system**.
2. The **per-user throughput bars**, now segmented (stacked) by media type, with a
   hover breakdown and a legend.
3. A new **Average turnaround time** section.

All logic is derived from data we already persist — no schema changes.

---

## 1. Media-type color system

Source of truth: **`lib/media-type-colors.ts`**. It is framework-free (no mongoose
/ React), so both the API route and the client components import it.

### Categories & colors

Media type is free-text in the data — a draft may carry `"Static"`,
`"Video / Reel"`, `"article/blog"`, etc., and the parent deliverable's `type` is a
free-text scope label (`"Reels"`, `"Static Posts"`). We fold that into six fixed
categories, each with a prescribed color. The category order is fixed and is the
categorical assignment order (hues are never cycled):

| Category | Label | Light | Dark | Requested hue |
|---|---|---|---|---|
| `article` | Article / Blog | `#e34948` | `#e66767` | red |
| `carousel` | Carousel | `#eb6834` | `#d95926` | orange |
| `reel` | Reel | `#4a3aa7` | `#9085e9` | purple |
| `static` | Static / Image | `#eda100` | `#c98500` | yellow |
| `video` | Video | `#2a78d6` | `#3987e5` | blue |
| `other` | Other (fallback) | `#898781` | `#898781` | gray |

`other` is a documented catch-all so every stacked bar sums to 100% even for
unmapped free-text deliverable types.

### Classification rules — `classifyMediaType(raw)`

The raw string is lowercased and trimmed, then matched against ordered regexes.
**Order matters**; the first match wins:

1. `article | blog | copy | text | seo` → `article`
   *(the article family is tested first because it also covers copy/text/SEO items
   that have no creative)*
2. `carousel` → `carousel`
3. `reel` → `reel`
   *(before `video`, so an ambiguous `"Video / Reel"` resolves to reel per spec)*
4. `video | long form/format` → `video`
5. `static | image | story | gif` → `static`
6. anything else / empty → `other`

### Color delivery (theme-aware)

The colors are exposed as CSS custom properties (`--media-article`, `--media-reel`,
…) scoped to the `.analytics-media` card. A local `<style>` block sets the light
values and overrides them under `@media (prefers-color-scheme: dark)`, so both
themes live in one place and marks read `var(--media-<category>)`.

### Accessibility validation (dataviz skill)

The five prescribed hues were run through the dataviz palette validator on both
surfaces:

- **Light**: worst adjacent CVD ΔE **16.2** (orange↔red, deutan) — clears the ≥12
  target. Yellow is **sub-3:1** on the light surface → the **relief rule** applies.
- **Dark**: worst adjacent CVD ΔE **26.3**; all five ≥ 3:1 contrast.

The relief rule is satisfied because identity is never carried by color alone:
each stacked segment is separated by a **2px surface gap**, the card ships a
**legend**, and hovering a bar reveals a labeled per-media breakdown.

---

## 2. Per-user throughput — stacked by media type

Component: **`components/analytics/PerUserThroughputChart.tsx`**.

Each team member's bar shows their total copies (or designs, via the toggle) as a
horizontal bar. The bar is **stacked into segments by media category**, each sized
`segment.count / rowTotal` and filled with the category color. Segments have 2px
gaps and rounded outer ends; the total count sits just past the bar end.

### Data

The API returns, per user, `copiesByMedia` and `designsByMedia` — maps of
`MediaCategory → count` that sum to `copies` / `designs` respectively. The active
metric (copies vs designs) picks which map to render.

### Hover breakdown

Hovering anywhere on a user's row opens a tooltip listing **every** media category
present in that bar with its **count and percentage** of the bar total (not just a
single segment). Each segment also has a native `title` fallback.

### Legend

Below the list, inside the same card, a legend renders a swatch + label for each
category **actually present** in the data.

---

## 3. Average turnaround time

Component: **`components/analytics/TurnaroundCard.tsx`**. Pure helpers live in
**`lib/analytics.ts`**; they are computed in the API route
(`app/api/analytics/route.ts`) from the parent deliverable's `statusTimeline`.

Turnaround is reported as **two independent phase averages** (no single combined
number). Each average is taken over items that **completed** that phase — items
still in progress have no end timestamp and are excluded.

### Formulas

**Content phase** (`contentTurnaroundMs`):

```
contentTurnaround = t(content_approved) − t(createdAt)
```

- `t(createdAt)` is the ContentDraft's creation time.
- `t(content_approved)` is the timestamp of the first `content_approved` (or legacy
  `approved`) entry on the deliverable's `writerTimeline`.
- `null` (excluded) if content was never approved, or the timestamps are invalid /
  out of order.

**Design phase** (`designTurnaroundMs`):

```
designTurnaround = t(design_approved) − t(design start)
```

- `t(design start)` is `designStartedBy.startedAt` on the draft (when a designer
  claimed it via "Start Work"); if absent, the first `design_in_progress` entry on
  the `designerTimeline` is used as a fallback.
- `t(design_approved)` is the timestamp of the first `design_approved` entry on the
  `designerTimeline`.
- `null` (excluded) if design was never approved, or a bound is missing.
- Only items that actually carry a design phase count (`requiresDesign` — i.e. not
  a design-skipping copy-only article).

**Average** (`meanMs`): arithmetic mean of the collected non-null durations; `0`
when the sample is empty.

### Response shape

```ts
turnaround: {
  contentAvgMs: number; contentCount: number;
  designAvgMs: number;  designCount: number;
}
```

`*Count` is the sample size (number of items that completed the phase), shown as
"avg over N copies/designs" in the UI.

### Discipline lens

The Analytics discipline tabs narrow which phases are reported, matching the rest
of the page:

- **Copy** tab → content turnaround only (design set to empty).
- **Design** tab → design turnaround only (content set to empty).
- **Both** (default) → both phases computed and shown.

The card also honors this by hiding the phase its tab does not report.

### Formatting

Durations are rendered human-readably by `formatDuration(ms)`: `2d 4h`, `6h 30m`,
`45m`, or `<1m`.

---

## Files touched

| File | Role |
|---|---|
| `lib/media-type-colors.ts` | **New.** Categories, colors, `classifyMediaType`. |
| `lib/analytics.ts` | Types (`copiesByMedia`/`designsByMedia`, `turnaround`) + `contentTurnaroundMs` / `designTurnaroundMs` / `meanMs`. |
| `app/api/analytics/route.ts` | Per-user media tally, turnaround aggregation, payload. |
| `components/analytics/PerUserThroughputChart.tsx` | Stacked bars, hover tooltip, legend, theme-aware color vars. |
| `components/analytics/TurnaroundCard.tsx` | **New.** Content vs design turnaround card. |
| `components/analytics/AnalyticsDashboard.tsx` | Renders the turnaround card. |
