# Paid Media Flow — Upgrade Plan

Goal: bring the paid-media campaign flow up to parity with the social flow —
media-type-aware variant creation, a real two-stage (internal → client)
content review that reviewers can actually read, automatic hand-off into the
existing design pipeline, a preview button, and full campaign
(incl. brief) editability.

This document is the "what and why," file by file. `paid-example.md` is the
"what it looks like," walked through with a concrete campaign.

---

## 0. How the social flow actually works (baseline)

Before changing paid, this is the mechanism paid needs to match:

1. **Create** — `CopyModal.tsx` collects a media type, then branches:
   - `Carousel` → N paginated **frames** (`{frameNo, copy, imageUrl}`)
   - `Reel/Video/Story` (regex match via `isReelOrVideoType`) → **Video Type**
     radio (shoot based / motion graphic / stock based) + **Video Notes**
   - `Article/Copy` → with/without-creative toggle + article body
   - anything else → a single **Creative Copy** field
   Plus caption, hashtags, publish date/time, bucket, platform picker.
2. **Persist** — `WriterDashboard.addCopy` / `handleModalSave` POST/PATCH
   `/api/clients/[id]/deliverables/[delId]/drafts[/draftId]`, which stores
   everything on `ContentDraft` (`lib/models/content-draft.model.ts`) —
   `frames`, `videoType`, `videoNotes`, `imageUrl`, `videoUrl`, etc. are all
   generic columns, **not** social-specific.
3. **Review** — `submitCopy` sets draft status → `content_internal_review`.
   The shared pipeline in `lib/status-flow.ts` (`APPROVE_TRANSITIONS`,
   `REJECT_TRANSITIONS`, `RECALL_TRANSITIONS`) drives
   `content_internal_review → content_client_review → content_approved`.
   Reviewers work the queue at `/api/approvals/copies` (GET, status-filtered,
   **no module filter**) inside `app/dashboard/approvals/page.tsx` and the
   client portal, both rendering `ContentPreviewModal`.
4. **Design** — once `content_approved`, the same draft appears in
   `app/dashboard/designer/page.tsx` (also **no module filter** — purely
   status-driven). The designer "claims" it (`design_in_progress`), and the
   upload UI branches on media type exactly like step 1: carousel → per-frame
   image upload, video/reel → single video upload, else → single image
   upload (see `isCarousel`/`isVideoType` in that file, lines ~70-90 and
   ~410-430). Then `design_internal_review → design_client_review →
   design_approved → scheduled → published`.

**The key insight: steps 3 and 4 (review + design) are already 100%
module-agnostic.** They key off `DraftStatus` and `mediaType`, never
`module`. So the paid flow does not need new review/design *logic* — it
needs the paid variant's *data* to be shaped the same way social's is, and
it needs the *display* layers (approvals list, designer list,
`ContentPreviewModal`) to know how to show paid-specific fields
(headline/description/CTA/landing URL) that social never had.

---

## 1. Current-state audit — confirmed gaps

Read directly from the code (not assumptions):

