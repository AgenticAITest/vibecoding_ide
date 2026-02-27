# VibeCoder — Custom Web IDE from Scratch

## Context

The code-server customization approach (VS Code extension controlling layout) proved fundamentally fragile. VS Code restores UI state from browser IndexedDB before extensions activate, creating unavoidable race conditions. Every fix introduced new edge cases. The decision: build a custom vibe-coding IDE from scratch, owning every pixel and state transition.

**Design principle:** "Chat first, view second, code when needed."

**Target users:** Non-programmers building React Native mobile apps via AI chat.

## Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Frontend | React + TypeScript + Vite | Best Monaco integration, fast dev |
| Code Editor | `@monaco-editor/react` | Same editor as VS Code, built-in TS IntelliSense |
| Terminal | xterm.js + `node-pty` | Production-grade web terminal |
| AI Chat | `@anthropic-ai/claude-agent-sdk` | Wraps Claude Code CLI, uses Max subscription, streams JSON |
| Resizable Panels | `allotment` | Extracted from VS Code itself, supports snap/collapse |
| Backend | Node.js + Express + `ws` | Simple, single-port server |
| Git | `simple-git` | Clone/push/pull/status wrapper |
| File Watching | `chokidar` | Syncs AI file edits to frontend |
| Markdown | `react-markdown` + `remark-gfm` + `rehype-highlight` | Chat message rendering |
| QR Codes | `qrcode` | Expo QR code generation |

## Project Structure

```
vibecoder/
├── package.json                      # npm workspaces root
├── tsconfig.base.json
├── packages/
│   ├── shared/                       # Shared TypeScript types
│   │   └── src/types/
│   │       ├── ai.ts                 # AIStreamEvent, AIMessage, AIToolCall
│   │       ├── file.ts               # FileNode, FileChange
│   │       ├── project.ts            # ProjectInfo, ScaffoldConfig, WizardState
│   │       ├── tab.ts                # Tab, TabType
│   │       ├── terminal.ts           # TerminalSession
│   │       ├── git.ts                # GitStatus, GitCommit
│   │       └── preview.ts            # ExpoStatus, PreviewInfo
│   │
│   ├── backend/                      # Node.js server
│   │   └── src/
│   │       ├── index.ts              # Express + WS bootstrap (single port 3001)
│   │       ├── routes/
│   │       │   ├── projects.ts       # CRUD projects
│   │       │   ├── files.ts          # Read/write/tree/upload
│   │       │   ├── git.ts            # Clone/status/commit/push/pull
│   │       │   └── preview.ts        # Expo status, QR code
│   │       ├── services/
│   │       │   ├── ai/
│   │       │   │   ├── provider.ts       # AIProvider interface (swap Claude/Gemini/OpenRouter)
│   │       │   │   ├── claude-agent.ts   # Claude Agent SDK implementation
│   │       │   │   ├── openrouter.ts     # (future stub)
│   │       │   │   └── gemini-cli.ts     # (future stub)
│   │       │   ├── terminal.ts       # node-pty session manager
│   │       │   ├── fileSystem.ts     # fs ops + chokidar watcher
│   │       │   ├── git.ts            # simple-git wrapper
│   │       │   ├── project.ts        # Project CRUD, set active
│   │       │   ├── scaffolder.ts     # PORT from existing (zero VS Code deps)
│   │       │   ├── apiParser.ts      # PORT from existing (zero VS Code deps)
│   │       │   └── expo.ts           # Dev server management, QR capture
│   │       └── ws/
│   │           ├── index.ts          # WS server, message routing
│   │           ├── aiChannel.ts      # AI chat streaming
│   │           ├── terminalChannel.ts# Terminal I/O
│   │           └── fileChannel.ts    # File change notifications
│   │
│   └── frontend/                     # React app
│       └── src/
│           ├── App.tsx               # Root layout
│           ├── store/                # Zustand stores
│           │   ├── chatStore.ts      # Messages, sessions, streaming state
│           │   ├── tabStore.ts       # Open tabs, active tab
│           │   ├── fileStore.ts      # File tree, expanded dirs
│           │   ├── projectStore.ts   # Active project, project list
│           │   └── uiStore.ts        # Panel sizes, sidebar visibility
│           ├── hooks/
│           │   ├── useWebSocket.ts   # Single WS connection + reconnect
│           │   ├── useAiChat.ts      # Send message, handle stream events
│           │   └── useTerminal.ts    # Terminal session lifecycle
│           ├── components/
│           │   ├── layout/
│           │   │   ├── AppShell.tsx       # 3-column Allotment
│           │   │   ├── ChatPanel.tsx      # Left panel
│           │   │   ├── CenterPanel.tsx    # Tab bar + content
│           │   │   ├── FileTreePanel.tsx  # Right panel (snappable)
│           │   │   └── StatusBar.tsx
│           │   ├── chat/
│           │   │   ├── ChatView.tsx       # Message list + input
│           │   │   ├── ChatMessage.tsx    # Markdown rendering
│           │   │   ├── ChatInput.tsx      # Textarea + send
│           │   │   └── ToolCallBubble.tsx # Collapsed tool use display
│           │   ├── tabs/
│           │   │   ├── TabBar.tsx         # Tab strip with scroll
│           │   │   ├── TabContent.tsx     # Routes to active tab component
│           │   │   └── NewTabButton.tsx   # "+" dropdown picker
│           │   ├── editor/
│           │   │   └── CodeEditor.tsx     # Monaco wrapper
│           │   ├── terminal/
│           │   │   └── TerminalView.tsx   # xterm.js wrapper
│           │   ├── preview/
│           │   │   ├── WebPreview.tsx     # iframe
│           │   │   └── ExpoQRCode.tsx     # QR code display
│           │   ├── wizard/
│           │   │   ├── ProjectWizard.tsx  # 5-step container
│           │   │   ├── StepName.tsx
│           │   │   ├── StepApi.tsx
│           │   │   ├── StepDesign.tsx
│           │   │   ├── StepHtmlImport.tsx # NEW: upload HTML/CSS design references
│           │   │   └── StepReview.tsx
│           │   ├── git/
│           │   │   └── GitPanel.tsx
│           │   ├── projects/
│           │   │   └── ProjectList.tsx
│           │   └── welcome/
│           │       └── WelcomePage.tsx
│           └── lib/
│               ├── wsClient.ts       # WebSocket singleton
│               └── api.ts            # REST fetch wrapper
```

