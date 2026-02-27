# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

VibeCoder IDE — a custom web-based IDE where AI chat is the primary interface, targeted at non-programmers building React Native mobile apps. Design principle: "Chat first, view second, code when needed."

**IMPORTANT:** Never suggest using the Anthropic API key or `@anthropic-ai/sdk` directly. The user uses a Claude Max subscription via the Claude Agent SDK. If an API key route is ever needed, use OpenRouter (not Anthropic API).

## Commands

```bash
# Start both backend (port 3001) and frontend (port 5173) concurrently
cd vibecoder && npm run dev

# Build all packages (shared → backend → frontend)
cd vibecoder && npm run build

# Start only backend (from vibecoder/)
npm run dev -w packages/backend    # uses tsx for dev
npm run build -w packages/backend  # uses tsc

# Start only frontend (from vibecoder/)
npm run dev -w packages/frontend   # uses vite
npm run build -w packages/frontend # uses tsc -b && vite build

# Lint frontend
npm run lint -w packages/frontend
```

No test framework is set up yet. Verify changes by running `npm run dev` and opening http://localhost:5173.

## Architecture

### Repository & Monorepo Structure (npm workspaces)

```
vibecoding_ide/                    ← repo root
├── vibecoder/                     ← monorepo root (npm workspaces)
│   ├── package.json               ← workspace config + root scripts
│   ├── tsconfig.base.json         ← shared TypeScript config (strict, ES2022, NodeNext)
│   └── packages/
│       ├── shared/   → @vibecoder/shared    — TypeScript types only (no build step, exports via src/index.ts)
│       ├── backend/  → @vibecoder/backend   — Express 5 + ws + node-pty (port 3001)
│       └── frontend/ → @vibecoder/frontend  — React 19 + Vite 7 (port 5173)
├── projects/                      ← scaffolded user projects live here
│   ├── demo-app/                  ← default project
│   └── my_app/
├── CLAUDE.md                      ← this file
├── vibecoder-ide-plan.md          ← master implementation plan
└── flutter-integration-plan.md    ← Flutter support roadmap
```

### Communication: REST + Multiplexed WebSocket

REST (`/api/*`) handles file CRUD, project CRUD, and git operations. A **single WebSocket connection** handles all real-time communication, multiplexed by channel:

```typescript
{ channel: 'ai' | 'terminal' | 'files' | 'preview', type: string, payload: unknown }
```

- **ai** — Bidirectional: client sends messages, server streams text deltas + tool calls
- **terminal** — Bidirectional: client sends input/resize, server streams output
- **files** — Server→client broadcast: file change notifications from chokidar watcher
- **preview** — Server→client broadcast: Expo URL detection + server state

### Frontend: 3-Column Layout with allotment

- **Left:** ChatPanel (280–500px) — AI messages, tool call bubbles, input with image upload
- **Center:** CenterPanel (flexible) — TabBar + content area (editor, terminal, preview, wizard, git, etc.)
- **Right:** FileTreePanel (snappable, 0–400px) — file explorer, toggled with Ctrl+E

State managed by **Zustand stores**: chatStore, tabStore, fileStore, terminalStore, previewStore, gitStore, consoleStore, uiStore, wizardStore.

### Frontend File Map

