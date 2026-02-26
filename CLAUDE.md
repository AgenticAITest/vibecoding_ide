# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

VibeCoder IDE — a custom web-based IDE where AI chat is the primary interface, targeted at non-programmers building React Native mobile apps. Design principle: "Chat first, view second, code when needed."

**IMPORTANT:** Never suggest using the Anthropic API key or `@anthropic-ai/sdk` directly. The user uses a Claude Max subscription via the Claude Agent SDK. If an API key route is ever needed, use OpenRouter (not Anthropic API).

## Commands

```bash
# Start both backend (port 3001) and frontend (port 5173) concurrently
cd vibecoder && npm run dev

# Build all packages
cd vibecoder && npm run build

# Start only backend (from vibecoder/)
npm run dev -w @vibecoder/backend    # uses tsx for dev
npm run build -w @vibecoder/backend  # uses tsc

# Start only frontend (from vibecoder/)
npm run dev -w @vibecoder/frontend   # uses vite
npm run build -w @vibecoder/frontend # uses tsc -b && vite build
```

No test framework is set up yet. Verify changes by running `npm run dev` and opening http://localhost:5173.

## Architecture

### Monorepo Structure (npm workspaces)

```
vibecoder/
├── packages/
│   ├── shared/    → @vibecoder/shared   — TypeScript types only (no build, exports via src/index.ts)
│   ├── backend/   → @vibecoder/backend  — Express + ws + node-pty (port 3001)
│   └── frontend/  → @vibecoder/frontend — React + Vite (port 5173)
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
- **Center:** CenterPanel (flexible) — TabBar + content (Monaco editor, xterm terminal, preview iframe, wizard, git panel)
- **Right:** FileTreePanel (snappable, 0–400px) — file explorer, toggled with Ctrl+E

State managed by **Zustand stores**: chatStore, tabStore, fileStore, terminalStore, previewStore, gitStore, consoleStore, uiStore, wizardStore.

### Backend: Key Services

- **AI Channel** (`ws/aiChannel.ts`) — Spawns Claude Agent SDK subprocess. Streams `AIStreamEvent` messages. Supports session resume via `options.resume: sessionId`. Must set `env: { CLAUDECODE: undefined }` to avoid nested session detection.
- **File System** (`services/fileSystem.ts`) — File CRUD with path traversal protection. Chokidar watcher batches changes (150ms debounce) and broadcasts to all WS clients. Project dir defaults to `vibecoding_ide/projects/demo-app`, overrideable via `VIBECODER_PROJECT_DIR` env var.
- **PTY Service** (`services/ptyService.ts`) — node-pty sessions. Windows uses `powershell.exe`, Unix uses `$SHELL` or `/bin/bash`.
- **Expo Scanner** (`services/expo.ts`) — Scans terminal output for Expo URLs in real-time (strips ANSI, rolling 8KB buffer). Generates QR codes via `qrcode` library.
- **Scaffolder** (`services/scaffolder.ts`) — Generates full React Native/Expo project structure from `ScaffoldConfig`. Auto-generates a CLAUDE.md inside each project.
- **Preview Proxy** (`routes/preview.ts`) — Proxies Metro dev server. Strips frame-blocking headers, injects `<base>` tag and console/network interceptor scripts. **Must be mounted BEFORE `express.json()`** to avoid consuming the request stream.

### Tab System

Tab types: `welcome | editor | terminal | preview | wizard | git | projects | console`. Tabs have a unique `id`; opening a tab with an existing id switches to it rather than creating a duplicate. Only `closable: true` tabs can be closed.

### Preview Panel: Device Frame Scaling

The phone preview uses a "sizer wrapper" pattern:
1. Container measures available space via ResizeObserver
2. Sizer div has explicit `width/height = device × scale` (provides correct layout footprint)
3. Device div (375×812px) is positioned absolute inside sizer, scaled via `transform: scale()` from top-left

This is necessary because `transform: scale()` changes visual size but NOT layout box size.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + TypeScript + Vite |
| Code Editor | `@monaco-editor/react` |
| Terminal | xterm.js + `node-pty` |
| AI Chat | `@anthropic-ai/claude-agent-sdk` (Max subscription, NOT direct API) |
| Panels | `allotment` (extracted from VS Code) |
| Backend | Express 5 + `ws` |
| State | Zustand |
| Git | `simple-git` |
| File Watch | `chokidar` |
| Markdown | `react-markdown` + `remark-gfm` + `rehype-highlight` |

## Conventions

- TypeScript strict mode throughout (base config in `vibecoder/tsconfig.base.json`)
- Backend uses ES modules with `tsx` for dev, `tsc` for build
- Frontend uses Vite with React plugin
- Dark theme (Catppuccin): bg `#1e1e2e`, text `#cdd6f4`, border `#45475a`, accent `#89b4fa`
- File paths in shared types use forward slashes, even on Windows
- File system service blocks: `node_modules`, `.git`, `.expo`, `dist`, `.cache`, hidden files (except `.env`)
- WebSocket auto-reconnects with exponential backoff (1s → 10s max)
- Keyboard shortcuts: Ctrl+\` (new terminal), Ctrl+E (toggle file tree)
- Shared types are the source of truth for message shapes between frontend and backend

## Current Status

Phases 1–5 complete. Phase 6 (polish) in progress — remaining: error boundaries, WS reconnect improvements, shortcuts, theme polish, provider stubs.
