# CreativeOS — Creative Agency Management Platform

> A full‑stack **Next.js 16 / React 19** SaaS that runs an entire creative agency:
> client onboarding, scope‑of‑work contracts, content calendars, a multi‑stage
> content & design approval pipeline, a Kanban task board, Gantt project planning,
> a file repository, analytics, and an **AI assistant** (Anthropic Claude) for client
> research and copywriting.

---

## 1. Project Summary

CreativeOS is an internal operations platform for a digital/creative marketing
agency. It serves **two completely isolated user worlds**:

| World | Route tree | Who | What they do |
|-------|-----------|-----|--------------|
| **Staff / Agency** | `/dashboard/*` | admin, member, sub‑user | Onboard clients, plan calendars, write copy, design, review & approve, manage tasks, run analytics, use the AI assistant |
| **Client Portal** | `/client/*` | external client users | Review & approve deliverables, view calendars/Gantt, raise ad‑hoc requests, see analytics for their own brand only |

The central domain object is the **Client** (a tenant/brand). Almost every other
record (`Calendar`, `Deliverable`, `ContentDraft`, `Task`, `RepoFile`, `GanttTask`,
analytics) is scoped by `clientId`, giving a **multi‑tenant** data model where staff
see all tenants and a client user is locked to exactly one.

### The core business workflow (content production pipeline)

```
Client onboarding ──▶ Scope of Work (monthly quotas) ──▶ Calendar (campaign)
      │
      └──▶ Deliverable (one unit of work, scheduled on a date)
                 │
                 └──▶ ContentDraft (the actual copy/creative + versions)
                             │
          ┌──────────────────┴───────────────────────────────┐
          │  CONTENT PHASE (writer)                           │
          │  draft → content_internal_review →                │
          │  content_client_review → content_approved         │
          └──────────────────┬───────────────────────────────┘
                             │  (content_approved unlocks design)
          ┌──────────────────┴───────────────────────────────┐
          │  DESIGN PHASE (designer claims the item)          │
          │  design_in_progress → design_internal_review →    │
          │  design_client_review → design_approved           │
          └──────────────────┬───────────────────────────────┘
                             │
             scheduled ──▶ published   (final publishing pipeline)
```

- **Request changes** at any review step sends the item back with a feedback note
  (`content_req_change` / `design_req_change`).
- **Reject** is a hard reject split by phase (`rejected` for content, `design_rejected`
  for design — which stays owned by the claiming designer).
- **Recall** pulls an item back one stage (undo a premature submit/approve).
- Every transition is recorded in `DraftHistory` (field‑level diffs) and in the
  deliverable's `statusTimeline` (writer/designer timelines).

The entire state machine lives in **`lib/status-flow.ts`** as pure TypeScript (no
Mongoose), so it can be imported by both API routes and client components.

---

## 2. Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | **Next.js 16** (App Router, Server Components, Route Handlers) |
| UI runtime | **React 19** |
| Language | **TypeScript** |
| Styling | **Tailwind CSS v4**, `tw-animate-css`, `class-variance-authority`, `clsx` + `tailwind-merge` (`cn()` helper) |
| Component primitives | **Radix UI** (dialog, select, tabs, accordion, checkbox, progress, label), **shadcn/ui**, `lucide-react` icons |
| Animation | `motion` (Framer Motion successor) |
| Database | **MongoDB** via **Mongoose 9** |
| Auth | Custom **JWT** (via `jose`) in an HTTP‑only cookie; `bcryptjs` for password hashing (Clerk is a dependency but the live auth is the custom JWT flow) |
| AI | **Anthropic Claude** (`@anthropic-ai/sdk`) + Vercel `ai` SDK — router model `claude-haiku-4-5`, execution model `claude-sonnet-5`, with server‑side `web_search` tool |
| Gantt | `@svar-ui/react-gantt` |
| Notifications | `sonner` (toasts) |
| Deploy | Vercel (`vercel.json`), `serverActions.bodySizeLimit = 2gb` for large uploads |

---

## 3. Project Structure