## Architecture

### Layout

```
┌─────────────────────────────────────────────────────────┐
│  ChatPanel (left)  │  CenterPanel          │ FileTree   │
│  280-500px         │  (fills remaining)    │ (snappable)│
│                    │                       │ 0-400px    │
│  ┌──────────────┐  │  ┌─TabBar──────────┐  │            │
│  │ Chat Messages│  │  │ file.tsx │ >_ T │  │  Explorer  │
│  │  (markdown)  │  │  └─────────────────┘  │  tree      │
│  │              │  │  ┌─TabContent──────┐  │            │
│  │  Tool calls  │  │  │                 │  │            │
│  │  (collapsed) │  │  │  Monaco / xterm │  │            │
│  │              │  │  │  / iframe / QR  │  │            │
│  │              │  │  │                 │  │            │
│  ├──────────────┤  │  └─────────────────┘  │            │
│  │ ChatInput    │  │                       │            │
│  └──────────────┘  │                       │            │
├─────────────────────────────────────────────────────────┤
│  StatusBar: project name │ git branch │ expo status     │
└─────────────────────────────────────────────────────────┘
```

Right panel uses `allotment` `snap` — collapses to 0 when dragged small, opens to 260px via `Ctrl+E`.

### Communication

- **REST** (`/api/*`): Request-response operations (file CRUD, project CRUD, git actions)
- **WebSocket** (single connection, multiplexed by `channel` field): Real-time streams (AI chat, terminal I/O, file change notifications)

```
WebSocket message envelope:
{ channel: 'ai' | 'terminal' | 'files', type: string, payload: unknown }
```

### AI Provider Interface

```typescript
// packages/backend/src/services/ai/provider.ts
interface AIProvider {
  name: string;
  sendMessage(
    message: string,
    sessionId: string | null,
    config: { cwd: string; systemPrompt?: string },
    onEvent: (event: AIStreamEvent) => void,
  ): Promise<{ sessionId: string }>;
  interrupt(sessionId: string): Promise<void>;
  isAvailable(): Promise<boolean>;
}
```

**Claude Agent SDK implementation** (primary):
- Calls `query()` from `@anthropic-ai/claude-agent-sdk`
- Uses `resume: sessionId` for multi-turn conversations
- Uses `includePartialMessages: true` for token-level streaming
- `permissionMode: 'acceptEdits'` so Claude can edit files without prompts
- `settingSources: ['project']` to auto-load CLAUDE.md
- Session ID captured from `init` system message, stored in chatStore

