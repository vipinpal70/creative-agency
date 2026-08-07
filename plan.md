# Analytics Page — Development Plan

> Status: **Planning** · Owner: TBD · Last updated: 2026-08-06
>
> Target route: `app/dashboard/analytics/page.tsx` (currently a "coming soon" stub).
> A parallel, read-restricted client view exists at `app/client/analytics/page.tsx`
> and can reuse the same components with a scoped API.

---

## 1. Goal

Turn the empty Analytics page into an operational dashboard that answers three
questions for the agency team:

1. **How much are we producing?** — total copy/content volume.
2. **How much rework are we doing, and where does it come from?** — internal vs
   client redo rates.
3. **How clean is our first pass?** — one-shot / two-shot / 2+ shot approval
   distribution, plus per-user throughput.

All numbers must be filterable by **date**, **team member**, **client**, and
**media type**.

---

## 2. Data model — where the numbers come from

The analytics are derived entirely from data we already persist. No new
tracking is required; we only need to read and aggregate.

| Source | Model / file | What we read |
| --- | --- | --- |
| **Copies / content** | `ContentDraft` — `lib/models/content-draft.model.ts` | One document = **one copy/content piece**. Fields: `clientId`, `calendarId`, `deliverableId`, `createdBy` (writer), `designStartedBy.userId` (designer who claimed it), `mediaType`, `status`, `createdAt`, `archivedAt`. |
| **Workflow history (the redo signal)** | `Deliverable.statusTimeline` — `lib/models/deliverable.model.ts` | `writerTimeline[]` and `designerTimeline[]`, each an ordered array of `{ status, timestamp, changedBy }`. This is the **authoritative source** for redo counting and shot-approval counting. |
| **Deliverable metadata** | `Deliverable` | `type` (media type from scope), `platforms`, `assignedTeam[]` (`{ userId, role }`), `scheduledDate`, `clientId`, `calendarId`. |
| **Change log (secondary)** | `DraftHistory` — `lib/models/draft-history.model.ts` | `action` ∈ `created|edited|submitted|approved|rejected`, `changedBy`, `changedAt`. Useful for per-edit activity, but it **cannot distinguish internal vs client** redo (both map to `action: "rejected"`), so the timeline is preferred. |
| **Team members** | `User` — `lib/models/user.model.ts` | `firstName`, `lastName`, `email`, `roles[]`, `type` (internal/outsource). Drives the team-member filter and per-user grouping. |
| **Clients** | `Client` — `lib/models/client.model.ts` | Drives the client filter. |

### 2.1 The status pipeline (from `lib/status-flow.ts`)

Understanding this is essential to every KPI. A copy moves linearly through two
phases on a single `status` field:

```
CONTENT phase (writer):
  draft → content_internal_review → content_client_review → content_approved

DESIGN phase (designer):
  content_approved → design_in_progress → design_internal_review
                   → design_client_review → design_approved

PUBLISH: design_approved → scheduled → published
```

**Rework transitions (the redo events):**

| From (review stage) | Triggered by | Resulting status |
| --- | --- | --- |
| `content_internal_review` | internal reviewer | `content_req_change` |
| `content_client_review` | **client** | `content_req_change` |
| `design_internal_review` | internal reviewer | `design_req_change` |
| `design_client_review` | **client** | `design_req_change` |

> **Key derivation:** `content_req_change` / `design_req_change` alone does not
> tell you whether it was internal or client. You must look at the **immediately
> preceding review entry** in the timeline:
> - preceding `*_internal_review` → **internal redo**
> - preceding `*_client_review` → **client redo**

Hard rejects go to `rejected` (content phase) or `design_rejected` (design phase).

---

## 3. Filters

Rendered as a sticky filter bar above the KPIs. All filters combine with AND.
Changing any filter re-fetches `/api/analytics` (or re-derives client-side if we
fetch a raw dataset once — see §6.3).

| Filter | UI control | Backing data | Query param |
| --- | --- | --- | --- |
| **Date range** | Preset chips (Last 7d / 30d / 90d / This month / Custom) + custom range picker | `ContentDraft.createdAt` for volume; timeline entry `timestamp` for redo/approval events | `from`, `to` (ISO dates) |
| **Team member** | `Select` (Radix, `components/ui/select.tsx`), populated from `/api/team` | `ContentDraft.createdBy` (writer) **and** `designStartedBy.userId` (designer); for redo attribution also `timeline.changedBy.userId` | `memberId` |
| **Client** | `Select`, populated from `/api/clients` | `ContentDraft.clientId` / `Deliverable.clientId` | `clientId` |
| **Media type** | `Select`, distinct values | `ContentDraft.mediaType` (primary) with fallback to `Deliverable.type` | `mediaType` |

