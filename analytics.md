# Analytics — Flows & Logic

This document explains how the Analytics page works end to end: the entry points,
the data it derives its numbers from, every filter (including the Copy/Creative and
Social/Paid tabs), and the exact calculation behind each KPI and chart.

---

## 1. Overview

The Analytics page surfaces four things about content production over a date range:

1. **Volume** — how much copy/content was produced.
2. **Rework (redo) rates** — how often items needed changes, split by *internal*
   review vs *client* review.
3. **Approval quality** — the distribution of how many review cycles approved
   items needed ("one-iteration", "two-iteration", "2+ iteration").
4. **Per-user throughput** — copies authored / designs claimed per team member.

All of it is derived from data we already persist — there is **no separate
analytics store**. Numbers are computed on demand from `ContentDraft` and
`Deliverable` documents.

---

## 2. Entry points

Two routes render the **same** dashboard component with a different `variant`:

| Route | File | Variant | Audience |
|---|---|---|---|
| `/dashboard/analytics` | `app/dashboard/analytics/page.tsx` | `staff` | Agency staff/admin |
| `/client/analytics` | `app/client/analytics/page.tsx` | `client` | Client-portal users |

Both wrap `<AnalyticsDashboard>` in a `<Suspense>` boundary (required because the
component reads the URL search params via `useSearchParams`).

The **staff** variant shows the Client filter; the **client** variant hides it and
the API transparently scopes every query to the caller's own client (see §9).

---

## 3. Architecture at a glance

```
 app/dashboard/analytics/page.tsx ─┐
 app/client/analytics/page.tsx ────┴─► components/analytics/AnalyticsDashboard.tsx
                                          │  (client component: state, URL sync, fetch)
                                          │
                                          ├─ AnalyticsScopeTabs.tsx     ← Copy/Creative + Social/Paid tabs
                                          ├─ AnalyticsFilterBar.tsx     ← date, client, member, media-type
                                          ├─ KpiStatTile.tsx            ← the 3 headline numbers
                                          ├─ ShotApprovalHistogram.tsx  ← approval-lifecycle chart
                                          └─ PerUserThroughputChart.tsx ← per-user bars
                                          │
                                          ▼  fetch(`/api/analytics?…`)
                                   app/api/analytics/route.ts  ← all aggregation lives here
                                          │
                                          ▼  imports pure helpers from
                                   lib/analytics.ts            ← framework-free, unit-testable
```

`lib/analytics.ts` holds **pure functions** (no mongoose/React) so both the API
route and the client components can import from it — the client imports only the
TypeScript types, the API imports the logic.

---

## 4. Data inputs

The numbers come from two collections:

### `ContentDraft` (one document = one "copy")
The unit of volume. Relevant fields:
- `clientId`, `deliverableId`, `calendarId`
- `createdBy` — the writer (drives "copies authored")
- `designStartedBy.userId` — the designer who claimed the item (drives "designs claimed")
- `mediaType`, `articleMode` — used to classify article/copy-only items
- `status` — current pipeline status
- `createdAt` — the date used to place the copy in the range
- `archivedAt` — archived copies are excluded

### `Deliverable` (parent of the draft)
Joined in for two things:
- `type` / `module` — the fallback media type, and the **Social/Paid** scope
- `statusTimeline.writerTimeline` / `statusTimeline.designerTimeline` — the ordered
  status-change log from which **redos** are derived.

---

## 5. Request / response contract

### Request — `GET /api/analytics`
Query params (all optional):

| Param | Meaning | Values |
|---|---|---|
| `from`, `to` | Date range (inclusive) | `yyyy-mm-dd`; default = last 30 days |
| `clientId` | Scope to one client (staff only) | client id / empty = all |
| `memberId` | Scope to one team member | user id / empty = all |
| `mediaType` | Filter by effective media type | string / empty = all |
| `discipline` | **Copy/Creative tab** | `""` (all) · `copy` · `design` |
| `module` | **Social/Paid tab** | `""` (all) · `social` · `paid` |

### Response — `AnalyticsResponse` (`lib/analytics.ts`)
```ts
{
  range:   { from, to, activeDays },
  totals:  { totalCopies, approvedCopies, inProgress },
  redo:    { internalRate, clientRate, internalCount, clientCount },
  shots:   { oneShot, twoShot, twoPlusShot },
  perUser: [{ userId, name, copies, designs, avgCopiesPerDay, avgDesignsPerDay }],
  filters: { clients[], members[], mediaTypes[] }   // option lists for the dropdowns
}
```

The response **shape never changes** with the discipline — instead the server
recomputes the *values* for the selected phase, and the dashboard relabels the
tiles (e.g. "copies" → "designs").