| # | Gap | Where | Impact |
|---|-----|-------|--------|
| G1 | `VariantModal.tsx` shows the **same 8 fields for every media type** — no carousel frames, no video type/notes. `PaidMediaWizard.tsx` diff shows `VARIANT_MEDIA_TYPES = ["Static","Carousel","Video"]` but the form body never branches on it. | `components/writer/VariantModal.tsx` | A Carousel or Video variant can be created with no way to give the designer per-frame copy or video-production notes — the exact information social collects for the design phase. |
| G2 | `PaidCampaignWorkspace.addVariant` / `handleModalSave` never send `frames`, `videoType`, `videoNotes` to the drafts API — only `creativeCopy`, `referenceUrl`, `publishDate`, `headline`, `description`, `cta`, `landingUrl`. | `components/writer/PaidMediaWizard.tsx:63-104, 194-224` | Even if G1 is fixed client-side, the data never reaches the database. |
| G3 | `serializeCopy()` — the function that flattens a `ContentDraft` for the approvals/designer APIs — **drops `headline`, `description`, `cta`, `landingUrl` entirely**. | `lib/serialize-copy.ts:14-61` | Reviewers (internal + client) and the designer cannot see any paid-specific ad copy — not in the approvals queue, not in `ContentPreviewModal`. |
| G4 | `ApprovalCopy` (`lib/adapt-copy.ts`) and `CalendarDraft`/`CalendarCopy` (`components/calendar/types.ts`) — the types `ContentPreviewModal` is built on — also don't have those four fields. | `lib/adapt-copy.ts:5-43`, `components/calendar/types.ts:3-38` | Same as G3, one layer up; even if serializeCopy is fixed, the modal has nowhere to put the data without a type change. |
| G5 | `ContentPreviewModal`'s `MediaPreviewPane` treats `module === "paid"` as `isSocial` (line ~556-558) and renders `SocialMockup`, an Instagram-style card whose body text is `draft.caption`. **Paid variants never set `caption`** (`VariantModal` has no caption field) — so today, a paid variant under review renders as an image/video with **no ad copy at all**. | `components/calendar/ContentPreviewModal.tsx:550-627` | This is the concrete reason "approve content" doesn't really work for paid today: there's nothing to approve *against* — the reviewer sees a bare creative, not the headline/description/CTA they're supposed to be reviewing. |
| G6 | The draft **PATCH** route destructures `videoType`/`videoNotes` into `oldValues` for the history diff, but **never assigns them onto `draft`** — there's no `if (videoType !== undefined) draft.videoType = videoType` line (compare to `headline`/`cta`/etc., which do have that line). | `app/api/clients/[id]/deliverables/[delId]/drafts/[draftId]/route.ts:113-164` (assignments), vs `:283-284` (history-only) | Pre-existing bug, affects social too: editing a Reel/Video copy's Video Type or Video Notes silently does nothing. Paid's new Video variants will hit this immediately once G1/G2 land. |
| G7 | Campaign (`Calendar`, `module: "paid"`) PATCH route doesn't accept `platforms` or `funnelStages` — only `name, objective, startDate, endDate, status, plannedItems, buckets`. | `app/api/clients/[id]/calendars/[calId]/route.ts:94-120` | Even with a UI, campaign platforms/funnel stages can't be saved after creation. |
| G8 | No UI to edit a campaign's brief, platforms, or funnel stages at all. `CalendarEditDialog.tsx` (the existing pencil-icon edit modal, already wired to every calendar card incl. paid ones) only edits `name/startDate/endDate/status`. | `components/writer/CalendarEditDialog.tsx`, `components/writer/WriterDashboard.tsx:737-767` | Matches the user's "Campaign should be editable" / "Campaign Brief should be editable" ask directly. |
| G9 | No "Preview" affordance anywhere in the Writer's workspace (checked `CopyList.tsx` and `VariantModal.tsx` in full) — writers can't see what a variant looks like before submitting it. | `components/writer/CopyList.tsx`, `components/writer/VariantModal.tsx` | New feature, explicitly requested. |
| G10 *(minor, found in passing)* | The calendar list's "Edit Scope" (Sliders icon) button is shown for paid campaigns too, even though `plannedItems`/scope don't apply to paid (the workspace itself already hides the planned-items chips and progress bar for `module === "paid"`, see `WriterDashboard.tsx:808-821`). | `components/writer/WriterDashboard.tsx:737-767` | Cosmetic/UX inconsistency, not a blocker. Recommend gating it to non-paid modules while touching this code for G8. |

None of these require changes to `lib/status-flow.ts`, the designer claim/
upload logic, or the `ContentDraft`/`Calendar` **Mongo schemas** — those are
already generic enough (schemas already have `headline/description/cta/
landingUrl` on `ContentDraft` and `platforms/funnelStages` on `Calendar`,
added in commit `f94cc01`). Everything below is wiring: form UI, request
payloads, serialization, and one new display branch.

---

## 2. Step-by-step plan

### Step 1 — Fix the Video Type / Video Notes PATCH bug (G6)

**File:** `app/api/clients/[id]/deliverables/[delId]/drafts/[draftId]/route.ts`

Add, alongside the other field assignments (near line 149, after
`articleCopy`):

```ts
if (videoType !== undefined)  draft.videoType  = videoType;
if (videoNotes !== undefined) draft.videoNotes = videoNotes;
```

and add `videoType, videoNotes` to the destructured `body` at line 114
(currently only present as `body.videoType` in the history-diff block, not
destructured at the top).

**Why first:** every other step that touches Video variants (Step 3, Step 4)
depends on edits to `videoType` actually persisting. Fixing it in isolation
also repairs the same latent bug for social Reel/Video copies, which is a
pure bug fix with no behavior-change risk elsewhere.