**Future providers** (same interface):
- **OpenRouter**: REST API to `openrouter.ai/api/v1/chat/completions`, SSE streaming. Would need a separate tool execution layer since OpenRouter doesn't run tools.
- **Gemini CLI**: Subprocess like Claude. Parse stdout for streaming.

### AI Chat Streaming Flow

```
User types → chatStore.sendMessage()
  → WS send { channel:'ai', type:'ai:send', payload:{ message, sessionId } }
    → Backend aiChannel → claudeAgent.sendMessage()
      → Claude Agent SDK spawns claude CLI subprocess
        → Streams: init → text deltas → tool calls → result
          → onEvent callback → WS send to client
            → Frontend useAiChat hook → dispatches to chatStore:
              ai:text → appendDelta()   (accumulates streaming text)
              ai:toolUse → addToolCall() (shows collapsed tool bubble)
              ai:done → finishMessage()  (finalizes message)
            → React re-renders ChatMessage (react-markdown)
```

### Terminal Flow

```
Open terminal tab → WS send { channel:'terminal', type:'terminal:create', payload:{ id, cols, rows } }
  → Backend: pty.spawn('bash', [], { cols, rows, cwd: projectDir })
  → pty.onData → WS send terminal:output → xterm.write(data)
  → xterm.onData → WS send terminal:input → pty.write(data)
  → ResizeObserver → fitAddon.fit() → WS send terminal:resize → pty.resize()
```

### File Watching

Backend runs `chokidar.watch(projectDir)`. When AI edits files (via Claude Agent SDK tools), changes appear on disk. Watcher broadcasts `files:changed` events over WS. Frontend fileStore updates tree; open editor tabs check if content differs from disk.

## Existing Code to Port

These files have **zero VS Code API dependencies** — they only use `fs` and `path`:

| Source | Destination | Changes |
|--------|-------------|---------|
| `extensions/vibecoder-layout/src/scaffolder.ts` (678 lines) | `packages/backend/src/services/scaffolder.ts` | Add HTML design file handling to scaffold() |
| `extensions/vibecoder-layout/src/apiParser.ts` (196 lines) | `packages/backend/src/services/apiParser.ts` | None — direct copy |

