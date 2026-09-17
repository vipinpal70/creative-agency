### 1. Identity & Client Multi-Tenancy

#### `User` (`users`)

Stores agency staff, leadership, and external client accounts.

- `_id`: `ObjectId` (PK)
- `firstName`: `String` (Required)
- `lastName`: `String`
- `email`: `String` (Required, Unique, Lowercase)
- `password`: `String` (Bcrypt hashed)
- `role`: `Enum ["admin", "client", "sub-user", "member"]`
- `roles`: `Array<Enum>` (Internal team member specialties: `ADMIN`, `CREATIVE_LEAD`, `OPERATION_LEAD`, `SALESPERSON`, `ACCOUNT_MANAGER`, `COPYWRITER`, `CONTENT_WRITER`, `GRAPHIC_DESIGNER`, `VIDEO_EDITOR`, `PHOTO_VIDEOGRAPHER`, `SEO_SPECIALIST`, `PERFORMANCE_MARKETING_SPECIALIST`, `EMAIL_MARKETING_SPECIALIST`, `WHATSAPP_MARKETING_SPECIALIST`)
- `type`: `Enum ["internal", "outsource"]`
- `status`: `Enum ["active", "inactive"]`
- `clientId`: `ObjectId -> Client` _(Set for client users to scope them to their organization)_
- `outsource`: Embedded subdocument `{ companyName, companyAddress, bankDetails: { bankName, accountNo, ifscCode } }`
- `sessionToken`, `sessionExpiry`, `accessToken`, `lastSignInAt`: Session & Auth management
- `createdAt`, `updatedAt`: `Date`

---

#### `Client` (`clients`)

The central tenant organization representing brands managed by the agency.

- `_id`: `ObjectId` (PK)
- `name`: `String` (Required)
- `brandName`: `String`
- `industry`: `String`
- `website`: `String`
- `status`: `Enum ["active", "inactive"]`
- `contractStart`: `Date`
- `contractEnd`: `Date | null`
- `primaryContact`: Embedded object `{ name, email, phone, altPhone }`
- `clientPortalPassword`: `String` _(Plain reference viewable by admins for client onboarding)_
- `aboutBrand`, `requirementNotes`: `String`
- `competitors`: Array of `{ name, websiteLink, socialMediaLink }`
- `socialMediaPresence`: Array of `{ platform, link }`
- `assignedTeam`: `Array<ObjectId -> User>`
- `credentials`: Array of `{ id, category: ("social"|"paid-ads"|"analytics"|"custom"), label, values: Map<String, String> }`
- `documents`: Array of uploaded onboarding files `{ id, name, fileUrl, filePath, fileSize, uploadedAt, uploadedBy }`
- `meetingLogs`: Array of `{ id, title, notes, date, loggedBy }`
- `createdAt`, `updatedAt`: `Date`

---

### 2. Service Scope & Calendars

#### `ScopeOfWork` (`scopeofworks`)

Defines the contracted monthly deliverables and quotas per module.

- `_id`: `ObjectId` (PK)
- `clientId`: `ObjectId -> Client` (Required, Indexed)
- `period`: `String` (e.g. `"June 2026"`, `"Q3 2026"`)
- `label`: `String`
- `isActive`: `Boolean` (Default `true`)
- `items`: Array of `IScopeItem`:
  - `id`: `String` (Frontend UUID)
  - `module`: `String` (`"social"`, `"paid"`, `"seo"`, `"email"`, `"website"`, `"whatsapp"`, `"video"`, `"design"`, etc.)
  - `label`: `String` (e.g. `"Reels"`, `"Static Posts"`, `"Blog Articles"`)
  - `unit`: `String` (Quantity quota, e.g. `"12"`)
  - `allocatedBudget`: `String`
  - `delivered`: `Number` (Delivered count, default `0`)
  - `platforms`: `Array<String>` (e.g. `["instagram", "facebook"]`)
- `createdAt`, `updatedAt`: `Date`

---

#### `Calendar` (`calendars`)

Campaign schedules grouping monthly deliverables for a specific module.

- `_id`: `ObjectId` (PK)
- `clientId`: `ObjectId -> Client` (Required, Indexed)
- `scopeId`: `ObjectId -> ScopeOfWork` (Required)
- `createdBy`: `ObjectId -> User` (Required)
- `module`: `Enum ["social", "paid", "seo", "email", "influencer", "website", "orm", "video", "design", "custom"]`
- `name`: `String` (Required)
- `objective`: `String`
- `startDate`, `endDate`: `Date` (Required)
- `status`: `Enum ["draft", "active", "completed", "paused"]`
- `plannedItems`: Array of `{ scopeItemId, label, type, platforms, plannedQty, totalInScope }`
- `buckets`: `Array<String>` (Content themes/pillars)
- `platforms`: `Array<String>` (e.g. Meta, Google, LinkedIn)
- `funnelStages`: `Array<String>` (`["TOF", "MOF", "BOF"]` for Paid Ads)
- **Indexes**: `{ clientId: 1, module: 1 }`, `{ clientId: 1, scopeId: 1 }`, `{ clientId: 1, status: 1 }`