**Acceptance:** edit an existing Reel/Video social copy's Video Type in
`CopyModal`, save, reopen — the new value sticks (today it reverts).

---

### Step 2 — Thread paid fields through the read path (G3, G4)

Three files, in this order (each layer feeds the next):

1. **`lib/serialize-copy.ts`** — add to the returned object:
   ```ts
   headline: draft.headline,
   description: draft.description,
   cta: draft.cta,
   landingUrl: draft.landingUrl,
   ```
2. **`lib/adapt-copy.ts`** — add the same four fields to the `ApprovalCopy`
   interface, and pass them through in `toCalendarCopy()`'s `draft` object.
3. **`components/calendar/types.ts`** — add the same four fields to
   `CalendarDraft`.

**Why before the UI work:** this is pure plumbing with no visible effect
until Step 6 consumes it, but doing it now means Steps 4-6 can be built and
tested against real data instead of stubs.

**Acceptance:** `GET /api/approvals/copies` response for a paid draft
includes non-empty `headline`/`cta`/etc. once Step 3 starts populating them.

---

### Step 3 — Media-type-aware `VariantModal` (G1)

**File:** `components/writer/VariantModal.tsx`

Mirror `CopyModal.tsx`'s branching (it already imports
`isReelOrVideoType` from `lib/status-flow` — reuse it, don't reinvent):

- **Static** (default): keep the current single "Primary Text" field.
- **Carousel** (`mediaType.toLowerCase() === "carousel"`): replace the single
  Primary Text textarea with the same paginated frame editor `CopyModal`
  uses (`frames: {frameNo, copy, imageUrl}[]`, frame-count selector,
  prev/next nav, per-frame copy + optional image URL). This reuses the
  *existing* `frames` field on `ContentDraft` — no schema change.
  - **Design decision:** the ad-level `Headline` / `Description` / `CTA` /
    `Landing URL` fields stay **shared across the whole carousel** (one ad,
    one CTA/link), while each **frame's `copy`** is that card's own text.
    This matches the current schema (`frames[].copy`, no per-frame
    headline/link) and is a reasonable v1 scope — call out in the doc that a
    "true" Meta-carousel model (per-card headline + per-card link) is a
    schema change, deferred (see §5 Open Questions).
- **Video** (`isReelOrVideoType(mediaType)`, matches "Video" out of the box):
  add the same **Video Type** radio (shoot based / motion graphic / stock
  based) + **Video Notes** input block `CopyModal` has.
- Media-type switch buttons stay disabled in edit mode, same as `CopyModal`
  (media type shouldn't change after creation, since the review pipeline is
  keyed off it downstream).

Update `VariantModalInitialData` (top of the same file) to add
`frames?`, `videoType?`, `videoNotes?` so `PaidMediaWizard.tsx`'s
`openEditModal` can pass them through (Step 4 needs this).

**Why:** this is the direct implementation of "same as in social media flow
of based on the selected media type" — the actual UI gap.

**Acceptance:** creating a Carousel variant lets you fill N frames; creating
a Video variant shows Video Type + Video Notes; Static is unchanged.

---

### Step 4 — Wire the new fields into the workspace (G2)

**File:** `components/writer/PaidMediaWizard.tsx`

- `addVariant`: add `frames: form.frames ?? []`, `videoType: form.videoType`,
  `videoNotes: form.videoNotes` to the drafts POST body (mirrors
  `WriterDashboard.addCopy`, lines 260-280).
- `handleModalSave` (edit branch): same three fields added to the PATCH
  body.
- `openEditModal`: populate `frames`, `videoType`, `videoNotes` from the
  existing draft into `VariantModalInitialData` (mirrors
  `WriterDashboard.openEditModal`, lines 358-383).
- `addVariant`'s deliverable `title` fallback logic (currently
  `headline → creativeCopy → "${mediaType} variant"`) should also fall back
  to `frames[0]?.copy` for Carousel, same pattern `WriterDashboard.addCopy`
  already uses (line 249-251).

**Why:** this is the piece that actually gets Step 3's new form fields to
the database, closing the loop opened in Step 1 for Video, and populating
`frames` for Carousel for the first time.

**Acceptance:** create a Carousel variant with 3 frames filled in, refresh
the page, reopen it for edit — all 3 frames still have their copy.

