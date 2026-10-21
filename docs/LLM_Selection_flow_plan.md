# LLM Selection Flow

How CreativeOS lets an **admin** choose the AI provider and model for **text generation** and **image generation** for the whole workspace, and how every AI request in the app ends up at the right provider.

---

## 1. The idea in one paragraph

The workspace has up to two saved AI configurations: one for **text** and one for **image**. They are stored and resolved separately. **Only admins** can view or change them, and whatever an admin saves applies to **every user**: members, sub-users and the client portal alike. Until an admin saves something, **both text and image use OpenAI** with the server's `OPENAI_API_KEY`. When any AI feature runs (client research, AI chat, social copywriting, paid copywriting, image generation), the server looks up the workspace configuration for the capability it needs, decrypts the saved API key if there is one, and sends the request through a provider **adapter**. Claude is text-only, so the image side can only ever route to a provider that actually has image models (today, OpenAI).

---

## 2. Map of the pieces

```
┌────────────────────────── Browser ──────────────────────────┐
│  /dashboard/settings/ai           Writer / Research / Chat UI │
│  (AI Settings, admins only)       (every user)                │
└───────────┬──────────────────────────────────┬───────────────┘
            │ settings API (admin only)        │ AI feature APIs
            ▼                                  ▼
┌─────────────────────────────┐   ┌─────────────────────────────────────┐
│ /api/settings/ai-providers  │   │ /api/clients/[id]/ai/copywriting    │
│   GET  (load)               │   │ /api/clients/[id]/ai/paid-copywriting│
│ /[capability]  PUT / DELETE │   │ /api/ai/research/client             │
│ /[capability]/test  POST    │   │ /api/ai/chat                        │
└──────────────┬──────────────┘   │ /api/ai/images/generate   (new)     │
               │                  └──────────────────┬──────────────────┘
               ▼                                     ▼
     lib/ai/llm/config-service.ts          lib/ai/llm/resolve.ts
     (admin check, validate, test,         (pick provider+model+key
      encrypt, save)                        for each request)
               │        │                            │
               │        └──────────┬─────────────────┘
               ▼                   ▼
     lib/ai/llm/catalog.ts    lib/ai/llm/registry.ts ──► adapters/anthropic.ts
     (what's supported,       (provider → adapter)   └─► adapters/openai.ts
      OpenAI defaults)
               │
               ▼
     lib/models/ai/ai-provider-config.ts  (MongoDB: aiproviderconfigs)
     lib/ai/llm/secret-box.ts             (AES-256-GCM key encryption)
```

| File | Responsibility |
|---|---|
| `lib/ai/llm/catalog.ts` | The **only** place that lists providers, models and capabilities (text / image / web search / sizes). Also the OpenAI defaults and the Claude image warning text. |
| `lib/ai/llm/types.ts` | Provider-neutral request/response types, adapter interfaces, and `LLMError` (the only error type that leaves the LLM layer). |
| `lib/ai/llm/adapters/anthropic.ts` | Claude via `@anthropic-ai/sdk`: text, web search, structured output (forced tool), key validation. |
| `lib/ai/llm/adapters/openai.ts` | OpenAI via `fetch`: Responses API for text, Images API for images, key validation. |
| `lib/ai/llm/registry.ts` | Maps provider id → text adapter / image adapter / validator. |
| `lib/ai/llm/config-service.ts` | Settings-side logic: `canManageLLMSettings`, load, test, save, reset. Re-checks admin on every call. |
| `lib/ai/llm/resolve.ts` | Runtime routing: `resolveTextLLM()` and `resolveImageLLM()`. |
| `lib/ai/llm/secret-box.ts` | Encrypts and decrypts stored API keys. |
| `lib/ai/llm/http.ts` | Converts `LLMError` into a JSON response with the right status code. |
| `lib/models/ai/ai-provider-config.ts` | Mongoose model for the workspace configuration. |
| `app/dashboard/settings/ai/layout.tsx` | Server-side guard: redirects non-admins to `/dashboard`. |
| `app/dashboard/settings/ai/page.tsx` | The AI Settings page. |
| `components/settings/AIProviderSection.tsx` | One settings card (used twice: text and image). |
| `app/dashboard/AppSidebar.tsx` | Shows the "AI Settings" link only when `canManageAI` is true (passed from the dashboard layout). |

---

## 3. Who can do what

