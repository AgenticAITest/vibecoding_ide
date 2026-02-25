# VibeCoder IDE — Custom Web IDE from Scratch

## Project Overview

Building a **custom vibe-coding IDE** from scratch — a web-based IDE where AI chat is the primary interface, targeted at non-programmers building React Native mobile apps.

**Design principle:** "Chat first, view second, code when needed."

### Why From Scratch (Not Code-Server)

The previous approach (customizing code-server/VS Code) failed because:
- VS Code stores UI state in browser IndexedDB, not server-side
- State restoration races with extension activation — unavoidable race conditions
- Every CSS/layout fix introduced new edge cases
- The `vibecoder-plan.md` documents the full history of that failed approach

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React + TypeScript + Vite |
| Code Editor | `@monaco-editor/react` |
| Terminal | xterm.js + `node-pty` |
| AI Chat | `@anthropic-ai/claude-agent-sdk` |
| Resizable Panels | `allotment` |
| Backend | Node.js + Express + `ws` |
| Git | `simple-git` |
| File Watching | `chokidar` |
| Markdown | `react-markdown` + `remark-gfm` + `rehype-highlight` |
| QR Codes | `qrcode` |

## Project Structure

npm workspaces monorepo:
```
vibecoder/
├── packages/
│   ├── shared/        # Shared TypeScript types
│   ├── backend/       # Node.js + Express + WS server (port 3001)
│   └── frontend/      # React + Vite app (port 5173)
```

See `vibecoder-ide-plan.md` for full directory tree.

## Architecture

### Layout (3-column with allotment)
- **Left:** ChatPanel (280-500px) — messages, tool call bubbles, input
- **Center:** CenterPanel (fills remaining) — tab bar + content (Monaco/xterm/iframe/QR)
- **Right:** FileTreePanel (snappable, 0-400px) — file explorer, toggles with Ctrl+E

### Communication
- **REST** (`/api/*`): File CRUD, project CRUD, git actions
- **WebSocket** (single connection, multiplexed): AI chat streaming, terminal I/O, file change notifications
- Message envelope: `{ channel: 'ai' | 'terminal' | 'files', type: string, payload: unknown }`

### AI Provider Interface
Swappable provider pattern in `packages/backend/src/services/ai/provider.ts`. Primary: Claude Agent SDK. Future: OpenRouter, Gemini CLI.

## Build Phases

1. **Phase 1: Skeleton + Chat (MVP)** — Monorepo, Express+WS, Vite+React, AppShell, ChatPanel, streaming AI
2. **Phase 2: File System + Editor** — File tree, Monaco editor, tab system, file watching
3. **Phase 3: Terminal** — node-pty + xterm.js, multiple terminal tabs, Expo URL detection
4. **Phase 4: Project Wizard + Scaffolder** — Port apiParser.ts/scaffolder.ts, 5-step wizard
5. **Phase 5: Preview + QR + Git** — Expo QR, web preview iframe, git panel
6. **Phase 6: Polish** — Error boundaries, WS reconnect, shortcuts, theme polish

## UI Reference

The Replit UI screenshot (`replitui.png`) and description (`replit_ui_description.txt`) are the visual reference. Key patterns to follow:
- Clean dark theme
- Chat on the left with task progress display
- Tabbed center panel (Preview default, Console, Database, Shell, Git, +)
- File tree toggle button (top right)
- Minimal chrome, no clutter

## Conventions

- Use TypeScript strict mode throughout
- Zustand for frontend state management (chatStore, tabStore, fileStore, projectStore, uiStore)
- Single WebSocket connection with channel multiplexing
- Backend on port 3001, frontend Vite dev server on 5173
- `npm run dev` starts both concurrently
- Test after each phase by opening http://localhost:5173

## Current Status

Starting fresh — no code written yet. Ready to begin Phase 1.