---

### 3. Deliverables & Content/Design Production Pipeline

#### `Deliverable` (`deliverables`)

The parent unit of work scheduled on a calendar.

- `_id`: `ObjectId` (PK)
- `clientId`: `ObjectId -> Client` (Required, Indexed)
- `scopeId`: `ObjectId -> ScopeOfWork` (Required)
- `calendarId`: `ObjectId -> Calendar` (Required, Indexed)
- `module`: `String`
- `type`: `String` (`"image"`, `"reel"`, `"story"`, `"image/carousel"`, `"video"`, `"blog"`, etc.)
- `platforms`: `Array<String>`
- `title`: `String` (Required)
- `buckets`: `Array<String>`
- `status`: `Enum` (Synchronized with current draft stage):
  - _Draft/Content_: `"pending"`, `"in_progress"`, `"content_internal_review"`, `"content_client_review"`, `"content_approved"`, `"content_req_change"`
  - _Design_: `"design_in_progress"`, `"design_internal_review"`, `"design_client_review"`, `"design_approved"`, `"design_req_change"`, `"design_rejected"`
  - _Delivery_: `"delivered"`, `"scheduled"`, `"published"`
- `assignedTeam`: Array of `{ userId: ObjectId -> User, role: ("writer"|"designer"|"video_editor"|...) }`
- `scheduledDate`: `Date` (Required, Indexed)
- `deliveredAt`: `Date`
- `publishedUrl`: `String`
- `statusTimeline`:
  - `writerTimeline`: Array of `{ status, timestamp, changedBy: { userId, name, email } }`
  - `designerTimeline`: Array of `{ status, timestamp, changedBy: { userId, name, email } }`
- `createdAt`, `updatedAt`: `Date`

---

#### `ContentDraft` (`contentdrafts`)

The actual creative copy, media assets, and approval entity tied to a Deliverable.

- `_id`: `ObjectId` (PK)
- `clientId`: `ObjectId -> Client` (Required)
- `calendarId`: `ObjectId -> Calendar` (Required)
- `deliverableId`: `ObjectId -> Deliverable` (Required, Indexed)
- `version`: `Number` (Auto-incrementing revision number)
- `createdBy`: `ObjectId -> User` (Copywriter)
- `lastChangedBy`: `{ userId, name, email, changedAt }`
- `status`: `DraftStatus` (Tracks through content review and design review cycles)
- `rejectionNote`: `String` (Feedback when client/lead requests changes)
- `designStartedBy`: `{ userId, name, email, startedAt }` _(Designer claim lock)_
- **Content / Copy Fields**:
  - `creativeCopy`: `String` (Primary body text / copy)
  - `caption`: `String`
  - `hashtags`: `Array<String>`
  - `referenceUrl`: `String`
  - `frames`: Array of `{ frameNo, copy, imageUrl }` _(For Carousels)_
  - `articleMode`, `articleCopy`: _(For Blog/Article posts)_
- **Creative Asset Fields**:
  - `mediaType`: `String`
  - `imageUrl`, `videoUrl`, `thumbnailUrl`, `audioUrl`: `String`
  - `videoType`, `videoNotes`: `String`
- **Paid Ads Variants** (Meta / Google Ads):
  - `adPlatform`: `"meta" | "google"`
  - `primaryTexts`: `Array<String>`, `headlines`: `Array<String>`, `descriptions`: `Array<String>`
  - `cta`: `String`, `landingUrl`: `String`, `adCopy`: `String`
  - Google Ads specific: `businessName`, `longHeadline`, `trackingTemplate`, `finalUrlSuffix`, `customParameters`
- **Publishing & Archival**:
  - `publishDate`: `Date`, `publishTime`: `String`
  - `archivedAt`: `Date | null`, `archivedBy`: `{ userId, name, email }`

---

#### `DraftHistory` (`drafthistories`)

Tracks version history and diffs between edits and reviews.

