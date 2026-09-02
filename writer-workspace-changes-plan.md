# Writer's Workspace — Implementation Plan

Branch: `paid-media`. Scope: 7 changes to the Writer's Workspace (social calendars + paid campaigns).

---

## 1. Replace "New Campaign" / "New Calendar" with one "Add New +" dropdown

**File:** `components/writer/WriterDashboard.tsx` (lines ~637–644)

Today two buttons sit in the toolbar and set `calendarsView` to `"create-campaign"` / `"create"`. Replace them with a single **"Add New +"** button that opens a small menu with two items:
- **Add campaign** → `setCalendarsView("create-campaign")`
- **Add social media calendar** → `setCalendarsView("create")`

There is **no dropdown primitive** in `components/ui` (only `react-select`, which is for form selects). Implement a lightweight inline dropdown:
- Add local state `const [addMenuOpen, setAddMenuOpen] = useState(false)`.
- Render `<Button>Add New <Plus/></Button>` wrapped in a `relative` container; when open, show an absolutely-positioned menu (`absolute right-0 mt-1 ...`) with the two options styled like the existing `select`/menu items.
- Add a click-outside handler (`useEffect` + `mousedown` listener on a ref, or a full-screen transparent backdrop) to close it. Follow the icon vocabulary already imported: `Megaphone` for campaign, `CalendarPlus` for calendar, `Plus` for the trigger.
- Also update the empty-state CTA (lines ~659–661) if desired — it currently only offers "Create Calendar"; leave as-is or point it at the same menu.

No API or type changes.

---

## 2. Prevent end date < start date (create campaign + create calendar)

Add both a native guard (`min` on the end-date input) and a submit-time check.