---

## 6. Client flow (`AnalyticsDashboard.tsx`)

1. **Initialise filters from the URL.** Every filter (dates, client, member, media
   type, discipline, module) is read from the query string on first render, so the
   view is shareable and survives a refresh. Missing values fall back to the
   last-30-days default.
2. **Build the query string** from the filter state (`useMemo`).
3. **Keep the URL in sync** — `router.replace(?…)` whenever the query changes.
4. **Fetch** `/api/analytics?…` on every query change, with an `AbortController`
   so a superseded request is cancelled. Errors and loading states are handled.
5. **Render** the tabs, the filter bar, then the KPI row + charts. While a refetch
   is in flight the existing data stays visible at reduced opacity.

---

## 7. Filters

### 7.1 Standard filters (`AnalyticsFilterBar.tsx`)
- **Date range** — preset buttons (7d / 30d / 90d / This month) + custom date
  inputs. A copy is in range if its `createdAt` is within `[from, to]`.
- **Client** (staff only), **Team member**, **Media type** — dropdowns populated
  from the `filters` option lists in the response.

Applied in the API:
- Date + client + member narrow the **Mongo query** (`draftQuery`).
- **Media type** is applied *after* the deliverable join, because the "effective"
  media type is `draft.mediaType` with a fallback to `deliverable.type`.

### 7.2 The two tabs (`AnalyticsScopeTabs.tsx`)
Two segmented controls sit at the top of the page. Each keeps an **All** option so
the default view is the combined dashboard.

| Tab group | Options → value | What it does |
|---|---|---|
| Discipline | All `""` · Copy `copy` · Creative `design` | Picks *which production phase's* numbers you see |
| Scope | All `""` · Social Media `social` · Paid Media `paid` | Filters items by their deliverable's `module` |

Both tabs live in the same URL-synced filter state as everything else, so changing
a tab re-fetches and recomputes **all** KPIs and charts.

The **Scope** tab is a straightforward set filter: after the join, rows are kept
only where `row.module === moduleFilter` (module comes from the parent
deliverable). It composes with the discipline tab (scope is applied first).

---

## 8. The discipline lens (Copy vs Creative)

This is the core of the aggregation. The Copy/Creative tab does **not** just filter
rows — it changes the *meaning* of every metric, because copy work and design work
are two distinct phases recorded on two separate timelines.

Per draft, the API derives phase-split facts once (`route.ts`):

```ts
{
  copyInternal,  copyClient,     // redos from the WRITER timeline
  designInternal, designClient,  // redos from the DESIGNER timeline
  contentApproved,               // passed content review?  (isContentApproved)
  designApproved,                // reached design approval? (isApprovedCopy)
  requiresDesign,                // has a design phase at all? (!skipsDesignPhase)
}
```

Then the selected `discipline` chooses the population, the approval test, the redo
source, and the throughput counter:

| Aspect | `copy` (Copy) | `design` (Creative) | `""` (All / default) |
|---|---|---|---|
| **Population** | every draft | drafts where `requiresDesign` (excludes copy-only articles) | every draft |
| **"Approved" means** | `contentApproved` | `designApproved` | `designApproved` |
| **Internal redo source** | `copyInternal` (writer timeline) | `designInternal` (designer timeline) | `copyInternal + designInternal` |
| **Client redo source** | `copyClient` | `designClient` | `copyClient + designClient` |
| **Shot buckets over** | content-review cycles | design-review cycles | combined cycles |
| **Per-user counter** | `copies` (by `createdBy`) | `designs` (by `designStartedBy.userId`) | both |
| **Tile label / unit** | "Total copy / content", "copies" | "Total designs", "designs" | "Total copy / content", "copies" |

`requiresDesign = !skipsDesignPhase(...)`. An `article/copy` (or blog) submitted
`without-creative` skips the design phase entirely, so it is **excluded** from the
Creative population — it has no creative work to measure.

> **Note on the Creative total:** it counts every item that *requires* design,
> including items not yet claimed/started. If you want it to count only items where
> design has actually begun (`designStartedBy` set), that is a one-line change.

The **All** column reproduces the pre-tabs behaviour exactly, so the default
dashboard is unchanged.

---

## 9. Calculations in detail

Let `population` and the `internalOf` / `clientOf` / `isApproved` selectors be as
chosen by the discipline (§8). Then:

### 9.1 Totals (`KpiStatTile` — "Total copy / content" / "Total designs")
```
totalCopies    = population.length
approvedCopies = population.filter(isApproved).length
inProgress     = totalCopies − approvedCopies
```