```
packages/frontend/src/
├── App.tsx                          ← root component
├── main.tsx                         ← Vite entry
├── components/
│   ├── layout/
│   │   ├── AppShell.tsx             ← 3-column Allotment layout
│   │   ├── ChatPanel.tsx            ← left panel wrapper
│   │   ├── CenterPanel.tsx          ← center panel (TabBar + content)
│   │   ├── FileTreePanel.tsx        ← right panel, file tree
│   │   ├── StatusBar.tsx            ← bottom info bar
│   │   └── ProjectSelector.tsx      ← project switcher dropdown
│   ├── chat/
│   │   ├── ChatView.tsx             ← message list, auto-scroll
│   │   ├── ChatMessage.tsx          ← single message (user vs assistant)
│   │   ├── ChatInput.tsx            ← input + image upload, Ctrl+Enter to send
│   │   └── ToolCallBubble.tsx       ← tool call display with status
│   ├── editor/
│   │   ├── CodeEditor.tsx           ← Monaco editor (detects images → ImageViewer)
│   │   └── ImageViewer.tsx          ← image preview for .png/.jpg/.gif/.webp
│   ├── terminal/
│   │   └── TerminalView.tsx         ← xterm.js wrapper
│   ├── preview/
│   │   ├── PreviewPanel.tsx         ← device frame + Metro iframe
│   │   └── PreviewPanel.css         ← sizer wrapper + device frame styles
│   ├── tabs/
│   │   ├── TabBar.tsx               ← tab buttons with close icons
│   │   └── TabContent.tsx           ← routes tab type → component
│   ├── wizard/
│   │   ├── ProjectWizard.tsx        ← multi-step form with progress bar
│   │   ├── StepName.tsx             ← project name validation
│   │   ├── StepFramework.tsx        ← Expo vs Flutter selection
│   │   ├── StepApi.tsx              ← API spec: paste JSON, fetch URL, or skip
│   │   ├── StepDesign.tsx           ← upload design reference images
│   │   ├── StepHtmlImport.tsx       ← HTML/CSS design file importer (Expo only)
│   │   └── StepReview.tsx           ← confirm settings before create
│   ├── git/
│   │   └── GitPanel.tsx             ← status, stage/unstage, commit, push/pull
│   ├── WelcomePage.tsx              ← initial landing screen
│   ├── ProjectList.tsx              ← view/delete projects
│   └── ConsolePanel.tsx             ← browser console + network log viewer
├── hooks/
│   ├── useWebSocket.ts              ← singleton WS connection, channel routing, auto-reconnect
│   ├── useAiChat.ts                 ← AI chat over WS: send, interrupt, streaming
│   ├── useTerminal.ts               ← PTY session management over WS
│   ├── useFileWatcher.ts            ← file change subscription → fileStore
│   ├── usePreviewWatcher.ts         ← Expo URL + QR → previewStore
│   └── useConsoleListener.ts        ← iframe postMessage → consoleStore
├── store/
│   ├── chatStore.ts                 ← messages, sessionId, streaming state, tool calls
│   ├── tabStore.ts                  ← tabs array, activeTabId, open/close/switch
│   ├── fileStore.ts                 ← file tree, expanded dirs, project dir
│   ├── uiStore.ts                   ← panel sizes, file tree visibility
│   ├── terminalStore.ts             ← terminal sessions + counter
│   ├── previewStore.ts              ← expoUrl, qrDataUrl, viewMode, serverState
│   ├── gitStore.ts                  ← status, log, branches, commit message, diff
│   ├── consoleStore.ts              ← log entries (max 500), filter
│   └── wizardStore.ts               ← wizard step, framework, project config
└── lib/
    └── api.ts                       ← REST client: fileApi, projectApi, uploadApi, gitApi
```

### Backend File Map

```
packages/backend/src/
├── index.ts                         ← Express server setup, route mounting, WS init
├── ws/
│   ├── index.ts                     ← WS dispatcher: routes messages by channel
│   ├── aiChannel.ts                 ← Claude Agent SDK subprocess, streaming events
│   ├── terminalChannel.ts           ← PTY management, Expo URL scanning
│   ├── fileChannel.ts               ← file change broadcasts to all clients
│   └── previewChannel.ts            ← Expo URL caching + broadcasting
├── routes/
│   ├── files.ts                     ← /api/files/* — CRUD, tree, upload, raw serve
│   ├── projects.ts                  ← /api/projects/* — list, create, delete, activate
│   ├── git.ts                       ← /api/git/* — status, stage, commit, push, pull, branches, diff
│   └── preview.ts                   ← /api/preview-proxy/* — Metro proxy with header/script injection
└── services/
    ├── fileSystem.ts                ← file CRUD, path traversal protection, chokidar watcher
    ├── project.ts                   ← project list/create/activate/delete
    ├── scaffolder.ts                ← generates full Expo project structure (~700 LOC)
    ├── ptyService.ts                ← node-pty wrapper, session management
    ├── expo.ts                      ← ANSI stripping, Expo URL scanning, QR generation
    ├── apiParser.ts                 ← OpenAPI/Swagger JSON parser
    └── git.ts                       ← simple-git wrapper for all git operations
```

