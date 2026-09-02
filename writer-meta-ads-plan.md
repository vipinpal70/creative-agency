# Paid Ad Copy — Meta-style Multi-value Fields + Realistic Preview

Round 2 changes to the paid-media **Ad Copy** modal (`VariantModal.tsx`) and preview (`AdPreviewCard.tsx`).

---

## A. Make "Copy" mandatory and move it above Primary Text

**File:** `components/writer/VariantModal.tsx`
- Move the `Copy` field block (added last round, currently after Description) to sit **immediately before the Primary Text section**.
- Label `Copy *` (drop the "(optional)" span).
- Add `adCopy.trim().length > 0` to the `isValid` expression (line ~152).

No model/API change (the `adCopy` field already exists end-to-end).

---

## B. Multiple Primary Texts, Headlines & Descriptions (Meta "multiple text options")

Meta lets an ad carry up to **5** primary texts, **5** headlines and **5** descriptions and auto-selects per placement. We'll model these as arrays while keeping the existing scalar fields working for the rest of the pipeline.

### Data model — `lib/models/content-draft.model.ts`
Add three array fields (keep the existing `creativeCopy` / `headline` / `description` scalars):
```ts
primaryTexts: { type: [String], default: [] },
headlines:    { type: [String], default: [] },
descriptions: { type: [String], default: [] },
```
- **Backward-compat on read:** old docs have empty arrays → derive from the scalar (`creativeCopy`/`headline`/`description`).
- **Sync on write:** whenever arrays are written, also set the scalar to element `[0]` (`creativeCopy = primaryTexts[0] ?? ""`, etc.) so the designer view, published pipeline, analytics, social flow, and history all keep working untouched. No migration needed.

### API routes
`app/api/clients/[id]/deliverables/[delId]/drafts/route.ts` (POST) and `.../[draftId]/route.ts` (PATCH):
- Accept `primaryTexts`, `headlines`, `descriptions` from the body (arrays of trimmed, non-empty strings).
- Persist the arrays **and** sync the scalar `[0]` mirror.
- PATCH: add arrays to `oldValues`/`newValues` snapshots so edits appear in change history (`computeChanges` already JSON-serializes arrays).

### History labels — `lib/draft-history.ts`
Add: `primaryTexts: "Primary Texts"`, `headlines: "Headlines"`, `descriptions: "Descriptions"`.

### Serialization — `lib/serialize-copy.ts` + `lib/adapt-copy.ts`
Add the three arrays to `serializeCopy(...)`, the `ApprovalCopy` interface, and the `toCalendarCopy` draft mapping (so the reviewer/designer path receives them).

### Types
- `components/writer/types.ts` — add `primaryTexts?: string[]`, `headlines?: string[]`, `descriptions?: string[]` to **`CopyFormData`** and **`DraftSnapshot`**.
- `components/calendar/types.ts` — add the three arrays to `CalendarDraft`.

### Modal UI — `components/writer/VariantModal.tsx`
- Replace the single `primaryText` / `headline` / `description` state with arrays:
  ```ts
  const [primaryTexts, setPrimaryTexts] = useState<string[]>(
    initialData?.primaryTexts?.length ? initialData.primaryTexts
      : initialData?.creativeCopy ? [initialData.creativeCopy] : [""]
  );
  // same pattern for headlines (fallback [initialData.headline] || [""])
  // descriptions fallback [initialData.description] filtered, may be []
  ```
- Build a small reusable **repeatable-field** renderer (inline in the file or a tiny local component): renders each entry as an `Input`/`Textarea` with a trailing **✕ remove** button, plus an **"+ Add primary text"** / **"+ Add headline"** / **"+ Add description"** button beneath, disabled at **max 5**.
  - Remove button hidden/disabled when only one entry remains for the **required** groups (Primary Text, Headline).
  - Descriptions group may go to zero (optional).
- **Validation (`isValid`):**
  - Primary Text: at least one non-empty entry (for non-carousel; carousel keeps its per-frame rule — see note).
  - Headline: at least one non-empty entry.
  - Descriptions: optional.