**File:** `components/writer/CampaignCreateView.tsx` (Step 2, lines ~290–299)
- End-date input: `min={startDate || undefined}`.
- Optionally set start-date `min` to today for new campaigns (matches VariantModal's launch-date behavior — optional, confirm preference).
- Strengthen `canSubmit` (line ~90) or `handleSubmit` (line ~93) to reject `endDate < startDate` and surface `setError("End date can't be before the start date")`.

**File:** `components/writer/CalendarCreateView.tsx` (Step 2, lines ~326–334)
- End-date input: `min={startDate || undefined}`.
- Add the same guard to the Step‑2 "Next" button disable condition (line ~351) or `handleSubmit`.

**Edit dialogs already validate** (`CampaignEditDialog.tsx:56`, `CalendarEditDialog.tsx:47` both check `new Date(startDate) > new Date(endDate)`), but they lack the `min` attribute on the input — add `min={startDate || undefined}` to their end-date inputs for consistency (small, optional polish).

---

## 3. Rename "Variant" → "Ad Copy" in the paid campaign UI

This is **user-facing text only** — keep internal variable names (`variants`, `addVariant`, etc.) and the file name `VariantModal.tsx` unchanged to limit churn.

**File:** `components/writer/PaidMediaWizard.tsx`
- Button `Add Variant` → `Add Ad Copy` (line ~285).
- `<CopyList noun="variant" title="Campaign Variants" />` → `noun="ad copy"`, `title="Campaign Ad Copies"` (lines ~291–292).
- Toast titles: "Variant added to campaign" → "Ad copy added to campaign"; "Variant sent for internal review", "Variant recalled…", "Variant removed", "Variant updated", "Failed to save variant" → replace "Variant/variant" with "Ad copy/ad copy" (lines ~86, 110, 129, 163, 174, 234).
- Overview row label `"Variants"` → `"Ad copies"` (line ~319).
- Loading text "Loading variants…" → "Loading ad copies…" (line ~279).

**File:** `components/writer/VariantModal.tsx`
- Title `Add Variant {index}` / `Edit Variant {index}` → `Add Ad Copy {index}` / `Edit Ad Copy {index}` (line ~196).
- Footer button `Add Variant to Campaign` → `Add Ad Copy to Campaign` (line ~529).
- Subtitle "A variant is a single ad copy inside this campaign" → "A single ad copy inside this campaign" (line ~200).

**File:** `lib/draft-history.ts` / history — the change-history action label `created: "Created variant"` lives in `VariantModal.tsx` `ACTION_LABEL` (line ~61): → "Created ad copy".

**Note on `CopyList.tsx`:** it already renders `noun`/`title` generically, so no logic change — just the props above.

---

## 4. Rename "Helping URL" → "Reference URL"

The field is already stored as `referenceUrl` and its history label is already **"Reference URL"** (`lib/draft-history.ts:12`). Only the modal label + code comments say "Helping URL".

**File:** `components/writer/VariantModal.tsx`
- Label "Helping URL" → "Reference URL" (line ~275).
- Rename local state `helpingUrl`/`setHelpingUrl` → `referenceUrl`/`setReferenceUrl` for clarity (optional but recommended; lines ~84, 175, 280–281).
- Update the file's top comment block that says "helping URL → referenceUrl" (lines ~17–20, ~84 comment, PaidMediaWizard `referenceUrl` comments lines ~98).

No API/model change (`referenceUrl` already exists end-to-end).

---

## 5. Add a new separate "Copy" field to the ad-copy modal

Per your decision, this is an **additional** field alongside the existing "Primary Text" box — a new persisted field. Proposed machine name: **`adCopy`**, label **"Copy"**.

> Semantic note: standard Meta ad anatomy is Primary Text / Headline / Description — there is no distinct "Copy". Confirm placement/label ("Copy" vs "Ad Copy Notes" etc.) before build; the wiring below is the same regardless of final name.

Full-stack wiring:

1. **Model** — `lib/models/content-draft.model.ts`
   - Add `adCopy: string;` to `IContentDraft` (near line ~49) and `adCopy: { type: String, default: "" }` to the schema (near line ~96).

2. **Types** — `components/writer/types.ts`
   - Add `adCopy?: string;` to `CopyFormData` (paid section, ~line 35) and to `DraftSnapshot` (~line 86).

3. **Create route** — `app/api/clients/[id]/deliverables/[delId]/drafts/route.ts`
   - Destructure `adCopy` from body (~line 77) and persist `adCopy: adCopy || ""` (~line 112).

4. **Patch route** — `app/api/clients/[id]/deliverables/[delId]/drafts/[draftId]/route.ts`
   - Add to `oldValues` snapshot (~line 143), the apply block `if (adCopy !== undefined) draft.adCopy = adCopy` (~line 156), and `newValues` (~line 293).

5. **History label** — `lib/draft-history.ts`
   - Add `adCopy: "Copy"` to `FIELD_LABELS` (~line 22) so edits show in change history.

6. **Modal UI** — `components/writer/VariantModal.tsx`
   - New state `const [adCopy, setAdCopy] = useState(initialData?.adCopy ?? "")`.
   - Add a `<Textarea>`/`<Input>` "Copy" field (place after Description, before CTA/Landing).
   - Add `adCopy?: string` to `VariantModalInitialData`.
   - Include `adCopy` in the `onSave(...)` payload (~line 165) and in `isValid` **only if** it should be required (default: optional).

7. **Wizard mapping** — `components/writer/PaidMediaWizard.tsx`
   - `addVariant` POST body: add `adCopy: form.adCopy` (~line 104).
   - `handleModalSave` PATCH body: add `adCopy: form.adCopy` (~line 226).
   - `openEditModal` initialData: add `adCopy: draft.adCopy ?? ""` (~line 198).

8. **Preview rendering** (so writers + reviewers see it) — `components/writer/AdPreviewCard.tsx`
   - Add `adCopy?: string` prop and render it in the card (e.g., under `primaryText` or in the copy block).
   - Pass it from the three call sites: `VariantModal.tsx` preview (~line 550), `PaidMediaWizard.tsx` preview (~line 357), and reviewer view `components/calendar/ContentPreviewModal.tsx` (~line 582, add `adCopy={draft?.adCopy}`).

Existing drafts default to `""` — no migration needed.

---

## 6. Make Landing URL optional (ad-copy modal)

**File:** `components/writer/VariantModal.tsx`
- Remove `landingUrl.trim()` from the `isValid` expression (line ~155).
- Label "Landing URL *" → "Landing URL (optional)" (line ~422), matching the existing "(optional)" span style used by Description/Video fields.
- `handleSave` already sends `landingUrl.trim()` (empty string is fine) — no other change. `AdPreviewCard` already handles an empty `landingUrl` gracefully.

No API/model change (`landingUrl` is already defaulted to `""`).

---

## 7. Campaign editable after creation — verify existing flow

Per your decision, this already exists and just needs end-to-end verification:
- Card pencil icon (`WriterDashboard.tsx:751–759`) and workspace "Edit Campaign" button (`PaidMediaWizard.tsx:255–259`) both open **`CampaignEditDialog`**, which edits name, brief, platforms, funnel stages, start/end dates and status, PATCHing `/api/clients/[id]/calendars/[calendarId]`.
- Edit visibility is gated by `canManage` (admin or creator) — confirm the logged-in user meets that (line ~135).

**Action:** run the app, create a campaign, confirm the pencil/Edit-Campaign buttons appear and that name + every field save and re-render (state is patched into `calendars` and `activeCalendar`). Fix only if a gap surfaces (e.g., a field not round-tripping).

---

## Data-model / migration summary
Only change #5 touches persistence: one new optional string field `adCopy` on `ContentDraft`, defaulted to `""`. No migration required.

## Suggested build order
1. #3 + #4 (pure text renames) — quick, low risk.
2. #6 (landing optional) — one-line validation change.
3. #2 (date validation) — UI + guards.
4. #1 (Add New dropdown) — self-contained UI.
5. #5 (new Copy field) — full-stack, largest; do last.
6. #7 — verify at the end (covers regressions from the above).

## Verification checklist
- Toolbar shows a single "Add New +" → two options route to the correct create views.
- Campaign & calendar create: end date can't be set before start date (input + submit guard).
- Paid workspace/modal say "Ad Copy" everywhere; history shows "Created ad copy".
- Modal shows "Reference URL" and the new "Copy" field; both persist and appear in the writer preview and the reviewer's `ContentPreviewModal`.
- Landing URL can be left blank and the ad copy still saves/submits.
- Existing campaign edit (pencil + Edit Campaign) saves name and all fields.
- `npm run build` / typecheck passes (new field added to all types + routes).