| Role | Open AI Settings / call settings API | Uses AI features | Which model their requests use |
|---|---|---|---|
| `admin` (owner) | ✅ | ✅ | Workspace configuration |
| `member`, `sub-user` | ❌ No sidebar link; page redirects; API returns **403** | ✅ | Workspace configuration |
| `client` | ❌ Kept out of `/dashboard` entirely; API returns **403** | ❌ All AI generation routes return **403** (the portal has no AI screens) | — |

Every route that **generates** AI content (chat, research, research save, copywriting, paid copywriting, image generation) requires a staff session (`isStaff`): it returns 401 without a login and 403 for client-portal users. The read-only `GET /api/clients/[id]/ai/research-context` still lets a client read their own insights.

The app has no separate "owner" role, so "owner" means the `admin` role. The rule lives in one function, `canManageLLMSettings()` in `config-service.ts`, and is enforced in four places:

1. **Sidebar:** the link is hidden.
2. **Page:** `settings/ai/layout.tsx` redirects on the server.
3. **API routes:** each one returns 403 before doing anything.
4. **Service functions:** they throw `forbidden` (defense in depth).

---

## 4. What is stored

Collection **`aiproviderconfigs`**: **one document per capability** for the whole workspace, so at most two documents (enforced by a unique index on `capability`).

| Field | Example | Notes |
|---|---|---|
| `capability` | `"text"` or `"image"` | Text and image are independent documents. |
| `provider` | `"anthropic"` / `"openai"` | |
| `model` | `"claude-sonnet-5-5"` / `"gpt-image-1"` | Must exist in the catalog for that capability. |
| `credentialSource` | `"user"` or `"env"` | `user` = an API key the admin saved; `env` = the server's `.env` key. |
| `encryptedApiKey` | `{ iv, tag, ciphertext, keyId }` | Only when `credentialSource = "user"`. `select: false`, so it's never loaded unless explicitly requested. |
| `apiKeyHint` | `"…a1b2"` | Last 4 characters, for display only. |
| `options` | `{ size: "1024x1024" }` | Image settings. |
| `updatedBy` | `64b7…0001` | The admin who last saved it (audit only). |
| `lastValidatedAt` | date | When the key/model was last verified with the provider. |

No document = "use the OpenAI default". There is no migration step: MongoDB creates the collection and index on first save.

---

## 5. Flow A: an admin configures the workspace (AI Settings page)

### 5.1 Opening the page

```
Browser (admin)                   Server
  │  GET /dashboard/settings/ai
  │ ─────────────────────────────► settings/ai/layout.tsx: not admin → redirect /dashboard
  │  GET /api/settings/ai-providers
  │ ─────────────────────────────► getSession()            → 401 if not logged in
  │                                canManageLLMSettings()  → 403 if not admin
  │                                getLLMSettings(session)
  │                                  └─ find({})   (no secrets loaded)
  │ ◄───────────────────────────── {
  │                                  catalog,                 // providers, models, hasServerKey (boolean only)
  │                                  imageCompatibilityWarning,
  │                                  text:  saved config | null,
  │                                  image: saved config | null,
  │                                  effective: { text, image } // what will actually run right now
  │                                }
```

Each section shows an **"Active: provider · model (source)"** badge built from `effective`. On a fresh workspace both read **OpenAI** with source "server default". The badge turns amber when the configuration can't run, for example when the server has no `OPENAI_API_KEY`.

### 5.2 Filling in a section

- **Provider** dropdown: in the image section every provider is listed, but text-only ones are labelled "(text only)".
- **Model** dropdown: only models the selected provider supports **for that capability**. If the provider has no image models, the list is empty.
- **Image size** (image section only): sizes supported by the selected image model.
- **API key**: either "Enter an API key" (password field) or "Use server .env key" (disabled if the server has no key for that provider). If a key is already saved **for the same provider**, the field can be left blank to keep it.
- **Claude in the image section**: the warning box appears, the key fields are hidden, and Test and Save are disabled:

  > **Image Generation Compatibility Warning**
  > This model does not provide native image generation and may not be suitable for creating images. Please select a supported image-generation provider, such as OpenAI, to generate images. You can continue using Claude for text generation.

### 5.3 Test connection / Save

Both buttons send the same body:

```json
{ "provider": "anthropic", "model": "claude-sonnet-5-5", "credentialSource": "user", "apiKey": "sk-ant-…" }
```

- **Test** → `POST /api/settings/ai-providers/{text|image}/test` (checks, saves nothing)
- **Save** → `PUT  /api/settings/ai-providers/{text|image}` (checks, then saves)

Server-side steps (`config-service.ts → prepare()` and then `save`):