### Shared Types (`@vibecoder/shared`)

```
packages/shared/src/types/
├── ai.ts         ← AIMessage, AIStreamEvent, AIToolCall, AIImageAttachment
├── file.ts       ← FileNode, FileChange, FileEvent
├── tab.ts        ← Tab, TabType ('welcome'|'editor'|'terminal'|'preview'|'wizard'|'git'|'projects'|'console')
├── terminal.ts   ← TerminalClientMessage, TerminalServerEvent
├── ws.ts         ← WSMessage (channel + type + payload)
├── project.ts    ← ProjectFramework ('expo'|'flutter'), WizardStep, ScaffoldConfig, ParsedApi, ApiEndpoint
├── git.ts        ← GitStatus, GitFileChange, GitLogEntry, GitBranch
├── preview.ts    ← ExpoUrlInfo, PreviewServerEvent
└── console.ts    ← ConsoleEntry, NetworkEntry
```

### REST API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/files/tree` | File tree with ignored patterns |
| GET | `/api/files/read?path=` | Read file content |
| POST | `/api/files/write` | Write file content |
| POST | `/api/files/create` | Create file or directory |
| DELETE | `/api/files/delete?path=` | Delete file or directory |
| POST | `/api/files/rename` | Rename file or directory |
| GET/POST | `/api/files/project-dir` | Get or set active project directory |
| POST | `/api/files/upload` | Image upload (multer, max 10MB) |
| GET | `/api/files/raw?path=` | Raw file serving (images) |
| GET | `/api/projects` | List all projects + active dir |
| POST | `/api/projects/validate-name` | Validate project name |
| POST | `/api/projects/parse-api` | Parse API spec string (OpenAPI/Swagger) |
| POST | `/api/projects/fetch-api-url` | Fetch & parse remote API spec |
| POST | `/api/projects` | Create project (runs scaffolder) |
| DELETE | `/api/projects/:name` | Delete project |
| POST | `/api/projects/:name/activate` | Activate project |
| GET | `/api/git/status` | Current repo status |
| POST | `/api/git/init` | Initialize git repo |
| POST | `/api/git/stage` | Stage specific files |
| POST | `/api/git/stage-all` | Stage all changes |
| POST | `/api/git/unstage` | Unstage files |
| POST | `/api/git/commit` | Commit with message |
| POST | `/api/git/push` | Push to remote |
| POST | `/api/git/pull` | Pull from remote |
| GET | `/api/git/log?count=20` | Commit history |
| GET | `/api/git/branches` | Branch list |
| POST | `/api/git/branch` | Create branch |
| POST | `/api/git/checkout` | Switch branch |
| GET | `/api/git/diff?path=` | Diff output |
| * | `/api/preview-proxy/*` | Proxy to Metro dev server |

### Tab System

Tab types: `welcome | editor | terminal | preview | wizard | git | projects | console`. Tabs have a unique `id`; opening a tab with an existing id switches to it rather than creating a duplicate. Only `closable: true` tabs can be closed.

### Preview Panel: Device Frame Scaling

The phone preview uses a "sizer wrapper" pattern:
1. Container measures available space via ResizeObserver
2. Sizer div has explicit `width/height = device × scale` (provides correct layout footprint)
3. Device div (375×812px) is positioned absolute inside sizer, scaled via `transform: scale()` from top-left

This is necessary because `transform: scale()` changes visual size but NOT layout box size.

### Project Wizard Flow

The wizard guides non-programmers through project setup:
- **Expo steps:** name → framework → api → design → html-import → review (6 steps)
- **Flutter steps:** name → framework → api → design → review (5 steps, no html-import)
- Framework selection: Expo (active) or Flutter (marked "Coming soon")
- Project name validation: `/^[a-zA-Z][a-zA-Z0-9_-]{1,48}[a-zA-Z0-9]$/`

### Scaffolded Project Structure (Expo)