- **`handleSave` payload:** send `primaryTexts`, `headlines`, `descriptions` (trimmed, empties dropped). Keep sending the scalar `creativeCopy`/`headline`/`description` as `[0]` for safety, or let the API derive them.
- `VariantModalInitialData`: add the three arrays.

### Wizard mapping — `components/writer/PaidMediaWizard.tsx`
- `addVariant` POST body & `handleModalSave` PATCH body: pass the three arrays.
- `openEditModal` initialData: pass `primaryTexts`/`headlines`/`descriptions` from the draft (with scalar fallback).

> **Carousel note:** today the modal hides Primary Text for carousel and uses per-card copy. Real Meta carousels still have ad-level primary text above the cards. Recommendation: **show the Primary Text(s) block for all media types**; the per-card **frames** block stays carousel-only and unchanged. (Flag if you'd rather keep primary text hidden for carousel.)

---

## C. Realistic Meta ad preview — `components/writer/AdPreviewCard.tsx`

Rework the card to mirror a real Meta feed ad. Change props to accept arrays (`primaryTexts?`, `headlines?`, `descriptions?`) with scalar fallback, so all three call sites keep compiling; update `VariantModal`, `PaidMediaWizard`, and `ContentPreviewModal` to pass the arrays.

**Layout, top → bottom:**
1. **Header chrome** (unchanged): avatar, "Your Brand", "Sponsored".
2. **Primary text** = `primaryTexts[0]`. Clamp to ~5 lines; if it overflows, show an inline **"… See more"** toggle (local `expanded` state) that expands to full text ("See less" to collapse). Detect overflow via a ref/`scrollHeight > clientHeight` check, or a length heuristic as a simpler first cut.
3. **Media square** (carousel / video / static) — unchanged.
4. **Below-image bar:** a flex row —
   - **Left:** `headlines[0]` in bold; optional `descriptions[0]` as a smaller muted line beneath it; (optional muted display-URL line above the headline, as Meta shows).
   - **Right:** a **dummy CTA button** styled like Meta's grey rounded button. Label = the ad's `cta` value, defaulting to **"Get Offer"**. *(Decision: show the selected CTA, or hard-code "Get Offer"? Recommend showing `cta || "Get Offer"`.)*
5. **Actions row** (new): a top-bordered row with **Like** (`ThumbsUp`/`Heart`) and **Comment** (`MessageCircle`) buttons — icon + label, non-interactive. (Optionally add **Share** for realism.)

Remove/repurpose the old bottom "landing URL" link row (its info now lives as the display-URL line by the headline).

---

## Decisions baked in (flag to change)
- **Max 5** entries per group (Meta's limit).
- **Primary Text & Headline required** (≥1 non-empty); **Descriptions optional** (0+).
- **Primary Text shown for carousel too** (needed for a realistic preview).
- CTA button shows the selected `cta`, defaulting to **"Get Offer"**.
- Arrays added alongside scalars (scalar `[0]` kept synced) → **no data migration**, existing drafts and the social/designer/analytics paths untouched.

## Build order
1. Model + API + history labels + serialize/adapt + types (data layer).
2. `VariantModal`: mandatory/moved Copy (A) + repeatable fields (B).
3. `PaidMediaWizard` mappings.
4. `AdPreviewCard` Meta layout (C) + update 3 call sites.
5. `tsc --noEmit`; drive the modal → add/remove multiple texts → preview → save → reopen (edit) → reviewer preview.

## Verification checklist
- Copy is required and sits above Primary Text; save is blocked when empty.
- Can add/remove up to 5 primary texts / headlines / descriptions; last required entry can't be removed.
- Saved arrays reload correctly in edit mode; old single-value drafts still open (scalar → array fallback).
- Preview: 1st primary text with working See more/less; below image → 1st headline + "Get Offer" button on the right + Like/Comment row; reviewer `ContentPreviewModal` shows the same.
- Change history records edits to the new fields.
- `tsc --noEmit` passes.