```
1. Session check                → 401 if not logged in
2. Admin check                  → 403 forbidden for every non-admin role
3. Capability check             → 404 unless "text" or "image"
4. Compatibility check (catalog)
     unknown provider/model     → 422 invalid_config
     Claude / text model for images → 422 unsupported_capability + warning   (nothing is saved, provider not called)
5. Key sanity check             → 422 if it contains spaces or is > 512 chars
6. Pick the key to test (see table below)
7. Live check with the provider (no tokens used)
     Anthropic: models.retrieve(model)
     OpenAI:    GET /v1/models/{model}
     bad key → 422 invalid_credentials, unknown model → 422 model_unavailable,
     provider down → 503 provider_unavailable
8. (Save only) Encrypt new key → upsert { capability } with updatedBy = admin → return the public view (no key)
```

**Which key is used (step 6):**

| What the admin sent | Result |
|---|---|
| A new key (and didn't choose server key) | Use the new key; it will be encrypted and stored for the workspace. |
| `credentialSource: "env"` | Use the server `.env` key; any previously stored key is **removed**. Error if the server has none. |
| No key, workspace already has a stored key **for the same provider** | Reuse the stored key. This works for any admin, not just the one who entered it. |
| No key, stored key is for a **different** provider | Never reused (an Anthropic key is never sent to OpenAI). Falls back to the server key if available, otherwise asks for a key. |
| No key, nothing stored, no server key | 422 `missing_credentials`: "Enter a … API key." |

**Reset to defaults** → `DELETE /api/settings/ai-providers/{capability}` (admin only) deletes the workspace document, and that capability goes back to **OpenAI**.

---

## 6. Flow B: runtime routing (every AI request, every user)

Every AI route calls a resolver before calling the model. The resolver doesn't depend on who is asking, because the configuration is workspace-wide:

```
resolveTextLLM()   /   resolveImageLLM()
        │
        ▼
resolveSelection(capability)
        │
        ├─ No saved document?
        │     → OpenAI default for that capability
        │         text:  AI_OPENAI_MODEL       or gpt-4.1
        │         image: AI_OPENAI_IMAGE_MODEL or gpt-image-1
        │       with the server OPENAI_API_KEY (missing → 422 missing_credentials)
        │
        └─ Saved document found:
              ├─ still valid in the catalog?   no → 422 invalid_config  ("an admin needs to update it")
              ├─ credentialSource = "user"  → decrypt saved key (fails → 422 missing_credentials)
              └─ credentialSource = "env"   → server .env key (missing → 422 missing_credentials)
        │
        ▼
registry: provider → adapter
        │      image request with no image adapter (e.g. Anthropic) → 422 unsupported_capability
        ▼
Returns a "resolved LLM" object:
  { provider, model, source, supportsWebSearch, routerModel, generateText(req) }   // text
  { provider, model, source, options, generateImages(req) }                         // image
```

An **invalid saved configuration is never silently replaced** by the default. The admin picked a provider on purpose, so the app returns a clear error ("An admin needs to update it in AI Settings") instead of sending data somewhere else.

Usage logging still records **which user** made each request (`AIUsage.userId`), together with the provider and model that actually served it.

### 6.1 Writer: social and paid copywriting

`POST /api/clients/[id]/ai/copywriting` (and `/paid-copywriting`)

```
session → client access check → load saved research context
  → llm = resolveTextLLM()
  → generateSocialCopy({ llm, ... }) / generatePaidCopy({ llm, ... })
        └─ llm.generateText({ system, messages, maxTokens })
  → AIUsage.create({ userId: session.userId, provider: result.provider, model: result.model, ... })
  → return copy / caption / hashtags   (or LLMError → status + clear message)
```

### 6.2 Client research ("Feed to LLM")

`POST /api/ai/research/client`, plus the automatic first-chat bootstrap (`run-save-client-research.ts`)

```
create AIResearch record (status "researching")
  → llm = resolveTextLLM()
  → runClientResearch(prompt, clientContext, llm)
        1. llm.generateText({ ..., webSearch: { maxUses: 10 } })
             OpenAI:    Responses API "web_search" tool
             Anthropic: web_search tool; resumes "pause_turn" up to 3 times inside the adapter
             (web search is dropped automatically if the chosen model doesn't support it)
        2. If the answer isn't valid JSON → append response.assistantMessage and ask
           for "JSON only" (a same-provider follow-up keeps the full search context)
  → save results, AIUsage with the real provider/model
  → on any error: research marked "failed"; response uses LLMError status (e.g. 422) instead of 500
```

### 6.3 AI chat

`POST /api/ai/chat`

```
staff session (401 / 403) → validate clientId / conversationId ids (400) → client exists (404)
llm = resolveTextLLM()        ← resolved first, so config problems fail before anything is stored
  → conversationId (if sent) must belong to this client's project, else 404
  → store user message
  → classifyRequest(llm, prompt)
        uses llm.routerModel (the provider's cheap model, same credentials)
        with structuredOutput (OpenAI: JSON schema, Anthropic: forced tool call)
        router model unavailable on that key → falls back to "general_chat" instead of failing
  → buildProjectContext (first-ever chat for a client runs research, Flow 6.2)
        response then includes bootstrapped: true + requestedTask, and the
        AI Assistant explains that the full audit ran instead of the question
  → executeTask(llm, task, prompt, context)   (web search when the task needs it)
  → store and return the answer
```

| Provider | Router model |
|---|---|
| OpenAI (default) | `AI_OPENAI_ROUTER_MODEL` or `gpt-4.1-mini` |
| Anthropic | `AI_ROUTER_MODEL` or `claude-haiku-4-5-20251001` |

### 6.4 Image generation

`POST /api/ai/images/generate`  body: `{ prompt, size?, n?, clientId? }`

```
session → prompt required, ≤ 4000 chars → clientId access check (if given)
  → llm = resolveImageLLM()                 ← never resolves to Claude
  → size: request size if the model supports it, else the saved size, else the model default
  → n clamped to 1…model.maxImages
  → llm.generateImages({ prompt, size, n })   (OpenAI Images API, base64 output)
  → AIUsage.create({ operation: "image_generation", userId, provider, model })
  → { provider, model, images: [{ dataUrl: "data:image/png;base64,…", revisedPrompt }] }
```

> No screen calls this endpoint yet. The designer workspace still needs a "Generate with AI" button.

---

## 7. Worked example

**Day 1, fresh install.** Nobody has opened AI Settings.

| Who | Action | What runs |
|---|---|---|
| Any user | Writes a caption, runs research, chats | OpenAI `gpt-4.1` with `OPENAI_API_KEY` |
| Any user | Generates an image | OpenAI `gpt-image-1` with `OPENAI_API_KEY` |
| Member | Visits `/dashboard/settings/ai` | Redirected to `/dashboard`; the API would return 403 |

**Day 2.** Admin Priya switches **Text → Anthropic / Claude Sonnet 5.5 / enters an Anthropic key** and leaves Image untouched.

| Who | Action | What runs |
|---|---|---|
| Priya, member Rahul, any client | Any text feature | Claude Sonnet 5.5 with the **workspace's saved Anthropic key** |
| Anyone | Generates an image | Still OpenAI `gpt-image-1` (image is configured separately) |
| Priya | Tries Claude for images | Warning shown, Save disabled; the API returns 422 if forced |
| Another admin | Changes the text model to Claude Opus 5.5, leaving the key field blank | Saved key is reused; `updatedBy` becomes that admin |

**Day 3.** Priya clicks **Reset to defaults** on Text, and all text requests go back to OpenAI `gpt-4.1`.

---

## 8. Errors users can see

All provider failures are converted to `LLMError` inside the adapters. Messages are written for users and built from status codes, **never** from raw provider error text (OpenAI echoes part of the key in some auth errors).

| Code | HTTP | Typical cause | Message (summary) |
|---|---|---|---|
| `forbidden` | 403 | Non-admin calls a settings endpoint | "Only admins can manage AI settings." |
| `missing_credentials` | 422 | No saved key and no server key; stored key can't be decrypted | "An admin can add one in AI Settings…" |
| `invalid_credentials` | 422 | Wrong or revoked key; no quota; Anthropic account out of credits | "…rejected the API key" / "insufficient credits" |
| `model_unavailable` | 422 | Model not enabled for that key | "The selected … model is not available for this API key." |
| `invalid_config` | 422 | Saved model removed from the catalog | "…no longer valid. An admin needs to update it in AI Settings." |
| `unsupported_capability` | 422 | Text-only provider/model for images | Includes the compatibility `warning` object |
| `rate_limited` | 429 | Provider rate limit | "…wait a moment and retry." |
| `provider_unavailable` | 503 | Network error or provider outage | "Could not reach …" |
| `provider_error` | 502 | Anything else (e.g. image prompt blocked by safety) | "…request failed (HTTP n)." |

The response shape follows each route's existing format: `{ error, code }` for settings, writer and image routes, and `{ success: false, message, code }` for chat and research.

---

## 9. Security model

- **Admin only:** enforced in the sidebar, the page layout, every settings route, and every service function (see §3).
- **Encryption at rest:** AES-256-GCM with a random IV per key (`secret-box.ts`). The key source is `LLM_CREDENTIALS_KEY` (32 bytes, base64 or hex) or, if that isn't set, a key derived from `JWT_SECRET`. Each blob records its `keyId`, so a key-source change gives a clear "an admin needs to re-enter it" error instead of garbage.
- **Never exposed:** API responses carry only `apiKeyHint` and `hasServerKey: true/false`, even to admins. The ciphertext field is `select: false`. Server `.env` keys never leave the server.
- **Non-admins never see configuration:** they can't read which provider or key hint is in use. They only see error messages if something is misconfigured.
- **No cross-provider key leaks:** a stored key is reused only for the provider it was saved for.
- **Defense in depth for images:** the catalog check blocks saving, and the resolver separately refuses to route an image request to a provider without an image adapter, even if the database were edited by hand.

---

## 10. Environment variables

| Variable | Used for | Default |
|---|---|---|
| `OPENAI_API_KEY` (or legacy `OPEN_API_KEY`) | **Default key for both text and image**; "use server key" for OpenAI | none (required for the defaults) |
| `AI_OPENAI_MODEL` | Default text model | `gpt-4.1` |
| `AI_OPENAI_IMAGE_MODEL` | Default image model | `gpt-image-1` |
| `AI_OPENAI_ROUTER_MODEL` | Chat classification on OpenAI | `gpt-4.1-mini` |
| `ANTHROPIC_API_KEY` | "Use server key" when an admin picks Claude | none |
| `AI_ANTHROPIC_MODEL` | Extra Claude model offered in the dropdown | — |
| `AI_ROUTER_MODEL` | Chat classification on Anthropic | `claude-haiku-4-5-20251001` |
| `OPENAI_BASE_URL` | Alternative OpenAI-compatible endpoint | `https://api.openai.com/v1` |
| `LLM_CREDENTIALS_KEY` | Encryption key for saved API keys (**recommended in production**) | derived from `JWT_SECRET` |
| `LLM_PROVIDER` | **No longer used.** The default is always OpenAI; admins choose anything else in AI Settings. | — |

---

## 11. Changing what's supported

- **Add or remove a model:** edit the provider's `textModels` or `imageModels` in `catalog.ts`. The settings UI, validation and routing pick it up automatically. If the saved model is removed, AI requests return `invalid_config` until an admin chooses again.
- **Change the default:** edit `getDefaultSelection()` in `catalog.ts`, or set `AI_OPENAI_MODEL` / `AI_OPENAI_IMAGE_MODEL`.
- **Change who can manage settings:** edit `canManageLLMSettings()` in `config-service.ts`. All four enforcement points use it.
- **Add a provider** (e.g. Gemini):
  1. Add it to `LLMProviderId` and `PROVIDERS` in `catalog.ts`.
  2. Write an adapter in `adapters/` implementing `TextProviderAdapter` and/or `ImageProviderAdapter`, plus a `CredentialValidator`.
  3. Register it in `registry.ts`.
  4. Add the provider id to the `enum` in `ai-provider-config.ts` and `ai-usage.ts`.

  Business logic (writer, research, chat) needs no changes.

---

## 12. Tests

Run `npm test` (vitest, `tests/llm/`, 53 tests):

| File | Covers |
|---|---|
| `catalog.test.ts` | Capabilities, Claude/text-model image rejection, OpenAI defaults (ignoring `LLM_PROVIDER`), legacy key name, no key values in the public catalog |
| `secret-box.test.ts` | Encrypt/decrypt round trip, tamper detection, key-source switch, hints |
| `config-service.test.ts` | Persistence (one doc per capability, `updatedBy`), key reuse rules, credential validation, unsupported image models, **admin-only access** for read/test/save/reset |
| `resolve.test.ts` | OpenAI defaults for text and image, env overrides, workspace-wide routing, Claude-text + OpenAI-image split, tampered records, unreadable keys |
| `adapters.test.ts` | OpenAI request/response mapping, reasoning-model padding, image output, error mapping without key leaks |

---

## 13. Known gaps

1. **Designer UI:** the image endpoint exists but no screen calls it yet.
2. **Billing isn't checked:** the key check confirms the key and model but not the account balance, so a key on an account with no credits can be saved. The first real request then reports "insufficient credits".
3. **Generated images aren't stored:** they come back as base64 data URLs, and saving them to the file repository or draft is still to be built.
4. **No change history:** saves record only the latest `updatedBy`, not a history of who changed what.