```
projects/<name>/
├── app/                    ← Expo Router pages
│   ├── _layout.tsx         ← Root Stack + ThemeProvider
│   ├── index.tsx           ← Redirect to /login
│   └── login.tsx           ← Login screen template
├── src/
│   ├── api/client.ts       ← HTTP client with auth headers
│   ├── api/endpoints.ts    ← Generated from OpenAPI spec
│   ├── components/         ← ScreenWrapper, Button, Card, Input
│   └── theme/              ← ThemeProvider + colors
├── assets/                 ← logo.png, etc.
├── .vibecoder/             ← Meta: api-schema.json, design files
├── package.json, app.json, tsconfig.json, babel.config.js
└── CLAUDE.md               ← Auto-generated project instructions
```

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Frontend | React + TypeScript + Vite | 19.2 / 5.9 / 7.3 |
| Code Editor | `@monaco-editor/react` | 4.7 |
| Terminal | `@xterm/xterm` + `@xterm/addon-fit` + `@xterm/addon-web-links` + `node-pty` | 6.0 / 0.11 / 0.12 / 1.1 |
| AI Chat | `@anthropic-ai/claude-agent-sdk` (Max subscription, NOT direct API) | 0.2.42 |
| Panels | `allotment` (extracted from VS Code) | 1.0.7 |
| Backend | Express + `ws` | 5.1 / 8.18 |
| State | Zustand | 5.0 |
| Git | `simple-git` | 3.32 |
| File Watch | `chokidar` | 5.0 |
| Markdown | `react-markdown` + `remark-gfm` + `rehype-highlight` | 10.1 |

## Conventions

- TypeScript strict mode throughout (base config in `vibecoder/tsconfig.base.json`)
- Backend uses ES modules (`"type": "module"`) with `tsx` for dev, `tsc` for build
- Frontend uses Vite with React plugin; ESLint 9 flat config with React + TypeScript ESLint
- Dark theme (Catppuccin Mocha): bg `#1e1e2e`, surface `#313244`, text `#cdd6f4`, subtext `#a6adc8`, border `#45475a`, accent `#89b4fa`
- File paths in shared types use forward slashes, even on Windows
- File system service blocks: `node_modules`, `.git`, `.expo`, `dist`, `.cache`, hidden files (except `.env`)
- WebSocket auto-reconnects with exponential backoff (1s → 10s max)
- Keyboard shortcuts: Ctrl+`` ` `` (new terminal), Ctrl+E (toggle file tree), Ctrl+Enter (send chat)
- Shared types (`@vibecoder/shared`) are the source of truth for message shapes between frontend and backend
- Image uploads: PNG/JPG/GIF/WebP only, max 10MB, sanitized filenames

## Critical Implementation Notes

- **Preview proxy mount order:** `routes/preview.ts` **MUST** be mounted BEFORE `express.json()` middleware to avoid consuming the request stream.
- **Claude Agent SDK subprocess:** Must set `env: { CLAUDECODE: undefined }` to avoid nested session detection error.
- **AI session resume:** Capture `session_id` from the init message and pass as `options.resume: sessionId` for continuity.
- **Path security:** All file operations go through `resolveSafe()` for path traversal protection.
- **Terminal platform detection:** Windows uses `powershell.exe -NoLogo`, Unix uses `$SHELL` or `/bin/bash`.
- **Expo URL scanning:** Strips ANSI codes (CSI + OSC + two-char sequences), 8KB rolling buffer per terminal session.
- **Project directory:** Defaults to `vibecoding_ide/projects/demo-app`, overrideable via `VIBECODER_PROJECT_DIR` env var.
- **Vite proxy:** Frontend `vite.config.ts` proxies `/api` and `/ws` to `http://localhost:3001`.

## Current Status

Phases 1–5 complete. Phase 6 (polish) in progress.

**Completed in Phase 6:**
- Mobile device frame scaling (sizer wrapper pattern)
- Flutter framework selection UI in wizard (Flutter marked "Coming soon")
- Image viewer for file tabs (auto-detects image MIME types)
- UI polish across chat, tabs, editor, terminal, git, console panels

**Remaining in Phase 6:**
- Error boundaries for component failure recovery
- WebSocket reconnect improvements
- Additional keyboard shortcuts
- Theme polish
- AI provider stubs (OpenRouter/Gemini for future swapability)
