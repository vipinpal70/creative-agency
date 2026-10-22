# Creative Agency — Task List

> Last updated: 21 Oct 2026 | Branch: `llm-branch`

---

## 🗂 General / Workspace Changes

| #   | Task                                                                                                                                   | Status     |
| --- | -------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| 1   | New **Rework tab** in Writer & Designer workspace — copies and creatives with changes/feedback displayed directly in the rework tab    | ✅ Done    |
| 2   | **Rework tag** on copies with changes — clicking it routes the copy to the Rework tab                                                  | ✅ Done    |
| 3   | In **Designer workspace**, remove the Reject tab completely — show content-change and rejected work together under the same Rework tab | ✅ Done    |
| 4   | **Schedule & Publish/Approve** together in Designer workspace, but **Reject individually**                                             | 🔲 Pending |
| 5   | **Add proper filters and tabs in Writer workspace** matching Designer workspace layout — keep tabs relevant to writer flow             | ✅ Done    |
| 6   | Keep **filters the same across all tabs** in Writer workspace (same as Calendar tab)                                                   | ✅ Done    |

---

## 🔴 High Priority / Urgent Tag

| #   | Task                                                                                                         | Status  |
| --- | ------------------------------------------------------------------------------------------------------------ | ------- |
| 7   | Add **High Priority button** on copy and creative cards — shows `"Urgent"` tag when true, nothing when false | ✅ Done |
| 8   | High Priority can be toggled by: **creative lead, admin, designer, writers**                                 | ✅ Done |
| 9   | Show Urgent tag on copies and add **filter** for high-priority items                                         | ✅ Done |
| 10  | Available in both **Approval page and workspace** (during copy create and after)                             | ✅ Done |

---

## 🔁 Content Preview Modal / Feedback

| #   | Task                                                                                                                                                       | Status  |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| 11  | In preview modal under client feedback: distinguish **3 categories — creative / copy / both** — track which feedback client gives to maintain rework cycle | ✅ Done |
| 12  | Add **"Both" option** in feedback for feedback on both creative and copy                                                                                   | ✅ Done |
| 13  | Fix: clicking "Request Change" was only opening a text layout with **no option to select copy/creative/both**                                              | ✅ Done |
| 14  | In content preview modal when in **internal feedback stage**, show **internal feedback**, not client feedback                                              | ✅ Done |

---

## 🔧 Adhoc Feature Refactor

| #   | Task                                                                                                                          | Status  |
| --- | ----------------------------------------------------------------------------------------------------------------------------- | ------- |
| 15  | Move adhoc into **Writer's Workspace → "Add New" button**                                                                     | ✅ Done |
| 16  | In flyer modal: **remove caption & publish time**, rename "publish date" → **delivery date**, add `type: digital / printable` | ✅ Done |
| 17  | Adhoc copies **not shown in calendar** — only go through normal approval cycle                                                | ✅ Done |
| 18  | Add categories in adhoc: **video, static/image, carousel, article** (same as SSM, but without buckets/calendar fields)        | ✅ Done |
| 19  | Add **flyer category** (was missing) — `type` field only for flyer; flyer has no platform field                               | ✅ Done |
| 20  | All non-flyer categories work like SSM copies but **without buckets or calendar-related fields**                              | ✅ Done |
| 21  | **Bug fix**: Update version number on Approvals card outer view (was showing v1, inner showed v1.1)                           | ✅ Done |
| 22  | Add **Adhoc tab** in Approvals page (alongside All, Social Media, Paid Media)                                                 | ✅ Done |
| 23  | **Remove adhoc filter** from Content Calendar page                                                                            | ✅ Done |
| 24  | **Remove TikTok** from adhoc social platforms                                                                                 | ✅ Done |
| 25  | Add **optional note field** in every adhoc modal                                                                              | ✅ Done |

---

## ✍️ Writer Workspace Redesign

| #   | Task                                                                               | Status  |
| --- | ---------------------------------------------------------------------------------- | ------- |
| 26  | Refactor Writer workspace to **mirror Designer workspace** layout                  | ✅ Done |
| 27  | Keep **My Calendar tab** the same                                                  | ✅ Done |
| 28  | Add **In Progress tab** — all copies in draft/in-progress status                   | ✅ Done |
| 29  | Add same tabs as Designer: **Internal Review, Client Review, Approved, Rework**    | ✅ Done |
| 30  | Enforce **strict flow rules** — writers can only see their own copies and progress | ✅ Done |

---

## 📅 Filters & Date Range

| #   | Task                                                                                                            | Status  |
| --- | --------------------------------------------------------------------------------------------------------------- | ------- |
| 31  | Date filter in Approvals, Writer & Designer workspaces: show **minimum 1-month window** (e.g., 14 Sep – 14 Oct) | ✅ Done |

---

## 🤖 LLM / AI Changes

| #   | Task                                                                                                                                               | Status     |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| 32  | **Remove regenerate option** from "Write with AI" — replace with iterative **request–response chat** so user refines existing copy, not regenerate | ✅ Done    |
| 33  | Add **custom context** for LLM: PDF, text, image, URL                                                                                              | ✅ Done    |
| 34  | Add **competitor intelligence** context — which content is doing well, creative details                                                            | 🔲 Pending |
| 35  | Add **Ask AI — research / chat** mode                                                                                                              | 🔲 Pending |
| 36  | **LLM Insight tab** — show researched fields and extra context provided by admin on client page                                                    | ✅ Done    |
| 37  | **LLM response format** in creative copy should match Claude/ChatGPT style: spaces, paragraphs, bullet points                                      | ✅ Done    |
| 38  | Allow user to add **competitor info, PDFs, images, URLs** during client research — store as context in client project collection (DB)              | ✅ Done    |
| 39  | Show extra content provided by admin in **"LLM Insight" tab** on client page                                                                       | ✅ Done    |
| 40  | Admin can **re-research** for better response — latest result always stored in LLM Insight tab                                                     | ✅ Done    |
