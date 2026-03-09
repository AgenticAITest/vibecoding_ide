# VibeCoder IDE — Enhancement Plan

## Overview

Four enhancements to take VibeCoder from a single-user local tool to a deployable multi-user platform.

---

## Phase 1: HTTPS (Reverse Proxy)

**Goal:** Secure the app for public deployment. Zero code changes.

### Approach: Caddy Reverse Proxy

Caddy auto-provisions Let's Encrypt TLS certificates with zero config.

```
┌──────────────────────────────────┐
│  Caddy (port 443)                │
│  ├── TLS termination (auto cert) │
│  ├── / → vibecoder:3001          │
│  └── /ws → vibecoder:3001 (WS)  │
└──────────────────────────────────┘
         ↓
┌──────────────────────────────────┐
│  VibeCoder (port 3001, HTTP)     │
└──────────────────────────────────┘
```

### Tasks

1. **Caddyfile** — reverse proxy config with automatic HTTPS
2. **docker-compose.yml** — add Caddy service, expose port 443, internal network to vibecoder
3. **WebSocket upgrade** — Caddy handles this natively, no app changes
4. **Environment variable** — `VIBECODER_DOMAIN=your-domain.com` for Caddy config

### Files to Create/Modify

| File | Action |
|------|--------|
| `Caddyfile` | Create — reverse proxy config |
| `docker-compose.yml` | Modify — add Caddy service + network |

**Effort:** Small (1 hour)

---

## Phase 2: Multi-User

**Goal:** Each user logs in, sees only their own projects. Admin can create/manage users.

### Current State

- No auth, no user concept
- Global `projectDir` — one active project for the entire backend process
- All WebSocket clients share the same state
- `projects/` directory is flat (all projects at one level)

### Target Architecture

```
┌─────────────────────────────────────────────┐
│  Browser                                     │
│  ├── Login page (unauthenticated)            │
│  └── IDE (authenticated, JWT in memory)      │
└─────────────────────────────────────────────┘
         ↓ JWT in Authorization header + WS query param
┌─────────────────────────────────────────────┐
│  Backend                                     │
│  ├── POST /api/auth/login                    │
│  ├── Auth middleware (all /api/* + WS)       │
│  ├── Per-user project dirs:                  │
│  │   projects/<userId>/app1/                 │
│  │   projects/<userId>/app2/                 │
│  └── Per-connection state (not global)       │
└─────────────────────────────────────────────┘
```

### 2.1 User Model & Storage

Simple JSON file or SQLite database. Start with JSON file for simplicity.

```typescript
interface User {
  id: string;           // UUID
  username: string;     // unique
  passwordHash: string; // bcrypt
  role: 'admin' | 'user';
  createdAt: string;
}
```

Storage: `data/users.json` (mounted as Docker volume for persistence).

Default admin account created on first boot (env vars: `ADMIN_USERNAME`, `ADMIN_PASSWORD`).

### 2.2 Auth Routes

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/login` | No | Returns JWT |
| POST | `/api/auth/logout` | Yes | Invalidate (client-side) |
| GET | `/api/auth/me` | Yes | Current user info |
| GET | `/api/admin/users` | Admin | List all users |
| POST | `/api/admin/users` | Admin | Create user |
| DELETE | `/api/admin/users/:id` | Admin | Delete user |
| PUT | `/api/admin/users/:id/password` | Admin | Reset password |

### 2.3 Auth Middleware

```typescript
// Every /api/* route (except /api/auth/login) requires valid JWT
app.use('/api', authMiddleware);

// WebSocket: JWT passed as query param on connect
// ws://host/ws?token=<jwt>
```

JWT contains: `{ userId, username, role }`. Short expiry (24h), no refresh tokens initially.

### 2.4 Per-User Project Isolation

**The big refactor.** Currently `getProjectDir()` returns a global variable. Needs to become per-request.

```
Before: getProjectDir() → global projectDir
After:  getProjectDir(userId) → projects/<userId>/<activeProject>
```

**Files that need user context passed through:**

| File | What changes |
|------|-------------|
| `services/fileSystem.ts` | `getProjectDir(userId)`, `resolveSafe(userId, path)` |
| `services/project.ts` | `listProjects(userId)`, `createProject(userId, config)`, `activateProject(userId, name)` |
| `services/git.ts` | All functions receive `projectDir` as parameter instead of calling `getProjectDir()` |
| `routes/files.ts` | Extract `userId` from `req.user`, pass to file service |
| `routes/projects.ts` | Extract `userId` from `req.user`, pass to project service |
| `routes/git.ts` | Extract `userId` from `req.user`, pass to git service |
| `ws/index.ts` | Extract `userId` from WS query token, attach to connection |
| `ws/aiChannel.ts` | Use per-connection `projectDir` |
| `ws/terminalChannel.ts` | Use per-connection `projectDir` for PTY cwd |
| `ws/fileChannel.ts` | Per-user file watcher |

**Strategy:** Instead of refactoring `getProjectDir()` to take userId everywhere, create a per-connection context object:

```typescript
interface ConnectionContext {
  userId: string;
  username: string;
  role: 'admin' | 'user';
  projectDir: string;      // current active project path
}
```

REST routes get context from JWT middleware. WebSocket connections store context on the socket object.

### 2.5 Frontend Changes

| Component | Change |
|-----------|--------|
| New: `LoginPage.tsx` | Username/password form, stores JWT in memory (not localStorage) |
| New: `AdminPanel.tsx` | User CRUD table (only visible to admin role) |
| `App.tsx` | Route guard: unauthenticated → LoginPage, authenticated → AppShell |
| `lib/api.ts` | Add `Authorization: Bearer <token>` header to all requests |
| `useWebSocket.ts` | Pass token as query param: `ws://host/ws?token=<jwt>` |
| `store/` | New `authStore.ts` — token, user info, login/logout actions |