```
creative-agency/
├── app/                          # Next.js App Router
│   ├── layout.tsx                # Root layout (fonts: Inter + Geist, metadata)
│   ├── page.tsx                  # Entry → redirects by role
│   ├── sign-in/ sign-up/         # Auth pages (catch-all routes)
│   ├── session-expired/
│   ├── dashboard/                # ── STAFF WORLD ──
│   │   ├── layout.tsx            # Server component: getSession() guard + AppSidebar
│   │   ├── AppSidebar.tsx        # Client nav component
│   │   ├── clients/[id]/         # Client detail (onboarding data, scope, credentials…)
│   │   ├── calendar/ writer/ designer/ approvals/ archived/
│   │   ├── tasks/ gantt-chart/ files/ uploads/ team/
│   │   ├── analytics/ notifications/ logs/ adhoc/ onboarding/
│   ├── client/                   # ── CLIENT PORTAL ── (mirror subset)
│   │   ├── layout.tsx
│   │   ├── calendar/ gantt-chart/ approvals/ files/
│   │   ├── analytics/ notifications/ profile/
│   └── api/                      # Route Handlers (backend)
│       ├── auth/{login,logout,register,me}/
│       ├── clients/[id]/deliverables/[delId]/drafts/[draftId]/…  # nested REST
│       ├── approvals/ writer/ calendar/ tasks/ gantt/ repository/
│       ├── ai/{chat,research}/   # AI endpoints
│       ├── analytics/ team/ members/ documents/ creative-upload/
│       ├── adhoc/ copies/ activity/ cron/
├── components/
│   ├── ui/                       # shadcn/Radix primitives (button, dialog, tabs…)
│   ├── writer/   (23 files)      # Copy entry forms, modals, preview per platform
│   ├── calendar/ (ContentCalendar, ContentPreviewModal…)
│   ├── analytics/ gantt/ tasks/ repository/ dashboard/ adhoc/ client/
├── lib/
│   ├── db.ts                     # Cached Mongoose connection + index sync
│   ├── auth.ts                   # JWT sign/verify, getSession()
│   ├── authz.ts                  # Role predicates, client-access guards
│   ├── status-flow.ts            # Content/design approval state machine (pure TS)
│   ├── analytics.ts  activity.ts  draft-history.ts  serialize-copy.ts
│   ├── scope-constants.ts  team-constants.ts  task-status.ts  media-type-colors.ts
│   ├── models/                   # Mongoose schemas (one file per collection)
│   │   └── ai/                   # AIProject, AIConversation, AIMessage
│   ├── ai/                       # AI subsystem (see §6)
│   │   ├── router.ts  executor.ts  task-registry.ts  gateway.ts  type.ts
│   │   ├── context/  providers/  research/  writer/  prompts/  project/
│   ├── gantt/                    # Gantt api/hooks/types
│   └── storage/                  # File storage adapters
├── proxy.ts                      # Edge middleware: auth + role-based routing
├── next.config.ts  vercel.json  tsconfig.json  components.json
└── docs: db-structure.md, analytics.md, llm-architecture.md
```

---

## 4. Key Workflows

### 4.1 Authentication & Authorization
1. **Login** (`/api/auth/login`): email+password → `bcrypt.compare` → `signToken()`
   issues an HS256 JWT (`jose`) with `{ userId, email, role }`, 8‑hour expiry, set as
   an **HTTP‑only cookie** (`auth_token`).
2. **Edge middleware** (`proxy.ts`) runs on every non‑API, non‑static request:
   - Redirects `/` to `/dashboard` or `/client` by role.
   - Blocks unauthenticated users to `/sign-in?redirect=…`.
   - **Role tree isolation**: clients forced into `/client`, staff into `/dashboard`.
   - Expired token → `/session-expired` and clears the cookie.
3. **Server-side guards**: layouts call `getSession()` and `redirect()` (defense in
   depth). API routes call `getSession()` + `assertClientAccess()` from `authz.ts`,
   which resolves a client user's `clientId` and confirms they own the target record.

### 4.2 Content production (described in §1 diagram)
Writers create `ContentDraft`s (supports social posts, carousels/frames, blogs,
Meta & Google paid‑ad variants). Internal lead → client review → approval, then a
designer **claims** the item and repeats the cycle for creative assets. `DraftHistory`
captures a field‑level diff on every edit/action.

### 4.3 Scope & calendars
Each client has a `ScopeOfWork` (monthly quotas per module: reels, statics, blogs…).
`Calendar`s group planned deliverables; `delivered` counts are token‑matched against
the deliverable `type` so quota burn‑down stays accurate.

### 4.4 AI assistant (see §6).

### 4.5 Supporting workflows
Kanban **Tasks** with per‑role sub‑statuses; **Gantt** planning with tasks + dependency
links; hierarchical **file repository** (folders/files, unique‑name constraints);
**ActivityLog** audit trail; **analytics** (media‑type turnaround times, delivery rates).

---

## 5. Data Model (MongoDB / Mongoose)

Collections (full field list in `db-structure.md`):

- **Identity/tenancy**: `User` (roles: admin/client/sub‑user/member + specialty roles),
  `Client` (the tenant — brand info, competitors, credentials, documents, meeting logs).
