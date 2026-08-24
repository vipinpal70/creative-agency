# Paid Media Flow — Worked Example

A single concrete run through the whole upgraded flow, end to end, with the
people, screens, and data at each step. Pairs with `paid-upgrade-plan.md`
(each section below is tagged with the plan step it depends on).

Cast:
- **Priya** — Writer, builds the campaign and its variants.
- **Amit** — Account Manager, does internal review, can also recall.
- **The client (Aroma Living)** — does client review via the client portal.
- **Rohit** — Designer, uploads creative once content is approved.

---

## 0. Terminology map (social ↔ paid)

| Social | Paid | Notes |
|---|---|---|
| Calendar | Campaign | Same underlying `Calendar` doc, `module: "paid"` |
| Copy | Variant | Same underlying `ContentDraft`/`Deliverable` pair |
| Objective | Campaign Brief | Same field (`calendar.objective`), relabeled in the UI |
| Buckets | *(none)* | Paid has no content-bucket concept |
| Caption / hashtags | Headline / Description / CTA / Landing URL | Different ad anatomy, same review pipeline |
| Platform picker per-copy | Platforms picked once, at campaign level | Every variant inherits `campaign.platforms` |

---

## 1. Priya creates the campaign

*(existing flow, `CampaignCreateView.tsx` — unchanged by this plan)*

Writer's Workspace → **New Campaign**:

- Step 1 — Client: **Aroma Living**, Scope: *Q3 2026 — Active*
- Step 2:
  - Name: **Diwali Sale Push**
  - Campaign Brief: *"Drive traffic to the Diwali collection landing page
    and generate qualified leads ahead of the festive weekend."*
  - Platforms: **Meta**, **Google**
  - Funnel Stages: **TOF**, **BOF**
  - Start: 2026-10-01 · End: 2026-10-25

→ **Create Campaign**. Priya lands in the campaign workspace, header card
shows the brief + `Meta` `Google` `TOF` `BOF` chips, variant list is empty.

---

## 2. Priya adds three variants (plan Steps 3-4)

Clicking **Add Variant** opens `VariantModal` three times.

### Variant 1 — Carousel

- Media Type: **Carousel** → the modal swaps the old single "Primary Text"
  box for the frame editor (identical widget to the social Carousel flow):
  - Frame count: 4
  - Frame 1 copy: *"Diyas, redefined. Shop the new collection."*
  - Frame 2 copy: *"Hand-poured soy wax. 40-hour burn time."*
  - Frame 3 copy: *"Free shipping over ₹1,999."*
  - Frame 4 copy: *"Diwali collection — live now."*
  - (image URLs left blank — Rohit fills these in during design, see §5)
- Helping URL: *(blank)*
- Headline: **"Diwali Collection is Here"**
- Description: **"Handcrafted candles, diffusers & gifting sets."**
- CTA: **Shop Now**
- Landing URL: **`https://aromaliving.in/diwali`**
- Launch Date: 2026-10-05

Priya clicks **Preview** (plan Step 6) before saving — `AdPreviewCard` opens
showing a swipeable 4-card mock with her frame copy, the headline/
description below, a "Shop Now" button, and the landing URL as a muted link.
She catches that Frame 3's copy is too long and shortens it, right there,
before ever saving a draft.

→ **Add Variant to Campaign**.

### Variant 2 — Video

- Media Type: **Video** → the modal now shows the **Video Type** radio
  (shoot based / motion graphic / stock based) and **Video Notes** field,
  same as a social Reel.
  - Video Type: **Shoot Based**
  - Video Notes: *"15s vertical cut of the studio B-roll, festive colour
    grade, end card with logo + URL."*
  - Primary Text: *"This Diwali, light up differently."*
- Headline: **"New: The Diwali Edit"**
- Description: **"Limited festive scents, while stocks last."**
- CTA: **Learn More**
- Landing URL: **`https://aromaliving.in/diwali/video`**
- Launch Date: 2026-10-08

### Variant 3 — Static

- Media Type: **Static** (unchanged single Primary Text field)
  - Primary Text: *"Gift sets from ₹799."*
- Headline: **"Diwali Gifting, Sorted"**
- Description: *(blank)*
- CTA: **Get Quote**
- Landing URL: **`https://aromaliving.in/diwali/gifting`**
- Launch Date: 2026-10-03

Campaign workspace now lists all three variants in `CopyList` (labelled
"Campaign Variants"), each with a **Preview** icon-button, a status pill
(`Draft`), and Submit / Edit / Remove actions.

---

## 3. Priya submits, Amit reviews internally (plan Steps 2, 7)