---

### Step 5 — Build a shared `AdPreviewCard` component

**New file:** `components/writer/AdPreviewCard.tsx` (presentational, no
data fetching — takes props only, so it can be reused by both the writer's
pre-submit preview *and* the reviewer-facing `ContentPreviewModal`).

Props: `{ mediaType, primaryText, frames, videoUrl, thumbnailUrl, imageUrl,
headline, description, cta, landingUrl, platforms }`.

Rendering:
- Media area on top: reuse the same `getMediaCategory` dispatch idea from
  `ContentPreviewModal.tsx` (carousel → swipeable frames, video → player,
  static → image, and an empty-state placeholder pre-design when no
  creative is uploaded yet — which is the common case *during* content
  review, before the design phase has produced any image/video).
- Ad-copy block below: primary text, then **headline (bold)**,
  **description (muted)**, a **CTA button** styled like a real ad button
  (`cta` value as the label), and the **landing URL** shown as a muted
  display-link line — this is the part that's completely new; nothing in
  the codebase renders these fields today (confirmed in the G3/G5 audit).
- Optional `platform` prop drives light chrome differences (a Meta-style
  card vs. a Google-style text-first card vs. LinkedIn chrome) — **phase 2**,
  see §5. Phase 1 ships one neutral ad-card layout regardless of platform.

**Why a new shared component instead of extending `SocialMockup` in place:**
`SocialMockup` is Instagram-caption-shaped (`caption`, `hashtags`, heart/
comment/bookmark icons) and is still correct for actual social posts. Paid
ads have a structurally different anatomy (headline + description + CTA +
link, no caption/hashtags). Branching the *existing* component internally
for `module === "paid"` would tangle two unrelated visual languages in one
function; a sibling component keeps both simple and testable in isolation.

**Acceptance:** component renders correctly given mock props for all three
media types, with and without a creative uploaded yet.

---

### Step 6 — "Preview" button in the writer workspace (G9)

**Files:** `components/writer/VariantModal.tsx`,
`components/writer/CopyList.tsx` (or a thin wrapper used only by
`PaidCampaignWorkspace`, since `noun`/`title` are already parameterized
there — see below).

- In `VariantModal`'s footer, add a **Preview** button (outline style,
  between Cancel and Save) that opens `AdPreviewCard` in a lightweight
  modal/drawer, fed from the form's *current in-memory state* (not saved
  data) — so a writer can check the ad before saving at all.
- In `CopyList`, add an optional `onPreview?: (copy: WriterDeliverable) =>
  void` prop (parallel to the existing `onOpenEdit`), rendered as a ghost
  "Preview" icon-button per row — but only pass it from
  `PaidCampaignWorkspace` for now (`CopyList` already supports
  per-workspace behavior overrides via `noun`/`title`; this follows the same
  opt-in pattern so the social flow is untouched unless `WriterDashboard`
  chooses to pass it later — see §5).
- Row-level preview uses the row's saved `latestDraft` fields, rendered
  through the same `AdPreviewCard`.

**Why here, not earlier:** needs `AdPreviewCard` (Step 5) and the
media-type-aware fields (Step 3/4) to have anything meaningful to preview.

**Acceptance:** clicking Preview on an in-progress Carousel variant shows
all filled frames' copy, headline, CTA, and landing URL, before it's ever
saved.

---

### Step 7 — Paid-specific rendering in `ContentPreviewModal` (G5)

**File:** `components/calendar/ContentPreviewModal.tsx`

In `MediaPreviewPane` (~line 550-627), split the current
`isSocial = module === "social" || "paid" || "influencer"` check so `"paid"`
takes its own branch:

```ts
if (item.module === "paid") {
  return (
    <AdPreviewCard
      mediaType={draft?.mediaType || item.type}
      primaryText={draft?.creativeCopy || ""}
      frames={draft?.frames ?? []}
      imageUrl={draft?.imageUrl} videoUrl={draft?.videoUrl} thumbnailUrl={draft?.thumbnailUrl}
      headline={draft?.headline} description={draft?.description}
      cta={draft?.cta} landingUrl={draft?.landingUrl}
      platforms={item.platforms}
    />
  );
}
if (isSocial) { // now social + influencer only
  return <SocialMockup item={item} mediaCategory={mediaCategory} />;
}
```