- **Scope/scheduling**: `ScopeOfWork`, `Calendar`.
- **Production**: `Deliverable` → `ContentDraft` (versioned) → `DraftHistory`.
- **PM**: `Task`, `ClientTaskRequest`, `GanttTask`, `GanttLink`.
- **Assets**: `RepoFolder`, `RepoFile`.
- **AI**: `AIProject`, `AIConversation`, `AIMessage`.
- **Audit**: `ActivityLog`.

**Indexing strategy**: compound indexes keyed on `clientId` first
(e.g. `{clientId:1, module:1}`, `{clientId:1, status:1}`, `{draftId:1, changedAt:-1}`)
because `clientId` is the universal tenant filter. Unique constraints enforce no
duplicate folder/file names per `{parentId, clientId, name}`.

---

## 6. AI Architecture (Router → Context → Executor)

A **three-stage pipeline** (`lib/ai/`) implements a small agentic router:

1. **Route** (`router.ts`) — a cheap, high‑volume classification call using the
   **fast model** (`claude-haiku-4-5`). It uses Anthropic **tool‑use with forced
   `tool_choice`** (`classify_request`) to map a free‑form prompt to exactly one
   `AITaskType` from the **task registry**. Falls back to `general_chat` if the model
   fails to call the tool.
2. **Build context** (`context/build-project-context.ts`) — resolves/creates an
   `AIProject` per client. On the **first** prompt it bootstraps a fixed
   `client_research` call and **saves** the result to `AIProject.context`; every later
   call reuses that saved context (**no re‑research** → cost + latency savings).
3. **Execute** (`executor.ts`) — runs the one classified task with the **capable model**
   (`claude-sonnet-5`). Each task config owns its own system prompt and **output mode**:
   - `text` → conversational reply.
   - `json` → model must return JSON matching the task's `outputSchema`; `extractJson`
     strips markdown fences / stray `<cite>` tags and, if JSON still fails (common once
     web search produces prose), **degrades gracefully to a text answer** instead of 500ing.
   - Tasks that `needsWebSearch` attach Anthropic's server‑side `web_search` tool.

The **task registry** (`task-registry.ts`) is the single source of truth: `general_chat`,
`competitor_research`, `competitor_analysis`, etc. Adding an AI capability = adding one
registry entry (router description + schema + prompt builder), no new endpoint.

Everything is persisted — each user prompt and assistant reply is stored as an
`AIMessage` threaded under an `AIConversation` ("store everything"). Token usage and
web‑search counts are captured from `response.usage` for cost tracking.

---

## 7. React / Next.js Optimization Techniques Used

### Rendering architecture
- **Server Components by default**: Layouts and several pages (`dashboard`, `calendar`,
  `files`, `analytics`, `notifications`, client pages) are async **Server Components** —
  they run `getSession()`/DB work on the server and ship **zero JS** for that shell.
  Only interactive leaves are marked `"use client"` (~65 of 97 `.tsx` files), keeping
  the client bundle targeted.
- **`<Suspense>` streaming**: Analytics and client profile pages wrap heavy data
  components in `Suspense` so the shell streams instantly while data resolves.
- **Session resolved once in the layout** and the guard is repeated server‑side (defense
  in depth) rather than re‑fetched in every child.

### Re‑render minimization
- **`React.memo`** on list items rendered in large collections — `FolderCard` & `FileCard`
  in `FileRepository.tsx`, `CopyCard` in the designer board — so a parent state change
  doesn't re‑render every card.
- **`useMemo`** for derived/expensive computation instead of recomputing per render:
  calendar grouping (`byDay`, `byStatus`, `monthFiltered`, `filtered` in `ContentCalendar`),
  descendant‑folder invalid‑drop‑target sets (`FileRepository`), platform lists
  (`CopyEntryForm`). (11 files.)
- **`useCallback`** to keep handler identities stable across renders — important for the
  memoized cards above and effect dependency arrays. (14 files.)

### Interaction / network optimization
- **Debounced inputs** (search/filter) in `FileRepository`, client detail, team member
  list/forms, archived view — avoids a fetch/filter per keystroke.
- **`next/font`** (`Inter`, `Geist`) with `display: "swap"` and CSS variables → self‑hosted,
  no layout shift, no external font request.
- **`cn()` utility** (`clsx` + `tailwind-merge`) to compose class names without conflicts.

### Data fetching
- Pages fetch per‑feature from granular route handlers; derived/aggregate views
  (analytics) are computed server‑side so the client ships summarized data, not raw records.

---

## 8. Backend / API / Database Optimizations