**Notes**
- Default range: **Last 30 days**. Default all other filters: **All**.
- Media-type options should be the distinct set of `mediaType` values actually
  present (query `ContentDraft.distinct("mediaType")`), since `mediaType` is
  free-text sourced from scope labels — do **not** hardcode an enum.
- Team-member filter should list only internal + outsource staff (exclude
  `role: "client"` users).
- Persist active filters in the URL query string so views are shareable and
  survive refresh.

---

## 4. KPIs & visualisations

### KPI Row 1 — Total Copy/Content + Redo Rates (3 stat tiles)

| Tile | Definition |
| --- | --- |
| **Total Copy/Content** | Count of `ContentDraft` documents matching the filters (excluding `archivedAt != null` unless "include archived" is toggled). |
| **Internal Redo Rate** | % of copies that required at least one *internal* change request. |
| **Client Redo Rate** | % of copies that required at least one *client* change request. |

Show each redo tile with the rate (big number) and a small denominator/count
subtitle (e.g. `18% · 9 of 50 copies`). Optional trend delta vs previous period.

### Visualisation 2 — Shot-Approval Histogram

A histogram (bar chart) over the filtered copies, bucketed by how many review
cycles each copy needed before final approval:

- **One-shot approval** — approved with **0** change requests.
- **Two-shot approval** — approved after exactly **1** change request.
- **2+ shot approval** — approved after **2 or more** change requests.

X-axis: the three buckets. Y-axis: number of copies. Show count + % of total on
each bar. (Optionally split content-phase vs design-phase as stacked/grouped
bars — see §5.3.)

### Visualisation 3 — Per-User Throughput

A bar chart: **total copy/content produced per user**, grouped by `createdBy`
(and a designer variant grouped by `designStartedBy.userId`). Alongside it, a
companion metric row: **average designs per day & copies per day, per user**
(and a team average line).

---

## 5. Calculations & formulas

All redo/approval math is computed **per deliverable timeline** (or per draft
grouping), then aggregated. Below, a "copy" = one `ContentDraft`; its lifecycle
events live on its parent `Deliverable.statusTimeline`.

### 5.1 Total copy/content

```
totalCopies = count(ContentDraft where filtersMatch and archivedAt == null)
```

Filters map to: `createdAt ∈ [from, to]`, `clientId`, `mediaType`,
`createdBy == memberId OR designStartedBy.userId == memberId`.

### 5.2 Redo counting (internal vs client)

For each deliverable's `writerTimeline` and `designerTimeline`, walk the ordered
entries and count req_change events, attributing each to internal vs client by
the preceding review stage:

```
function countRedos(timeline):            # timeline = ordered entries by timestamp
  internal = 0
  client   = 0
  prevReviewStage = null
  for entry in timeline (ascending timestamp):
    if entry.status endsWith "_internal_review": prevReviewStage = "internal"
    if entry.status endsWith "_client_review":   prevReviewStage = "client"
    if entry.status endsWith "_req_change":
      if prevReviewStage == "internal": internal += 1
      if prevReviewStage == "client":   client   += 1
      prevReviewStage = null            # reset until the next review stage
  return { internal, client }
```

Apply across both timelines (content redos come from `writerTimeline`, design
redos from `designerTimeline`) and sum per copy.

**Rates:**

```
copiesWithInternalRedo = count(copies where redos.internal >= 1)
copiesWithClientRedo   = count(copies where redos.client   >= 1)

internalRedoRate = copiesWithInternalRedo / totalCopies * 100
clientRedoRate   = copiesWithClientRedo   / totalCopies * 100
```

> **Definition choice — document this in the UI tooltip:** rates are the *share
> of copies that needed ≥1 redo of that type* (a per-copy occurrence rate). An
> alternative "redo intensity" metric (total redo events ÷ total copies, which
> can exceed 100%) can be offered as a secondary number if desired. Pick one and
> label it clearly.

### 5.3 Shot-approval buckets

For each copy that reached a **final-approved** state
(`content_approved` for design-skip copies, else `design_approved`, plus
`scheduled`/`published`), compute its total change-request count:

```
totalRedos(copy) = redos.internal + redos.client        # from §5.2

bucket(copy):
  if totalRedos == 0: "one_shot"
  elif totalRedos == 1: "two_shot"
  else: "two_plus_shot"
```

Histogram values:

```
oneShot     = count(approvedCopies where bucket == "one_shot")
twoShot     = count(approvedCopies where bucket == "two_shot")
twoPlusShot = count(approvedCopies where bucket == "two_plus_shot")
```

Denominator for percentages = number of **approved** copies in the filter set
(copies still in flight are excluded from the histogram, but should be surfaced
as an "in progress: N" footnote so the chart isn't misread).

Optional phase split: bucket by `redos.internal`+`redos.client` restricted to
the content phase vs the design phase → grouped bars.

### 5.4 Per-user throughput & averages

```
copiesPerUser[userId]  = count(ContentDraft where createdBy == userId, filtered)
designsPerUser[userId] = count(ContentDraft where designStartedBy.userId == userId, filtered)

activeDays             = number of distinct calendar days in [from, to]
                         (or distinct days the user actually produced, if we want
                          "per active day" rather than "per calendar day" — decide & label)

avgCopiesPerDay[user]  = copiesPerUser[user]  / activeDays
avgDesignsPerDay[user] = designsPerUser[user] / activeDays

teamAvgCopiesPerDay    = sum(copiesPerUser)  / (userCount * activeDays)
```

Display: horizontal bar chart of `copiesPerUser` (and a toggle for designs), with
`avgCopiesPerDay` / `avgDesignsPerDay` shown per row and a team-average reference
line.

> **Decide up front:** "per day" denominator = **calendar days in range** (simple,
> comparable) vs **active working days** (fairer to part-timers). Recommend
> calendar days in the selected range for v1; note it in the tooltip.

---

## 6. Architecture & implementation

### 6.1 API endpoint

Create `app/api/analytics/route.ts` (admin/staff) following the existing route
conventions (`getSession`, `connectDB`, `isClient`/`forbidden` from
`lib/authz.ts`; see `app/api/approvals/copies/route.ts` as the template).

```
GET /api/analytics?from=&to=&clientId=&memberId=&mediaType=
```

Returns a single JSON payload:

```jsonc
{
  "totals":   { "totalCopies": 0, "approvedCopies": 0, "inProgress": 0 },
  "redo":     { "internalRate": 0, "clientRate": 0,
                "internalCount": 0, "clientCount": 0 },
  "shots":    { "oneShot": 0, "twoShot": 0, "twoPlusShot": 0 },
  "perUser":  [ { "userId": "", "name": "", "copies": 0, "designs": 0,
                  "avgCopiesPerDay": 0, "avgDesignsPerDay": 0 } ],
  "filters":  { "clients": [...], "members": [...], "mediaTypes": [...] }  // for populating dropdowns
}
```

For the client-facing view, add scoping (reuse `assertClientAccess`) so a client
only sees their own `clientId` and never internal-only breakdowns — expose it as
a separate handler or a `scope=client` branch.

### 6.2 Aggregation strategy

Two viable approaches:

- **(A) MongoDB aggregation pipeline** — `$match` on filters, `$lookup` from
  `ContentDraft` into `Deliverable` for the timeline, then compute redo/shot
  buckets. Most efficient at scale but the timeline-walk (§5.2) is awkward in
  pure aggregation.
- **(B) Fetch-then-reduce in the route** — `find()` the filtered `ContentDraft`s
  and their `Deliverable`s (`.lean()`), then run the JS helpers from §5 in the
  route handler. Simpler, testable, matches the codebase's current style, and
  fine for current data volumes.

**Recommendation: (B) for v1**, extract the pure functions (`countRedos`,
`bucketForCopy`, `perUserAgg`) into `lib/analytics.ts` so they're unit-testable
and reusable by both the dashboard and client routes. Revisit (A) if row counts
grow large. Ensure indexes exist (they do: `ContentDraft` is indexed on
`clientId+calendarId`, `createdBy+status`; `Deliverable` on `clientId+*`).

### 6.3 Data flow

1. Page (`app/dashboard/analytics/page.tsx`, client component) reads filters from
   URL query state.
2. On mount / filter change → `fetch('/api/analytics?…')`.
3. Route runs `lib/analytics.ts` reducers → returns payload.
4. Page renders KPI tiles + charts from the payload.

Filter dropdown options can ship in the same payload (`filters` key) so the page
needs only one request.

### 6.4 Charting

No chart library is currently installed (deps are Radix + Tailwind v4 +
lucide-react only). Options:

- **Lightweight custom SVG/CSS** (recommended for v1): the three visualisations
  are simple bar/column charts — build them as small components using CSS/flex
  bars for the histogram and per-user chart. Keeps the bundle lean and matches
  the minimal-dependency ethos.
- **Add `recharts`** if we anticipate richer/interactive charts later.

**Before writing any chart code, invoke the `dataviz` skill** for color, axis,
legend, and light/dark palette guidance, and keep colors consistent with the
existing `STATUS_COLOR` scale in `lib/status-flow.ts` where relevant.

### 6.5 Component breakdown

New files (suggested):

```
app/api/analytics/route.ts              # staff endpoint
lib/analytics.ts                        # pure calc helpers (countRedos, buckets, perUser)
app/dashboard/analytics/page.tsx        # replace stub; wires filters + fetch
components/analytics/
  analytics-filter-bar.tsx              # date + member + client + mediaType controls
  kpi-stat-tile.tsx                     # reusable stat card (total / redo rates)
  shot-approval-histogram.tsx           # one/two/2+ shot bars
  per-user-throughput-chart.tsx         # copies-per-user bars + avg/day
  analytics-empty-state.tsx             # no-data fallback
```

Reuse existing primitives: `components/ui/card.tsx`, `select.tsx`, `tabs.tsx`,
`button.tsx`. Match the page header style already in the stub.

---

## 7. Edge cases & rules

- **Exclude archived copies** by default (`archivedAt != null`) — mirror the
  active-list behavior in `app/api/approvals/copies/route.ts`. Offer an "include
  archived" toggle.
- **Legacy statuses**: normalize with `normalizeDraftStatus` /
  `normalizeDeliverableStatus` before any comparison (legacy `submitted`,
  `approved`, `internal_review`, `client_review` exist in old docs).
- **Design-skip copies** (`article/copy` without creative) finalize at
  `content_approved` and never enter the design phase — treat `content_approved`
  as a terminal approved state for these (`skipsDesignPhase` in `status-flow.ts`).
- **In-progress copies** are excluded from the shot histogram denominator but
  counted in Total Copy/Content; show an explicit "N in progress" note.
- **Division by zero**: guard all rate/average denominators (0 copies → show `—`,
  not `NaN`/`0%`).
- **Member attribution**: a copy has a writer (`createdBy`) and possibly a
  different designer (`designStartedBy`). When the member filter is set, match
  either role; when grouping per-user, keep writer vs designer counts separate.
- **Recalls** (`RECALL_TRANSITIONS`) push status backward and add timeline
  entries — the §5.2 walk resets `prevReviewStage` on each req_change and only
  counts `*_req_change`, so recalls don't inflate redo counts. Verify against
  real data.
- **Multiple req_change from the same review round**: the algorithm counts one
  redo per `*_req_change` entry and resets state, which correctly counts one redo
  per rework cycle.

---

## 8. Build phases / checklist

- [ ] **Phase 0 — Helpers**: `lib/analytics.ts` with `countRedos`,
      `bucketForCopy`, `perUserAgg`; add unit tests with synthetic timelines.
- [ ] **Phase 1 — API**: `app/api/analytics/route.ts` (approach B), returns the
      §6.1 payload; wire filters + archived exclusion + legacy normalization.
- [ ] **Phase 2 — Filter bar**: `analytics-filter-bar.tsx` with URL-synced state;
      populate dropdowns from the payload's `filters`.
- [ ] **Phase 3 — KPI tiles**: Total / Internal Redo Rate / Client Redo Rate.
- [ ] **Phase 4 — Histogram**: shot-approval bars with counts + %.
- [ ] **Phase 5 — Per-user chart**: copies-per-user + avg design/copy per day
      (invoke `dataviz` skill first).
- [ ] **Phase 6 — Empty/error/loading states** + division-by-zero guards.
- [ ] **Phase 7 — Client view**: scope `app/client/analytics/page.tsx` to the
      caller's own client via `assertClientAccess`.
- [ ] **Phase 8 — Verify**: run `/verify` against the real dataset; sanity-check
      redo/shot numbers against a hand-traced deliverable timeline.

---

## 9. Open decisions (confirm before Phase 1)

1. **Redo rate definition** — per-copy occurrence rate (recommended) vs redo
   intensity (events ÷ copies). §5.2.
2. **"Per day" denominator** — calendar days in range (recommended) vs active
   working days. §5.4.
3. **Media-type source** — `ContentDraft.mediaType` (recommended) vs
   `Deliverable.type`. §3.
4. **Phase split** — do we want content-phase vs design-phase breakdowns on the
   histogram/redo tiles in v1, or keep combined? §5.3.
5. **Charting** — custom SVG/CSS (recommended) vs add `recharts`. §6.4.