- `_id`: `ObjectId` (PK)
- `clientId`, `calendarId`, `deliverableId`, `draftId`: `ObjectId` references
- `draftVersion`: `Number`
- `action`: `Enum ["created", "edited", "submitted", "approved", "rejected"]`
- `changedBy`: `{ userId, name, email }`
- `changedAt`: `Date`
- `changes`: Array of `{ field, label, from, to }`

---

### 4. Tasks & Project Management

#### `Task` (`tasks`)

General agency task board (Kanban) for operations and non-calendar tasks.

- `_id`: `ObjectId` (PK)
- `title`: `String` (Required)
- `description`: `String`
- `status`: `Enum ["OPEN", "IN_PROGRESS", "REVIEW", "REVISED", "COMPLETED", "ON_HOLD", "CANCELLED"]`
- `priority`: `Enum ["LOW", "MEDIUM", "HIGH", "URGENT"]`
- `clientId`: `ObjectId -> Client` (Required)
- `createdById`: `ObjectId -> User`
- `assignedToId`: `ObjectId -> User`
- `module`, `category`: `String`
- `writerId`, `editorId`, `designerId`, `videoEditorId`: Role-specific assignees
- `writerStatus`, `editorStatus`, `designerStatus`, `videoEditorStatus`: Sub-workflow statuses
- `subTasks`: Array of `{ title, status }`
- `comments`: Array of `{ text, authorId: ObjectId -> User, createdAt }`
- `attachments`: Array of `{ fileUrl, fileName, uploadedAt }`
- `startDate`, `endDate`: `Date`

---

#### `ClientTaskRequest` (`clienttaskrequests`)

Ad-hoc requests submitted by clients directly from the client portal.

- `_id`: `ObjectId` (PK)
- `clientId`: `ObjectId -> Client` (Required)
- `requestedBy`: `ObjectId -> User` (Required)
- `title`, `description`: `String` (Required)
- `status`: `Enum ["pending", "approved", "rejected", "in-progress", "completed"]`
- `dueDate`: `Date`

---

#### `GanttTask` & `GanttLink` (`gantttasks`, `ganttlinks`)

Interactive Gantt project planning milestones and dependency links.

- **`GanttTask`**:
  - `clientId`: `ObjectId -> Client` (Required, Indexed)
  - `text`: `String` (Task/Milestone name)
  - `start`: `Date`, `end`: `Date | null`, `duration`: `Number`
  - `progress`: `Number` (0 to 100%)
  - `type`: `"task" | "summary" | "milestone"`
  - `parent`: `String | null` (Hierarchy)
  - `orderId`: `Number`
- **`GanttLink`**:
  - `clientId`: `ObjectId -> Client`
  - `source`: `String` (Predecessor task ID)
  - `target`: `String` (Successor task ID)
  - `type`: `String` (e.g. `"e2s"` - End to Start)

---

### 5. File Repository & Asset Management

#### `RepoFolder` & `RepoFile` (`repofolders`, `repofiles`)

Hierarchical cloud asset manager partitioned per client (or agency-internal).

- **`RepoFolder`**:
  - `name`: `String` (Max 200 chars)
  - `parentId`: `ObjectId -> RepoFolder | null` (Null = root directory)
  - `clientId`: `ObjectId -> Client | null` (Null = internal agency repository)
  - `createdBy`: `{ userId, name, email }`
  - **Constraint**: Unique index on `{ parentId: 1, clientId: 1, name: 1 }`
- **`RepoFile`**:
  - `name`: `String` (With file extension)
  - `folderId`: `ObjectId -> RepoFolder | null`
  - `clientId`: `ObjectId -> Client | null`
  - `storageKey`: `String` (Disk / S3 path)
  - `mimeType`: `String`, `ext`: `String`, `size`: `Number` (Bytes)
  - `category`: `Enum ["image", "video", "audio", "pdf", "document", "spreadsheet", "presentation", "archive", "other"]`
  - `uploadedBy`: `{ userId, name, email }`
  - **Constraint**: Unique index on `{ folderId: 1, clientId: 1, name: 1 }`

---

### 6. Activity & Audit Logs

#### `ActivityLog` (`activitylogs`)

Full audit logging for security, compliance, and user actions.

- `_id`: `ObjectId` (PK)
- `userId`, `userEmail`, `userName`: `String`
- `action`: `String` (e.g. `"LOGIN"`, `"DRAFT_APPROVE"`, `"CLIENT_CREATE"`)
- `method`: `String` (`GET`, `POST`, `PATCH`, `DELETE`)
- `url`: `String`
- `status`: `Number` (HTTP status code)
- `ip`, `userAgent`: `String`
- `requestData`: `Mixed` (Payload snapshot)
- `details`: `String`
- `createdAt`, `updatedAt`: `Date`