- **Cached DB connection** (`lib/db.ts`): the Mongoose connection is memoized on the Node
  `global` object so hot‑reload (dev) and warm serverless invocations (prod) **reuse one
  connection** instead of reconnecting per request. A one‑time `ensureCalendarIndexes()`
  (guarded by a global flag) drops an obsolete index without blocking requests.
- **`.lean()` everywhere reads happen** (~58 files): returns plain JS objects instead of
  hydrated Mongoose documents → lower memory + faster serialization.
- **`.select()` projections** (~27 files): fetch only needed fields (e.g. `authz.ts`
  reads only `clientId` / `_id`).
- **Compound indexes** tuned to the universal `clientId` tenant filter (§5).
- **`Promise.all`** to parallelize independent queries (8 files).
- **Two‑model AI strategy**: cheap Haiku for classification, Sonnet only for the real
  task; context is researched once and cached on `AIProject` to avoid repeat LLM spend.
- **Graceful degradation** in the AI executor (JSON → text fallback) so model format
  drift never 500s the request.
- **Edge middleware** does auth/routing at the CDN edge before hitting origin/DB.
- **Pure, dependency‑free domain modules** (`status-flow.ts`, `scope-constants.ts`) are
  importable by both server and client, avoiding duplicated/forked logic.
- **Audit logging** (`ActivityLog`) and **soft‑archival** (`archivedAt`/`archivedBy`)
  instead of hard deletes where history matters.

---

## 9. Likely Interview Questions & Topics

### Architecture & Next.js
1. **Server vs Client Components** — how did you decide which is which, and what does
   marking `"use client"` cost? (bundle size, hydration)
2. Why **Edge middleware** for auth instead of only checking in each page/route? What
   are its limits (can't access Mongoose/Node APIs — hence `jose`, not `jsonwebtoken`)?
3. How does **App Router nested routing** map to your `/dashboard` vs `/client` trees,
   and how is tree isolation enforced in **three layers** (middleware, layout, API)?
4. What does **`<Suspense>` streaming** buy you, and where did you apply it?
5. Why `serverActions.bodySizeLimit = 2gb`? (large creative uploads)

### React performance
6. When is **`React.memo` / `useMemo` / `useCallback`** actually worth it vs premature
   optimization? Give a concrete example from this app (memoized `FileCard`, calendar
   `byDay` grouping).
7. Why does `useCallback` matter for a `memo`‑wrapped child? (referential equality of props)
8. How do you avoid a fetch‑per‑keystroke? (**debouncing**)
9. How do you prevent font‑induced layout shift? (`next/font`, `display: swap`)

### Backend / database
10. How do you **reuse a MongoDB connection** in a serverless environment, and why cache
    it on `global`?
11. What's the difference between a hydrated Mongoose doc and a **`.lean()`** result, and
    why does it matter at scale?
12. Explain your **indexing strategy** — why `clientId` first in compound indexes?
13. How do you keep **quota/`delivered` counts** correct (token matching against type)?
14. Why is the approval state machine (`status-flow.ts`) **pure TypeScript** with no
    Mongoose imports?

### Security & multi-tenancy
15. How is **multi-tenancy** enforced so a client user can never read another client's
    data? (`resolveClientId` + `assertClientAccess`)
16. Why **HTTP-only cookies** for the JWT instead of localStorage? (XSS)
17. What happens on **token expiry** vs an invalid token, and how is the cookie cleared?
18. What's your **defense-in-depth** story (middleware → layout guard → API authz)?
19. How does **audit logging** (`ActivityLog`) support compliance?

### AI / LLM engineering
20. Walk through the **router → context → executor** pipeline. Why two different models?
21. Why use **tool-use with forced `tool_choice`** for classification instead of parsing
    free text?
22. How do you keep AI costs down? (**cache researched context on `AIProject`**, Haiku for
    routing, usage tracking from `response.usage`)
23. How do you handle the model **not returning valid JSON**? (strip fences/cites →
    graceful text fallback)
24. How is the **task registry** extensible — how would you add a new AI capability?
25. How do you prevent prompt leakage / schema disclosure? (`baseIdentity` instruction)

### Domain / product
26. Explain the full **content → design → publish** approval lifecycle, including
    request-change, reject (content vs design split), and recall.
27. How do **versioning (`ContentDraft.version`) and `DraftHistory` diffs** work together?
28. How are **Meta vs Google paid-ad** variants modeled on a single draft schema?
29. How does **legacy status mapping** (`normalizeDraftStatus`) let you refactor the state
    machine without breaking old records?

---

*Generated from a full read of the codebase — see `db-structure.md`, `llm-architecture.md`,
and `analytics.md` for deeper detail on the schema, AI flow, and analytics computations.*