This is the fix that makes internal + client review of a paid variant
actually show the ad copy being approved — directly closing the user's item
1 ("we approve content from both internal and client") for paid, using the
*exact same component* writers used to preview it in Step 6, so what the
writer previewed is what the reviewer sees.

**Acceptance:** submit a paid variant for internal review, open it in
`app/dashboard/approvals/page.tsx` — headline/description/CTA/landing URL
are visible, not blank.

---

### Step 8 — Verify the design phase needs *no* code changes (item 2)

This is a **verification step, not a coding step** — per the §0 analysis,
`app/dashboard/designer/page.tsx` is already status- and media-type-driven
with zero `module` references anywhere in the file (grepped, confirmed
empty). Once Steps 3-4 make paid variants populate `frames`/`videoType`
exactly like social does, a `content_approved` paid Carousel or Video
variant will appear in the designer's queue and behave identically:
per-frame image upload for Carousel, single video upload for Video, single
image upload for Static — automatically, with no designer-page changes.

**What to actually check manually** (see `paid-example.md` for the full
walkthrough): claim a paid Carousel variant as a designer, confirm the
frame-by-frame upload UI shows the frame copy Step 3/4 captured, submit
through `design_internal_review → design_client_review → design_approved`.

If this manual check surfaces anything module-specific that *does* need a
paid branch (e.g., the designer page's own preview modal, if it renders
something other than `ContentPreviewModal`), treat it as a new finding and
extend this plan — don't guess it in advance.

---

### Step 9 — Campaign editability (G7, G8)

**Backend — `app/api/clients/[id]/calendars/[calId]/route.ts`:**
add to the PATCH handler (next to the existing `buckets` line, ~110):

```ts
if (Array.isArray(platforms))    calendar.platforms    = platforms;
if (Array.isArray(funnelStages)) calendar.funnelStages = funnelStages;
```

(`objective`, `name`, `startDate`, `endDate`, `status` are **already**
patchable — confirmed reading the route — so "Campaign Brief editable" is
otherwise only a UI gap, not a backend one.)

**New file — `components/writer/CampaignEditDialog.tsx`:**
same shape as `CalendarEditDialog.tsx` (name/dates/status), plus:
- **Campaign Brief** — textarea bound to `objective`.
- **Platforms** — the same toggle-chip picker `CampaignCreateView.tsx`
  already built, importing `CAMPAIGN_PLATFORMS` from that file (already
  exported, already imported elsewhere by `PaidMediaWizard.tsx` — no
  duplication).
- **Funnel Stages** — same pattern with `FUNNEL_STAGES`.
- Client/scope/module stay fixed post-creation, matching the existing
  calendar-edit convention (`CalendarEditDialog` doesn't let you change
  those either).

**Wiring — `components/writer/WriterDashboard.tsx`:**
at the pencil-icon click handler (~line 753, currently always opens
`editingCalendar` → `CalendarEditDialog`), branch on
`cal.module === "paid"` to open `CampaignEditDialog` instead. Both dialogs
share the same `onSaved(patch)` contract already used by the list
(`setCalendars`/`setActiveCalendar` merge), so no state-management changes
needed beyond the conditional render.

**Second entry point — inside `PaidCampaignWorkspace`:** add an "Edit
Campaign" button next to the "Campaign Brief" header (where `Target` icon +
brief text currently render read-only, `PaidMediaWizard.tsx:234-240`),
opening the same `CampaignEditDialog`, so a writer doesn't have to leave the
workspace and go back to the calendar list to fix the brief or add a
platform mid-flight. This directly satisfies "Campaign Brief should be
editable" as its own bullet, not just folded into a generic campaign-edit
modal.

**Incidental fix (G10):** while touching the pencil/sliders button row in
`WriterDashboard.tsx`, gate the "Edit Scope" (Sliders) button to
`cal.module !== "paid"`, since paid campaigns have no scope-derived
`plannedItems` to edit (the workspace already hides that whole concept for
paid, per `WriterDashboard.tsx:808-821`).

**Acceptance:** open an existing paid campaign, click Edit Campaign, change
the brief text and toggle LinkedIn on, save, reopen — both persist and the
header card in the workspace reflects them immediately.

---

### Step 10 — Regression pass on the social flow