### 2.6 Project Directory Structure

```
projects/
├── <userId-1>/
│   ├── my-app/
│   └── demo-app/
├── <userId-2>/
│   └── cool-app/
└── ...
```

Each user's projects are fully isolated. Admin can see all users but not their projects (unless we add that later).

**Effort:** Large (multiple sessions). This touches nearly every backend file.

---

## Phase 3: AI Provider Stubs

**Goal:** Abstract the AI layer so the provider can be swapped between Claude Agent SDK, OpenRouter, and Gemini.

### Current State

- `aiChannel.ts` directly imports and calls `@anthropic-ai/claude-agent-sdk`
- Claude-specific: `query()` function, stream event parsing, `preset: 'claude_code'`, session resumption
- Claude Agent SDK is special — it spawns a CLI that can autonomously edit files and run terminal commands

### Design Decision: Two Tiers of AI

```
Tier 1: "Agentic" (Claude Agent SDK)
  - Can edit files, run commands, use tools
  - Spawns CLI subprocess
  - Full IDE integration

Tier 2: "Chat" (OpenRouter, Gemini, etc.)
  - Text-only responses (no tool use)
  - Standard HTTP streaming (SSE)
  - Can answer questions, generate code snippets
  - User must manually copy/paste code
```

Tier 2 providers are simpler but less powerful. The UI should indicate which mode is active.

### 3.1 Provider Interface

```typescript
interface AIProvider {
  name: string;
  tier: 'agentic' | 'chat';
  chat(params: AIChatParams): AsyncGenerator<AIStreamEvent>;
  interrupt?(sessionId: string): void;
}

interface AIChatParams {
  prompt: string;
  projectDir: string;
  sessionId?: string;
  systemPrompt?: string;
  abortController: AbortController;
}
```

### 3.2 Provider Implementations

| Provider | Tier | SDK/API | Notes |
|----------|------|---------|-------|
| `ClaudeAgentProvider` | Agentic | `@anthropic-ai/claude-agent-sdk` | Current implementation, extracted into adapter |
| `OpenRouterProvider` | Chat | OpenRouter REST API (SSE) | Requires `OPENROUTER_API_KEY` env var |
| `GeminiProvider` | Chat | Google AI REST API (SSE) | Requires `GEMINI_API_KEY` env var |

### 3.3 Provider Selection

- Environment variable: `AI_PROVIDER=claude|openrouter|gemini`
- Or per-user setting (after multi-user is implemented)
- Frontend shows current provider in chat header

### 3.4 Files to Create/Modify

| File | Action |
|------|--------|
| `services/ai/provider.ts` | Create — `AIProvider` interface |
| `services/ai/claudeAgent.ts` | Create — extract current `aiChannel.ts` logic |
| `services/ai/openrouter.ts` | Create — OpenRouter SSE streaming |
| `services/ai/gemini.ts` | Create — Gemini SSE streaming |
| `services/ai/index.ts` | Create — factory: `getProvider(name)` |
| `ws/aiChannel.ts` | Modify — use provider interface instead of direct SDK call |
| `shared/types/ai.ts` | Modify — add `provider` field to events |

**Effort:** Medium (1–2 sessions)

---

## Phase 4: Import App Capability

**Goal:** Let users import existing projects into the IDE.

### Import Methods

#### 4.1 Upload ZIP

User uploads a `.zip` file → backend extracts it into `projects/<userId>/<name>/`.

```
POST /api/projects/import-zip
Content-Type: multipart/form-data
Body: file (zip), name (project name)
```

Backend: extract zip, validate structure, activate project.

#### 4.2 Clone from GitHub

User enters a GitHub repo URL → backend runs `git clone` into `projects/<userId>/<name>/`.

```
POST /api/projects/import-git
Body: { url: string, name?: string, token?: string }
```

Backend: `git clone <url>` into projects dir. Optional PAT for private repos.

#### 4.3 Frontend UI

Add an "Import" option to the project creation flow:
- Button on WelcomePage or ProjectList: "Import Project"
- Modal with two tabs: "Upload ZIP" | "Clone from GitHub"
- Progress indicator for clone/extract

### Files to Create/Modify

| File | Action |
|------|--------|
| `services/importer.ts` | Create — zip extraction + git clone logic |
| `routes/projects.ts` | Modify — add import endpoints |
| `components/ImportModal.tsx` | Create — import UI |
| `WelcomePage.tsx` or `ProjectList.tsx` | Modify — add import button |

**Effort:** Small–Medium (1 session)

---

## Implementation Order

| Step | Phase | Effort | Dependencies |
|------|-------|--------|-------------|
| **1** | HTTPS (Caddy reverse proxy) | Small | None | **DONE** |
| **2** | Multi-User (auth, isolation) | Large | None (but HTTPS recommended first) | **DONE** |
| **3** | AI Provider Stubs | Medium | None (but cleaner after multi-user) | |
| **4** | Import App | Small–Medium | Multi-user (needs userId for project path) | **DONE** |

---

## Open Questions

1. **User storage:** JSON file vs SQLite? JSON is simpler but doesn't scale. SQLite is better for queries but adds a dependency
==> postgre, i got docker desktop running

2. **JWT storage on frontend:** Memory only (lost on refresh) vs HttpOnly cookie? Cookie is more secure and survives page refresh.
==> memory only

3. **AI provider per-user or global?** If per-user, need a settings UI. If global, just env var.
==> global, only admin can change this.  the user will only see a chat panel

4. **Admin project visibility:** Should admin be able to see/manage other users' projects?
==> yes

5. **Import: auto-detect framework?** When importing a project, should we detect if it's Expo/Flutter/plain React and configure accordingly?
==> yes, auto-detect