Priya clicks **Submit for Review** on Variant 1 (or **Submit All for
Review** to send all three at once). Status → `content_internal_review` on
both the draft and the deliverable.

Amit opens **Approvals** (`app/dashboard/approvals/page.tsx`), filtered to
`content_internal_review`. Variant 1 shows up in the queue. He opens it —
`ContentPreviewModal` now hits the new `module === "paid"` branch
(plan Step 7) and renders the **same `AdPreviewCard`** Priya used to preview
it: the 4 carousel frames, "Diwali Collection is Here" headline, description,
Shop Now button, landing URL — all visible, editable if he wants to tweak
copy before approving.

*(Before this plan: he would have seen a blank/empty Instagram-style card
with no headline, no CTA, no landing URL — nothing to actually review.)*

Amit clicks **Approve**. `APPROVE_TRANSITIONS["content_internal_review"]` →
`content_client_review`.

---

## 4. Client review

Aroma Living's marketing lead logs into the client portal
(`app/client/approvals/page.tsx`), sees Variant 1 in their review queue with
the identical `AdPreviewCard` rendering (read-only mode). They request one
change: *"Frame 2 — mention '100% natural soy wax' instead of just 'soy
wax'."*

That request sends the draft to `content_req_change` with the rejection
note attached. It reappears in Priya's campaign workspace with a red
feedback banner (`CopyList`'s existing rejected-state rendering — unchanged,
already generic). Priya reopens it in `VariantModal`, edits Frame 2's copy,
re-submits (`content_req_change → content_internal_review`, per
`RESUBMIT_TRANSITIONS`). Amit re-approves, client approves.

Status → `content_approved`.

---

## 5. Rohit designs it (plan Step 8 — verification, no new code)

Variant 1 (Carousel, now `content_approved`) appears in Rohit's **Designer**
queue exactly like a social carousel would — the designer page has no
module filter, it's pure status + media type. Rohit clicks **Start Work**
(claims it, → `design_in_progress`), and sees the frame-by-frame upload UI,
pre-populated with the copy Priya wrote:

```
Frame 1  "Diyas, redefined. Shop the new collection."     [Upload image]
Frame 2  "100% natural soy wax candles. 40-hour burn..."  [Upload image]
Frame 3  "Free shipping over ₹1,999."                     [Upload image]
Frame 4  "Diwali collection — live now."                  [Upload image]
```

He uploads one image per frame, submits →
`design_internal_review → design_client_review → design_approved`, same
approve/reject/recall mechanics as social, same `ContentPreviewModal`
(now showing the uploaded creative *and* the ad copy together via
`AdPreviewCard`).

Variant 2 (Video) follows the same path but with a single video upload
instead of four frame images. Variant 3 (Static) gets a single image.

---

## 6. Publish

Once `design_approved`, any staff member can move a variant to `scheduled`
and, on launch day, `published` — identical publishing pipeline to social
(`PUBLISH_TRANSITIONS`, unchanged).

---

## 7. Mid-campaign: Priya edits the campaign (plan Step 9)

A week in, marketing decides to add LinkedIn and refine the brief. From
either the campaign list (pencil icon) or the **Edit Campaign** button now
in the workspace header next to "Campaign Brief," Priya opens
`CampaignEditDialog`:

- Campaign Brief → appends *"Also promote the B2B corporate gifting
  catalogue to LinkedIn audiences."*
- Platforms → toggles on **LinkedIn** (now Meta, Google, LinkedIn)
- Dates/status → unchanged

Saves. The workspace header immediately reflects the new brief text and the
`LinkedIn` chip. New variants created from this point inherit all three
platforms (`campaign.platforms` is still the source new variants read from,
per `PaidMediaWizard.addVariant`).

---

## 8. What the reviewer literally sees, before vs. after

**Before this plan** (current `ContentPreviewModal`, `module === "paid"`
routed into `SocialMockup`):

```
┌────────────────────────┐
│ ● brand.handle      ··· │
├────────────────────────┤
│                         │
│      [creative or       │
│   empty placeholder]    │
│                         │
├────────────────────────┤
│ ♥  💬  ➤            🔖 │
└────────────────────────┘
   (no caption — paid variants never set one — nothing to review)
```

**After Step 5/7** (`AdPreviewCard`):

```
┌────────────────────────────┐
│ ‹ Frame 1/4 ›  ● ○ ○ ○      │
│  "Diyas, redefined. Shop    │
│   the new collection."      │
├────────────────────────────┤
│ Diwali Collection is Here   │  ← headline
│ Handcrafted candles,        │  ← description
│ diffusers & gifting sets.   │
│         [ Shop Now ]        │  ← CTA
│ aromaliving.in/diwali       │  ← landing URL
└────────────────────────────┘
```