Everything above either adds new paid-only code paths or touches shared
files (`serialize-copy.ts`, `adapt-copy.ts`, `calendar/types.ts`,
`ContentPreviewModal.tsx`, the drafts PATCH route). None of the shared-file
changes remove or rename existing fields — they're strictly additive (new
optional fields, a new `if module === "paid"` branch that doesn't touch the
existing `isSocial` path for `"social"`/`"influencer"`). Still, run through
the full social flow once after Steps 1-7 land:

- Create a social Carousel copy, edit its frames, submit, approve at both
  stages, open `ContentPreviewModal` — unchanged rendering (still
  `SocialMockup`).
- Create a social Reel copy, set Video Type, edit it, confirm the Step 1 fix
  didn't change any *other* field's behavior.
- Confirm the designer queue still shows social items exactly as before.

---

## 3. File change summary

| File | Change |
|---|---|
| `app/api/clients/[id]/deliverables/[delId]/drafts/[draftId]/route.ts` | Fix: persist `videoType`/`videoNotes` on PATCH (Step 1) |
| `lib/serialize-copy.ts` | Add: `headline/description/cta/landingUrl` to serialized output (Step 2) |
| `lib/adapt-copy.ts` | Add: same 4 fields to `ApprovalCopy` + `toCalendarCopy()` (Step 2) |
| `components/calendar/types.ts` | Add: same 4 fields to `CalendarDraft` (Step 2) |
| `components/writer/VariantModal.tsx` | Add: media-type branching (frames / video type+notes), Preview button, updated `VariantModalInitialData` (Step 3, 6) |
| `components/writer/PaidMediaWizard.tsx` | Wire `frames/videoType/videoNotes` through add/edit; Edit Campaign entry point in header (Step 4, 9) |
| `components/writer/AdPreviewCard.tsx` *(new)* | Shared ad-mockup renderer used by writer preview + reviewer modal (Step 5) |
| `components/writer/CopyList.tsx` | Add optional `onPreview` prop (Step 6) |
| `components/calendar/ContentPreviewModal.tsx` | New `module === "paid"` branch using `AdPreviewCard` (Step 7) |
| `app/api/clients/[id]/calendars/[calId]/route.ts` | Accept `platforms`/`funnelStages` in PATCH (Step 9) |
| `components/writer/CampaignEditDialog.tsx` *(new)* | Full campaign edit: name/dates/status/brief/platforms/funnel stages (Step 9) |
| `components/writer/WriterDashboard.tsx` | Branch pencil-icon to `CampaignEditDialog` for paid; gate Sliders/Scope button off paid (Step 9) |
| `app/dashboard/designer/page.tsx` | **No changes expected** — verify only (Step 8) |

No changes to: `lib/models/*.ts` (schemas already support everything, added
in commit `f94cc01`), `lib/status-flow.ts` (already fully generic).

---

## 4. Recommended implementation order

Steps are already numbered in dependency order (1 → 10). The critical path
is 1 → 2 → 3 → 4 → 5 → 6/7 (6 and 7 can happen in parallel once 5 lands, both
just consume `AdPreviewCard`). Step 9 (campaign editability) is fully
independent of the review/preview work and can be built in parallel by a
second person, or done first if that's the more urgent user-facing ask.

---

## 5. Open questions / things to confirm with the user before or during build

1. **Per-card carousel headline/link** — Step 3 scopes carousel to
   *shared* headline/CTA/link with *per-frame* copy only (matches current
   schema). If real Meta/Google carousel ads with per-card headline + link
   are required, that's a schema change (`frames[].headline`,
   `frames[].landingUrl`) — bigger scope, flag before starting Step 3 if so.
2. **Platform-specific preview chrome** — Step 5 ships one neutral ad-card
   layout in phase 1. Distinct Meta/Google/LinkedIn visual chrome is a
   phase-2 nice-to-have, not required for the core ask ("preview button").
3. **Preview button on social too** — Step 6 wires `onPreview` as opt-in on
   `CopyList` so it's easy to also enable for `WriterDashboard`'s social flow
   later (reusing `AdPreviewCard`'s sibling for social would need a small
   social-flavored preview, i.e. reusing `SocialMockup` in a lightweight
   modal) — not requested, not built here, but the plumbing doesn't block it.
4. **Campaign edit permissions** — Step 9 reuses the existing
   `canManage()` rule (admin or creator) already governing every calendar's
   edit/delete icons. No paid-specific role carve-out (e.g. Account Manager)
   is assumed unless told otherwise.