### 9.2 Redo rates (`KpiStatTile` — Internal / Client redo rate)
A "redo" is a `*_req_change` transition attributed to the review stage that
*preceded* it in the timeline (see §10). An item counts once for a rate if it had
**≥ 1** redo of that type:
```
internalCount = population.filter(r => internalOf(r) >= 1).length
clientCount   = population.filter(r => clientOf(r)   >= 1).length
internalRate  = safeRate(internalCount, totalCopies)   // = count / total * 100, 0 if no items
clientRate    = safeRate(clientCount,   totalCopies)
```
So the rate is the **share of items that needed at least one redo of that type**,
not the average number of redos.

### 9.3 Approval lifecycle (`ShotApprovalHistogram`)
Computed over **approved items only**, bucketed by total review cycles for the
selected phase (`shotBucketFor`):
```
cycles = internalOf(r) + clientOf(r)
0 cycles  → oneShot      ("One-iteration"  — approved with no changes)
1 cycle   → twoShot      ("Two-iteration"  — 1 change requested)
2+ cycles → twoPlusShot  ("2+ iteration"   — 2 or more changes)
```
In-progress (not-yet-approved) items are excluded and reported in a footnote.

### 9.4 Per-user throughput (`PerUserThroughputChart`)
```
activeDays = inclusive calendar days in [from, to]   (min 1, avoids ÷0)
for each row in population:
    if discipline != design → tally[createdBy].copies  += 1
    if discipline != copy   → tally[designerId].designs += 1
avgCopiesPerDay  = copies  / activeDays
avgDesignsPerDay = designs / activeDays
```
User ids are resolved to display names in a single `User.find`. When a discipline
is pinned, the chart's copies/designs toggle is hidden (`lockedMetric`) because the
other measure is empty by construction.

---

## 10. How redos are derived from timelines (`lib/analytics.ts`)

A `*_req_change` status alone doesn't say whether the change was requested at an
**internal** or a **client** review. `countRedosInTimeline` resolves this by walking
the ordered timeline and attributing each `req_change` to the review stage that
immediately preceded it:

```
sort entries by timestamp
prev = null
for each entry:
    if entry is an internal/client review stage → prev = that stage
    else if entry ends with "_req_change":
        prev == internal → internal++
        prev == client   → client++
        prev = null           // reset: one redo counted per rework cycle
```

- **Copy/content** redos live on `writerTimeline` (`content_*` statuses).
- **Design/creative** redos live on `designerTimeline` (`design_*` statuses).
- Legacy statuses (pre content/design split) are normalised first, and the
  `internal_review` / `client_review` values without a prefix are handled explicitly.

---

## 11. Approval helpers (`lib/analytics.ts`)

- `isContentApproved(status)` — true unless the status is still in the content
  phase (`draft`, `content_internal_review`, `content_client_review`,
  `content_req_change`, `rejected`). Used by the **Copy** view's approval test.
- `isApprovedCopy({status, mediaType, articleMode})` — true for the terminal design
  states (`design_approved` / `scheduled` / `published`), plus `content_approved`
  when the item skips the design phase. Used by **Creative** and **All**.
- `skipsDesignPhase(...)` — true for `article/copy`-type items in
  `without-creative` mode (nothing to design). Drives `requiresDesign`.

---

## 12. Access control & client scoping (`route.ts`)

- Unauthenticated → `401`.
- **Client users** are locked to their own client: `resolveClientId(session)`
  overrides any `clientId` param, and the client/member option lists are scoped so
  a client can't enumerate the agency's other clients or staff.
- **Staff** may filter to any client or view all.
- Archived copies (`archivedAt != null`) are always excluded.

---

## 13. File map

| File | Responsibility |
|---|---|
| `app/dashboard/analytics/page.tsx` | Staff entry point (`variant="staff"`) |
| `app/client/analytics/page.tsx` | Client entry point (`variant="client"`) |
| `app/api/analytics/route.ts` | All aggregation: query, join, discipline lens, KPIs |
| `lib/analytics.ts` | Pure helpers + shared types (redo derivation, approval tests, rates) |
| `components/analytics/AnalyticsDashboard.tsx` | State, URL sync, fetch, layout |
| `components/analytics/AnalyticsScopeTabs.tsx` | Copy/Creative + Social/Paid tabs |
| `components/analytics/AnalyticsFilterBar.tsx` | Date / client / member / media-type filters |
| `components/analytics/KpiStatTile.tsx` | Headline stat tiles |
| `components/analytics/ShotApprovalHistogram.tsx` | Approval-lifecycle distribution |
| `components/analytics/PerUserThroughputChart.tsx` | Per-user copies/designs bars |
</content>