Reference for UI (reimplement in React, don't copy):
- `projectWizard.ts` → wizard step flow, validation logic, state machine
- `projectManager.ts` → project listing, create/delete
- `welcomeView.ts` → landing page buttons and shortcuts
- `config/vibecoder.css` → visual aesthetic (dark theme, soft line numbers, clean borders)

## HTML/CSS Design Import (New Feature)

**In wizard (Step 4 — between Design Guidelines and Review):**
- Upload one or more HTML/CSS files via file picker
- Small iframe preview of each uploaded file
- Files stored in `.vibecoder/designs/` within project

**Standalone action (during development):**
- "Import Design" command in "+" tab picker or via chat
- Same upload flow, appends to existing `.vibecoder/designs/`
- Updates CLAUDE.md with new design references

**CLAUDE.md integration:**
```markdown
## Design Reference
HTML/CSS design files are in `.vibecoder/designs/`. When building UI:
- Reference these files for layout, spacing, colors, and visual style
- Adapt to React Native components — do not copy HTML directly
- Files: dashboard.html, login.html, styles.css
```

## Project Wizard (5 Steps)

1. **Project Name** — text input, validation (alphanumeric/-/_), duplicate check
2. **API Docs** — upload Swagger/OpenAPI JSON, or fetch from URL, or skip. Parses and shows summary.
3. **Design Guidelines** — default/custom color scheme, logo upload
4. **HTML/CSS Import** — upload design reference files (new step), or skip
5. **Review & Create** — summary of all choices, "Create" button triggers scaffolder

On create: `POST /api/projects` → scaffolder generates Expo Router project → sets as active → opens file tree + welcome tab.

## Tab System

| TabType | Component | Multiple? | Notes |
|---------|-----------|-----------|-------|
| `editor` | `CodeEditor` (Monaco) | Yes | Opens via file tree click. Uses `path` prop for auto model switching. |
| `terminal` | `TerminalView` (xterm.js) | Yes | Each has unique PTY session. |
| `preview` | `WebPreview` / `ExpoQRCode` | One | iframe or QR code display |
| `wizard` | `ProjectWizard` | One | 5-step project creation |
| `welcome` | `WelcomePage` | One | Landing when no project open |
| `git` | `GitPanel` | One | Status, commit, push/pull |
| `projects` | `ProjectList` | One | Project cards with open/delete |

## Git Integration

Backend wraps `simple-git`. Minimal UI:
- **Status**: branch name, modified/staged/untracked files
- **Commit**: stage files (checkboxes) + commit message input
- **Push/Pull**: buttons with ahead/behind indicators
- **Clone**: URL input in project list or wizard
- **Log**: recent commits list

No diff viewer, no merge UI — delegate complex git to AI chat.

## Mobile Preview (Expo + Flutter)

- Terminal stdout is scanned for dev server URLs (Expo `exp://` / Metro URLs, Flutter `is being served at` pattern)
- `devServerScanner.ts` detects the framework automatically from URL patterns
- QR code generation is Expo-only (Flutter has no phone preview equivalent)
- Expo: `npx expo start --web` → Metro on port 8081
- Flutter: `flutter run -d web-server --web-hostname=localhost --web-port=8080` → web server on port 8080
- PreviewPanel detects framework from file tree (`pubspec.yaml` → Flutter, else Expo)
- QR/Web toggle hidden for Flutter; Flutter always shows web view
- Dynamic UI labels: "Expo Server" / "Flutter Server", "Starting Metro..." / "Starting Flutter dev server..."
- All preview URLs proxied through backend for iframe embedding + console interceptor injection

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+B` | Toggle chat panel |
| `Ctrl+E` | Toggle file tree |
| `Ctrl+L` | Focus chat input |
| `Ctrl+\`` | New terminal tab |
| `Ctrl+S` | Save active file |
| `Ctrl+P` | Quick file open |
| `Ctrl+G` | Open git panel |

## Build Phases

### Phase 1: Skeleton + Chat (MVP) — ~1 week
1. Init monorepo (npm workspaces, shared types, tsconfigs)
2. Backend: Express + WS server, AI channel with Claude Agent SDK
3. Frontend: Vite + React, AppShell with Allotment, ChatPanel (ChatView + ChatInput + ChatMessage), WS hook
4. End-to-end: type message → streaming Claude response → rendered markdown
5. Welcome tab in center, empty right panel

**Checkpoint:** Can chat with Claude, see streaming responses with markdown.

### Phase 2: File System + Editor — ~1 week
1. Backend: fileSystem service (tree/read/write/watch)
2. Frontend: FileTree component, Monaco CodeEditor
3. Tab system: click file → opens in editor tab
4. File watching: AI edits reflected in editor and tree

**Checkpoint:** Browse files, edit code, see AI changes in real-time.

### Phase 3: Terminal — ~3 days
1. Backend: terminal service with node-pty
2. Frontend: TerminalView with xterm.js
3. Multiple terminal tabs, Expo URL detection

**Checkpoint:** Run commands, run `expo start`, terminal works.

### Phase 4: Project Wizard + Scaffolder — ~3 days
1. Port apiParser.ts and scaffolder.ts to backend
2. Project service (list/create/delete/set active)
3. ProjectWizard (5 steps with HTML import), ProjectList, WelcomePage

**Checkpoint:** Full project creation → scaffolded Expo app.

### Phase 5: Preview + QR + Git — ~3 days
1. Expo QR code capture + display
2. Web preview iframe
3. Git panel (status/commit/push/pull)

**Checkpoint:** Complete MVP — all features working.

### Phase 6: Polish + Provider Abstraction — IN PROGRESS
- [x] Mobile device frame fix — PreviewPanel phone frame scales correctly using sizer wrapper pattern (fixed 375×812 device, `position: absolute` inside a sizer div with explicit scaled dimensions, `transform-origin: top left`)
- [x] Flutter framework selection UI in project wizard (Expo vs Flutter cards, conditional step flows)
- [x] Framework-agnostic preview system — preview pipeline detects Expo vs Flutter and uses correct dev server command, URL patterns, QR behavior, and UI labels
- [ ] Error boundaries, WS reconnection, keyboard shortcuts
- [ ] OpenRouter and Gemini CLI provider stubs
- [ ] Settings panel, session history
- [ ] Dark theme polish (port vibecoder.css aesthetic)

## Verification

After each phase:
1. `npm run dev` — starts both backend (3001) and frontend (Vite dev server) concurrently
2. Open `http://localhost:5173` in browser
3. Test the features built in that phase
4. Phase 1 final test: send a message to Claude, see streaming response
5. Full MVP test: create project via wizard → edit files → run in terminal → see Expo QR → commit and push via git panel
